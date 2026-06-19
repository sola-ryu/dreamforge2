<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { ENTITY_FIELDS, ENTITY_LABELS } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { ArrowLeft, Save, Trash2, Image, Bookmark, BookmarkMinus } from 'lucide-svelte';

  let editing = $state(false);
  let name = $state($page.data?.entity?.name || '');
  let body = $state($page.data?.entity?.body || '');
  let fields = $state<Record<string, unknown>>({});
  let tags = $state('');
  let status = $state($page.data?.entity?.status || 'draft');

  $effect(() => {
    if ($page.data?.entity) {
      name = $page.data.entity.name;
      body = $page.data.entity.body;
      tags = ($page.data.entity.tags || []).join(', ');
      status = $page.data.entity.status;
      const f: Record<string, unknown> = {};
      const type = $page.data.entityType;
      if (type) {
        for (const field of ENTITY_FIELDS[type]) {
          f[field.key] = $page.data.entity.frontmatter?.[field.key];
        }
      }
      fields = f;
    }
  });

  function toggleEdit() {
    editing = !editing;
  }
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}/{entityTypeToRoute($page.data?.entityType || 'character')}"
      class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to {$page.data?.entityType ? ENTITY_LABELS[$page.data.entityType] + 's' : ''}
    </a>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{$page.data?.entity?.name || 'Entity'}</h1>
      <div class="flex gap-2">
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
            onclick={toggleEdit}
          >
            Cancel
          </button>
        {:else}
          <form method="POST" action="?/toggleBookmark" use:enhance>
            <button
              type="submit"
              class="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              {#if $page.data?.bookmarked}
                <BookmarkMinus class="h-4 w-4" />
                Unbookmark
              {:else}
                <Bookmark class="h-4 w-4" />
                Bookmark
              {/if}
            </button>
          </form>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            onclick={toggleEdit}
          >
            Edit
          </button>
        {/if}
      </div>
    </div>
  </div>

  <form
    id="edit-form"
    method="POST"
    action="?/update"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          editing = false;
        }
      };
    }}
    class="space-y-6"
  >
    <input type="hidden" name="name" bind:value={name} />
    <input type="hidden" name="tags" bind:value={tags} />
    <input type="hidden" name="status" bind:value={status} />

    <div class="rounded-lg border border-border bg-card p-4">
      <div class="mb-4 flex items-center gap-3">
        <div class="flex items-center gap-2">
          <label for="status-select" class="text-sm font-medium">Status:</label>
          <select
            id="status-select"
            name="status"
            bind:value={status}
            disabled={!editing}
            class="rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="wip">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label for="tags-input" class="text-sm font-medium">Tags:</label>
          <input
            id="tags-input"
            type="text"
            name="tags_display"
            bind:value={tags}
            disabled={!editing}
            class="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            placeholder="tag1, tag2, tag3"
          />
        </div>
      </div>

      {#if $page.data?.entityType && ENTITY_FIELDS[$page.data.entityType].length > 0}
        <div class="space-y-4">
          {#each ENTITY_FIELDS[$page.data.entityType] as field}
            <div>
              <label for={field.key} class="block text-sm font-medium mb-1">
                {field.label}
              </label>
              {#if field.type === 'textarea' || field.type === 'markdown'}
                <textarea
                  id={field.key}
                  name={field.key}
                  rows={4}
                  disabled={!editing}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder={field.placeholder || ''}
                >{fields[field.key] as string || ''}</textarea>
              {:else if field.type === 'tags'}
                <input
                  id={field.key}
                  name={field.key}
                  type="text"
                  disabled={!editing}
                  value={((fields[field.key] as string[]) || []).join(', ')}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="tag1, tag2, tag3"
                />
              {:else}
                <input
                  id={field.key}
                  name={field.key}
                  type={field.type === 'number' ? 'number' : 'text'}
                  disabled={!editing}
                  value={(fields[field.key] as string) || ''}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder={field.placeholder || ''}
                />
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <label for="body" class="mb-2 block text-sm font-medium">Content</label>
      <textarea
        id="body"
        name="body"
        rows={20}
        disabled={!editing}
        class="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
      >{body}</textarea>
      {#if !editing}
        <div class="mt-4 prose prose-sm dark:prose-invert max-w-none">
          {@html $page.data?.entity?.body || ''}
        </div>
      {/if}
    </div>
  </form>

  {#if editing}
    <div class="mt-6 border-t border-border pt-4">
      <form method="POST" action="?/delete">
        <button
          type="submit"
          class="flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          <Trash2 class="h-4 w-4" />
          Delete Entity
        </button>
      </form>
    </div>
  {/if}

  <div class="mt-4 rounded-lg border border-border bg-card p-4">
    <p class="text-xs text-muted-foreground">
      Created: {$page.data?.entity?.createdAt ? new Date($page.data.entity.createdAt).toLocaleString() : ''}
      &middot;
      Modified: {$page.data?.entity?.modifiedAt ? new Date($page.data.entity.modifiedAt).toLocaleString() : ''}
    </p>
  </div>
</div>
