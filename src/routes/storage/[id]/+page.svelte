<!-- This file has been deprecated. Please use the new route `/storage/[id]` for storage updates. -->

<script>
  import toast from "svelte-french-toast";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let storage = {};
  let loading = true;

  // Credential modal state
  let showCredentialModal = false;
  let credentials = {
    accessKey: "",
    secretKey: "",
  };

  let id = $page.params.id;

  onMount(async () => {
    try {
      const config = await window.electronAPI.getStorageConfig();
      const foundStorage = config.storages?.find(s => s.id === id);
      if (foundStorage) {
        storage = { ...foundStorage };
      } else {
        toast.error("Storage configuration not found");
        window.location.href = "/storage";
      }
    } catch (error) {
      console.error('Error loading storage details:', error);
      toast.error("Failed to load storage details");
    }
    loading = false;
  });

  async function selectDirectory() {
    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath) {
        storage.localPath = selectedPath;
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      toast.error('Failed to select directory');
    }
  }

  async function update() {
    if (!storage.name?.trim()) {
      toast.error('Please enter a storage name');
      return;
    }

    if (storage.type === 'local' && !storage.localPath?.trim()) {
      toast.error('Please select a directory for local storage');
      return;
    }

    if (storage.type === 's3') {
      if (!storage.endpoint?.trim() || !storage.bucket?.trim()) {
        toast.error('Please fill in required S3 fields');
        return;
      }
    }

    try {
      const updatedStorage = await window.electronAPI.updateStorage(id, storage);
      if (updatedStorage) {
        toast.success("Storage updated successfully");
        storage = { ...updatedStorage };
      } else {
        toast.error("Failed to update storage");
      }
    } catch (error) {
      console.error('Error updating storage:', error);
      toast.error("Failed to update storage");
    }
  }

  function updateCredential() {
    if (storage.type !== 's3') {
      toast.error('Credentials are only applicable for S3 storage');
      return;
    }
    showCredentialModal = true;
  }

  async function submitCredentials() {
    if (!credentials.accessKey || !credentials.secretKey) {
      toast.error("Please fill in both access key and secret key");
      return;
    }

    // 更新存储配置中的凭证
    const updatedStorage = {
      ...storage,
      accessKey: credentials.accessKey,
      secretKey: credentials.secretKey
    };

    try {
      const result = await window.electronAPI.updateStorage(id, updatedStorage);
      if (result) {
        storage = { ...result };
        toast.success("Credentials updated successfully");
        closeCredentialModal();
      } else {
        toast.error("Failed to update credentials");
      }
    } catch (error) {
      console.error('Error updating credentials:', error);
      toast.error("Failed to update credentials");
    }
  }

  function closeCredentialModal() {
    showCredentialModal = false;
    credentials = {
      accessKey: "",
      secretKey: "",
    };
  }
</script>

{#if loading}
  <div class="hero min-h-screen">
    <div class="hero-content text-center">
      <div class="loading loading-spinner loading-lg"></div>
    </div>
  </div>
{:else}
  <div class="min-h-screen hero">
    <div class="flex-col w-2/3 hero-content lg:flex-row-reverse">
      <div class="w-full shadow-2xl card bg-base-200 shrink-0">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <form class="card-body">
          <div class="mb-4">
            <h2 class="text-2xl font-bold">Edit Storage Configuration</h2>
            <p class="text-gray-600">
              {storage.type === 'local' ? 'Local Disk Storage' : 'S3 Storage'} Configuration
            </p>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              required
              bind:value={storage.name}
              placeholder="Storage configuration name"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Storage Type</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              readonly
              value={storage.type === 'local' ? 'Local Disk' : 'S3 Storage'}
            />
            <label class="label">
              <span class="label-text-alt">
                Storage type cannot be changed after creation
              </span>
            </label>
          </div>

          {#if storage.type === 'local'}
            <!-- 本地存储配置 -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Download Directory</span>
              </label>
              <div class="join">
                <input
                  type="text"
                  class="input input-bordered join-item flex-1"
                  readonly
                  bind:value={storage.localPath}
                  placeholder="Select a directory for downloads"
                />
                <button 
                  type="button"
                  class="btn btn-primary join-item"
                  on:click={selectDirectory}
                >
                  Browse
                </button>
              </div>
            </div>
          {:else}
            <!-- S3存储配置 -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">Provider</span>
              </label>
              <select class="select select-bordered w-full" bind:value={storage.provider}>
                <option value="s3">Amazon S3</option>
                <option value="minio">MinIO</option>
                <option value="other">Other S3 Compatible</option>
              </select>
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">Endpoint</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                required
                bind:value={storage.endpoint}
                placeholder="https://s3.amazonaws.com or custom endpoint"
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">Bucket</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                required
                bind:value={storage.bucket}
                placeholder="S3 bucket name"
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">Prefix (Optional)</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                bind:value={storage.prefix}
                placeholder="Optional path prefix in bucket"
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">Region (Optional)</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                bind:value={storage.region}
                placeholder="AWS region (e.g., us-east-1)"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Credentials Status</span>
              </label>
              <div class="flex items-center space-x-2">
                <span class="badge {storage.accessKey && storage.secretKey ? 'badge-success' : 'badge-warning'}">
                  {storage.accessKey && storage.secretKey ? 'Configured' : 'Not Configured'}
                </span>
                {#if storage.accessKey && storage.secretKey}
                  <span class="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                {/if}
              </div>
            </div>
          {/if}

          <div class="mt-6 form-control">
            <div class="flex justify-end space-x-2">
              <a href="/storage" class="btn btn-ghost">
                Back to List
              </a>
              {#if storage.type === 's3'}
                <button 
                  type="button"
                  class="btn btn-secondary" 
                  on:click={updateCredential}
                >
                  Update Credentials
                </button>
              {/if}
              <button 
                type="button"
                class="btn btn-primary" 
                on:click={update}
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Credential Update Modal -->
{#if showCredentialModal}
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div class="w-full max-w-md p-6 rounded-lg shadow-lg bg-base-100">
      <h3 class="mb-4 text-lg font-bold">Update Storage Credentials</h3>

      <div class="mb-4 form-control">
        <label class="label">
          <span class="label-text">Access Key</span>
        </label>
        <input
          type="text"
          class="w-full input input-bordered"
          placeholder="Enter access key"
          bind:value={credentials.accessKey}
        />
      </div>

      <div class="mb-6 form-control">
        <label class="label">
          <span class="label-text">Secret Key</span>
        </label>
        <input
          type="password"
          class="w-full input input-bordered"
          placeholder="Enter secret key"
          bind:value={credentials.secretKey}
        />
      </div>

      <div class="flex justify-end space-x-2">
        <button class="btn btn-ghost" on:click={closeCredentialModal}>
          Cancel
        </button>
        <button class="btn btn-primary" on:click={submitCredentials}>
          Update
        </button>
      </div>
    </div>
  </div>
{/if}
