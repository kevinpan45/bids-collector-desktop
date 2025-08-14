<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import toast from 'svelte-french-toast';
  import { loadConfig } from '$lib/storage.js';
  import { createCollectionTasksForLocations, generateDownloadPath, startTaskDownload } from '$lib/collections.js';
  import { getSetting } from '$lib/settings.js';
  
  let datasets = [];
  let loading = true;
  let error = null;
  let page = 1; // Start from page 1 to match API
  let size = 10;
  let totalPages = 1;
  let totalRecords = 0;
  
  let viewMode = 'list'; // 'grid' or 'list'
  let selectedProvider = 'All'; // 'All', 'OpenNeuro', 'CCNDC'
  
  // Download modal state
  let showDownloadModal = false;
  let selectedDataset = null;
  let storageLocations = [];
  let selectedLocationIds = []; // Changed to array for multiple selections
  let isDownloading = false;
  let downloadPathPreview = '';
  
  $: filteredDatasets = datasets;
  
  async function fetchDatasets() {
    try {
      loading = true;
      error = null;
      
      // Build API URL with provider filter
      let apiUrl = `/api/openneuro/bids?page=${page}&size=${size}`;
      if (selectedProvider !== 'All') {
        apiUrl += `&provider=${selectedProvider}`;
      }
      
      const response = await axios.get(apiUrl);
      
      const data = response.data;
      
      // Update pagination metadata
      totalPages = data.pages || 1;
      totalRecords = data.total || 0;
      
      // Transform the API response to match our component structure
      datasets = data.records.map(dataset => ({
        id: dataset.id,
        name: dataset.name || 'Unnamed Dataset',
        description: dataset.description || `Dataset DOI: ${dataset.doi}` || 'No description available',
        modalities: ['unknown'], // API doesn't provide modalities, could be enhanced later
        provider: dataset.provider || 'OpenNeuro',
        participants: dataset.participants === -1 ? 'Unknown' : (dataset.participants || 'N/A'), // Use participants field from API response
        subjects: dataset.subjects || 0,
        size: formatFileSize(dataset.size) || 'Unknown', // Convert size to human-readable format
        created: dataset.createdAt ? new Date(dataset.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        version: dataset.version || '1.0.0',
        doi: dataset.doi,
        storagePath: dataset.storagePath
      }));
      
    } catch (err) {
      console.error('Error fetching datasets:', err);
      error = err.response?.data?.message || err.message || 'Failed to fetch datasets';
      toast.error(`Failed to load datasets: ${error}`, {
        duration: 4000,
        position: 'top-right'
      });
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    console.log('Dataset management page loaded');
    fetchDatasets();
    loadStorageLocations();
  });
  
  async function loadStorageLocations() {
    try {
      const config = await loadConfig('storage', { storageLocations: [] });
      storageLocations = config.storageLocations || [];
      console.log(`Loaded ${storageLocations.length} storage locations`);
    } catch (error) {
      console.error('Failed to load storage locations:', error);
      storageLocations = [];
    }
  }
  
  function getModalityIcon(modality) {
    switch(modality) {
      case 'func': return '🧠';
      case 'anat': return '🏗️';
      case 'dwi': return '🌐';
      case 'eeg': return '⚡';
      case 'meg': return '🔬';
      default: return '📊';
    }
  }
  
  function formatFileSize(bytes) {
    if (!bytes || bytes === 'Unknown') return 'Unknown';
    
    // If it's already a formatted string, return as is
    if (typeof bytes === 'string' && /[KMGTPE]B/i.test(bytes)) {
      return bytes;
    }
    
    // Convert to number if it's a string
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    
    if (isNaN(numBytes) || numBytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const k = 1024;
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    
    return Math.round((numBytes / Math.pow(k, i)) * 100) / 100 + ' ' + units[i];
  }
  
  function handleViewDataset(dataset) {
    console.log('View dataset details:', dataset.name);
    // Navigate to dataset detail view
  }
  
  async function handleDownloadDataset(dataset) {
    selectedDataset = dataset;
    showDownloadModal = true;
    
    // Generate download path preview
    try {
      downloadPathPreview = await generateDownloadPath(dataset.id, dataset.version, dataset.provider, dataset.doi);
    } catch (error) {
      console.error('Failed to generate download path preview:', error);
      downloadPathPreview = 'Error generating path';
    }
    
    console.log('Download dataset:', dataset.name, '-> Path:', downloadPathPreview);
  }
  
  function closeDownloadModal() {
    showDownloadModal = false;
    selectedDataset = null;
    selectedLocationIds = [];
    downloadPathPreview = '';
  }
  
  async function startDownload() {
    if (selectedLocationIds.length === 0) {
      toast.error('Please select at least one storage location');
      return;
    }
    
    const selectedLocations = storageLocations.filter(loc => selectedLocationIds.includes(loc.id));
    if (selectedLocations.length === 0) {
      toast.error('Selected storage locations not found');
      return;
    }
    
    isDownloading = true;
    try {
      // Create separate collection tasks for each location
      const collectionTasks = await createCollectionTasksForLocations(selectedDataset, selectedLocations);
      
      console.log(`Created ${collectionTasks.length} collection tasks for dataset: ${selectedDataset.name}`);
      toast.success(`Created ${collectionTasks.length} collection task${collectionTasks.length > 1 ? 's' : ''} for ${selectedDataset.name}`);
      
      // Check if auto-start is enabled in settings
      const autoStartEnabled = getSetting('download.autoStartTasks', true);
      
      if (autoStartEnabled) {
        // Auto-start all collection tasks
        let startedCount = 0;
        let failedCount = 0;
        
        for (const task of collectionTasks) {
          try {
            await startTaskDownload(task.id);
            console.log(`Auto-started collection task: ${task.name}`);
            startedCount++;
          } catch (startError) {
            console.warn(`Failed to auto-start collection task ${task.name}:`, startError);
            failedCount++;
          }
        }
        
        if (startedCount === collectionTasks.length) {
          toast.success(`All ${startedCount} download${startedCount > 1 ? 's' : ''} started automatically! Track progress in Collections page.`, {
            duration: 5000
          });
        } else if (startedCount > 0) {
          toast.success(`${startedCount} of ${collectionTasks.length} downloads started automatically. Check Collections page for details.`, {
            duration: 5000
          });
        } else {
          toast.success(`Collection tasks created but failed to auto-start. You can manually start them from the Collections page.`, {
            duration: 5000
          });
        }
      } else {
        // Auto-start is disabled
        toast.success(`${collectionTasks.length} collection task${collectionTasks.length > 1 ? 's' : ''} created. Go to Collections page to start the downloads.`, {
          duration: 5000
        });
      }
      
      closeDownloadModal();
    } catch (error) {
      console.error('Failed to create collection tasks:', error);
      toast.error(`Failed to create collection tasks: ${error.message}`);
    } finally {
      isDownloading = false;
    }
  }
  
  function toggleLocationSelection(locationId) {
    if (selectedLocationIds.includes(locationId)) {
      selectedLocationIds = selectedLocationIds.filter(id => id !== locationId);
    } else {
      selectedLocationIds = [...selectedLocationIds, locationId];
    }
  }
  
  function selectAllLocations() {
    selectedLocationIds = storageLocations.map(loc => loc.id);
  }
  
  function clearAllSelections() {
    selectedLocationIds = [];
  }
  
  function navigateToStorage() {
    window.location.href = '/storage';
  }
</script>

<svelte:head>
  <title>Datasets - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Header Section -->
  <div class="mb-8">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex gap-2">
        <!-- View Mode Toggle -->
        <div class="join">
          <button 
            class="join-item btn btn-sm"
            class:btn-active={viewMode === 'grid'}
            on:click={() => viewMode = 'grid'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
          <button 
            class="join-item btn btn-sm"
            class:btn-active={viewMode === 'list'}
            on:click={() => viewMode = 'list'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
        <!-- Provider Filter -->
        <div class="form-control">
          <select 
            class="select select-sm select-bordered w-40" 
            bind:value={selectedProvider}
            on:change={() => { page = 1; fetchDatasets(); }}
          >
            <option value="All">All Providers</option>
            <option value="OpenNeuro">OpenNeuro</option>
            <option value="CCNDC">CCNDC</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <!-- Dataset Count Info -->
        <div class="text-sm text-base-content/60">
          Showing {datasets.length} of {totalRecords} datasets
        </div>
        <!-- Pagination Controls -->
        <div class="join">
          <button 
            class="join-item btn btn-sm" 
            on:click={() => { if (page > 1) { page--; fetchDatasets(); } }}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <button class="join-item btn btn-sm btn-active">Page {page} of {totalPages}</button>
          <button 
            class="join-item btn btn-sm" 
            on:click={() => { page++; fetchDatasets(); }}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Dataset Grid/List View -->
  {#if loading}
    <!-- Loading State -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <div class="text-base-content/30 mb-6">
          <span class="loading loading-spinner loading-lg"></span>
          <h3 class="text-2xl font-bold mt-4 mb-2">Loading Datasets</h3>
          <p class="text-base-content/60">Fetching datasets from OpenNeuro...</p>
        </div>
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
          <h3 class="text-2xl font-bold mt-4 mb-2 text-error">Failed to Load Datasets</h3>
          <p class="text-base-content/60 mb-6">Error: {error}</p>
        </div>
      </div>
    </div>
  {:else if filteredDatasets.length > 0}
    {#if viewMode === 'grid'}
      <!-- Grid View -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {#each filteredDatasets as dataset}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div class="card-body">
              <!-- Header -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                  <h3 class="card-title text-lg mb-2">{dataset.name}</h3>
                  <div class="text-sm text-base-content/60">v{dataset.version}</div>
                </div>
                <div class="dropdown dropdown-end">
                  <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </div>
                  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                  <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><button type="button" on:click={() => handleViewDataset(dataset)}>View Details</button></li>
                    <li><button type="button" on:click={() => handleDownloadDataset(dataset)}>Download Dataset</button></li>
                  </ul>
                </div>
              </div>
              
              <!-- Description -->
              <p class="text-sm text-base-content/80 mb-4 line-clamp-3">{dataset.description}</p>
              
              <!-- Provider and Modalities -->
              <div class="flex flex-wrap gap-2 mb-4 items-center">
                <span class="badge badge-ghost badge-sm">📍 {dataset.provider}</span>
                {#each dataset.modalities as modality}
                  <span class="badge badge-outline badge-sm">
                    {getModalityIcon(modality)} {modality.toUpperCase()}
                  </span>
                {/each}
              </div>
              
              <!-- Stats -->
              <div class="grid grid-cols-1 gap-4 mb-4">
                <div class="text-center">
                  <div class="text-lg font-bold text-primary">{dataset.participants}</div>
                  <div class="text-xs text-base-content/60">Participants</div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="flex justify-between items-center text-sm text-base-content/60">
                <span>{dataset.size}</span>
                <span>{dataset.created}</span>
              </div>
              
              <!-- Action Buttons -->
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-primary btn-sm" on:click={() => handleDownloadDataset(dataset)}>
                  Download
                </button>
                <button class="btn btn-outline btn-sm" on:click={() => handleViewDataset(dataset)}>
                  View Details
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-0">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Modality</th>
                <th>Provider</th>
                <th>Participants</th>
                <th>Size</th>
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredDatasets as dataset}
                <tr class="hover">
                  <td class="font-mono">
                    {dataset.id}
                  </td>
                  <td>
                    <div class="flex items-center space-x-3">
                      <div>
                        <div class="font-bold">{dataset.name}</div>
                        <div class="text-sm text-base-content/60 max-w-xs truncate">
                          {dataset.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="flex gap-1 flex-wrap min-w-[120px]">
                      {#each dataset.modalities as modality}
                        <span class="badge badge-outline badge-xs whitespace-nowrap">
                          {getModalityIcon(modality)} {modality.toUpperCase()}
                        </span>
                      {/each}
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-ghost">{dataset.provider}</span>
                  </td>
                  <td class="font-mono">{dataset.participants}</td>
                  <td class="font-mono">{dataset.size}</td>
                  <td>
                    <div class="flex gap-2">
                      <button class="btn btn-primary btn-xs" on:click={() => handleDownloadDataset(dataset)}>
                        Download
                      </button>
                      <div class="dropdown dropdown-end">
                        <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </div>
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                          <li><button type="button" on:click={() => handleViewDataset(dataset)}>View Details</button></li>
                          <li><button type="button" on:click={() => handleDownloadDataset(dataset)}>Download Dataset</button></li>
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {:else}
    <!-- Empty State -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-16">
        <div class="text-base-content/30 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 class="text-2xl font-bold mt-4 mb-2">No Datasets Found</h3>
          <p class="text-base-content/60 mb-6">No BIDS datasets are currently available. Please check back later.</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Download Modal -->
{#if showDownloadModal && selectedDataset}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Download Dataset</h3>
      
      <!-- Dataset Info -->
      <div class="bg-base-200 rounded-lg p-4 mb-6">
        <!-- Header -->
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h4 class="font-bold text-lg mb-2">{selectedDataset.name}</h4>
            <div class="text-sm text-base-content/60">v{selectedDataset.version}</div>
          </div>
        </div>
        
        <!-- Description -->
        <p class="text-sm text-base-content/80 mb-4 line-clamp-2">{selectedDataset.description}</p>
        
        <!-- Provider and Modalities -->
        <div class="flex flex-wrap gap-2 mb-4 items-center">
          <span class="badge badge-ghost badge-sm">📍 {selectedDataset.provider}</span>
          {#each selectedDataset.modalities as modality}
            <span class="badge badge-outline badge-sm">
              {getModalityIcon(modality)} {modality.toUpperCase()}
            </span>
          {/each}
        </div>
        
        <!-- Stats -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="text-center">
            <div class="text-lg font-bold text-primary">{selectedDataset.participants}</div>
            <div class="text-xs text-base-content/60">Participants</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-secondary">{selectedDataset.size}</div>
            <div class="text-xs text-base-content/60">Dataset Size</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="flex justify-between items-center text-sm text-base-content/60">
          <span>Created: {selectedDataset.created}</span>
          <span>ID: {selectedDataset.id}</span>
        </div>
      </div>
      
      <!-- Download Path Preview -->
      {#if downloadPathPreview}
        <div class="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
            </svg>
            <span class="font-semibold text-primary">Download Target Folder</span>
          </div>
          <div class="text-sm text-base-content/80 mb-2">
            The dataset will be downloaded to the following folder:
          </div>
          <code class="block bg-base-100 border rounded px-3 py-2 text-sm font-mono break-all">
            {downloadPathPreview}
          </code>
          <div class="text-xs text-base-content/60 mt-2">
            {#if selectedDataset?.doi}
              📌 DOI-based folder: {selectedDataset.doi}
            {:else if selectedDataset?.provider?.toLowerCase() === 'openneuro'}
              📌 OpenNeuro format: ds{selectedDataset.id}_v{selectedDataset.version}
            {:else}
              📌 Standard format: {selectedDataset?.id}_v{selectedDataset?.version}
            {/if}
          </div>
        </div>
      {/if}
      
      {#if storageLocations.length === 0}
        <!-- No Storage Locations -->
        <div class="alert alert-warning mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 class="font-bold">No Storage Locations Found</h3>
            <div class="text-xs">You need to configure at least one storage location before downloading datasets.</div>
          </div>
        </div>
        
        <div class="modal-action">
          <button class="btn btn-primary" on:click={navigateToStorage}>
            Configure Storage
          </button>
          <button class="btn" on:click={closeDownloadModal}>Cancel</button>
        </div>
      {:else}
        <!-- Storage Location Selection -->
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Select Download Locations</span>
            <div class="flex gap-2">
              <button 
                type="button" 
                class="btn btn-xs btn-outline" 
                on:click={selectAllLocations}
                disabled={isDownloading}
              >
                Select All
              </button>
              <button 
                type="button" 
                class="btn btn-xs btn-outline" 
                on:click={clearAllSelections}
                disabled={isDownloading}
              >
                Clear All
              </button>
            </div>
          </label>
          
          <!-- Location List with Checkboxes -->
          <div class="space-y-3 max-h-60 overflow-y-auto">
            {#each storageLocations as location}
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3 p-3 rounded-lg border border-base-300 hover:border-primary transition-colors">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-primary" 
                    checked={selectedLocationIds.includes(location.id)}
                    on:change={() => toggleLocationSelection(location.id)}
                    disabled={isDownloading}
                  />
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium">{location.name}</span>
                      <span class="badge badge-outline badge-xs">
                        {location.type === 'local' ? '📁 Local' : '☁️ S3'}
                      </span>
                      {#if location.isDefault}
                        <span class="badge badge-primary badge-xs">Default</span>
                      {/if}
                    </div>
                    <div class="text-sm text-base-content/60">
                      {#if location.type === 'local'}
                        {location.path}
                      {:else}
                        {location.bucketName}{location.prefix ? ` / ${location.prefix}` : ''}
                      {/if}
                    </div>
                    {#if location.description}
                      <div class="text-xs text-base-content/50 mt-1">{location.description}</div>
                    {/if}
                  </div>
                </label>
              </div>
            {/each}
          </div>
          
          <!-- Selection Summary -->
          {#if selectedLocationIds.length > 0}
            <div class="mt-3 p-3 bg-primary/10 rounded-lg">
              <div class="text-sm font-medium text-primary">
                {selectedLocationIds.length} location{selectedLocationIds.length > 1 ? 's' : ''} selected
              </div>
              <div class="text-xs text-base-content/60 mt-1">
                {selectedLocationIds.length > 1 ? `${selectedLocationIds.length} separate collection tasks will be created` : 'One collection task will be created'}
              </div>
            </div>
          {/if}
        </div>
        
        <div class="modal-action">
          <button 
            class="btn btn-primary" 
            class:loading={isDownloading}
            disabled={selectedLocationIds.length === 0 || isDownloading}
            on:click={startDownload}
          >
            {isDownloading ? 'Creating Tasks...' : `Create Collection Task${selectedLocationIds.length > 1 ? `s (${selectedLocationIds.length} Tasks)` : ''}`}
          </button>
          <button class="btn" on:click={closeDownloadModal} disabled={isDownloading}>
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card:hover {
    transform: translateY(-2px);
  }
  
  .badge-outline {
    border-width: 1px;
  }
</style>
