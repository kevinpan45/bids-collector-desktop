import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Create S3 client for S3-compatible services
 * @param {Object} config - S3 configuration
 * @param {string} config.endpoint - S3-compatible endpoint URL
 * @param {string} config.region - Region (default: us-east-1)
 * @param {string} config.accessKeyId - Access key ID
 * @param {string} config.secretAccessKey - Secret access key
 * @param {boolean} config.forcePathStyle - Force path style (default: true for compatibility)
 * @returns {S3Client} Configured S3 client
 */
export function createS3Client(config) {
  const clientConfig = {
    region: config.region || 'us-east-1',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle !== false, // Default to true for S3-compatible services
  };

  // Add endpoint for S3-compatible services
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
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
 * Create S3 client from storage location object
 * @param {Object} location - Storage location object
 * @returns {S3Client} Configured S3 client
 */
export function createClientFromLocation(location) {
  return createS3Client({
    endpoint: location.endpoint,
    region: location.region,
    accessKeyId: location.accessKeyId,
    secretAccessKey: location.secretAccessKey,
    forcePathStyle: true
  });
}