/**
 * Rclone client for S3 and S3-compatible services
 * Provides robust file transfer capabilities for dataset downloads
 */

import { Command } from '@tauri-apps/plugin-shell';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

/**
 * Generate rclone config for S3-compatible service
 * @param {Object} config - S3 configuration
 * @param {string} config.name - Remote name for rclone config
 * @param {string} config.endpoint - S3-compatible endpoint URL
 * @param {string} config.region - Region (default: us-east-1)
 * @param {string} config.accessKeyId - Access key ID
 * @param {string} config.secretAccessKey - Secret access key
 * @param {string} config.bucketName - Bucket name
 * @returns {string} Rclone config section
 */
function generateRcloneConfig(config) {
  return `[${config.name}]
type = s3
provider = Other
access_key_id = ${config.accessKeyId}
secret_access_key = ${config.secretAccessKey}
endpoint = ${config.endpoint}
region = ${config.region || 'us-east-1'}
location_constraint = ${config.region || 'us-east-1'}
force_path_style = true
no_check_bucket = true

`;
}

/**
 * Setup rclone configuration for a storage location
 * @param {Object} location - Storage location object
 * @returns {Promise<string>} The remote name for rclone
 */
export async function setupRcloneConfig(location) {
  try {
    const configDir = await appConfigDir();
    const rcloneConfigPath = await join(configDir, 'rclone.conf');
    
    // Ensure config directory exists
    await mkdir(configDir, { recursive: true });
    
    // Generate unique remote name
    const remoteName = `bids_${location.id}`;
    
    // Generate rclone config section
    const configSection = generateRcloneConfig({
      name: remoteName,
      endpoint: location.endpoint,
      region: location.region,
      accessKeyId: location.accessKeyId,
      secretAccessKey: location.secretAccessKey,
      bucketName: location.bucketName
    });
    
    let existingConfig = '';
    if (await exists(rcloneConfigPath)) {
      existingConfig = await readTextFile(rcloneConfigPath);
    }
    
    // Check if this remote already exists
    const remotePattern = new RegExp(`\\[${remoteName}\\][\\s\\S]*?(?=\\[|$)`, 'g');
    
    if (remotePattern.test(existingConfig)) {
      // Replace existing config
      const newConfig = existingConfig.replace(remotePattern, configSection);
      await writeTextFile(rcloneConfigPath, newConfig);
    } else {
      // Append new config
      await writeTextFile(rcloneConfigPath, existingConfig + configSection);
    }
    
    console.log(`Rclone config setup for remote: ${remoteName}`);
    return remoteName;
  } catch (error) {
    console.error('Failed to setup rclone config:', error);
    throw error;
  }
}

/**
 * Test rclone connection to S3 service
 * @param {Object} location - Storage location object
 * @returns {Promise<{success: boolean, message: string}>} Test result
 */
export async function testRcloneConnection(location) {
  try {
    const remoteName = await setupRcloneConfig(location);
    
    // Test connection using rclone lsd (list directories)
    const command = Command.create('rclone', [
      'lsd',
      `${remoteName}:${location.bucketName}`,
      '--config', await join(await appConfigDir(), 'rclone.conf')
    ]);
    
    const output = await command.execute();
    
    if (output.code === 0) {
      return {
        success: true,
        message: 'Successfully connected to S3 service via rclone!'
      };
    } else {
      return {
        success: false,
        message: `Rclone connection failed: ${output.stderr || 'Unknown error'}`
      };
    }
  } catch (error) {
    console.error('Rclone connection test failed:', error);
    return {
      success: false,
      message: `Failed to test rclone connection: ${error.message}`
    };
  }
}

/**
 * Download dataset using rclone
 * @param {Object} task - Collection task object
 * @param {Object} sourceLocation - Source S3 storage location
 * @param {Object} destLocation - Destination local storage location
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<boolean>} Success status
 */
