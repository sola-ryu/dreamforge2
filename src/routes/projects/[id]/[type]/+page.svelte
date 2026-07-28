<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_LABELS, ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import Editor from '$lib/components/Editor.svelte';
  import EntityCardList from '$lib/components/EntityCardList.svelte';
  import EntityGrid from '$lib/components/EntityGrid.svelte';
  import {
    buildGridColumns,
    applyCellValue,
    STATUS_OPTIONS,
    type GridColumn
  } from '$lib/utils/entityGrid';
  import { filterEntities, collectTags, type EntitySort } from '$lib/utils/entityFilter';
  import { cn } from '$lib/utils';
  import type { EntityType } from '$lib/types';
  import { Plus, Search, Undo2, Download, Upload, LayoutList, Table2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from '$lib/components/ui/select';

  let showCreate = $state(false);
  let newName = $state('');
  let newBody = $state('');
  let selectedTemplate = $state('');
  let searchQuery = $state('');
  let statusFilter = $state('');
  let tagFilters = $state<string[]>([]);
  let sort = $state<EntitySort>('modified');
  let toastMessage = $state('');
  let toastTrashId = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let toastVisible = $state(false);
  let layout = $state<'cards' | 'table'>('cards');

  let role = $derived(page.data?.role || 'owner');
  let canEdit = $derived(role !== 'commenter');

  const LAYOUT_KEY = $derived(`entity-layout-${page.data?.entityType || 'entity'}`);

  // The command palette links here with ?new=1 to jump straight into creation.
  $effect(() => {
    if (page.url.searchParams.get('new')) showCreate = true;
  });

  $effect(() => {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored === 'table' || stored === 'cards') layout = stored;
  });

  function setLayout(l: 'cards' | 'table') {
    layout = l;
    localStorage.setItem(LAYOUT_KEY, l);
  }

  function showToast(message: string, trashId: string) {
    toastMessage = message;
    toastTrashId = trashId;
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastVisible = false;
    }, 5000);
  }

  function cancelDelete() {
    if (toastTimer) clearTimeout(toastTimer);
    toastVisible = false;
  }

  function selectTemplate(templateId: string) {
    selectedTemplate = templateId;
    const templates = page.data?.templates || [];
    const tpl = templates.find((t: any) => t.id === templateId);
    newBody = tpl?.body || '';
  }

  function downloadCsv() {
    const route = entityTypeToRoute(page.data?.entityType || 'character');
    window.open(`/projects/${page.params.id}/${route}/export-csv`, '_blank');
  }

  let allEntities = $state<any[]>(page.data?.entities || []);

  $effect(() => {
    allEntities = page.data?.entities || [];
  });

  let availableTags = $derived(collectTags(allEntities));

  let entities = $derived(
    filterEntities(allEntities, {
      query: searchQuery,
      status: statusFilter,
      tags: tagFilters,
      sort
    })
  );

  function toggleTag(tag: string) {
    tagFilters = tagFilters.includes(tag)
      ? tagFilters.filter((t) => t !== tag)
      : [...tagFilters, tag];
  }

  function clearFilters() {
    searchQuery = '';
    statusFilter = '';
    tagFilters = [];
  }

  let filtersActive = $derived(!!searchQuery || !!statusFilter || tagFilters.length > 0);

  let gridColumns = $derived(buildGridColumns(page.data?.customFields || []));

  let entityType = $derived((page.data?.entityType || 'character') as EntityType);
  let route = $derived(entityTypeToRoute(entityType));
  let emptyMessage = $derived(
    `No ${ENTITY_PLURAL[entityType].toLowerCase()} yet. Create one to get started.`
  );

  function entityHref(entity: Record<string, any>) {
    return `/projects/${page.params.id}/${entityTypeToRoute(entity.type)}/${entity.id}`;
  }

  /** Mirror a saved cell edit onto the local row so the grid updates without a reload. */
  function applySavedCell(entityId: string, column: GridColumn, raw: string) {
    allEntities = allEntities.map((e) => (e.id === entityId ? applyCellValue(e, column, raw) : e));
  }
</script>

