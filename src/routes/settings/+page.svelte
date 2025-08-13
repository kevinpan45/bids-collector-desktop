<script>
  import { onMount } from 'svelte';
  import toast from 'svelte-french-toast';
  import { 
    loadSettings, 
    saveSettings, 
    resetSettings, 
    exportSettings, 
    importSettings,
    validateHttpProxySettings,
    validateHttpsProxySettings,
    testHttpProxyConnection,
    testHttpsProxyConnection,
    DEFAULT_SETTINGS 
  } from '$lib/settings.js';
  
  let settings = { ...DEFAULT_SETTINGS };
  let loading = true;
  let saving = false;
  let testing = false;
  let showAdvanced = false;
  let showImportExport = false;
  
  // Form validation
  let httpProxyErrors = [];
  let httpsProxyErrors = [];
  let httpProxyValid = true;
  let httpsProxyValid = true;
  
  // Import/Export
  let importText = '';
  let showImportModal = false;
  let showExportModal = false;
  
  onMount(() => {
    loadSettingsData();
  });
  
  function loadSettingsData() {
    try {
      settings = loadSettings();
      loading = false;
      console.log('Settings loaded:', settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
      loading = false;
    }
  }
  
  async function handleSave() {
    if (!validateForm()) {
      return;
    }
    
    try {
      saving = true;
      const success = saveSettings(settings);
      
      if (success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      saving = false;
    }
  }
  
  function validateForm() {
    const httpValidation = validateHttpProxySettings(settings.httpProxy);
    httpProxyErrors = httpValidation.errors;
    httpProxyValid = httpValidation.success;
    
    const httpsValidation = validateHttpsProxySettings(settings.httpsProxy);
    httpsProxyErrors = httpsValidation.errors;
    httpsProxyValid = httpsValidation.success;
    
    if (!httpProxyValid || !httpsProxyValid) {
      toast.error('Please fix validation errors before saving');
      return false;
    }
    
    return true;
  }
  
  async function handleTestHttpProxy() {
    if (!validateHttpProxySettings(settings.httpProxy).success) {
      toast.error('Please fix HTTP proxy settings before testing');
      return;
    }
    
    try {
      testing = true;
      toast.success('Testing HTTP proxy connection...');
      
      const success = await testHttpProxyConnection(settings.httpProxy);
      
      if (success) {
        toast.success('HTTP proxy connection successful');
      } else {
        toast.error('HTTP proxy connection failed');
      }
    } catch (error) {
      console.error('HTTP proxy test error:', error);
      toast.error('HTTP proxy test failed');
    } finally {
      testing = false;
    }
  }
  
  async function handleTestHttpsProxy() {
    if (!validateHttpsProxySettings(settings.httpsProxy).success) {
      toast.error('Please fix HTTPS proxy settings before testing');
      return;
    }
    
    try {
      testing = true;
      toast.success('Testing HTTPS proxy connection...');
      
      const success = await testHttpsProxyConnection(settings.httpsProxy);
      
      if (success) {
        toast.success('HTTPS proxy connection successful');
      } else {
        toast.error('HTTPS proxy connection failed');
      }
    } catch (error) {
      console.error('HTTPS proxy test error:', error);
      toast.error('HTTPS proxy test failed');
    } finally {
      testing = false;
    }
  }
  
  function handleReset() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        resetSettings();
        settings = { ...DEFAULT_SETTINGS };
        toast.success('Settings reset to defaults');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        toast.error('Failed to reset settings');
      }
    }
  }
  
  function handleExport() {
    try {
      const exportData = exportSettings();
      navigator.clipboard.writeText(exportData).then(() => {
        toast.success('Settings copied to clipboard');
      }).catch(() => {
        // Fallback: show in modal
        importText = exportData;
        showExportModal = true;
      });
    } catch (error) {
      console.error('Failed to export settings:', error);
      toast.error('Failed to export settings');
    }
  }
  
  function handleImport() {
    if (!importText.trim()) {
      toast.error('Please enter settings data to import');
      return;
    }
    
    try {
      const success = importSettings(importText);
      
      if (success) {
        settings = loadSettings();
        toast.success('Settings imported successfully');
        showImportModal = false;
        importText = '';
      } else {
        toast.error('Failed to import settings - invalid format');
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      toast.error('Failed to import settings');
    }
  }
</script>

<svelte:head>
  <title>Settings - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">Settings</h1>
    <p class="text-base-content/60">Configure application settings, proxy, and S3 access</p>
  </div>

  {#if loading}
    <!-- Loading State -->
    <div class="flex justify-center items-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- Settings Form -->
    <div class="space-y-6">
      <!-- Proxy Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
            </svg>
            Proxy Settings
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            Configure HTTP and HTTPS proxies independently for S3 access. Useful for users in China or behind corporate firewalls.
          </p>
          
          <!-- HTTP Proxy Section -->
          <div class="collapse collapse-arrow bg-base-200 mb-4">
            <input type="checkbox" checked />
            <div class="collapse-title text-lg font-medium">
              HTTP Proxy Configuration
            </div>
            <div class="collapse-content">
              <!-- Enable HTTP Proxy -->
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">Enable HTTP Proxy</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    bind:checked={settings.httpProxy.enabled}
                  />
                </label>
              </div>
              
              {#if settings.httpProxy.enabled}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <!-- HTTP Proxy Host -->
                  <div class="form-control">
                    <label class="label" for="http-proxy-host">
                      <span class="label-text">Proxy Host</span>
                    </label>
                    <input 
                      id="http-proxy-host"
                      type="text" 
                      class="input input-bordered" 
                      placeholder="proxy.example.com"
                      bind:value={settings.httpProxy.host}
                    />
                  </div>
                  
                  <!-- HTTP Proxy Port -->
                  <div class="form-control">
                    <label class="label" for="http-proxy-port">
                      <span class="label-text">Proxy Port</span>
                    </label>
                    <input 
                      id="http-proxy-port"
                      type="number" 
                      class="input input-bordered" 
                      placeholder="8080"
                      min="1" 
                      max="65535"
                      bind:value={settings.httpProxy.port}
                    />
                  </div>
                  
                  <!-- HTTP Proxy Username -->
                  <div class="form-control">
                    <label class="label" for="http-proxy-username">
                      <span class="label-text">Username (Optional)</span>
                    </label>
                    <input 
                      id="http-proxy-username"
                      type="text" 
                      class="input input-bordered" 
                      placeholder="username"
                      bind:value={settings.httpProxy.username}
                    />
                  </div>
                  
                  <!-- HTTP Proxy Password -->
                  <div class="form-control">
                    <label class="label" for="http-proxy-password">
                      <span class="label-text">Password (Optional)</span>
                    </label>
                    <input 
                      id="http-proxy-password"
                      type="password" 
                      class="input input-bordered" 
                      placeholder="password"
                      bind:value={settings.httpProxy.password}
                    />
                  </div>
                  
                  <!-- HTTP Bypass Local -->
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">Bypass proxy for local addresses</span>
                      <input 
                        type="checkbox" 
                        class="toggle toggle-primary" 
                        bind:checked={settings.httpProxy.bypassLocal}
                      />
                    </label>
                  </div>
                </div>
                
                <!-- HTTP Validation Errors -->
                {#if !httpProxyValid && httpProxyErrors.length > 0}
                  <div class="alert alert-error mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      {#each httpProxyErrors as error}
                        <div>{error}</div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Test HTTP Proxy Button -->
                <div class="mt-4">
                  <button 
                    class="btn btn-outline btn-sm"
                    class:loading={testing}
                    disabled={testing || !httpProxyValid}
                    on:click={handleTestHttpProxy}
                  >
                    {#if testing}
                      Testing...
                    {:else}
                      Test HTTP Proxy Connection
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>

          <!-- HTTPS Proxy Section -->
          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" checked />
            <div class="collapse-title text-lg font-medium">
              HTTPS Proxy Configuration
            </div>
            <div class="collapse-content">
              <!-- Enable HTTPS Proxy -->
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">Enable HTTPS Proxy</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    bind:checked={settings.httpsProxy.enabled}
                  />
                </label>
              </div>
              
              {#if settings.httpsProxy.enabled}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <!-- HTTPS Proxy Host -->
                  <div class="form-control">
                    <label class="label" for="https-proxy-host">
                      <span class="label-text">Proxy Host</span>
                    </label>
                    <input 
                      id="https-proxy-host"
                      type="text" 
                      class="input input-bordered" 
                      placeholder="proxy.example.com"
                      bind:value={settings.httpsProxy.host}
                    />
                  </div>
                  
                  <!-- HTTPS Proxy Port -->
                  <div class="form-control">
                    <label class="label" for="https-proxy-port">
                      <span class="label-text">Proxy Port</span>
                    </label>
                    <input 
                      id="https-proxy-port"
                      type="number" 
                      class="input input-bordered" 
                      placeholder="8080"
                      min="1" 
                      max="65535"
                      bind:value={settings.httpsProxy.port}
                    />
                  </div>
                  
                  <!-- HTTPS Proxy Username -->
                  <div class="form-control">
                    <label class="label" for="https-proxy-username">
                      <span class="label-text">Username (Optional)</span>
                    </label>
                    <input 
                      id="https-proxy-username"
                      type="text" 
                      class="input input-bordered" 
                      placeholder="username"
                      bind:value={settings.httpsProxy.username}
                    />
                  </div>
                  
                  <!-- HTTPS Proxy Password -->
                  <div class="form-control">
                    <label class="label" for="https-proxy-password">
                      <span class="label-text">Password (Optional)</span>
                    </label>
                    <input 
                      id="https-proxy-password"
                      type="password" 
                      class="input input-bordered" 
                      placeholder="password"
                      bind:value={settings.httpsProxy.password}
                    />
                  </div>
                  
                  <!-- HTTPS Bypass Local -->
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">Bypass proxy for local addresses</span>
                      <input 
                        type="checkbox" 
                        class="toggle toggle-primary" 
                        bind:checked={settings.httpsProxy.bypassLocal}
                      />
                    </label>
                  </div>
                  
                  <!-- HTTPS SSL Validation -->
                  <div class="form-control">
                    <label class="label cursor-pointer">
                      <span class="label-text">Validate SSL certificates</span>
                      <input 
                        type="checkbox" 
                        class="toggle toggle-primary" 
                        bind:checked={settings.httpsProxy.validateSSL}
                      />
                    </label>
                  </div>
                </div>
                
                <!-- HTTPS Validation Errors -->
                {#if !httpsProxyValid && httpsProxyErrors.length > 0}
                  <div class="alert alert-error mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      {#each httpsProxyErrors as error}
                        <div>{error}</div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Test HTTPS Proxy Button -->
                <div class="mt-4">
                  <button 
                    class="btn btn-outline btn-sm"
                    class:loading={testing}
                    disabled={testing || !httpsProxyValid}
                    on:click={handleTestHttpsProxy}
                  >
                    {#if testing}
                      Testing...
                    {:else}
                      Test HTTPS Proxy Connection
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
      
      <!-- S3 Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            S3 & Download Settings
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- S3 Region -->
            <div class="form-control">
              <label class="label" for="s3-region">
                <span class="label-text">S3 Region</span>
              </label>
              <input 
                id="s3-region"
                type="text" 
                class="input input-bordered" 
                placeholder="us-east-1"
                bind:value={settings.s3.region}
              />
            </div>
            
            <!-- Request Timeout -->
            <div class="form-control">
              <label class="label" for="s3-timeout">
                <span class="label-text">Request Timeout (ms)</span>
              </label>
              <input 
                id="s3-timeout"
                type="number" 
                class="input input-bordered" 
                placeholder="30000"
                min="5000" 
                max="300000"
                bind:value={settings.s3.timeout}
              />
            </div>
            
            <!-- Retry Attempts -->
            <div class="form-control">
              <label class="label" for="s3-retries">
                <span class="label-text">Retry Attempts</span>
              </label>
              <input 
                id="s3-retries"
                type="number" 
                class="input input-bordered" 
                placeholder="3"
                min="0" 
                max="10"
                bind:value={settings.s3.retryAttempts}
              />
            </div>
            
            <!-- Max Concurrent Downloads -->
            <div class="form-control">
              <label class="label" for="download-concurrent">
                <span class="label-text">Max Concurrent Downloads</span>
              </label>
              <input 
                id="download-concurrent"
                type="number" 
                class="input input-bordered" 
                placeholder="3"
                min="1" 
                max="10"
                bind:value={settings.download.maxConcurrentDownloads}
              />
            </div>
          </div>
          
          <!-- Advanced S3 Settings -->
          <div class="mt-4">
            <button 
              class="btn btn-ghost btn-sm"
              on:click={() => showAdvanced = !showAdvanced}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" class:rotate-180={showAdvanced} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {#if showAdvanced}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-base-200 rounded-lg">
              <!-- Custom S3 Endpoint -->
              <div class="form-control md:col-span-2">
                <label class="label" for="s3-endpoint">
                  <span class="label-text">Custom S3 Endpoint (Optional)</span>
                </label>
                <input 
                  id="s3-endpoint"
                  type="url" 
                  class="input input-bordered" 
                  placeholder="https://s3.amazonaws.com"
                  bind:value={settings.s3.endpoint}
                />
                <label class="label">
                  <span class="label-text-alt">For S3-compatible services like MinIO</span>
                </label>
              </div>
              
              <!-- Force Path Style -->
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">Force Path Style URLs</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    bind:checked={settings.s3.forcePathStyle}
                  />
                </label>
                <label class="label">
                  <span class="label-text-alt">Use path-style URLs instead of virtual-hosted-style</span>
                </label>
              </div>
              
              <!-- Verify Checksum -->
              <div class="form-control">
                <label class="label cursor-pointer">
                  <span class="label-text">Verify File Checksums</span>
                  <input 
                    type="checkbox" 
                    class="toggle toggle-primary" 
                    bind:checked={settings.download.verifyChecksum}
                  />
                </label>
                <label class="label">
                  <span class="label-text-alt">Verify file integrity after download</span>
                </label>
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- UI Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            User Interface
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Theme -->
            <div class="form-control">
              <label class="label" for="ui-theme">
                <span class="label-text">Theme</span>
              </label>
              <select 
                id="ui-theme"
                class="select select-bordered" 
                bind:value={settings.ui.theme}
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            <!-- Language -->
            <div class="form-control">
              <label class="label" for="ui-language">
                <span class="label-text">Language</span>
              </label>
              <select 
                id="ui-language"
                class="select select-bordered" 
                bind:value={settings.ui.language}
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            
            <!-- Date Format -->
            <div class="form-control">
              <label class="label" for="ui-date-format">
                <span class="label-text">Date Format</span>
              </label>
              <select 
                id="ui-date-format"
                class="select select-bordered" 
                bind:value={settings.ui.dateFormat}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              </select>
            </div>
            
            <!-- Time Format -->
            <div class="form-control">
              <label class="label" for="ui-time-format">
                <span class="label-text">Time Format</span>
              </label>
              <select 
                id="ui-time-format"
                class="select select-bordered" 
                bind:value={settings.ui.timeFormat}
              >
                <option value="24h">24 Hour</option>
                <option value="12h">12 Hour</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Privacy Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Privacy & Data
          </h2>
          
          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">Enable Analytics</span>
                <input 
                  type="checkbox" 
                  class="toggle toggle-primary" 
                  bind:checked={settings.privacy.analytics}
                />
              </label>
              <label class="label">
                <span class="label-text-alt">Help improve the app by sharing anonymous usage data</span>
              </label>
            </div>
            
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">Crash Reporting</span>
                <input 
                  type="checkbox" 
                  class="toggle toggle-primary" 
                  bind:checked={settings.privacy.crashReporting}
                />
              </label>
              <label class="label">
                <span class="label-text-alt">Automatically send crash reports to help fix bugs</span>
              </label>
            </div>
            
            <div class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text">Usage Statistics</span>
                <input 
                  type="checkbox" 
                  class="toggle toggle-primary" 
                  bind:checked={settings.privacy.usageStatistics}
                />
              </label>
              <label class="label">
                <span class="label-text-alt">Share feature usage statistics to improve the app</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Actions
          </h2>
          
          <div class="flex flex-wrap gap-4">
            <!-- Save Settings -->
            <button 
              class="btn btn-primary"
              class:loading={saving}
              disabled={saving || !httpProxyValid || !httpsProxyValid}
              on:click={handleSave}
            >
              {#if saving}
                Saving...
              {:else}
                Save Settings
              {/if}
            </button>
            
            <!-- Import/Export -->
            <button 
              class="btn btn-outline"
              on:click={handleExport}
            >
              Export Settings
            </button>
            
            <button 
              class="btn btn-outline"
              on:click={() => showImportModal = true}
            >
              Import Settings
            </button>
            
            <!-- Reset to Defaults -->
            <button 
              class="btn btn-outline btn-warning"
              on:click={handleReset}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Import Modal -->
{#if showImportModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Import Settings</h3>
      <p class="py-4">Paste your exported settings JSON below:</p>
      
      <textarea 
        class="textarea textarea-bordered w-full h-40" 
        placeholder="Paste settings JSON here..."
        bind:value={importText}
      ></textarea>
      
      <div class="modal-action">
        <button class="btn btn-primary" on:click={handleImport}>Import</button>
        <button class="btn" on:click={() => showImportModal = false}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Export Settings</h3>
      <p class="py-4">Copy the settings data below:</p>
      
      <textarea 
        class="textarea textarea-bordered w-full h-40" 
        readonly
        bind:value={importText}
      ></textarea>
      
      <div class="modal-action">
        <button class="btn btn-primary" on:click={() => navigator.clipboard.writeText(importText)}>
          Copy to Clipboard
        </button>
        <button class="btn" on:click={() => showExportModal = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
