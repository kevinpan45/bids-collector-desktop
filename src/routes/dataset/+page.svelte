<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  
  let datasets = [];
  let loading = true;
  let error = null;
  let page = 1; // Start from page 1 to match API
  let size = 10;
  let totalPages = 1;
  let totalRecords = 0;
  
  let searchTerm = '';
  let selectedFilter = 'all';
  let viewMode = 'list'; // 'grid' or 'list'
  
  $: filteredDatasets = datasets;
  
  async function fetchDatasets() {
    try {
      loading = true;
      error = null;
      
      const response = await axios.get(`/api/openneuro/bids?page=${page}&size=${size}`);
      
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
        participants: dataset.participants || 'N/A', // Use participants field from API response
        subjects: dataset.subjects || 0,
        sessions: dataset.sessions || 0, // API doesn't provide session count
        size: formatFileSize(dataset.size) || 'Unknown', // Convert size to human-readable format
        created: dataset.createdAt ? new Date(dataset.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: dataset.deleted ? 'deleted' : 'available',
        datatype: 'Mixed', // API doesn't specify datatype
        tags: [], // API doesn't provide tags
        version: dataset.version || '1.0.0',
        doi: dataset.doi,
        storagePath: dataset.storagePath
      }));
      
    } catch (err) {
      console.error('Error fetching datasets:', err);
      error = err.response?.data?.message || err.message || 'Failed to fetch datasets';
      // Fallback to sample data if API fails
      datasets = [
        { 
          id: 1, 
          name: 'fMRI Motor Task Study',
          description: 'Functional MRI data collected during motor task paradigm with 25 healthy participants',
          modalities: ['func', 'anat'],
          provider: 'OpenNeuro',
          participants: 25,
          subjects: 25, 
          sessions: 50,
          size: '2.3 GB',
          created: '2025-01-15',
          status: 'active',
          datatype: 'fMRI',
          tags: ['motor', 'task', 'healthy'],
          version: '1.0.0'
        },
        { 
          id: 2, 
          name: 'EEG Resting State',
          description: 'High-density EEG recordings during resting state conditions',
          modalities: ['eeg'],
          provider: 'OpenNeuro',
          participants: 12,
          subjects: 12, 
          sessions: 24,
          size: '850 MB',
          created: '2025-01-10',
          status: 'completed',
          datatype: 'EEG',
          tags: ['resting-state', 'eeg', 'connectivity'],
          version: '1.2.1'
        },
        { 
          id: 3, 
          name: 'DTI Connectivity Study',
          description: 'Diffusion tensor imaging for white matter connectivity analysis',
          modalities: ['dwi', 'anat'],
          provider: 'OpenNeuro',
          participants: 8,
          subjects: 8, 
          sessions: 16,
          size: '1.7 GB',
          created: '2025-01-20',
          status: 'in-progress',
          datatype: 'DTI',
          tags: ['diffusion', 'connectivity', 'white-matter'],
          version: '0.8.0'
        }
      ];
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    console.log('Dataset management page loaded');
    fetchDatasets();
  });
  
  function getStatusBadge(status) {
    switch(status) {
      case 'active': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'in-progress': return 'badge-warning';
      default: return 'badge-neutral';
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
  
  function handleExportDataset(dataset) {
    console.log('Export dataset:', dataset.name);
    // Here you would handle BIDS export functionality
  }
  
  function handleValidateDataset(dataset) {
    console.log('Validate dataset:', dataset.name);
    // Here you would run BIDS validation
  }
  
  function handleViewDataset(dataset) {
    console.log('View dataset details:', dataset.name);
    // Navigate to dataset detail view
  }
  
  function handleDownloadDataset(dataset) {
    console.log('Download dataset from OpenNeuro:', dataset.name);
    // Here you would handle downloading the dataset from OpenNeuro
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
        <!-- Dataset Count Info -->
        <div class="text-sm text-base-content/60 flex items-center ml-4">
          Showing {datasets.length} of {totalRecords} datasets
        </div>
      </div>
      <div class="flex gap-2">
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
                  <span class="badge {getStatusBadge(dataset.status)} badge-sm mb-2">
                    {dataset.status}
                  </span>
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
                    <li><button type="button" on:click={() => handleValidateDataset(dataset)}>Validate BIDS</button></li>
                    <li><button type="button" on:click={() => handleExportDataset(dataset)}>Export</button></li>
                    <li><button type="button" on:click={() => console.log('Add to collection:', dataset.name)}>Add to Collection</button></li>
                  </ul>
                </div>
              </div>
              
              <!-- Description -->
              <p class="text-sm text-base-content/80 mb-4 line-clamp-3">{dataset.description}</p>
              
              <!-- Modalities -->
              <div class="flex flex-wrap gap-2 mb-4">
                {#each dataset.modalities as modality}
                  <span class="badge badge-outline badge-sm">
                    {getModalityIcon(modality)} {modality.toUpperCase()}
                  </span>
                {/each}
              </div>
              
              <!-- Provider -->
              <div class="mb-4">
                <span class="badge badge-ghost badge-sm">📍 {dataset.provider}</span>
              </div>
              
              <!-- Stats -->
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="text-center">
                  <div class="text-lg font-bold text-primary">{dataset.participants}</div>
                  <div class="text-xs text-base-content/60">Participants</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-secondary">{dataset.sessions}</div>
                  <div class="text-xs text-base-content/60">Sessions</div>
                </div>
              </div>
              
              <!-- Tags -->
              <div class="flex flex-wrap gap-1 mb-4">
                {#each dataset.tags.slice(0, 3) as tag}
                  <span class="badge badge-ghost badge-xs">#{tag}</span>
                {/each}
                {#if dataset.tags.length > 3}
                  <span class="badge badge-ghost badge-xs">+{dataset.tags.length - 3}</span>
                {/if}
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
                          <li><button type="button" on:click={() => handleValidateDataset(dataset)}>Validate BIDS</button></li>
                          <li><button type="button" on:click={() => handleExportDataset(dataset)}>Export</button></li>
                          <li><button type="button" on:click={() => console.log('Add to collection:', dataset.name)}>Add to Collection</button></li>
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

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card:hover {
    transform: translateY(-2px);
  }
  
  .stats {
    background: linear-gradient(135deg, hsl(var(--b1)) 0%, hsl(var(--b2)) 100%);
  }
  
  .badge-outline {
    border-width: 1px;
  }
  
  /* Custom scrollbar for horizontal scroll */
  .overflow-x-auto::-webkit-scrollbar {
    height: 8px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-track {
    background: hsl(var(--b2));
    border-radius: 4px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: hsl(var(--bc) / 0.3);
    border-radius: 4px;
  }
  
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--bc) / 0.5);
  }
</style>
