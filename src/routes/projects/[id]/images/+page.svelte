<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Upload, Image, X } from 'lucide-svelte';

  let uploadFiles = $state<File[]>([]);
  let uploading = $state(false);
  let previewUrls = $state<string[]>([]);

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    uploadFiles = Array.from(input.files);
    previewUrls = uploadFiles.map((f) => URL.createObjectURL(f));
  }

  function removePreview(i: number) {
    URL.revokeObjectURL(previewUrls[i]);
    uploadFiles = uploadFiles.filter((_, idx) => idx !== i);
    previewUrls = previewUrls.filter((_, idx) => idx !== i);
  }
</script>

<div class="mx-auto max-w-5xl p-6">
  <div class="mb-6">
    <a
      href="/projects/{$page.params.id}"
      class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to {$page.data?.project?.name || 'Project'}
    </a>
    <h1 class="text-2xl font-bold">Images</h1>
    <p class="text-sm text-muted-foreground">
      Manage images for {$page.data?.project?.name || 'this project'}
    </p>
  </div>

  <div class="mb-8 rounded-lg border border-border bg-card p-4">
    <form
      method="POST"
      action="?/upload"
      enctype="multipart/form-data"
      use:enhance={() => {
        return async ({ result }) => {
          uploading = false;
          if (result.type === 'success') {
            uploadFiles = [];
            previewUrls = [];
            goto(window.location.href);
          }
        };
      }}
      class="space-y-4"
    >
      <div
        class="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6"
      >
        <label class="flex cursor-pointer flex-col items-center gap-2">
          <Upload class="h-8 w-8 text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Click to select images</span>
          <span class="text-xs text-muted-foreground">PNG, JPG, GIF, WebP, SVG</span>
          <input
            type="file"
            name="files"
            accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
            multiple
            required
            class="hidden"
            onchange={handleFileSelect}
          />
        </label>
      </div>

      {#if previewUrls.length > 0}
        <div class="flex flex-wrap gap-3">
          {#each previewUrls as url, i}
            <div class="group relative">
              <img
                src={url}
                alt={uploadFiles[i].name}
                class="h-24 w-24 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                class="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100"
                onclick={() => removePreview(i)}
              >
                <X class="h-3 w-3" />
              </button>
              <p class="mt-1 max-w-24 truncate text-xs text-muted-foreground">
                {uploadFiles[i].name}
              </p>
            </div>
          {/each}
        </div>
      {/if}

      {#if uploadFiles.length > 0}
        <button
          type="submit"
          disabled={uploading}
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {uploading
            ? 'Uploading...'
            : `Upload ${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''}`}
        </button>
      {/if}
    </form>
  </div>

  <div>
    {#if ($page.data?.images || []).length === 0}
      <div class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Image class="h-12 w-12 opacity-30" />
        <p class="text-sm">No images yet</p>
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {#each $page.data.images as img}
          <a
            href="/projects/{$page.params.id}/images/{img.id}"
            class="group rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50"
          >
            <div class="aspect-square overflow-hidden bg-secondary">
              <img
                src={img.url}
                alt={img.altText || img.originalName}
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div class="p-2">
              <p class="truncate text-xs font-medium">{img.originalName}</p>
              {#if img.caption}
                <p class="truncate text-xs text-muted-foreground">{img.caption}</p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
