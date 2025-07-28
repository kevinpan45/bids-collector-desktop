<script>
  export let page = {
    size: 10,
    total: 0,
    current: 1,
  };

  export let turboJump = 10;

  export let reloadPageTable = () => {};

  function jump(to) {
    if (to <= 0) {
      to = 1;
    }

    let totalPages = Math.ceil(page.total / page.size);

    if (totalPages == 0) {
      totalPages = 1;
    }

    if (to > totalPages) {
      to = totalPages;
    }
    if (page.current == to) {
      return;
    }
    page.current = to;
    reloadPageTable();
  }
</script>

<div class="join">
  <button class="join-item btn" on:click={jump(page.current - turboJump)}
    >««</button
  >
  <button class="join-item btn" on:click={jump(page.current - 1)}>«</button>
  <button class="join-item btn"
    >Page {page.current} / {page.total == 0
      ? 1
      : Math.ceil(page.total / page.size)}</button
  >
  <button class="join-item btn" on:click={jump(page.current + 1)}>»</button>
  <button class="join-item btn" on:click={jump(page.current + turboJump)}
    >»»</button
  >
</div>
