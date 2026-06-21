<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_LABELS } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { formatDate } from '$lib/utils';
  import type { EntityType } from '$lib/types';
  import { ArrowLeft, Trash2, RotateCcw, AlertTriangle } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  function goToEntity(item: any) {
    if (item.entityType === 'image') {
      goto(`/projects/${$page.params.id}/images/${item.entityId}`);
    } else {
      const route = entityTypeToRoute(item.entityType);
      goto(`/projects/${$page.params.id}/${route}/${item.entityId}`);
    }
  }
</script>

<svelte:head>
  <title>Trash — {$page.data?.project?.name || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}"
      class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to {$page.data?.project?.name || 'Project'}
    </a>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Trash</h1>
        <p class="text-sm text-muted-foreground">
          Deleted entities are stored here for 30 days before automatic permanent deletion.
        </p>
      </div>
      {#if ($page.data?.items || []).length > 0}
        <form method="POST" action="?/emptyTrash" use:enhance>
          <Button type="submit" variant="destructive">
            <Trash2 class="h-4 w-4" />
            Empty Trash
          </Button>
        </form>
      {/if}
    </div>
  </div>

  {#if ($page.data?.items || []).length === 0}
    <div class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Trash2 class="h-12 w-12 opacity-30" />
      <p class="text-sm">Trash is empty</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each $page.data.items as item}
        <div class="rounded-lg border border-border bg-card p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <button
                  class="truncate text-left font-medium hover:underline"
                  onclick={() => goToEntity(item)}
                >
                  {item.name}
                </button>
                <Badge variant="secondary">
                  {item.entityType === 'image'
                    ? 'Image'
                    : ENTITY_LABELS[item.entityType as EntityType] || item.entityType}
                </Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                Deleted {formatDate(item.deletedAt)}
                {#if item.expiresAt}
                  &middot; Expires {formatDate(item.expiresAt)}
                {/if}
              </p>
              {#if item.kind === 'image'}
                <p class="mt-2 text-xs text-muted-foreground">
                  {item.metadata?.originalName || ''} &middot; {item.metadata?.mimeType || ''}
                  {#if item.metadata?.size}
                    &middot; {Math.round(item.metadata.size / 1024)} KB
                  {/if}
                </p>
              {:else if item.body}
                <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {item.body.slice(0, 200)}
                </p>
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-2 ml-4">
              <form
                method="POST"
                action="?/restore"
                use:enhance={() => {
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      goto(window.location.href);
                    }
                  };
                }}
              >
                <input type="hidden" name="trashId" value={item.id} />
                <Button type="submit" size="sm">
                  <RotateCcw class="h-3 w-3" />
                  Restore
                </Button>
              </form>
              <form
                method="POST"
                action="?/permanentDelete"
                use:enhance={() => {
                  return async ({ result }) => {
                    if (result.type === 'success') {
                      goto(window.location.href);
                    }
                  };
                }}
              >
                <input type="hidden" name="trashId" value={item.id} />
                <Button type="submit" variant="outline" size="sm">
                  <AlertTriangle class="h-3 w-3" />
                  Delete Forever
                </Button>
              </form>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
