<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Plus, BookOpen, Trash2 } from 'lucide-svelte';

  let showCreate = $state(false);
  let title = $state('');
  let description = $state('');
</script>

<svelte:head>
  <title>Stories — {$page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Stories</h1>
      <p class="text-sm text-muted-foreground">{$page.data?.projectName || 'Project'}</p>
    </div>
    <button
      class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      onclick={() => (showCreate = !showCreate)}
    >
      <Plus class="h-4 w-4" />
      New Story
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
              title = '';
              description = '';
            }
          };
        }}
        class="space-y-4"
      >
        <div>
          <label for="title" class="block text-sm font-medium">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            bind:value={title}
            class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label for="description" class="block text-sm font-medium">Description</label>
          <textarea
            id="description"
            name="description"
            bind:value={description}
            rows={3}
            class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          ></textarea>
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

  <div class="space-y-3">
    {#if ($page.data?.stories || []).length === 0}
      <p class="py-12 text-center text-muted-foreground">No stories yet.</p>
    {/if}

    {#each $page.data?.stories || [] as story}
      <div class="group relative rounded-lg border border-border bg-card">
        <a
          href="/projects/{$page.params.id}/stories/{story.id}"
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
            <button
              type="submit"
              class="rounded p-1.5 hover:bg-secondary"
              aria-label="Delete story"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </button>
          </form>
        </div>
      </div>
    {/each}
  </div>
</div>
