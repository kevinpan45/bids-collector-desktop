<script>
  export let logout = () => {};
  export let username;
</script>

<div class="hidden md:block">
  <div class="ml-4 flex items-center md:ml-6">
    <!-- Profile dropdown -->
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost">
        <span>{username}</span>
        <span class="badge badge-xs badge-success"></span>
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <ul
        tabindex="0"
        class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
      >
        <li><a href="/profile">Profile</a></li>
        <li><button on:click={logout}>Logout</button></li>
      </ul>
    </div>
  </div>
</div>
