<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import type { EntityType } from '$lib/types';
  import { ArrowLeft, Upload } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';

  const FIELD_TYPE_OPTIONS = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text (long)' },
    { value: 'number', label: 'Number' },
    { value: 'tags', label: 'Tags' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'markdown', label: 'Markdown' }
  ];

  let csvHeaders = $state<string[]>([]);
  let preview = $state<Record<string, string>[]>([]);
  let rawData = $state('');
  let mapping = $state<Record<string, string>>({});
  let newFields = $state<Record<string, { label: string; type: string }>>({});
  let importResult = $state<{ created: number; updated: number; errors?: string[] } | null>(null);
  let uploading = $state(false);

  function buildAutoMapping(headers: string[], targetKeys: string[]) {
    const m: Record<string, string> = {};
    for (const h of headers) {
      const hLower = h.toLowerCase().trim();
      const match = targetKeys.find((k) => k.toLowerCase() === hLower);
      m[h] = match ?? '';
    }
    return m;
  }

  function downloadCsv() {
    const route = entityTypeToRoute($page.data?.entityType || 'character');
    window.open(`/projects/${$page.params.id}/${route}/export-csv`, '_blank');
  }

  function onMappingChange(header: string, value: string) {
    mapping = { ...mapping, [header]: value };
    if (value === '__new__' && !newFields[header]) {
      newFields = { ...newFields, [header]: { label: header, type: 'text' } };
    } else if (value !== '__new__') {
      const updated = { ...newFields };
      delete updated[header];
      newFields = updated;
    }
  }
</script>

