<script lang="ts">
  import { page } from '$app/stores';
  import { toggleTheme } from '$lib/stores/theme.svelte';
  import { Home, BookMarked, SunMoon, LogOut, Download, Search, Clock } from 'lucide-svelte';
</script>

<aside class="flex w-64 flex-col border-r border-border bg-card">
  <div class="flex items-center gap-2 border-b border-border px-4 py-3">
    <span class="text-lg font-bold">DreamForge</span>
  </div>

  <nav class="flex-1 space-y-1 overflow-y-auto p-2">
    <a
      href="/projects"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      class:bg-secondary={$page.url.pathname === '/projects'}
    >
      <Home class="h-4 w-4" />
      Projects
    </a>

    {#if $page.params?.id}
      <div class="mt-4 mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
        Current Project
      </div>

      <a
        href="/projects/{$page.params.id}"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      >
        Dashboard
      </a>

      <a
        href="/projects/{$page.params.id}/stories"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      >
        Stories
      </a>

      <a
        href="/projects/{$page.params.id}/timelines"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      >
        <Clock class="h-4 w-4" />
        Timelines
      </a>

      <a
        href="/projects/{$page.params.id}/relations"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      >
        Relations
      </a>

      <a
        href="/projects/{$page.params.id}/search"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      >
        <Search class="h-4 w-4" />
        Search
      </a>

      {#if $page.data?.bookmarks?.length > 0}
        <div class="mt-4 mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
          <div class="flex items-center gap-2">
            <BookMarked class="h-3 w-3" />
            Bookmarks
          </div>
        </div>
        {#each $page.data.bookmarks as bm}
          <a
            href="/projects/{$page.params.id}/{bm.entityType}s/{bm.entityId}"
            class="flex items-center gap-3 rounded-lg px-3 py-1.5 pl-6 text-sm hover:bg-secondary"
          >
            <span class="truncate">{bm.entityName || bm.entityId}</span>
          </a>
        {/each}
      {/if}
    {/if}
  </nav>

  <div class="border-t border-border p-2 space-y-1">
    {#if $page.params?.id}
      <a
        href="/projects/{$page.params.id}/export"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
        target="_blank"
      >
        <Download class="h-4 w-4" />
        Export Project
      </a>
    {/if}
    <button
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
      onclick={toggleTheme}
    >
      <SunMoon class="h-4 w-4" />
      Toggle Theme
    </button>
    <a
      href="/logout"
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
    >
      <LogOut class="h-4 w-4" />
      Log Out
    </a>
  </div>
</aside>
