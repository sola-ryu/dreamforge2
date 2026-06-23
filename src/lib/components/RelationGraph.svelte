<script lang="ts">
  import cytoscape from 'cytoscape';
  import fcose from 'cytoscape-fcose';
  import avsdf from 'cytoscape-avsdf';
  import { goto } from '$app/navigation';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from '$lib/components/ui/select';

  cytoscape.use(fcose);
  cytoscape.use(avsdf);

  let {
    entities = [],
    relations = [],
    projectId = '',
    class: className = '',
    ...restProps
  }: {
    entities: { id: string; name: string; type: string }[];
    relations: {
      sourceId: string;
      targetId: string;
      label?: string;
      relationType: string;
      id: string;
    }[];
    projectId: string;
    class?: string;
  } = $props();

  let container: HTMLDivElement;
  let cy: cytoscape.Core | null = null;
  let layoutName = $state('fcose');

  const entityColors: Record<string, string> = {
    character: '#6366f1',
    organization: '#f59e0b',
    location: '#10b981',
    culture: '#ec4899',
    species: '#8b5cf6',
    item: '#14b8a6',
    note: '#6b7280'
  };

  const relationColors: Record<string, string> = {
    related_to: '#aeb3ba',
    member_of: '#3b82f6',
    leader_of: '#2563eb',
    owns: '#7c3aed',
    home: '#059669',
    enemy: '#dc2626',
    ally: '#0d9488',
    parent: '#8b5cf6',
    child: '#a78bfa',
    sibling: '#c084fc',
    mentor: '#06b6d4',
    student: '#22d3ee',
    friend: '#14b8a6',
    lover: '#e11d48',
    rival: '#f97316',
    located_in: '#10b981',
    part_of: '#34d399',
    created_by: '#d97706',
    used_by: '#f59e0b'
  };

  const relationDash: Record<string, string> = {
    mentor: '6 3',
    student: '6 3',
    parent: '4 2',
    child: '4 2',
    sibling: '4 2',
    enemy: '2 2',
    rival: '2 2'
  };

  function buildGraph() {
    if (!container) return;

    if (cy) {
      cy.destroy();
      cy = null;
    }

    if (entities.length === 0) return;

    const entityMap = new Map(entities.map((e) => [e.id, e]));

    const relatedIds = new Set<string>();
    for (const r of relations) {
      if (entityMap.has(r.sourceId)) relatedIds.add(r.sourceId);
      if (entityMap.has(r.targetId)) relatedIds.add(r.targetId);
    }

    const nodes = entities
      .filter((e) => relatedIds.has(e.id))
      .map((e) => ({
        data: { id: e.id, name: e.name, type: e.type }
      }));

    const edges = relations
      .filter((r) => entityMap.has(r.sourceId) && entityMap.has(r.targetId))
      .map((r) => ({
        data: {
          id: r.id,
          source: r.sourceId,
          target: r.targetId,
          label: r.label || r.relationType.replace(/_/g, ' '),
          relationType: r.relationType
        }
      }));

    cy = cytoscape({
      container,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => entityColors[ele.data('type')] || '#6b7280',
            label: 'data(name)',
            color: '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 500,
            width: 140,
            'padding-left': 12,
            'padding-right': 12,
            height: 20,
            shape: 'round-rectangle',
            'border-width': 2,
            'border-color': (ele: any) => {
              return entityColors[ele.data('type')] || '#6b7280';
            },
            'border-opacity': 0.5
          }
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': (ele: any) => relationColors[ele.data('relationType')] || '#94a3b8',
            'target-arrow-color': (ele: any) =>
              relationColors[ele.data('relationType')] || '#94a3b8',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            'text-margin-y': -6,
            color: '#94a3b8',
            'line-style': (ele: any) =>
              relationDash[ele.data('relationType')] ? 'dashed' : 'solid',
            'line-dash-pattern': (ele: any) => {
              const d = relationDash[ele.data('relationType')];
              return d || '';
            }
          }
        }
      ] as any,
      elements: [...nodes, ...edges],
      layout: buildLayoutOptions(layoutName)
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      goto(`/projects/${projectId}/${node.data('type')}/${node.data('id')}`);
    });
  }

  function buildLayoutOptions(name: string) {
    const base: Record<string, any> = { name, animate: false };
    if (name === 'avsdf') {
      base.nodeSeparation = 140;
      base.padding = 20;
    }
    return base;
  }

  function updateLayout(name: string) {
    layoutName = name;
    if (!cy) return;
    cy.layout({ ...buildLayoutOptions(name), animate: true, animationDuration: 500 }).run();
  }

  $effect(() => {
    entities;
    relations;
    layoutName;
    buildGraph();
  });
</script>

<div class="space-y-2 {className}" {...restProps}>
  <div class="flex items-center gap-2">
    <span class="text-xs text-muted-foreground">Layout:</span>
    <Select type="single" value={layoutName} onValueChange={(v: string) => updateLayout(v)}>
      <SelectTrigger class="h-7 w-32 text-xs">
        <SelectValue placeholder="Select layout..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fcose">fcose</SelectItem>
        <SelectItem value="concentric">Concentric</SelectItem>
        <SelectItem value="avsdf">Circle (AVSDF)</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div
    class="overflow-hidden rounded-lg border border-border bg-card"
    class:min-h-[300px]={entities.length === 0}
  >
    <div bind:this={container} style="width: 100%; height: 450px;"></div>
  </div>
</div>
