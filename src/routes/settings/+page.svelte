<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import toast from 'svelte-french-toast';
  import { 
    loadSettings, 
    saveSettings,
    validateHttpProxySettings,
    validateHttpsProxySettings,
    testHttpProxyConnection,
    testHttpsProxyConnection,
    DEFAULT_SETTINGS 
  } from '$lib/settings.js';
  
  let settings = { ...DEFAULT_SETTINGS };
  let loading = true;
  let testing = false;
  
  // Form validation
  let httpProxyErrors = [];
  let httpsProxyErrors = [];
  let httpProxyValid = true;
  let httpsProxyValid = true;
  
  onMount(() => {
    loadSettingsData();
  });
  
  // Auto-save settings when they change
  $: if (settings && !loading) {
    saveSettings(settings);
  }
  
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
  
  function validateForm() {
    const httpValidation = validateHttpProxySettings(settings.httpProxy);
    httpProxyErrors = httpValidation.errors;
    httpProxyValid = httpValidation.success;
    
    const httpsValidation = validateHttpsProxySettings(settings.httpsProxy);
    httpsProxyErrors = httpsValidation.errors;
    httpsProxyValid = httpsValidation.success;
    
    return httpProxyValid && httpsProxyValid;
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
</script>

<svelte:head>
  <title>Settings - BIDS Collector</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">Settings</h1>
    <p class="text-base-content/60">Configure application settings and proxy configuration</p>
  </div>

  {#if loading}
    <!-- Loading State -->
    <div class="flex justify-center items-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- Settings Form -->
    <div class="space-y-6">
      <!-- API Server Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            API Server Settings
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            Current API server configuration for data collection services.
          </p>
          
          <!-- Server Endpoint -->
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">Server Endpoint</span>
            </label>
            <div class="input input-bordered bg-base-200 text-base-content/70 cursor-not-allowed w-full">
              {axios.defaults.baseURL || 'Not configured'}
            </div>
          </div>
        </div>
      </div>
      
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
      
      <!-- Download Settings -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Download Settings
          </h2>
          <p class="text-sm text-base-content/60 mb-4">
            Configure download behavior and automatic task management.
          </p>
          
          <!-- Auto-start Collection Tasks -->
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">
                <div class="flex flex-col">
                  <span class="font-medium">Auto-start collection tasks</span>
                  <span class="text-sm text-base-content/60">Automatically start downloads when collection tasks are created</span>
                </div>
              </span>
              <input 
                type="checkbox" 
                class="toggle toggle-primary" 
                bind:checked={settings.download.autoStartTasks}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
