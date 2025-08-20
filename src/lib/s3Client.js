import { S3Client, HeadBucketCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { fetch } from '@tauri-apps/plugin-http';
import { getS3Config } from './settings.js';

/**
 * Create S3 client for S3-compatible services
 * @param {Object} config - S3 configuration
 * @param {string} config.endpoint - S3-compatible endpoint URL
 * @param {string} config.region - Region (default: us-east-1)
 * @param {string} config.accessKeyId - Access key ID
 * @param {string} config.secretAccessKey - Secret access key
 * @param {boolean} config.forcePathStyle - Force path style (default: true for compatibility)
 * @param {boolean} config.anonymous - Whether to use anonymous access (no credentials)
 * @returns {S3Client} Configured S3 client
 */
export function createS3Client(config) {
  // Load settings from storage
  const s3Settings = getS3Config();
  
  const clientConfig = {
    region: config.region || s3Settings.region || 'us-east-1',
    forcePathStyle: config.forcePathStyle !== false, // Default to true for S3-compatible services
    requestTimeout: s3Settings.requestTimeout || 30000,
    maxRetries: s3Settings.maxRetries || 3
  };

  // Handle credentials based on configuration
  if (config.anonymous || (!config.accessKeyId && !config.secretAccessKey)) {
    // For anonymous access, use anonymous credentials (equivalent to --no-sign-request)
    console.log('Using anonymous S3 access (no-sign-request mode)');
    clientConfig.credentials = () => Promise.resolve({
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: ''
    });
  } else if (config.accessKeyId && config.secretAccessKey) {
    // Use provided credentials for private buckets
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }

  // Add endpoint for S3-compatible services (omit for AWS S3)
  if (config.endpoint && config.endpoint !== 'https://s3.amazonaws.com') {
    clientConfig.endpoint = config.endpoint;
  } else if (s3Settings.endpoint) {
    clientConfig.endpoint = s3Settings.endpoint;
  }
  
  // Apply force path style setting
  if (s3Settings.forcePathStyle !== undefined) {
    clientConfig.forcePathStyle = s3Settings.forcePathStyle;
  }



  return new S3Client(clientConfig);
}

/**
 * Test S3-compatible service connection
 * @param {Object} config - S3 configuration
 * @returns {Promise<{success: boolean, message: string}>} Test result
 */
export async function testS3Connection(config) {
  try {
    const client = createS3Client(config);
    
    // Test connection by trying to head the bucket
    const command = new HeadBucketCommand({
      Bucket: config.bucketName
    });
    
    await client.send(command);
    
    return {
      success: true,
      message: 'Successfully connected to S3-compatible service!'
    };
  } catch (error) {
    console.error('S3 connection test failed:', error);
    
    let message = 'Failed to connect to S3-compatible service.';
    
    // Handle specific error cases
    if (error.$metadata?.httpStatusCode === 401) {
      message = 'Authentication failed (401 Unauthorized). Please check your access key ID and secret access key. Make sure the credentials have permission to access the bucket.';
    } else if (error.$metadata?.httpStatusCode === 403) {
      message = 'Access denied (403 Forbidden). The credentials are valid but do not have permission to access this bucket.';
    } else if (error.$metadata?.httpStatusCode === 404) {
      message = 'Bucket not found (404). Please verify the bucket name and endpoint URL.';
    } else if (error.name === 'NoSuchBucket') {
      message = 'Bucket does not exist or is not accessible.';
    } else if (error.name === 'InvalidAccessKeyId') {
      message = 'Invalid access key ID.';
    } else if (error.name === 'SignatureDoesNotMatch') {
      message = 'Invalid secret access key or signature mismatch.';
    } else if (error.name === 'NetworkingError' || error.code === 'ENOTFOUND') {
      message = 'Cannot reach the S3-compatible service endpoint. Check your endpoint URL and network connectivity.';
    } else if (error.name === 'CredentialsProviderError') {
      message = 'Invalid credentials provided.';
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Connection refused. The endpoint may be incorrect or the service is not running.';
    } else if (error.message) {
      message = `Connection failed: ${error.message}`;
    }
    
    return {
      success: false,
      message
    };
  }
}

/**
 * Create S3 client from storage location object or config
 * @param {Object} locationOrConfig - Storage location object or S3 config
 * @returns {S3Client} Configured S3 client
 */
export function createClientFromLocation(locationOrConfig) {
  // Check if it's a raw config (has bucketName) or storage location object
  if (locationOrConfig.bucketName && !locationOrConfig.name) {
    // It's a raw S3 config, pass directly to createS3Client
    return createS3Client(locationOrConfig);
  } else {
    // It's a storage location object, extract S3 config
    return createS3Client({
      endpoint: locationOrConfig.endpoint,
      region: locationOrConfig.region,
      accessKeyId: locationOrConfig.accessKeyId,
      secretAccessKey: locationOrConfig.secretAccessKey,
      forcePathStyle: true
    });
  }
}

/**
 * Download dataset from S3 to local storage
 * @param {Object} task - Collection task object
 * @param {Object} sourceConfig - Source S3 configuration (with bucketName)
 * @param {Object} destLocation - Destination local storage location
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<boolean>} Success status
 */
export async function downloadDatasetWithS3(task, sourceConfig, destLocation, progressCallback) {
  try {
    console.log(`Starting S3 download: ${task.name}`);
    console.log(`Source: s3://${sourceConfig.bucketName}/${task.downloadPath}`);
    console.log(`Destination: ${destLocation.path}/${task.downloadPath}`);
    
    // Update task status
    await progressCallback({
      status: 'downloading',
      progress: 0,
      startedAt: new Date().toISOString()
    });
    
    const s3Client = createClientFromLocation(sourceConfig);
    
    // Always use AWS S3 SDK client for both authenticated and anonymous access
    return await downloadWithS3Client(task, sourceConfig, destLocation, progressCallback, s3Client);
    
  } catch (error) {
    console.error('Failed to download with S3:', error);
    await progressCallback({
      status: 'failed',
      errorMessage: error.message
    });
    return false;
  }
}

/**
 * Download using AWS S3 SDK client
 */
async function downloadWithS3Client(task, sourceConfig, destLocation, progressCallback, s3Client) {
  // For OpenNeuro, extract the accession number from the download path
  let s3Prefix = task.downloadPath;
  if (sourceConfig.bucketName === 'openneuro.org') {
    s3Prefix = extractOpenNeuroAccession(task.downloadPath);
    console.log(`OpenNeuro: Using accession ${s3Prefix} instead of ${task.downloadPath}`);
  }
  
  // List all objects in the dataset path
  const listCommand = new ListObjectsV2Command({
    Bucket: sourceConfig.bucketName,
    Prefix: s3Prefix
  });
  
  const listResponse = await s3Client.send(listCommand);
  const objects = listResponse.Contents || [];
  
  if (objects.length === 0) {
    throw new Error(`No files found for dataset: ${task.downloadPath}`);
  }
  
  console.log(`Found ${objects.length} files to download`);
  
  // Ensure destination directory exists
  const destPath = await join(destLocation.path, task.downloadPath);
  await mkdir(destLocation.path, { recursive: true });
  await mkdir(destPath, { recursive: true });
  
  let totalSize = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
  let downloadedSize = 0;
  
  // Update task with total size
  await progressCallback({
    totalSize: totalSize,
    downloadedSize: 0
  });
  
  // Download files one by one
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    console.log(`Downloading file ${i + 1}/${objects.length}: ${object.Key}`);
    
    try {
      // Get object from S3
      const getCommand = new GetObjectCommand({
        Bucket: sourceConfig.bucketName,
        Key: object.Key
      });
      
      const response = await s3Client.send(getCommand);
      
      // Convert stream to buffer
      const chunks = [];
      const reader = response.Body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Save file to local storage
      // For OpenNeuro, handle the case where S3 prefix differs from download path
      let relativePath;
      if (sourceConfig.bucketName === 'openneuro.org' && s3Prefix !== task.downloadPath) {
        // Remove the S3 prefix and keep the rest of the path
        relativePath = object.Key.replace(s3Prefix + '/', '');
      } else {
        // Standard case: remove the download path prefix
        relativePath = object.Key.replace(task.downloadPath + '/', '');
      }
      const filePath = await join(destPath, relativePath);
      
      // Ensure directory exists for nested files
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (fileDir !== destPath) {
        await mkdir(fileDir, { recursive: true });
      }
      
      await writeFile(filePath, buffer);
      
      downloadedSize += object.Size || 0;
      const progress = Math.round((downloadedSize / totalSize) * 100);
      
      // Update progress
      await progressCallback({
        progress: progress,
        downloadedSize: downloadedSize,
        speed: 0 // TODO: Calculate actual speed
      });
      
    } catch (fileError) {
      console.error(`Failed to download file ${object.Key}:`, fileError);
      throw new Error(`Failed to download file ${object.Key}: ${fileError.message}`);
    }
  }
  
  console.log(`S3 download completed successfully: ${task.name}`);
  await progressCallback({
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString()
  });
  
  return true;
}

