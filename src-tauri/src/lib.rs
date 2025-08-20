use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use regex::Regex;
use tauri::Emitter;
use std::path::PathBuf;

mod s3_client;
use s3_client::test_s3_connection;

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
    
    // Get the first available storage location (local or S3-compatible)
    let storage_location = storage_locations
        .iter()
        .find(|loc| {
            let storage_type = loc.get("type").and_then(|t| t.as_str());
            storage_type == Some("local") || storage_type == Some("s3-compatible")
        })
        .ok_or("No compatible storage location found (local or s3-compatible)")?;
    
    let storage_type = storage_location.get("type")
        .and_then(|t| t.as_str())
        .ok_or("No storage type specified")?;
    
    let storage_path = storage_location.get("path")
        .and_then(|p| p.as_str())
        .ok_or("No storage path specified")?;
    
    println!("Using storage location: type={}, path={}", storage_type, storage_path);
    
    // Update status to collecting
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(&task_id) {
            progress.status = "collecting".to_string();
        }
    }
    
    // Handle different storage types
    match storage_type {
        "local" => {
            // For local storage, create destination directory
            let dest_dir = format!("{}/{}", storage_path, download_path);
            println!("Creating local destination directory: {}", dest_dir);
            
            if let Err(e) = fs::create_dir_all(&dest_dir).await {
                return Err(format!("Failed to create directory {}: {}", dest_dir, e));
            }
            
            // Download to local storage
            download_to_local_storage(&task_id, &dest_dir, dataset_provider, download_path, &state, &app_handle).await
        },
        "s3-compatible" => {
            // For S3-compatible storage, upload to S3 bucket
            println!("Downloading to S3-compatible storage: {}", storage_path);
            download_to_s3_storage(&task_id, storage_location, dataset_provider, download_path, &state, &app_handle).await
        },
        _ => {
            Err(format!("Unsupported storage type: {}", storage_type))
        }
    }
}

