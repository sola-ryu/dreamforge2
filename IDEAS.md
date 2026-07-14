# Ideas

These are things not yet implemented but worth eventually adding. When something is implemented, it should be removed from this document.

## @Mentions with Hover Cards

**Files:** `src/lib/components/MentionList.svelte`, `src/lib/extensions/Mention.ts`

- Register a Tiptap extension that triggers on `@` keypress
- Dropdown list of all entities in the project (filtered by type)
- Insert as `<span data-mention data-id="char_001">@Elara Voss</span>`
- Hover popup card: shows entity name, type, status, first 100 chars of body
- Stored in Markdown as `[@Elara Voss](mention://character/char_001)`
- On load, parse mentions and hydrate hover card data

## PDF Export

**Files:** `src/routes/projects/[id]/stories/[storyId]/export/+server.ts`

- Chapter-level PDF with:
  - Title page (story name, author name, date)
  - Table of contents (auto-generated from chapter titles)
  - Scene delimiter (`***` or custom)
  - Configurable: title page toggle, author name, chapter title format/alignment, subtitle, scene delimiter style
- Use `puppeteer` (HTML → PDF) or `pandoc` (Markdown → PDF) or `jsPDF`
- For Docker: bundle puppeteer with Chromium or use pandoc installed in the image
- Formatting: custom CSS for print layout

## Custom Entity Types

**Files:** `src/lib/server/customTypes.ts`, `src/lib/components/DynamicEntityForm.svelte`

### Schema definition

Stored as JSON in `templates/entity-schemas/`:

```json
{
  "type": "religion",
  "label": "Religion",
  "plural": "Religions",
  "fields": [
    { "key": "deities", "label": "Deities", "type": "entityRef", "entityType": "character" },
    { "key": "tenets", "label": "Core Tenets", "type": "textarea" },
    { "key": "followers", "label": "Followers Count", "type": "number" },
    { "key": "holyText", "label": "Holy Text", "type": "markdown" }
  ]
}
```

### Dynamic form rendering

- `DynamicEntityForm.svelte` reads the schema and renders appropriate inputs
- Registers the new type in the entity system
- Custom types appear alongside built-in types in the project dashboard
- Custom types are stored as `.md` files in a directory named after the type

## Import from Other Tools

**Files:** `src/lib/server/importers/`

### Importers

| Tool           | Approach                                                          |
| -------------- | ----------------------------------------------------------------- |
| **Notion**     | Parse Markdown export (unzip → parse frontmatter)                 |
| **Obsidian**   | Read `.md` files directly; convert `[[wikilinks]]` to `@mentions` |
| **Scrivener**  | Parse `.scrivx` index file + `.rtf` content files                 |
| **WorldAnvil** | JSON export format (if available) or HTML scrape                  |
| **Campfire**   | JSON export format                                                |
| **CSV**        | Generic CSV import with column mapping UI                         |

### Import Pipeline

1. User uploads a file or points to a directory
2. Importer detects source format
3. Parses into intermediate format (normalized entity objects)
4. Shows preview with field mapping
5. On confirm, creates entities and writes Markdown files

## New Modules

### Timelines Module

- Chronological event tracking across the world
- Multiple timeline views: global, per-character, per-location
- Events: date, title, description, involved entities, significance
- Visual timeline rendering (horizontal scrollable SVG)
- BCE/CE, fantasy calendar support (custom month/day names)
- Stored as `project/timeline.json` (structured data, not Markdown)

### Maps Module

- Upload map images (world, region, city, dungeon)
- Pin entities to map locations (x, y coordinates)
- Multiple layers (terrain, political, climate)
- Zoom and pan viewer
- Stored as `project/maps/` — one folder per map with image + pins.json

### To-Do Module

- Per-project or per-story task tracking
- Fields: title, assignee (entity ref), due date, priority, status
- Kanban-style board or list view
- Stored as `project/todo.json`

## Cross-Project Import / Duplicate

**Files:** `src/lib/server/importProject.ts`, `src/routes/projects/[id]/import/`

### Import entities from another project

- Pick entities from another project (multi-select with preview)
- Choose target project
- Copy Markdown files + update relations
- Re-map entity IDs if collisions occur
- Retain all frontmatter, tags, images

### Duplicate within a project

- "Duplicate" button on entity detail page
- Creates a copy: `name (Copy)` with new ID
- Duplicates all fields, body, tags, image references
- Relations targeting the original are NOT copied (user can re-link)

## Real-Time Collaboration

**Files:** `src/lib/server/collab.ts`, `src/lib/components/CollabCursor.svelte`

### Architecture

- WebSocket server (same port via SvelteKit's WebSocket support, or separate `ws` server)
- CRDT via Y.js for conflict-free concurrent editing
- Each document (scene) is a Y.js document
- Awareness: cursors, selections, online status

### Features

- Multiple users editing the same scene simultaneously
- See other users' cursors in the editor (colored labels)
- Chat sidebar for collaborators
- Per-scene lock (optional, for non-conflict mode)

### Auth

- Same session cookie or API key for WebSocket auth
- User presence: show who's viewing/editing each scene

## Share Projects / Stories Online

**Files:** `src/routes/share/`, `src/lib/server/sharing.ts`

### Optional self-hosted sharing

- Toggle: "Share this project" in project settings
- Generates a read-only public URL: `/share/<project-id>`
- Optional: password-protected sharing
- Optional: share individual stories (not the whole project)

### Public view

- Read-only rendered view (Markdown → HTML)
- No edit controls, no sidebar
- Custom CSS for public view (different from editor view)
- Optional: embedded mode (`<iframe>` friendly)

### Sharing settings

- Enable/disable per project
- Password (optional)
- Expiration date (optional)
- Allowed sections (stories only, lore only, everything)
