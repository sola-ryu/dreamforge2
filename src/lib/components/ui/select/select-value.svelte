<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ValueProps> = $props();
</script>

<SelectPrimitive.Value
  bind:ref
  data-slot="select-value"
  class={cn(
    'data-[placeholder]:text-muted-foreground [&>[data-slot=select-value-icon]]:size-4 [&>[data-slot=select-value-icon]]:shrink-0',
    className
  )}
  {...restProps}
/>
