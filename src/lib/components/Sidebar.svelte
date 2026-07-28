<script lang="ts">
  import { page } from '$app/state';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import { getTheme } from '$lib/stores/theme.svelte';
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import { getPalette } from '$lib/stores/palette.svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import {
    House,
    BookMarked,
    SunMoon,
    LogOut,
    Download,
    Search,
    Clock,
    LayoutDashboard,
    BookOpenText,
    GitBranch,
    Scan,
    Sparkles,
    Command
  } from '@lucide/svelte';

  const theme = getTheme();
  const zen = getZenMode();
  const palette = getPalette();
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header>
    <div class="flex items-center gap-2 [&>span:last-child]:truncate">
      <Sidebar.Trigger />
      <span class="font-semibold">DreamForge</span>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>General</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton onclick={() => palette.toggle()} tooltipContent="Command Palette">
              <Command class="h-4 w-4" />
              <span>Quick Open</span>
              <kbd
                class="ml-auto rounded border border-border px-1 text-[10px] text-muted-foreground"
                >⌘K</kbd
              >
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={page.url.pathname === '/projects'}
              tooltipContent="Projects"
            >
              {#snippet child({ props })}
                <a href="/projects" {...props}>
                  <House class="h-4 w-4" />
                  <span>Projects</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if page.params?.id}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Current Project</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={page.url.pathname === `/projects/${page.params.id}`}
                tooltipContent="Dashboard"
              >
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}`} {...props}>
                    <LayoutDashboard class="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltipContent="Stories">
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}/stories`} {...props}>
                    <BookOpenText class="h-4 w-4" />
                    <span>Stories</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltipContent="Plots">
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}/plots`} {...props}>
                    <Sparkles class="h-4 w-4" />
                    <span>Plots</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltipContent="Timelines">
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}/timelines`} {...props}>
                    <Clock class="h-4 w-4" />
                    <span>Timelines</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltipContent="Relations">
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}/relations`} {...props}>
                    <GitBranch class="h-4 w-4" />
                    <span>Relations</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton tooltipContent="Search">
                {#snippet child({ props })}
                  <a href={`/projects/${page.params.id}/search`} {...props}>
                    <Search class="h-4 w-4" />
                    <span>Search</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>

      {#if page.data?.bookmarks?.length > 0}
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <div class="flex items-center gap-2">
              <BookMarked class="h-3 w-3" />
              Bookmarks
            </div>
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each page.data.bookmarks as bm (bm.entityId)}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton tooltipContent={bm.entityName || bm.entityId}>
                    {#snippet child({ props })}
                      <a
                        href={`/projects/${page.params.id}/${entityTypeToRoute(bm.entityType)}/${bm.entityId}`}
                        {...props}
                      >
                        <span class="truncate">{bm.entityName || bm.entityId}</span>
                      </a>
                    {/snippet}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      {/if}
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer>
    <Sidebar.Menu>
      {#if page.params?.id}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton tooltipContent="Export Project">
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <a href="/projects/{page.params.id}/export" {...props} target="_blank">
                <Download class="h-4 w-4" />
                <span>Export Project</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/if}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton onclick={() => theme.toggle()} tooltipContent="Toggle Theme">
          <SunMoon class="h-4 w-4" />
          <span>Toggle Theme</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          onclick={() => zen.toggle()}
          tooltipContent={zen.active ? 'Exit Zen Mode' : 'Zen Mode'}
        >
          <Scan class="h-4 w-4" />
          <span>{zen.active ? 'Exit Zen Mode' : 'Zen Mode'}</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent="Log Out">
          {#snippet child({ props })}
            <a href="/logout" {...props}>
              <LogOut class="h-4 w-4" />
              <span>Log Out</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>

  <Sidebar.Rail />
</Sidebar.Root>
