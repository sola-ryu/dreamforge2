import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  listStories,
  getStoryMeta,
  createStory,
  updateStory,
  deleteStory,
  listChapters,
  getChapterMeta,
  createChapter,
  updateChapter,
  deleteChapter,
  listScenes,
  getScene,
  findSceneById,
  createScene,
  updateScene,
  deleteScene,
  reorderChapters,
  reorderScenes
} from '../stories';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-stories-'));
  fs.mkdirSync(path.join(tmpDir, 'stories'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Stories ---

describe('listStories', () => {
  it('returns empty array when no stories directory exists', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-empty-'));
    const result = listStories(emptyDir);
    expect(result).toEqual([]);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('returns stories sorted by sortOrder', () => {
    createStory(tmpDir, 'Story B');
    createStory(tmpDir, 'Story A');
    const stories = listStories(tmpDir);
    expect(stories).toHaveLength(2);
    expect(stories[0].title).toBe('Story B');
    expect(stories[1].title).toBe('Story A');
  });
});

describe('createStory', () => {
  it('creates a story with metadata', () => {
    const story = createStory(tmpDir, 'Test Story', 'A description');
    expect(story.id).toBeTruthy();
    expect(story.title).toBe('Test Story');
    expect(story.description).toBe('A description');
    expect(story.sortOrder).toBe(0);
    expect(story.createdAt).toBeTruthy();
    expect(story.modifiedAt).toBeTruthy();
  });

  it('creates story directory and story.json', () => {
    const story = createStory(tmpDir, 'My Story');
    const storyPath = path.join(tmpDir, 'stories', story.id, 'story.json');
    expect(fs.existsSync(storyPath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    expect(saved.title).toBe('My Story');
  });

  it('creates chapters subdirectory', () => {
    const story = createStory(tmpDir, 'Story');
    const chaptersDir = path.join(tmpDir, 'stories', story.id, 'chapters');
    expect(fs.existsSync(chaptersDir)).toBe(true);
  });

  it('increments sortOrder for each story', () => {
    const s1 = createStory(tmpDir, 'First');
    const s2 = createStory(tmpDir, 'Second');
    expect(s1.sortOrder).toBe(0);
    expect(s2.sortOrder).toBe(1);
  });
});

describe('getStoryMeta', () => {
  it('returns null for non-existent story', () => {
    expect(getStoryMeta(tmpDir, 'nonexistent')).toBeNull();
  });

  it('returns metadata for existing story', () => {
    const story = createStory(tmpDir, 'Get Me');
    const meta = getStoryMeta(tmpDir, story.id);
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Get Me');
    expect(meta!.id).toBe(story.id);
  });
});

describe('updateStory', () => {
  it('updates story metadata', () => {
    const story = createStory(tmpDir, 'Original');
    const updated = updateStory(tmpDir, story.id, { title: 'Updated', description: 'New desc' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
    expect(updated!.description).toBe('New desc');
  });

  it('returns null for non-existent story', () => {
    expect(updateStory(tmpDir, 'nonexistent', { title: 'Nope' })).toBeNull();
  });
});

describe('deleteStory', () => {
  it('deletes story directory', () => {
    const story = createStory(tmpDir, 'Delete Me');
    expect(deleteStory(tmpDir, story.id)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'stories', story.id))).toBe(false);
  });

  it('returns false for non-existent story', () => {
    expect(deleteStory(tmpDir, 'nonexistent')).toBe(false);
  });
});

// --- Chapters ---

describe('createChapter', () => {
  it('creates a chapter', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter 1');
    expect(chapter.id).toBeTruthy();
    expect(chapter.title).toBe('Chapter 1');
    expect(chapter.sortOrder).toBe(0);
    expect(chapter.storyId).toBe(story.id);
  });

  it('creates chapter.md with frontmatter', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const mdPath = path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id, 'chapter.md');
    expect(fs.existsSync(mdPath)).toBe(true);
    const content = fs.readFileSync(mdPath, 'utf-8');
    expect(content).toContain('id: ' + chapter.id);
    expect(content).toContain('title: Ch 1');
  });

  it('creates scenes subdirectory', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scenesDir = path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id, 'scenes');
    expect(fs.existsSync(scenesDir)).toBe(true);
  });

  it('increments sortOrder', () => {
    const story = createStory(tmpDir, 'Story');
    const c1 = createChapter(tmpDir, story.id, 'First');
    const c2 = createChapter(tmpDir, story.id, 'Second');
    expect(c1.sortOrder).toBe(0);
    expect(c2.sortOrder).toBe(1);
  });
});

describe('listChapters', () => {
  it('returns chapters sorted by sortOrder', () => {
    const story = createStory(tmpDir, 'Story');
    createChapter(tmpDir, story.id, 'B');
    createChapter(tmpDir, story.id, 'A');
    const chapters = listChapters(tmpDir, story.id);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe('B');
    expect(chapters[1].title).toBe('A');
  });

  it('returns empty array for story with no chapters', () => {
    const story = createStory(tmpDir, 'Empty');
    expect(listChapters(tmpDir, story.id)).toEqual([]);
  });
});

describe('getChapterMeta', () => {
  it('returns null for non-existent chapter', () => {
    const story = createStory(tmpDir, 'Story');
    expect(getChapterMeta(tmpDir, story.id, 'nonexistent')).toBeNull();
  });

  it('returns chapter metadata', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'My Chapter');
    const meta = getChapterMeta(tmpDir, story.id, chapter.id);
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('My Chapter');
    expect(meta!.storyId).toBe(story.id);
  });
});

