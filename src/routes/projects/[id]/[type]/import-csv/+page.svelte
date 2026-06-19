<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import type { EntityType } from '$lib/types';
  import { ArrowLeft, Upload, Download } from 'lucide-svelte';

  let csvHeaders = $state<string[]>([]);
  let preview = $state<Record<string, string>[]>([]);
  let rawData = $state('');
  let mapping = $state<Record<string, string>>({});
  let importResult = $state<{ created: number; updated: number; errors?: string[] } | null>(null);
  let uploading = $state(false);

  function buildAutoMapping(headers: string[], targetKeys: string[]) {
    const m: Record<string, string> = {};
    for (const h of headers) {
      const hLower = h.toLowerCase().trim();
      const match = targetKeys.find((k) => k.toLowerCase() === hLower);
      if (match) {
        m[h] = match;
      } else {
        m[h] = '';
      }
    }
    return m;
  }

  function downloadCsv() {
    const route = entityTypeToRoute($page.data?.entityType || 'character');
    window.open(`/projects/${$page.params.id}/${route}/export-csv`, '_blank');
  }
</script>

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
      <button class="underline cursor-pointer" onclick={downloadCsv}>Download a CSV template</button
      >.
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
      <div class="mt-4">
        <button
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onclick={() => {
            importResult = null;
            csvHeaders = [];
            preview = [];
            rawData = '';
            mapping = {};
          }}
        >
          Import Another File
        </button>
        <button
          class="ml-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
          onclick={() => {
            const route = entityTypeToRoute($page.data?.entityType || 'character');
            goto(`/projects/${$page.params.id}/${route}`);
          }}
        >
          Back to List
        </button>
      </div>
    </div>
  {:else if csvHeaders.length > 0}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 class="mb-4 text-lg font-semibold">Map Columns</h2>
      <p class="mb-4 text-xs text-muted-foreground">
        Map CSV columns to entity fields. Leave blank to skip a column.
      </p>

      <form
        method="POST"
        action="?/execute"
        use:enhance={() => {
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

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="px-2 py-1 text-left text-xs text-muted-foreground font-medium"
                  >CSV Column</th
                >
                <th class="px-2 py-1 text-left text-xs text-muted-foreground font-medium"
                  >Map to Field</th
                >
                {#each preview[0] ? Object.keys(preview[0]) : [] as col}
                  <th
                    class="px-2 py-1 text-xs text-muted-foreground font-medium max-w-[120px] truncate"
                    >{col}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each csvHeaders as header, i}
                <tr class="border-b border-border/50">
                  <td class="px-2 py-1.5 font-mono text-xs">{header}</td>
                  <td class="px-2 py-1.5">
                    <select
                      class="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                      value={mapping[header] || ''}
                      onchange={(e) => {
                        mapping = { ...mapping, [header]: (e.target as HTMLSelectElement).value };
                      }}
                    >
                      <option value="">— Skip —</option>
                      {#each $page.data?.targetFields || [] as field}
                        <option value={field.key}>{field.label}</option>
                      {/each}
                    </select>
                  </td>
                  {#each preview[0] ? Object.keys(preview[0]) : [] as col}
                    <td class="px-2 py-1.5 text-xs max-w-[120px] truncate"
                      >{preview[i]?.[col] || ''}</td
                    >
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted-foreground">
          Showing {preview.length} of {JSON.parse(rawData || '[]').length} rows.
        </p>

        <div class="flex gap-2">
          <button
            type="submit"
            disabled={uploading}
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Import Data'}
          </button>
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => {
              csvHeaders = [];
              preview = [];
              rawData = '';
              mapping = {};
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <h3 class="mb-2 text-sm font-medium">Preview</h3>
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
              const targetKeys = ($page.data?.targetFields || []).map((f: any) => f.key);
              mapping = buildAutoMapping(d.csvHeaders, targetKeys);
            }
          };
        }}
        class="space-y-4"
      >
        <div
          class="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8"
        >
          <label class="flex cursor-pointer flex-col items-center gap-2">
            <Upload class="h-8 w-8 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">Click to upload a CSV file</span>
            <input
              type="file"
              name="file"
              accept=".csv"
              required
              class="hidden"
              onchange={() => {
                uploading = true;
              }}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={uploading}
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload & Preview'}
        </button>
      </form>
    </div>
  {/if}
</div>
