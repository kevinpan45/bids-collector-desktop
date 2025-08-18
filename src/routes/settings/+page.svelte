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

      <!-- Contact & Support -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact & Support
          </h2>
          <p class="text-sm text-base-content/60 mb-6">
            Get help, report issues, or provide feedback about BIDS Collector.
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Feedback & Support -->
            <div class="space-y-4">
              <h3 class="font-semibold text-lg">Feedback & Support</h3>
              
              <div class="space-y-3">
                <!-- Email Contact -->
                <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  <div class="avatar placeholder">
                    <div class="bg-primary text-primary-content rounded-full w-10">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="font-medium">Email Support</div>
                    <div class="text-sm text-base-content/60">
                      <a 
                        href="mailto:kevinpan45@163.com?subject=BIDS Collector Feedback&body=Please describe your feedback or issue:"
                        class="link link-primary"
                      >
                        kevinpan45@163.com
                      </a>
                    </div>
                  </div>
                  <button 
                    class="btn btn-sm btn-outline"
                    on:click={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText('kevinpan45@163.com');
                        toast.success('Email copied to clipboard');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>

                <!-- GitHub Issues -->
                <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                  <div class="avatar placeholder">
                    <div class="bg-neutral text-neutral-content rounded-full w-10">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="font-medium">Report Issues</div>
                    <div class="text-sm text-base-content/60">
                      <a 
                        href="https://github.com/kevinpan45/bids-collector-desktop/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="link link-primary"
                      >
                        GitHub Issues
                      </a>
                    </div>
                  </div>
                  <button 
                    class="btn btn-sm btn-outline"
                    on:click={() => {
                      if (typeof window !== 'undefined') {
                        window.open('https://github.com/kevinpan45/bids-collector-desktop/issues/new', '_blank');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open
                  </button>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="space-y-4">
              <h3 class="font-semibold text-lg">Quick Actions</h3>
              
              <div class="space-y-3">
                <!-- Send Feedback Email -->
                <button 
                  class="btn btn-primary w-full justify-start"
                  on:click={() => {
                    const subject = encodeURIComponent('BIDS Collector Feedback');
                    const body = encodeURIComponent(`Hello BIDS Collector Team,

I would like to provide feedback about:

[Please describe your feedback, suggestions, or feature requests here]

Application Version: ${import.meta.env.VITE_APP_VERSION || '0.1.0'}
Platform: ${typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'}

Thank you!`);
                    const mailtoUrl = `mailto:kevinpan45@163.com?subject=${subject}&body=${body}`;
                    
                    if (typeof window !== 'undefined') {
                      window.open(mailtoUrl);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Send Feedback
                </button>

                <!-- Report Bug -->
                <button 
                  class="btn btn-outline w-full justify-start"
                  on:click={() => {
                    const subject = encodeURIComponent('BIDS Collector Bug Report');
                    const body = encodeURIComponent(`Hello BIDS Collector Team,

I encountered a bug with the following details:

**Bug Description:**
[Please describe what happened]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Application Version:** ${import.meta.env.VITE_APP_VERSION || '0.1.0'}
**Platform:** ${typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'}

Thank you for your help!`);
                    const mailtoUrl = `mailto:kevinpan45@163.com?subject=${subject}&body=${body}`;
                    
                    if (typeof window !== 'undefined') {
                      window.open(mailtoUrl);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Report Bug
                </button>

                <!-- Feature Request -->
                <button 
                  class="btn btn-outline w-full justify-start"
                  on:click={() => {
                    const subject = encodeURIComponent('BIDS Collector Feature Request');
                    const body = encodeURIComponent(`Hello BIDS Collector Team,

I would like to request a new feature:

**Feature Description:**
[Please describe the feature you'd like to see]

**Use Case:**
[How would this feature help you or other users?]

**Additional Context:**
[Any additional information or mockups]

**Application Version:** ${import.meta.env.VITE_APP_VERSION || '0.1.0'}

Thank you for considering this request!`);
                    const mailtoUrl = `mailto:kevinpan45@163.com?subject=${subject}&body=${body}`;
                    
                    if (typeof window !== 'undefined') {
                      window.open(mailtoUrl);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Request Feature
                </button>
              </div>
            </div>
          </div>

          <!-- Contact Note -->
          <div class="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
            <div class="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-sm">
                <p class="font-medium text-info mb-1">We value your feedback!</p>
                <p class="text-base-content/70">
                  Your input helps us improve BIDS Collector. Whether it's a bug report, feature request, or general feedback, 
                  we appreciate hearing from our users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