export async function downloadDatasetWithRclone(task, sourceLocation, destLocation, progressCallback) {
  try {
    const remoteName = await setupRcloneConfig(sourceLocation);
    
    // Construct source and destination paths
    const sourcePath = `${remoteName}:${sourceLocation.bucketName}/${task.downloadPath}`;
    
    if (destLocation.type !== 'local') {
      throw new Error('Destination must be local storage for downloads');
    }
    
    const destPath = `${destLocation.path}/${task.downloadPath}`;
    
    // Ensure destination directory exists
    await mkdir(destLocation.path, { recursive: true });
    
    console.log(`Starting rclone download: ${sourcePath} -> ${destPath}`);
    
    // Update task status
    await progressCallback({
      status: 'downloading',
      progress: 0,
      startedAt: new Date().toISOString()
    });
    
    // Create rclone copy command with progress reporting
    const command = Command.create('rclone', [
      'copy',
      sourcePath,
      destPath,
      '--config', await join(await appConfigDir(), 'rclone.conf'),
      '--progress',
      '--stats', '1s',
      '--stats-one-line',
      '--retries', '3',
      '--low-level-retries', '10',
      '--transfers', '4'
    ]);
    
    // Handle progress updates
    let lastProgress = 0;
    const progressRegex = /Transferred:\s+([0-9.]+[KMGT]?B)\s+\/\s+([0-9.]+[KMGT]?B),\s+([0-9]+)%/;
    
    command.on('error', (error) => {
      console.error('Rclone command error:', error);
    });
    
    command.stdout.on('data', (line) => {
      const match = line.match(progressRegex);
      if (match) {
        const percentage = parseInt(match[3]);
        if (percentage > lastProgress) {
          lastProgress = percentage;
          progressCallback({
            progress: percentage,
            downloadedSize: parseSize(match[1]),
            totalSize: parseSize(match[2])
          });
        }
      }
    });
    
    const child = await command.spawn();
    const output = await child.wait();
    
    if (output.code === 0) {
      console.log(`Rclone download completed successfully: ${task.name}`);
      await progressCallback({
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString()
      });
      return true;
    } else {
      console.error(`Rclone download failed: ${output.stderr}`);
      await progressCallback({
        status: 'failed',
        errorMessage: output.stderr || 'Rclone download failed'
      });
      return false;
    }
    
  } catch (error) {
    console.error('Failed to download with rclone:', error);
    await progressCallback({
      status: 'failed',
      errorMessage: error.message
    });
    return false;
  }
}

/**
 * Parse size string to bytes
 * @param {string} sizeStr - Size string (e.g., "1.5GB", "500MB")
 * @returns {number} Size in bytes
 */
function parseSize(sizeStr) {
  const units = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
  const match = sizeStr.match(/([0-9.]+)\s*([KMGT]?B)/);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2] || 'B';
    return Math.round(value * (units[unit] || 1));
  }
  return 0;
}

/**
 * List contents of S3 bucket/path using rclone
 * @param {Object} location - Storage location object
 * @param {string} path - Optional path within bucket
 * @returns {Promise<Array>} List of files and directories
 */
export async function listS3Contents(location, path = '') {
  try {
    const remoteName = await setupRcloneConfig(location);
    const fullPath = `${remoteName}:${location.bucketName}${path ? '/' + path : ''}`;
    
    const command = Command.create('rclone', [
      'lsjson',
      fullPath,
      '--config', await join(await appConfigDir(), 'rclone.conf')
    ]);
    
    const output = await command.execute();
    
    if (output.code === 0) {
      return JSON.parse(output.stdout);
    } else {
      throw new Error(`Failed to list S3 contents: ${output.stderr}`);
    }
  } catch (error) {
    console.error('Failed to list S3 contents:', error);
    throw error;
  }
}

/**
 * Check if rclone is installed and available
 * @returns {Promise<boolean>} True if rclone is available
 */
export async function checkRcloneAvailable() {
  try {
    const command = Command.create('rclone', ['version']);
    const output = await command.execute();
    return output.code === 0;
  } catch (error) {
    console.error('Rclone not available:', error);
    return false;
  }
}
