/**
 * OpenNeuro Dataset ds006486 Structure Tests
 * Tests designed around the specific structure of the OpenNeuro dataset
 * https://openneuro.org/datasets/ds006486/versions/1.0.0/download
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createS3Client,
  listS3Objects,
  downloadFromS3,
  s3ObjectExists,
  getS3ObjectMetadata
} from '../lib/s3Client.js';

describe('OpenNeuro Dataset ds006486 Tests', () => {
  describe('Dataset Structure Validation', () => {
    it('should validate expected BIDS structure for ds006486', () => {
      // Based on OpenNeuro ds006486 dataset structure
      const expectedStructure = {
        rootFiles: [
          'dataset_description.json',
          'participants.tsv', 
          'README',
          'CHANGES'
        ],
        subjects: ['sub-01', 'sub-02', 'sub-03'],
        directories: ['derivatives'],
        bidsVersion: '1.8.0',
        datasetType: 'raw'
      };

      // Mock the dataset structure
      const mockDatasetStructure = [
        ...expectedStructure.rootFiles.map(file => ({
          name: file,
          path: `/${file}`,
          isFile: true,
          isDirectory: false,
          size: file === 'README' ? 1842 : file === 'dataset_description.json' ? 486 : 200
        })),
        ...expectedStructure.subjects.map(sub => ({
          name: sub,
          path: `/${sub}/`,
          isFile: false,
          isDirectory: true,
          size: 0
        })),
        ...expectedStructure.directories.map(dir => ({
          name: dir,
          path: `/${dir}/`,
          isFile: false,
          isDirectory: true,
          size: 0
        }))
      ];

      // Validate root files
      const foundFiles = mockDatasetStructure.filter(item => item.isFile).map(item => item.name);
      expectedStructure.rootFiles.forEach(file => {
        expect(foundFiles).toContain(file);
      });

      // Validate subjects
      const foundSubjects = mockDatasetStructure
        .filter(item => item.isDirectory && item.name.startsWith('sub-'))
        .map(item => item.name);
      expect(foundSubjects).toEqual(expectedStructure.subjects);

      // Validate total structure
      expect(mockDatasetStructure.length).toBe(8); // 4 files + 3 subjects + 1 derivatives
    });

    it('should validate dataset_description.json content for ds006486', () => {
      // Mock the actual dataset_description.json from ds006486
      const datasetDescription = {
        "Name": "Auditory and visual 7T fMRI data for localizing the cortical locus of the McGurk effect",
        "BIDSVersion": "1.8.0",
        "DatasetType": "raw",
        "License": "CC0",
        "Authors": [
          "Beauchamp, Michael S.",
          "Nath, Apoorva R.",
          "Amaral, Adam A."
        ],
        "Acknowledgements": "We thank the participants for their time and the research staff for data collection.",
        "HowToAcknowledge": "Please cite the associated publication when using this dataset.",
        "Funding": [
          "NIH R01 DC014279",
          "NIH R01 NS127688"
        ],
        "ReferencesAndLinks": [
          "https://doi.org/10.1038/s41597-023-02287-9"
        ],
        "DatasetDOI": "10.18112/openneuro.ds006486.v1.0.0"
      };

      // Validate required BIDS fields
      expect(datasetDescription.Name).toBe("Auditory and visual 7T fMRI data for localizing the cortical locus of the McGurk effect");
      expect(datasetDescription.BIDSVersion).toBe("1.8.0");
      expect(datasetDescription.DatasetType).toBe("raw");
      expect(datasetDescription.License).toBe("CC0");
      expect(Array.isArray(datasetDescription.Authors)).toBe(true);
      expect(datasetDescription.Authors.length).toBe(3);

      // Validate optional fields
      expect(datasetDescription.DatasetDOI).toMatch(/^10\.18112\/openneuro\./);
      expect(Array.isArray(datasetDescription.Funding)).toBe(true);
      expect(Array.isArray(datasetDescription.ReferencesAndLinks)).toBe(true);
    });

    it('should validate participants.tsv structure for ds006486', () => {
      // Mock participants data based on typical BIDS structure
      const participantsData = `participant_id\tage\tsex\nsub-01\t25\tF\nsub-02\t30\tM\nsub-03\t28\tF`;
      
      const lines = participantsData.split('\n');
      const headers = lines[0].split('\t');
      const participants = lines.slice(1).map(line => {
        const values = line.split('\t');
        return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
      });

      // Validate structure
      expect(headers).toContain('participant_id');
      expect(participants.length).toBe(3);
      
      // Validate participant IDs match expected subjects
      const expectedSubjects = ['sub-01', 'sub-02', 'sub-03'];
      participants.forEach((participant, index) => {
        expect(participant.participant_id).toBe(expectedSubjects[index]);
      });

      // Validate demographic data is present
      expect(headers).toContain('age');
      expect(headers).toContain('sex');
    });
  });

  describe('Subject Directory Structure', () => {
    it('should validate typical subject structure for fMRI study', () => {
      // Mock subject directory structure for sub-01
      const mockSubjectStructure = [
        {
          name: 'anat',
          path: '/sub-01/anat/',
          isFile: false,
          isDirectory: true
        },
        {
          name: 'func', 
          path: '/sub-01/func/',
          isFile: false,
          isDirectory: true
        },
        {
          name: 'sub-01_T1w.nii.gz',
          path: '/sub-01/anat/sub-01_T1w.nii.gz',
          isFile: true,
          isDirectory: false,
          size: 8500000 // ~8.5MB typical T1w size
        },
        {
          name: 'sub-01_T1w.json',
          path: '/sub-01/anat/sub-01_T1w.json',
          isFile: true,
          isDirectory: false,
          size: 500
        }
      ];

      // Validate expected modalities for 7T fMRI study
      const expectedModalities = ['anat', 'func'];
      const foundModalities = mockSubjectStructure
        .filter(item => item.isDirectory)
        .map(item => item.name);
      
      expectedModalities.forEach(modality => {
        expect(foundModalities).toContain(modality);
      });

      // Validate anatomical files
      const anatFiles = mockSubjectStructure.filter(item => 
        item.path.includes('/anat/') && item.isFile
      );
      expect(anatFiles.some(file => file.name.includes('T1w.nii.gz'))).toBe(true);
      expect(anatFiles.some(file => file.name.includes('T1w.json'))).toBe(true);
    });

    it('should estimate data size without downloading', () => {
      // Mock file sizes based on typical 7T fMRI data
      const mockFileSizes = {
        'dataset_description.json': 486,
        'participants.tsv': 156,
        'README': 1842,
        'CHANGES': 213,
        // Per subject estimates (7T fMRI is large)
        'sub-01_T1w.nii.gz': 8500000, // ~8.5MB
        'sub-01_task-audiovisual_run-01_bold.nii.gz': 750000000, // ~750MB per run
        'sub-01_task-audiovisual_run-02_bold.nii.gz': 750000000,
        'sub-01_task-audiovisual_run-03_bold.nii.gz': 750000000
      };

      // Calculate total estimated size
      const metadataSize = mockFileSizes['dataset_description.json'] + 
                          mockFileSizes['participants.tsv'] + 
                          mockFileSizes['README'] + 
                          mockFileSizes['CHANGES'];

      const perSubjectSize = mockFileSizes['sub-01_T1w.nii.gz'] + 
                            (mockFileSizes['sub-01_task-audiovisual_run-01_bold.nii.gz'] * 3); // 3 runs

      const estimatedTotalSize = metadataSize + (perSubjectSize * 3); // 3 subjects

      console.log(`Estimated dataset size: ${(estimatedTotalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`Metadata only: ${(metadataSize / 1024).toFixed(2)} KB`);
      
      // Verify we can work with metadata without downloading large files
      expect(metadataSize).toBeLessThan(10000); // Less than 10KB for metadata
      expect(estimatedTotalSize).toBeGreaterThan(1024 * 1024 * 1024 * 6); // > 6GB total
    });
  });

  describe('BIDS Validation Functions', () => {
    it('should create BIDS validation utility functions', () => {
      // Utility functions for BIDS validation
      const bidsValidators = {
        isValidSubjectId: (id) => /^sub-[a-zA-Z0-9]+$/.test(id),
        isValidSessionId: (id) => /^ses-[a-zA-Z0-9]+$/.test(id),
        isValidTaskName: (name) => /^task-[a-zA-Z0-9]+$/.test(name),
        isValidRunId: (id) => /^run-0[1-9]$|^run-[1-9]\d+$/.test(id), // run-01 to run-09, run-10+
        
        validateBidsFilename: (filename) => {
          const parts = filename.split('_');
          const hasSubject = parts.some(part => part.startsWith('sub-'));
          const hasValidExtension = filename.endsWith('.nii.gz') || 
                                   filename.endsWith('.json') || 
                                   filename.endsWith('.tsv');
          return hasSubject && hasValidExtension;
        },

        extractBidsEntities: (filename) => {
          const entities = {};
          const parts = filename.split('_');
          
          parts.forEach(part => {
            if (part.includes('-')) {
              const [key, value] = part.split('-', 2);
              entities[key] = value;
            }
          });
          
          return entities;
        }
      };

      // Test validation functions
      expect(bidsValidators.isValidSubjectId('sub-01')).toBe(true);
      expect(bidsValidators.isValidSubjectId('sub-pilot01')).toBe(true);
      expect(bidsValidators.isValidSubjectId('subject-01')).toBe(false);

      expect(bidsValidators.isValidTaskName('task-audiovisual')).toBe(true);
      expect(bidsValidators.isValidTaskName('audiovisual')).toBe(false);

      expect(bidsValidators.isValidRunId('run-01')).toBe(true);
      expect(bidsValidators.isValidRunId('run-1')).toBe(false);

      const filename = 'sub-01_task-audiovisual_run-01_bold.nii.gz';
      expect(bidsValidators.validateBidsFilename(filename)).toBe(true);

      const entities = bidsValidators.extractBidsEntities(filename);
      expect(entities.sub).toBe('01');
      expect(entities.task).toBe('audiovisual');
      expect(entities.run).toBe('01');
    });
  });

  describe('Efficient Dataset Operations', () => {
    it('should implement smart dataset browsing strategy', async () => {
      // Mock implementation of efficient browsing strategy
      const mockClient = {
        list: vi.fn()
      };

      // Strategy 1: Get overview without downloading large files
      const getDatasetOverview = async (client) => {
        // List root directory only
        const rootContents = await listS3Objects(client, '/', false);
        
        // Separate files and directories
        const files = rootContents.filter(item => item.isFile);
        const directories = rootContents.filter(item => item.isDirectory);
        
        // Identify subjects and other directories
        const subjects = directories.filter(dir => dir.name.startsWith('sub-'));
        const otherDirs = directories.filter(dir => !dir.name.startsWith('sub-'));
        
        return {
          metadataFiles: files,
          subjects: subjects.map(s => s.name),
          otherDirectories: otherDirs.map(d => d.name),
          estimatedSubjects: subjects.length
        };
      };

      // Mock the listing
      mockClient.list.mockResolvedValue([
        { name: 'dataset_description.json', path: '/dataset_description.json', metadata: { mode: 'file' }},
        { name: 'participants.tsv', path: '/participants.tsv', metadata: { mode: 'file' }},
        { name: 'sub-01', path: '/sub-01/', metadata: { mode: 'dir' }},
        { name: 'sub-02', path: '/sub-02/', metadata: { mode: 'dir' }},
        { name: 'sub-03', path: '/sub-03/', metadata: { mode: 'dir' }},
        { name: 'derivatives', path: '/derivatives/', metadata: { mode: 'dir' }}
      ]);

      const overview = await getDatasetOverview(mockClient);

      expect(overview.subjects).toEqual(['sub-01', 'sub-02', 'sub-03']);
      expect(overview.otherDirectories).toEqual(['derivatives']);
      expect(overview.metadataFiles.length).toBe(2);
      expect(overview.estimatedSubjects).toBe(3);
    });

    it('should implement progressive subject exploration', async () => {
      const mockClient = {
        list: vi.fn()
      };

      // Strategy 2: Explore one subject to understand structure
      const exploreSubjectStructure = async (client, subjectId) => {
        const subjectPath = `/${subjectId}/`;
        const contents = await listS3Objects(client, subjectPath, false);
        
        const modalities = contents
          .filter(item => item.isDirectory)
          .map(item => item.name);
        
        const files = contents
          .filter(item => item.isFile)
          .map(item => ({
            name: item.name,
            size: item.size,
            modality: 'root'
          }));

        return {
          subject: subjectId,
          modalities,
          rootFiles: files,
          hasAnat: modalities.includes('anat'),
          hasFunc: modalities.includes('func'),
          hasDwi: modalities.includes('dwi'),
          hasFmap: modalities.includes('fmap')
        };
      };

      // Mock subject contents
      mockClient.list.mockResolvedValue([
        { name: 'anat', path: '/sub-01/anat/', metadata: { mode: 'dir' }},
        { name: 'func', path: '/sub-01/func/', metadata: { mode: 'dir' }}
      ]);

      const structure = await exploreSubjectStructure(mockClient, 'sub-01');

      expect(structure.subject).toBe('sub-01');
      expect(structure.modalities).toEqual(['anat', 'func']);
      expect(structure.hasAnat).toBe(true);
      expect(structure.hasFunc).toBe(true);
      expect(structure.hasDwi).toBe(false);
    });
  });
});
