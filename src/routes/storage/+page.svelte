<script>
  import { onMount } from 'svelte';
  
  let storageData = {
    total: '10 GB',
    used: '4.85 GB',
    available: '5.15 GB',
    usedPercentage: 48.5
  };
  
  let storageLocations = [
    {
      id: 1,
      name: 'Local Storage',
      path: '/data/BIDS-Data',
      type: 'local',
      size: '4.85 GB',
      datasets: 3,
      status: 'active'
    },
    {
      id: 2,
      name: 'External Drive',
      path: '/Volumes/ExternalHD/BIDS-Backup',
      type: 'external',
      size: '0 GB',
      datasets: 0,
      status: 'disconnected'
    },
    {
      id: 3,
      name: 'Network Share',
      path: '//server/shared/bids',
      type: 'network',
      size: '0 GB',
      datasets: 0,
      status: 'unavailable'
    }
  ];
  
  let recentFiles = [
    {
      name: 'sub-001_task-rest_bold.nii.gz',
      dataset: 'fMRI Motor Task Study',
      size: '45.2 MB',
      modified: '2025-01-29 14:30'
    },
    {
      name: 'sub-002_anat_T1w.nii.gz',
      dataset: 'fMRI Motor Task Study',
      size: '12.8 MB',
      modified: '2025-01-29 13:45'
    },
    {
      name: 'participants.tsv',
      dataset: 'EEG Resting State',
      size: '2.3 KB',
      modified: '2025-01-29 11:20'
    },
    {
      name: 'dataset_description.json',
      dataset: 'DTI Connectivity Study',
      size: '1.1 KB',
      modified: '2025-01-28 16:15'
    }
  ];
  
  onMount(() => {
    console.log('Storage management page loaded');
    // In a real app, you would fetch actual storage information here
  });
  
  function getStorageTypeIcon(type) {
    switch(type) {
      case 'local':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'external':
        return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
      case 'network':
        return 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }
  
  function getStatusBadge(status) {
    switch(status) {
      case 'active': return 'badge-success';
      case 'disconnected': return 'badge-warning';
      case 'unavailable': return 'badge-error';
      default: return 'badge-neutral';
    }
  }
  
  function handleAddStorage() {
    console.log('Add storage location clicked');
  }
  
  function handleCleanupStorage() {
    console.log('Cleanup storage clicked');
  }
  
  function formatFileSize(size) {
    return size;
  }
</script>

<svelte:head>
  <title>Storage - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-4">Storage Management</h1>
    <p class="text-base-content/70">Monitor and manage your BIDS data storage locations.</p>
  </div>
  
  <!-- Storage Overview -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <!-- Storage Usage Chart -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Storage Usage</h2>
        <div class="flex items-center justify-center mb-4">
          <div class="radial-progress text-primary" style="--value:{storageData.usedPercentage};" role="progressbar">
            {storageData.usedPercentage.toFixed(1)}%
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-sm text-base-content/70">Total</p>
            <p class="font-bold">{storageData.total}</p>
          </div>
          <div>
            <p class="text-sm text-base-content/70">Used</p>
            <p class="font-bold text-primary">{storageData.used}</p>
          </div>
          <div>
            <p class="text-sm text-base-content/70">Available</p>
            <p class="font-bold text-success">{storageData.available}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Quick Actions</h2>
        <div class="space-y-3">
          <button class="btn btn-primary w-full justify-start" on:click={handleAddStorage}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Storage Location
          </button>
          <button class="btn btn-secondary w-full justify-start" on:click={handleCleanupStorage}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Cleanup Storage
          </button>
          <button class="btn btn-accent w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export All Data
          </button>
          <button class="btn btn-info w-full justify-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verify Integrity
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Storage Locations -->
  <div class="card bg-base-100 shadow-xl mb-8">
    <div class="card-body">
      <div class="flex justify-between items-center mb-6">
        <h2 class="card-title">Storage Locations</h2>
        <button class="btn btn-primary btn-sm" on:click={handleAddStorage}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Location
        </button>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Location</th>
              <th>Path</th>
              <th>Type</th>
              <th>Size</th>
              <th>Datasets</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each storageLocations as location}
              <tr>
                <td class="font-medium">{location.name}</td>
                <td class="font-mono text-sm">{location.path}</td>
                <td>
                  <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="{getStorageTypeIcon(location.type)}" />
                    </svg>
                    {location.type}
                  </div>
                </td>
                <td>{location.size}</td>
                <td>{location.datasets}</td>
                <td>
                  <span class="badge {getStatusBadge(location.status)} badge-sm">
                    {location.status}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs">Configure</button>
                    <button class="btn btn-ghost btn-xs">Browse</button>
                    <button class="btn btn-ghost btn-xs text-error">Remove</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <!-- Recent Files -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-6">Recent Files</h2>
      
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Dataset</th>
              <th>Size</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each recentFiles as file}
              <tr>
                <td class="font-mono text-sm">{file.name}</td>
                <td>{file.dataset}</td>
                <td>{file.size}</td>
                <td>{file.modified}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs">Open</button>
                    <button class="btn btn-ghost btn-xs">Info</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
