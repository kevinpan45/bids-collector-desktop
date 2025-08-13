/**
 * Background download management using Tauri backend
 * This module handles downloads that run in the background and persist across page refreshes
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { updateCollectionTask } from './collections.js';

// Check if we're in a Tauri environment
const isTauriEnvironment = typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

/**
 * Check if background downloads are supported in current environment
 * @returns {boolean} True if background downloads are supported
 */
export function isBackgroundDownloadSupported() {
  return isTauriEnvironment;
}

/**
 * Get a user-friendly message about background download availability
 * @returns {string} Status message
 */
export function getBackgroundDownloadStatus() {
  if (isTauriEnvironment) {
    return 'Background downloads supported (Tauri environment)';
  } else {
    return 'Background downloads unavailable (Web browser environment)';
  }
}

/**
 * Start a download task in the background
 * @param {string} taskId - The task ID
 * @param {Object} taskData - The task data including dataset info and storage locations
 * @returns {Promise<string>} Success message
 */
export async function startBackgroundDownload(taskId, taskData) {
  if (!isTauriEnvironment) {
    throw new Error('Background downloads not supported in web browser environment');
  }
  
  try {
    console.log(`Starting background download for task: ${taskId}`);
    const result = await invoke('start_download_task', {
      taskId,
      taskData
    });
    console.log('Background download started:', result);
    return result;
  } catch (error) {
    console.error('Failed to start background download:', error);
    throw error;
  }
}

/**
 * Get download progress for a specific task
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Download progress or null if not found
 */
export async function getDownloadProgress(taskId) {
  if (!isTauriEnvironment) {
    throw new Error('Background downloads not supported in web browser environment');
  }
  
  try {
    return await invoke('get_download_progress', { taskId });
  } catch (error) {
    console.error('Failed to get download progress:', error);
    throw error;
  }
}

/**
 * Get all download progress from backend
 * @returns {Promise<Array>} Array of download progress objects
 */
export async function getAllDownloadProgress() {
  if (!isTauriEnvironment) {
    throw new Error('Background downloads not supported in web browser environment');
  }
  
  try {
    return await invoke('get_all_download_progress');
  } catch (error) {
    console.error('Failed to get all download progress:', error);
    throw error;
  }
}

/**
 * Cancel a download task
 * @param {string} taskId - The task ID to cancel
 * @returns {Promise<string>} Success message
 */
export async function cancelDownloadTask(taskId) {
  if (!isTauriEnvironment) {
    throw new Error('Background downloads not supported in web browser environment');
  }
  
  try {
    console.log(`Cancelling download task: ${taskId}`);
    const result = await invoke('cancel_download_task', { taskId });
    console.log('Download cancelled:', result);
    return result;
  } catch (error) {
    console.error('Failed to cancel download:', error);
    throw error;
  }
}

/**
 * Sync backend download progress with frontend collection tasks
 * This function updates the collection tasks with progress from the backend
 */
export async function syncDownloadProgress() {
  try {
    console.log('Syncing download progress with backend...');
    const backendProgress = await getAllDownloadProgress();
    console.log('Backend progress received:', backendProgress);
    
    // Update each task in the frontend collection with backend progress
    for (const progress of backendProgress) {
      console.log(`Updating task ${progress.task_id} with status: ${progress.status}, progress: ${progress.progress}%`);
      try {
        await updateCollectionTask(progress.task_id, {
          status: progress.status,
          progress: progress.progress,
          totalSize: progress.total_size,
          downloadedSize: progress.downloaded_size,
          speed: progress.speed,
          currentFile: progress.current_file,
          totalFiles: progress.total_files,
          completedFiles: progress.completed_files,
          errorMessage: progress.error_message,
          startedAt: progress.started_at,
          completedAt: progress.completed_at
        });
        console.log(`Successfully updated task ${progress.task_id}`);
      } catch (updateError) {
        console.error(`Failed to update task ${progress.task_id}:`, updateError);
      }
    }
    
    return backendProgress;
  } catch (error) {
    console.error('Failed to sync download progress:', error);
    throw error;
  }
}

/**
 * Start listening for download progress events from the backend
 * @param {Function} onProgress - Callback function called when progress updates
 * @returns {Promise<Function>} Unlisten function
 */
