<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Plus, Pin, PinOff, ExternalLink } from '@lucide/svelte';
  import { cn, formatDate } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';

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
    <Button onclick={() => (showCreate = !showCreate)}>
      <Plus class="h-4 w-4" />
      New Project
    </Button>
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
        <div class="space-y-1.5">
          <Label for="name">Project Name</Label>
          <Input id="name" name="name" type="text" required bind:value={name} />
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
    {#if ($page.data?.projects?.length ?? 0) === 0 && ($page.data?.sharedProjects?.length ?? 0) === 0}
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
        <div class="flex items-center gap-1">
          <form method="POST" action="?/togglePin">
            <input type="hidden" name="projectId" value={project.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={project.pinned ? 'Unpin project' : 'Pin project'}
            >
              {#if project.pinned}
                <PinOff class="h-4 w-4" />
              {:else}
                <Pin class="h-4 w-4" />
              {/if}
            </Button>
          </form>
          <Button
            href="/projects/{project.id}"
            variant="ghost"
            size="icon-sm"
            aria-label="Open project"
          >
            <ExternalLink class="h-4 w-4" />
          </Button>
        </div>
      </div>
    {/each}

    {#if ($page.data?.sharedProjects?.length ?? 0) > 0}
      <div class="mt-6">
        <h2 class="mb-3 text-sm font-medium text-muted-foreground">Shared with me</h2>
        {#each $page.data.sharedProjects as project}
          <div
            class="flex items-center justify-between rounded-lg border border-border bg-card p-4 mb-2"
          >
            <div class="flex-1">
              <a href="/projects/{project.id}" class="font-semibold hover:underline">
                {project.name}
              </a>
              {#if project.description}
                <p class="mt-1 text-sm text-muted-foreground">{project.description}</p>
              {/if}
              <p class="mt-1 text-xs text-muted-foreground">
                Modified {formatDate(project.modifiedAt)}
              </p>
            </div>
            <Button
              href="/projects/{project.id}"
              variant="ghost"
              size="icon-sm"
              aria-label="Open project"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
