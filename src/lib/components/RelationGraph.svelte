<script lang="ts">
  import * as d3 from 'd3';
  import { goto } from '$app/navigation';
  import type { EntityType } from '$lib/types';

  let {
    entities = [],
    relations = [],
    projectId = '',
    ...restProps
  }: {
    entities: { id: string; name: string; type: EntityType }[];
    relations: { sourceId: string; targetId: string; label?: string; relationType: string; id: string }[];
    projectId: string;
  } = $props();

  let svgEl: SVGSVGElement;

  function buildGraph() {
    if (!svgEl) return;

    const allEntities = entities;
    const entityMap = new Map(allEntities.map((e) => [e.id, e]));

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
      .attr('markerWidth', '6')
      .attr('markerHeight', '4')
      .attr('refX', '5')
      .attr('refY', '2')
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 6 2, 0 4')
      .attr('fill', 'var(--muted-foreground)');

    const typeKeys = [...new Set(nodes.map((n) => n.type))];
    const clusterRadius = Math.min(W, H) * 0.3;
    const typePositions: Record<string, { x: number; y: number }> = {};
    typeKeys.forEach((type, i) => {
      const angle = (2 * Math.PI * i) / typeKeys.length - Math.PI / 2;
      typePositions[type] = {
        x: W / 2 + clusterRadius * Math.cos(angle),
        y: H / 2 + clusterRadius * Math.sin(angle),
      };
    });

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(120)
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-150))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.2))
      .force('collision', d3.forceCollide<SimNode>(60))
      .force(
        'x',
        d3.forceX<SimNode>((d) => typePositions[d.type]?.x ?? W / 2).strength(0.12)
      )
      .force(
        'y',
        d3.forceY<SimNode>((d) => typePositions[d.type]?.y ?? H / 2).strength(0.12)
      )
      .stop();

    for (let i = 0; i < 350; i++) simulation.tick();

    const stretchX = 1.8;
    const cx = W / 2;
    for (const n of nodes) {
      n.x = cx + ((n.x ?? cx) - cx) * stretchX;
    }

    const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));
    for (const n of nodes) {
      n.x = clamp(n.x ?? cx, nodeW / 2 + 4, W - nodeW / 2 - 4);
      n.y = clamp(n.y ?? H / 2, nodeH / 2 + 4, H - nodeH / 2 - 4);
    }

    const edgeGroup = svg.append('g');
    const edgeLabelGroup = svg.append('g');
    const nodeGroup = svg.append('g');

    for (const link of links) {
      const src = nodeMap.get(
        typeof link.source === 'string' ? link.source : (link.source as SimNode).id
      );
      const tgt = nodeMap.get(
        typeof link.target === 'string' ? link.target : (link.target as SimNode).id
      );
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
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', '1.5')
        .attr('stroke-opacity', '0.6')
        .attr('marker-end', 'url(#arrowhead)');

      edgeLabelGroup
        .append('text')
        .attr('x', (x1 + x2) / 2)
        .attr('y', (y1 + y2) / 2 - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--muted-foreground)')
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
        .attr('fill', 'var(--card)')
        .attr('stroke', 'var(--border)')
        .attr('stroke-width', '1.5');

      g.append('text')
        .attr('x', nodeW / 2)
        .attr('y', nodeH / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'var(--foreground)')
        .attr('font-size', '11')
        .attr('font-weight', '500')
        .text(node.name.length > 14 ? node.name.slice(0, 14) + '…' : node.name);

      g.append('text')
        .attr('x', nodeW / 2)
        .attr('y', nodeH / 2 + 8)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'var(--muted-foreground)')
        .attr('font-size', '9')
        .text(node.type);
    }
  }

  $effect(buildGraph);
</script>

<div class="overflow-hidden rounded-lg border border-border bg-card" {...restProps}>
  <svg bind:this={svgEl} width="100%" height="450" class="bg-card"></svg>
</div>
