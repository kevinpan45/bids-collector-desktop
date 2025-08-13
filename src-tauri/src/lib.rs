use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use regex::Regex;
use tauri::Emitter;

mod s3_client;
use s3_client::{test_s3_connection, S3ConnectionConfig, S3ConnectionResult};

/// Extract OpenNeuro accession number from DOI or path
/// Example: "10.18112_openneuro.ds006486.v1.0.0" -> "ds006486"
fn extract_openneuro_accession(path: &str) -> String {
    // If path already looks like an accession (ds followed by numbers), return as-is
    if let Some(re) = Regex::new(r"^ds\d+$").ok() {
        if re.is_match(path) {
            return path.to_lowercase();
        }
    }
    
    // Extract accession from DOI-like path (e.g., "10.18112_openneuro.ds006486.v1.0.0" -> "ds006486")
    if let Some(re) = Regex::new(r"ds(\d+)").ok() {
        if let Some(captures) = re.captures(path) {
            if let Some(number) = captures.get(1) {
                return format!("ds{}", number.as_str());
            }
        }
    }
    
    // If no accession found, return the original path
    path.to_string()
}

async fn download_openneuro_dataset(
    accession: &str,
    dest_dir: &str,
    task_id: &str,
    state: &DownloadState,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    println!("Starting complete dataset download for accession: {}", accession);
    
    // First, list all files in the dataset by requesting the S3 bucket listing
    let list_url = format!("https://s3.amazonaws.com/openneuro.org?list-type=2&prefix={}/", accession);
    println!("Listing files from: {}", list_url);
    
    let client = reqwest::Client::new();
    let list_response = client.get(&list_url).send().await
        .map_err(|e| format!("Failed to list dataset files: {}", e))?;
    
    if !list_response.status().is_success() {
        return Err(format!("Failed to list files: HTTP {}", list_response.status()));
    }
    
    let xml_content = list_response.text().await
        .map_err(|e| format!("Failed to read listing response: {}", e))?;
    
    // Parse XML to extract file keys and sizes
    let file_list = parse_s3_listing(&xml_content)?;
    
    if file_list.is_empty() {
        return Err(format!("No files found for dataset: {}", accession));
    }
    
    println!("Found {} files to download", file_list.len());
    
    // Calculate total size
    let total_size: u64 = file_list.iter().map(|f| f.size).sum();
    println!("Total dataset size: {} bytes", total_size);
    
    // Update task with total size
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(task_id) {
            progress.total_size = total_size;
        }
    }
    
    let mut downloaded_bytes = 0u64;
    
    // Download each file
    for (index, file_info) in file_list.iter().enumerate() {
        println!("Downloading file {}/{}: {}", index + 1, file_list.len(), file_info.key);
        
        // Update current file
        {
            let mut downloads = state.lock().unwrap();
            if let Some(progress) = downloads.get_mut(task_id) {
                progress.current_file = Some(file_info.key.clone());
            }
        }
        
        // Build file URL and destination path
        let file_url = format!("https://s3.amazonaws.com/openneuro.org/{}", file_info.key);
        
        // Remove the accession prefix from the key to get the relative path
        let relative_path = file_info.key.strip_prefix(&format!("{}/", accession))
            .unwrap_or(&file_info.key);
        let dest_file_path = format!("{}/{}", dest_dir, relative_path);
        
        // Create directory for nested files
        if let Some(parent_dir) = std::path::Path::new(&dest_file_path).parent() {
            if let Err(e) = fs::create_dir_all(parent_dir).await {
                return Err(format!("Failed to create directory {}: {}", parent_dir.display(), e));
            }
        }
        
        // Download the file
        match download_single_file(&file_url, &dest_file_path).await {
            Ok(file_size) => {
                downloaded_bytes += file_size;
                
                // Update progress
                let progress_percent = if total_size > 0 {
                    (downloaded_bytes as f64 / total_size as f64 * 100.0).round()
                } else {
                    0.0
                };
                
                {
                    let mut downloads = state.lock().unwrap();
                    if let Some(progress) = downloads.get_mut(task_id) {
                        progress.progress = progress_percent;
                        progress.downloaded_size = downloaded_bytes;
                    }
                }
                
                println!("Downloaded {}: {} bytes ({}%)", relative_path, file_size, progress_percent);
            }
            Err(e) => {
                return Err(format!("Failed to download {}: {}", file_info.key, e));
            }
        }
    }
    
    // Mark as completed
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(task_id) {
            progress.status = "completed".to_string();
            progress.progress = 100.0;
            progress.completed_at = Some(chrono::Utc::now().to_rfc3339());
            progress.current_file = Some(format!("Completed - {} files", file_list.len()));
            
            // Emit event to frontend about completion
            if let Err(e) = app_handle.emit("download-completed", &*progress) {
                println!("Failed to emit download completion event: {}", e);
            }
        }
    }
    
    // Emit event to frontend about completion
    // Note: In a real implementation, we would emit a Tauri event here
    // For now, the periodic sync should pick this up
    
    println!("Dataset download completed: {} files, {} bytes", file_list.len(), downloaded_bytes);
    Ok(())
}

