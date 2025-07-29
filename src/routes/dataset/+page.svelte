<script>
  import { onMount } from 'svelte';
  
  let datasets = [
    { 
      id: 1, 
      name: 'fMRI Motor Task Study', 
      subjects: 25, 
      sessions: 50,
      size: '2.3 GB',
      created: '2025-01-15',
      status: 'active'
    },
    { 
      id: 2, 
      name: 'EEG Resting State', 
      subjects: 12, 
      sessions: 24,
      size: '850 MB',
      created: '2025-01-10',
      status: 'completed'
    },
    { 
      id: 3, 
      name: 'DTI Connectivity Study', 
      subjects: 8, 
      sessions: 16,
      size: '1.7 GB',
      created: '2025-01-20',
      status: 'in-progress'
    }
  ];
  
  onMount(() => {
    console.log('Dataset management page loaded');
  });
  
  function getStatusBadge(status) {
    switch(status) {
      case 'active': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'in-progress': return 'badge-warning';
      default: return 'badge-neutral';
    }
  }
  
  function handleCreateDataset() {
    console.log('Create new dataset clicked');
    // Here you would typically open a modal or navigate to a creation form
  }
  
  function handleExportDataset(dataset) {
    console.log('Export dataset:', dataset.name);
    // Here you would handle BIDS export functionality
  }
  
  function handleValidateDataset(dataset) {
    console.log('Validate dataset:', dataset.name);
    // Here you would run BIDS validation
  }
</script>

<svelte:head>
  <title>Datasets - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-4">BIDS Datasets</h1>
    <p class="text-base-content/70">Manage your Brain Imaging Data Structure (BIDS) datasets locally.</p>
  </div>
  
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Total Datasets</p>
            <p class="text-2xl font-bold">{datasets.length}</p>
          </div>
          <div class="p-3 bg-primary/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0a2 2 0 002-2h14a2 2 0 002 2v0a2 2 0 00-2 2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Total Subjects</p>
            <p class="text-2xl font-bold">{datasets.reduce((sum, d) => sum + d.subjects, 0)}</p>
          </div>
          <div class="p-3 bg-secondary/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card bg-base-100 shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Storage Used</p>
            <p class="text-2xl font-bold">4.85 GB</p>
          </div>
          <div class="p-3 bg-accent/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Main Dataset Table -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <div class="flex justify-between items-center mb-6">
        <h2 class="card-title">Dataset Collection</h2>
        <button class="btn btn-primary" on:click={handleCreateDataset}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Dataset
        </button>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Subjects</th>
              <th>Sessions</th>
              <th>Size</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each datasets as dataset}
              <tr>
                <td class="font-medium">{dataset.name}</td>
                <td>{dataset.subjects}</td>
                <td>{dataset.sessions}</td>
                <td>{dataset.size}</td>
                <td>
                  <span class="badge {getStatusBadge(dataset.status)} badge-sm">
                    {dataset.status}
                  </span>
                </td>
                <td>{dataset.created}</td>
                <td>
                  <div class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </div>
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                      <li><button type="button" on:click={() => console.log('View dataset:', dataset.name)}>View Details</button></li>
                      <li><button type="button" on:click={() => handleValidateDataset(dataset)}>Validate BIDS</button></li>
                      <li><button type="button" on:click={() => handleExportDataset(dataset)}>Export</button></li>
                      <li><button type="button" on:click={() => console.log('Edit dataset:', dataset.name)}>Edit</button></li>
                      <li><button type="button" class="text-error" on:click={() => console.log('Delete dataset:', dataset.name)}>Delete</button></li>
                    </ul>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      {#if datasets.length === 0}
        <div class="text-center py-12">
          <div class="text-base-content/50 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0a2 2 0 002-2h14a2 2 0 002 2v0a2 2 0 00-2 2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p class="text-xl font-medium mb-2">No datasets found</p>
          <p class="text-base-content/70 mb-6">Create your first BIDS dataset to start organizing your neuroimaging data.</p>
          <button class="btn btn-primary" on:click={handleCreateDataset}>Create First Dataset</button>
        </div>
      {/if}
    </div>
  </div>
</div>