async fn download_to_local_storage(
    task_id: &str,
    dest_dir: &str,
    dataset_provider: &str,
    download_path: &str,
    state: &DownloadState,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    // For OpenNeuro datasets, download all files in the dataset
    if dataset_provider.to_lowercase() == "openneuro" {
        // Extract OpenNeuro accession from DOI-based path (e.g., "10.18112_openneuro.ds006486.v1.0.0" -> "ds006486")
        let accession = extract_openneuro_accession(download_path);
        println!("OpenNeuro: Using accession {} instead of {}", accession, download_path);
        
        match download_openneuro_dataset(&accession, dest_dir, task_id, state, app_handle).await {
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
        Err("Only OpenNeuro datasets are currently supported".to_string())
    }
}

async fn download_to_s3_storage(
    task_id: &str,
    storage_location: &serde_json::Value,
    dataset_provider: &str,
    download_path: &str,
    state: &DownloadState,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    // Extract S3 configuration from storage location
    let bucket_name = storage_location.get("bucketName")
        .and_then(|b| b.as_str())
        .ok_or("No bucket name in S3 storage location")?;
    
    let endpoint = storage_location.get("endpoint")
        .and_then(|e| e.as_str())
        .ok_or("No endpoint in S3 storage location")?;
    
    let access_key_id = storage_location.get("accessKeyId")
        .and_then(|k| k.as_str())
        .ok_or("No access key ID in S3 storage location")?;
    
    let secret_access_key = storage_location.get("secretAccessKey")
        .and_then(|s| s.as_str())
        .ok_or("No secret access key in S3 storage location")?;
    
    let region = storage_location.get("region")
        .and_then(|r| r.as_str())
        .unwrap_or("us-east-1");
    
    println!("S3 destination: bucket={}, endpoint={}, region={}", bucket_name, endpoint, region);
    
    // For OpenNeuro datasets, upload all files directly to S3
    if dataset_provider.to_lowercase() == "openneuro" {
        // Extract OpenNeuro accession from DOI-based path
        let accession = extract_openneuro_accession(download_path);
        println!("OpenNeuro: Uploading accession {} to S3-compatible storage", accession);
        
        // Upload the entire dataset to S3-compatible storage
        upload_openneuro_to_s3(
            &accession,
            download_path,
            bucket_name,
            endpoint,
            access_key_id,
            secret_access_key,
            region,
            task_id,
            state,
            app_handle,
        ).await
    } else {
        Err("Only OpenNeuro datasets are currently supported".to_string())
    }
}

async fn upload_openneuro_to_s3(
    accession: &str,
    download_path: &str,
    bucket_name: &str,
    endpoint: &str,
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
    task_id: &str,
    state: &DownloadState,
    app_handle: &tauri::AppHandle,
) -> Result<(), String> {
    println!("Starting direct upload of OpenNeuro dataset {} to S3", accession);
    
    // First, list all files in the OpenNeuro dataset
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
    
    // Parse the XML response to get file list
    let file_list = parse_s3_listing(&xml_content)?;
    
    if file_list.is_empty() {
        return Err(format!("No files found for dataset: {}", accession));
    }
    
    println!("Found {} files to upload to S3", file_list.len());
    
    // Update progress tracking
    let total_files = file_list.len() as u32;
    let total_size: u64 = file_list.iter().map(|f| f.size).sum();
    
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(task_id) {
            progress.total_files = Some(total_files);
            progress.total_size = total_size;
            progress.status = "collecting".to_string();
        }
    }
    
    // Stream each file from OpenNeuro directly to S3-compatible storage
    let mut uploaded_files = 0u32;
    let mut uploaded_size = 0u64;
    
    for file_info in &file_list {
        println!("Uploading file {}/{}: {}", uploaded_files + 1, total_files, file_info.key);
        
        // Download file from OpenNeuro
        let file_url = format!("https://s3.amazonaws.com/openneuro.org/{}", file_info.key);
        let download_response = client.get(&file_url).send().await
            .map_err(|e| format!("Failed to download file {}: {}", file_info.key, e))?;
        
        if !download_response.status().is_success() {
            return Err(format!("Failed to download file {}: HTTP {}", file_info.key, download_response.status()));
        }
        
        // Get file content as bytes
        let file_content = download_response.bytes().await
            .map_err(|e| format!("Failed to read file content for {}: {}", file_info.key, e))?;
        
        // Create S3 key for destination (remove accession prefix, use download_path)
        let relative_path = file_info.key.strip_prefix(&format!("{}/", accession))
            .unwrap_or(&file_info.key);
        let s3_key = format!("{}/{}", download_path, relative_path);
        
        // Upload to S3-compatible storage using PUT request with AWS signature
        upload_to_s3_compatible(
            endpoint,
            bucket_name,
            &s3_key,
            &file_content,
            access_key_id,
            secret_access_key,
            region,
        ).await.map_err(|e| format!("Failed to upload {}: {}", file_info.key, e))?;
        
        uploaded_files += 1;
        uploaded_size += file_info.size;
        
        // Update progress
        let progress_percent = (uploaded_size as f64 / total_size as f64 * 100.0).min(100.0);
        
        {
            let mut downloads = state.lock().unwrap();
            if let Some(progress) = downloads.get_mut(task_id) {
                progress.progress = progress_percent;
                progress.downloaded_size = uploaded_size;
                progress.completed_files = Some(uploaded_files);
                progress.current_file = Some(relative_path.to_string());
            }
        }
        
        // Emit progress event
        let _ = app_handle.emit("download_progress", serde_json::json!({
            "taskId": task_id,
            "progress": progress_percent,
            "uploadedSize": uploaded_size,
            "totalSize": total_size,
            "currentFile": relative_path,
            "completedFiles": uploaded_files,
            "totalFiles": total_files,
            "status": "uploading"
        }));
        
        println!("Uploaded file {}/{}: {} ({} bytes)", uploaded_files, total_files, relative_path, file_info.size);
    }
    
    // Mark as completed
    {
        let mut downloads = state.lock().unwrap();
        if let Some(progress) = downloads.get_mut(task_id) {
            progress.status = "completed".to_string();
            progress.progress = 100.0;
            progress.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
    }
    
    // Emit completion event
    let _ = app_handle.emit("download_completed", serde_json::json!({
        "taskId": task_id,
        "status": "completed",
        "totalFiles": total_files,
        "totalSize": total_size
    }));
    
    println!("Successfully uploaded all {} files to S3-compatible storage", total_files);
    Ok(())
}

async fn upload_to_s3_compatible(
    endpoint: &str,
    bucket_name: &str,
    key: &str,
    content: &[u8],
    access_key_id: &str,
    secret_access_key: &str,
    region: &str,
) -> Result<(), String> {
    use std::collections::HashMap;
    use chrono::Utc;
    use sha2::{Sha256, Digest};
    use url::Url;
    
    // Create the URL for the PUT request (force path-style for S3-compatible services)
    let base_url = if endpoint.starts_with("http") {
        endpoint.to_string()
    } else {
        format!("https://{}", endpoint)
    };
    
    // Use path-style URL: http://endpoint/bucket/key
    let url = format!("{}/{}/{}", base_url, bucket_name, key);
    
    let now = Utc::now();
    let timestamp_str = now.format("%Y%m%dT%H%M%SZ").to_string();
    
    // Parse host from URL for the host header
    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed_url.host_str().ok_or("No host in URL")?;
    let port = parsed_url.port();
    
    // Construct proper host header with port if present
    let host_header = if let Some(port) = port {
        format!("{}:{}", host, port)
    } else {
        host.to_string()
    };
    
    // Create content hash
    let mut hasher = Sha256::new();
    hasher.update(content);
    let content_hash = hex::encode(hasher.finalize());
    
    println!("Uploading to URL: {}", url);
    println!("Host header: {}", host_header);
    println!("Content hash: {}", content_hash);
    
    // Create headers for AWS signature (minimal set for better compatibility)
    let mut headers = HashMap::new();
    headers.insert("host".to_string(), host_header.clone());
    headers.insert("x-amz-date".to_string(), timestamp_str.clone());
    headers.insert("x-amz-content-sha256".to_string(), content_hash.clone());
    
    // Generate AWS signature for PUT request
    let authorization = generate_aws_signature_v4_simple(
        "PUT",
        &url,
        &headers,
        access_key_id,
        secret_access_key,
        region,
        &now,
        &content_hash,
    )?;
    
    println!("Authorization: {}", authorization);
    
    // Create the PUT request
    let client = reqwest::Client::new();
    let response = client
        .put(&url)
        .header("Host", host_header)
        .header("Authorization", authorization)
        .header("x-amz-date", timestamp_str)
        .header("x-amz-content-sha256", content_hash)
        .header("Content-Length", content.len())
        .body(content.to_vec())
        .send()
        .await
        .map_err(|e| format!("Failed to upload file: {}", e))?;
    
    if response.status().is_success() {
        println!("Upload successful!");
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        println!("Upload failed - Status: {}, Error: {}", status, error_text);
        Err(format!("Upload failed with status {}: {}", status, error_text))
    }
}

// Simplified AWS signature generation for S3-compatible services
fn generate_aws_signature_v4_simple(
    method: &str,
    url: &str,
    headers: &std::collections::HashMap<String, String>,
    access_key: &str,
    secret_key: &str,
    region: &str,
    timestamp: &chrono::DateTime<chrono::Utc>,
    content_hash: &str,
) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    use url::Url;
    
    let parsed_url = Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    
    // Create canonical request
    let canonical_uri = parsed_url.path();
    let canonical_query = parsed_url.query().unwrap_or("");
    
    // Create canonical headers (sorted)
    let mut canonical_headers = String::new();
    let mut signed_headers = Vec::new();
    
    let mut sorted_headers: Vec<_> = headers.iter().collect();
    sorted_headers.sort_by_key(|&(k, _)| k.to_lowercase());
    
    for (key, value) in sorted_headers {
        let key_lower = key.to_lowercase();
        canonical_headers.push_str(&format!("{}:{}\n", key_lower, value.trim()));
        signed_headers.push(key_lower);
    }
    
    let signed_headers_str = signed_headers.join(";");
    
    // Create canonical request
    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method,
        canonical_uri,
        canonical_query,
        canonical_headers,
        signed_headers_str,
        content_hash
    );
    
    println!("Canonical request:\n{}", canonical_request);
    
    // Create string to sign
    let date = timestamp.format("%Y%m%d").to_string();
    let timestamp_str = timestamp.format("%Y%m%dT%H%M%SZ").to_string();
    let credential_scope = format!("{}/{}/s3/aws4_request", date, region);
    
    let mut hasher = Sha256::new();
    hasher.update(canonical_request.as_bytes());
    let canonical_request_hash = hex::encode(hasher.finalize());
    
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        timestamp_str,
        credential_scope,
        canonical_request_hash
    );
    
    println!("String to sign:\n{}", string_to_sign);
    
    // Calculate signature
    let date_key = hmac_sha256_simple(format!("AWS4{}", secret_key).as_bytes(), date.as_bytes())?;
    let date_region_key = hmac_sha256_simple(&date_key, region.as_bytes())?;
    let date_region_service_key = hmac_sha256_simple(&date_region_key, b"s3")?;
    let signing_key = hmac_sha256_simple(&date_region_service_key, b"aws4_request")?;
    
    let signature = hmac_sha256_simple(&signing_key, string_to_sign.as_bytes())?;
    let signature_hex = hex::encode(signature);
    
    println!("Signature: {}", signature_hex);
    
    // Create authorization header
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        access_key,
        credential_scope,
        signed_headers_str,
        signature_hex
    );
    
    Ok(authorization)
}

