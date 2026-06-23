<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Plus, Trash2, Share2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { ComboboxRich } from '$lib/components/ui/combobox';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from '$lib/components/ui/select';
  import RelationGraph from '$lib/components/RelationGraph.svelte';

  let showCreate = $state(false);
  let sourceId = $state('');
  let targetId = $state('');
  let relationType = $state('related_to');
  let label = $state('');

  const relationTypes = [
    'related_to',
    'member_of',
    'leader_of',
    'owns',
    'home',
    'enemy',
    'ally',
    'parent',
    'child',
    'sibling',
    'mentor',
    'student',
    'friend',
    'lover',
    'rival',
    'located_in',
    'part_of',
    'created_by',
    'used_by'
  ];

  let entityOptions = $derived(
    ($page.data?.entities || []).map((e: any) => ({
      value: e.id,
      label: e.name,
      group: e.type as string,
      entity: e
    }))
  );
</script>

<svelte:head>
  <title>Relations — {$page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Relations</h1>
      <p class="text-sm text-muted-foreground">{$page.data?.projectName || 'Project'}</p>
    </div>
    <Button onclick={() => (showCreate = !showCreate)}>
      <Plus class="h-4 w-4" /> Add Relation
    </Button>
  </div>

  {#if showCreate}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              showCreate = false;
              await update();
            }
          };
        }}
        class="space-y-3"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="sourceId">Source Entity</Label>
            <ComboboxRich
              name="sourceId"
              bind:value={sourceId}
              options={entityOptions}
              placeholder="Select..."
            />
          </div>
          <div class="space-y-1.5">
            <Label for="targetId">Target Entity</Label>
            <ComboboxRich
              name="targetId"
              bind:value={targetId}
              options={entityOptions}
              placeholder="Select..."
            />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="relationType">Relation Type</Label>
            <Select type="single" bind:value={relationType}>
              <SelectTrigger id="relationType" class="w-full">
                <SelectValue placeholder="Select relation..." />
              </SelectTrigger>
              <SelectContent>
                {#each relationTypes as rt}
                  <SelectItem value={rt}>{rt.replace(/_/g, ' ')}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
            <input type="hidden" name="relationType" value={relationType} />
          </div>
          <div class="space-y-1.5">
            <Label for="label">Label (optional)</Label>
            <Input id="label" name="label" type="text" bind:value={label} />
          </div>
        </div>
        <div class="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onclick={() => (showCreate = false)}
            >Cancel</Button
          >
        </div>
      </form>
    </div>
  {/if}

  <RelationGraph
    class="mb-4"
    entities={$page.data?.entities || []}
    relations={$page.data?.relations || []}
    projectId={$page.params.id || ''}
  />

  <!-- List -->
  <div class="space-y-2">
    {#each $page.data?.relations || [] as rel}
      {@const source = ($page.data?.entities || []).find((e: any) => e.id === rel.sourceId)}
      {@const target = ($page.data?.entities || []).find((e: any) => e.id === rel.targetId)}
      <div
        class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
      >
        <div class="flex items-center gap-3 text-sm">
          <Share2 class="h-4 w-4 text-muted-foreground" />
          {#if source}
            <a
              href="/projects/{$page.params.id}/{source.type}/{source.id}"
              class="font-medium hover:underline">{source.name}</a
            >
          {:else}
            <span class="font-medium">{rel.sourceId}</span>
          {/if}
          <span class="text-muted-foreground italic"
            >{rel.label || rel.relationType.replace(/_/g, ' ')}</span
          >
          {#if target}
            <a
              href="/projects/{$page.params.id}/{target.type}/{target.id}"
              class="font-medium hover:underline">{target.name}</a
            >
          {:else}
            <span class="font-medium">{rel.targetId}</span>
          {/if}
        </div>
        <form method="POST" action="?/delete">
          <input type="hidden" name="relId" value={rel.id} />
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete relation">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </form>
      </div>
    {/each}
    {#if ($page.data?.relations || []).length === 0}
      <p class="py-12 text-center text-muted-foreground">
        No relations yet. Add one to start mapping your world.
      </p>
    {/if}
  </div>
</div>
