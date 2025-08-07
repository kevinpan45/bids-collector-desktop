/**
 * Unit tests for S3 Client download functionality
 * Testing download of OpenNeuro datasets to local disk
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { downloadDatasetWithS3, createS3Client, extractOpenNeuroAccession } from './s3Client.js';

// Mock Tauri APIs since we're running in Node.js environment
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...paths) => paths.join('/'))
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn()
}));

// Mock AWS S3 SDK
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn();
  const mockS3Client = vi.fn(() => ({
    send: mockSend
  }));
  
  const MockListObjectsV2Command = vi.fn((params) => ({
    constructor: { name: 'ListObjectsV2Command' },
    input: params
  }));
  
  const MockGetObjectCommand = vi.fn((params) => ({
    constructor: { name: 'GetObjectCommand' },
    input: params
  }));
  
  const MockHeadBucketCommand = vi.fn((params) => ({
    constructor: { name: 'HeadBucketCommand' },
    input: params
  }));
  
  return {
    S3Client: mockS3Client,
    ListObjectsV2Command: MockListObjectsV2Command,
    GetObjectCommand: MockGetObjectCommand,
    HeadBucketCommand: MockHeadBucketCommand,
    __mockSend: mockSend,
    __mockS3Client: mockS3Client
  };
});

import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { S3Client, ListObjectsV2Command, GetObjectCommand, __mockSend } from '@aws-sdk/client-s3';

describe('S3Client - Download Dataset to Local Disk', () => {
  let tempDir;
  let mockProgressCallback;

  beforeEach(async () => {
    // Create temporary directory for test downloads
    tempDir = await mkdtemp(join(tmpdir(), 'bids-collector-test-'));
    
    // Mock progress callback
    mockProgressCallback = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error.message);
    }
  });

  describe('createS3Client', () => {
    it('should create anonymous S3 client for OpenNeuro', () => {
      const config = {
        bucketName: 'openneuro.org',
        region: 'us-east-1',
        anonymous: true
      };

      const client = createS3Client(config);
      
      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: expect.any(Function)
      });
    });

    it('should create authenticated S3 client with credentials', () => {
      const config = {
        bucketName: 'private-bucket',
        region: 'us-west-2',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      };

      const client = createS3Client(config);
      
      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-west-2',
        forcePathStyle: true,
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      });
    });
  });

  describe('downloadDatasetWithS3 - ds006486', () => {
    const sampleTask = {
      id: 'test-task-1',
      name: 'Test Download: ds006486',
      downloadPath: 'ds006486',
      datasetId: 'ds006486'
    };

    const sourceConfig = {
      bucketName: 'openneuro.org',
      region: 'us-east-1',
      anonymous: true,
      forcePathStyle: false
    };

    const destLocation = {
      id: 'local-1',
      name: 'Test Local Storage',
      type: 'local',
      path: '/tmp/test-downloads'
    };

    it('should successfully download ds006486 dataset to local disk', async () => {
      // Mock S3 ListObjectsV2 response for ds006486
      const mockObjects = [
        { Key: 'ds006486/dataset_description.json', Size: 156 },
        { Key: 'ds006486/README', Size: 1024 },
        { Key: 'ds006486/participants.tsv', Size: 512 },
        { Key: 'ds006486/sub-01/anat/sub-01_T1w.nii.gz', Size: 8388608 },
        { Key: 'ds006486/sub-01/func/sub-01_task-rest_bold.nii.gz', Size: 16777216 }
      ];

      // Mock ListObjectsV2Command response
      __mockSend.mockImplementation((command) => {
        if (command.constructor.name === 'ListObjectsV2Command') {
          return Promise.resolve({
            Contents: mockObjects
          });
        }
        
        // Mock GetObjectCommand response
        if (command.constructor.name === 'GetObjectCommand') {
          const objectKey = command.input.Key;
          const mockObject = mockObjects.find(obj => obj.Key === objectKey);
          const mockData = new Uint8Array(mockObject?.Size || 100).fill(65); // Fill with 'A'
          
          return Promise.resolve({
            Body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ done: false, value: mockData })
                  .mockResolvedValueOnce({ done: true })
              })
            }
          });
        }
        
        return Promise.resolve({});
      });

      const result = await downloadDatasetWithS3(
        sampleTask,
        sourceConfig,
        destLocation,
        mockProgressCallback
      );

      // Verify download was successful
      expect(result).toBe(true);

      // Verify progress callbacks were called
      expect(mockProgressCallback).toHaveBeenCalledWith({
        status: 'downloading',
        progress: 0,
        startedAt: expect.any(String)
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        totalSize: expect.any(Number),
        downloadedSize: 0
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        status: 'completed',
        progress: 100,
        completedAt: expect.any(String)
      });

      // Verify S3 client was called correctly
      expect(__mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            Bucket: 'openneuro.org',
            Prefix: 'ds006486'
          }
        })
      );

      // Verify files were written to local disk
      expect(writeFile).toHaveBeenCalledTimes(mockObjects.length);
      expect(mkdir).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      __mockSend.mockRejectedValue(new Error('Network error: Connection timeout'));

      const result = await downloadDatasetWithS3(
        sampleTask,
        sourceConfig,
        destLocation,
        mockProgressCallback
      );

      // Verify download failed
      expect(result).toBe(false);

      // Verify error callback was called
      expect(mockProgressCallback).toHaveBeenCalledWith({
        status: 'failed',
        errorMessage: 'Network error: Connection timeout'
      });
    });

    it('should handle empty dataset gracefully', async () => {
      // Mock empty S3 response
      __mockSend.mockResolvedValue({
        Contents: []
      });

      const result = await downloadDatasetWithS3(
        sampleTask,
        sourceConfig,
        destLocation,
        mockProgressCallback
      );

      // Verify download failed
      expect(result).toBe(false);

      // Verify error callback was called with appropriate message
      expect(mockProgressCallback).toHaveBeenCalledWith({
        status: 'failed',
        errorMessage: 'No files found for dataset: ds006486'
      });
    });

    it('should track download progress correctly', async () => {
      const mockObjects = [
        { Key: 'ds006486/file1.txt', Size: 1000 },
        { Key: 'ds006486/file2.txt', Size: 2000 },
        { Key: 'ds006486/file3.txt', Size: 3000 }
      ];

      __mockSend.mockImplementation((command) => {
        if (command.constructor.name === 'ListObjectsV2Command') {
          return Promise.resolve({ Contents: mockObjects });
        }
        
        if (command.constructor.name === 'GetObjectCommand') {
          const objectKey = command.input.Key;
          const mockObject = mockObjects.find(obj => obj.Key === objectKey);
          const mockData = new Uint8Array(mockObject?.Size || 100);
          
          return Promise.resolve({
            Body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ done: false, value: mockData })
                  .mockResolvedValueOnce({ done: true })
              })
            }
          });
        }
      });

      await downloadDatasetWithS3(
        sampleTask,
        sourceConfig,
        destLocation,
        mockProgressCallback
      );

      // Verify total size was calculated correctly
      expect(mockProgressCallback).toHaveBeenCalledWith({
        totalSize: 6000, // 1000 + 2000 + 3000
        downloadedSize: 0
      });

      // Verify progress updates
      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
          downloadedSize: expect.any(Number)
        })
      );
    });
  });

  describe('extractOpenNeuroAccession', () => {
    it('should extract accession from DOI format', () => {
      const doiPath = '10.18112_openneuro.ds006486.v1.0.0';
      const result = extractOpenNeuroAccession(doiPath);
      expect(result).toBe('ds006486');
    });

    it('should return accession as-is if already in correct format', () => {
      const accessionPath = 'ds006486';
      const result = extractOpenNeuroAccession(accessionPath);
      expect(result).toBe('ds006486');
    });

    it('should handle case insensitive accession', () => {
      const accessionPath = 'DS006486';
      const result = extractOpenNeuroAccession(accessionPath);
      expect(result).toBe('ds006486');
    });

    it('should return original path if no accession found', () => {
      const invalidPath = 'invalid-path-format';
      const result = extractOpenNeuroAccession(invalidPath);
      expect(result).toBe('invalid-path-format');
    });
  });
});
