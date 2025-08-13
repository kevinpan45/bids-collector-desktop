<script>
  import SidebarMenuItem from "$component/SidebarMenuItem.svelte";
  import { getMenus } from "$lib/menu";

  export let closeDrawer;
  export let collapsed;

  let menus = getMenus();
  
  $: switchNavbarStyle = false; // simplified for Electron app
</script>

<div
  data-sveltekit-preload-data
  class={`bg-base-100 sticky top-0 z-20 items-center gap-2 bg-opacity-90 px-4 py-2 backdrop-blur lg:flex ${switchNavbarStyle ? "shadow-sm" : ""}`}
>
  <a
    href="/"
    aria-current="page"
    aria-label="Homepage"
    class="flex-0 btn btn-ghost px-2"
  >
    <div class="avatar">
      <div class="w-8 rounded">
        <img src="/favicon.svg" alt="BIDS Collector" />
      </div>
    </div>
    <div
      class={`font-title inline-flex text-lg md:text-2xl ${collapsed ? "!hidden" : ""}`}
    >
      BIDS Collector
    </div>
  </a>
</div>

<div class="h-4" />

<ul class="menu px-4 py-0">
  {#each menus as { name, href, icon, badge, badgeclass, highlightAnotherItem, deprecated, items, target, highlight, link, enabled, alias }}
    {#if enabled}
      <SidebarMenuItem
        {closeDrawer}
        name={alias}
        href={href || link}
        {icon}
        {badge}
        {badgeclass}
        {highlightAnotherItem}
        {deprecated}
        {items}
        {highlight}
        {target}
        {collapsed}
      />
    {/if}
  {/each}
</ul>
