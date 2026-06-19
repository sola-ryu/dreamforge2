<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { ENTITY_LABELS, ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { cn, formatDate } from '$lib/utils';
  import { Plus, Search, MoreHorizontal, FileText, Edit, Trash2 } from 'lucide-svelte';

  let showCreate = $state(false);
  let newName = $state('');
  let searchQuery = $state('');
  let showMenu = $state<string | null>(null);
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">
        {$page.data?.entityType ? ENTITY_PLURAL[$page.data.entityType] : 'Entities'}
      </h1>
      <p class="text-sm text-muted-foreground">
        {$page.data?.projectName || 'Project'}
      </p>
    </div>
    <button
      class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      onclick={() => (showCreate = !showCreate)}
    >
      <Plus class="h-4 w-4" />
      New {$page.data?.entityType ? ENTITY_LABELS[$page.data.entityType] : ''}
    </button>
  </div>

  {#if showCreate}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === 'success') {
              showCreate = false;
              newName = '';
            }
          };
        }}
        class="space-y-4"
      >
        <div>
          <label for="name" class="block text-sm font-medium">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            bind:value={newName}
            class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="Enter name..."
          />
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create
          </button>
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => (showCreate = false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="mb-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        placeholder="Search..."
        bind:value={searchQuery}
        oninput={() => {
          const q = searchQuery;
          const url = new URL(window.location.href);
          if (q) url.searchParams.set('q', q);
          else url.searchParams.delete('q');
          window.history.replaceState({}, '', url.toString());
        }}
        class="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm"
      />
    </div>
  </div>

  <div class="space-y-2">
    {#if ($page.data?.entities || []).length === 0}
      <p class="py-12 text-center text-muted-foreground">
        No {$page.data?.entityType ? ENTITY_PLURAL[$page.data.entityType].toLowerCase() : 'entities'} yet.
        Create one to get started.
      </p>
    {/if}

    {#each ($page.data?.entities || []) as entity}
      <div class="group relative rounded-lg border border-border bg-card hover:bg-secondary/50">
        <a
          href="/projects/{$page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
          class="flex items-center gap-4 px-4 py-3"
        >
        <div
          class={cn(
            'flex-shrink-0 rounded-full border p-2',
            entity.status === 'complete' && 'border-green-500/30',
            entity.status === 'wip' && 'border-yellow-500/30',
            entity.status === 'draft' && 'border-muted-foreground/30'
          )}
        >
            <FileText class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium truncate">{entity.name}</span>
              {#if entity.tags?.length}
                {#each entity.tags.slice(0, 3) as tag}
                  <span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                {/each}
                {#if entity.tags.length > 3}
                  <span class="text-xs text-muted-foreground">+{entity.tags.length - 3}</span>
                {/if}
              {/if}
            </div>
            <p class="text-xs text-muted-foreground">
              Modified {formatDate(entity.modifiedAt)}
              {#if entity.status === 'complete'}
                <span class="text-green-500">&#9679; Complete</span>
              {:else if entity.status === 'wip'}
                <span class="text-yellow-500">&#9679; WIP</span>
              {:else}
                <span class="text-muted-foreground">&#9679; Draft</span>
              {/if}
            </p>
          </div>
        </a>
        <div class="absolute right-2 top-1/2 -translate-y-1/2">
          <button
            class="rounded p-1.5 opacity-0 group-hover:opacity-100 hover:bg-secondary"
            onclick={(e) => {
              e.preventDefault();
              showMenu = showMenu === entity.id ? null : entity.id;
            }}
          >
            <MoreHorizontal class="h-4 w-4" />
          </button>
          {#if showMenu === entity.id}
            <div class="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-popover shadow-lg">
              <form method="POST" action="?/delete">
                <input type="hidden" name="entityId" value={entity.id} />
                <button
                  type="submit"
                  class="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                >
                  <Trash2 class="h-4 w-4" />
                  Delete
                </button>
              </form>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
