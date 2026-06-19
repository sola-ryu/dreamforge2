<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Plus, Pin, PinOff, ExternalLink } from 'lucide-svelte';
  import { cn, formatDate } from '$lib/utils';

  let showCreate = $state(false);
  let name = $state('');
  let description = $state('');
</script>

<svelte:head>
  <title>Projects — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Projects</h1>
    <button
      class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      onclick={() => (showCreate = !showCreate)}
    >
      <Plus class="h-4 w-4" />
      New Project
    </button>
  </div>

  {#if showCreate}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 class="mb-4 text-lg font-semibold">Create Project</h2>
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              showCreate = false;
              name = '';
              description = '';
              update();
            }
          };
        }}
        class="space-y-4"
      >
        <div>
          <label for="name" class="block text-sm font-medium">Project Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            bind:value={name}
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
          >
            Create
          </button>
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => (showCreate = false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="space-y-3">
    {#if $page.data?.projects?.length === 0}
      <p class="text-center text-muted-foreground py-12">
        No projects yet. Create one to get started.
      </p>
    {/if}

    {#each $page.data?.projects || [] as project}
      <div
        class={cn(
          'flex items-center justify-between rounded-lg border border-border bg-card p-4',
          project.pinned && 'border-primary/50'
        )}
      >
        <div class="flex-1">
          <div class="flex items-center gap-2">
            {#if project.pinned}
              <Pin class="h-3 w-3 text-primary" />
            {/if}
            <a href="/projects/{project.id}" class="font-semibold hover:underline">
              {project.name}
            </a>
          </div>
          {#if project.description}
            <p class="mt-1 text-sm text-muted-foreground">{project.description}</p>
          {/if}
          <p class="mt-1 text-xs text-muted-foreground">
            Modified {formatDate(project.modifiedAt)}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <form method="POST" action="?/togglePin">
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" aria-label={project.pinned ? 'Unpin project' : 'Pin project'} class="rounded p-2 hover:bg-secondary">
              {#if project.pinned}
                <PinOff class="h-4 w-4" />
              {:else}
                <Pin class="h-4 w-4" />
              {/if}
            </button>
          </form>
          <a href="/projects/{project.id}" class="rounded p-2 hover:bg-secondary" aria-label="Open project">
            <ExternalLink class="h-4 w-4" />
          </a>
        </div>
      </div>
    {/each}
  </div>
</div>
