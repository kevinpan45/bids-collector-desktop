<script>
  import { page } from "$app/stores";
  import Icon from "$component/icon/Icon.svelte";
  import Navbar from "$component/Navbar.svelte";
  import Sidebar from "$component/Sidebar.svelte";
  import axios from "axios";
  import { onMount } from "svelte";
  import { Toaster } from "svelte-french-toast";
  import "../app.css";
  
  let layoutMounted = false;
  let collapsed = false;

  axios.defaults.baseURL = import.meta.env.VITE_API_SERVER || 'http://localhost:8080';

  onMount(async () => {
    layoutMounted = true;
    collapsed = sessionStorage.getItem("sidebar-collapsed") === "true";
    console.log('BIDS Collector started in local-first mode');
  });

  $: innerWidth = undefined;

  const onClickSideBarCollapse = () => {
    sessionStorage.setItem("sidebar-collapsed", !collapsed);
    collapsed = !collapsed;
  };
</script>

<svelte:window bind:innerWidth />

<Toaster />

<div class="md:h-screen">
  <div class="bg-base-100 drawer lg:drawer-open h-full overflow-hidden">
    <div class={`${collapsed ? "ml-20" : ""} drawer-content overflow-auto`}>
      {#if layoutMounted}
        <Navbar showSearch={false} />
      {/if}

      <div class={"max-w-[100vw] px-6 pb-16 xl:pr-2"}>
        {#if layoutMounted}
          <slot />
        {/if}
      </div>
    </div>
    <!-- Sidebar -->
    {#if layoutMounted}
      <div
        class={`${collapsed ? "!w-20 pr-60 -mr-60 isCollapse" : "shadow-2xl"} z-40 sider-bar overflow-hidden h-screen !pointer-events-none`}
        style="scroll-behavior: smooth;"
      >
        <label for="drawer" class="drawer-overlay" aria-label="Close menu" />
        <aside
          class={`${collapsed ? "!w-20 shadow-2xl" : "w-80"} transition-width duration-75 ease-in-out bg-base-100 min-h-screen pointer-events-auto`}
        >
          <svelte:component this={Sidebar} {collapsed} />
          <div
            class="bg-base-100 pointer-events-none sticky bottom-0 flex h-40 [mask-image:linear-gradient(transparent,#000000)]"
          />
        </aside>
        <button
          class={`${collapsed ? "w-20" : "w-80"} btn btn-neutral pointer-events-auto fixed bottom-0`}
          on:click={onClickSideBarCollapse}
        >
          <Icon
            icon={`${collapsed ? "heroicons:chevron-right" : "heroicons:chevron-left"}`}
            class="size-6"
          />
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .sider-bar {
    pointer-events: auto;
    visibility: visible;
    position: sticky;
    display: block;
    width: auto;
    overscroll-behavior: auto;
    overflow-y: auto;
  }

  .sider-bar > aside {
    transform: translateX(0%) !important;
  }

  .drawer-side > *:not(.drawer-overlay) {
    transform: none !important;
  }

  .sider-bar.isCollapse {
    scrollbar-width: none;
  }

  .sider-bar.isCollapse::-webkit-scrollbar {
    display: none;
  }
</style>
