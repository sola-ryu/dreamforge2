<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_LABELS } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { ArrowLeft, Save, Trash2, Image, Bookmark, BookmarkMinus, SwitchCamera, Undo2, Link2, Unlink, ImagePlus } from 'lucide-svelte';

  let editing = $state(false);
  let showConvert = $state(false);
  let convertStoryId = $state('');
  let convertChapterId = $state('');
  let name = $state($page.data?.entity?.name || '');
  let body = $state($page.data?.entity?.body || '');
  let fields = $state<Record<string, unknown>>({});
  let tags = $state('');
  let status = $state($page.data?.entity?.status || 'draft');
  let toastMessage = $state('');
  let toastTrashId = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let toastVisible = $state(false);

  $effect(() => {
    if ($page.data?.entity) {
      name = $page.data.entity.name;
      body = $page.data.entity.body;
      tags = ($page.data.entity.tags || []).join(', ');
      status = $page.data.entity.status;
      const f: Record<string, unknown> = {};
      for (const field of ($page.data?.customFields || [])) {
        f[field.key] = $page.data.entity.frontmatter?.[field.key];
      }
      fields = f;
    }
  });

  function showToast(message: string, trashId: string) {
    toastMessage = message;
    toastTrashId = trashId;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
      const type = $page.data?.entityType;
      if (type) {
        goto(`/projects/${$page.params.id}/${entityTypeToRoute(type)}`);
      }
    }, 5000);
  }

  function cancelDelete() {
    if (toastTimer) clearTimeout(toastTimer);
    toastVisible = false;
  }

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
      {#if editing}
        <input
          type="text"
          bind:value={name}
          class="text-2xl font-bold bg-transparent border-b border-primary/50 outline-none w-full"
          placeholder="Entity name"
        />
      {:else}
        <h1 class="text-2xl font-bold">{name || 'Entity'}</h1>
      {/if}
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
          {#if $page.data?.entityType === 'note'}
            <button
              class="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
              onclick={() => (showConvert = !showConvert)}
            >
              <SwitchCamera class="h-4 w-4" />
              Convert to Scene
            </button>
          {/if}
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

      {#if ($page.data?.customFields || []).length > 0}
        <div class="space-y-4">
          {#each $page.data.customFields as field}
            <div>
              <label for={field.key} class="block text-sm font-medium mb-1">
                {field.label}
                {#if field.required}<span class="text-destructive">*</span>{/if}
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
              {:else if field.type === 'boolean'}
                <input
                  id={field.key}
                  name={field.key}
                  type="checkbox"
                  disabled={!editing}
                  checked={fields[field.key] === true}
                  class="rounded border-input"
                />
              {:else if field.type === 'date'}
                <input
                  id={field.key}
                  name={field.key}
                  type="date"
                  disabled={!editing}
                  value={(fields[field.key] as string) || ''}
                  class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-medium">Images</h2>
        {#if editing}
          <a
            href="/projects/{$page.params.id}/images"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ImagePlus class="h-3 w-3" />
            Gallery
          </a>
        {/if}
      </div>
      {#if ($page.data?.entityImages || []).length === 0}
        <p class="py-2 text-xs text-muted-foreground">No images linked to this entity.</p>
      {:else}
        <div class="flex flex-wrap gap-2">
          {#each $page.data.entityImages as img}
            <div class="group relative">
              <a
                href="/projects/{$page.params.id}/images/{img.id}"
                class="block"
              >
                <img
                  src={img.url}
                  alt={img.altText || img.originalName}
                  class="h-20 w-20 rounded-lg border border-border object-cover"
                />
              </a>
              {#if editing}
                <form method="POST" action="?/unlinkImage" use:enhance>
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    type="submit"
                    class="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100"
                    title="Unlink image"
                  >
                    <Unlink class="h-3 w-3" />
                  </button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      {#if editing}
        <form method="POST" action="?/linkImage" use:enhance class="mt-3 flex gap-2">
          <select
            name="imageId"
            required
            class="flex-1 rounded border border-input bg-background px-2 py-1.5 text-xs"
          >
            <option value="">Select an image...</option>
            {#each ($page.data?.projectImages || []) as img}
              <option value={img.id}>{img.originalName}</option>
            {/each}
          </select>
          <button type="submit" class="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Link2 class="h-3 w-3" />
            Link
          </button>
        </form>
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
      <form
        method="POST"
        action="?/delete"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === 'success') {
              const d = result.data as { trashItem?: { id: string } };
              if (d?.trashItem) {
                showToast('Entity moved to trash', d.trashItem.id);
              }
            }
          };
        }}
      >
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

  {#if showConvert && $page.data?.entityType === 'note'}
    <div class="mt-4 rounded-lg border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-medium">Convert Note to Scene</h3>
      <form method="POST" action="?/convertToScene" use:enhance class="space-y-3">
        <div>
          <label for="convertStory" class="block text-xs text-muted-foreground mb-1">Story</label>
          <select id="convertStory" name="storyId" required bind:value={convertStoryId}
            class="w-full rounded border border-input bg-background px-2 py-1 text-sm"
            onchange={() => { convertChapterId = ''; }}
          >
            <option value="">Select a story...</option>
            {#each ($page.data?.stories || []) as story}
              <option value={story.id}>{story.title}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="convertChapter" class="block text-xs text-muted-foreground mb-1">Chapter (optional)</label>
          <select id="convertChapter" name="chapterId" bind:value={convertChapterId}
            class="w-full rounded border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">New chapter...</option>
            {#each ($page.data?.stories || []).find((s: any) => s.id === convertStoryId)?.chapters || [] as ch}
              <option value={ch.id}>{ch.title}</option>
            {/each}
          </select>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90">Convert</button>
          <button type="button" class="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary" onclick={() => (showConvert = false)}>Cancel</button>
        </div>
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

{#if toastVisible}
  <div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
    <span class="text-sm">{toastMessage}</span>
    <form method="POST" action="?/restore" use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          cancelDelete();
          goto(window.location.href);
        }
      };
    }}>
      <input type="hidden" name="trashId" value={toastTrashId} />
      <button
        type="submit"
        class="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        <Undo2 class="h-3 w-3" />
        Undo
      </button>
    </form>
    <button
      class="text-xs text-muted-foreground hover:text-foreground"
      onclick={cancelDelete}
    >
      Dismiss
    </button>
  </div>
{/if}
