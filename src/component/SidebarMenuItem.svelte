<script>
  import Icon from "$component/icon/Icon.svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import SidebarMenuItem from "$component/SidebarMenuItem.svelte";
  
  export let closeDrawer;
  export let name = null,
    href = null,
    icon = null,
    badge = null,
    badgeclass = null,
    highlightAnotherItem = null,
    deprecated = null,
    items = null,
    highlight = null,
    target = null,
    collapsed = null;

  const sanitize = (name) => {
    return name.toLowerCase().replace(/\W/g, "-");
  };
  
  $: getDisclosureState = (name, items) => {
    // open the disclosure if the user has opened it before
    if (
      browser &&
      localStorage.getItem(`disclosure-${sanitize(name)}`) === "open"
    ) {
      return "open";
    }
    // open the disclosure if the current page is a child of the disclosure
    if (
      items.some((item) => item.href === $page.url.pathname) ||
      items.some((item) =>
        item.items?.some((subitem) => subitem.href === $page.url.pathname)
      )
    ) {
      return "open";
    }

    return null;
  };
  
  const saveDisclosureState = (id, value) => {
    if (browser) {
      localStorage.setItem(id, value);
    }
  };
</script>

{#if name}
  <span
    class={`${collapsed && !items ? "tooltip tooltip-right before:text-xs before:content-[attr(data-tip)] w-full" : ""}`}
    data-tip={name}
  >
    <li class="w-full">
      {#if items}
        {#if collapsed}
          <div class="dropdown dropdown-right dropdown-hover group">
            <div tabIndex={0} class="">
              {#if icon}
                <Icon
                  class="group-hover:text-primary transition-colors h-5 w-5"
                  {icon}
                  useStaticSVG
                />
              {/if}
            </div>
            <ul
              tabIndex={0}
              class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box collapse-ul"
            >
              {#each items as { name, href, items, link, enabled, alias }}
                {#if enabled}
                  <li><a href={href || link}>{name || alias}</a></li>
                {/if}
              {/each}
            </ul>
          </div>
        {:else}
          <details
            id={`disclosure-${sanitize(name)}`}
            open={getDisclosureState(name, items)}
            on:toggle={(el) =>
              saveDisclosureState(
                el.target.id,
                el.target.open ? "open" : "close"
              )}
          >
            <summary class="group">
              {#if icon}
                <Icon
                  class="group-hover:text-primary transition-colors h-5 w-5"
                  {icon}
                  useStaticSVG
                />
              {/if}
              {name}
            </summary>
            <ul>
              {#each items as { name, href, icon, badge, badgeclass, highlightAnotherItem, deprecated, items, highlight, link, enabled, alias }}
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
                    {highlight}
                    {items}
                  />
                {/if}
              {/each}
            </ul>
          </details>
        {/if}
      {/if}
      {#if !items && href}
        <a
          {href}
          target={target === "blank" ? "_blank" : undefined}
          rel={target === "blank" ? "noopener noreferrer" : undefined}
          on:click={closeDrawer}
          class={`btn-animation group ${$page.url.pathname === href ? "active" : ""} ${
            $page.url.pathname === highlightAnotherItem ? "active" : ""
          }  ${$page.url.pathname.startsWith(href) && href !== "/" ? "active" : ""} ${
            highlight
              ? "from-primary to-primary/0 hover:to-primary/10 from-[-200%] to-60% [background-image:linear-gradient(-35deg,var(--tw-gradient-stops))]"
              : ""
          }`}
        >
          {#if icon}
            <Icon
              class="group-hover:text-primary transition-colors h-5 w-5"
              {icon}
              useStaticSVG
            />
          {/if}
          {#if collapsed}
            <!-- Left menu collapsed -->
          {:else}
            <span class={deprecated ? "line-through" : undefined}>
              {@html name}
            </span>
            {#if badge}
              <span
                class={`badge badge-sm font-mono text-opacity-70 ${badgeclass && badgeclass}`}
              >
                {badge}
              </span>
            {/if}
          {/if}
        </a>
      {/if}
    </li>
  </span>
{:else if !items}
  <li />
{/if}

<style>
  .tooltip:before {
    left: calc(100% + 10px + var(--tooltip-tail, 0px));
  }
  .tooltip:after {
    left: calc(100% + 4px + var(--tooltip-tail, 0px));
  }

  .collapse-ul {
    margin-left: 0;
  }
  .collapse-ul::before {
    content: unset;
  }
</style>
