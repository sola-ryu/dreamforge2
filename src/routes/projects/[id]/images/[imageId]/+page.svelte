<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Save, Trash2, Link2, Unlink, Image, ExternalLink } from 'lucide-svelte';
  import { ENTITY_LABELS } from '$lib/entityFields';

  let editing = $state(false);
  let caption = $state($page.data?.image?.caption || '');
  let altText = $state($page.data?.image?.altText || '');
  let showLinkPicker = $state(false);
  let selectedEntityId = $state('');

  $effect(() => {
    if ($page.data?.image) {
      caption = $page.data.image.caption || '';
      altText = $page.data.image.altText || '';
    }
  });

  function unlinkedEntities() {
    const all = $page.data?.allEntities || [];
    const linked = new Set($page.data?.linkedIds || []);
    return all.filter((e: any) => !linked.has(e.id));
  }
</script>

<svelte:head>
  <title
    >{$page.data?.image?.originalName || 'Image'} — {$page.data?.project?.name || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}/images"
      class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to Images
    </a>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{$page.data?.image?.originalName || 'Image'}</h1>
      <div class="flex flex-wrap gap-2">
        {#if editing}
          <button
            form="edit-form"
            type="submit"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Save class="h-4 w-4" />
            Save
          </button>
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => (editing = false)}
          >
            Cancel
          </button>
        {:else}
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => (editing = true)}
          >
            Edit Details
          </button>
          <form method="POST" action="?/delete" use:enhance>
            <button
              type="submit"
              class="flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 class="h-4 w-4" />
              Delete
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>

  <div class="mb-6 overflow-hidden rounded-lg border border-border bg-card">
    <img
      src={$page.data?.image?.url || ''}
      alt={$page.data?.image?.altText || $page.data?.image?.originalName || ''}
      class="mx-auto max-h-[70vh] w-full object-contain"
    />
  </div>

  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <form
      id="edit-form"
      method="POST"
      action="?/update"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') editing = false;
        };
      }}
      class="rounded-lg border border-border bg-card p-4"
    >
      <h2 class="mb-3 text-sm font-medium">Details</h2>
      <div class="space-y-3">
        <div>
          <label for="caption" class="block text-xs text-muted-foreground mb-1">Caption</label>
          <input
            id="caption"
            name="caption"
            type="text"
            disabled={!editing}
            bind:value={caption}
            class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Add a caption..."
          />
        </div>
        <div>
          <label for="altText" class="block text-xs text-muted-foreground mb-1">Alt Text</label>
          <textarea
            id="altText"
            name="altText"
            rows={2}
            disabled={!editing}
            bind:value={altText}
            class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Describe the image for accessibility..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span class="block font-medium">File</span>
            <span>{$page.data?.image?.originalName || ''}</span>
          </div>
          <div>
            <span class="block font-medium">Type</span>
            <span>{$page.data?.image?.mimeType || ''}</span>
          </div>
          <div>
            <span class="block font-medium">Size</span>
            <span
              >{$page.data?.image?.size
                ? Math.round($page.data.image.size / 1024) + ' KB'
                : ''}</span
            >
          </div>
          <div>
            <span class="block font-medium">URL</span>
            <a
              href={$page.data?.image?.url}
              target="_blank"
              class="underline hover:text-foreground"
            >
              <ExternalLink class="inline h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </form>

    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-medium">Linked Entities</h2>
        <button
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onclick={() => (showLinkPicker = !showLinkPicker)}
        >
          <Link2 class="h-3 w-3" />
          Link
        </button>
      </div>

      {#if showLinkPicker}
        <form
          method="POST"
          action="?/linkEntity"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === 'success') {
                showLinkPicker = false;
                selectedEntityId = '';
                goto(window.location.href);
              }
            };
          }}
          class="mb-3 flex gap-2"
        >
          <select
            name="entityId"
            bind:value={selectedEntityId}
            required
            class="flex-1 rounded border border-input bg-background px-2 py-1.5 text-xs"
          >
            <option value="">Select entity...</option>
            {#each unlinkedEntities() as e}
              <option value={e.id}
                >{ENTITY_LABELS[e.type as keyof typeof ENTITY_LABELS] || e.type}: {e.name}</option
              >
            {/each}
          </select>
          <button type="submit" class="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
            >Add</button
          >
        </form>
      {/if}

      <div class="space-y-1">
        {#each $page.data?.image?.linkedEntities || [] as entity}
          <div
            class="flex items-center justify-between rounded border border-border/50 px-2 py-1.5"
          >
            <a
              href="/projects/{$page.params.id}/{entity.type}s/{entity.id}"
              class="flex items-center gap-1 text-xs hover:underline"
            >
              <span class="rounded bg-secondary px-1 text-xs">{entity.type}</span>
              {entity.name}
            </a>
            <form
              method="POST"
              action="?/unlinkEntity"
              use:enhance={() => {
                return async ({ result }) => {
                  if (result.type === 'success') goto(window.location.href);
                };
              }}
            >
              <input type="hidden" name="entityId" value={entity.id} />
              <button
                type="submit"
                class="rounded p-0.5 text-muted-foreground hover:text-destructive"
                aria-label="Unlink entity"
              >
                <Unlink class="h-3 w-3" />
              </button>
            </form>
          </div>
        {/each}
        {#if !$page.data?.image?.linkedEntities?.length}
          <p class="py-4 text-center text-xs text-muted-foreground">
            <Image class="mx-auto mb-1 h-6 w-6 opacity-30" />
            No entities linked to this image
          </p>
        {/if}
      </div>
    </div>
  </div>
</div>