#[derive(Debug)]
struct S3FileInfo {
    key: String,
    size: u64,
}

fn parse_s3_listing(xml_content: &str) -> Result<Vec<S3FileInfo>, String> {
    let mut files = Vec::new();
    
    // Simple XML parsing - look for <Key> and <Size> tags
    let key_regex = Regex::new(r"<Key>([^<]+)</Key>").map_err(|e| format!("Regex error: {}", e))?;
    let size_regex = Regex::new(r"<Size>([^<]+)</Size>").map_err(|e| format!("Regex error: {}", e))?;
    
    let keys: Vec<&str> = key_regex.captures_iter(xml_content)
        .map(|cap| cap.get(1).unwrap().as_str())
        .collect();
    
    let sizes: Vec<u64> = size_regex.captures_iter(xml_content)
        .map(|cap| cap.get(1).unwrap().as_str().parse::<u64>().unwrap_or(0))
        .collect();
    
    // Pair up keys and sizes
    for (key, size) in keys.iter().zip(sizes.iter()) {
        // Skip directories (keys ending with /)
        if !key.ends_with('/') {
            files.push(S3FileInfo {
                key: key.to_string(),
                size: *size,
            });
        }
    }
    
    Ok(files)
}

async fn download_single_file(url: &str, dest_path: &str) -> Result<u64, String> {
    let client = reqwest::Client::new();
    let response = client.get(url).send().await
        .map_err(|e| format!("HTTP request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    // Create file and write content
    let mut file = fs::File::create(dest_path).await
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    // Stream the content to file
    let mut stream = response.bytes_stream();
    let mut bytes_written = 0u64;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk).await
            .map_err(|e| format!("Failed to write to file: {}", e))?;
        bytes_written += chunk.len() as u64;
    }
    
    file.flush().await
        .map_err(|e| format!("Failed to flush file: {}", e))?;
    
    Ok(bytes_written)
}
use serde::{Deserialize, Serialize};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub task_id: String,
    pub status: String,
    pub progress: f64,
    pub total_size: u64,
    pub downloaded_size: u64,
    pub speed: f64,
    pub current_file: Option<String>,
    pub total_files: Option<u32>,
    pub completed_files: Option<u32>,
    pub error_message: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

type DownloadState = Arc<Mutex<HashMap<String, DownloadProgress>>>;

// Tauri commands for download management
#[tauri::command]
async fn start_download_task(
    task_id: String,
    task_data: serde_json::Value,
    state: tauri::State<'_, DownloadState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    println!("Starting background download for task: {}", task_id);
    
    // Initialize progress tracking
    {
        let mut downloads = state.lock().unwrap();
        downloads.insert(task_id.clone(), DownloadProgress {
            task_id: task_id.clone(),
            status: "starting".to_string(),
            progress: 0.0,
            total_size: 0,
            downloaded_size: 0,
            speed: 0.0,
            current_file: None,
            total_files: None,
            completed_files: None,
            error_message: None,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            completed_at: None,
        });
    }
    
    // Start download in background task
    let state_clone = state.inner().clone();
    let task_id_clone = task_id.clone();
    let app_handle_clone = app_handle.clone();
    
    tokio::spawn(async move {
        // Simulate download process
        if let Err(e) = perform_download(task_id_clone.clone(), task_data, state_clone.clone(), app_handle_clone).await {
            println!("Download failed: {}", e);
            // Update status to failed
            let mut downloads = state_clone.lock().unwrap();
            if let Some(progress) = downloads.get_mut(&task_id_clone) {
                progress.status = "failed".to_string();
                progress.error_message = Some(e);
                progress.completed_at = Some(chrono::Utc::now().to_rfc3339());
            }
        }
    });
    
    Ok("Download started in background".to_string())
}

