<!-- This file has been deprecated. Please use the new route `/storage/[id]` for storage updates. -->

<script>
  import toast from "svelte-french-toast";
  import axios from "axios";

  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let storage = {};

  // Credential modal state
  let showCredentialModal = false;
  let credentials = {
    accessKey: "",
    secretKey: "",
  };

  let id = $page.params.id;

  onMount(() => {
    axios
      .get(`/api/storages/${id}`)
      .then((response) => {
        storage = response.data;
      })
      .catch((error) => {
        toast.error("Failed to fetch storage details");
      });
  });

  function update() {
    axios
      .put(`/api/storages/${id}`, storage)
      .then((response) => {
        toast.success("Storage created successfully");
        // hide modal
        showCredentialModal = false;
      })
      .catch((error) => {
        toast.error("Failed to create storage");
      });
  }

  function updateCredential() {
    showCredentialModal = true;
  }

  function submitCredentials() {
    if (!credentials.accessKey || !credentials.secretKey) {
      toast.error("Please fill in both access key and secret key");
      return;
    }

    const credentialData = {
      accessKey: credentials.accessKey,
      secretKey: credentials.secretKey,
    };

    axios
      .put(`/api/storages/${storage.id}/credentials`, credentialData)
      .then((response) => {
        toast.success("Credentials updated successfully");
        showCredentialModal = false;
        // Clear the credential fields for security
        credentials = {
          accessKey: "",
          secretKey: "",
        };
      })
      .catch((error) => {
        toast.error("Failed to update credentials");
      });
  }

  function closeCredentialModal() {
    showCredentialModal = false;
    // Clear the credential fields when closing
    credentials = {
      accessKey: "",
      secretKey: "",
    };
  }
</script>

<div class="min-h-screen hero">
  <div class="flex-col w-2/3 hero-content lg:flex-row-reverse">
    <div class="w-full shadow-2xl card bg-base-200 shrink-0">
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
          <input
            type="text"
            class="input input-bordered"
            required
            bind:value={storage.provider}
          />
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
        <div class="mt-6 form-control">
          <div class="flex justify-end space-x-2">
            <button class="btn btn-primary" on:click={updateCredential}
              >Update Credential</button
            >
            <button class="btn btn-primary" on:click={update}>Submit</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

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
