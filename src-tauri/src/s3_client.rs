use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};
use url::Url;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3ConnectionConfig {
    pub bucket_name: String,
    pub endpoint: String,
    pub region: Option<String>,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3ConnectionResult {
    pub success: bool,
    pub message: String,
}

/// Generate AWS Signature V4 for S3 requests
fn generate_aws_signature_v4(
    method: &str,
    url: &str,
    headers: &HashMap<String, String>,
    access_key: &str,
    secret_key: &str,
    region: &str,
    timestamp: &DateTime<Utc>,
) -> Result<String, String> {
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
        "UNSIGNED-PAYLOAD" // For HEAD requests, we don't need to hash the payload
    );
    
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
    
    // Calculate signature
    let date_key = hmac_sha256(format!("AWS4{}", secret_key).as_bytes(), date.as_bytes())?;
    let date_region_key = hmac_sha256(&date_key, region.as_bytes())?;
    let date_region_service_key = hmac_sha256(&date_region_key, b"s3")?;
    let signing_key = hmac_sha256(&date_region_service_key, b"aws4_request")?;
    
    let signature = hmac_sha256(&signing_key, string_to_sign.as_bytes())?;
    let signature_hex = hex::encode(signature);
    
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

fn hmac_sha256(key: &[u8], data: &[u8]) -> Result<Vec<u8>, String> {
    let mut mac = HmacSha256::new_from_slice(key)
        .map_err(|e| format!("HMAC error: {}", e))?;
    mac.update(data);
    Ok(mac.finalize().into_bytes().to_vec())
}

#[tauri::command]
pub async fn test_s3_connection(config: S3ConnectionConfig) -> Result<S3ConnectionResult, String> {
    println!("Testing S3 connection to: {}", config.endpoint);
    
    let client = reqwest::Client::new();
    let region = config.region.as_deref().unwrap_or("us-east-1");
    
    // Create the URL for bucket HEAD request
    let url = if config.endpoint.starts_with("http") {
        format!("{}/{}", config.endpoint, config.bucket_name)
    } else {
        format!("https://{}/{}", config.endpoint, config.bucket_name)
    };
    
    println!("Testing URL: {}", url);
    
    let now = Utc::now();
    let timestamp_str = now.format("%Y%m%dT%H%M%SZ").to_string();
    let _date_str = now.format("%Y%m%d").to_string();
    
    // Create headers for AWS signature
    let mut headers = HashMap::new();
    
    // Parse host from URL
    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed_url.host_str().ok_or("No host in URL")?;
    
    headers.insert("host".to_string(), host.to_string());
    headers.insert("x-amz-date".to_string(), timestamp_str.clone());
    headers.insert("x-amz-content-sha256".to_string(), "UNSIGNED-PAYLOAD".to_string());
    
    // Generate AWS signature
    let authorization = generate_aws_signature_v4(
        "HEAD",
        &url,
        &headers,
        &config.access_key_id,
        &config.secret_access_key,
        region,
        &now,
    )?;
    
    // Create the actual HTTP request with authentication headers
    let mut request_builder = client.head(&url);
    
    for (key, value) in &headers {
        request_builder = request_builder.header(key, value);
    }
    
    request_builder = request_builder.header("Authorization", authorization);
    
    match request_builder.send().await {
        Ok(response) => {
            let status = response.status();
            println!("Response status: {}", status);
            
            if status.is_success() {
                Ok(S3ConnectionResult {
                    success: true,
                    message: "Successfully connected to S3-compatible service!".to_string(),
                })
            } else if status == 401 {
                Ok(S3ConnectionResult {
                    success: false,
                    message: "Authentication failed (401 Unauthorized). Please check your access key ID and secret access key.".to_string(),
                })
            } else if status == 403 {
                Ok(S3ConnectionResult {
                    success: false,
                    message: "Access denied (403 Forbidden). The credentials are valid but do not have permission to access this bucket.".to_string(),
                })
            } else if status == 404 {
                Ok(S3ConnectionResult {
                    success: false,
                    message: "Bucket not found (404). Please verify the bucket name and endpoint URL.".to_string(),
                })
            } else if status == 412 {
                Ok(S3ConnectionResult {
                    success: false,
                    message: "Precondition Failed (412). This usually indicates the S3 service doesn't support the required headers or authentication method. Try checking if your endpoint URL is correct and if the service supports AWS Signature V4.".to_string(),
                })
            } else {
                Ok(S3ConnectionResult {
                    success: false,
                    message: format!("Connection failed with status: {}", status),
                })
            }
        }
        Err(e) => {
            println!("Connection error: {}", e);
            
            let error_msg = if e.is_connect() {
                "Cannot reach the S3-compatible service endpoint. Check your endpoint URL and network connectivity.".to_string()
            } else if e.is_timeout() {
                "Connection timeout. The service may be slow or unreachable.".to_string()
            } else {
                format!("Connection failed: {}", e)
            };
            
            Ok(S3ConnectionResult {
                success: false,
                message: error_msg,
            })
        }
    }
}
