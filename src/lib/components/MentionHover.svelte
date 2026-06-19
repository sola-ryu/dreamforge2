<script lang="ts">
  let {
    name = '',
    type = '',
    status = '',
    preview = ''
  }: {
    name?: string;
    type?: string;
    status?: string;
    preview?: string;
  } = $props();
</script>

<div class="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
  <div class="font-medium text-sm">{name}</div>
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
    <span>{type}</span>
    {#if status}
      <span class="capitalize">({status})</span>
    {/if}
  </div>
  {#if preview}
    <p class="mt-1 text-xs text-muted-foreground line-clamp-2">{preview}</p>
  {/if}
</div>
