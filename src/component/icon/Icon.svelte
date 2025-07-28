<script>
  import Icon from "@iconify/svelte";
  export let icon;
  // true: use local svg; false: use icon library
  export let useStaticSVG = false;

  let modules;

  if (useStaticSVG) {
    // https://vitejs.dev/guide/features#glob-import
    modules = import.meta.glob("$lib/svgs/*.svg", {
      query: "?raw",
      import: "default",
    });
  }

  $: {
    if (useStaticSVG && modules && icon) {
      if (!modules[`/src/lib/svgs/${icon}.svg`]) {
        console.error(`/src/lib/svgs/${icon}.svg is not existed`);
      }
    }
  }
</script>

{#if icon}
  {#if useStaticSVG}
    <!-- dynamic imports must be static for the bundler -->
    {#if modules[`/src/lib/svgs/${icon}.svg`]}
      {#await modules[`/src/lib/svgs/${icon}.svg`]() then svg}
        <div class={$$props.class} style={$$props.style}>
          {@html svg}
        </div>
      {/await}
    {/if}
  {:else}
    <Icon class={$$props.class} style={$$props.style} {icon}></Icon>
  {/if}
{/if}
