<script>
  import { onMount } from 'svelte';
  import { user, isAuthenticated } from '$lib/auth.js';
  
  let mounted = false;
  onMount(() => {
    mounted = true;
    
    // Console log the current logged user info when load home page
    if (user) {
      console.log('Current logged user info:', user);
    }
  });
</script>

<svelte:head>
  <title>BIDS Collector Desktop</title>
</svelte:head>

{#if mounted}
  <div class="hero">
    <div class="flex-col hero-content lg:flex-row-reverse">
      <img
        alt="BIDS Collector"
        src="/favicon.svg"
        class="max-w-sm rounded-lg shadow-2xl w-64 h-64"
      />
      <div>
        <h1 class="text-5xl font-bold">BIDS Collector Desktop</h1>
        <p class="py-6">
          A modern desktop application for BIDS data collection and management. 
          Built with <a href="https://svelte.dev" target="_blank" class="link">Svelte</a> 
          and <a href="https://daisyui.com" target="_blank" class="link">DaisyUI</a>, 
          with authentication powered by <a href="https://auth0.com" target="_blank" class="link">Auth0</a>.
        </p>
        
        {#if isAuthenticated && user}
          <div class="alert alert-success mb-4">
            <span>Welcome back, {user.name || user.email}!</span>
          </div>
        {/if}
        
        <div class="flex gap-4">
          <a href="/job" class="btn btn-primary">Manage Jobs</a>
          <a href="/profile" class="btn btn-secondary">View Profile</a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="flex justify-center items-center min-h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{/if}
