/**
 * Unit tests for AWS SDK v3 S3 Client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createS3Client,
  testS3Connection,
  listS3Objects,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  s3ObjectExists,
  getS3ObjectMetadata,
  createClientFromLocation
} from '../lib/s3Client.js';

// Mock AWS SDK v3
vi.mock('@aws-sdk/client-s3', () => {
  const mockS3Client = {
    send: vi.fn()
  };

  return {
    S3Client: vi.fn().mockImplementation(() => mockS3Client),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn()
  };
});

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

describe('S3 Client Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createS3Client', () => {
    it('should create AWS S3 client with required configuration', async () => {
      const config = {
        bucketName: 'test-bucket',
        region: 'us-east-1',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        serviceType: 'aws'
      };

      const client = await createS3Client(config);
      
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      });
      expect(client).toBeDefined();
      expect(client.bucket).toBe('test-bucket');
      expect(client.client).toBeDefined();
    });

    it('should create S3-compatible client with custom endpoint', async () => {
      const config = {
        bucketName: 'minio-bucket',
        accessKeyId: 'minio-access',
        secretAccessKey: 'minio-secret',
        endpoint: 'https://minio.example.com:9000',
        useSSL: true,
        serviceType: 'compatible'
      };

      const client = await createS3Client(config);
      
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'minio-access',
          secretAccessKey: 'minio-secret'
        },
        endpoint: 'https://minio.example.com:9000',
        forcePathStyle: true
      });
      expect(client).toBeDefined();
      expect(client.bucket).toBe('minio-bucket');
    });

    it('should throw error for missing required fields', async () => {
      const config = {
        bucketName: 'test-bucket'
        // Missing accessKeyId and secretAccessKey
      };

      await expect(createS3Client(config)).rejects.toThrow(
        'Missing required S3 configuration: bucketName, accessKeyId, or secretAccessKey'
      );
    });

    it('should use default values for optional fields', async () => {
      const config = {
        bucketName: 'test-bucket',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      };

      await createS3Client(config);
      
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      });
    });
  });

  describe('createClientFromLocation', () => {
    it('should create client from storage location config', async () => {
      const location = {
        type: 's3',
        bucket: 'location-bucket',
        region: 'us-west-2',
        accessKey: 'location-access-key',
        secretKey: 'location-secret-key',
        endpoint: 'https://custom.s3.com',
        serviceType: 'compatible'
      };

      const client = await createClientFromLocation(location);
      
      expect(client).toBeDefined();
      expect(client.bucket).toBe('location-bucket');
    });

    it('should return null for non-S3 storage types', async () => {
      const location = {
        type: 'local',
        path: '/local/path'
      };

      const result = await createClientFromLocation(location);
      
      expect(result).toBeNull();
    });
  });
});

describe('S3 Client Operations', () => {
  let mockClient;
  let mockClientWrapper;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock S3Client instance
    mockClient = {
      send: vi.fn()
    };
    
    // Create proper client wrapper structure 
    mockClientWrapper = {
      client: mockClient,
      bucket: 'test-bucket',
      region: 'us-east-1',
      endpoint: 'default'
    };
    
    // Mock S3Client constructor to return our mock
    S3Client.mockImplementation(() => mockClient);
  });

  describe('testS3Connection', () => {
    it('should return true for successful connection', async () => {
      mockClient.send.mockResolvedValue({ Contents: [{ Key: 'test.txt', Size: 100 }] });

      const result = await testS3Connection(mockClientWrapper);
      
      expect(result).toBe(true);
      expect(mockClient.send).toHaveBeenCalled();
      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: '',
        MaxKeys: 1
      });
    });

    it('should return false for failed connection', async () => {
      mockClient.send.mockRejectedValue(new Error('Connection failed'));

      const result = await testS3Connection(mockClientWrapper);
      
      expect(result).toBe(false);
    });

    it('should test custom path', async () => {
      mockClient.send.mockResolvedValue({ Contents: [] });

      await testS3Connection(mockClientWrapper, '/custom/path');
      
      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',  
        Prefix: 'custom/path/',
        MaxKeys: 1
      });
    });
  });

  describe('listS3Objects', () => {
    it('should list objects and format metadata', async () => {
      const mockResponse = {
        Contents: [
          {
            Key: 'file1.txt',
            Size: 1024,
            LastModified: new Date('2024-01-01T00:00:00Z')
          }
        ],
        CommonPrefixes: [
          {
            Prefix: 'folder1/'
          }
        ]
      };

      mockClient.send.mockResolvedValue(mockResponse);

      const result = await listS3Objects(mockClientWrapper, '/');

      expect(result).toEqual([
        {
          name: 'file1.txt',
          path: '/file1.txt',
          isFile: true,
          isDirectory: false,
          size: 1024,
          lastModified: new Date('2024-01-01T00:00:00Z')
        },
        {
          name: 'folder1',
          path: '/folder1/',
          size: 0,
          isFile: false,
          isDirectory: true
        }
      ]);
    });

    it('should handle recursive listing', async () => {
      const mockResponse = {
        Contents: [
          {
            Key: 'file1.txt',
            Size: 1024,
            LastModified: new Date('2024-01-01T00:00:00Z')
          }
        ]
      };

      mockClient.send.mockResolvedValue(mockResponse);

      await listS3Objects(mockClientWrapper, '/', true);

      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: '',
        Delimiter: undefined // No delimiter for recursive listing
      });
    });
  });

  describe('uploadToS3', () => {
    it('should upload string data', async () => {
      mockClient.send.mockResolvedValue({});

      const result = await uploadToS3(mockClientWrapper, '/test.txt', 'test data');

      expect(result).toEqual({
        success: true,
        key: '/test.txt',
        size: 9
      });
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test.txt',
        Body: 'test data',
        Metadata: {}
      });
    });

    it('should handle upload errors', async () => {
      mockClient.send.mockRejectedValue(new Error('Upload failed'));

      await expect(uploadToS3(mockClientWrapper, '/fail.txt', 'data')).rejects.toThrow('Upload failed');
    });
  });

  describe('downloadFromS3', () => {
    it('should download file data', async () => {
      const mockReadableStream = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([116, 101, 115, 116]) }) // 'test'
            .mockResolvedValueOnce({ done: true })
        })
      };

      mockClient.send.mockResolvedValue({
        Body: mockReadableStream
      });

      const result = await downloadFromS3(mockClientWrapper, '/download.txt');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'download.txt'
      });
    });

    it('should handle download errors', async () => {
      mockClient.send.mockRejectedValue(new Error('File not found'));

      await expect(downloadFromS3(mockClientWrapper, '/missing.txt')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFromS3', () => {
    it('should delete file successfully', async () => {
      mockClient.send.mockResolvedValue({});

      const result = await deleteFromS3(mockClientWrapper, '/delete.txt');

      expect(result).toEqual({
        success: true,
        key: '/delete.txt'
      });
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'delete.txt'
      });
    });

    it('should handle delete errors', async () => {
      mockClient.send.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteFromS3(mockClientWrapper, '/fail-delete.txt')).rejects.toThrow('Delete failed');
    });
  });

  describe('s3ObjectExists', () => {
    it('should return true if object exists', async () => {
      mockClient.send.mockResolvedValue({});

      const result = await s3ObjectExists(mockClientWrapper, '/exists.txt');

      expect(result).toBe(true);
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'exists.txt'
      });
    });

    it('should return false if object does not exist', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'NotFound';
      mockClient.send.mockRejectedValue(notFoundError);

      const result = await s3ObjectExists(mockClientWrapper, '/missing.txt');

      expect(result).toBe(false);
    });
  });

  describe('getS3ObjectMetadata', () => {
    it('should return metadata for existing object', async () => {
      const mockResponse = {
        ContentLength: 1024,
        LastModified: new Date('2024-01-01T00:00:00Z'),
        ContentType: 'text/plain',
        Metadata: { 'custom-key': 'custom-value' }
      };

      mockClient.send.mockResolvedValue(mockResponse);

      const result = await getS3ObjectMetadata(mockClientWrapper, '/file.txt');

      expect(result).toEqual({
        exists: true,
        size: 1024,
        lastModified: new Date('2024-01-01T00:00:00Z'),
        contentType: 'text/plain',
        metadata: { 'custom-key': 'custom-value' }
      });
    });

    it('should return exists: false for missing object', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'NotFound';
      mockClient.send.mockRejectedValue(notFoundError);

      const result = await getS3ObjectMetadata(mockClientWrapper, '/missing.txt');

      expect(result).toEqual({
        exists: false,
        size: 0,
        lastModified: null,
        contentType: null,
        metadata: {}
      });
    });
  });
});
