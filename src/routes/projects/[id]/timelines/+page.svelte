<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    Plus,
    Clock,
    Settings,
    Trash2,
    Edit,
    X,
    Filter,
    Search,
    Save,
    Calendar,
    ChevronDown,
    ChevronRight
  } from 'lucide-svelte';
  import { cn, formatDate } from '$lib/utils';
  import type { TimelineEvent, CalendarConfig } from '$lib/server/timelines';

  let showCreate = $state(false);
  let showCalendarSettings = $state(false);
  let editingEventId = $state<string | null>(null);

  let filterEntity = $state('');
  let filterSignificance = $state('');
  let filterEra = $state('');
  let searchQuery = $state('');

  let newYear = $state(new Date().getFullYear());
  let newMonth = $state('');
  let newDay = $state('');
  let newEra = $state('CE');
  let newTitle = $state('');
  let newDescription = $state('');
  let newSignificance = $state<'major' | 'minor' | 'trivial'>('minor');
  let newEntityIds = $state<string[]>([]);

  let editYear = $state(0);
  let editMonth = $state('');
  let editDay = $state('');
  let editEra = $state('');
  let editTitle = $state('');
  let editDescription = $state('');
  let editSignificance = $state<'major' | 'minor' | 'trivial'>('minor');
  let editEntityIds = $state<string[]>([]);

  let timelineEl = $state<HTMLDivElement | undefined>(undefined);

  const timeline = $derived($page.data?.timeline as { calendar: CalendarConfig; events: TimelineEvent[] } | undefined);
  const events = $derived(timeline?.events || []);
  const calendar = $derived(timeline?.calendar || { name: 'Gregorian', months: [], epoch: 0 });
  const entities = $derived<Array<{ id: string; name: string; type: string }>>($page.data?.entities || []);

  const entityMap = $derived(new Map(entities.map((e) => [e.id, e])));

  function formatDateStr(event: TimelineEvent, cal: CalendarConfig): string {
    const parts: string[] = [];
    if (event.month && cal.months[event.month - 1]) {
      if (event.day) {
        parts.push(`${cal.months[event.month - 1]} ${event.day},`);
      } else {
        parts.push(`${cal.months[event.month - 1]},`);
      }
    }
    const yearStr = event.year < 0 ? `${Math.abs(event.year)} ${event.era || 'BCE'}` : `${event.year} ${event.era || 'CE'}`;
    parts.push(yearStr.trim());
    return parts.join(' ');
  }

  const filteredEvents = $derived(
    events.filter((e) => {
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterSignificance && e.significance !== filterSignificance) return false;
      if (filterEra && e.era !== filterEra) return false;
      if (filterEntity && !e.entityIds.includes(filterEntity)) return false;
      return true;
    })
  );

  const eras = $derived([...new Set(events.map((e) => e.era))].sort());

  const minYear = $derived(filteredEvents.length > 0 ? Math.min(...filteredEvents.map((e) => e.year)) : 0);
  const maxYear = $derived(filteredEvents.length > 0 ? Math.max(...filteredEvents.map((e) => e.year)) : 100);
  const yearSpan = $derived(Math.max(maxYear - minYear, 1));

  const YEAR_PADDING = 50;
  const SVG_HEIGHT = 300;
  const AXIS_Y = SVG_HEIGHT - 50;

  const pxPerYear = $derived(
    yearSpan <= 50 ? 16 :
    yearSpan <= 200 ? 6 :
    yearSpan <= 1000 ? 2.5 :
    yearSpan <= 5000 ? 0.8 :
    0.3
  );

  const svgWidth = $derived(yearSpan * pxPerYear + YEAR_PADDING * 2);

  const TICK_INTERVAL = $derived(
    yearSpan <= 50 ? 10 :
    yearSpan <= 200 ? 25 :
    yearSpan <= 1000 ? 100 :
    yearSpan <= 5000 ? 500 :
    1000
  );

  const tickYears = $derived(() => {
    const ticks: number[] = [];
    const start = Math.floor(minYear / TICK_INTERVAL) * TICK_INTERVAL;
    const end = Math.ceil(maxYear / TICK_INTERVAL) * TICK_INTERVAL;
    for (let y = start; y <= end; y += TICK_INTERVAL) {
      ticks.push(y);
    }
    return ticks;
  });

  function yearToX(year: number): number {
    return YEAR_PADDING + (year - minYear) * pxPerYear;
  }

  const eventPositions = $derived(() => {
    const positioned: Array<{ event: TimelineEvent; x: number; y: number; label: 'above' | 'below' }> = [];
    const yearCounts = new Map<number, number>();

    for (const event of filteredEvents) {
      const x = yearToX(event.year);
      const count = yearCounts.get(event.year) || 0;
      yearCounts.set(event.year, count + 1);
      const yOffset = count * 35;
      const y = Math.min(AXIS_Y - 20 - yOffset, 40);
      const label = count % 2 === 0 ? 'above' : 'below';
      positioned.push({ event, x, y, label });
    }
    return positioned;
  });

  function resetCreateForm() {
    newYear = new Date().getFullYear();
    newMonth = '';
    newDay = '';
    newEra = 'CE';
    newTitle = '';
    newDescription = '';
    newSignificance = 'minor';
    newEntityIds = [];
  }

  function openEdit(event: TimelineEvent) {
    editingEventId = event.id;
    editYear = event.year;
    editMonth = event.month != null ? String(event.month) : '';
    editDay = event.day != null ? String(event.day) : '';
    editEra = event.era;
    editTitle = event.title;
    editDescription = event.description;
    editSignificance = event.significance;
    editEntityIds = [...event.entityIds];
  }

  function closeEdit() {
    editingEventId = null;
  }

  function significanceColor(sig: string): string {
    switch (sig) {
      case 'major': return '#f59e0b';
      case 'minor': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  function scrollToYear(year: number) {
    if (!timelineEl) return;
    const x = yearToX(year) - timelineEl.clientWidth / 2;
    timelineEl.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>Timelines — {$page.data?.projectName || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-6">
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold">Timelines</h1>
      <p class="text-sm text-muted-foreground">{$page.data?.projectName || 'Project'}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        onclick={() => (showCalendarSettings = !showCalendarSettings)}
      >
        <Calendar class="h-4 w-4" />
        Calendar
      </button>
      <button
        class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        onclick={() => (showCreate = !showCreate)}
      >
        <Plus class="h-4 w-4" />
        Add Event
      </button>
    </div>
  </div>

  {#if showCalendarSettings}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Calendar Settings</h2>
        <button
          class="rounded p-1 hover:bg-secondary"
          onclick={() => (showCalendarSettings = false)}
          aria-label="Close calendar settings"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <form method="POST" action="?/updateCalendar" use:enhance class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label for="calendarName" class="block text-xs text-muted-foreground mb-1">Calendar Name</label>
            <input
              id="calendarName"
              name="calendarName"
              type="text"
              value={calendar.name}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label for="months" class="block text-xs text-muted-foreground mb-1">Month Names (comma-separated)</label>
            <input
              id="months"
              name="months"
              type="text"
              value={calendar.months.join(', ')}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm font-mono"
            />
          </div>
        </div>
        <button
          type="submit"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Save class="mr-1 inline h-4 w-4" />
          Save Calendar
        </button>
      </form>
    </div>
  {/if}

  {#if showCreate}
    <div class="mb-6 rounded-lg border border-border bg-card p-4">
      <h2 class="mb-4 text-sm font-semibold">Add Event</h2>
      <form
        method="POST"
        action="?/createEvent"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === 'success') {
              showCreate = false;
              resetCreateForm();
              await update();
            }
          };
        }}
        class="space-y-3"
      >
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label for="new-year" class="block text-xs text-muted-foreground mb-1">Year</label>
            <input
              id="new-year"
              name="year"
              type="number"
              required
              bind:value={newYear}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label for="new-month" class="block text-xs text-muted-foreground mb-1">Month</label>
            <select
              id="new-month"
              name="month"
              bind:value={newMonth}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {#each calendar.months as month, i}
                <option value={i + 1}>{month}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="new-day" class="block text-xs text-muted-foreground mb-1">Day</label>
            <input
              id="new-day"
              name="day"
              type="number"
              min="1"
              max="31"
              bind:value={newDay}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label for="new-era" class="block text-xs text-muted-foreground mb-1">Era</label>
            <input
              id="new-era"
              name="era"
              type="text"
              bind:value={newEra}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label for="new-title" class="block text-xs text-muted-foreground mb-1">Title</label>
          <input
            id="new-title"
            name="title"
            type="text"
            required
            bind:value={newTitle}
            class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Event title..."
          />
        </div>
        <div>
          <label for="new-description" class="block text-xs text-muted-foreground mb-1">Description</label>
          <textarea
            id="new-description"
            name="description"
            rows="3"
            bind:value={newDescription}
            class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            placeholder="Event description..."
          ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="new-significance" class="block text-xs text-muted-foreground mb-1">Significance</label>
            <select
              id="new-significance"
              name="significance"
              bind:value={newSignificance}
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="trivial">Trivial</option>
            </select>
          </div>
          <div>
            <label for="new-entities" class="block text-xs text-muted-foreground mb-1">Linked Entities</label>
            <select
              id="new-entities"
              class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
              onchange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                if (val && !newEntityIds.includes(val)) {
                  newEntityIds = [...newEntityIds, val];
                }
              }}
            >
              <option value="">Add entity...</option>
              {#each entities.filter((e) => !newEntityIds.includes(e.id)) as entity}
                <option value={entity.id}>{entity.name} ({entity.type})</option>
              {/each}
            </select>
            {#if newEntityIds.length > 0}
              <div class="mt-1 flex flex-wrap gap-1">
                {#each newEntityIds as eid}
                  {@const entity = entityMap.get(eid)}
                  {#if entity}
                    <span class="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {entity.name}
                      <button
                        type="button"
                        class="hover:text-destructive"
                        onclick={() => (newEntityIds = newEntityIds.filter((id) => id !== eid))}
                        aria-label="Remove {entity.name}"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </span>
                  {/if}
                {/each}
              </div>
            {/if}
            <input type="hidden" name="entityIds" value={JSON.stringify(newEntityIds)} />
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add Event
          </button>
          <button
            type="button"
            class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
            onclick={() => {
              showCreate = false;
              resetCreateForm();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if showCalendarSettings || showCreate || events.length > 0}
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search events..."
          bind:value={searchQuery}
          class="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm"
        />
      </div>
      <select
        class="rounded border border-input bg-background px-2 py-2 text-sm"
        bind:value={filterSignificance}
      >
        <option value="">All significance</option>
        <option value="major">Major</option>
        <option value="minor">Minor</option>
        <option value="trivial">Trivial</option>
      </select>
      <select class="rounded border border-input bg-background px-2 py-2 text-sm" bind:value={filterEra}>
        <option value="">All eras</option>
        {#each eras as era}
          <option value={era}>{era}</option>
        {/each}
      </select>
      <select class="rounded border border-input bg-background px-2 py-2 text-sm" bind:value={filterEntity}>
        <option value="">All entities</option>
        {#each entities as entity}
          <option value={entity.id}>{entity.name}</option>
        {/each}
      </select>
    </div>
  {/if}

  {#if events.length === 0}
    <div class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Clock class="h-12 w-12 opacity-30" />
      <p class="text-sm">No timeline events yet. Add your first one to start building a chronology.</p>
    </div>
  {:else if filteredEvents.length === 0}
    <div class="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Filter class="h-12 w-12 opacity-30" />
      <p class="text-sm">No events match your filters.</p>
    </div>
  {:else}
    <div
      bind:this={timelineEl}
      class="mb-6 overflow-x-auto rounded-lg border border-border bg-card"
    >
      <svg width={svgWidth} height={SVG_HEIGHT} class="min-w-full">
        <line
          x1="0"
          y1={AXIS_Y}
          x2={svgWidth}
          y2={AXIS_Y}
          stroke="hsl(var(--border))"
          stroke-width="2"
        />

        {#each tickYears() as year}
          <g>
            <line
              x1={yearToX(year)}
              y1={AXIS_Y - 6}
              x2={yearToX(year)}
              y2={AXIS_Y + 6}
              stroke="hsl(var(--muted-foreground))"
              stroke-width="1"
            />
            <text
              x={yearToX(year)}
              y={AXIS_Y + 20}
              text-anchor="middle"
              fill="hsl(var(--muted-foreground))"
              font-size="11"
            >
              {year}
            </text>
          </g>
        {/each}

        {#each eventPositions() as { event, x, y, label }}
          <g
            class="cursor-pointer"
            onclick={() => openEdit(event)}
            role="button"
            tabindex="0"
            onkeypress={(e) => {
              if (e.key === 'Enter') openEdit(event);
            }}
          >
            <circle cx={x} cy={y} r={event.significance === 'major' ? 6 : event.significance === 'minor' ? 4.5 : 3} fill={significanceColor(event.significance)} stroke="hsl(var(--card))" stroke-width="2" />
            {#if label === 'above'}
              <line x1={x} y1={y + (event.significance === 'major' ? 6 : event.significance === 'minor' ? 4.5 : 3)} x2={x} y2={y - 18} stroke="hsl(var(--border))" stroke-width="1" />
              <text x={x} y={y - 22} text-anchor="middle" fill="hsl(var(--foreground))" font-size="11" font-weight="500">
                {event.title.length > 30 ? event.title.slice(0, 30) + '...' : event.title}
              </text>
              <text x={x} y={y - 10} text-anchor="middle" fill="hsl(var(--muted-foreground))" font-size="9">
                {formatDateStr(event, calendar)}
              </text>
            {:else}
              <line x1={x} y1={y + (event.significance === 'major' ? 6 : event.significance === 'minor' ? 4.5 : 3)} x2={x} y2={AXIS_Y - 14} stroke="hsl(var(--border))" stroke-width="1" />
              <text x={x} y={AXIS_Y - 18} text-anchor="middle" fill="hsl(var(--foreground))" font-size="11" font-weight="500">
                {event.title.length > 30 ? event.title.slice(0, 30) + '...' : event.title}
              </text>
            {/if}
          </g>
        {/each}
      </svg>
    </div>

    <div class="space-y-2">
      {#each filteredEvents as event}
        <div class="rounded-lg border border-border bg-card px-4 py-3">
          {#if editingEventId === event.id}
            <form
              method="POST"
              action="?/updateEvent"
              use:enhance={() => {
                return async ({ result, update }) => {
                  if (result.type === 'success') {
                    closeEdit();
                    await update({ reset: false });
                  }
                };
              }}
              class="space-y-3"
            >
              <input type="hidden" name="eventId" value={event.id} />
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label for="edit-year" class="block text-xs text-muted-foreground mb-1">Year</label>
                  <input
                    id="edit-year"
                    name="year"
                    type="number"
                    required
                    bind:value={editYear}
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label for="edit-month" class="block text-xs text-muted-foreground mb-1">Month</label>
                  <select
                    id="edit-month"
                    name="month"
                    bind:value={editMonth}
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    {#each calendar.months as month, i}
                      <option value={i + 1}>{month}</option>
                    {/each}
                  </select>
                </div>
                <div>
                  <label for="edit-day" class="block text-xs text-muted-foreground mb-1">Day</label>
                  <input
                    id="edit-day"
                    name="day"
                    type="number"
                    min="1"
                    max="31"
                    bind:value={editDay}
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label for="edit-era" class="block text-xs text-muted-foreground mb-1">Era</label>
                  <input
                    id="edit-era"
                    name="era"
                    type="text"
                    bind:value={editEra}
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label for="edit-title" class="block text-xs text-muted-foreground mb-1">Title</label>
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  required
                  bind:value={editTitle}
                  class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label for="edit-description" class="block text-xs text-muted-foreground mb-1">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows="3"
                  bind:value={editDescription}
                  class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                ></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="edit-significance" class="block text-xs text-muted-foreground mb-1">Significance</label>
                  <select
                    id="edit-significance"
                    name="significance"
                    bind:value={editSignificance}
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="trivial">Trivial</option>
                  </select>
                </div>
                <div>
                  <label for="edit-entities" class="block text-xs text-muted-foreground mb-1">Linked Entities</label>
                  <select
                    id="edit-entities"
                    class="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                    onchange={(e) => {
                      const val = (e.target as HTMLSelectElement).value;
                      if (val && !editEntityIds.includes(val)) {
                        editEntityIds = [...editEntityIds, val];
                      }
                    }}
                  >
                    <option value="">Add entity...</option>
                    {#each entities.filter((e) => !editEntityIds.includes(e.id)) as entity}
                      <option value={entity.id}>{entity.name} ({entity.type})</option>
                    {/each}
                  </select>
                  {#if editEntityIds.length > 0}
                    <div class="mt-1 flex flex-wrap gap-1">
                      {#each editEntityIds as eid}
                        {@const entity = entityMap.get(eid)}
                        {#if entity}
                          <span class="flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs">
                            {entity.name}
                            <button
                              type="button"
                              class="hover:text-destructive"
                              onclick={() => (editEntityIds = editEntityIds.filter((id) => id !== eid))}
                              aria-label="Remove {entity.name}"
                            >
                              <X class="h-3 w-3" />
                            </button>
                          </span>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                  <input type="hidden" name="entityIds" value={JSON.stringify(editEntityIds)} />
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  class="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Save class="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
                  onclick={closeEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  formaction="?/deleteEvent"
                  class="flex items-center gap-1 rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 ml-auto"
                >
                  <Trash2 class="h-4 w-4" />
                  Delete
                </button>
              </div>
            </form>
          {:else}
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style="background-color: {significanceColor(event.significance)}"
                  ></span>
                  <button
                    class="truncate text-left font-medium hover:underline"
                    onclick={() => openEdit(event)}
                  >
                    {event.title}
                  </button>
                  <span
                    class={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                      event.significance === 'major' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      event.significance === 'minor' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      event.significance === 'trivial' && 'bg-gray-500/10 text-gray-500'
                    )}
                  >
                    {event.significance}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {formatDateStr(event, calendar)}
                </p>
                {#if event.description}
                  <p class="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                {/if}
                {#if event.entityIds.length > 0}
                  <div class="mt-1 flex flex-wrap gap-1">
                    {#each event.entityIds as eid}
                      {@const entity = entityMap.get(eid)}
                      {#if entity}
                        <span class="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                          {entity.name}
                        </span>
                      {/if}
                    {/each}
                  </div>
                {/if}
              </div>
              <div class="flex shrink-0 items-center gap-1 ml-3">
                <button
                  class="rounded p-1.5 hover:bg-secondary"
                  onclick={() => openEdit(event)}
                  aria-label="Edit event"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <form method="POST" action="?/deleteEvent" use:enhance>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button
                    type="submit"
                    class="rounded p-1.5 hover:bg-secondary"
                    aria-label="Delete event"
                  >
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </button>
                </form>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
