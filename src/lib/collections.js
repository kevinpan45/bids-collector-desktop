/**
 * Collection management utility
 * Handles creating and managing dataset collection tasks
 */

import { loadConfig, saveConfig } from './storage.js';

/**
 * Create a new collection task for dataset download
 * @param {Object} dataset - The dataset to download
 * @param {Array} storageLocations - Selected storage locations
 * @returns {Object} The created task
 */
export async function createCollectionTask(dataset, storageLocations) {
  const newTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Download: ${dataset.name}`,
    datasetId: dataset.id,
    datasetName: dataset.name,
    datasetSize: dataset.size,
    datasetDoi: dataset.doi,
    datasetProvider: dataset.provider,
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
    
    console.log(`Created collection task: ${newTask.name}`);
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