<svelte:head>
  <title
    >{page.data?.entityType ? ENTITY_PLURAL[page.data.entityType as EntityType] : 'Entities'} — {page
      .data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto p-6" class:max-w-5xl={layout !== 'table'}>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">
        {page.data?.entityType ? ENTITY_PLURAL[page.data.entityType as EntityType] : 'Entities'}
      </h1>
      <p class="text-sm text-muted-foreground">
        {page.data?.projectName || 'Project'}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <div class="flex rounded-lg border border-border overflow-hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={() => setLayout('cards')}
          class={cn('rounded-none', layout === 'cards' && 'bg-secondary')}
          aria-label="Card layout"
        >
          <LayoutList class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={() => setLayout('table')}
          class={cn('rounded-none', layout === 'table' && 'bg-secondary')}
          aria-label="Table layout"
        >
          <Table2 class="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" onclick={downloadCsv}>
        <Download class="h-4 w-4" />
        Export CSV
      </Button>
      {#if canEdit}
        <Button
          variant="outline"
          href="/projects/{page.params.id}/{entityTypeToRoute(
            page.data?.entityType || 'character'
          )}/import-csv"
        >
          <Upload class="h-4 w-4" />
          Import CSV
        </Button>
        <Button onclick={() => (showCreate = !showCreate)}>
          <Plus class="h-4 w-4" />
          New {page.data?.entityType ? ENTITY_LABELS[page.data.entityType as EntityType] : ''}
        </Button>
      {/if}
    </div>
  </div>

  {#if showCreate && canEdit}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              showCreate = false;
              newName = '';
              update();
            }
          };
        }}
        class="space-y-4"
      >
        <div class="space-y-1.5">
          <Label for="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            bind:value={newName}
            placeholder="Enter name..."
          />
        </div>
        {#if page.data?.entityType === 'note' && (page.data?.templates || []).length > 0}
          <div class="space-y-1.5">
            <Label for="template">Template (optional)</Label>
            <Select type="single" value={selectedTemplate} onValueChange={(v) => selectTemplate(v)}>
              <SelectTrigger id="template" class="w-full">
                <SelectValue placeholder="Blank note" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Blank note</SelectItem>
                {#each page.data?.templates || [] as tmpl}
                  <SelectItem value={tmpl.id}>{tmpl.name} — {tmpl.description}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>
          {#if newBody}
            <div class="space-y-1.5">
              <Label for="body">Content (edit as needed)</Label>
              <input type="hidden" name="body" value={newBody} />
              <Editor
                content={newBody}
                entities={page.data?.entities || []}
                onUpdate={(md) => (newBody = md)}
              />
            </div>
          {/if}
        {/if}
        {#if (page.data?.customFields || []).length > 0}
          <div class="border-t border-border pt-3">
            <p class="mb-2 text-xs font-medium text-muted-foreground">Custom Fields</p>
            {#each page.data.customFields as field}
              <div class="mb-2">
                <Label for="cf-{field.key}" class="text-xs text-muted-foreground mb-0.5">
                  {field.label}
                  {#if field.required}<span class="text-destructive">*</span>{/if}
                </Label>
                {#if field.type === 'boolean'}
                  <input
                    id="cf-{field.key}"
                    name={field.key}
                    type="checkbox"
                    class="rounded border-input"
                  />
                {:else if field.type === 'date'}
                  <Input id="cf-{field.key}" name={field.key} type="date" class="mt-1" />
                {:else if field.type === 'textarea' || field.type === 'markdown'}
                  <Textarea
                    id="cf-{field.key}"
                    name={field.key}
                    class="mt-1"
                    placeholder={field.placeholder || ''}
                  />
                {:else}
                  <Input
                    id="cf-{field.key}"
                    name={field.key}
                    type={field.type === 'number' ? 'number' : 'text'}
                    class="mt-1"
                    placeholder={field.placeholder || ''}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        <div class="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onclick={() => (showCreate = false)}
            >Cancel</Button
          >
        </div>
      </form>
    </div>
  {/if}

  <div class="mb-4 space-y-3">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        placeholder="Search by name..."
        bind:value={searchQuery}
        class="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm"
      />
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <Button
        size="xs"
        variant={statusFilter === '' ? 'default' : 'outline'}
        onclick={() => (statusFilter = '')}
      >
        All
      </Button>
      {#each STATUS_OPTIONS as option (option.value)}
        <Button
          size="xs"
          variant={statusFilter === option.value ? 'default' : 'outline'}
          onclick={() => (statusFilter = statusFilter === option.value ? '' : option.value)}
        >
          {option.label}
        </Button>
      {/each}

      <span class="mx-1 h-4 w-px bg-border"></span>

      <select
        bind:value={sort}
        aria-label="Sort entities"
        class="h-7 rounded-lg border border-input bg-background px-2 text-xs"
      >
        <option value="modified">Recently edited</option>
        <option value="created">Recently created</option>
        <option value="name">Name A–Z</option>
      </select>

      <span class="ml-auto text-xs text-muted-foreground">
        {entities.length} of {allEntities.length}
      </span>
      {#if filtersActive}
        <Button size="xs" variant="ghost" onclick={clearFilters}>Clear</Button>
      {/if}
    </div>

    {#if availableTags.length > 0}
      <div class="flex flex-wrap items-center gap-1.5">
        {#each availableTags as { tag, count } (tag)}
          <Button
            size="xs"
            variant={tagFilters.includes(tag) ? 'default' : 'outline'}
            onclick={() => toggleTag(tag)}
          >
            {tag}
            <span class="text-[10px] opacity-70">{count}</span>
          </Button>
        {/each}
      </div>
    {/if}
  </div>

  {#if layout === 'cards'}
    <EntityCardList
      {entities}
      {canEdit}
      {emptyMessage}
      {entityHref}
      onDeleted={(trashId) => showToast('Entity moved to trash', trashId)}
    />
  {:else}
    <EntityGrid
      rows={entities}
      entities={allEntities}
      columns={gridColumns}
      projectId={page.params.id || ''}
      {route}
      {canEdit}
      {emptyMessage}
      refEntities={page.data?.refEntities || {}}
      {entityHref}
      onSaved={applySavedCell}
    />
  {/if}
</div>

{#if toastVisible}
  <div
    class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg"
  >
    <span class="text-sm">{toastMessage}</span>
    <form
      method="POST"
      action="?/restore"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') {
            cancelDelete();
            goto(window.location.href);
          }
        };
      }}
    >
      <input type="hidden" name="trashId" value={toastTrashId} />
      <Button type="submit" size="sm">
        <Undo2 class="h-3 w-3" />
        Undo
      </Button>
    </form>
    <button class="text-xs text-muted-foreground hover:text-foreground" onclick={cancelDelete}>
      Dismiss
    </button>
  </div>
{/if}