fn hmac_sha256_simple(key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    
    let mut mac = Hmac::<Sha256>::new_from_slice(key)
        .map_err(|e| format!("HMAC error: {}", e))?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().to_vec())
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

/// Initialize the logging system
#[tauri::command]
async fn initialize_logging(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create logs directory if it doesn't exist
    let logs_dir = app_dir.join("logs");
    if let Err(e) = fs::create_dir_all(&logs_dir).await {
        return Err(format!("Failed to create logs directory: {}", e));
    }
    
    log::info!("Logging system initialized. Logs directory: {:?}", logs_dir);
    Ok("Logging system initialized".to_string())
}

/// Write a log entry to the application log file
#[tauri::command]
async fn write_log_entry(entry: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let log_file_path = app_dir.join("logs").join("app.log");
    
    // Append the log entry to the file
    let entry_with_newline = format!("{}\n", entry);
    
    match fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .await
    {
        Ok(mut file) => {
            if let Err(e) = file.write_all(entry_with_newline.as_bytes()).await {
                return Err(format!("Failed to write to log file: {}", e));
            }
            if let Err(e) = file.flush().await {
                return Err(format!("Failed to flush log file: {}", e));
            }
            Ok("Log entry written".to_string())
        }
        Err(e) => Err(format!("Failed to open log file: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let download_state: DownloadState = Arc::new(Mutex::new(HashMap::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .manage(download_state)
        .invoke_handler(tauri::generate_handler![
            start_download_task,
            get_download_progress,
            get_all_download_progress,
            cancel_download_task,
            cleanup_download_task,
            test_s3_connection,
            initialize_logging,
            write_log_entry
        ])
        .setup(|app| {
            // Initialize logging for both debug and release builds
            let app_dir = app.handle().path().app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?;
            
            let logs_dir = app_dir.join("logs");
            std::fs::create_dir_all(&logs_dir)
                .map_err(|e| format!("Failed to create logs directory: {}", e))?;
            
            let log_file_path = logs_dir.join("tauri.log");
            
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .target(tauri_plugin_log::Target::new(
                        tauri_plugin_log::TargetKind::LogDir { file_name: Some("tauri".to_string()) }
                    ))
                    .build(),
            )?;
            
            log::info!("Tauri application started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
