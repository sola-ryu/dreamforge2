<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { ArrowLeft, Save } from '@lucide/svelte';
  import PlotTimeline from '$lib/components/PlotTimeline.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { countWords } from '$lib/utils/wordCount';

  let scenes = $derived(
    (page.data?.chapters || []).flatMap((ch: any) =>
      (ch.scenes || []).map((s: any) => ({
        ...s,
        chapterTitle: ch.title,
        wordCount: countWords(s.body)
      }))
    )
  );

  let beats = $derived(page.data?.plotline?.beats || []);
  let linkedBeats = $derived(beats.filter((b: { sceneId: string | null }) => b.sceneId).length);

  function sceneHref(sceneId: string) {
    return `/projects/${page.params.id}/stories/${page.data?.plotline?.storyId}?scene=${sceneId}`;
  }

  async function handleReorder(beatIds: string[]) {
    const form = new FormData();
    form.set('beatIds', JSON.stringify(beatIds));
    await fetch('?/reorderBeats', { method: 'POST', body: form });
    await invalidateAll();
  }

  async function handleLinkScene(beatId: string, sceneId: string | null) {
    const form = new FormData();
    form.set('beatId', beatId);
    form.set('sceneId', sceneId || '');
    await fetch('?/linkScene', { method: 'POST', body: form });
    await invalidateAll();
  }

  async function handleAddBeat(title: string) {
    const form = new FormData();
    form.set('title', title);
    await fetch('?/addBeat', { method: 'POST', body: form });
    await invalidateAll();
  }

  async function handleRenameBeat(beatId: string, title: string) {
    const form = new FormData();
    form.set('beatId', beatId);
    form.set('title', title);
    await fetch('?/renameBeat', { method: 'POST', body: form });
    await invalidateAll();
  }

  async function handleDeleteBeat(beatId: string) {
    const form = new FormData();
    form.set('beatId', beatId);
    await fetch('?/deleteBeat', { method: 'POST', body: form });
    await invalidateAll();
  }
</script>

<svelte:head>
  <title
    >{page.data?.plotline?.title || 'Plotline'} — {page.data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{page.params.id}/plots"
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
        value={page.data?.plotline?.title || ''}
        class="border-0 bg-transparent text-2xl font-bold outline-none"
      />
      <div class="flex items-center gap-2">
        {#if page.data?.plotline?.template}
          <Badge variant="secondary">{page.data.plotline.template}</Badge>
        {/if}
        <Button type="submit">
          <Save class="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  </form>

  <div class="rounded-lg border border-border bg-card p-4">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">Beats</h2>
      {#if beats.length > 0}
        <span class="text-xs text-muted-foreground">
          {linkedBeats} of {beats.length} linked to a scene
        </span>
      {/if}
    </div>
    <PlotTimeline
      {beats}
      {scenes}
      {sceneHref}
      onReorder={handleReorder}
      onLinkScene={handleLinkScene}
      onAddBeat={handleAddBeat}
      onRenameBeat={handleRenameBeat}
      onDeleteBeat={handleDeleteBeat}
    />
  </div>
</div>
