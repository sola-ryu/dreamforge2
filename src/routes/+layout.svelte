<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { getTheme } from '$lib/stores/theme.svelte';
  const theme = getTheme();
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import ZenMode from '$lib/components/ZenMode.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import * as SidebarUI from '$lib/components/ui/sidebar/index.js';

  const zen = getZenMode();

  let { children } = $props();

  let hasSidebar = $derived(!!page.data?.user && !zen.active);

  $effect(() => {
    document.documentElement.className = theme.value === 'dark' ? 'dark' : '';
  });
</script>

<ZenMode />
<div class="flex h-screen overflow-hidden" class:zen-mode={zen.active}>
  {#if hasSidebar}
    <SidebarUI.Provider>
      <Sidebar />
      <main
        class="flex-1 overflow-auto"
        style={zen.active && zen.backgroundImage
          ? `background-image: url(${zen.backgroundImage}); background-size: cover; background-position: center; background-attachment: fixed;`
          : ''}
      >
        {@render children()}
      </main>
    </SidebarUI.Provider>
  {:else}
    <main
      class="flex-1 overflow-auto"
      style={zen.active && zen.backgroundImage
        ? `background-image: url(${zen.backgroundImage}); background-size: cover; background-position: center; background-attachment: fixed;`
        : ''}
    >
      {@render children()}
    </main>
  {/if}
</div>
