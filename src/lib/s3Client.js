/**
 * S3 Client utility using AWS SDK v3
 * Supports both AWS S3 and S3-compatible services like MinIO
 * Compatible with Tauri webview environment
 */

import { 
  S3Client, 
  ListObjectsV2Command, 
  GetObjectCommand, 
  PutObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from "@aws-sdk/client-s3";

/**
 * Create an S3 client using AWS SDK v3
 * @param {Object} config - S3 configuration
 * @param {string} config.bucketName - S3 bucket name
 * @param {string} config.region - AWS region (optional for S3-compatible services)
 * @param {string} config.accessKeyId - Access key ID
 * @param {string} config.secretAccessKey - Secret access key
 * @param {string} config.endpoint - Custom endpoint URL (optional)
 * @param {boolean} config.useSSL - Use SSL/TLS (default: true)
 * @param {string} config.serviceType - 'aws' or 'compatible'
 * @returns {Promise<Object>} S3Client instance with bucket info
 */
export async function createS3Client(config) {
  try {
    const {
      bucketName,
      region = 'us-east-1',
      accessKeyId,
      secretAccessKey,
      endpoint,
      useSSL = true,
      serviceType = 'aws'
    } = config;

    // Validate required fields
    if (!bucketName || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing required S3 configuration: bucketName, accessKeyId, or secretAccessKey');
    }

    // Build AWS SDK v3 configuration
    const clientConfig = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    };

    // Add custom endpoint for S3-compatible services
    if (endpoint && endpoint !== 'default') {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO and other S3-compatible services
    }

    console.log(`Creating S3 client for ${serviceType === 'aws' ? 'AWS S3' : 'S3-compatible service'}:`, {
      bucket: bucketName,
      region,
      endpoint: endpoint || 'default',
      ssl: useSSL
    });

    const s3Client = new S3Client(clientConfig);
    
    // Return client with bucket info for convenience
    return {
      client: s3Client,
      bucket: bucketName,
      region,
      endpoint: endpoint || 'default'
    };

  } catch (error) {
    console.error('Failed to create S3 client:', error);
    throw error;
  }
}

/**
 * Test S3 connection by attempting to list objects
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} path - Path to test (default: root)
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testS3Connection(clientWrapper, path = '/') {
  try {
    const { client, bucket } = clientWrapper;
    const prefix = path === '/' ? '' : path.replace(/^\//, '').replace(/\/$/, '') + '/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1
    });
    
    const response = await client.send(command);
    const count = response.Contents ? response.Contents.length : 0;
    console.log(`S3 connection test successful. Found ${count} entries at path: ${path}`);
    return true;
  } catch (error) {
    console.error('S3 connection test failed:', error);
    return false;
  }
}

/**
 * List objects in S3 bucket
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} path - Path to list (default: root)
 * @param {boolean} recursive - Whether to list recursively
 * @returns {Promise<Array>} Array of objects with metadata
 */
export async function listS3Objects(clientWrapper, path = '/', recursive = false) {
  try {
    const { client, bucket } = clientWrapper;
    const prefix = path === '/' ? '' : path.replace(/^\//, '').replace(/\/$/, '') + '/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/'
    });
    
    const response = await client.send(command);
    const objects = [];
    
    // Add files
    if (response.Contents) {
      for (const obj of response.Contents) {
        const name = obj.Key.replace(prefix, '').split('/')[0];
        if (name) { // Skip empty names
          objects.push({
            name,
            path: `/${obj.Key}`,
            size: obj.Size || 0,
            lastModified: obj.LastModified,
            isFile: true,
            isDirectory: false
          });
        }
      }
    }
    
    // Add directories (common prefixes)
    if (response.CommonPrefixes) {
      for (const commonPrefix of response.CommonPrefixes) {
        const name = commonPrefix.Prefix.replace(prefix, '').replace(/\/$/, '');
        if (name) { // Skip empty names
          objects.push({
            name,
            path: `/${commonPrefix.Prefix}`,
            size: 0,
            isFile: false,
            isDirectory: true
          });
        }
      }
    }
    
    return objects;
  } catch (error) {
    console.error('Failed to list S3 objects:', error);
    throw error;
  }
}

