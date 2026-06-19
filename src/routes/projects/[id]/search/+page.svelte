<script lang="ts">
  import { page } from '$app/stores';
  import { FileText, Search as SearchIcon } from 'lucide-svelte';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { cn, formatDate } from '$lib/utils';

  let query = $state($page.data?.query || '');
  let timer: ReturnType<typeof setTimeout>;
  let searching = $state(false);

  function doSearch() {
    searching = true;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.location.href = url.toString();
  }

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 500);
  }
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Search</h1>
    <p class="text-sm text-muted-foreground">{$page.data?.projectName || 'Project'}</p>
  </div>

  <div class="relative mb-6">
    <SearchIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      type="search"
      placeholder="Search across all entities..."
      bind:value={query}
      oninput={onInput}
      class="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2.5 text-sm"
    />
  </div>

  <div class="space-y-2">
    {#if $page.data?.query && $page.data?.results?.length === 0}
      <p class="py-12 text-center text-muted-foreground">No results for &ldquo;{$page.data.query}&rdquo;</p>
    {/if}

    {#each ($page.data?.results || []) as entity}
      <a
        href="/projects/{$page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-secondary/50"
      >
        <FileText class="h-5 w-5 text-muted-foreground" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium">{entity.name}</span>
            <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{entity.type}</span>
            {#each (entity.tags || []) as tag}
              <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
            {/each}
          </div>
          <p class="text-xs text-muted-foreground">Modified {formatDate(entity.modifiedAt)}</p>
        </div>
      </a>
    {/each}
  </div>
</div>
