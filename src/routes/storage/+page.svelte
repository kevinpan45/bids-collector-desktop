<script>
  import axios from "axios";
  import { onMount } from "svelte";
  import toast from "svelte-french-toast";

  let storages = [];
  let storage = {};
  onMount(() => {
    axios.get("/api/storages").then((res) => {
      storages = res.data;
    });
  });

  function load(storage) {
    axios.put(`/api/storages/${storage.id}/datasets`).then((res) => {
      toast.success(`Storage ${storage.name} is loaded.`);
    });
  }
</script>

<a class="btn btn-primary btn-sm" href="/storage/create">Create</a>

<table class="table w-full">
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Provider</th>
      <th>Endpoint</th>
      <th>Region</th>
      <th>Bucket</th>
      <th>Prefix</th>
      <th>Ops</th>
    </tr>
  </thead>
  <tbody>
    {#each storages as storage}
      <tr>
        <td>{storage.id}</td>
        <td
          ><a href="/storage/{storage.id}" class="link link-primary"
            >{storage.name}</a
          ></td
        >
        <td>{storage.provider}</td>
        <td>{storage.endpoint}</td>
        <td>{storage.region ?? "-"}</td>
        <td>{storage.bucket}</td>
        <td>{storage.prefix ?? "-"}</td>
        <td>
          <button class="btn btn-primary btn-xs" on:click={load(storage)}
            >Load</button
          >
        </td>
      </tr>
    {/each}
  </tbody>
</table>
