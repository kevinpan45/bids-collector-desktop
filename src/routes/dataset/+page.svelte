<script>
  import axios from "axios";
  import { onMount } from "svelte";
  import toast from "svelte-french-toast";
  import Pagination from "$component/Pagination.svelte";
  import LoadingOverlay from "$component/LoadingOverlay.svelte";

  let providers = ["All", "OpenNeuro", "CCNDC"];
  let provider = providers[0];

  // Provider descriptions
  const providerDescriptions = [
    {
      name: "OpenNeuro",
      avatar: "https://openneuro.org/assets/on-dark-DlVjE234.svg",
      description:
        "OpenNeuro is a free and open platform for sharing and analyzing neuroimaging data.",
      link: "https://openneuro.org/",
    },
    {
      name: "CCNDC",
      avatar: "https://www.scidb.cn/static/pageTemPic/o00133/logo.png",
      description:
        "Chinese Color Nest Data Community: Fostering Lifespan Development of Brain-Mind Health",
      link: "https://ccnp.scidb.cn/en",
    },
  ];

  let showDescriptionModal = false;

  let page = {
    size: 10,
    total: 0,
    current: 1,
  };

  let datasets = [];
  let isLoading = false;

  function collectDataset(id) {
    if (!id) {
      toast.error("Dataset ID is required.");
      return;
    }
    isLoading = true;
    axios
      .post(`/api/openneuro/${id}/collections?storageId=1`)
      .then((response) => {
        toast.success(`Dataset is collecting.`);
      })
      .finally(() => {
        isLoading = false;
      });
  }

  function reloadPageTable() {
    isLoading = true;
    axios
      .get("/api/openneuro/bids", {
        params: {
          page: page.current,
          size: page.size,
          provider: provider === "All" ? null : provider,
        },
      })
      .then((res) => {
        page.total = res.data.total;
        let items = res.data.records;
        items.forEach((item) => {
          if (item.provider === "OpenNeuro") {
            if (isDoiFormat(item.doi)) {
              item.link = `https://doi.org/${item.doi}`;
            } else {
              item.link = `https://openneuro.org/datasets/${item.doi}/versions/${item.version}`;
            }
          } else if (item.provider === "CCNDC") {
            item.link = `https://doi.org/${item.doi}`;
          }
        });
        datasets = items;
      })
      .finally(() => {
        isLoading = false;
      });
  }

  function isDoiFormat(doi) {
    // regex is 10\.\d{6}\/[^\s]+
    const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
    return doiRegex.test(doi);
  }

  function handleProviderChange(event) {
    provider = event.target.value;
    page.current = 1;
    reloadPageTable();
  }

  function showProviderDescriptions() {
    showDescriptionModal = true;
  }

  function fetchProviderDatasets(provider) {
    const fetchPromise = axios.post(
      "/api/collections/datasets/tasks?provider=" + provider,
    );

    toast.promise(fetchPromise, {
      loading: `Fetching datasets from ${provider}...`,
      success: `Datasets from ${provider} are being collected.`,
      error: `Failed to fetch datasets from ${provider}.`,
    });

    return fetchPromise;
  }

  onMount(async () => {
    reloadPageTable();
  });
</script>

<div class="relative">
  <div class="flex items-center justify-between mb-4">
    <div class="w-64 form-control">
      <div class="flex items-center space-x-2">
        <select
          class="w-full select select-bordered"
          bind:value={provider}
          on:change={handleProviderChange}
        >
          {#each providers as providerOption}
            <option value={providerOption}>{providerOption}</option>
          {/each}
        </select>
        <button class="btn btn-ghost" on:click={showProviderDescriptions}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="w-4 h-4 stroke-current"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path></svg
          >
        </button>
      </div>
    </div>
  </div>
  <LoadingOverlay {isLoading} text="Loading data..." position="absolute" />
  <table class="table w-full table-compact">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Modality</th>
        <th>Provider</th>
        <th>Participants</th>
        <th>Size</th>
        <th>Operation</th>
      </tr>
    </thead>
    <tbody>
      {#each datasets as dataset}
        <tr>
          <td>
            <a href={dataset.link} target="_blank" class="link link-primary">
              {dataset.doi}
            </a>
          </td>
          <td class="max-w-96 tooltip tooltip-right" data-tip={dataset.name}>
            <p class="truncate ...">{dataset.name}</p>
          </td>
          <td>{dataset.modality}</td>
          <td>OpenNeuro</td>
          <td
            >{dataset.participants === -1
              ? "Unknown"
              : dataset.participants}</td
          >
          <td>
            {#if dataset.size >= 1024 * 1024 * 1024}
              {(dataset.size / (1024 * 1024 * 1024)).toFixed(2)} GB
            {:else}
              {(dataset.size / (1024 * 1024)).toFixed(2)} MB
            {/if}
          </td>
          <td>
            <button
              class="btn btn-primary btn-xs"
              on:click={() => collectDataset(dataset.id)}>Collect</button
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <Pagination {page} {reloadPageTable} />
</div>

<!-- Provider Description Modal -->
{#if showDescriptionModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div class="w-full max-w-6xl p-6 rounded-lg shadow-lg bg-base-100">
      <h3 class="mb-4 text-lg font-bold">Data Provider</h3>
      <ul class="w-full menu bg-base-200 rounded-box">
        <div class="overflow-x-auto">
          <table class="table">
            <tbody>
              {#each providerDescriptions.filter((p) => p !== "All") as providerDescription}
                <tr>
                  <td>
                    <div class="avatar">
                      <div class="w-12 h-12 mask">
                        <img
                          src={providerDescription.avatar}
                          alt="Avatar Tailwind CSS Component"
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    {providerDescription.name}
                  </td>
                  <td>{providerDescription.description}</td>
                  <th>
                    <a
                      class="btn btn-ghost"
                      href={providerDescription.link}
                      target="_blank">WebSite</a
                    >
                  </th>
                  <th>
                    <button
                      class="btn btn-ghost"
                      on:click={() =>
                        fetchProviderDatasets(providerDescription.name)}
                      >Fetch Datasets</button
                    >
                  </th>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </ul>
      <div class="modal-action">
        <button class="btn" on:click={() => (showDescriptionModal = false)}
          >Close</button
        >
      </div>
    </div>
  </div>
{/if}
