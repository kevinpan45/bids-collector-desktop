<script>
  import { onMount } from 'svelte';
  
  let mounted = false;
  onMount(() => {
    mounted = true;
    console.log('BIDS Collector started in local-first mode');
  });
</script>

<svelte:head>
  <title>BIDS Collector</title>
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
        <h1 class="text-5xl font-bold">BIDS Collector</h1>
        <p class="py-6">
          Collecting datasets from Brain Imaging Data Structure (BIDS) ecosystem to your local machine or trusted s3 storage service, designed for local-first data management.
        </p>
        
        <div class="alert alert-info mb-4">
          <span>Welcome to your local BIDS workspace!</span>
        </div>
        
        <div class="flex gap-4">
          <a href="/dataset" class="btn btn-primary">Manage Datasets</a>
          <a href="/storage" class="btn btn-secondary">Storage</a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="flex justify-center items-center min-h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{/if}