#[tauri::command]
async fn get_download_progress(
    task_id: String,
    state: tauri::State<'_, DownloadState>,
) -> Result<Option<DownloadProgress>, String> {
    let downloads = state.lock().unwrap();
    Ok(downloads.get(&task_id).cloned())
}

#[tauri::command]
async fn get_all_download_progress(
    state: tauri::State<'_, DownloadState>,
) -> Result<Vec<DownloadProgress>, String> {
    let downloads = state.lock().unwrap();
    Ok(downloads.values().cloned().collect())
}

#[tauri::command]
async fn cancel_download_task(
    task_id: String,
    state: tauri::State<'_, DownloadState>,
) -> Result<String, String> {
    let mut downloads = state.lock().unwrap();
    if let Some(progress) = downloads.get_mut(&task_id) {
        progress.status = "cancelled".to_string();
        progress.completed_at = Some(chrono::Utc::now().to_rfc3339());
    }
    Ok("Download cancelled".to_string())
}

async fn perform_download(
    task_id: String,
    task_data: serde_json::Value,
    state: DownloadState,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    println!("Performing REAL download for task: {}", task_id);
    println!("Task data received: {}", serde_json::to_string_pretty(&task_data).unwrap_or_else(|_| "Invalid JSON".to_string()));
    
    // Parse task data - handle nested structure
    let task = task_data.get("task")
        .ok_or("No task data found")?;
    
    let dataset_provider = task.get("datasetProvider")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    
    let download_path = task.get("downloadPath")
        .and_then(|v| v.as_str())
        .ok_or("No download path specified")?;
    
    let storage_locations = task_data.get("storageLocations")
        .and_then(|v| v.as_array())
        .ok_or("No storage locations specified")?;
    
    // Get the first local storage location
    let local_storage = storage_locations
        .iter()
        .find(|loc| loc.get("type").and_then(|t| t.as_str()) == Some("local"))
        .ok_or("No local storage location found")?;
    
    let storage_path = local_storage.get("path")
        .and_then(|p| p.as_str())
        .ok_or("No storage path specified")?;
    
    // Update status to downloading
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(&task_id) {
            progress.status = "downloading".to_string();
        }
    }
    
    // Create destination directory
    let dest_dir = format!("{}/{}", storage_path, download_path);
    println!("Creating destination directory: {}", dest_dir);
    
    if let Err(e) = fs::create_dir_all(&dest_dir).await {
        return Err(format!("Failed to create directory {}: {}", dest_dir, e));
    }
    
    // For OpenNeuro datasets, download all files in the dataset
    if dataset_provider.to_lowercase() == "openneuro" {
        // Extract OpenNeuro accession from DOI-based path (e.g., "10.18112_openneuro.ds006486.v1.0.0" -> "ds006486")
        let accession = extract_openneuro_accession(download_path);
        println!("OpenNeuro: Using accession {} instead of {}", accession, download_path);
        
        match download_openneuro_dataset(&accession, &dest_dir, &task_id, &state, &app_handle).await {
            Ok(_) => {
                println!("Download completed for task: {}", task_id);
                Ok(())
            }
            Err(e) => {
                println!("Failed to download dataset: {}", e);
                Err(format!("Download failed: {}", e))
            }
        }
    } else {
        Err("Unsupported dataset provider".to_string())
    }
}

#[tauri::command]
async fn cleanup_download_task(
    task_id: String,
    state: tauri::State<'_, DownloadState>,
) -> Result<String, String> {
    println!("Cleaning up download task: {}", task_id);
    
    // Remove from the download state
    let mut downloads = state.lock().unwrap();
    downloads.remove(&task_id);
    
    Ok("Download task cleaned up".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let download_state: DownloadState = Arc::new(Mutex::new(HashMap::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .manage(download_state)
        .invoke_handler(tauri::generate_handler![
            start_download_task,
            get_download_progress,
            get_all_download_progress,
            cancel_download_task,
            cleanup_download_task,
            test_s3_connection
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