describe('updateChapter', () => {
  it('updates chapter metadata', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Original');
    const updated = updateChapter(tmpDir, story.id, chapter.id, { title: 'Updated' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
  });

  it('returns null for non-existent chapter', () => {
    const story = createStory(tmpDir, 'Story');
    expect(updateChapter(tmpDir, story.id, 'nonexistent', { title: 'Nope' })).toBeNull();
  });
});

describe('deleteChapter', () => {
  it('deletes chapter directory', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Delete Me');
    expect(deleteChapter(tmpDir, story.id, chapter.id)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id))).toBe(false);
  });

  it('returns false for non-existent chapter', () => {
    const story = createStory(tmpDir, 'Story');
    expect(deleteChapter(tmpDir, story.id, 'nonexistent')).toBe(false);
  });
});

// --- Scenes ---

describe('createScene', () => {
  it('creates a scene with default values', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Scene 1');
    expect(scene.id).toBeTruthy();
    expect(scene.title).toBe('Scene 1');
    expect(scene.sortOrder).toBe(0);
    expect(scene.body).toBe('');
    expect(scene.participants).toEqual([]);
    expect(scene.plotThreads).toEqual([]);
  });

  it('creates scene file on disk', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id);
    const filePath = path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id, 'scenes', `${scene.id}.md`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('increments sortOrder', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const s1 = createScene(tmpDir, story.id, chapter.id);
    const s2 = createScene(tmpDir, story.id, chapter.id);
    expect(s1.sortOrder).toBe(0);
    expect(s2.sortOrder).toBe(1);
  });
});

describe('listScenes', () => {
  it('returns scenes sorted by sortOrder', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    createScene(tmpDir, story.id, chapter.id, 'B');
    createScene(tmpDir, story.id, chapter.id, 'A');
    const scenes = listScenes(tmpDir, story.id, chapter.id);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].title).toBe('B');
    expect(scenes[1].title).toBe('A');
  });

  it('returns empty array for chapter with no scenes', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    expect(listScenes(tmpDir, story.id, chapter.id)).toEqual([]);
  });
});

describe('getScene', () => {
  it('returns a scene by id', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Find Me');
    const found = getScene(tmpDir, story.id, chapter.id, scene.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Find Me');
  });

  it('returns null for non-existent scene', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    expect(getScene(tmpDir, story.id, chapter.id, 'nonexistent')).toBeNull();
  });
});

describe('findSceneById', () => {
  it('finds a scene across all chapters', () => {
    const story = createStory(tmpDir, 'Story');
    const ch1 = createChapter(tmpDir, story.id, 'Ch 1');
    const ch2 = createChapter(tmpDir, story.id, 'Ch 2');
    const scene = createScene(tmpDir, story.id, ch2.id, 'In Ch2');
    const found = findSceneById(tmpDir, story.id, scene.id);
    expect(found).not.toBeNull();
    expect(found!.chapterId).toBe(ch2.id);
    expect(found!.scene.title).toBe('In Ch2');
  });

  it('returns null when scene not found', () => {
    const story = createStory(tmpDir, 'Story');
    expect(findSceneById(tmpDir, story.id, 'nonexistent')).toBeNull();
  });
});

describe('updateScene', () => {
  it('updates scene data', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Original');
    const updated = updateScene(tmpDir, story.id, chapter.id, scene.id, {
      title: 'Updated',
      body: 'New body text',
      participants: ['char-1']
    });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
    expect(updated!.body).toBe('New body text');
    expect(updated!.participants).toEqual(['char-1']);
  });

  it('returns null for non-existent scene', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    expect(updateScene(tmpDir, story.id, chapter.id, 'nonexistent', { title: 'Nope' })).toBeNull();
  });
});

describe('deleteScene', () => {
  it('deletes a scene file', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Delete Me');
    const deleted = deleteScene(tmpDir, story.id, chapter.id, scene.id);
    expect(deleted).toBe(true);
    const filePath = path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id, 'scenes', `${scene.id}.md`);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('returns false for non-existent scene', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    expect(deleteScene(tmpDir, story.id, chapter.id, 'nonexistent')).toBe(false);
  });
});

// --- Reordering ---

describe('reorderChapters', () => {
  it('updates sortOrder for chapters in given order', () => {
    const story = createStory(tmpDir, 'Story');
    const c1 = createChapter(tmpDir, story.id, 'First');
    const c2 = createChapter(tmpDir, story.id, 'Second');
    const c3 = createChapter(tmpDir, story.id, 'Third');

    reorderChapters(tmpDir, story.id, [c3.id, c1.id, c2.id]);

    const chapters = listChapters(tmpDir, story.id);
    expect(chapters[0].id).toBe(c3.id);
    expect(chapters[1].id).toBe(c1.id);
    expect(chapters[2].id).toBe(c2.id);
  });
});

describe('reorderScenes', () => {
  it('updates sortOrder for scenes in given order', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const s1 = createScene(tmpDir, story.id, chapter.id, 'A');
    const s2 = createScene(tmpDir, story.id, chapter.id, 'B');
    const s3 = createScene(tmpDir, story.id, chapter.id, 'C');

    reorderScenes(tmpDir, story.id, chapter.id, [s3.id, s1.id, s2.id]);

    const scenes = listScenes(tmpDir, story.id, chapter.id);
    expect(scenes[0].id).toBe(s3.id);
    expect(scenes[1].id).toBe(s1.id);
    expect(scenes[2].id).toBe(s2.id);
  });
});