export async function listenToDownloadProgress(onProgress) {
  if (!isTauriEnvironment) {
    throw new Error('Background downloads not supported in web browser environment');
  }
  
  try {
    console.log('Setting up download progress listener...');
    
    // Listen for progress updates
    const unlistenProgress = await listen('download-progress', (event) => {
      console.log('Received download progress event:', event.payload);
      if (onProgress && typeof onProgress === 'function') {
        onProgress(event.payload);
      }
    });
    
    // Listen for completion events
    const unlistenCompleted = await listen('download-completed', async (event) => {
      console.log('Received download completion event:', event.payload);
      const progress = event.payload;
      
      // Update the collection task with completion status
      try {
        await updateCollectionTask(progress.task_id, {
          status: progress.status,
          progress: progress.progress,
          totalSize: progress.total_size,
          downloadedSize: progress.downloaded_size,
          completedAt: progress.completed_at,
          currentFile: progress.current_file
        });
        console.log(`Updated collection task ${progress.task_id} with completion status`);
        
        // Also call the progress callback
        if (onProgress && typeof onProgress === 'function') {
          onProgress(progress);
        }
      } catch (error) {
        console.error('Failed to update collection task on completion:', error);
      }
    });
    
    console.log('Download progress listener set up successfully');
    
    // Return a function that unlists both listeners
    return () => {
      unlistenProgress();
      unlistenCompleted();
    };
    
  } catch (error) {
    console.error('Failed to set up download progress listener:', error);
    throw error;
  }
}

/**
 * Check if a task is running in the background
 * @param {string} taskId - The task ID to check
 * @returns {Promise<boolean>} True if task is running in background
 */
export async function isTaskRunningInBackground(taskId) {
  try {
    const progress = await getDownloadProgress(taskId);
    return !!progress && (progress.status === 'downloading' || progress.status === 'starting');
  } catch (error) {
    console.error('Failed to check if task is running in background:', error);
    return false;
  }
}

/**
 * Clean up a background download (remove from backend tracking)
 * @param {string} taskId - The task ID to clean up
 */
export async function cleanupBackgroundDownload(taskId) {
  try {
    console.log(`Cleaning up background download: ${taskId}`);
    const result = await invoke('cleanup_download_task', { taskId });
    console.log('Background download cleaned up:', result);
    return result;
  } catch (error) {
    console.error('Failed to cleanup background download:', error);
    throw error;
  }
}

/**
 * Test if the Tauri backend is available and responsive
 * @returns {Promise<boolean>} True if backend is available
 */
export async function testBackendAvailability() {
  try {
    // Check if we're in a Tauri environment first
    if (!isTauriEnvironment) {
      console.log('Not in Tauri environment, backend unavailable');
      return false;
    }
    
    // Try a simple command to test if backend is responsive
    const result = await invoke('get_all_download_progress');
    console.log('Backend availability test passed:', result);
    return true;
  } catch (error) {
    console.error('Backend availability test failed:', error);
    return false;
  }
}

/**
 * Initialize background download monitoring
 * This should be called when the app starts to sync with any ongoing downloads
 */
export async function initializeBackgroundDownloads() {
  try {
    console.log('Initializing background download monitoring...');
    
    // First check if we're in a Tauri environment
    if (!isTauriEnvironment) {
      console.log('Not in Tauri environment, skipping background download initialization');
      throw new Error('Background downloads not supported in web browser environment');
    }
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Initialization timeout')), 5000);
    });
    
    const initPromise = (async () => {
      // Test backend availability first
      const isAvailable = await testBackendAvailability();
      if (!isAvailable) {
        throw new Error('Backend not available');
      }
      
      // Sync any existing backend progress with frontend
      try {
        await syncDownloadProgress();
      } catch (syncError) {
        console.warn('Failed to sync download progress, continuing...', syncError);
      }
      
      // Clean up any orphaned tasks (e.g., tasks that were cancelled but still show as running)
      try {
        await cleanupOrphanedTasks();
      } catch (cleanupError) {
        console.warn('Failed to cleanup orphaned tasks, continuing...', cleanupError);
      }
    })();
    
    // Race between initialization and timeout
    await Promise.race([initPromise, timeoutPromise]);
    
    console.log('Background download monitoring initialized');
  } catch (error) {
    console.error('Failed to initialize background downloads:', error);
    throw error;
  }
}

/**
 * Clean up orphaned tasks that might be stuck in an inconsistent state
 */
async function cleanupOrphanedTasks() {
  try {
    const backendProgress = await getAllDownloadProgress();
    
    // Find tasks that have been "downloading" for too long (more than 1 hour) without progress
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const progress of backendProgress) {
      if (progress.status === 'downloading' && progress.started_at) {
        const startedAt = new Date(progress.started_at);
        if (startedAt < oneHourAgo && progress.progress === 0) {
          console.log(`Cleaning up orphaned task: ${progress.task_id}`);
          await cancelDownloadTask(progress.task_id);
          await cleanupBackgroundDownload(progress.task_id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned tasks:', error);
  }
}
