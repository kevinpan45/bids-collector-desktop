<script>
  import { onMount, tick } from 'svelte';
  import { saveConfig, loadConfig } from '$lib/storage.js';
  import { createS3Client, testS3Connection } from '$lib/s3Client.js';
  
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
  let modalKey = 0; // Key to force modal re-render
  let addLocationForm = {
    type: 'local', // 'local' or 's3-compatible'
    name: '',
    path: '',
    // S3-compatible fields
    bucketName: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: ''
  };
  
  // Notification state
  let notification = {
    show: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    message: ''
  };
  
  let nextLocationId = 1;

  // S3 connection testing state
  let isTestingConnection = false;
  let connectionTestResult = null;
  
  // Security state
  let showSecurityWarning = false;
  let securityWarning = "Your credentials are stored locally on your device. Never share your access keys with anyone and use minimal required permissions.";
  let showCredentials = false; // Toggle for showing/hiding credentials
  
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
      // Don't show notification for config loading failures - it's handled with fallbacks
      console.log('Using default storage configuration due to loading error');
      
      // Initialize with defaults if config loading fails completely
      storageLocations = [];
      nextLocationId = 1;
      storageData = {
        total: '10 GB',
        used: '4.85 GB',
        available: '5.15 GB',
        usedPercentage: 48.5
      };
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
      // Only show notification for save failures if it's a critical error
      // Most save operations will fall back to localStorage automatically
      console.log('Storage configuration may have been saved to browser storage as fallback');
    }
  }
  
  // Check if local storage already exists
  function hasLocalStorage() {
    return storageLocations.some(location => location.type === 'local');
  }
  
  // Validate form for local storage only
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
    } else if (addLocationForm.type === 's3-compatible') {
      if (!addLocationForm.bucketName.trim()) {
        showNotification('error', 'Please enter a bucket name.');
        return false;
      }
      if (!addLocationForm.endpoint.trim()) {
        showNotification('error', 'Please enter an endpoint URL.');
        return false;
      }
      if (!addLocationForm.accessKeyId.trim()) {
        showNotification('error', 'Please enter an access key ID.');
        return false;
      }
      if (!addLocationForm.secretAccessKey.trim()) {
        showNotification('error', 'Please enter a secret access key.');
        return false;
      }
    }
    
    return true;
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
      endpoint: ''
    };
    editingLocationId = null;
    connectionTestResult = null;
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
    } else if (addLocationForm.type === 's3-compatible') {
      newLocation.path = `s3://${addLocationForm.bucketName}`;
      newLocation.bucketName = addLocationForm.bucketName;
      newLocation.region = addLocationForm.region;
      newLocation.accessKeyId = addLocationForm.accessKeyId;
      newLocation.secretAccessKey = addLocationForm.secretAccessKey;
      newLocation.endpoint = addLocationForm.endpoint;
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
    } else if (addLocationForm.type === 's3-compatible') {
      updatedLocation.path = `s3://${addLocationForm.bucketName}`;
      updatedLocation.bucketName = addLocationForm.bucketName;
      updatedLocation.region = addLocationForm.region;
      updatedLocation.accessKeyId = addLocationForm.accessKeyId;
      updatedLocation.secretAccessKey = addLocationForm.secretAccessKey;
      updatedLocation.endpoint = addLocationForm.endpoint;
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
  async function handleConfigureLocation(locationId) {
    const locationToEdit = storageLocations.find(loc => loc.id === locationId);
    if (locationToEdit) {
      editingLocationId = locationId;
      
      // Reset connection test result
      connectionTestResult = null;
      
      // Populate form with existing data - use explicit assignment to ensure reactivity
      addLocationForm.type = locationToEdit.type;
      addLocationForm.name = locationToEdit.name;
      addLocationForm.path = locationToEdit.path || '';
      addLocationForm.bucketName = locationToEdit.bucketName || '';
      addLocationForm.region = locationToEdit.region || 'us-east-1';
      addLocationForm.accessKeyId = locationToEdit.accessKeyId || '';
      addLocationForm.secretAccessKey = locationToEdit.secretAccessKey || '';
      addLocationForm.endpoint = locationToEdit.endpoint || '';
      
      // Force reactivity update
      addLocationForm = { ...addLocationForm };
      
      // Debug log to verify the type is being set correctly
      console.log('Configuring location:', locationToEdit);
      console.log('Form type set to:', addLocationForm.type);
      
      // Wait for Svelte to update the DOM before showing modal
      await tick();
      
      // Increment modal key to force re-render
      modalKey++;
      
      showEditLocationModal = true;
    }
  }
  
  function getStorageTypeIcon(type) {
    switch(type) {
      case 'local':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 's3-compatible':
        return 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }
  
  function getStorageTypeDisplay(location) {
    if (location.type === 's3-compatible') {
      return 'S3-Compatible';
    }
    return location.type;
  }
  
  // Test S3-compatible connection
  async function testS3ConnectionFromForm() {
    if (!addLocationForm.bucketName || !addLocationForm.endpoint || !addLocationForm.accessKeyId || !addLocationForm.secretAccessKey) {
      showNotification('error', 'Please fill in all S3-compatible service fields before testing connection.');
      return;
    }
    
    isTestingConnection = true;
    connectionTestResult = null;
    
    try {
      const result = await testS3Connection({
        bucketName: addLocationForm.bucketName,
        endpoint: addLocationForm.endpoint,
        region: addLocationForm.region,
        accessKeyId: addLocationForm.accessKeyId,
        secretAccessKey: addLocationForm.secretAccessKey
      });
      
      connectionTestResult = result;
      
      if (result.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result.message);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      connectionTestResult = {
        success: false,
        message: 'Connection test failed due to an unexpected error.'
      };
      showNotification('error', 'Connection test failed due to an unexpected error.');
    } finally {
      isTestingConnection = false;
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
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Storage Type</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors border-2 {addLocationForm.type === 'local' ? 'border-primary bg-primary/10' : 'border-transparent'}">
              <div class="card-body flex-row items-center gap-3">
                <input type="radio" bind:group={addLocationForm.type} value="local" class="radio radio-primary" />
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div class="font-medium">Local Machine</div>
                    <div class="text-xs text-base-content/70">Store data on your computer</div>
                  </div>
                </div>
              </div>
            </label>
            
            <label class="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors border-2 {addLocationForm.type === 's3-compatible' ? 'border-primary bg-primary/10' : 'border-transparent'}">
              <div class="card-body flex-row items-center gap-3">
                <input type="radio" bind:group={addLocationForm.type} value="s3-compatible" class="radio radio-primary" />
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <div>
                    <div class="font-medium">S3-Compatible</div>
                    <div class="text-xs text-base-content/70">MinIO, AWS S3, etc.</div>
                  </div>
                </div>
              </div>
            </label>
          </div>
          {#if addLocationForm.type === 'local' && hasLocalStorage()}
            <div class="alert alert-warning mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm">Only one local machine storage location is allowed.</span>
            </div>
          {/if}
        </div>        <!-- Common Fields -->
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
        {:else if addLocationForm.type === 's3-compatible'}
          <!-- S3-Compatible Storage Fields -->
          <div class="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 class="font-bold">Security Notice</h4>
              <div class="text-sm">Your credentials are stored locally on your device. Never share your access keys with anyone and use minimal required permissions.</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="bucket-name">
                <span class="label-text">Bucket Name</span>
              </label>
              <input type="text" id="bucket-name" bind:value={addLocationForm.bucketName} placeholder="my-bids-bucket" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="region">
                <span class="label-text">Region</span>
              </label>
              <input type="text" id="region" bind:value={addLocationForm.region} placeholder="us-east-1" class="input input-bordered" />
              <label class="label">
                <span class="label-text-alt">Region for S3-compatible service (e.g., us-east-1)</span>
              </label>
            </div>
          </div>
          
          <div class="form-control mb-4">
            <label class="label" for="endpoint">
              <span class="label-text">Endpoint URL</span>
            </label>
            <input type="text" id="endpoint" bind:value={addLocationForm.endpoint} placeholder="https://minio.example.com:9000" class="input input-bordered" />
            <label class="label">
              <span class="label-text-alt">Full URL including protocol and port</span>
            </label>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="access-key">
                <span class="label-text">Access Key ID</span>
              </label>
              <input type="text" id="access-key" bind:value={addLocationForm.accessKeyId} placeholder="" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="secret-key">
                <span class="label-text">Secret Access Key</span>
              </label>
              <input type="password" id="secret-key" bind:value={addLocationForm.secretAccessKey} placeholder="" class="input input-bordered" />
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
              {#if !connectionTestResult.success}
                <div class="alert alert-info mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h4 class="font-bold">Troubleshooting Tips:</h4>
                    <ul class="text-sm mt-1 space-y-1">
                      <li>• Verify your access key ID and secret access key are correct</li>
                      <li>• Ensure the bucket exists and your credentials have access to it</li>
                      <li>• Check that the endpoint URL includes the correct protocol (http:// or https://)</li>
                      <li>• For MinIO, the default port is usually 9000 (e.g., http://192.168.1.100:9000)</li>
                    </ul>
                  </div>
                </div>
              {/if}
            {/if}
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
    {#key modalKey}
    <div class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Configure Storage Location</h3>
        
        <!-- Storage Type Selection -->
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Storage Type</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors border-2 {addLocationForm.type === 'local' ? 'border-primary bg-primary/10' : 'border-transparent'}">
              <div class="card-body flex-row items-center gap-3">
                <input type="radio" bind:group={addLocationForm.type} value="local" class="radio radio-primary" />
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div class="font-medium">Local Machine</div>
                    <div class="text-xs text-base-content/70">Store data on your computer</div>
                  </div>
                </div>
              </div>
            </label>
            
            <label class="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors border-2 {addLocationForm.type === 's3-compatible' ? 'border-primary bg-primary/10' : 'border-transparent'}">
              <div class="card-body flex-row items-center gap-3">
                <input type="radio" bind:group={addLocationForm.type} value="s3-compatible" class="radio radio-primary" />
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <div>
                    <div class="font-medium">S3-Compatible</div>
                    <div class="text-xs text-base-content/70">MinIO, AWS S3, etc.</div>
                  </div>
                </div>
              </div>
            </label>
          </div>
          {#if addLocationForm.type === 'local' && hasLocalStorage() && editingLocationId !== storageLocations.find(loc => loc.type === 'local')?.id}
            <div class="alert alert-warning mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm">Only one local machine storage location is allowed.</span>
            </div>
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
        {:else if addLocationForm.type === 's3-compatible'}
          <!-- S3-Compatible Storage Fields -->
          <div class="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 class="font-bold">Security Notice</h4>
              <div class="text-sm">Your credentials are stored locally on your device. Never share your access keys with anyone and use minimal required permissions.</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="edit-bucket-name">
                <span class="label-text">Bucket Name</span>
              </label>
              <input type="text" id="edit-bucket-name" bind:value={addLocationForm.bucketName} placeholder="my-bids-bucket" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="edit-region">
                <span class="label-text">Region</span>
              </label>
              <input type="text" id="edit-region" bind:value={addLocationForm.region} placeholder="us-east-1" class="input input-bordered" />
              <label class="label">
                <span class="label-text-alt">Region for S3-compatible service (e.g., us-east-1)</span>
              </label>
            </div>
          </div>
          
          <div class="form-control mb-4">
            <label class="label" for="edit-endpoint">
              <span class="label-text">Endpoint URL</span>
            </label>
            <input type="text" id="edit-endpoint" bind:value={addLocationForm.endpoint} placeholder="https://minio.example.com:9000" class="input input-bordered" />
            <label class="label">
              <span class="label-text-alt">Full URL including protocol and port</span>
            </label>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="form-control">
              <label class="label" for="edit-access-key">
                <span class="label-text">Access Key ID</span>
              </label>
              <input type="text" id="edit-access-key" bind:value={addLocationForm.accessKeyId} placeholder="" class="input input-bordered" />
            </div>
            <div class="form-control">
              <label class="label" for="edit-secret-key">
                <span class="label-text">Secret Access Key</span>
              </label>
              <input type="password" id="edit-secret-key" bind:value={addLocationForm.secretAccessKey} placeholder="" class="input input-bordered" />
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
              {#if !connectionTestResult.success}
                <div class="alert alert-info mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h4 class="font-bold">Troubleshooting Tips:</h4>
                    <ul class="text-sm mt-1 space-y-1">
                      <li>• Verify your access key ID and secret access key are correct</li>
                      <li>• Ensure the bucket exists and your credentials have access to it</li>
                      <li>• Check that the endpoint URL includes the correct protocol (http:// or https://)</li>
                      <li>• For MinIO, the default port is usually 9000 (e.g., http://192.168.1.100:9000)</li>
                    </ul>
                  </div>
                </div>
              {/if}
            {/if}
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
    {/key}
  {/if}
</div>
