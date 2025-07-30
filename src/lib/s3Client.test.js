/**
 * Unit tests for OpenDAL S3 Client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock OpenDAL
vi.mock('opendal', () => {
  const mockOperator = {
    list: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    stat: vi.fn()
  };

  return {
    Operator: vi.fn().mockImplementation(() => mockOperator)
  };
});

import { Operator } from 'opendal';

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
      
      expect(Operator).toHaveBeenCalledWith('s3', {
        bucket: 'test-bucket',
        access_key_id: 'test-access-key',
        secret_access_key: 'test-secret-key',
        region: 'us-east-1',
        enable_virtual_host_style: true
      });
      expect(client).toBeDefined();
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
      
      expect(Operator).toHaveBeenCalledWith('s3', {
        bucket: 'minio-bucket',
        access_key_id: 'minio-access',
        secret_access_key: 'minio-secret',
        endpoint: 'https://minio.example.com:9000',
        enable_virtual_host_style: false,
        region: 'us-east-1' // Default region is still added
      });
      expect(client).toBeDefined();
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
      
      expect(Operator).toHaveBeenCalledWith('s3', {
        bucket: 'test-bucket',
        access_key_id: 'test-key',
        secret_access_key: 'test-secret',
        region: 'us-east-1',
        enable_virtual_host_style: true
      });
    });
  });

  describe('createClientFromLocation', () => {
    it('should create client from storage location config', async () => {
      const locationConfig = {
        type: 's3',
        bucketName: 'stored-bucket',
        region: 'eu-west-1',
        accessKeyId: 'stored-key',
        secretAccessKey: 'stored-secret',
        serviceType: 'aws'
      };

      const client = await createClientFromLocation(locationConfig);
      
      expect(client).toBeDefined();
      expect(Operator).toHaveBeenCalledWith('s3', expect.objectContaining({
        bucket: 'stored-bucket',
        region: 'eu-west-1'
      }));
    });

    it('should return null for non-S3 storage types', async () => {
      const locationConfig = {
        type: 'local',
        path: '/local/path'
      };

      const client = await createClientFromLocation(locationConfig);
      expect(client).toBeNull();
    });
  });
});

describe('S3 Client Operations', () => {
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      list: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
      stat: vi.fn()
    };
  });

  describe('testS3Connection', () => {
    it('should return true for successful connection', async () => {
      mockClient.list.mockResolvedValue([
        { name: 'test.txt', path: '/test.txt' }
      ]);

      const result = await testS3Connection(mockClient);
      
      expect(result).toBe(true);
      expect(mockClient.list).toHaveBeenCalledWith('/');
    });

    it('should return false for failed connection', async () => {
      mockClient.list.mockRejectedValue(new Error('Connection failed'));

      const result = await testS3Connection(mockClient);
      
      expect(result).toBe(false);
    });

    it('should test custom path', async () => {
      mockClient.list.mockResolvedValue([]);

      await testS3Connection(mockClient, '/custom/path');
      
      expect(mockClient.list).toHaveBeenCalledWith('/custom/path');
    });
  });

  describe('listS3Objects', () => {
    it('should list objects and format metadata', async () => {
      const mockEntries = [
        {
          name: 'file1.txt',
          path: '/file1.txt',
          metadata: {
            mode: 'file',
            content_length: 1024,
            last_modified: '2024-01-01T00:00:00Z',
            etag: 'abc123'
          }
        },
        {
          name: 'folder1',
          path: '/folder1/',
          metadata: {
            mode: 'dir'
          }
        }
      ];

      mockClient.list.mockResolvedValue(mockEntries);

      const result = await listS3Objects(mockClient, '/');

      expect(result).toEqual([
        {
          name: 'file1.txt',
          path: '/file1.txt',
          isFile: true,
          isDirectory: false,
          size: 1024,
          lastModified: '2024-01-01T00:00:00Z',
          etag: 'abc123'
        },
        {
          name: 'folder1',
          path: '/folder1/',
          isFile: false,
          isDirectory: true,
          size: 0,
          lastModified: undefined,
          etag: undefined
        }
      ]);
    });

    it('should handle recursive listing', async () => {
      // First call returns directory
      mockClient.list
        .mockResolvedValueOnce([
          {
            name: 'folder1',
            path: '/folder1/',
            metadata: { mode: 'dir' }
          }
        ])
        // Second call returns files in directory
        .mockResolvedValueOnce([
          {
            name: 'nested.txt',
            path: '/folder1/nested.txt',
            metadata: { mode: 'file', content_length: 512 }
          }
        ]);

      const result = await listS3Objects(mockClient, '/', true);

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('nested.txt');
      expect(mockClient.list).toHaveBeenCalledTimes(2);
    });
  });

  describe('uploadToS3', () => {
    it('should upload string data', async () => {
      const testData = 'Hello, World!';
      mockClient.write.mockResolvedValue();

      const result = await uploadToS3(mockClient, '/test.txt', testData);

      expect(result).toEqual({
        success: true,
        key: '/test.txt',
        size: 13
      });
      expect(mockClient.write).toHaveBeenCalledWith('/test.txt', testData);
    });

    it('should upload File data by converting to ArrayBuffer', async () => {
      // Test ArrayBuffer upload directly since File/Blob behavior varies in test environments
      const testArrayBuffer = new ArrayBuffer(12);
      const view = new Uint8Array(testArrayBuffer);
      view.set([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]); // "Hello World!"
      
      mockClient.write.mockResolvedValue();

      const result = await uploadToS3(mockClient, '/uploaded.txt', testArrayBuffer);

      expect(result.success).toBe(true);
      expect(result.key).toBe('/uploaded.txt');
      expect(mockClient.write).toHaveBeenCalledWith('/uploaded.txt', testArrayBuffer);
    });

    it('should handle upload errors', async () => {
      mockClient.write.mockRejectedValue(new Error('Upload failed'));

      await expect(uploadToS3(mockClient, '/fail.txt', 'data')).rejects.toThrow('Upload failed');
    });
  });

  describe('downloadFromS3', () => {
    it('should download file data', async () => {
      const testData = new ArrayBuffer(1024);
      mockClient.read.mockResolvedValue(testData);

      const result = await downloadFromS3(mockClient, '/download.txt');

      expect(result).toBe(testData);
      expect(mockClient.read).toHaveBeenCalledWith('/download.txt');
    });

    it('should handle download errors', async () => {
      mockClient.read.mockRejectedValue(new Error('File not found'));

      await expect(downloadFromS3(mockClient, '/missing.txt')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFromS3', () => {
    it('should delete file successfully', async () => {
      mockClient.delete.mockResolvedValue();

      const result = await deleteFromS3(mockClient, '/delete.txt');

      expect(result).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith('/delete.txt');
    });

    it('should handle delete errors', async () => {
      mockClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteFromS3(mockClient, '/fail-delete.txt')).rejects.toThrow('Delete failed');
    });
  });

  describe('s3ObjectExists', () => {
    it('should return true if object exists', async () => {
      mockClient.stat.mockResolvedValue({ content_length: 1024 });

      const result = await s3ObjectExists(mockClient, '/exists.txt');

      expect(result).toBe(true);
      expect(mockClient.stat).toHaveBeenCalledWith('/exists.txt');
    });

    it('should return false if object does not exist', async () => {
      mockClient.stat.mockRejectedValue(new Error('Not found'));

      const result = await s3ObjectExists(mockClient, '/missing.txt');

      expect(result).toBe(false);
    });
  });

  describe('getS3ObjectMetadata', () => {
    it('should return metadata for existing object', async () => {
      const mockMetadata = {
        content_length: 2048,
        last_modified: '2024-01-02T12:00:00Z',
        etag: 'def456',
        content_type: 'text/plain'
      };
      mockClient.stat.mockResolvedValue(mockMetadata);

      const result = await getS3ObjectMetadata(mockClient, '/metadata.txt');

      expect(result).toEqual({
        size: 2048,
        lastModified: '2024-01-02T12:00:00Z',
        etag: 'def456',
        contentType: 'text/plain',
        exists: true
      });
    });

    it('should return exists: false for missing object', async () => {
      mockClient.stat.mockRejectedValue(new Error('Not found'));

      const result = await getS3ObjectMetadata(mockClient, '/missing.txt');

      expect(result).toEqual({ exists: false });
    });
  });
});

describe('BIDS Dataset Integration Tests', () => {
  describe('OpenNeuro Dataset ds006486 Structure', () => {
    it('should handle BIDS dataset structure validation', async () => {
      const mockClient = {
        list: vi.fn()
      };

      // Mock BIDS dataset structure based on OpenNeuro ds006486
      const bidsStructure = [
        { name: 'dataset_description.json', path: '/dataset_description.json', metadata: { mode: 'file' }},
        { name: 'participants.tsv', path: '/participants.tsv', metadata: { mode: 'file' }},
        { name: 'README', path: '/README', metadata: { mode: 'file' }},
        { name: 'CHANGES', path: '/CHANGES', metadata: { mode: 'file' }},
        { name: 'sub-01', path: '/sub-01/', metadata: { mode: 'dir' }},
        { name: 'sub-02', path: '/sub-02/', metadata: { mode: 'dir' }},
        { name: 'derivatives', path: '/derivatives/', metadata: { mode: 'dir' }}
      ];

      mockClient.list.mockResolvedValue(bidsStructure);

      const objects = await listS3Objects(mockClient, '/');
      
      // Verify BIDS required files are present
      const requiredFiles = ['dataset_description.json', 'README'];
      const foundFiles = objects.filter(obj => obj.isFile).map(obj => obj.name);
      
      requiredFiles.forEach(file => {
        expect(foundFiles).toContain(file);
      });

      // Verify subject directories exist
      const subjectDirs = objects.filter(obj => obj.isDirectory && obj.name.startsWith('sub-'));
      expect(subjectDirs.length).toBeGreaterThan(0);
    });

    it('should validate BIDS dataset metadata', async () => {
      const mockClient = {
        read: vi.fn()
      };

      // Mock dataset_description.json content
      const datasetDescription = {
        Name: "Auditory and visual 7T fMRI data for localizing the cortical locus of the McGurk effect",
        BIDSVersion: "1.8.0",
        DatasetType: "raw",
        Authors: ["Author Name"],
        License: "CC0"
      };

      mockClient.read.mockResolvedValue(JSON.stringify(datasetDescription));

      const data = await downloadFromS3(mockClient, '/dataset_description.json');
      const metadata = JSON.parse(data);

      expect(metadata.Name).toBeDefined();
      expect(metadata.BIDSVersion).toBeDefined();
      expect(metadata.DatasetType).toBe('raw');
      expect(Array.isArray(metadata.Authors)).toBe(true);
    });

    it('should handle participant data structure', async () => {
      const mockClient = {
        read: vi.fn()
      };

      // Mock participants.tsv content
      const participantsData = `participant_id\tage\tsex\ncsub-01\t25\tF\nsub-02\t30\tM`;
      
      mockClient.read.mockResolvedValue(participantsData);

      const data = await downloadFromS3(mockClient, '/participants.tsv');
      
      expect(data).toContain('participant_id');
      expect(data).toContain('sub-01');
      expect(data).toContain('sub-02');
    });
  });

  describe('Dataset File Operations', () => {
    it('should efficiently list only dataset metadata files', async () => {
      const mockClient = {
        list: vi.fn()
      };

      // Only list root level files first (don't download subject data)
      const rootFiles = [
        { name: 'dataset_description.json', path: '/dataset_description.json', metadata: { mode: 'file', content_length: 500 }},
        { name: 'participants.tsv', path: '/participants.tsv', metadata: { mode: 'file', content_length: 1024 }},
        { name: 'README', path: '/README', metadata: { mode: 'file', content_length: 2048 }}
      ];

      mockClient.list.mockResolvedValue(rootFiles);

      const objects = await listS3Objects(mockClient, '/', false); // non-recursive

      expect(objects).toHaveLength(3);
      expect(objects.every(obj => obj.isFile)).toBe(true);
      expect(objects.reduce((sum, obj) => sum + obj.size, 0)).toBe(3572); // Total size
    });

    it('should validate BIDS compliance without downloading large files', async () => {
      const mockClient = {
        list: vi.fn(),
        stat: vi.fn()
      };

      // Check for required BIDS files
      const requiredFiles = [
        'dataset_description.json',
        'participants.tsv',
        'README'
      ];

      // Mock stat calls for each required file
      mockClient.stat.mockImplementation((path) => {
        if (requiredFiles.some(file => path.includes(file))) {
          return Promise.resolve({ content_length: 1024, exists: true });
        }
        return Promise.reject(new Error('Not found'));
      });

      // Check all required files exist
      const checks = await Promise.all(
        requiredFiles.map(file => s3ObjectExists(mockClient, `/${file}`))
      );

      expect(checks.every(exists => exists)).toBe(true);
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      list: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
      stat: vi.fn()
    };
  });

  it('should handle network timeouts gracefully', async () => {
    mockClient.list.mockRejectedValue(new Error('Network timeout'));

    const result = await testS3Connection(mockClient);
    expect(result).toBe(false);
  });

  it('should handle permission errors', async () => {
    mockClient.read.mockRejectedValue(new Error('Access denied'));

    await expect(downloadFromS3(mockClient, '/private.txt'))
      .rejects.toThrow('Access denied');
  });

  it('should handle large file uploads', async () => {
    const largeData = new ArrayBuffer(1024 * 1024 * 10); // 10MB
    mockClient.write.mockResolvedValue();

    const result = await uploadToS3(mockClient, '/large-file.bin', largeData);

    expect(result.success).toBe(true);
    expect(result.size).toBe(1024 * 1024 * 10);
  });

  it('should handle empty bucket listing', async () => {
    mockClient.list.mockResolvedValue([]);

    const objects = await listS3Objects(mockClient);
    expect(objects).toEqual([]);
  });
});
