<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_LABELS, ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import Editor from '$lib/components/Editor.svelte';
  import { cn, formatDate } from '$lib/utils';
  import type { EntityType } from '$lib/types';
  import {
    Plus,
    Search,
    MoreHorizontal,
    FileText,
    Trash2,
    Undo2,
    Download,
    Upload,
    LayoutList,
    Table2
  } from 'lucide-svelte';

  let showCreate = $state(false);
  let newName = $state('');
  let newBody = $state('');
  let selectedTemplate = $state('');
  let searchQuery = $state('');
  let showMenu = $state<string | null>(null);
  let toastMessage = $state('');
  let toastTrashId = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let toastVisible = $state(false);
  let layout = $state<'cards' | 'table'>('cards');
  let editingCell = $state<{ entityId: string; field: string } | null>(null);
  let editingValue = $state('');

  let role = $derived($page.data?.role || 'owner');
  let canEdit = $derived(role !== 'commenter');

  const LAYOUT_KEY = $derived(`entity-layout-${$page.data?.entityType || 'entity'}`);

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
    const templates = $page.data?.templates || [];
    const tpl = templates.find((t: any) => t.id === templateId);
    newBody = tpl?.body || '';
  }

  function downloadCsv() {
    const route = entityTypeToRoute($page.data?.entityType || 'character');
    window.open(`/projects/${$page.params.id}/${route}/export-csv`, '_blank');
  }

  let allEntities = $state<any[]>($page.data?.entities || []);

  $effect(() => {
    allEntities = $page.data?.entities || [];
  });

  let entities = $derived(
    searchQuery
      ? allEntities.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allEntities
  );

  function startCellEdit(entityId: string, field: string, currentValue: string) {
    if (!canEdit) return;
    editingCell = { entityId, field };
    editingValue = currentValue ?? '';
  }

  async function commitCellEdit(entityId: string, field: string) {
    if (!editingCell || editingCell.entityId !== entityId || editingCell.field !== field) return;
    editingCell = null;

    const route = entityTypeToRoute($page.data?.entityType || 'character');
    const body = new FormData();
    body.set('entityId', entityId);
    body.set('field', field);
    body.set('value', editingValue);

    const res = await fetch(`/projects/${$page.params.id}/${route}?/quickUpdate`, {
      method: 'POST',
      body
    });

    if (res.ok) {
      allEntities = allEntities.map((e) =>
        e.id === entityId
          ? {
              ...e,
              [field]: editingValue,
              frontmatter: { ...e.frontmatter, [field]: editingValue }
            }
          : e
      );
    }
  }

  async function commitStatusChange(entityId: string, newStatus: string) {
    const route = entityTypeToRoute($page.data?.entityType || 'character');
    const body = new FormData();
    body.set('entityId', entityId);
    body.set('field', 'status');
    body.set('value', newStatus);

    const res = await fetch(`/projects/${$page.params.id}/${route}?/quickUpdate`, {
      method: 'POST',
      body
    });

    if (res.ok) {
      allEntities = allEntities.map((e) => (e.id === entityId ? { ...e, status: newStatus } : e));
    }
  }

  let simpleCustomFields = $derived(
    ($page.data?.customFields || []).filter(
      (f: any) =>
        ['text', 'number', 'date', 'boolean'].includes(f.type) &&
        !['name', 'status', 'tags'].includes(f.key)
    )
  );
</script>

