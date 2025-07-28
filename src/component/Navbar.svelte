<script>
  import UserIcon from "$component/UserMenu.svelte";
  
  export let showSearch = false; // Disabled for Electron app initially
  export let username = "";
  export let scrollY;
  
  $: switchNavbarStyle = scrollY > 40 ? true : false;

  export let login = () => {};
  export let handleLogout = () => {};
</script>

<svelte:window bind:scrollY />
<div
  class={`
  bg-base-100 text-base-content sticky top-0 z-30 flex h-16 w-full justify-center bg-opacity-90 backdrop-blur transition-shadow duration-100 [transform:translate3d(0,0,0)] 
  ${switchNavbarStyle ? "shadow-sm" : ""}
  `}
>
  <nav class="navbar w-full">
    <div class="flex flex-1 md:gap-1 lg:gap-2">
      <slot />

      {#if showSearch}
        <div class="hidden w-full max-w-sm lg:flex">
          <!-- Search component would go here if enabled -->
        </div>
      {/if}
    </div>
    {#if username}
      <div class="flex-0">
        <UserIcon bind:username logout={handleLogout} />
      </div>
    {:else}
      <div class="flex-0">
        <button class="btn btn-ghost" on:click={login}>Login</button>
      </div>
    {/if}
  </nav>
</div>
