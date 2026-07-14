<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { Plus, BookOpen, Trash2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';

  let showCreate = $state(false);
  let title = $state('');
  let description = $state('');
</script>

<svelte:head>
  <title>Stories — {page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Stories</h1>
      <p class="text-sm text-muted-foreground">{page.data?.projectName || 'Project'}</p>
    </div>
    <Button onclick={() => (showCreate = !showCreate)}>
      <Plus class="h-4 w-4" />
      New Story
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
              const d = result.data as { storyId?: string; sceneId?: string };
              if (d?.storyId && d?.sceneId) {
                await goto(`/projects/${page.params.id}/stories/${d.storyId}?scene=${d.sceneId}`);
              } else {
                showCreate = false;
                title = '';
                description = '';
                await update();
              }
            }
          };
        }}
        class="space-y-4"
      >
        <div class="space-y-1.5">
          <Label for="title">Title</Label>
          <Input id="title" name="title" type="text" required bind:value={title} />
        </div>
        <div class="space-y-1.5">
          <Label for="description">Description</Label>
          <Textarea id="description" name="description" bind:value={description} />
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

  <div class="space-y-3">
    {#if (page.data?.stories || []).length === 0}
      <p class="py-12 text-center text-muted-foreground">No stories yet.</p>
    {/if}

    {#each page.data?.stories || [] as story}
      <div class="group relative rounded-lg border border-border bg-card">
        <a
          href="/projects/{page.params.id}/stories/{story.id}"
          class="flex items-center gap-4 px-4 py-3"
        >
          <BookOpen class="h-5 w-5 text-primary" />
          <div class="flex-1">
            <span class="font-medium">{story.title}</span>
            {#if story.description}
              <p class="text-xs text-muted-foreground">{story.description}</p>
            {/if}
          </div>
        </a>
        <div
          class="absolute right-2 top-1/2 -translate-y-1/2 max-sm:opacity-100 opacity-0 group-hover:opacity-100"
        >
          <form method="POST" action="?/delete">
            <input type="hidden" name="storyId" value={story.id} />
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete story">
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </form>
        </div>
      </div>
    {/each}
  </div>
</div>
