<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { ENTITY_LABELS } from '$lib/entityFields';
  import { ArrowLeft, Plus, Trash2, Settings, Users, UserPlus } from 'lucide-svelte';
  import type { EntityType } from '$lib/types';

  let selectedType = $state<EntityType>('character');
  let newKey = $state('');
  let newLabel = $state('');
  let newFieldType = $state('text');
  let newRefEntityType = $state('');
  let newPlaceholder = $state('');
  let newRequired = $state(false);

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'tags', label: 'Tags' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'entityRef', label: 'Entity Reference' },
    { value: 'boolean', label: 'Boolean (checkbox)' },
    { value: 'date', label: 'Date' }
  ];

  const entityTypes: EntityType[] = [
    'character',
    'organization',
    'location',
    'culture',
    'species',
    'item',
    'note'
  ];

  function resetForm() {
    newKey = '';
    newLabel = '';
    newFieldType = 'text';
    newRefEntityType = '';
    newPlaceholder = '';
    newRequired = false;
  }

  function deriveKey(e: Event) {
    const input = e.target as HTMLInputElement;
    newKey = input.value
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  let typeFields = $derived(
    ($page.data?.customFields || []).filter((f: any) => f.entityType === selectedType)
  );

  let addMemberQuery = $state('');
  let addMemberRole = $state<'editor' | 'commenter'>('editor');
  let isOwner = $derived($page.data?.role === 'owner');
</script>

<svelte:head>
  <title>Settings — {$page.data?.project?.name || 'Project'} — DreamForge</title>
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
    <h1 class="text-2xl font-bold">Project Settings</h1>
    <p class="text-sm text-muted-foreground">
      Customize entity fields for {$page.data?.project?.name || 'this project'}
    </p>
  </div>

  <div class="mb-6">
    <label for="entity-type-select" class="mb-2 block text-sm font-medium">Entity Type</label>
    <div class="flex flex-wrap gap-2">
      {#each entityTypes as et}
        <button
          class="rounded-lg border px-3 py-1.5 text-sm {selectedType === et
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border hover:bg-secondary'}"
          onclick={() => (selectedType = et)}
        >
          {ENTITY_LABELS[et]}
        </button>
      {/each}
    </div>
  </div>

  <div class="mb-8 rounded-lg border border-border bg-card p-4">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
      <Settings class="h-4 w-4" />
      Custom Fields — {ENTITY_LABELS[selectedType]}
    </h2>

    {#if typeFields.length === 0}
      <p class="mb-4 text-sm text-muted-foreground">
        No custom fields defined for this entity type.
      </p>
    {:else}
      <div class="mb-4 space-y-2">
        {#each typeFields as field}
          <div class="flex items-center justify-between rounded border border-border px-3 py-2">
            <div class="flex-1">
              <span class="font-medium">{field.label}</span>
              <span class="ml-2 text-xs text-muted-foreground">
                ({field.key} — {field.fieldType}{#if field.required}, required{/if})
              </span>
              {#if field.placeholder}
                <span class="ml-2 text-xs text-muted-foreground"
                  >placeholder: "{field.placeholder}"</span
                >
              {/if}
            </div>
            <form method="POST" action="?/deleteField" use:enhance>
              <input type="hidden" name="fieldId" value={field.id} />
              <button
                type="submit"
                class="rounded p-1 text-destructive hover:bg-destructive/10"
                aria-label="Delete field"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </form>
          </div>
        {/each}
      </div>
    {/if}

    <div class="border-t border-border pt-4">
      <h3 class="mb-3 text-sm font-medium">Add New Field</h3>
      <form
        method="POST"
        action="?/addField"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              resetForm();
              await update();
            }
          };
        }}
        class="space-y-3"
      >
        <input type="hidden" name="entityType" value={selectedType} />

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="field-label" class="block text-xs text-muted-foreground mb-1">Label</label>
            <input
              id="field-label"
              name="label"
              type="text"
              required
              bind:value={newLabel}
              oninput={deriveKey}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              placeholder="e.g. Age"
            />
          </div>
          <div>
            <label for="field-key" class="block text-xs text-muted-foreground mb-1">Key</label>
            <input
              id="field-key"
              name="key"
              type="text"
              required
              bind:value={newKey}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm font-mono"
              placeholder="e.g. age"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="field-type" class="block text-xs text-muted-foreground mb-1"
              >Field Type</label
            >
            <select
              id="field-type"
              name="fieldType"
              bind:value={newFieldType}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              {#each fieldTypes as ft}
                <option value={ft.value}>{ft.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="field-placeholder" class="block text-xs text-muted-foreground mb-1"
              >Placeholder</label
            >
            <input
              id="field-placeholder"
              name="placeholder"
              type="text"
              bind:value={newPlaceholder}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              placeholder="Optional placeholder"
            />
          </div>
        </div>

        {#if newFieldType === 'entityRef'}
          <div>
            <label for="ref-entity-type" class="block text-xs text-muted-foreground mb-1"
              >Referenced Entity Type</label
            >
            <select
              id="ref-entity-type"
              name="refEntityType"
              bind:value={newRefEntityType}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Select type...</option>
              {#each entityTypes as et}
                <option value={et}>{ENTITY_LABELS[et]}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="flex items-center gap-2">
          <input
            id="field-required"
            type="checkbox"
            name="required"
            value="true"
            bind:checked={newRequired}
            class="rounded border-input"
          />
          <label for="field-required" class="text-sm">Required</label>
        </div>

        <button
          type="submit"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus class="h-4 w-4" />
          Add Field
        </button>
      </form>
    </div>
  </div>

  {#if isOwner}
    <div class="mb-8 rounded-lg border border-border bg-card p-4">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Users class="h-4 w-4" />
        Members
      </h2>

      {#if ($page.data?.members || []).length === 0}
        <p class="mb-4 text-sm text-muted-foreground">
          No members added yet. Only you have access.
        </p>
      {:else}
        <div class="mb-4 space-y-2">
          {#each $page.data.members as member}
            <div class="flex items-center justify-between rounded border border-border px-3 py-2">
              <div class="flex items-center gap-3">
                <div>
                  <span class="font-medium text-sm">{member.username}</span>
                  <span class="ml-2 text-xs text-muted-foreground">{member.email}</span>
                </div>
                <form method="POST" action="?/updateMemberRole" use:enhance>
                  <input type="hidden" name="userId" value={member.userId} />
                  <select
                    name="role"
                    value={member.role}
                    onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
                    class="rounded border border-input bg-background px-2 py-0.5 text-xs"
                  >
                    <option value="editor">Editor</option>
                    <option value="commenter">Commenter</option>
                  </select>
                </form>
              </div>
              <form method="POST" action="?/removeMember" use:enhance>
                <input type="hidden" name="userId" value={member.userId} />
                <button
                  type="submit"
                  class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label="Remove member"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </form>
            </div>
          {/each}
        </div>
      {/if}

      <div class="border-t border-border pt-4">
        <h3 class="mb-3 text-sm font-medium">Add Member</h3>
        <form
          method="POST"
          action="?/addMember"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                addMemberQuery = '';
                update();
              }
            };
          }}
          class="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div class="flex-1">
            <label for="member-query" class="block text-xs text-muted-foreground mb-1"
              >Email or username</label
            >
            <input
              id="member-query"
              name="query"
              type="text"
              required
              bind:value={addMemberQuery}
              placeholder="user@example.com or username"
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label for="member-role" class="block text-xs text-muted-foreground mb-1">Role</label>
            <select
              id="member-role"
              name="role"
              bind:value={addMemberRole}
              class="rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
            </select>
          </div>
          <button
            type="submit"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <UserPlus class="h-4 w-4" />
            Add
          </button>
        </form>
        <p class="mt-2 text-xs text-muted-foreground">
          Editors can view and edit content. Commenters can view and leave comments.
        </p>
      </div>
    </div>
  {/if}
</div>
