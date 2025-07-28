<script>
  /**
   * A loading overlay component that can be customized for different areas
   * 
   * @param {boolean} isLoading - Whether the loading state is active
   * @param {string} [size="lg"] - Size of the loading spinner (xs, sm, md, lg, xl)
   * @param {string} [color="primary"] - Color of the spinner (primary, secondary, accent, etc.)
   * @param {string} [text="Loading..."] - Text to display below the spinner
   * @param {string} [backgroundColor="rgba(0, 0, 0, 0.5)"] - Background color of the overlay
   * @param {string} [position="fixed"] - CSS position (fixed covers the entire viewport, absolute covers the relative parent)
   * @param {number} [zIndex=50] - z-index of the overlay
   */
  export let isLoading = false;
  export let size = "lg";
  export let color = "primary";
  export let text = "Loading...";
  export let backgroundColor = "rgba(0, 0, 0, 0.5)";
  export let position = "fixed";
  export let zIndex = 50;
</script>

{#if isLoading}
  <div 
    class="loading-overlay flex flex-col items-center justify-center" 
    style="position: {position}; top: 0; left: 0; right: 0; bottom: 0; background-color: {backgroundColor}; z-index: {zIndex};"
  >
    <span class="loading loading-{size} loading-{color}"></span>
    {#if text}
      <p class="mt-4 text-white font-medium">{text}</p>
    {/if}
    <slot name="content"></slot>
  </div>
{/if}

<style>
  .loading-overlay {
    pointer-events: all;
    user-select: none;
  }
</style>