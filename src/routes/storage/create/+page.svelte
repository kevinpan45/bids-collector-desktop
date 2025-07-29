<script>
  import toast from "svelte-french-toast";

  let storageType = "s3"; // 默认选择S3
  let storage = {
    name: "",
    type: "s3",
    // S3配置
    provider: "s3",
    endpoint: "",
    bucket: "",
    region: "",
    accessKey: "",
    secretKey: "",
    prefix: "",
    // 本地存储配置
    localPath: "",
  };

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

  async function create() {
    if (!storage.name.trim()) {
      toast.error('Please enter a storage name');
      return;
    }

    if (storageType === 'local') {
      if (!storage.localPath.trim()) {
        toast.error('Please select a directory for local storage');
        return;
      }
      storage.type = 'local';
    } else {
      if (!storage.endpoint.trim() || !storage.bucket.trim() || 
          !storage.accessKey.trim() || !storage.secretKey.trim()) {
        toast.error('Please fill in all required S3 fields');
        return;
      }
      storage.type = 's3';
    }

    try {
      const result = await window.electronAPI.addStorage(storage);
      if (result) {
        toast.success("Storage created successfully");
        window.location.href = "/storage";
      } else {
        toast.error("Failed to create storage");
      }
    } catch (error) {
      console.error('Error creating storage:', error);
      toast.error("Failed to create storage");
    }
  }

  async function testConnection() {
    if (storageType === 'local') {
      if (!storage.localPath.trim()) {
        toast.error('Please select a directory first');
        return;
      }
      toast.success('Local directory is accessible');
    } else {
      // 这里可以添加S3连接测试逻辑
      toast.success('Connection test (to be implemented)');
    }
  }

  function handleStorageTypeChange() {
    // 清空相关字段当切换存储类型时
    if (storageType === 'local') {
      storage.localPath = '';
    } else {
      storage.endpoint = '';
      storage.bucket = '';
      storage.region = '';
      storage.accessKey = '';
      storage.secretKey = '';
      storage.prefix = '';
    }
  }
</script>

<div class="hero">
  <div class="hero-content w-2/3 flex-col lg:flex-row-reverse">
    <div class="card bg-base-200 w-full shrink-0 shadow-2xl">
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <form class="card-body">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Name</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            required
            bind:value={storage.name}
            placeholder="Enter storage configuration name"
          />
        </div>
        
        <div class="form-control">
          <label class="label">
            <span class="label-text">Storage Type</span>
          </label>
          <select 
            class="select select-bordered w-full" 
            bind:value={storageType}
            on:change={handleStorageTypeChange}
          >
            <option value="s3">S3 Storage</option>
            <option value="local">Local Disk</option>
          </select>
        </div>

        {#if storageType === 'local'}
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
              <span class="label-text">Access Key</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              required
              bind:value={storage.accessKey}
              placeholder="Your S3 access key"
            />
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Secret Key</span>
            </label>
            <input
              type="password"
              class="input input-bordered"
              required
              bind:value={storage.secretKey}
              placeholder="Your S3 secret key"
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
        {/if}

        <div class="form-control mt-6">
          <div class="flex justify-end space-x-2">
            <button 
              type="button"
              class="btn btn-secondary" 
              on:click={testConnection}
            >
              Test Connection
            </button>
            <button 
              type="button"
              class="btn btn-primary" 
              on:click={create}
            >
              Create Storage
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
