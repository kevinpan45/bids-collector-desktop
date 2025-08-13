/**
 * Collection management utility
 * Handles creating and managing dataset collection tasks
 */

import { loadConfig, saveConfig } from './storage.js';
import { startBackgroundDownload, isTaskRunningInBackground } from './backgroundDownloads.js';

/**
 * Generate download path based on dataset properties, using full DOI as folder name
 * @param {string} datasetId - Dataset ID 
 * @param {string} version - Dataset version
 * @param {string} provider - Dataset provider
 * @param {string} doi - Dataset DOI
 * @returns {Promise<string>} The generated download path
 */
export async function generateDownloadPath(datasetId, version, provider, doi) {
  // Use full DOI as the folder name if available
  if (doi) {
    // Sanitize DOI for use as folder name
    // Remove common prefixes and characters that are invalid in folder names
    let sanitizedDoi = doi
      .replace(/^(doi:|https?:\/\/(dx\.)?doi\.org\/)/i, '') // Remove DOI prefixes
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    if (sanitizedDoi) {
      return sanitizedDoi;
    }
  }
  
  // Fallback to original format if DOI is not available or invalid
  if (provider?.toLowerCase() === 'openneuro') {
    return `ds${datasetId}_v${version}`;
  } else {
    return `${datasetId}_v${version}`;
  }
}

/**
 * Get the full download path for a task and storage location
 * @param {Object} task - The collection task
 * @param {Object} storageLocation - The storage location
 * @returns {string} The full download path
 */
export function getFullDownloadPath(task, storageLocation) {
  if (!task || !storageLocation) return '';
  
  // Regenerate download path using DOI if available (for backwards compatibility)
  let relativePath = task.downloadPath || '';
  
  // If task has DOI but downloadPath doesn't look like a DOI-based path, regenerate it
  if (task.datasetDoi && (!relativePath.includes('.') || relativePath.startsWith('ds'))) {
    // Regenerate using DOI
    let sanitizedDoi = task.datasetDoi
      .replace(/^(doi:|https?:\/\/(dx\.)?doi\.org\/)/i, '') // Remove DOI prefixes
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    if (sanitizedDoi) {
      relativePath = sanitizedDoi;
    }
  }
  
  if (storageLocation.type === 'local') {
    // For local storage, combine the base path with the download path
    const basePath = storageLocation.path || '';
    return basePath ? `${basePath}/${relativePath}` : relativePath;
  } else if (storageLocation.type === 's3-compatible') {
    // For S3, show bucket/path format
    const bucketName = storageLocation.bucketName || storageLocation.path?.replace('s3://', '') || '';
    return `s3://${bucketName}/${relativePath}`;
  }
  
  return relativePath;
}

/**
 * Create a new collection task for dataset download
 * @param {Object} dataset - The dataset to download
 * @param {Array} storageLocations - Selected storage locations
 * @returns {Object} The created task
 */
export async function createCollectionTask(dataset, storageLocations) {
  // Generate the download path using DOI
  const downloadPath = await generateDownloadPath(dataset.id, dataset.version, dataset.provider, dataset.doi);
  
  const newTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Download: ${dataset.name}`,
    datasetId: dataset.id,
    datasetName: dataset.name,
    datasetSize: dataset.size,
    datasetDoi: dataset.doi,
    datasetProvider: dataset.provider,
    datasetVersion: dataset.version,
    downloadPath: downloadPath,
    storageLocations: storageLocations.map(location => ({
      id: location.id,
      name: location.name,
      type: location.type,
      path: location.path || location.bucketName
    })),
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    totalSize: 0,
    downloadedSize: 0,
    speed: 0,
    errorMessage: null
  };
  
  try {
    // Load existing tasks
    const config = await loadConfig('collections', { tasks: [] });
    const tasks = config.tasks || [];
    
    // Add new task at the beginning
    tasks.unshift(newTask);
    
    // Save updated tasks
    await saveConfig('collections', { tasks });
    
    console.log(`Created collection task: ${newTask.name} -> ${downloadPath}`);
    return newTask;
  } catch (error) {
    console.error('Failed to create collection task:', error);
    throw error;
  }
}

/**
 * Update a collection task status and progress
 * @param {string} taskId - The task ID
 * @param {Object} updates - Updates to apply
 */
export async function updateCollectionTask(taskId, updates) {
  try {
    const config = await loadConfig('collections', { tasks: [] });
    const tasks = config.tasks || [];
    
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Apply updates
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    
    // Save updated tasks
    await saveConfig('collections', { tasks });
    
    return tasks[taskIndex];
  } catch (error) {
    console.error('Failed to update collection task:', error);
    throw error;
  }
}

/**
 * Get all collection tasks
 * @returns {Array} Array of collection tasks
 */
export async function getAllCollectionTasks() {
  try {
    const config = await loadConfig('collections', { tasks: [] });
    return config.tasks || [];
  } catch (error) {
    console.error('Failed to load collection tasks:', error);
    return [];
  }
}

/**
 * Delete a collection task
 * @param {string} taskId - The task ID to delete
 */
export async function deleteCollectionTask(taskId) {
  try {
    const config = await loadConfig('collections', { tasks: [] });
    const tasks = config.tasks || [];
    
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    
    // Save updated tasks
    await saveConfig('collections', { tasks: filteredTasks });
    
    console.log(`Deleted collection task: ${taskId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete collection task:', error);
    throw error;
  }
}