/**
 * Extract OpenNeuro accession number from DOI or path
 * @param {string} path - The download path (could be DOI-based or accession)
 * @returns {string} The accession number (e.g., ds006521)
 */
export function extractOpenNeuroAccession(path) {
  // If path already looks like an accession (ds followed by numbers), return as-is
  if (/^ds\d+$/i.test(path)) {
    return path.toLowerCase();
  }
  
  // Extract accession from DOI-like path (e.g., "10.18112_openneuro.ds006521.v1.0.0" -> "ds006521")
  const accessionMatch = path.match(/ds(\d+)/i);
  if (accessionMatch) {
    return `ds${accessionMatch[1]}`;
  }
  
  // If no accession found, return the original path
  return path;
}

/**
 * Download using direct HTTP requests for anonymous access
 */
async function downloadWithDirectHttp(task, sourceConfig, destLocation, progressCallback) {
  // Build base URL for S3 bucket
  const baseUrl = `https://${sourceConfig.bucketName}.s3.amazonaws.com`;
  
  const fetchOptions = {};
  
  // For OpenNeuro, extract the accession number from the download path
  let s3Prefix = task.downloadPath;
  if (sourceConfig.bucketName === 'openneuro.org') {
    s3Prefix = extractOpenNeuroAccession(task.downloadPath);
    console.log(`OpenNeuro: Using accession ${s3Prefix} instead of ${task.downloadPath}`);
  }
  
  // First, get the list of objects using S3 List Objects v2 API
  const listUrl = `${baseUrl}?list-type=2&prefix=${encodeURIComponent(s3Prefix)}`;
  
  console.log(`Listing objects from: ${listUrl}`);
  
  const listResponse = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/xml'
    },
    ...fetchOptions
  });
  
  if (!listResponse.ok) {
    throw new Error(`Failed to list objects: ${listResponse.status} ${listResponse.statusText}`);
  }
  
  const xmlText = await listResponse.text();
  
  // Parse XML response to extract object keys
  const keyMatches = xmlText.match(/<Key>([^<]+)<\/Key>/g) || [];
  const sizeMatches = xmlText.match(/<Size>([^<]+)<\/Size>/g) || [];
  
  const objects = keyMatches.map((keyMatch, index) => {
    const key = keyMatch.replace(/<Key>|<\/Key>/g, '');
    const sizeMatch = sizeMatches[index] || '<Size>0</Size>';
    const size = parseInt(sizeMatch.replace(/<Size>|<\/Size>/g, '')) || 0;
    return { Key: key, Size: size };
  });
  
  if (objects.length === 0) {
    throw new Error(`No files found for dataset: ${task.downloadPath}`);
  }
  
  console.log(`Found ${objects.length} files to download`);
  
  // Ensure destination directory exists
  const destPath = await join(destLocation.path, task.downloadPath);
  await mkdir(destLocation.path, { recursive: true });
  await mkdir(destPath, { recursive: true });
  
  let totalSize = objects.reduce((sum, obj) => sum + obj.Size, 0);
  let downloadedSize = 0;
  
  // Update task with total size
  await progressCallback({
    totalSize: totalSize,
    downloadedSize: 0
  });
  
  // Download files one by one
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    console.log(`Downloading file ${i + 1}/${objects.length}: ${object.Key}`);
    
    try {
      // Download file directly via HTTP using Tauri fetch
      const fileUrl = `${baseUrl}/${encodeURIComponent(object.Key)}`;
      const fileResponse = await fetch(fileUrl, {
        method: 'GET',
        ...fetchOptions
      });
      
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      // Save file to local storage
      // For OpenNeuro, handle the case where S3 prefix differs from download path
      let relativePath;
      if (sourceConfig.bucketName === 'openneuro.org' && s3Prefix !== task.downloadPath) {
        // Remove the S3 prefix and keep the rest of the path
        relativePath = object.Key.replace(s3Prefix + '/', '');
      } else {
        // Standard case: remove the download path prefix
        relativePath = object.Key.replace(task.downloadPath + '/', '');
      }
      const filePath = await join(destPath, relativePath);
      
      console.log(`Writing file: ${object.Key} -> ${filePath}`);
      
      // Ensure directory exists for nested files
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (fileDir !== destPath) {
        console.log(`Creating directory: ${fileDir}`);
        await mkdir(fileDir, { recursive: true });
      }
      
      try {
        await writeFile(filePath, buffer);
        console.log(`Successfully wrote file: ${filePath} (${buffer.length} bytes)`);
      } catch (writeError) {
        console.error(`Failed to write file ${filePath}:`, writeError);
        throw new Error(`Failed to write file ${relativePath}: ${writeError.message}`);
      }
      
      console.log(`Downloaded file ${i + 1}/${objects.length}: ${relativePath} -> ${filePath}`);
      
      downloadedSize += object.Size;
      const progress = Math.round((downloadedSize / totalSize) * 100);
      
      // Update progress
      await progressCallback({
        progress: progress,
        downloadedSize: downloadedSize,
        speed: 0, // TODO: Calculate actual speed
        currentFile: relativePath,
        totalFiles: objects.length,
        completedFiles: i + 1
      });
      
    } catch (fileError) {
      console.error(`Failed to download file ${object.Key}:`, fileError);
      throw new Error(`Failed to download file ${object.Key}: ${fileError.message}`);
    }
  }
  
  console.log(`Direct HTTP download completed successfully: ${task.name}`);
  await progressCallback({
    status: 'completed',
    progress: 100,
    completedAt: new Date().toISOString()
  });
  
  return true;
}