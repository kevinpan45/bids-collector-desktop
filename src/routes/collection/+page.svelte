<script>
  import { onMount } from 'svelte';
  import toast from 'svelte-french-toast';
  import { getAllCollectionTasks, updateCollectionTask, deleteCollectionTask, getFullDownloadPath, startTaskDownload } from '$lib/collections.js';
  import { 
    startBackgroundDownload, 
    syncDownloadProgress, 
    listenToDownloadProgress, 
    cleanupBackgroundDownload,
    cancelDownloadTask,
    testBackendAvailability,
    isBackgroundDownloadSupported,
    getBackgroundDownloadStatus,
    initializeBackgroundDownloads
  } from '$lib/backgroundDownloads.js';
  import { loadConfig } from '$lib/storage.js';
  
  let collectionTasks = [];
  let loading = true;
  let error = null;
  let refreshInterval = null;
  let backendAvailable = false;
  let storageConfigured = false;
  
  // Filter and view options
  let statusFilter = 'all'; // 'all', 'pending', 'downloading', 'completed', 'failed', 'paused'
  
  $: filteredTasks = collectionTasks
    .filter(task => statusFilter === 'all' || task.status === statusFilter)
    .sort((a, b) => {
      // Sort by update time descending (most recently updated first)
      const aTime = new Date(a.updatedAt || a.createdAt || 0);
      const bTime = new Date(b.updatedAt || b.createdAt || 0);
      return bTime - aTime;
    });
  
  onMount(async () => {
    console.log('Collection management page loaded');
    console.log('Environment status:', getBackgroundDownloadStatus());
    
    // Load collection tasks first (this doesn't depend on backend)
    await loadCollectionTasks();
    
    // Check storage configuration
    await checkStorageConfiguration();
    
    // Check if background downloads are supported in this environment
    if (!isBackgroundDownloadSupported()) {
      console.log('Background downloads not supported in current environment');
      toast('Running in web browser - background downloads unavailable', {
        duration: 5000,
        style: 'background: #3b82f6; color: white;' // Info color
      });
      
      // Reset any tasks that are stuck in "downloading" status in web browser
      await resetStuckDownloadTasks();
      
      // Still set up basic refresh interval for the web environment
      refreshInterval = setInterval(async () => {
        if (!loading) {
          try {
            await refreshTasksQuietly();
          } catch (error) {
            console.error('Failed to refresh tasks:', error);
          }
        }
      }, 5000); // Slower refresh for web environment
      
      return; // Skip Tauri-specific initialization
    }
    
          // Test backend availability
      try {
        console.log('Testing backend availability...');
        backendAvailable = await testBackendAvailability();
        console.log('Backend availability result:', backendAvailable);
      } catch (error) {
        console.error('Backend availability test failed:', error);
        backendAvailable = false;
      }
    
    console.log('Tauri backend is available, proceeding with initialization');
    
    // Initialize background download monitoring (this depends on Tauri backend)
    try {
      console.log('Attempting to initialize background downloads...');
      await initializeBackgroundDownloads();
      console.log('Background downloads initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background downloads:', error);
      toast.error('Background download monitoring failed to initialize');
      // Continue without background downloads - basic functionality still works
    }
    
    // Set up download progress listener
    try {
      console.log('Setting up download progress listener...');
      const unlistenProgress = await listenToDownloadProgress((progress) => {
        console.log('Received download progress:', progress);
        // Progress updates are handled automatically through backend sync
      });
      
      console.log('Download progress listener set up successfully');
      
      // Clean up listener on component destroy
      return () => {
        if (unlistenProgress) {
          unlistenProgress();
        }
      };
    } catch (error) {
      console.error('Failed to set up download progress listener:', error);
      toast.error('Download progress monitoring failed to initialize');
      // Continue without progress listener - basic functionality still works
    }
    
    // Set up refresh interval
    refreshInterval = setInterval(async () => {
      if (loading) {
        console.log('Skipping refresh - already loading');
        return;
      }
      
      console.log('Running refresh interval...');
      
      // Only refresh if the page is visible and not currently loading something critical
      if (document.visibilityState === 'visible') {
        try {
          // Only sync with backend if backend is available
          if (backendAvailable) {
            console.log('Syncing with backend...');
            // Sync with backend progress
            await syncDownloadProgress();
          } else {
            console.log('Backend not available, skipping sync');
          }
          // Always refresh frontend tasks
          await refreshTasksQuietly();
          console.log('Refresh completed');
        } catch (error) {
          console.error('Failed to sync download progress:', error);
        }
      } else {
        console.log('Page not visible, skipping refresh');
      }
    }, 2000);    // Cleanup interval on component destroy
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });
  
  async function loadCollectionTasks() {
    try {
      loading = true;
      console.log('Starting to load collection tasks...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Loading tasks timeout')), 10000);
      });
      
      const loadPromise = getAllCollectionTasks();
      
      collectionTasks = await Promise.race([loadPromise, timeoutPromise]);
      console.log(`Loaded ${collectionTasks.length} collection tasks`);
      error = null;
    } catch (err) {
      console.error('Failed to load collection tasks:', err);
      error = err.message || 'Failed to load collection tasks';
      toast.error(`Failed to load collection tasks: ${err.message}`);
      collectionTasks = []; // Ensure we have a valid array
    } finally {
      loading = false;
    }
  }
  
  async function refreshTasksQuietly() {
    try {
      // Refresh without showing loading state
      const updatedTasks = await getAllCollectionTasks();
      collectionTasks = updatedTasks;
      console.log(`Quietly refreshed ${collectionTasks.length} collection tasks`);
    } catch (err) {
      console.error('Failed to quietly refresh collection tasks:', err);
      // Don't show error toast for background refresh
    }
  }
  
  async function resetStuckDownloadTasks() {
    try {
      console.log('Checking for stuck download tasks in web browser environment...');
      const tasks = await getAllCollectionTasks();
      const stuckTasks = tasks.filter(task => task.status === 'downloading');
      
      if (stuckTasks.length > 0) {
        console.log(`Found ${stuckTasks.length} stuck download tasks, resetting them...`);
        
        for (const task of stuckTasks) {
          await updateCollectionTask(task.id, {
            status: 'failed',
            errorMessage: 'Download was interrupted - not supported in web browser environment'
          });
          console.log(`Reset stuck task: ${task.name}`);
        }
        
        // Reload tasks to reflect changes
        await loadCollectionTasks();
        
        toast.error(`Reset ${stuckTasks.length} interrupted download(s) - downloads not supported in web browser`);
      }
    } catch (error) {
      console.error('Failed to reset stuck download tasks:', error);
    }
  }
  
  async function checkStorageConfiguration() {
    try {
      const storageConfig = await loadConfig('storage', { storageLocations: [] });
      const locations = storageConfig?.storageLocations || [];
      storageConfigured = locations.length > 0;
      console.log(`Storage configuration check: ${storageConfigured ? 'configured' : 'not configured'} (${locations.length} locations)`);
    } catch (error) {
      console.error('Failed to check storage configuration:', error);
      storageConfigured = false;
    }
  }
  
  function getStatusIcon(status) {
    switch(status) {
      case 'pending': return '⏳';
      case 'downloading': return '⬇️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      default: return '❓';
    }
  }
  
  function getStatusColor(status) {
    switch(status) {
      case 'pending': return 'badge-warning';
      case 'downloading': return 'badge-info';
      case 'completed': return 'badge-success';
      case 'failed': return 'badge-error';
      case 'paused': return 'badge-neutral';
      default: return 'badge-ghost';
    }
  }
  
  function formatDuration(startTime, endTime) {
    if (!startTime) return 'Not started';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  function startTask(taskId) {
    startDownload(taskId);
  }
  
  function pauseTask(taskId) {
    pauseTaskBackend(taskId);
  }
  
  async function pauseTaskBackend(taskId) {
    try {
      const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) return;
      
      // Try to cancel the backend download if backend is available and supported
      if (isBackgroundDownloadSupported()) {
        try {
          const backendAvailable = await testBackendAvailability();
          if (backendAvailable) {
            await cancelDownloadTask(taskId);
            console.log('Backend download cancelled');
          } else {
            console.log('Backend unavailable, only updating frontend status');
          }
        } catch (backendError) {
          console.warn('Failed to cancel backend download, continuing with frontend update:', backendError);
        }
      } else {
        console.log('Background downloads not supported, only updating frontend status');
      }
      
      // Update frontend task status
      const updates = { status: 'paused' };
      
      await updateCollectionTask(taskId, updates);
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.success(`Task "${collectionTasks[taskIndex].name}" paused`);
      
    } catch (error) {
      console.error('Failed to pause task:', error);
      toast.error('Failed to pause task');
    }
  }
  
  function resumeTask(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = { status: 'downloading' };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.success(`Task "${collectionTasks[taskIndex].name}" resumed`);
      startDownload(taskId);
    }).catch(error => {
      console.error('Failed to resume task:', error);
      toast.error('Failed to resume task');
    });
  }
  
  function deleteTask(taskId) {
    deleteTaskFromBackend(taskId);
  }
  
  async function deleteTaskFromBackend(taskId) {
    try {
      const task = collectionTasks.find(t => t.id === taskId);
      if (!task) return;
      
      // Try to cancel any ongoing download and cleanup backend if available and supported
      if (isBackgroundDownloadSupported()) {
        try {
          const backendAvailable = await testBackendAvailability();
          if (backendAvailable) {
            await cancelDownloadTask(taskId).catch(err => 
              console.log('No active download to cancel:', err)
            );
            await cleanupBackgroundDownload(taskId).catch(err => 
              console.log('No backend task to cleanup:', err)
            );
            console.log('Backend cleanup completed');
          } else {
            console.log('Backend unavailable, skipping backend cleanup');
          }
        } catch (backendError) {
          console.warn('Failed to cleanup backend, continuing with frontend deletion:', backendError);
        }
      } else {
        console.log('Background downloads not supported, skipping backend cleanup');
      }
      
      // Remove from frontend storage
      await deleteCollectionTask(taskId);
      collectionTasks = collectionTasks.filter(t => t.id !== taskId);
      toast.success(`Task "${task.name}" deleted`);
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  }
  
  // Start actual download for a task
  async function startDownload(taskId) {
    try {
      const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) return;
      
      const task = collectionTasks[taskIndex];
      console.log(`Starting actual download for task: ${task.name}`);
      
      // Check if downloads are supported before attempting
      if (!isBackgroundDownloadSupported()) {
        const errorMsg = 'Downloads not supported in web browser environment. Please use the Tauri desktop application for background downloads.';
        console.warn(errorMsg);
        toast.error(errorMsg);
        
        // Update task status to failed
        collectionTasks[taskIndex] = { 
          ...task, 
          status: 'failed',
          errorMessage: errorMsg
        };
        
        // Update in storage
        await updateCollectionTask(taskId, {
          status: 'failed',
          errorMessage: errorMsg
        });
        
        return;
      }
      
      // Update UI to show download starting
      collectionTasks[taskIndex] = { 
        ...task, 
        status: 'downloading',
        startedAt: new Date().toISOString(),
        progress: 0,
        errorMessage: null
      };
      
      toast.success(`Starting download: ${task.name}`);
      
      // Start the actual download
      const success = await startTaskDownload(taskId);
      
      if (success) {
        console.log(`Download completed successfully for task: ${task.name}`);
      } else {
        console.error(`Download failed for task: ${task.name}`);
      }
      
      // Refresh tasks to get updated status
      await loadCollectionTasks();
      
    } catch (error) {
      console.error('Failed to start download:', error);
      
      let errorMessage = error.message;
      
      // Provide more helpful error messages based on common issues
      if (error.message.includes('No storage locations configured')) {
        errorMessage = 'No storage locations configured. Please set up storage locations in the Storage page first.';
        toast.error('❌ Setup Required: Configure storage locations first!', {
          duration: 8000
        });
      } else if (error.message.includes('Background downloads not supported')) {
        errorMessage = 'Downloads not supported in web browser. Please use the desktop application.';
        toast.error('❌ Browser Limitation: Use desktop app for downloads!', {
          duration: 8000
        });
      } else {
        toast.error(`❌ Download Failed: ${errorMessage}`, {
          duration: 8000
        });
      }
      
      // Update task status to failed
      const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        collectionTasks[taskIndex] = { 
          ...collectionTasks[taskIndex], 
          status: 'failed',
          errorMessage: errorMessage
        };
        
        // Update in storage
        await updateCollectionTask(taskId, {
          status: 'failed',
          errorMessage: errorMessage
        });
      }
    }
  }
  
  function retryTask(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = {
      status: 'pending',
      progress: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null
    };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast(`Task "${collectionTasks[taskIndex].name}" reset to pending`);
      // Don't auto-start, let user manually start when ready
    }).catch(error => {
      console.error('Failed to retry task:', error);
      toast.error('Failed to retry task');
    });
  }
  
  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + units[i];
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Path copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }
</script>

