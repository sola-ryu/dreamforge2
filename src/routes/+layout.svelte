<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { getTheme } from '$lib/stores/theme.svelte';
  const theme = getTheme();
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import ZenMode from '$lib/components/ZenMode.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';

  const zen = getZenMode();

  let { children } = $props();
</script>

<ZenMode />
<div
  class="flex h-screen overflow-hidden"
  class:dark={theme === 'dark'}
  class:monochrome={theme === 'monochrome'}
  class:zen-mode={zen.active}
>
  {#if $page.data?.user && !zen.active}
    <Sidebar />
  {/if}
  <main
    class="flex-1 overflow-auto"
    style={zen.active && zen.backgroundImage
      ? `background-image: url(${zen.backgroundImage}); background-size: cover; background-position: center; background-attachment: fixed;`
      : ''}
  >
    {@render children()}
  </main>
</div>
