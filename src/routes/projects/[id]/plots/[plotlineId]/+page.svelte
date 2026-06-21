<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { ArrowLeft, Save } from '@lucide/svelte';
  import PlotTimeline from '$lib/components/PlotTimeline.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  let isSaving = $state(false);

  let scenes = $derived(
    ($page.data?.chapters || []).flatMap((ch: any) =>
      (ch.scenes || []).map((s: any) => ({ ...s, chapterTitle: ch.title }))
    )
  );

  async function handleReorder(beatTitles: string[]) {
    const form = new FormData();
    form.set('beatTitles', JSON.stringify(beatTitles));
    await fetch('?/reorderBeats', { method: 'POST', body: form });
    window.location.reload();
  }

  async function handleLinkScene(beatTitle: string, sceneId: string | null) {
    const form = new FormData();
    form.set('beatTitle', beatTitle);
    form.set('sceneId', sceneId || '');
    await fetch('?/linkScene', { method: 'POST', body: form });
    window.location.reload();
  }
</script>

<svelte:head>
  <title
    >{$page.data?.plotline?.title || 'Plotline'} — {$page.data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}/plots"
      class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to Plotlines
    </a>
  </div>

  <form method="POST" action="?/update" use:enhance class="mb-6">
    <div class="flex items-center justify-between">
      <input
        type="text"
        name="title"
        value={$page.data?.plotline?.title || ''}
        class="border-0 bg-transparent text-2xl font-bold outline-none"
      />
      <div class="flex items-center gap-2">
        {#if $page.data?.plotline?.template}
          <Badge variant="secondary">{$page.data.plotline.template}</Badge>
        {/if}
        <Button type="submit" onclick={() => (isSaving = true)}>
          <Save class="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  </form>

  <div class="rounded-lg border border-border bg-card p-4">
    <h2 class="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">Beats</h2>
    <PlotTimeline
      beats={$page.data?.plotline?.beats || []}
      {scenes}
      onReorder={handleReorder}
      onLinkScene={handleLinkScene}
    />
  </div>
</div>