<svelte:head>
  <title>Collections - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Header Section -->
  <div class="mb-8">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold mb-2">Collection Tasks</h1>
        <div class="flex items-center gap-4">
          <p class="text-base-content/60">Track and manage your dataset download tasks</p>
          {#if collectionTasks.some(task => task.status === 'downloading')}
            <div class="flex items-center gap-2 text-info">
              <span class="loading loading-dots loading-xs"></span>
              <span class="text-sm">Downloads active • Auto-refreshing</span>
            </div>
          {/if}
        </div>
      </div>
      <div class="flex gap-2">
        <button 
          class="btn btn-outline btn-sm" 
          on:click={loadCollectionTasks}
          disabled={loading}
        >
          {#if loading}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          {/if}
          Refresh
        </button>
      </div>
    </div>
  </div>
  
  <!-- Environment Status Banner -->
  <div class="mb-6">
    {#if !isBackgroundDownloadSupported()}
      <div class="alert alert-info">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="font-bold">Web Browser Mode - Limited Functionality</h3>
          <div class="text-sm">
            Downloads are not available in web browser mode. 
            <br>• To download datasets, use the desktop application (Tauri)
            <br>• You can still view and manage existing collection tasks
            <br>• All download attempts will fail with an error message
          </div>
        </div>
      </div>
    {:else if !backendAvailable}
      <div class="alert alert-warning">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 class="font-bold">Desktop Mode - Backend Unavailable</h3>
          <div class="text-sm">
            Tauri backend is not available. Basic functionality is available, but downloads may be interrupted.
            <br>• Try restarting the application
            <br>• Check that storage locations are configured
          </div>
        </div>
      </div>
    {:else}
      <div class="alert alert-success">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="font-bold">Desktop Mode - Downloads Ready</h3>
          <div class="text-sm">
            Running in Tauri desktop mode - downloads will continue in the background.
            <br>• Storage configured: {storageConfigured ? '✅ Ready' : '❌ Please configure storage locations first'}
            <br>• Downloads will persist even if you navigate away from this page
            {#if !storageConfigured}
              <br>• <a href="/storage" class="link font-semibold">Configure Storage Settings →</a>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Filters and Controls -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <!-- Status Filter -->
      <div class="form-control">
        <label class="label" for="status-filter">
          <span class="label-text">Filter by status</span>
        </label>
        <select id="status-filter" class="select select-bordered select-sm w-40" bind:value={statusFilter}>
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="downloading">Downloading</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="paused">Paused</option>
        </select>
      </div>
      
      <!-- Task Count -->
      <div class="text-sm text-base-content/60 mt-6">
        Showing {filteredTasks.length} of {collectionTasks.length} tasks
      </div>
    </div>
  </div>
  
  <!-- Tasks List -->
  {#if loading}
    <!-- Loading State -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <span class="loading loading-spinner loading-lg"></span>
        <h3 class="text-2xl font-bold mt-4 mb-2">Loading Collection Tasks</h3>
        <p class="text-base-content/60">Fetching your collection tasks...</p>
      </div>
    </div>
  {:else if error}
    <!-- Error State -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <div class="text-error/50 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 class="text-2xl font-bold mt-4 mb-2 text-error">Failed to Load Tasks</h3>
          <p class="text-base-content/60 mb-6">Error: {error}</p>
        </div>
      </div>
    </div>
  {:else if filteredTasks.length > 0}
    <!-- Tasks List -->
    <div class="space-y-4">
      {#each filteredTasks as task}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <!-- Task Header -->
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h3 class="card-title text-lg mb-2">{task.name}</h3>
                <div class="text-sm text-base-content/60 mb-2">
                  Dataset: {task.datasetName}
                  {#if task.datasetId}
                    <span class="font-mono ml-2">({task.datasetId})</span>
                  {/if}
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                  <span class="badge {getStatusColor(task.status)} badge-sm">
                    {getStatusIcon(task.status)} {task.status.toUpperCase()}
                  </span>
                  <span class="text-xs text-base-content/50">
                    Created: {new Date(task.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <!-- Task Actions -->
              <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </div>
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                  {#if task.status === 'pending' || task.status === 'failed'}
                    <li>
                      <button 
                        type="button" 
                        on:click={() => startTask(task.id)}
                        disabled={!isBackgroundDownloadSupported()}
                        title={!isBackgroundDownloadSupported() ? 'Downloads not supported in web browser' : 'Start download task'}
                      >
                        Start Task
                        {#if !isBackgroundDownloadSupported()}
                          <span class="text-xs opacity-60">(Unavailable)</span>
                        {/if}
                      </button>
                    </li>
                  {/if}
                  {#if task.status === 'downloading'}
                    <li><button type="button" on:click={() => pauseTask(task.id)}>Pause Task</button></li>
                  {/if}
                  {#if task.status === 'paused'}
                    <li>
                      <button 
                        type="button" 
                        on:click={() => resumeTask(task.id)}
                        disabled={!isBackgroundDownloadSupported()}
                        title={!isBackgroundDownloadSupported() ? 'Downloads not supported in web browser' : 'Resume download task'}
                      >
                        Resume Task
                        {#if !isBackgroundDownloadSupported()}
                          <span class="text-xs opacity-60">(Unavailable)</span>
                        {/if}
                      </button>
                    </li>
                  {/if}
                  {#if task.status === 'failed'}
                    <li><button type="button" on:click={() => retryTask(task.id)}>Retry Task</button></li>
                  {/if}
                  <li>
                    <button type="button" class="text-error" on:click={() => deleteTask(task.id)}>
                      Delete Task
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- Progress Bar -->
            {#if task.status === 'downloading' || task.status === 'completed' || task.status === 'paused'}
              <div class="mb-4">
                <div class="flex justify-between text-sm mb-2">
                  <span>Progress: {Math.round(task.progress || 0)}%</span>
                  <span>
                    {#if task.totalSize > 0}
                      {formatFileSize(task.downloadedSize)} / {formatFileSize(task.totalSize)}
                    {/if}
                    {#if task.speed > 0}
                      • {formatFileSize(task.speed)}/s
                    {/if}
                  </span>
                </div>
                {#if task.status === 'downloading' && (task.currentFile || task.totalFiles)}
                  <div class="text-xs text-base-content/60 mb-1">
                    {#if task.currentFile}
                      Current: {task.currentFile}
                    {/if}
                    {#if task.totalFiles > 0}
                      • Files: {task.completedFiles || 0}/{task.totalFiles}
                    {/if}
                  </div>
                {/if}
                <progress 
                  class="progress progress-primary w-full" 
                  value={task.progress || 0} 
                  max="100"
                ></progress>
              </div>
            {/if}
            
            <!-- Error Message -->
            {#if task.status === 'failed' && task.errorMessage}
              <div class="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{task.errorMessage}</span>
              </div>
            {/if}
            
            <!-- Storage Locations -->
            <div class="mb-4">
              <h4 class="font-semibold text-sm mb-2">Download Paths:</h4>
              <div class="space-y-2">
                {#each task.storageLocations as location}
                  {@const fullPath = getFullDownloadPath(task, location)}
                  <div class="border border-base-300 rounded-lg p-3 bg-base-50">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="badge badge-outline badge-sm">
                            {location.type === 'local' ? '📁' : '☁️'} {location.name}
                          </span>
                        </div>
                        <div class="text-xs text-base-content/60 font-mono break-all">
                          <span class="font-semibold">Full Path:</span> {fullPath}
                        </div>
                      </div>
                      <div class="flex gap-1">
                        <button 
                          class="btn btn-ghost btn-xs"
                          on:click={() => copyToClipboard(fullPath)}
                          title="Copy path to clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Task Timing -->
            <div class="flex justify-between text-xs text-base-content/60">
              <span>
                Duration: {formatDuration(task.startedAt, task.completedAt)}
              </span>
              {#if task.completedAt}
                <span>Completed: {new Date(task.completedAt).toLocaleString()}</span>
              {:else if task.startedAt}
                <span>Started: {new Date(task.startedAt).toLocaleString()}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Empty State -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <div class="text-base-content/30 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-2xl font-bold mt-4 mb-2">No Collection Tasks</h3>
          <p class="text-base-content/60 mb-6">Download datasets from the Datasets page to start tracking collection tasks here.</p>
          <a href="/dataset" class="btn btn-primary">
            Browse Datasets
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .progress::-webkit-progress-bar {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .progress::-webkit-progress-value {
    transition: width 0.3s ease;
  }
</style>
