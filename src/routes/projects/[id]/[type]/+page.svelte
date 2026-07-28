<script lang="ts">
  import { page } from '$app/state';
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_LABELS, ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import Editor from '$lib/components/Editor.svelte';
  import EntityGridCell from '$lib/components/EntityGridCell.svelte';
  import EntityGridPanel from '$lib/components/EntityGridPanel.svelte';
  import {
    buildGridColumns,
    getCellValue,
    toEditString,
    applyCellValue,
    type GridColumn
  } from '$lib/utils/entityGrid';
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
  } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
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
  let showMenu = $state<string | null>(null);
  let toastMessage = $state('');
  let toastTrashId = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let toastVisible = $state(false);
  let layout = $state<'cards' | 'table'>('cards');

  // Grid state: `activeCell` is the spreadsheet cursor, `editing` means an inline editor is open.
  let activeCell = $state<{ row: number; col: number } | null>(null);
  let editing = $state(false);
  let editSeed = $state('');
  let panelTarget = $state<{ entityId: string; colIndex: number } | null>(null);
  let gridEl = $state<HTMLElement | null>(null);

  let role = $derived(page.data?.role || 'owner');
  let canEdit = $derived(role !== 'commenter');

  const LAYOUT_KEY = $derived(`entity-layout-${page.data?.entityType || 'entity'}`);

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

  let entities = $derived(
    searchQuery
      ? allEntities.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allEntities
  );

  let gridColumns = $derived(buildGridColumns(page.data?.customFields || []));

  let panelEntity = $derived(
    panelTarget ? allEntities.find((e) => e.id === panelTarget!.entityId) : null
  );

  /** Persist one cell to the server, then patch the local row optimistically. */
  async function saveCell(entityId: string, column: GridColumn, raw: string) {
    const current = toEditString(
      getCellValue(allEntities.find((e) => e.id === entityId) || {}, column.key)
    );
    if (current === raw) return;

    const route = entityTypeToRoute(page.data?.entityType || 'character');
    const body = new FormData();
    body.set('entityId', entityId);
    body.set('field', column.key);
    body.set('value', raw);

    const res = await fetch(`/projects/${page.params.id}/${route}?/quickUpdate`, {
      method: 'POST',
      body
    });

    if (res.ok) {
      allEntities = allEntities.map((e) =>
        e.id === entityId ? applyCellValue(e, column, raw) : e
      );
    } else {
      gridError = `Could not save ${column.label}.`;
      setTimeout(() => (gridError = ''), 4000);
    }
  }

  let gridError = $state('');

  function moveActive(dRow: number, dCol: number) {
    if (!activeCell) return;
    const row = Math.min(Math.max(activeCell.row + dRow, 0), entities.length - 1);
    const col = Math.min(Math.max(activeCell.col + dCol, 0), gridColumns.length - 1);
    activeCell = { row, col };
  }

  function beginEdit(seed: string) {
    if (!canEdit || !activeCell) return;
    const column = gridColumns[activeCell.col];
    if (column.panelOnly) {
      openPanel(activeCell.row, activeCell.col);
      return;
    }
    if (column.type === 'boolean') return;
    editSeed = seed;
    editing = true;
  }

  function openPanel(row: number, col: number) {
    if (!canEdit) return;
    const entity = entities[row];
    if (!entity) return;
    editing = false;
    panelTarget = { entityId: entity.id, colIndex: col };
  }

  function closePanel() {
    panelTarget = null;
    focusActiveCell();
  }

  function onCellCommit(raw: string, move: 'down' | 'right' | 'left' | 'none') {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const entity = entities[row];
    const column = gridColumns[col];
    editing = false;
    if (entity && column) saveCell(entity.id, column, raw);

    if (move === 'down') moveActive(1, 0);
    else if (move === 'right') moveActive(0, 1);
    else if (move === 'left') moveActive(0, -1);
    focusActiveCell();
  }

  function focusActiveCell() {
    tick().then(() => {
      if (editing || !activeCell || !gridEl) return;
      const el = gridEl.querySelector<HTMLElement>(
        `[data-cell="${activeCell.row}-${activeCell.col}"]`
      );
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function onGridKeydown(e: KeyboardEvent) {
    if (!activeCell || editing || panelTarget) return;
    const column = gridColumns[activeCell.col];
    const entity = entities[activeCell.row];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveActive(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveActive(0, -1);
        break;
      case 'Tab':
        e.preventDefault();
        moveActive(0, e.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        beginEdit(toEditString(getCellValue(entity, column.key)));
        break;
      case 'Escape':
        activeCell = null;
        return;
      case ' ':
        if (canEdit && column.type === 'boolean') {
          e.preventDefault();
          const on = getCellValue(entity, column.key) === true;
          saveCell(entity.id, column, on ? 'false' : 'true');
        }
        return;
      case 'Delete':
      case 'Backspace':
        if (canEdit && !column.panelOnly && column.key !== 'name') {
          e.preventDefault();
          saveCell(entity.id, column, column.type === 'boolean' ? 'false' : '');
        }
        return;
      default:
        // A bare printable character starts editing, seeded with what was typed.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          beginEdit(e.key);
        }
        return;
    }
    focusActiveCell();
  }

  // Keep the cursor in bounds when the filtered row set shrinks.
  $effect(() => {
    if (activeCell && activeCell.row >= entities.length) {
      activeCell = entities.length ? { ...activeCell, row: entities.length - 1 } : null;
    }
  });
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
          No {page.data?.entityType
            ? ENTITY_PLURAL[page.data.entityType as EntityType].toLowerCase()
            : 'entities'} yet. Create one to get started.
        </p>
      {/if}

      {#each entities as entity}
        <div class="group relative rounded-lg border border-border bg-card hover:bg-secondary/50">
          <a
            href="/projects/{page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
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
                    <Badge variant="secondary">{tag}</Badge>
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
              <Button
                variant="ghost"
                size="icon-sm"
                class="max-sm:opacity-100 opacity-0 group-hover:opacity-100"
                onclick={(e) => {
                  e.preventDefault();
                  showMenu = showMenu === entity.id ? null : entity.id;
                }}
                aria-label="More actions"
              >
                <MoreHorizontal class="h-4 w-4" />
              </Button>
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
    <!-- Spreadsheet-style grid -->
    <p class="mb-2 text-xs text-muted-foreground">
      Click a cell, then use arrow keys to move. Type or press Enter to edit, Enter/Tab to commit,
      Escape to cancel, Space to toggle checkboxes, Delete to clear.
    </p>
    <div class="rounded-lg border border-border overflow-x-auto" bind:this={gridEl}>
      {#if entities.length === 0}
        <p class="py-12 text-center text-muted-foreground">
          No {page.data?.entityType
            ? ENTITY_PLURAL[page.data.entityType as EntityType].toLowerCase()
            : 'entities'} yet.
        </p>
      {:else}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <table
          class="w-full text-sm min-w-max border-separate border-spacing-0"
          onkeydown={onGridKeydown}
        >
          <thead class="sticky top-0 z-20 bg-background">
            <tr class="bg-muted/40">
              {#each gridColumns as column, col}
                <th
                  class={cn(
                    'border-b border-border px-2 py-1.5 text-left font-medium whitespace-nowrap bg-muted/40',
                    col === 0 && 'sticky left-0 z-10'
                  )}
                >
                  {column.label}
                </th>
              {/each}
              <th
                class="border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground bg-muted/40"
              >
                Modified
              </th>
            </tr>
          </thead>
          <tbody>
            {#each entities as entity, row (entity.id)}
              <tr class="group/row hover:bg-muted/20">
                {#each gridColumns as column, col (column.key)}
                  {@const isActive = activeCell?.row === row && activeCell?.col === col}
                  <td
                    role="gridcell"
                    tabindex={-1}
                    data-cell="{row}-{col}"
                    class={cn(
                      'group/cell max-w-56 border-b border-border px-2 py-1 align-middle focus:outline-none',
                      col === 0 && 'sticky left-0 z-10 bg-background group-hover/row:bg-muted/20',
                      isActive && 'ring-2 ring-inset ring-primary'
                    )}
                    onclick={() => (activeCell = { row, col })}
                    ondblclick={() => beginEdit(toEditString(getCellValue(entity, column.key)))}
                  >
                    <EntityGridCell
                      {entity}
                      {column}
                      {canEdit}
                      editing={isActive && editing}
                      {editSeed}
                      refOptions={(page.data?.refEntities || {})[column.entityType || ''] || []}
                      href="/projects/{page.params.id}/{entityTypeToRoute(entity.type)}/{entity.id}"
                      onCommit={onCellCommit}
                      onCancel={() => {
                        editing = false;
                        focusActiveCell();
                      }}
                      onOpenPanel={() => openPanel(row, col)}
                    />
                  </td>
                {/each}
                <td
                  class="border-b border-border px-2 py-1 text-xs text-muted-foreground whitespace-nowrap"
                >
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

{#if panelTarget && panelEntity}
  {#key panelTarget.entityId + ':' + panelTarget.colIndex}
    <EntityGridPanel
      entity={panelEntity}
      column={gridColumns[panelTarget.colIndex]}
      entities={allEntities}
      onSave={(raw) => {
        saveCell(panelTarget!.entityId, gridColumns[panelTarget!.colIndex], raw);
        closePanel();
      }}
      onClose={closePanel}
    />
  {/key}
{/if}

{#if gridError}
  <div
    class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-destructive/40 bg-card px-4 py-2 text-sm text-destructive shadow-lg"
  >
    {gridError}
  </div>
{/if}

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
