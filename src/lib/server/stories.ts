import fs from 'node:fs';
import path from 'node:path';
import { generateId } from '$lib/utils';

interface StoryMeta {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

interface ChapterMeta {
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

interface SceneData {
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

function getStoryDir(projectPath: string, storyId: string): string {
  return path.join(projectPath, 'stories', storyId);
}

function getChaptersDir(projectPath: string, storyId: string): string {
  return path.join(getStoryDir(projectPath, storyId), 'chapters');
}

function getChapterDir(projectPath: string, storyId: string, chapterId: string): string {
  return path.join(getChaptersDir(projectPath, storyId), chapterId);
}

function getScenesDir(projectPath: string, storyId: string, chapterId: string): string {
  return path.join(getChapterDir(projectPath, storyId, chapterId), 'scenes');
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

export function getStoryMeta(projectPath: string, storyId: string): StoryMeta | null {
  const filePath = path.join(getStoryDir(projectPath, storyId), 'story.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch {
    return null;
  }
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

export function deleteStory(projectPath: string, storyId: string): boolean {
  const dir = getStoryDir(projectPath, storyId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

// --- Chapters ---

export function listChapters(projectPath: string, storyId: string): ChapterMeta[] {
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

export function getChapterMeta(
  projectPath: string,
  storyId: string,
  chapterId: string
): ChapterMeta | null {
  const filePath = path.join(getChapterDir(projectPath, storyId, chapterId), 'chapter.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;
    const yaml = match[1];
    const lines = yaml.split('\n');
    const meta: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2];
    }
    return {
      id: meta.id || chapterId,
      storyId,
      title: meta.title || 'Untitled',
      sortOrder: parseInt(meta.sortOrder || '0', 10),
      createdAt: meta.createdAt || new Date().toISOString(),
      modifiedAt: meta.modifiedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
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

  const frontmatter = `---\nid: ${id}\ntitle: ${title}\nsortOrder: ${maxOrder + 1}\ncreatedAt: ${now}\nmodifiedAt: ${now}\n---\n\n`;
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

  const frontmatter = `---\nid: ${updated.id}\ntitle: ${updated.title}\nsortOrder: ${updated.sortOrder}\ncreatedAt: ${updated.createdAt}\nmodifiedAt: ${updated.modifiedAt}\n---\n\n`;
  fs.writeFileSync(filePath, frontmatter);

  return updated;
}

export function deleteChapter(projectPath: string, storyId: string, chapterId: string): boolean {
  const dir = getChapterDir(projectPath, storyId, chapterId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

// --- Scenes ---

export function listScenes(projectPath: string, storyId: string, chapterId: string): SceneData[] {
  const dir = getScenesDir(projectPath, storyId, chapterId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const filePath = path.join(dir, f);
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
          if (m) meta[m[1]] = m[2];
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
          id: (meta.id as string) || f.replace('.md', ''),
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
    })
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
    title: scene.title || '',
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

  const filePath = path.join(getScenesDir(projectPath, storyId, chapterId), `${sceneId}.md`);
  const content = `---\nid: ${updated.id}\nchapterId: ${updated.chapterId}\ntitle: ${updated.title || ''}\nnarrator: ${updated.narrator || ''}\ntime: ${updated.time || ''}\nplace: ${updated.place || ''}\nparticipants: ${JSON.stringify(updated.participants)}\nbackgroundImage: ${updated.backgroundImage || ''}\nsummary: ${updated.summary || ''}\nplotThreads: ${JSON.stringify(updated.plotThreads)}\nsortOrder: ${updated.sortOrder}\ncreatedAt: ${updated.createdAt}\nmodifiedAt: ${updated.modifiedAt}\n---\n\n${updated.body}\n`;
  fs.writeFileSync(filePath, content);

  return updated;
}

export function deleteScene(
  projectPath: string,
  storyId: string,
  chapterId: string,
  sceneId: string
): boolean {
  const filePath = path.join(getScenesDir(projectPath, storyId, chapterId), `${sceneId}.md`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
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
