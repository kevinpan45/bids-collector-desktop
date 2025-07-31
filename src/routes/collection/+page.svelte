<script>
  import { onMount } from 'svelte';
  import toast from 'svelte-french-toast';
  import { getAllCollectionTasks, updateCollectionTask, deleteCollectionTask } from '$lib/collections.js';
  
  let collectionTasks = [];
  let loading = true;
  let error = null;
  
  // Filter and view options
  let statusFilter = 'all'; // 'all', 'pending', 'downloading', 'completed', 'failed', 'paused'
  let sortBy = 'created'; // 'created', 'name', 'status', 'progress'
  let sortOrder = 'desc'; // 'asc', 'desc'
  
  $: filteredTasks = collectionTasks
    .filter(task => statusFilter === 'all' || task.status === statusFilter)
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  
  onMount(() => {
    console.log('Collection management page loaded');
    loadCollectionTasks();
  });
  
  async function loadCollectionTasks() {
    try {
      loading = true;
      collectionTasks = await getAllCollectionTasks();
      console.log(`Loaded ${collectionTasks.length} collection tasks`);
    } catch (err) {
      console.error('Failed to load collection tasks:', err);
      error = 'Failed to load collection tasks';
      toast.error('Failed to load collection tasks');
    } finally {
      loading = false;
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
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = {
      status: 'downloading',
      startedAt: new Date().toISOString()
    };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.success(`Task "${collectionTasks[taskIndex].name}" started`);
      simulateDownload(taskId);
    }).catch(error => {
      console.error('Failed to start task:', error);
      toast.error('Failed to start task');
    });
  }
  
  function pauseTask(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = { status: 'paused' };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.info(`Task "${collectionTasks[taskIndex].name}" paused`);
    }).catch(error => {
      console.error('Failed to pause task:', error);
      toast.error('Failed to pause task');
    });
  }
  
  function resumeTask(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = { status: 'downloading' };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.info(`Task "${collectionTasks[taskIndex].name}" resumed`);
      simulateDownload(taskId);
    }).catch(error => {
      console.error('Failed to resume task:', error);
      toast.error('Failed to resume task');
    });
  }
  
  function deleteTask(taskId) {
    const task = collectionTasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (confirm(`Are you sure you want to delete the task "${task.name}"?`)) {
      deleteCollectionTask(taskId).then(() => {
        collectionTasks = collectionTasks.filter(t => t.id !== taskId);
        toast.success(`Task "${task.name}" deleted`);
      }).catch(error => {
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      });
    }
  }
  
  // Simulate download progress
  function simulateDownload(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const task = collectionTasks[taskIndex];
    if (task.status !== 'downloading') return;
    
    const totalSize = 1000 + Math.random() * 9000; // Random size between 1-10GB
    const currentProgress = task.progress || 0;
    
    if (currentProgress >= 100) {
      // Complete the task
      const updates = {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        totalSize: totalSize,
        downloadedSize: totalSize
      };
      
      updateCollectionTask(taskId, updates).then(() => {
        collectionTasks[taskIndex] = { ...task, ...updates };
        toast.success(`Task "${task.name}" completed successfully`);
      });
      return;
    }
    
    // Update progress
    const progressIncrement = 2 + Math.random() * 8; // 2-10% increment
    const newProgress = Math.min(100, currentProgress + progressIncrement);
    
    const updates = {
      progress: newProgress,
      totalSize: totalSize,
      downloadedSize: (totalSize * newProgress) / 100,
      speed: 10 + Math.random() * 90 // Random speed 10-100 MB/s
    };
    
    // Randomly simulate failures (5% chance)
    if (Math.random() < 0.05 && newProgress > 20) {
      updates.status = 'failed';
      updates.errorMessage = 'Connection timeout - please retry';
      
      updateCollectionTask(taskId, updates).then(() => {
        collectionTasks[taskIndex] = { ...task, ...updates };
        toast.error(`Task "${task.name}" failed`);
      });
      return;
    }
    
    // Update task
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...task, ...updates };
      
      // Continue simulation
      if (newProgress < 100) {
        setTimeout(() => simulateDownload(taskId), 1000 + Math.random() * 2000);
      }
    });
  }
  
  function retryTask(taskId) {
    const taskIndex = collectionTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;
    
    const updates = {
      status: 'downloading',
      progress: 0,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      completedAt: null
    };
    
    updateCollectionTask(taskId, updates).then(() => {
      collectionTasks[taskIndex] = { ...collectionTasks[taskIndex], ...updates };
      toast.info(`Task "${collectionTasks[taskIndex].name}" restarted`);
      simulateDownload(taskId);
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
        <p class="text-base-content/60">Track and manage your dataset download tasks</p>
      </div>
    </div>
  </div>
  
  <!-- Filters and Controls -->
  <div class="mb-6">
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <!-- Status Filter -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Filter by status</span>
        </label>
        <select class="select select-bordered select-sm w-40" bind:value={statusFilter}>
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="downloading">Downloading</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="paused">Paused</option>
        </select>
      </div>
      
      <!-- Sort Options -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Sort by</span>
        </label>
        <div class="join">
          <select class="join-item select select-bordered select-sm" bind:value={sortBy}>
            <option value="created">Created</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="progress">Progress</option>
          </select>
          <button 
            class="join-item btn btn-sm"
            class:btn-active={sortOrder === 'desc'}
            on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          >
            {#if sortOrder === 'desc'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            {/if}
          </button>
        </div>
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
                    <li><button type="button" on:click={() => startTask(task.id)}>Start Task</button></li>
                  {/if}
                  {#if task.status === 'downloading'}
                    <li><button type="button" on:click={() => pauseTask(task.id)}>Pause Task</button></li>
                  {/if}
                  {#if task.status === 'paused'}
                    <li><button type="button" on:click={() => resumeTask(task.id)}>Resume Task</button></li>
                  {/if}
                  {#if task.status === 'failed'}
                    <li><button type="button" on:click={() => retryTask(task.id)}>Retry Task</button></li>
                  {/if}
                  <li><button type="button" class="text-error" on:click={() => deleteTask(task.id)}>Delete Task</button></li>
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
              <h4 class="font-semibold text-sm mb-2">Storage Locations:</h4>
              <div class="flex flex-wrap gap-2">
                {#each task.storageLocations as location}
                  <span class="badge badge-outline badge-sm">
                    {location.type === 'local' ? '📁' : '☁️'} {location.name}
                  </span>
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
