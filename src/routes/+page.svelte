<script>
  import { onMount } from "svelte";
  onMount(() => {});
</script>

<div class="hero">
  <div class="flex-col hero-content lg:flex-row-reverse">
    <img
      alt="hero"
      src="https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp"
      class="max-w-sm rounded-lg shadow-2xl"
    />
    <div>
      <h1 class="text-5xl font-bold">BIDS Bridge</h1>
      <p class="py-6">
        Manage work in the cloud, storage and pipeline secure execution on trusted workloads.
      </p>
      <button class="btn btn-primary" on:click={() => window.location.href = '/dataset'}>Get Started</button>
      <button class="btn btn-primary" on:click={() => window.location.href = 'mailto:kevinpan45@163.com'}>Contact</button>
    </div>
  </div>
</div>
