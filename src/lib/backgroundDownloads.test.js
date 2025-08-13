/**
 * Tests for the background download system
 * These tests verify that the background download functionality works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

vi.mock('./collections.js', () => ({
  updateCollectionTask: vi.fn().mockResolvedValue(true)
}));

import { 
  startBackgroundDownload, 
  getDownloadProgress, 
  getAllDownloadProgress,
  cancelDownloadTask,
  cleanupBackgroundDownload,
  syncDownloadProgress,
  isTaskRunningInBackground,
  initializeBackgroundDownloads,
  listenToDownloadProgress
} from './backgroundDownloads.js';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

describe('Background Downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startBackgroundDownload', () => {
    it('should start a background download task', async () => {
      const taskId = 'test-task-1';
      const taskData = {
        datasetId: 'ds001',
        datasetUrl: 'https://example.com/dataset',
        storage: { path: '/test/path' }
      };

      invoke.mockResolvedValue('Download started');

      const result = await startBackgroundDownload(taskId, taskData);

      expect(invoke).toHaveBeenCalledWith('start_download_task', {
        taskId,
        taskData
      });
      expect(result).toBe('Download started');
    });

    it('should handle errors when starting download', async () => {
      const taskId = 'test-task-1';
      const taskData = {};

      invoke.mockRejectedValue(new Error('Backend error'));

      await expect(startBackgroundDownload(taskId, taskData)).rejects.toThrow('Backend error');
    });
  });

  describe('getDownloadProgress', () => {
    it('should get progress for a specific task', async () => {
      const taskId = 'test-task-1';
      const mockProgress = {
        task_id: taskId,
        status: 'downloading',
        progress: 50.0,
        total_size: 1000,
        downloaded_size: 500
      };

      invoke.mockResolvedValue(mockProgress);

      const result = await getDownloadProgress(taskId);

      expect(invoke).toHaveBeenCalledWith('get_download_progress', { taskId });
      expect(result).toEqual(mockProgress);
    });

    it('should return null if task not found', async () => {
      const taskId = 'non-existent-task';

      invoke.mockResolvedValue(null);

      const result = await getDownloadProgress(taskId);

      expect(result).toBeNull();
    });
  });

  describe('getAllDownloadProgress', () => {
    it('should get progress for all tasks', async () => {
      const mockProgress = [
        {
          task_id: 'task-1',
          status: 'downloading',
          progress: 25.0
        },
        {
          task_id: 'task-2',
          status: 'completed',
          progress: 100.0
        }
      ];

      invoke.mockResolvedValue(mockProgress);

      const result = await getAllDownloadProgress();

      expect(invoke).toHaveBeenCalledWith('get_all_download_progress');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('cancelDownloadTask', () => {
    it('should cancel a download task', async () => {
      const taskId = 'test-task-1';

      invoke.mockResolvedValue('Download cancelled');

      const result = await cancelDownloadTask(taskId);

      expect(invoke).toHaveBeenCalledWith('cancel_download_task', { taskId });
      expect(result).toBe('Download cancelled');
    });
  });

  describe('cleanupBackgroundDownload', () => {
    it('should cleanup a background download', async () => {
      const taskId = 'test-task-1';

      invoke.mockResolvedValue('Download cleaned up');

      const result = await cleanupBackgroundDownload(taskId);

      expect(invoke).toHaveBeenCalledWith('cleanup_download_task', { taskId });
      expect(result).toBe('Download cleaned up');
    });
  });

  describe('isTaskRunningInBackground', () => {
    it('should return true for downloading tasks', async () => {
      const taskId = 'test-task-1';
      const mockProgress = {
        task_id: taskId,
        status: 'downloading'
      };

      invoke.mockResolvedValue(mockProgress);

      const result = await isTaskRunningInBackground(taskId);

      expect(result).toBe(true);
    });

    it('should return false for completed tasks', async () => {
      const taskId = 'test-task-1';
      const mockProgress = {
        task_id: taskId,
        status: 'completed'
      };

      invoke.mockResolvedValue(mockProgress);

      const result = await isTaskRunningInBackground(taskId);

      expect(result).toBe(false);
    });

    it('should return false if task not found', async () => {
      const taskId = 'test-task-1';

      // Mock the getDownloadProgress call to return null
      invoke.mockResolvedValue(null);

      const result = await isTaskRunningInBackground(taskId);

      expect(result).toBe(false);
    });
  });

  describe('syncDownloadProgress', () => {
    it('should sync backend progress with frontend', async () => {
      const mockProgress = [
        {
          task_id: 'task-1',
          status: 'downloading',
          progress: 75.0,
          total_size: 1000,
          downloaded_size: 750
        }
      ];

      invoke.mockResolvedValue(mockProgress);

      const result = await syncDownloadProgress();

      expect(invoke).toHaveBeenCalledWith('get_all_download_progress');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('initializeBackgroundDownloads', () => {
    it('should initialize background download monitoring', async () => {
      invoke.mockResolvedValue([]);

      await initializeBackgroundDownloads();

      expect(invoke).toHaveBeenCalledWith('get_all_download_progress');
    });
  });

  describe('Progress Events', () => {
    it('should set up progress event listener', async () => {
      const mockUnlisten = vi.fn();
      const mockCallback = vi.fn();
      
      listen.mockResolvedValue(mockUnlisten);

      const unlisten = await listenToDownloadProgress(mockCallback);

      expect(listen).toHaveBeenCalledWith('download-progress', expect.any(Function));
      expect(unlisten).toBe(mockUnlisten);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle full download lifecycle', async () => {
    const taskId = 'integration-test-task';
    const taskData = {
      datasetId: 'ds001',
      datasetUrl: 'https://example.com/dataset',
      storage: { path: '/test/path' }
    };

    // Start download
    invoke.mockResolvedValueOnce('Download started');
    await startBackgroundDownload(taskId, taskData);

    // Check progress
    invoke.mockResolvedValueOnce({
      task_id: taskId,
      status: 'downloading',
      progress: 50.0
    });
    const progress = await getDownloadProgress(taskId);
    expect(progress.status).toBe('downloading');

    // Cancel download
    invoke.mockResolvedValueOnce('Download cancelled');
    await cancelDownloadTask(taskId);

    // Cleanup
    invoke.mockResolvedValueOnce('Download cleaned up');
    await cleanupBackgroundDownload(taskId);

    expect(invoke).toHaveBeenCalledTimes(4);
  });
});
