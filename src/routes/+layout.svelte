<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();
</script>

<div
  class="flex h-screen overflow-hidden"
  class:dark={$theme === 'dark' || ($theme === undefined && $page.data?.theme === 'dark')}
>
  {#if $page.data?.user}
    <Sidebar />
  {/if}
  <main class="flex-1 overflow-auto">
    {@render children()}
  </main>
</div>