/**
 * Start actual download for a collection task using background processing
 * @param {string} taskId - The task ID to start downloading
 * @returns {Promise<boolean>} Success status
 */
export async function startTaskDownload(taskId) {
  try {
    const config = await loadConfig('collections', { tasks: [] });
    const tasks = config.tasks || [];
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    
    // Check if task is already running in background
    const isRunning = await isTaskRunningInBackground(taskId);
    if (isRunning) {
      console.log(`Task ${taskId} is already running in background`);
      return true;
    }
    
    if (task.status !== 'pending' && task.status !== 'failed') {
      throw new Error(`Task ${taskId} is not in pending or failed status (current: ${task.status})`);
    }
    
    console.log(`Starting background download for task: ${task.name}`);
    console.log(`Task provider: ${task.datasetProvider}`);
    console.log(`Task storage locations:`, task.storageLocations);
    
    // Load storage configuration to find source and destination locations
    console.log('Loading storage configuration...');
    const storageConfig = await loadConfig('storage', { storageLocations: [] });
    console.log('Raw storage config:', storageConfig);
    
    const storageLocations = storageConfig?.storageLocations || [];
    
    console.log(`Loaded storage locations:`, storageLocations);
    console.log(`Storage locations count: ${storageLocations.length}`);
    
    if (storageLocations.length === 0) {
      console.error('No storage locations found in config. Raw config:', JSON.stringify(storageConfig, null, 2));
      throw new Error('No storage locations configured. Please configure storage locations first.');
    }
    
    // Determine source S3 configuration based on dataset provider
    let sourceS3Config = null;
    
    if (task.datasetProvider?.toLowerCase() === 'openneuro') {
      sourceS3Config = {
        endpoint: 'https://s3.amazonaws.com',
        region: 'us-east-1',
        bucketName: 'openneuro.org',
        // OpenNeuro S3 bucket is public, use anonymous access (equivalent to --no-sign-request)
        anonymous: true,
        forcePathStyle: false
      };
      console.log(`Using OpenNeuro S3 source: s3://openneuro.org/${task.downloadPath}`);
    } else {
      throw new Error(`Unsupported dataset provider: ${task.datasetProvider}. Currently only OpenNeuro is supported.`);
    }
    
    // Prepare task data for background download
    const taskData = {
      task: task,
      sourceS3Config: sourceS3Config,
      storageLocations: task.storageLocations.map(destLocationInfo => {
        const destLocation = storageLocations.find(loc => loc.id === destLocationInfo.id);
        if (!destLocation) {
          throw new Error(`Destination location not found: ${destLocationInfo.name}`);
        }
        return destLocation;
      })
    };
    
    // Update task status to indicate it's starting
    await updateCollectionTask(taskId, {
      status: 'downloading',
      startedAt: new Date().toISOString(),
      progress: 0,
      errorMessage: null
    });
    
    // Start the background download
    await startBackgroundDownload(taskId, taskData);
    
    console.log(`Background download started successfully for task: ${task.name}`);
    return true;
    
  } catch (error) {
    console.error('Failed to start task download:', error);
    
    // Update task with error status
    try {
      await updateCollectionTask(taskId, {
        status: 'failed',
        errorMessage: error.message
      });
    } catch (updateError) {
      console.error('Failed to update task with error status:', updateError);
    }
    
    throw error;
  }
}
