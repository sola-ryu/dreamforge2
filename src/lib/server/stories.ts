import fs from 'node:fs';
import path from 'node:path';
import { generateId, isSafePathSegment } from '$lib/utils';

export interface StoryMeta {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

export interface ChapterMeta {
  id: string;
  storyId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

interface PlotThreadData {
  thread: string;
  type: 'setup' | 'payoff' | 'ongoing';
}

export interface SceneData {
  id: string;
  chapterId: string;
  title: string | null;
  narrator: string | null;
  time: string | null;
  place: string | null;
  participants: string[];
  backgroundImage: string | null;
  summary: string | null;
  plotThreads: PlotThreadData[];
  sortOrder: number;
  body: string;
  createdAt: string;
  modifiedAt: string;
}

// IDs reach these helpers straight from URL params and form fields, so they are
// rejected unless they are a single path segment — otherwise `..` escapes the project.
function assertSafeId(id: string): void {
  if (!isSafePathSegment(id)) throw new Error(`Unsafe id: ${JSON.stringify(id)}`);
}

// Exported so trash.ts can compute the same live-location paths when soft-deleting
// (source) and restoring (destination) stories/chapters/scenes, without duplicating
// the assertSafeId guard.
export function getStoryDir(projectPath: string, storyId: string): string {
  assertSafeId(storyId);
  return path.join(projectPath, 'stories', storyId);
}

function getChaptersDir(projectPath: string, storyId: string): string {
  return path.join(getStoryDir(projectPath, storyId), 'chapters');
}

export function getChapterDir(projectPath: string, storyId: string, chapterId: string): string {
  assertSafeId(chapterId);
  return path.join(getChaptersDir(projectPath, storyId), chapterId);
}

export function getScenesDir(projectPath: string, storyId: string, chapterId: string): string {
  return path.join(getChapterDir(projectPath, storyId, chapterId), 'scenes');
}

export function getScenePath(
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneId: string
): string {
  assertSafeId(sceneId);
  return path.join(getScenesDir(projectPath, storyId, chapterId), `${sceneId}.md`);
}

// Chapter/scene frontmatter is written as one `key: value` pair per line and read
// back with a per-line regex, so a raw value containing a newline splits into extra
// lines the parser can't match, silently dropping everything after it. JSON-quoting
// keeps the value on a single line (embedded newlines become the literal `\n`
// escape); quoteYamlScalar only does this when needed, so existing hand-edited or
// previously-written unquoted files still round-trip.
function quoteYamlScalar(value: string): string {
  if (value.includes('\n') || value.startsWith('"')) {
    return JSON.stringify(value);
  }
  return value;
}

function unquoteYamlScalar(raw: string): string {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

// --- Stories ---

export function listStories(projectPath: string): StoryMeta[] {
  const dir = path.join(projectPath, 'stories');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => {
      try {
        return fs.statSync(path.join(dir, f)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((id) => getStoryMeta(projectPath, id))
    .filter((s): s is StoryMeta => s !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// Reads story.json from an arbitrary path, so trash.ts can read a trashed story's
// metadata without knowing anything about the live `stories/<id>` layout.
export function readStoryFile(filePath: string): StoryMeta | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function getStoryMeta(projectPath: string, storyId: string): StoryMeta | null {
  if (!isSafePathSegment(storyId)) return null;
  return readStoryFile(path.join(getStoryDir(projectPath, storyId), 'story.json'));
}

export function createStory(projectPath: string, title: string, description?: string): StoryMeta {
  const id = generateId();
  const now = new Date().toISOString();
  const stories = listStories(projectPath);
  const maxOrder = stories.reduce((max, s) => Math.max(max, s.sortOrder), -1);

  const meta: StoryMeta = {
    id,
    projectId: path.basename(projectPath),
    title,
    description: description || null,
    sortOrder: maxOrder + 1,
    createdAt: now,
    modifiedAt: now
  };

  const dir = getStoryDir(projectPath, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'story.json'), JSON.stringify(meta, null, 2));

  return meta;
}

export function updateStory(
  projectPath: string,
  storyId: string,
  data: Partial<StoryMeta>
): StoryMeta | null {
  const meta = getStoryMeta(projectPath, storyId);
  if (!meta) return null;

  const updated = { ...meta, ...data, modifiedAt: new Date().toISOString() };
  const filePath = path.join(getStoryDir(projectPath, storyId), 'story.json');
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

  return updated;
}

// --- Chapters ---

export function listChapters(projectPath: string, storyId: string): ChapterMeta[] {
  if (!isSafePathSegment(storyId)) return [];
  const dir = getChaptersDir(projectPath, storyId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => {
      try {
        return fs.statSync(path.join(dir, f)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((id) => getChapterMeta(projectPath, storyId, id))
    .filter((c): c is ChapterMeta => c !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// Reads chapter.md from an arbitrary path, so trash.ts can read a trashed chapter's
// metadata without knowing anything about the live `stories/<id>/chapters/<id>`
// layout. storyId isn't recoverable from the file itself, so it's a required param
// purely to populate the returned ChapterMeta — pass '' where it isn't known/needed.
export function readChapterFile(filePath: string, chapterId: string): ChapterMeta | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;
    const yaml = match[1];
    const lines = yaml.split('\n');
    const meta: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = unquoteYamlScalar(m[2]);
    }
    return {
      id: meta.id || chapterId,
      storyId: meta.storyId || '',
      title: meta.title || 'Untitled',
      sortOrder: parseInt(meta.sortOrder || '0', 10),
      createdAt: meta.createdAt || new Date().toISOString(),
      modifiedAt: meta.modifiedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function getChapterMeta(
  projectPath: string,
  storyId: string,
  chapterId: string
): ChapterMeta | null {
  if (!isSafePathSegment(storyId) || !isSafePathSegment(chapterId)) return null;
  const meta = readChapterFile(
    path.join(getChapterDir(projectPath, storyId, chapterId), 'chapter.md'),
    chapterId
  );
  return meta ? { ...meta, storyId } : null;
}

export function createChapter(projectPath: string, storyId: string, title: string): ChapterMeta {
  const id = generateId();
  const now = new Date().toISOString();
  const chapters = listChapters(projectPath, storyId);
  const maxOrder = chapters.reduce((max, c) => Math.max(max, c.sortOrder), -1);

  const meta: ChapterMeta = {
    id,
    storyId,
    title,
    sortOrder: maxOrder + 1,
    createdAt: now,
    modifiedAt: now
  };

  const dir = getChapterDir(projectPath, storyId, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'scenes'), { recursive: true });

  const frontmatter = `---\nid: ${id}\ntitle: ${quoteYamlScalar(title)}\nsortOrder: ${maxOrder + 1}\ncreatedAt: ${now}\nmodifiedAt: ${now}\n---\n\n`;
  fs.writeFileSync(path.join(dir, 'chapter.md'), frontmatter);

  return meta;
}

export function updateChapter(
  projectPath: string,
  storyId: string,
  chapterId: string,
  data: Partial<ChapterMeta>
): ChapterMeta | null {
  const meta = getChapterMeta(projectPath, storyId, chapterId);
  if (!meta) return null;

  const now = new Date().toISOString();
  const updated = { ...meta, ...data, modifiedAt: now };
  const filePath = path.join(getChapterDir(projectPath, storyId, chapterId), 'chapter.md');

  const frontmatter = `---\nid: ${updated.id}\ntitle: ${quoteYamlScalar(updated.title)}\nsortOrder: ${updated.sortOrder}\ncreatedAt: ${updated.createdAt}\nmodifiedAt: ${updated.modifiedAt}\n---\n\n`;
  fs.writeFileSync(filePath, frontmatter);

  return updated;
}

// --- Scenes ---

// Reads a scene .md file from an arbitrary path, so trash.ts can read a trashed
// scene without knowing anything about the live
// `stories/<id>/chapters/<id>/scenes/<id>.md` layout.
export function readSceneFile(filePath: string, chapterId: string): SceneData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const yaml = match[1];
    const body = match[2].trim();
    const lines = yaml.split('\n');
    const meta: Record<string, unknown> = {};
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = unquoteYamlScalar(m[2]);
    }

    let participants: string[] = [];
    if (meta.participants) {
      try {
        participants = JSON.parse(meta.participants as string);
      } catch {
        participants = ((meta.participants as string) || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    let plotThreads: PlotThreadData[] = [];
    if (meta.plotThreads) {
      try {
        plotThreads = JSON.parse(meta.plotThreads as string);
      } catch {
        plotThreads = [];
      }
    }

    return {
      id: (meta.id as string) || path.basename(filePath, '.md'),
      chapterId,
      title: (meta.title as string) || null,
      narrator: (meta.narrator as string) || null,
      time: (meta.time as string) || null,
      place: (meta.place as string) || null,
      participants,
      backgroundImage: (meta.backgroundImage as string) || null,
      summary: (meta.summary as string) || null,
      plotThreads,
      sortOrder: parseInt((meta.sortOrder as string) || '0', 10),
      body,
      createdAt: (meta.createdAt as string) || new Date().toISOString(),
      modifiedAt: (meta.modifiedAt as string) || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function listScenes(projectPath: string, storyId: string, chapterId: string): SceneData[] {
  if (!isSafePathSegment(storyId) || !isSafePathSegment(chapterId)) return [];
  const dir = getScenesDir(projectPath, storyId, chapterId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readSceneFile(path.join(dir, f), chapterId))
    .filter((s): s is SceneData => s !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getScene(
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneId: string
): SceneData | null {
  const scenes = listScenes(projectPath, storyId, chapterId);
  return scenes.find((s) => s.id === sceneId) || null;
}

export function findSceneById(
  projectPath: string,
  storyId: string,
  sceneId: string
): { chapterId: string; scene: SceneData } | null {
  const chapters = listChapters(projectPath, storyId);
  for (const ch of chapters) {
    const scenes = listScenes(projectPath, storyId, ch.id);
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) return { chapterId: ch.id, scene };
  }
  return null;
}

export function createScene(
  projectPath: string,
  storyId: string,
  chapterId: string,
  title?: string
): SceneData {
  const id = generateId();
  const now = new Date().toISOString();
  const scenes = listScenes(projectPath, storyId, chapterId);
  const maxOrder = scenes.reduce((max, s) => Math.max(max, s.sortOrder), -1);

  const scene: SceneData = {
    id,
    chapterId,
    title: title || null,
    narrator: null,
    time: null,
    place: null,
    participants: [],
    backgroundImage: null,
    summary: null,
    plotThreads: [],
    sortOrder: maxOrder + 1,
    body: '',
    createdAt: now,
    modifiedAt: now
  };

  const fileContent = `---\n${Object.entries({
    id,
    chapterId,
    title: quoteYamlScalar(scene.title || ''),
    narrator: '',
    time: '',
    place: '',
    participants: '[]',
    backgroundImage: '',
    summary: '',
    plotThreads: '[]',
    sortOrder: maxOrder + 1,
    createdAt: now,
    modifiedAt: now
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\n`;

  const filePath = path.join(getScenesDir(projectPath, storyId, chapterId), `${id}.md`);
  fs.writeFileSync(filePath, fileContent);

  return scene;
}

export function updateScene(
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneId: string,
  data: Partial<SceneData>
): SceneData | null {
  const scene = getScene(projectPath, storyId, chapterId, sceneId);
  if (!scene) return null;

  const now = new Date().toISOString();
  const updated = { ...scene, ...data, modifiedAt: now };

  const filePath = getScenePath(projectPath, storyId, chapterId, sceneId);
  const content = `---\nid: ${updated.id}\nchapterId: ${updated.chapterId}\ntitle: ${quoteYamlScalar(updated.title || '')}\nnarrator: ${quoteYamlScalar(updated.narrator || '')}\ntime: ${quoteYamlScalar(updated.time || '')}\nplace: ${quoteYamlScalar(updated.place || '')}\nparticipants: ${JSON.stringify(updated.participants)}\nbackgroundImage: ${quoteYamlScalar(updated.backgroundImage || '')}\nsummary: ${quoteYamlScalar(updated.summary || '')}\nplotThreads: ${JSON.stringify(updated.plotThreads)}\nsortOrder: ${updated.sortOrder}\ncreatedAt: ${updated.createdAt}\nmodifiedAt: ${updated.modifiedAt}\n---\n\n${updated.body}\n`;
  fs.writeFileSync(filePath, content);

  return updated;
}

export function reorderChapters(projectPath: string, storyId: string, chapterIds: string[]): void {
  chapterIds.forEach((id, index) => {
    updateChapter(projectPath, storyId, id, { sortOrder: index });
  });
}

export function reorderScenes(
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneIds: string[]
): void {
  sceneIds.forEach((id, index) => {
    updateScene(projectPath, storyId, chapterId, id, { sortOrder: index });
  });
}