<svelte:head>
  <title
    >{$page.data?.entityType ? ENTITY_PLURAL[$page.data.entityType as EntityType] : 'Entities'} — {$page
      .data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto p-6" class:max-w-5xl={layout !== 'table'}>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">
        {$page.data?.entityType ? ENTITY_PLURAL[$page.data.entityType as EntityType] : 'Entities'}
      </h1>
      <p class="text-sm text-muted-foreground">
        {$page.data?.projectName || 'Project'}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button
          onclick={() => setLayout('cards')}
          class="px-2.5 py-2 hover:bg-secondary {layout === 'cards' ? 'bg-secondary' : ''}"
          aria-label="Card layout"
        >
          <LayoutList class="h-4 w-4" />
        </button>
        <button
          onclick={() => setLayout('table')}
          class="px-2.5 py-2 hover:bg-secondary {layout === 'table' ? 'bg-secondary' : ''}"
          aria-label="Table layout"
        >
          <Table2 class="h-4 w-4" />
        </button>
      </div>
      <button
        class="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        onclick={downloadCsv}
      >
        <Download class="h-4 w-4" />
        Export CSV
      </button>
      {#if canEdit}
        <a
          href="/projects/{$page.params.id}/{entityTypeToRoute(
            $page.data?.entityType || 'character'
          )}/import-csv"
          class="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        >
          <Upload class="h-4 w-4" />
          Import CSV
        </a>
        <button
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onclick={() => (showCreate = !showCreate)}
        >
          <Plus class="h-4 w-4" />
          New {$page.data?.entityType ? ENTITY_LABELS[$page.data.entityType as EntityType] : ''}
        </button>
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
        {#if $page.data?.entityType === 'note' && ($page.data?.templates || []).length > 0}
          <div>
            <label for="template" class="block text-sm font-medium">Template (optional)</label>
            <select
              id="template"
              class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={selectedTemplate}
              onchange={(e) => selectTemplate((e.target as HTMLSelectElement).value)}
            >
              <option value="">Blank note</option>
              {#each $page.data?.templates || [] as tmpl}
                <option value={tmpl.id}>{tmpl.name} — {tmpl.description}</option>
              {/each}
            </select>
          </div>
          {#if newBody}
            <div>
              <label for="body" class="block text-sm font-medium">Content (edit as needed)</label>
              <input type="hidden" name="body" value={newBody} />
              <Editor
                content={newBody}
                entities={$page.data?.entities || []}
                onUpdate={(md) => (newBody = md)}
              />
            </div>
          {/if}
        {/if}
        {#if ($page.data?.customFields || []).length > 0}
          <div class="border-t border-border pt-3">
            <p class="mb-2 text-xs font-medium text-muted-foreground">Custom Fields</p>
            {#each $page.data.customFields as field}
              <div class="mb-2">
                <label for="cf-{field.key}" class="block text-xs text-muted-foreground mb-0.5">
                  {field.label}
                  {#if field.required}<span class="text-destructive">*</span>{/if}
                </label>
                {#if field.type === 'boolean'}
                  <input
                    id="cf-{field.key}"
                    name={field.key}
                    type="checkbox"
                    class="rounded border-input"
                  />
                {:else if field.type === 'date'}
                  <input
                    id="cf-{field.key}"
                    name={field.key}
                    type="date"
                    class="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  />
                {:else if field.type === 'textarea' || field.type === 'markdown'}
                  <textarea
                    id="cf-{field.key}"
                    name={field.key}
                    rows="3"
                    class="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                    placeholder={field.placeholder || ''}></textarea>
                {:else}
                  <input
                    id="cf-{field.key}"
                    name={field.key}
                    type={field.type === 'number' ? 'number' : 'text'}
                    class="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                    placeholder={field.placeholder || ''}
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
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
        oninput={() => {}}
        class="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm"
      />
    </div>
  </div>

  {#if layout === 'cards'}
    <div class="space-y-2">
      {#if entities.length === 0}
        <p class="py-12 text-center text-muted-foreground">
          No {$page.data?.entityType
            ? ENTITY_PLURAL[$page.data.entityType as EntityType].toLowerCase()
            : 'entities'} yet. Create one to get started.
        </p>
      {/if}

      {#each entities as entity}
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
                    <span
                      class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                    >
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
          {#if canEdit}
            <div class="absolute right-2 top-1/2 -translate-y-1/2">
              <button
                class="rounded p-1.5 max-sm:opacity-100 opacity-0 group-hover:opacity-100 hover:bg-secondary"
                onclick={(e) => {
                  e.preventDefault();
                  showMenu = showMenu === entity.id ? null : entity.id;
                }}
                aria-label="More actions"
              >
                <MoreHorizontal class="h-4 w-4" />
              </button>
              {#if showMenu === entity.id}
                <div
                  class="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-popover shadow-lg"
                >
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
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <!-- Table layout -->
    <div class="overflow-x-auto rounded-lg border border-border">
      {#if entities.length === 0}
        <p class="py-12 text-center text-muted-foreground">
          No {$page.data?.entityType
            ? ENTITY_PLURAL[$page.data.entityType as EntityType].toLowerCase()
            : 'entities'} yet.
        </p>
      {:else}
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/40">
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="px-3 py-2 text-left font-medium">Status</th>
              <th class="px-3 py-2 text-left font-medium">Tags</th>
              {#each simpleCustomFields as field}
                <th class="px-3 py-2 text-left font-medium">{field.label}</th>
              {/each}
              <th class="px-3 py-2 text-left font-medium text-muted-foreground">Modified</th>
            </tr>
          </thead>
          <tbody>
            {#each entities as entity}
              <tr class="border-b border-border hover:bg-muted/20 last:border-0">
                <!-- Name cell -->
                <td class="px-3 py-2 font-medium max-w-48">
                  {#if canEdit && editingCell?.entityId === entity.id && editingCell?.field === 'name'}
                    <input
                      type="text"
                      bind:value={editingValue}
                      class="w-full rounded border border-primary bg-background px-1.5 py-0.5 text-sm focus:outline-none"
                      autofocus
                      onblur={() => commitCellEdit(entity.id, 'name')}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') commitCellEdit(entity.id, 'name');
                        if (e.key === 'Escape') editingCell = null;
                      }}
                    />
                  {:else}
                    <div class="flex items-center gap-1 group/cell">
                      <a
                        href="/projects/{$page.params.id}/{entityTypeToRoute(
                          entity.type
                        )}/{entity.id}"
                        class="truncate hover:underline"
                      >
                        {entity.name}
                      </a>
                      {#if canEdit}
                        <button
                          class="opacity-0 group-hover/cell:opacity-100 ml-1 shrink-0"
                          onclick={() => startCellEdit(entity.id, 'name', entity.name)}
                          aria-label="Edit name"
                        >
                          <svg
                            class="h-3 w-3 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            /></svg
                          >
                        </button>
                      {/if}
                    </div>
                  {/if}
                </td>
                <!-- Status cell -->
                <td class="px-3 py-2">
                  {#if canEdit}
                    <select
                      value={entity.status}
                      onchange={(e) =>
                        commitStatusChange(entity.id, (e.target as HTMLSelectElement).value)}
                      class={cn(
                        'rounded border px-1.5 py-0.5 text-xs bg-background',
                        entity.status === 'complete' &&
                          'border-green-500/40 text-green-600 dark:text-green-400',
                        entity.status === 'wip' &&
                          'border-yellow-500/40 text-yellow-600 dark:text-yellow-400',
                        entity.status === 'draft' && 'border-border text-muted-foreground'
                      )}
                    >
                      <option value="draft">Draft</option>
                      <option value="wip">In Progress</option>
                      <option value="complete">Complete</option>
                    </select>
                  {:else}
                    <span
                      class={cn(
                        'text-xs',
                        entity.status === 'complete' && 'text-green-600 dark:text-green-400',
                        entity.status === 'wip' && 'text-yellow-600 dark:text-yellow-400',
                        entity.status === 'draft' && 'text-muted-foreground'
                      )}
                    >
                      {entity.status === 'complete'
                        ? 'Complete'
                        : entity.status === 'wip'
                          ? 'In Progress'
                          : 'Draft'}
                    </span>
                  {/if}
                </td>
                <!-- Tags cell -->
                <td class="px-3 py-2 max-w-32">
                  <a
                    href="/projects/{$page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
                    class="text-xs text-muted-foreground hover:text-foreground truncate block"
                  >
                    {(entity.tags || []).join(', ') || '—'}
                  </a>
                </td>
                <!-- Custom field cells -->
                {#each simpleCustomFields as field}
                  <td class="px-3 py-2 max-w-36">
                    {#if canEdit && field.type !== 'boolean' && editingCell?.entityId === entity.id && editingCell?.field === field.key}
                      <input
                        type={field.type === 'number'
                          ? 'number'
                          : field.type === 'date'
                            ? 'date'
                            : 'text'}
                        bind:value={editingValue}
                        class="w-full rounded border border-primary bg-background px-1.5 py-0.5 text-sm focus:outline-none"
                        autofocus
                        onblur={() => commitCellEdit(entity.id, field.key)}
                        onkeydown={(e) => {
                          if (e.key === 'Enter') commitCellEdit(entity.id, field.key);
                          if (e.key === 'Escape') editingCell = null;
                        }}
                      />
                    {:else if field.type === 'boolean'}
                      {#if canEdit}
                        <input
                          type="checkbox"
                          checked={entity.frontmatter?.[field.key] === true ||
                            entity.frontmatter?.[field.key] === 'true'}
                          onchange={async (e) => {
                            const val = (e.target as HTMLInputElement).checked ? 'true' : 'false';
                            const route = entityTypeToRoute($page.data?.entityType || 'character');
                            const body = new FormData();
                            body.set('entityId', entity.id);
                            body.set('field', field.key);
                            body.set('value', val);
                            const res = await fetch(
                              `/projects/${$page.params.id}/${route}?/quickUpdate`,
                              { method: 'POST', body }
                            );
                            if (res.ok) {
                              allEntities = allEntities.map((en) =>
                                en.id === entity.id
                                  ? {
                                      ...en,
                                      frontmatter: {
                                        ...en.frontmatter,
                                        [field.key]: val === 'true'
                                      }
                                    }
                                  : en
                              );
                            }
                          }}
                          class="rounded border-input"
                        />
                      {:else}
                        <span class="text-xs text-muted-foreground">
                          {entity.frontmatter?.[field.key] ? 'Yes' : 'No'}
                        </span>
                      {/if}
                    {:else}
                      <div class="flex items-center gap-1 group/cell">
                        <span class="truncate text-sm text-muted-foreground">
                          {entity.frontmatter?.[field.key] ?? '—'}
                        </span>
                        {#if canEdit}
                          <button
                            class="opacity-0 group-hover/cell:opacity-100 ml-1 shrink-0"
                            onclick={() =>
                              startCellEdit(
                                entity.id,
                                field.key,
                                String(entity.frontmatter?.[field.key] ?? '')
                              )}
                            aria-label="Edit {field.label}"
                          >
                            <svg
                              class="h-3 w-3 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              /></svg
                            >
                          </button>
                        {/if}
                      </div>
                    {/if}
                  </td>
                {/each}
                <!-- Modified cell -->
                <td class="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(entity.modifiedAt)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
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
      <button
        type="submit"
        class="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        <Undo2 class="h-3 w-3" />
        Undo
      </button>
    </form>
    <button class="text-xs text-muted-foreground hover:text-foreground" onclick={cancelDelete}>
      Dismiss
    </button>
  </div>
{/if}
