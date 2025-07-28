<script>
  import toast from "svelte-french-toast";
  import axios from "axios";

  let storage = {
    name: "",
    provider: "s3",
    endpoint: "",
    bucket: "",
    region: "",
    accessKey: "",
    secretKey: "",
    prefix: "",
  };

  function create() {
    console.log(storage);
    axios
      .post("/api/storages", storage)
      .then((response) => {
        toast.success("Storage created successfully");
        window.location.href = "/storage";
      })
      .catch((error) => {
        toast.error("Failed to create storage");
      });
  }

  function connect() {
    console.log(storage);
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
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Provider</span>
          </label>
          <select class="select select-bordered w-full">
            <option value="s3" disabled selected>S3</option>
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
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Prefix</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            bind:value={storage.prefix}
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Region</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            bind:value={storage.region}
          />
        </div>
        <div class="form-control mt-6">
          <div class="flex justify-end space-x-2">
            <button class="btn btn-primary" on:click={connect}
              >Test Connection</button
            >
            <button class="btn btn-primary" on:click={create}>Submit</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
