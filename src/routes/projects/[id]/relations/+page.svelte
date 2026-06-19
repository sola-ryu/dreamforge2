<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import type { EntityType } from '$lib/types';
  import { Plus, Trash2, Share2 } from 'lucide-svelte';

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
    'lover',
    'rival',
    'located_in',
    'part_of',
    'created_by',
    'used_by'
  ];

  let svgEl: SVGSVGElement;

  function buildGraph() {
    if (!svgEl || !$page.data?.relations) return;
    const relations = $page.data.relations;
    const entities: { id: string; name: string; type: EntityType }[] = $page.data.entities || [];
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    const nodes = new Map<
      string,
      { id: string; name: string; type: string; x: number; y: number }
    >();
    const edges: Array<{ source: string; target: string; label: string }> = [];

    for (const rel of relations) {
      if (!nodes.has(rel.sourceId) && entityMap.has(rel.sourceId)) {
        const e = entityMap.get(rel.sourceId)!;
        nodes.set(rel.sourceId, {
          id: e.id,
          name: e.name,
          type: e.type,
          x: Math.random() * 600,
          y: Math.random() * 400
        });
      }
      if (!nodes.has(rel.targetId) && entityMap.has(rel.targetId)) {
        const e = entityMap.get(rel.targetId)!;
        nodes.set(rel.targetId, {
          id: e.id,
          name: e.name,
          type: e.type,
          x: Math.random() * 600,
          y: Math.random() * 400
        });
      }
      edges.push({
        source: rel.sourceId,
        target: rel.targetId,
        label: rel.label || rel.relationType
      });
    }

    const nodeArr = [...nodes.values()];

    const svg = svgEl;
    svg.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
    </marker>`;
    svg.appendChild(defs);

    for (const edge of edges) {
      const src = nodes.get(edge.source);
      const tgt = nodes.get(edge.target);
      if (!src || !tgt) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(src.x + 50));
      line.setAttribute('y1', String(src.y + 20));
      line.setAttribute('x2', String(tgt.x + 50));
      line.setAttribute('y2', String(tgt.y + 20));
      line.setAttribute('stroke', 'hsl(var(--muted-foreground))');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      svg.appendChild(line);
    }

    for (const node of nodeArr) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '40');
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', 'hsl(var(--card))');
      rect.setAttribute('stroke', 'hsl(var(--border))');
      rect.setAttribute('stroke-width', '1');
      g.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '50');
      text.setAttribute('y', '20');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'hsl(var(--foreground))');
      text.setAttribute('font-size', '11');
      text.textContent = node.name.length > 15 ? node.name.slice(0, 15) + '...' : node.name;
      g.appendChild(text);

      svg.appendChild(g);
    }
  }

  onMount(buildGraph);
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
    <button
      class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      onclick={() => (showCreate = !showCreate)}
    >
      <Plus class="h-4 w-4" /> Add Relation
    </button>
  </div>

  {#if showCreate}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === 'success') {
              showCreate = false;
            }
          };
        }}
        class="space-y-3"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="sourceId" class="block text-sm font-medium">Source Entity</label>
            <select
              id="sourceId"
              name="sourceId"
              required
              bind:value={sourceId}
              class="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {#each $page.data?.entities || [] as entity}
                <option value={entity.id}>{entity.name} ({entity.type})</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="targetId" class="block text-sm font-medium">Target Entity</label>
            <select
              id="targetId"
              name="targetId"
              required
              bind:value={targetId}
              class="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {#each $page.data?.entities || [] as entity}
                <option value={entity.id}>{entity.name} ({entity.type})</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label for="relationType" class="block text-sm font-medium">Relation Type</label>
            <select
              id="relationType"
              name="relationType"
              required
              bind:value={relationType}
              class="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              {#each relationTypes as rt}
                <option value={rt}>{rt.replace(/_/g, ' ')}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="label" class="block text-sm font-medium">Label (optional)</label>
            <input
              id="label"
              name="label"
              type="text"
              bind:value={label}
              class="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >Create</button
          >
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => (showCreate = false)}>Cancel</button
          >
        </div>
      </form>
    </div>
  {/if}

  <!-- Graph -->
  <div class="mb-6 overflow-hidden rounded-lg border border-border bg-card">
    <svg bind:this={svgEl} width="100%" height="450" class="bg-card"></svg>
  </div>

  <!-- List -->
  <div class="space-y-2">
    {#each $page.data?.relations || [] as rel}
      <div
        class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
      >
        <div class="flex items-center gap-3 text-sm">
          <Share2 class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium"
            >{($page.data?.entities || []).find((e: any) => e.id === rel.sourceId)?.name ||
              rel.sourceId}</span
          >
          <span class="text-muted-foreground italic"
            >{rel.label || rel.relationType.replace(/_/g, ' ')}</span
          >
          <span class="font-medium"
            >{($page.data?.entities || []).find((e: any) => e.id === rel.targetId)?.name ||
              rel.targetId}</span
          >
        </div>
        <form method="POST" action="?/delete">
          <input type="hidden" name="relId" value={rel.id} />
          <button type="submit" class="rounded p-1 hover:bg-secondary" aria-label="Delete relation"
            ><Trash2 class="h-4 w-4 text-destructive" /></button
          >
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
