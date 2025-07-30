<script>
  import { onMount } from 'svelte';
  import { saveConfig, loadConfig } from '$lib/storage.js';
  import { createS3Client, testS3Connection, createClientFromLocation } from '$lib/s3Client.js';
  
  // Tauri APIs
  let tauriOpen = null;
  
  let storageData = {
    total: '10 GB',
    used: '4.85 GB',
    available: '5.15 GB',
    usedPercentage: 48.5
  };
  
  // Start with empty storage locations to demonstrate the "no locations" state
  let storageLocations = [];
  
  // Modal state
  let showAddLocationModal = false;
  let showEditLocationModal = false;
  let editingLocationId = null;
  let isTestingConnection = false;
  let connectionTestResult = null;
  let addLocationForm = {
    type: 'local', // 'local' or 's3'
    name: '',
    path: '',
    // S3 specific fields
    bucketName: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: '',
    useSSL: true,
    serviceType: 'aws' // 'aws' or 'compatible'
  };
  
  // Notification state
  let notification = {
    show: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    message: ''
  };
  
  let nextLocationId = 1;
  
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
  
  // Initialize Tauri APIs on mount
  onMount(async () => {
    try {
      // Dynamically import Tauri APIs only in Tauri environment
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        tauriOpen = open;
      }
    } catch (error) {
      console.warn('Tauri APIs not available, using web fallbacks:', error);
    }
    
    // Load stored configuration
    await loadStorageConfig();
    
    // Update config path
    await updateConfigPath();
    
    console.log('Storage management page loaded');
    // Show notification to add storage location if none exist
    if (storageLocations.length === 0) {
      showNotification('info', 'No storage locations configured. Please add a storage location to get started.');
    }
  });
  
  // Notification functions
  function showNotification(type, message) {
    notification = { show: true, type, message };
    setTimeout(() => {
      notification.show = false;
    }, 5000);
  }
  
  function hideNotification() {
    notification.show = false;
  }
  
  // Storage configuration persistence
  async function loadStorageConfig() {
    try {
      const defaultConfig = {
        storageLocations: [],
        nextLocationId: 1,
        storageData: {
          total: '10 GB',
          used: '4.85 GB',
          available: '5.15 GB',
          usedPercentage: 48.5
        }
      };
      
      const config = await loadConfig('storage', defaultConfig);
      
      storageLocations = config.storageLocations || [];
      nextLocationId = config.nextLocationId || 1;
      storageData = config.storageData || defaultConfig.storageData;
      
      console.log(`Loaded ${storageLocations.length} storage locations from persistent config`);
    } catch (error) {
      console.error('Failed to load storage config:', error);
      showNotification('warning', 'Failed to load saved storage configuration. Using defaults.');
    }
  }
  
  async function saveStorageConfig() {
    try {
      const config = {
        storageLocations,
        nextLocationId,
        storageData,
        lastUpdated: new Date().toISOString()
      };
      
      const success = await saveConfig('storage', config);
      if (success) {
        console.log('Storage configuration saved successfully');
      } else {
        throw new Error('Save operation returned false');
      }
    } catch (error) {
      console.error('Failed to save storage config:', error);
      showNotification('warning', 'Failed to save storage configuration to disk.');
    }
  }
  
  // Check if local storage already exists
  function hasLocalStorage() {
    return storageLocations.some(location => location.type === 'local');
  }
  
  // Validate form based on storage type
  function validateForm() {
    if (!addLocationForm.name.trim()) {
      showNotification('error', 'Please enter a name for the storage location.');
      return false;
    }
    
    if (addLocationForm.type === 'local') {
      // Check if local storage already exists (but allow editing current local storage)
      const existingLocal = storageLocations.find(loc => loc.type === 'local');
      if (existingLocal && (!editingLocationId || existingLocal.id !== editingLocationId)) {
        showNotification('error', 'Only one local machine storage location is allowed.');
        return false;
      }
      if (!addLocationForm.path.trim()) {
        showNotification('error', 'Please enter a valid local path.');
        return false;
      }
    } else if (addLocationForm.type === 's3') {
      if (!addLocationForm.bucketName.trim()) {
        showNotification('error', 'Please enter the S3 bucket name.');
        return false;
      }
      if (addLocationForm.serviceType === 'aws') {
        if (!addLocationForm.region.trim()) {
          showNotification('error', 'Please select a region for AWS S3.');
          return false;
        }
      } else if (addLocationForm.serviceType === 'compatible') {
        if (!addLocationForm.endpoint.trim()) {
          showNotification('error', 'Please enter the endpoint URL for S3-compatible service.');
          return false;
        }
      }
      if (!addLocationForm.accessKeyId.trim() || !addLocationForm.secretAccessKey.trim()) {
        showNotification('error', 'Please enter valid access credentials.');
        return false;
      }
    }
    
    return true;
  }
  
  // Test S3 connection with current form data
  async function testS3ConnectionFromForm() {
    if (addLocationForm.type !== 's3') return;
    
    isTestingConnection = true;
    showNotification('info', 'Testing S3 connection...');
    
    try {
      const s3Config = {
        bucketName: addLocationForm.bucketName,
        region: addLocationForm.region,
        accessKeyId: addLocationForm.accessKeyId,
        secretAccessKey: addLocationForm.secretAccessKey,
        endpoint: addLocationForm.endpoint,
        useSSL: addLocationForm.useSSL,
        serviceType: addLocationForm.serviceType
      };
      
      const client = await createS3Client(s3Config);
      const connectionSuccess = await testS3Connection(client);
      
      if (connectionSuccess) {
        showNotification('success', 'S3 connection test successful!');
      } else {
        showNotification('error', 'S3 connection test failed. Please check your credentials and settings.');
      }
    } catch (error) {
      console.error('S3 connection test error:', error);
      showNotification('error', `Connection test failed: ${error.message}`);
    } finally {
      isTestingConnection = false;
    }
  }
  
  // Reset form to defaults
  function resetForm() {
    addLocationForm = {
      type: 'local',
      name: '',
      path: '',
      bucketName: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      endpoint: '',
      useSSL: true,
      serviceType: 'aws'
    };
    editingLocationId = null;
  }
  
  // Handle adding new storage location
  async function handleAddStorageSubmit() {
    if (!validateForm()) return;
    
    const newLocation = {
      id: nextLocationId++,
      name: addLocationForm.name,
      type: addLocationForm.type,
      datasets: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    if (addLocationForm.type === 'local') {
      newLocation.path = addLocationForm.path;
    } else if (addLocationForm.type === 's3') {
      newLocation.path = `s3://${addLocationForm.bucketName}`;
      newLocation.bucketName = addLocationForm.bucketName;
      newLocation.region = addLocationForm.region;
      newLocation.accessKeyId = addLocationForm.accessKeyId;
      newLocation.secretAccessKey = addLocationForm.secretAccessKey;
      newLocation.endpoint = addLocationForm.endpoint;
      newLocation.useSSL = addLocationForm.useSSL;
      newLocation.serviceType = addLocationForm.serviceType;
    }
    
    storageLocations = [...storageLocations, newLocation];
    showAddLocationModal = false;
    resetForm();
    
    // Save configuration to disk
    await saveStorageConfig();
    
    showNotification('success', `${getStorageTypeDisplay(newLocation)} storage location "${newLocation.name}" added successfully.`);
  }
  
  // Handle editing existing storage location
  async function handleEditStorageSubmit() {
    if (!validateForm()) return;
    
    const locationIndex = storageLocations.findIndex(loc => loc.id === editingLocationId);
    if (locationIndex === -1) return;
    
    const updatedLocation = {
      ...storageLocations[locationIndex],
      name: addLocationForm.name,
      type: addLocationForm.type,
      updatedAt: new Date().toISOString()
    };
    
    if (addLocationForm.type === 'local') {
      updatedLocation.path = addLocationForm.path;
      // Remove S3 specific fields if switching from S3 to local
      delete updatedLocation.bucketName;
      delete updatedLocation.region;
      delete updatedLocation.accessKeyId;
      delete updatedLocation.secretAccessKey;
      delete updatedLocation.endpoint;
    } else if (addLocationForm.type === 's3') {
      updatedLocation.path = `s3://${addLocationForm.bucketName}`;
      updatedLocation.bucketName = addLocationForm.bucketName;
      updatedLocation.region = addLocationForm.region;
      updatedLocation.accessKeyId = addLocationForm.accessKeyId;
      updatedLocation.secretAccessKey = addLocationForm.secretAccessKey;
      updatedLocation.endpoint = addLocationForm.endpoint;
      updatedLocation.useSSL = addLocationForm.useSSL;
      updatedLocation.serviceType = addLocationForm.serviceType;
    }
    
    storageLocations[locationIndex] = updatedLocation;
    storageLocations = [...storageLocations]; // Trigger reactivity
    showEditLocationModal = false;
    resetForm();
    
    // Save configuration to disk
    await saveStorageConfig();
    
    showNotification('success', `Storage location "${updatedLocation.name}" updated successfully.`);
  }
  
  // Handle removing storage location
  async function handleRemoveLocation(locationId) {
    const locationToRemove = storageLocations.find(loc => loc.id === locationId);
    if (locationToRemove) {
      storageLocations = storageLocations.filter(loc => loc.id !== locationId);
      
      // Save configuration to disk
      await saveStorageConfig();
      
      showNotification('success', `Storage location "${locationToRemove.name}" removed successfully.`);
      
      // Show add location notification if no locations remain
      if (storageLocations.length === 0) {
        setTimeout(() => {
          showNotification('info', 'No storage locations configured. Please add a storage location to get started.');
        }, 1000);
      }
    }
  }
  
  // Handle configuring existing storage location
  function handleConfigureLocation(locationId) {
    const locationToEdit = storageLocations.find(loc => loc.id === locationId);
    if (locationToEdit) {
      editingLocationId = locationId;
      
      // Populate form with existing data
      addLocationForm = {
        type: locationToEdit.type,
        name: locationToEdit.name,
        path: locationToEdit.path || '',
        bucketName: locationToEdit.bucketName || '',
        region: locationToEdit.region || 'us-east-1',
        accessKeyId: locationToEdit.accessKeyId || '',
        secretAccessKey: locationToEdit.secretAccessKey || '',
        endpoint: locationToEdit.endpoint || '',
        useSSL: locationToEdit.useSSL !== undefined ? locationToEdit.useSSL : true,
        serviceType: locationToEdit.serviceType || 'aws'
      };
      
      showEditLocationModal = true;
    }
  }
  
  function getStorageTypeIcon(type) {
    switch(type) {
      case 'local':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 's3':
        return 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z';
      case 'external':
        return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
      case 'network':
        return 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }
  
  function getStorageTypeDisplay(location) {
    if (location.type === 's3') {
      if (location.serviceType === 'compatible') {
        return 'S3-Compatible';
      } else {
        return 'AWS S3';
      }
    }
    return location.type;
  }
  
  function getStatusBadge(status) {
    switch(status) {
      case 'active': return 'badge-success';
      case 'disconnected': return 'badge-warning';
      case 'unavailable': return 'badge-error';
      default: return 'badge-neutral';
    }
  }
  
  // Handle directory picker for local storage
  async function handleBrowseDirectory() {
    try {
      // Try to use the modern File System Access API (supported in Chrome-based browsers)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker();
        addLocationForm.path = dirHandle.name; // This is just the directory name, not full path
        showNotification('success', 'Directory selected successfully!');
        return;
      }
      
      // Fallback: Try Tauri APIs if available
      if (tauriOpen) {
        const selected = await tauriOpen({
          directory: true,
          multiple: false,
          title: 'Select BIDS Data Directory'
        });
        
        if (selected) {
          addLocationForm.path = selected;
          showNotification('success', 'Directory selected successfully!');
          return;
        }
      }
      
      // Final fallback - inform user to enter path manually
      showNotification('info', 'Please enter the directory path manually in the text field above.');
      
    } catch (error) {
      console.error('Error opening directory picker:', error);
      if (error.name === 'AbortError') {
        showNotification('info', 'Directory selection was cancelled.');
      } else {
        showNotification('warning', 'Directory picker not available. Please enter the path manually.');
      }
    }
  }
  
  function handleAddStorage() {
    showAddLocationModal = true;
  }
  
  function handleCleanupStorage() {
    console.log('Cleanup storage clicked');
  }
  
  function formatFileSize(size) {
    return size;
  }
  
  // Show config path
  let configPath = '';
  async function updateConfigPath() {
    try {
      const { getConfigPath } = await import('$lib/storage.js');
      configPath = await getConfigPath();
    } catch (error) {
      configPath = 'Configuration path unavailable';
    }
  }
</script>

<svelte:head>
  <title>Storage - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Notification Toast -->
  {#if notification.show}
    <div class="toast toast-top toast-end z-50">
      <div class="alert alert-{notification.type === 'error' ? 'error' : notification.type === 'success' ? 'success' : notification.type === 'warning' ? 'warning' : 'info'}">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          {#if notification.type === 'success'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          {:else if notification.type === 'error'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          {:else if notification.type === 'warning'}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          {/if}
        </svg>
        <span>{notification.message}</span>
        <button class="btn btn-sm btn-ghost" on:click={hideNotification}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

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
  
  <!-- Configuration Info -->
  <div class="alert alert-info mb-8">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <div>
      <h3 class="font-bold">Configuration Storage</h3>
      <div class="text-sm">
        Storage locations are automatically saved to: <code class="bg-base-200 px-1 rounded">{configPath}</code>
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
      
      {#if storageLocations.length === 0}
        <!-- Empty state -->
        <div class="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-base-content/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3 class="text-lg font-medium text-base-content/70 mb-2">No Storage Locations</h3>
          <p class="text-base-content/50 mb-4">Add a storage location to start managing your BIDS data.</p>
          <button class="btn btn-primary" on:click={handleAddStorage}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Storage Location
          </button>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>Location</th>
                <th>Path</th>
                <th>Type</th>
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
                      {getStorageTypeDisplay(location)}
                    </div>
                  </td>
                  <td>{location.datasets}</td>
                  <td>
                    <span class="badge {getStatusBadge(location.status)} badge-sm">
                      {location.status}
                    </span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn btn-ghost btn-xs" on:click={() => handleConfigureLocation(location.id)}>Configure</button>
                      <button class="btn btn-ghost btn-xs text-error" on:click={() => handleRemoveLocation(location.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
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
  
  <!-- Add Storage Location Modal -->
  {#if showAddLocationModal}
    <div class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Add Storage Location</h3>
        
        <!-- Storage Type Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Storage Type</span>
          </label>
          <div class="flex gap-4">
            <label class="label cursor-pointer">
              <input type="radio" bind:group={addLocationForm.type} value="local" class="radio radio-primary" />
              <span class="label-text ml-2">Local Machine</span>
            </label>
            <label class="label cursor-pointer">
              <input type="radio" bind:group={addLocationForm.type} value="s3" class="radio radio-primary" />
              <span class="label-text ml-2">S3 Service</span>
            </label>
          </div>
          {#if addLocationForm.type === 'local' && hasLocalStorage()}
            <label class="label">
              <span class="label-text-alt text-warning">Warning: Only one local machine storage location is allowed.</span>
            </label>
          {/if}
        </div>
        
        <!-- Common Fields -->
        <div class="form-control mb-4">
          <label class="label" for="storage-name">
            <span class="label-text">Name</span>
          </label>
          <input type="text" id="storage-name" bind:value={addLocationForm.name} placeholder="Enter a name for this storage location" class="input input-bordered" />
        </div>
        
        {#if addLocationForm.type === 'local'}
          <!-- Local Storage Fields -->
          <div class="form-control mb-4">
            <label class="label" for="local-path">
              <span class="label-text">Local Path</span>
            </label>
            <div class="join">
              <input 
                type="text" 
                id="local-path" 
                bind:value={addLocationForm.path} 
                placeholder="/path/to/your/bids/data" 
                class="input input-bordered join-item flex-1" 
              />
              <button 
                type="button"
                class="btn btn-outline join-item" 
                on:click={handleBrowseDirectory}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H6a2 2 0 00-2 2z" />
                </svg>
                Browse
              </button>
            </div>
            <div class="label">
              <span class="label-text-alt">
                Click Browse to select your directory, or enter the full path manually
              </span>
            </div>
          </div>
        {:else if addLocationForm.type === 's3'}
          <!-- S3 Service Type Selection -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">S3 Service Type</span>
            </label>
            <div class="flex gap-4">
              <label class="label cursor-pointer">
                <input type="radio" bind:group={addLocationForm.serviceType} value="aws" class="radio radio-primary" />
                <span class="label-text ml-2">AWS S3</span>
              </label>
              <label class="label cursor-pointer">
                <input type="radio" bind:group={addLocationForm.serviceType} value="compatible" class="radio radio-primary" />
                <span class="label-text ml-2">S3-Compatible (MinIO, etc.)</span>
              </label>
            </div>
          </div>

          <!-- S3 Storage Fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="bucket-name">
                <span class="label-text">Bucket Name</span>
              </label>
              <input type="text" id="bucket-name" bind:value={addLocationForm.bucketName} placeholder="my-bids-bucket" class="input input-bordered" />
            </div>
            {#if addLocationForm.serviceType === 'aws'}
              <div class="form-control">
                <label class="label" for="region">
                  <span class="label-text">Region</span>
                </label>
                <select id="region" bind:value={addLocationForm.region} class="select select-bordered">
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="eu-west-2">Europe (London)</option>
                  <option value="eu-central-1">Europe (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
            {:else if addLocationForm.serviceType === 'compatible'}
              <div class="form-control">
                <label class="label" for="endpoint">
                  <span class="label-text">Endpoint URL</span>
                </label>
                <input type="text" id="endpoint" bind:value={addLocationForm.endpoint} placeholder="https://minio.example.com:9000" class="input input-bordered" />
                <label class="label">
                  <span class="label-text-alt">Full URL including protocol and port</span>
                </label>
              </div>
            {/if}
          </div>
          
          {#if addLocationForm.serviceType === 'compatible'}
            <div class="form-control mb-4">
              <label class="label cursor-pointer">
                <input type="checkbox" bind:checked={addLocationForm.useSSL} class="checkbox checkbox-primary" />
                <span class="label-text ml-2">Use SSL/HTTPS</span>
              </label>
              <div class="label">
                <span class="label-text-alt">Enable if your S3-compatible service uses HTTPS</span>
              </div>
            </div>
          {/if}
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="access-key">
                <span class="label-text">Access Key ID</span>
              </label>
              <input type="text" id="access-key" bind:value={addLocationForm.accessKeyId} placeholder="AKIAIOSFODNN7EXAMPLE" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="secret-key">
                <span class="label-text">Secret Access Key</span>
              </label>
              <input type="password" id="secret-key" bind:value={addLocationForm.secretAccessKey} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" class="input input-bordered" />
            </div>
          </div>
          
          <!-- Test Connection Button -->
          <div class="form-control mb-4">
            <button 
              type="button" 
              class="btn btn-outline btn-primary" 
              on:click={testS3ConnectionFromForm}
              disabled={isTestingConnection}
            >
              {#if isTestingConnection}
                <span class="loading loading-spinner loading-xs"></span>
                Testing Connection...
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              {/if}
            </button>
            {#if connectionTestResult}
              <div class="alert {connectionTestResult.success ? 'alert-success' : 'alert-error'} mt-2">
                <span>{connectionTestResult.message}</span>
              </div>
            {/if}
          </div>
          
          <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Make sure your credentials have the necessary permissions to read and write to the specified bucket.</span>
          </div>
        {/if}
        <div class="modal-action">
          <button class="btn btn-ghost" on:click={() => { showAddLocationModal = false; resetForm(); }}>Cancel</button>
          <button class="btn btn-primary" on:click={handleAddStorageSubmit} disabled={addLocationForm.type === 'local' && hasLocalStorage()}>
            Add Storage Location
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Edit Storage Location Modal -->
  {#if showEditLocationModal}
    <div class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Configure Storage Location</h3>
        
        <!-- Storage Type Selection -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Storage Type</span>
          </label>
          <div class="flex gap-4">
            <label class="label cursor-pointer">
              <input type="radio" bind:group={addLocationForm.type} value="local" class="radio radio-primary" />
              <span class="label-text ml-2">Local Machine</span>
            </label>
            <label class="label cursor-pointer">
              <input type="radio" bind:group={addLocationForm.type} value="s3" class="radio radio-primary" />
              <span class="label-text ml-2">S3 Service</span>
            </label>
          </div>
          {#if addLocationForm.type === 'local' && hasLocalStorage() && editingLocationId !== storageLocations.find(loc => loc.type === 'local')?.id}
            <label class="label">
              <span class="label-text-alt text-warning">Warning: Only one local machine storage location is allowed.</span>
            </label>
          {/if}
        </div>
        
        <!-- Common Fields -->
        <div class="form-control mb-4">
          <label class="label" for="edit-storage-name">
            <span class="label-text">Name</span>
          </label>
          <input type="text" id="edit-storage-name" bind:value={addLocationForm.name} placeholder="Enter a name for this storage location" class="input input-bordered" />
        </div>
        
        {#if addLocationForm.type === 'local'}
          <!-- Local Storage Fields -->
          <div class="form-control mb-4">
            <label class="label" for="edit-local-path">
              <span class="label-text">Local Path</span>
            </label>
            <div class="join">
              <input 
                type="text" 
                id="edit-local-path" 
                bind:value={addLocationForm.path} 
                placeholder="/path/to/your/bids/data" 
                class="input input-bordered join-item flex-1" 
              />
              <button 
                type="button"
                class="btn btn-outline join-item" 
                on:click={handleBrowseDirectory}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H6a2 2 0 00-2 2z" />
                </svg>
                Browse
              </button>
            </div>
            <div class="label">
              <span class="label-text-alt">
                Click Browse to select your directory, or enter the full path manually
              </span>
            </div>
          </div>
        {:else if addLocationForm.type === 's3'}
          <!-- S3 Service Type Selection -->
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">S3 Service Type</span>
            </label>
            <div class="flex gap-4">
              <label class="label cursor-pointer">
                <input type="radio" bind:group={addLocationForm.serviceType} value="aws" class="radio radio-primary" />
                <span class="label-text ml-2">AWS S3</span>
              </label>
              <label class="label cursor-pointer">
                <input type="radio" bind:group={addLocationForm.serviceType} value="compatible" class="radio radio-primary" />
                <span class="label-text ml-2">S3-Compatible (MinIO, etc.)</span>
              </label>
            </div>
          </div>

          <!-- S3 Storage Fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="edit-bucket-name">
                <span class="label-text">Bucket Name</span>
              </label>
              <input type="text" id="edit-bucket-name" bind:value={addLocationForm.bucketName} placeholder="my-bids-bucket" class="input input-bordered" />
            </div>
            {#if addLocationForm.serviceType === 'aws'}
              <div class="form-control">
                <label class="label" for="edit-region">
                  <span class="label-text">Region</span>
                </label>
                <select id="edit-region" bind:value={addLocationForm.region} class="select select-bordered">
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="eu-west-2">Europe (London)</option>
                  <option value="eu-central-1">Europe (Frankfurt)</option>  
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
            {:else if addLocationForm.serviceType === 'compatible'}
              <div class="form-control">
                <label class="label" for="edit-endpoint">
                  <span class="label-text">Endpoint URL</span>
                </label>
                <input type="text" id="edit-endpoint" bind:value={addLocationForm.endpoint} placeholder="https://minio.example.com:9000" class="input input-bordered" />
                <label class="label">
                  <span class="label-text-alt">Full URL including protocol and port</span>
                </label>
              </div>
            {/if}
          </div>
          
          {#if addLocationForm.serviceType === 'compatible'}
            <div class="form-control mb-4">
              <label class="label cursor-pointer">
                <input type="checkbox" bind:checked={addLocationForm.useSSL} class="checkbox checkbox-primary" />
                <span class="label-text ml-2">Use SSL/HTTPS</span>
              </label>
              <div class="label">
                <span class="label-text-alt">Enable if your S3-compatible service uses HTTPS</span>
              </div>
            </div>
          {/if}
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="edit-access-key">
                <span class="label-text">Access Key ID</span>
              </label>
              <input type="text" id="edit-access-key" bind:value={addLocationForm.accessKeyId} placeholder="AKIAIOSFODNN7EXAMPLE" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="edit-secret-key">
                <span class="label-text">Secret Access Key</span>
              </label>
              <input type="password" id="edit-secret-key" bind:value={addLocationForm.secretAccessKey} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" class="input input-bordered" />
            </div>
          </div>
          
          <!-- Test Connection Button -->
          <div class="form-control mb-4">
            <button 
              type="button" 
              class="btn btn-outline btn-primary" 
              on:click={testS3ConnectionFromForm}
              disabled={isTestingConnection}
            >
              {#if isTestingConnection}
                <span class="loading loading-spinner loading-xs"></span>
                Testing Connection...
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              {/if}
            </button>
            {#if connectionTestResult}
              <div class="alert {connectionTestResult.success ? 'alert-success' : 'alert-error'} mt-2">
                <span>{connectionTestResult.message}</span>
              </div>
            {/if}
          </div>
          
          <div class="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Make sure your credentials have the necessary permissions to read and write to the specified bucket.</span>
          </div>
        {/if}
        
        <div class="modal-action">
          <button class="btn btn-ghost" on:click={() => { showEditLocationModal = false; resetForm(); }}>Cancel</button>
          <button class="btn btn-primary" on:click={handleEditStorageSubmit}>
            Update Storage Location
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