/**
 * Upload data to S3
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} key - Object key (path)
 * @param {string|ArrayBuffer|Uint8Array|Blob|File} data - Data to upload
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToS3(clientWrapper, key, data, metadata = {}) {
  try {
    const { client, bucket } = clientWrapper;
    console.log('Uploading to S3:', key);
    
    // Clean the key (remove leading slash if present)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    // Convert data to appropriate format
    let body = data;
    if (data instanceof File) {
      body = await data.arrayBuffer();
    } else if (data instanceof Blob) {
      body = await data.arrayBuffer();
    }
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
      Body: body,
      Metadata: metadata
    });
    
    await client.send(command);
    
    console.log('Successfully uploaded:', key);
    return {
      success: true,
      key: key,
      size: typeof data === 'string' ? data.length : (data.byteLength || data.size || 0)
    };
  } catch (error) {
    console.error(`Failed to upload ${key}:`, error);
    throw error;
  }
}

/**
 * Download data from S3
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} key - Object key (path)
 * @returns {Promise<ArrayBuffer>} Downloaded data
 */
export async function downloadFromS3(clientWrapper, key) {
  try {
    const { client, bucket } = clientWrapper;
    console.log('Downloading from S3:', key);
    
    // Clean the key (remove leading slash if present)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: cleanKey
    });
    
    const response = await client.send(command);
    
    // Convert stream to ArrayBuffer
    const chunks = [];
    const reader = response.Body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log('Successfully downloaded:', key);
    return result.buffer;
  } catch (error) {
    console.error(`Failed to download ${key}:`, error);
    throw error;
  }
}

/**
 * Delete object from S3
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} key - Object key (path)
 * @returns {Promise<Object>} Delete result
 */
export async function deleteFromS3(clientWrapper, key) {
  try {
    const { client, bucket } = clientWrapper;
    console.log('Deleting from S3:', key);
    
    // Clean the key (remove leading slash if present)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: cleanKey
    });
    
    await client.send(command);
    
    console.log('Successfully deleted:', key);
    return {
      success: true,
      key: key
    };
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * Check if object exists in S3
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} key - Object key (path)
 * @returns {Promise<boolean>} True if object exists
 */
export async function s3ObjectExists(clientWrapper, key) {
  try {
    const { client, bucket } = clientWrapper;
    
    // Clean the key (remove leading slash if present)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: cleanKey
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get object metadata from S3
 * @param {Object} clientWrapper - S3Client wrapper with bucket info
 * @param {string} key - Object key (path)
 * @returns {Promise<Object>} Object metadata
 */
export async function getS3ObjectMetadata(clientWrapper, key) {
  try {
    const { client, bucket } = clientWrapper;
    
    // Clean the key (remove leading slash if present)
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: cleanKey
    });
    
    const response = await client.send(command);
    
    return {
      exists: true,
      size: response.ContentLength || 0,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      metadata: response.Metadata || {}
    };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.error(`Failed to get metadata for ${key}:`, error);
      return {
        exists: false,
        size: 0,
        lastModified: null,
        contentType: null,
        metadata: {}
      };
    }
    throw error;
  }
}

/**
 * Create S3 client from storage location configuration
 * @param {Object} location - Storage location configuration
 * @returns {Promise<Object|null>} S3Client wrapper or null if not S3
 */
export async function createClientFromLocation(location) {
  if (location.type !== 's3') {
    return null;
  }
  
  return await createS3Client({
    bucketName: location.bucket,
    region: location.region,
    accessKeyId: location.accessKey,
    secretAccessKey: location.secretKey,
    endpoint: location.endpoint,
    serviceType: location.serviceType || 'aws'
  });
}
