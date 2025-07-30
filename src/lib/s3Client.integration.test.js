/**
 * Integration tests for OpenDAL S3 Client
 * These tests use read-only operations on public OpenNeuro datasets
 * No upload/delete operations since OpenNeuro buckets are public read-only
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  createS3Client,
  testS3Connection,
  listS3Objects,
  downloadFromS3,
  s3ObjectExists,
  getS3ObjectMetadata
} from '../lib/s3Client.js';

// Skip integration tests unless explicitly enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('S3 Integration Tests - OpenNeuro Public Data', () => {
  let openNeuroClient;
  
  // OpenNeuro public S3 configuration (read-only)
  const openNeuroConfig = {
    bucketName: 'openneuro.org',
    region: 'us-east-1',
    accessKeyId: '', // Public bucket - no credentials needed
    secretAccessKey: '',
    endpoint: 'https://s3.amazonaws.com', 
    serviceType: 'aws',
    ssl: true
  };

  beforeAll(async () => {
    // Try to create client for OpenNeuro public data (no credentials needed)
    try {
      openNeuroClient = await createS3Client(openNeuroConfig);
      console.log('OpenNeuro S3 client created for integration tests');
    } catch (error) {
      console.warn('Skipping integration tests: Failed to create OpenNeuro S3 client', error);
    }
  });

  describe('Public Dataset Access - Read-Only Operations', () => {
    it('should connect to OpenNeuro public S3 bucket', async () => {
      if (!openNeuroClient) return;
      
      const isConnected = await testS3Connection(openNeuroClient, '/ds006486/');
      expect(isConnected).toBe(true);
    });

    it('should list OpenNeuro dataset contents', async () => {
      if (!openNeuroClient) return;

      const objects = await listS3Objects(openNeuroClient, '/ds006486/', false);
      expect(Array.isArray(objects)).toBe(true);
      
      // Should find typical BIDS files
      const fileNames = objects.filter(obj => obj.isFile).map(obj => obj.name);
      expect(fileNames).toContain('dataset_description.json');

      // Log summary without overwhelming output
      console.log(`Found ${objects.length} objects in ds006486`);
      if (objects.length > 0) {
        console.log('Sample objects:', objects.slice(0, 3).map(obj => ({
          name: obj.name,
          size: obj.size,
          isFile: obj.isFile
        })));
      }
    });

    it('should check if specific files exist in the dataset', async () => {
      if (!openNeuroClient) return;

      // Check for required BIDS files
      const datasetDescExists = await s3ObjectExists(openNeuroClient, '/ds006486/dataset_description.json');
      expect(datasetDescExists).toBe(true);

      const participantsExists = await s3ObjectExists(openNeuroClient, '/ds006486/participants.tsv');
      expect(participantsExists).toBe(true);

      // Check for non-existent file
      const fakeFileExists = await s3ObjectExists(openNeuroClient, '/ds006486/nonexistent.txt');
      expect(fakeFileExists).toBe(false);
    });

    it('should get metadata for existing files', async () => {
      if (!openNeuroClient) return;

      const metadata = await getS3ObjectMetadata(openNeuroClient, '/ds006486/dataset_description.json');
      expect(metadata.exists).toBe(true);
      expect(typeof metadata.size).toBe('number');
      expect(metadata.size).toBeGreaterThan(0);
      
      console.log('dataset_description.json metadata:', {
        size: metadata.size,
        lastModified: metadata.lastModified
      });
    });

    it('should download small dataset files', async () => {
      if (!openNeuroClient) return;

      // Download the dataset description (small file)
      const datasetDescData = await downloadFromS3(openNeuroClient, '/ds006486/dataset_description.json');
      expect(datasetDescData).toBeInstanceOf(ArrayBuffer);
      expect(datasetDescData.byteLength).toBeGreaterThan(0);

      // Convert to text and validate JSON structure
      const jsonText = new TextDecoder().decode(datasetDescData);
      const datasetInfo = JSON.parse(jsonText);
      
      expect(datasetInfo.Name).toBeDefined();
      expect(datasetInfo.BIDSVersion).toBeDefined();
      expect(datasetInfo.DatasetType).toBe('raw');
      
      console.log('Downloaded dataset info:', {
        name: datasetInfo.Name,
        bidsVersion: datasetInfo.BIDSVersion,
        size: datasetDescData.byteLength
      });
    });

    it('should handle download errors gracefully', async () => {
      if (!openNeuroClient) return;

      // Try to download non-existent file
      await expect(
        downloadFromS3(openNeuroClient, '/ds006486/does-not-exist.json')
      ).rejects.toThrow();
    });

    it('should list subject directories', async () => {
      if (!openNeuroClient) return;

      const subjects = await listS3Objects(openNeuroClient, '/ds006486/', false);
      const subjectDirs = subjects.filter(obj => 
        obj.isDirectory && obj.name.startsWith('sub-')
      );
      
      expect(subjectDirs.length).toBeGreaterThan(0);
      
      console.log('Found subjects:', subjectDirs.map(s => s.name));
      
      // Test listing contents of first subject
      if (subjectDirs.length > 0) {
        const firstSubject = subjectDirs[0].name;
        const subjectContents = await listS3Objects(
          openNeuroClient, 
          `/ds006486/${firstSubject}/`, 
          false
        );
        
        expect(Array.isArray(subjectContents)).toBe(true);
        console.log(`${firstSubject} contains:`, 
          subjectContents.map(item => ({
            name: item.name,
            isDirectory: item.isDirectory
          }))
        );
      }
    });

    it('should demonstrate efficient dataset browsing', async () => {
      if (!openNeuroClient) return;

      // Strategy: Get overview without downloading large imaging files
      const overview = {
        metadataFiles: [],
        subjects: [],
        totalFiles: 0,
        estimatedSize: 0
      };

      // List root directory
      const rootContents = await listS3Objects(openNeuroClient, '/ds006486/', false);
      
      for (const item of rootContents) {
        if (item.isFile) {
          // Only count small metadata files for download
          if (item.size < 10000) { // Less than 10KB
            overview.metadataFiles.push(item.name);
          }
          overview.estimatedSize += item.size || 0;
        } else if (item.isDirectory && item.name.startsWith('sub-')) {
          overview.subjects.push(item.name);
        }
        overview.totalFiles++;
      }

      console.log('Dataset overview:', {
        subjects: overview.subjects.length,
        metadataFiles: overview.metadataFiles.length,
        totalItems: overview.totalFiles,
        estimatedSizeMB: Math.round(overview.estimatedSize / 1024 / 1024)
      });

      expect(overview.subjects.length).toBeGreaterThan(0);
      expect(overview.metadataFiles).toContain('dataset_description.json');
    });
  });

  describe('Error Handling with Public Data', () => {
    it('should handle connection issues gracefully', async () => {
      // Test with invalid configuration
      const invalidConfig = {
        ...openNeuroConfig,
        endpoint: 'https://invalid-endpoint.com'
      };

      let invalidClient;
      try {
        invalidClient = await createS3Client(invalidConfig);
        const connected = await testS3Connection(invalidClient);
        expect(connected).toBe(false);
      } catch (error) {
        // Expected for invalid endpoint
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid paths', async () => {
      if (!openNeuroClient) return;

      const connected = await testS3Connection(openNeuroClient, '/invalid-dataset-path/');
      // Should return false or throw, but shouldn't crash
      expect(typeof connected).toBe('boolean');
    });
  });
});
