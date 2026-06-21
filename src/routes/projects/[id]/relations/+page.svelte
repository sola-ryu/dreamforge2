<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import * as d3 from 'd3';
  import type { EntityType } from '$lib/types';
  import { Plus, Trash2, Share2 } from '@lucide/svelte';

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

  const entityTypeOrder: EntityType[] = [
    'character',
    'organization',
    'location',
    'culture',
    'species',
    'item',
    'note'
  ];

  let svgEl: SVGSVGElement;

  function entitiesByType(entities: { id: string; name: string; type: EntityType }[]) {
    const grouped = new Map<EntityType, typeof entities>();
    for (const t of entityTypeOrder) grouped.set(t, []);
    for (const e of entities) {
      grouped.get(e.type as EntityType)?.push(e);
    }
    return grouped;
  }

  function buildGraph() {
    if (!svgEl || !$page.data?.relations) return;
    const relations = $page.data.relations;
    const allEntities: { id: string; name: string; type: EntityType }[] =
      $page.data.entities || [];
    const entityMap = new Map(allEntities.map((e) => [e.id, e]));
    const projectId = $page.params.id;

    type SimNode = d3.SimulationNodeDatum & {
      id: string;
      name: string;
      type: string;
    };
    type SimLink = d3.SimulationLinkDatum<SimNode> & { label: string };

    const nodeMap = new Map<string, SimNode>();
    const links: SimLink[] = [];

    for (const rel of relations) {
      if (!nodeMap.has(rel.sourceId) && entityMap.has(rel.sourceId)) {
        const e = entityMap.get(rel.sourceId)!;
        nodeMap.set(rel.sourceId, { id: e.id, name: e.name, type: e.type });
      }
      if (!nodeMap.has(rel.targetId) && entityMap.has(rel.targetId)) {
        const e = entityMap.get(rel.targetId)!;
        nodeMap.set(rel.targetId, { id: e.id, name: e.name, type: e.type });
      }
      links.push({
        source: rel.sourceId,
        target: rel.targetId,
        label: rel.label || rel.relationType.replace(/_/g, ' ')
      });
    }

    const nodes = [...nodeMap.values()];
    if (nodes.length === 0) {
      svgEl.innerHTML = '';
      return;
    }

    const svgRect = svgEl.getBoundingClientRect();
    const W = svgRect.width || 800;
    const H = 450;
    const nodeW = 100;
    const nodeH = 36;

    svgEl.innerHTML = '';

    const svg = d3.select(svgEl);

    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', '10')
      .attr('markerHeight', '7')
      .attr('refX', '10')
      .attr('refY', '3.5')
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', 'hsl(var(--muted-foreground))');

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(180)
          .strength(0.8)
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<SimNode>(80))
      .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));
    for (const n of nodes) {
      n.x = clamp(n.x ?? W / 2, nodeW / 2 + 4, W - nodeW / 2 - 4);
      n.y = clamp(n.y ?? H / 2, nodeH / 2 + 4, H - nodeH / 2 - 4);
    }

    const edgeGroup = svg.append('g');
    const edgeLabelGroup = svg.append('g');
    const nodeGroup = svg.append('g');

    for (const link of links) {
      const src = nodeMap.get(typeof link.source === 'string' ? link.source : (link.source as SimNode).id);
      const tgt = nodeMap.get(typeof link.target === 'string' ? link.target : (link.target as SimNode).id);
      if (!src || !tgt) continue;

      const x1 = (src.x ?? 0) + nodeW / 2;
      const y1 = (src.y ?? 0) + nodeH / 2;
      const x2 = (tgt.x ?? 0) + nodeW / 2;
      const y2 = (tgt.y ?? 0) + nodeH / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ex2 = x2 - (dx / len) * (nodeW / 2 + 6);
      const ey2 = y2 - (dy / len) * (nodeH / 2 + 6);

      edgeGroup
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', ex2)
        .attr('y2', ey2)
        .attr('stroke', 'hsl(var(--muted-foreground))')
        .attr('stroke-width', '1.5')
        .attr('stroke-opacity', '0.6')
        .attr('marker-end', 'url(#arrowhead)');

      edgeLabelGroup
        .append('text')
        .attr('x', (x1 + x2) / 2)
        .attr('y', (y1 + y2) / 2 - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .attr('font-size', '10')
        .text(link.label);
    }

    for (const node of nodes) {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const entityUrl = `/projects/${projectId}/${node.type}/${node.id}`;

      const g = nodeGroup
        .append('g')
        .attr('transform', `translate(${nx}, ${ny})`)
        .attr('cursor', 'pointer')
        .on('click', () => goto(entityUrl));

      g.append('rect')
        .attr('width', nodeW)
        .attr('height', nodeH)
        .attr('rx', '8')
        .attr('fill', 'hsl(var(--card))')
        .attr('stroke', 'hsl(var(--border))')
        .attr('stroke-width', '1.5');

      g.append('text')
        .attr('x', nodeW / 2)
        .attr('y', nodeH / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'hsl(var(--foreground))')
        .attr('font-size', '11')
        .attr('font-weight', '500')
        .text(node.name.length > 14 ? node.name.slice(0, 14) + '…' : node.name);

      g.append('text')
        .attr('x', nodeW / 2)
        .attr('y', nodeH / 2 + 8)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'hsl(var(--muted-foreground))')
        .attr('font-size', '9')
        .text(node.type);
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
          return async ({ result, update }) => {
            if (result.type === 'success') {
              showCreate = false;
              await update();
              buildGraph();
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
              {#each entityTypeOrder as type}
                {@const group = entitiesByType($page.data?.entities || []).get(type) || []}
                {#if group.length > 0}
                  <optgroup label={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                    {#each group as entity}
                      <option value={entity.id}>{entity.name}</option>
                    {/each}
                  </optgroup>
                {/if}
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
              {#each entityTypeOrder as type}
                {@const group = entitiesByType($page.data?.entities || []).get(type) || []}
                {#if group.length > 0}
                  <optgroup label={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                    {#each group as entity}
                      <option value={entity.id}>{entity.name}</option>
                    {/each}
                  </optgroup>
                {/if}
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
