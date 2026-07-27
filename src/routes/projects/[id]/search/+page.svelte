<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { FileText, Search as SearchIcon } from '@lucide/svelte';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { formatDate } from '$lib/utils';
  import { Badge } from '$lib/components/ui/badge';

  let query = $state(page.data?.query || '');
  let timer: ReturnType<typeof setTimeout>;
  let searching = $state(false);

  // The load's query results replace page.data once navigation resolves, which
  // marks the end of the in-flight search regardless of how it was triggered.
  $effect(() => {
    void page.data?.query;
    searching = false;
  });

  async function doSearch() {
    searching = true;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    await goto(url.toString());
  }

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 500);
  }
</script>

<svelte:head>
  <title>Search — {page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Search</h1>
    <p class="text-sm text-muted-foreground">{page.data?.projectName || 'Project'}</p>
  </div>

  <div class="relative mb-6">
    <SearchIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      type="search"
      placeholder="Search across all entities..."
      bind:value={query}
      oninput={onInput}
      class="w-full rounded-lg border border-input bg-background pl-9 pr-16 py-2.5 text-sm"
    />
    {#if searching}
      <span
        class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        Searching…
      </span>
    {/if}
  </div>

  <div class="space-y-2">
    {#if page.data?.query && page.data?.results?.length === 0}
      <p class="py-12 text-center text-muted-foreground">
        No results for &ldquo;{page.data.query}&rdquo;
      </p>
    {/if}

    {#each page.data?.results || [] as entity (entity.id)}
      <a
        href="/projects/{page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-secondary/50"
      >
        <FileText class="h-5 w-5 text-muted-foreground" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium">{entity.name}</span>
            <Badge variant="secondary">{entity.type}</Badge>
            {#if entity.matchedIn === 'body'}
              <Badge variant="outline">content match</Badge>
            {:else if entity.matchedIn === 'field'}
              <Badge variant="outline">field match</Badge>
            {/if}
            {#each entity.tags || [] as tag (tag)}
              <Badge variant="secondary">{tag}</Badge>
            {/each}
          </div>
          {#if entity.snippet}
            <p class="mt-1 truncate text-sm text-muted-foreground">{entity.snippet}</p>
          {/if}
          <p class="text-xs text-muted-foreground">Modified {formatDate(entity.modifiedAt)}</p>
        </div>
      </a>
    {/each}
  </div>
</div>
