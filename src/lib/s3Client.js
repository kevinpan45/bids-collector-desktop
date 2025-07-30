/**
 * S3 Client utility using OpenDAL
 * Supports both AWS S3 and S3-compatible services like MinIO
 */

import { Operator } from 'opendal';

/**
 * Create an S3 client using OpenDAL
 * @param {Object} config - S3 configuration
 * @param {string} config.bucketName - S3 bucket name
 * @param {string} config.region - AWS region (optional for S3-compatible services)
 * @param {string} config.accessKeyId - Access key ID
 * @param {string} config.secretAccessKey - Secret access key
 * @param {string} config.endpoint - Custom endpoint URL (optional)
 * @param {boolean} config.useSSL - Use SSL/TLS (default: true)
 * @param {string} config.serviceType - 'aws' or 'compatible'
 * @returns {Promise<Operator>} OpenDAL operator instance
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

    // Build OpenDAL configuration
    const opendalConfig = {
      bucket: bucketName,
      access_key_id: accessKeyId,
      secret_access_key: secretAccessKey,
    };

    // Add region for AWS S3
    if (serviceType === 'aws' || region) {
      opendalConfig.region = region;
    }

    // Add custom endpoint for S3-compatible services
    if (endpoint) {
      opendalConfig.endpoint = endpoint;
    }

    // Configure SSL
    if (useSSL !== undefined) {
      opendalConfig.enable_virtual_host_style = serviceType === 'aws';
    }

    console.log(`Creating S3 client for ${serviceType === 'aws' ? 'AWS S3' : 'S3-compatible service'}:`, {
      bucket: bucketName,
      region: region || 'not specified',
      endpoint: endpoint || 'default',
      ssl: useSSL
    });

    // Create OpenDAL operator
    const operator = new Operator('s3', opendalConfig);
    
    return operator;
  } catch (error) {
    console.error('Failed to create S3 client:', error);
    throw error;
  }
}

/**
 * Test S3 connection by attempting to list objects
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} path - Path to test (default: root)
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testS3Connection(client, path = '/') {
  try {
    // Try to list objects in the bucket
    const entries = await client.list(path);
    console.log(`S3 connection test successful. Found ${entries.length} entries at path: ${path}`);
    return true;
  } catch (error) {
    console.error('S3 connection test failed:', error);
    return false;
  }
}

/**
 * List files and directories in S3 bucket
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} path - Path to list (default: root)
 * @param {boolean} recursive - List recursively (default: false)
 * @returns {Promise<Array>} Array of file/directory information
 */
export async function listS3Objects(client, path = '/', recursive = false) {
  try {
    const entries = await client.list(path);
    
    const objects = entries.map(entry => ({
      name: entry.name,
      path: entry.path,
      isFile: entry.metadata?.mode === 'file',
      isDirectory: entry.metadata?.mode === 'dir',
      size: entry.metadata?.content_length || 0,
      lastModified: entry.metadata?.last_modified,
      etag: entry.metadata?.etag
    }));

    // If recursive and we found directories, list them too
    if (recursive) {
      const directories = objects.filter(obj => obj.isDirectory);
      for (const dir of directories) {
        const subObjects = await listS3Objects(client, dir.path, true);
        objects.push(...subObjects);
      }
    }

    return objects;
  } catch (error) {
    console.error('Failed to list S3 objects:', error);
    throw error;
  }
}

/**
 * Upload a file to S3
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} key - S3 object key (path)
 * @param {File|Blob|ArrayBuffer|string} data - File data to upload
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToS3(client, key, data, metadata = {}) {
  try {
    console.log(`Uploading to S3: ${key}`);
    
    // Convert data to appropriate format
    let uploadData;
    if (data instanceof File) {
      uploadData = await data.arrayBuffer();
    } else if (data instanceof Blob) {
      uploadData = await data.arrayBuffer();
    } else {
      uploadData = data;
    }

    await client.write(key, uploadData);
    
    console.log(`Successfully uploaded: ${key}`);
    return {
      success: true,
      key: key,
      size: uploadData.byteLength || uploadData.length || 0
    };
  } catch (error) {
    console.error(`Failed to upload ${key}:`, error);
    throw error;
  }
}

/**
 * Download a file from S3
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} key - S3 object key (path)
 * @returns {Promise<ArrayBuffer>} File data
 */
export async function downloadFromS3(client, key) {
  try {
    console.log(`Downloading from S3: ${key}`);
    const data = await client.read(key);
    console.log(`Successfully downloaded: ${key}`);
    return data;
  } catch (error) {
    console.error(`Failed to download ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} key - S3 object key (path)
 * @returns {Promise<boolean>} True if deletion successful
 */
export async function deleteFromS3(client, key) {
  try {
    console.log(`Deleting from S3: ${key}`);
    await client.delete(key);
    console.log(`Successfully deleted: ${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * Check if an object exists in S3
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} key - S3 object key (path)
 * @returns {Promise<boolean>} True if object exists
 */
export async function s3ObjectExists(client, key) {
  try {
    const metadata = await client.stat(key);
    return !!metadata;
  } catch (error) {
    // Object doesn't exist or error accessing it
    return false;
  }
}

/**
 * Get object metadata from S3
 * @param {Operator} client - OpenDAL operator instance
 * @param {string} key - S3 object key (path)
 * @returns {Promise<Object>} Object metadata
 */
export async function getS3ObjectMetadata(client, key) {
  try {
    const metadata = await client.stat(key);
    return {
      size: metadata.content_length || 0,
      lastModified: metadata.last_modified,
      etag: metadata.etag,
      contentType: metadata.content_type,
      exists: true
    };
  } catch (error) {
    console.error(`Failed to get metadata for ${key}:`, error);
    return { exists: false };
  }
}

/**
 * Create a storage location client from stored configuration
 * @param {Object} locationConfig - Storage location configuration
 * @returns {Promise<Operator|null>} OpenDAL operator instance or null if not S3
 */
export async function createClientFromLocation(locationConfig) {
  if (locationConfig.type !== 's3') {
    return null;
  }

  return await createS3Client({
    bucketName: locationConfig.bucketName,
    region: locationConfig.region,
    accessKeyId: locationConfig.accessKeyId,
    secretAccessKey: locationConfig.secretAccessKey,
    endpoint: locationConfig.endpoint,
    useSSL: locationConfig.useSSL !== false, // Default to true
    serviceType: locationConfig.serviceType || 'aws'
  });
}
