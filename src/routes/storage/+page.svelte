<script>
  import { onMount } from "svelte";
  import toast from "svelte-french-toast";

  let storages = [];

  onMount(async () => {
    try {
      const config = await window.electronAPI.getStorageConfig();
      storages = config.storages || [];
    } catch (error) {
      console.error('Error loading storage config:', error);
      toast.error('Failed to load storage configurations');
    }
  });

  async function deleteStorage(storage) {
    if (!confirm(`Are you sure you want to delete storage "${storage.name}"?`)) {
      return;
    }

    try {
      const success = await window.electronAPI.deleteStorage(storage.id);
      if (success) {
        storages = storages.filter(s => s.id !== storage.id);
        toast.success(`Storage "${storage.name}" deleted successfully`);
      } else {
        toast.error('Failed to delete storage');
      }
    } catch (error) {
      console.error('Error deleting storage:', error);
      toast.error('Failed to delete storage');
    }
  }

  function load(storage) {
    // 这个功能需要根据具体需求来实现
    toast.success(`Storage ${storage.name} is loaded.`);
  }

  function getStorageTypeDisplay(storage) {
    if (storage.type === 'local') {
      return 'Local Disk';
    }
    return storage.provider || 'S3';
  }

  function getStorageLocationDisplay(storage) {
    if (storage.type === 'local') {
      return storage.localPath || '-';
    }
    return storage.endpoint || '-';
  }
</script>

<div class="mb-4">
  <a class="btn btn-primary btn-sm" href="/storage/create">Create Storage</a>
</div>

<div class="overflow-x-auto">
  <table class="table w-full">
    <thead>
      <tr>
        <th>Name</th>
        <th>Type</th>
        <th>Location/Endpoint</th>
        <th>Bucket/Path</th>
        <th>Region</th>
        <th>Prefix</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each storages as storage}
        <tr>
          <td>
            <a href="/storage/{storage.id}" class="link link-primary font-medium">
              {storage.name}
            </a>
          </td>
          <td>
            <span class="badge badge-outline">
              {getStorageTypeDisplay(storage)}
            </span>
          </td>
          <td class="max-w-xs truncate" title={getStorageLocationDisplay(storage)}>
            {getStorageLocationDisplay(storage)}
          </td>
          <td>
            {#if storage.type === 'local'}
              <span class="text-gray-500">-</span>
            {:else}
              {storage.bucket || '-'}
            {/if}
          </td>
          <td>{storage.region || '-'}</td>
          <td>{storage.prefix || '-'}</td>
          <td>
            <div class="flex space-x-2">
              <button 
                class="btn btn-primary btn-xs" 
                on:click={() => load(storage)}
              >
                Load
              </button>
              <button 
                class="btn btn-error btn-xs" 
                on:click={() => deleteStorage(storage)}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      {:else}
        <tr>
          <td colspan="7" class="text-center text-gray-500 py-8">
            No storage configurations found. <a href="/storage/create" class="link link-primary">Create one</a> to get started.
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
