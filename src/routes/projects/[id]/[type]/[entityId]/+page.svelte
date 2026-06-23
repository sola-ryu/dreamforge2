<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { ENTITY_LABELS } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import type { EntityType } from '$lib/types';
  import Editor from '$lib/components/Editor.svelte';
  import { marked } from 'marked';
  import Comments from '$lib/components/Comments.svelte';
  import {
    ArrowLeft,
    Save,
    Trash2,
    Bookmark,
    BookmarkMinus,
    SwitchCamera,
    Link2,
    Unlink,
    ImagePlus
  } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Combobox } from '$lib/components/ui/combobox';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from '$lib/components/ui/select';

  let role = $derived($page.data?.role || 'owner');
  let canEdit = $derived(role !== 'commenter');

  let editing = $state(false);
  let showConvert = $state(false);
  let convertStoryId = $state('');
  let convertChapterId = $state('');
  let selectedImageId = $state('');
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
      for (const field of $page.data?.customFields || []) {
        f[field.key] = $page.data.entity.frontmatter?.[field.key];
      }
      fields = f;
    }
  });

  $effect(() => {
    if (convertStoryId) convertChapterId = '';
  });

  function toggleEdit() {
    editing = !editing;
  }
</script>

<svelte:head>
  <title
    >{$page.data?.entity?.name || 'Entity'} — {$page.data?.entityType
      ? ENTITY_LABELS[$page.data.entityType as EntityType]
      : ''} — {$page.data?.project?.name || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}/{entityTypeToRoute($page.data?.entityType || 'character')}"
      class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to {$page.data?.entityType
        ? ENTITY_LABELS[$page.data.entityType as EntityType] + 's'
        : ''}
    </a>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          <Button form="edit-form" type="submit">
            <Save class="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onclick={toggleEdit}>Cancel</Button>
        {:else}
          {#if canEdit && $page.data?.entityType === 'note'}
            <Button variant="outline" onclick={() => (showConvert = !showConvert)}>
              <SwitchCamera class="h-4 w-4" />
              Convert to Scene
            </Button>
          {/if}
          <form method="POST" action="?/toggleBookmark" use:enhance>
            <Button type="submit" variant="outline">
              {#if $page.data?.bookmarked}
                <BookmarkMinus class="h-4 w-4" />
                Unbookmark
              {:else}
                <Bookmark class="h-4 w-4" />
                Bookmark
              {/if}
            </Button>
          </form>
          {#if canEdit}
            <Button onclick={toggleEdit}>Edit</Button>
          {/if}
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
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div class="flex items-center gap-2">
          <label for="status-select" class="text-sm font-medium">Status:</label>
          <Select type="single" bind:value={status} disabled={!editing}>
            <SelectTrigger id="status-select" class="rounded px-2 py-1 text-sm">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="wip">In Progress</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
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
              <Label for={field.key} class="mb-1">
                {field.label}
                {#if field.required}<span class="text-destructive">*</span>{/if}
              </Label>
              {#if field.type === 'textarea' || field.type === 'markdown'}
                <Textarea
                  id={field.key}
                  name={field.key}
                  disabled={!editing}
                  placeholder={field.placeholder || ''}
                  value={(fields[field.key] as string) || ''}
                />
              {:else if field.type === 'tags'}
                <Input
                  id={field.key}
                  name={field.key}
                  type="text"
                  disabled={!editing}
                  value={((fields[field.key] as string[]) || []).join(', ')}
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
                <Input
                  id={field.key}
                  name={field.key}
                  type="date"
                  disabled={!editing}
                  value={(fields[field.key] as string) || ''}
                />
              {:else}
                <Input
                  id={field.key}
                  name={field.key}
                  type={field.type === 'number' ? 'number' : 'text'}
                  disabled={!editing}
                  value={(fields[field.key] as string) || ''}
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
              <a href="/projects/{$page.params.id}/images/{img.id}" class="block">
                <img
                  src={img.url}
                  alt={img.altText || img.originalName}
                  class="h-20 w-20 rounded-lg border border-border object-cover"
                />
              </a>
              {#if editing}
                <Button
                  variant="destructive"
                  size="icon-xs"
                  class="absolute -right-1.5 -top-1.5 rounded-full opacity-0 group-hover:opacity-100"
                  onclick={() =>
                    fetch(window.location.href + '?/unlinkImage', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: new URLSearchParams({ imageId: img.id })
                    }).then(() => invalidateAll())}
                  aria-label="Unlink image"
                >
                  <Unlink class="h-3 w-3" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      {#if editing}
        <div class="mt-3 flex gap-2">
          <Combobox
            bind:value={selectedImageId}
            options={($page.data?.projectImages || [])
              .filter(
                (img: any) => !($page.data?.entityImages || []).some((ei: any) => ei.id === img.id)
              )
              .map((img: any) => ({
                value: img.id,
                label: img.originalName
              }))}
            placeholder="Select an image..."
            class="flex-1"
          />
          <Button
            size="sm"
            onclick={() => {
              if (!selectedImageId) return;
              fetch(window.location.href + '?/linkImage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ imageId: selectedImageId })
              }).then(() => window.location.reload());
            }}
          >
            <Link2 class="h-3 w-3" />
            Link
          </Button>
        </div>
      {/if}
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <Label for="body" class="mb-2">Content</Label>
      {#if $page.data?.entityType === 'note'}
        <input type="hidden" name="body" value={body} />
        {#if editing}
          <Editor
            content={body}
            entities={$page.data?.entities || []}
            onUpdate={(md) => (body = md)}
          />
        {:else}
          <div class="mt-4 prose prose-sm max-w-none">
            {@html marked.parse(body || '')}
          </div>
        {/if}
      {:else}
        <Textarea
          id="body"
          name="body"
          disabled={!editing}
          class="min-h-[20rem] font-mono"
          value={body}
        />
        {#if !editing}
          <div class="mt-4 prose prose-sm max-w-none">
            {@html $page.data?.entity?.body || ''}
          </div>
        {/if}
      {/if}
    </div>
  </form>

  <Comments
    projectId={$page.params.id || ''}
    targetType="entity"
    targetId={$page.params.entityId || ''}
    currentUserId={$page.data?.currentUserId || ''}
    projectOwnerId={$page.data?.projectOwnerId || ''}
    {role}
  />

  {#if editing}
    <div class="mt-6 border-t border-border pt-4">
      <form
        method="POST"
        action="?/delete"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === 'success') {
              const type = $page.data?.entityType;
              if (type) {
                goto(`/projects/${$page.params.id}/${entityTypeToRoute(type)}`);
              }
            }
          };
        }}
      >
        <Button type="submit" variant="destructive">
          <Trash2 class="h-4 w-4" />
          Delete Entity
        </Button>
      </form>
    </div>
  {/if}

  {#if showConvert && $page.data?.entityType === 'note'}
    <div class="mt-4 rounded-lg border border-border bg-card p-4">
      <h3 class="mb-3 text-sm font-medium">Convert Note to Scene</h3>
      <form method="POST" action="?/convertToScene" use:enhance class="space-y-3">
        <div class="space-y-1">
          <Label for="convertStory" class="text-xs text-muted-foreground">Story</Label>
          <Combobox
            name="storyId"
            bind:value={convertStoryId}
            options={($page.data?.stories || []).map((s: any) => ({ value: s.id, label: s.title }))}
            placeholder="Select a story..."
          />
        </div>
        <div class="space-y-1">
          <Label for="convertChapter" class="text-xs text-muted-foreground"
            >Chapter (optional)</Label
          >
          <Combobox
            name="chapterId"
            bind:value={convertChapterId}
            options={[
              { value: '', label: 'New chapter...' },
              ...(
                ($page.data?.stories || []).find((s: any) => s.id === convertStoryId)?.chapters ||
                []
              ).map((ch: any) => ({ value: ch.id, label: ch.title }))
            ]}
            placeholder="New chapter..."
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button type="submit">Convert</Button>
          <Button type="button" variant="outline" onclick={() => (showConvert = false)}
            >Cancel</Button
          >
        </div>
      </form>
    </div>
  {/if}

  <div class="mt-4 rounded-lg border border-border bg-card p-4">
    <p class="text-xs text-muted-foreground">
      Created: {$page.data?.entity?.createdAt
        ? new Date($page.data.entity.createdAt).toLocaleString()
        : ''}
      &middot; Modified: {$page.data?.entity?.modifiedAt
        ? new Date($page.data.entity.modifiedAt).toLocaleString()
        : ''}
    </p>
  </div>
</div>