<svelte:head>
  <title
    >Import CSV — {$page.data?.entityType
      ? ENTITY_PLURAL[$page.data.entityType as EntityType]
      : 'Entities'} — {$page.data?.projectName || 'Project'} — DreamForge</title
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
        ? ENTITY_PLURAL[$page.data.entityType as EntityType]
        : 'Entities'}
    </a>
    <h1 class="text-2xl font-bold">Import CSV</h1>
    <p class="text-sm text-muted-foreground">
      Upload a CSV file to create or update {$page.data?.entityType
        ? ENTITY_PLURAL[$page.data.entityType as EntityType].toLowerCase()
        : 'entities'}. Rows are matched by ID first, then by name.
      <Button variant="link" class="h-auto p-0 text-sm" onclick={downloadCsv}>Download a CSV template</Button>.
    </p>
  </div>

  {#if importResult}
    <div class="mb-6 rounded-lg border border-border bg-card p-6">
      <h2 class="mb-2 text-lg font-semibold">Import Complete</h2>
      <p class="text-sm text-muted-foreground">
        Created: {importResult.created} &middot; Updated: {importResult.updated}
      </p>
      {#if importResult.errors && importResult.errors.length > 0}
        <div class="mt-4">
          <p class="mb-2 text-sm font-medium text-destructive">Errors:</p>
          <ul class="space-y-1">
            {#each importResult.errors as err}
              <li class="text-xs text-destructive">{err}</li>
            {/each}
          </ul>
        </div>
      {/if}
      <div class="mt-4 flex gap-2">
        <Button
          onclick={() => {
            importResult = null;
            csvHeaders = [];
            preview = [];
            rawData = '';
            mapping = {};
            newFields = {};
          }}
        >
          Import Another File
        </Button>
        <Button
          variant="outline"
          onclick={() => {
            const route = entityTypeToRoute($page.data?.entityType || 'character');
            goto(`/projects/${$page.params.id}/${route}`);
          }}
        >
          Back to List
        </Button>
      </div>
    </div>
  {:else if csvHeaders.length > 0}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 class="mb-4 text-lg font-semibold">Map Columns</h2>
      <p class="mb-4 text-xs text-muted-foreground">
        Map CSV columns to entity fields. Choose "New field..." to create a new field from a column.
        Leave blank to skip.
      </p>

      <form
        method="POST"
        action="?/execute"
        use:enhance={() => {
          uploading = true;
          return async ({ result }) => {
            uploading = false;
            if (result.type === 'success') {
              const d = result.data as { created: number; updated: number; errors?: string[] };
              importResult = { created: d.created, updated: d.updated, errors: d.errors };
            }
          };
        }}
        class="space-y-3"
      >
        <input type="hidden" name="data" value={rawData} />
        <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
        <input type="hidden" name="newFieldDefs" value={JSON.stringify(newFields)} />

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="px-2 py-1 text-left text-xs text-muted-foreground font-medium">CSV Column</th>
                <th class="px-2 py-1 text-left text-xs text-muted-foreground font-medium">Map to Field</th>
                <th class="px-2 py-1 text-left text-xs text-muted-foreground font-medium">Preview</th>
              </tr>
            </thead>
            <tbody>
              {#each csvHeaders as header}
                <tr class="border-b border-border/50">
                  <td class="px-2 py-1.5 font-mono text-xs align-top pt-3">{header}</td>
                  <td class="px-2 py-1.5 align-top">
                    <select
                      class="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                      value={mapping[header] || ''}
                      onchange={(e) =>
                        onMappingChange(header, (e.target as HTMLSelectElement).value)}
                    >
                      <option value="">— Skip —</option>
                      <option value="__new__">— New field... —</option>
                      {#each $page.data?.targetFields || [] as field}
                        <option value={field.key}>{field.label}</option>
                      {/each}
                    </select>
                    {#if mapping[header] === '__new__'}
                      <div class="mt-1.5 space-y-1">
                        <input
                          type="text"
                          class="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                          placeholder="Field label"
                          value={newFields[header]?.label ?? header}
                          oninput={(e) => {
                            newFields = {
                              ...newFields,
                              [header]: {
                                ...newFields[header],
                                label: (e.target as HTMLInputElement).value
                              }
                            };
                          }}
                        />
                        <select
                          class="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                          value={newFields[header]?.type ?? 'text'}
                          onchange={(e) => {
                            newFields = {
                              ...newFields,
                              [header]: {
                                ...newFields[header],
                                type: (e.target as HTMLSelectElement).value
                              }
                            };
                          }}
                        >
                          {#each FIELD_TYPE_OPTIONS as opt}
                            <option value={opt.value}>{opt.label}</option>
                          {/each}
                        </select>
                      </div>
                    {/if}
                  </td>
                  <td class="px-2 py-1.5 text-xs text-muted-foreground align-top pt-3 max-w-[200px]">
                    <div class="space-y-0.5">
                      {#each preview.slice(0, 3) as row}
                        <div class="truncate">{row[header] || ''}</div>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted-foreground">
          Showing {preview.length} preview rows of {JSON.parse(rawData || '[]').length} total.
        </p>

        <div class="flex gap-2">
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Importing...' : 'Import Data'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onclick={() => {
              csvHeaders = [];
              preview = [];
              rawData = '';
              mapping = {};
              newFields = {};
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <h3 class="mb-2 text-sm font-medium">Data Preview</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border">
              {#each csvHeaders as header}
                <th class="px-2 py-1 text-left text-muted-foreground font-medium">{header}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each preview as row}
              <tr class="border-b border-border/50">
                {#each csvHeaders as header}
                  <td class="px-2 py-1 max-w-[150px] truncate">{row[header] || ''}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <div class="rounded-lg border border-border bg-card p-6">
      <form
        method="POST"
        action="?/preview"
        enctype="multipart/form-data"
        use:enhance={() => {
          uploading = true;
          return async ({ result }) => {
            uploading = false;
            if (result.type === 'success') {
              const d = result.data as {
                csvHeaders: string[];
                preview: Record<string, string>[];
                data: string;
              };
              csvHeaders = d.csvHeaders;
              preview = d.preview;
              rawData = d.data;
              const targetKeys = ($page.data?.targetFields || []).map(
                (f: { key: string }) => f.key
              );
              mapping = buildAutoMapping(d.csvHeaders, targetKeys);
            }
          };
        }}
        class="space-y-4"
      >
        {#if uploading}
          <div
            class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 gap-2"
          >
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            ></div>
            <span class="text-sm text-muted-foreground">Uploading...</span>
          </div>
        {:else}
          <label
            class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 hover:border-primary/50 transition-colors"
          >
            <Upload class="h-8 w-8 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">Click to upload a CSV file</span>
            <span class="text-xs text-muted-foreground/60">.csv files only</span>
            <input
              type="file"
              name="file"
              accept=".csv"
              required
              class="hidden"
              onchange={(e) => {
                const form = (e.target as HTMLInputElement).form;
                if (form) form.requestSubmit();
              }}
            />
          </label>
        {/if}
      </form>
    </div>
  {/if}
</div>
