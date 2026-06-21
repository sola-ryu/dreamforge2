<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Plus, Trash2, Edit, GripVertical } from '@lucide/svelte';
  import { formatDate } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Combobox } from '$lib/components/ui/combobox';

  let showCreate = $state(false);
  let newTitle = $state('');
  let newStory = $state('');
  let selectedTemplate = $state('freeform');
</script>

<svelte:head>
  <title>Plotlines — {$page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Plotlines</h1>
      <p class="text-sm text-muted-foreground">{$page.data?.projectName || 'Project'}</p>
    </div>
    <Button onclick={() => (showCreate = !showCreate)}>
      <Plus class="h-4 w-4" />
      New Plotline
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
              showCreate = false;
              newTitle = '';
              newStory = '';
              await update();
            }
          };
        }}
        class="space-y-4"
      >
        <div class="space-y-1.5">
          <Label for="title">Title</Label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            bind:value={newTitle}
            placeholder="Plotline title..."
          />
        </div>
        <div class="space-y-1.5">
          <Label for="storyId">Story</Label>
          <Combobox
            name="storyId"
            bind:value={newStory}
            options={($page.data?.stories || []).map((s: any) => ({ value: s.id, label: s.title }))}
            placeholder="Select a story..."
          />
        </div>
        <div class="space-y-1.5">
          <Label for="template">Template</Label>
          <select
            id="template"
            name="template"
            bind:value={selectedTemplate}
            class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="freeform">Freeform (no template)</option>
            <option value="heros_journey">Hero's Journey</option>
            <option value="save_the_cat">Save the Cat</option>
            <option value="snowflake">Snowflake Method</option>
          </select>
        </div>
        <div class="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onclick={() => (showCreate = false)}>Cancel</Button>
        </div>
      </form>
    </div>
  {/if}

  <div class="space-y-3">
    {#if ($page.data?.plotlines || []).length === 0}
      <p class="py-12 text-center text-muted-foreground">
        No plotlines yet. Create one to get started.
      </p>
    {/if}

    {#each $page.data?.plotlines || [] as plotline}
      <div class="rounded-lg border border-border bg-card hover:bg-secondary/50">
        <a
          href="/projects/{$page.params.id}/plots/{plotline.id}"
          class="flex items-center gap-4 px-4 py-3"
        >
          <GripVertical class="h-4 w-4 text-muted-foreground opacity-40" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium truncate">{plotline.title}</span>
              {#if plotline.template}
                <Badge variant="secondary">{plotline.template}</Badge>
              {/if}
            </div>
            <p class="text-xs text-muted-foreground">
              {plotline.beats.length} beats &middot; Modified {formatDate(plotline.modifiedAt)}
            </p>
          </div>
          <form method="POST" action="?/delete" onsubmit={() => confirm('Delete this plotline?')}>
            <input type="hidden" name="plotlineId" value={plotline.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              onclick={(e) => e.stopPropagation()}
              aria-label="Delete plotline"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </form>
        </a>
      </div>
    {/each}
  </div>
</div>
