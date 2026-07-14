# DreamForge

Open-source, self-hosted web app for fiction worldbuilding and writing. Markdown-first, SvelteKit-based.

## Quick Start (Docker)

```bash
# Pull the pre-built image
docker pull ghcr.io/sola-ryu/dreamforge2:latest

# Create a data directory and run
mkdir -p ./dreamforge-data
docker run -d \
  --name dreamforge \
  -p 3000:3000 \
  -e ADMIN_EMAIL=admin@dreamforge.local \
  -e ADMIN_PASSWORD=changeme \
  -e PUBLIC_ALLOW_REGISTRATION=true \
  -v ./dreamforge-data:/data \
  ghcr.io/sola-ryu/dreamforge2:latest
```

Open http://localhost:3000 and log in with `admin@dreamforge.local` / `changeme`.

### Using docker-compose

```bash
wget https://raw.githubusercontent.com/sola-ryu/dreamforge2/main/docker-compose.yml
docker compose up -d
```

## Configuration

Set via environment variables:

| Variable                    | Default                  | Description            |
| --------------------------- | ------------------------ | ---------------------- |
| `DATABASE_PATH`             | `/data/dreamforge.db`    | SQLite database path   |
| `DATA_DIR`                  | `/data/projects`         | Projects directory     |
| `PUBLIC_ALLOW_REGISTRATION` | `true`                   | Allow new user signups |
| `ADMIN_EMAIL`               | `admin@dreamforge.local` | Initial admin email    |
| `ADMIN_PASSWORD`            | `changeme`               | Initial admin password |
| `BODY_SIZE_LIMIT`           | `20971520` (20 MB)      | Max upload size in bytes (e.g. `52428800` for 50 MB) |

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

Or with Docker for hot-reload:

```bash
docker compose -f docker-compose.dev.yml up
```

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start dev server with hot-reload |
| `npm run build`   | Production build                 |
| `npm run preview` | Preview production build         |
| `npm test`        | Run tests                        |
| `npm run check`   | Type-check                       |
| `npm run lint`    | Lint                             |
| `npm run format`  | Format code                      |

## Features

- Entity management (characters, locations, organizations, cultures, species, items, notes)
- Story / chapter / scene hierarchy with drag-and-drop reorder
- Tiptap rich-text editor with tables, colors, mentions, and spellcheck
- Plot timeline with drag-and-drop beats and scene linking
- Summaries view with synopsis editing and plot thread indicators
- Note templates (Character Profile, Location Description, Scene Outline, Chapter Plan, Worldbuilding Note)
- Note-to-scene and scene-to-note conversion
- Relation graph (force-directed with d3.js)
- Global search across all content
- Bookmarks
- ZIP export
- Zen mode
- PDF export (browser print-to-PDF)
- Multi-user with session-based auth
- Light / dark / monochrome themes
