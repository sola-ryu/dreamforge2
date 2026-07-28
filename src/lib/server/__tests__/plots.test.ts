import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  listPlotlines,
  getPlotline,
  createPlotline,
  updatePlotline,
  deletePlotline,
  reorderBeats,
  addBeat,
  renameBeat,
  deleteBeat,
  linkSceneToBeat
} from '../plots';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-plots-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createPlotline', () => {
  it('creates an empty plotline with no template', () => {
    const plotline = createPlotline(tmpDir, { title: 'My Plot', storyId: 'story-1' });
    expect(plotline.beats).toEqual([]);
    expect(plotline.title).toBe('My Plot');
  });

  it('creates template beats with stable, unique ids', () => {
    const plotline = createPlotline(tmpDir, {
      title: 'Hero Arc',
      storyId: 'story-1',
      template: 'heros_journey'
    });
    expect(plotline.beats.length).toBeGreaterThan(0);
    for (const beat of plotline.beats) {
      expect(beat.id).toBeTruthy();
    }
    const ids = new Set(plotline.beats.map((b) => b.id));
    expect(ids.size).toBe(plotline.beats.length);
  });
});

describe('backfilling legacy beats missing an id', () => {
  it('assigns ids to beats read from a pre-existing plotline file and persists the fix', () => {
    const plotline = createPlotline(tmpDir, { title: 'Legacy', storyId: 'story-1' });
    const filePath = path.join(tmpDir, 'plotlines', `${plotline.id}.json`);

    // Simulate a plotline written before beats had an `id` field.
    const legacy = {
      ...plotline,
      beats: [
        { title: 'Beat A', sceneId: null, sortOrder: 0 },
        { title: 'Beat B', sceneId: null, sortOrder: 1 }
      ]
    };
    fs.writeFileSync(filePath, JSON.stringify(legacy, null, 2));

    const loaded = getPlotline(tmpDir, plotline.id);
    expect(loaded!.beats.every((b) => !!b.id)).toBe(true);
    expect(new Set(loaded!.beats.map((b) => b.id)).size).toBe(2);

    // The backfill is persisted, not just returned in memory.
    const reloaded = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(reloaded.beats.every((b: { id?: string }) => !!b.id)).toBe(true);
  });

  it('does not rewrite the file when every beat already has an id', () => {
    const plotline = createPlotline(tmpDir, {
      title: 'Hero Arc',
      storyId: 'story-1',
      template: 'heros_journey'
    });
    const filePath = path.join(tmpDir, 'plotlines', `${plotline.id}.json`);
    const before = fs.statSync(filePath).mtimeMs;

    getPlotline(tmpDir, plotline.id);

    expect(fs.statSync(filePath).mtimeMs).toBe(before);
  });
});

describe('addBeat', () => {
  it('appends a beat with a generated id and the next sortOrder', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    const updated = addBeat(tmpDir, plotline.id, 'The Inciting Incident');

    expect(updated!.beats).toHaveLength(1);
    expect(updated!.beats[0].title).toBe('The Inciting Incident');
    expect(updated!.beats[0].id).toBeTruthy();
    expect(updated!.beats[0].sortOrder).toBe(0);
    expect(updated!.beats[0].sceneId).toBeNull();
  });

  it('places new beats after existing ones', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'First');
    const updated = addBeat(tmpDir, plotline.id, 'Second');

    expect(updated!.beats.map((b) => b.sortOrder)).toEqual([0, 1]);
  });

  it('returns null for a non-existent plotline', () => {
    expect(addBeat(tmpDir, 'nonexistent', 'Beat')).toBeNull();
  });
});

describe('renameBeat', () => {
  it('renames the matching beat by id, leaving others untouched', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    const withBeats = addBeat(tmpDir, plotline.id, 'Original')!;
    const beatId = withBeats.beats[0].id;

    const updated = renameBeat(tmpDir, plotline.id, beatId, 'Renamed');
    expect(updated!.beats[0].title).toBe('Renamed');
    expect(updated!.beats[0].id).toBe(beatId);
  });

  it('two beats sharing the same title no longer both change (the original bug)', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'Duplicate');
    const withBoth = addBeat(tmpDir, plotline.id, 'Duplicate')!;
    const [first, second] = withBoth.beats;

    const updated = renameBeat(tmpDir, plotline.id, first.id, 'Only First Renamed');

    const stillSecond = updated!.beats.find((b) => b.id === second.id);
    expect(stillSecond!.title).toBe('Duplicate');
  });

  it('returns null for a non-existent plotline', () => {
    expect(renameBeat(tmpDir, 'nonexistent', 'beat-1', 'New')).toBeNull();
  });
});

describe('deleteBeat', () => {
  it('removes only the matching beat', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'Keep');
    const withBoth = addBeat(tmpDir, plotline.id, 'Remove')!;
    const toRemove = withBoth.beats.find((b) => b.title === 'Remove')!;

    const updated = deleteBeat(tmpDir, plotline.id, toRemove.id);
    expect(updated!.beats).toHaveLength(1);
    expect(updated!.beats[0].title).toBe('Keep');
  });

  it('is a no-op for an id that does not exist', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'Keep');

    const updated = deleteBeat(tmpDir, plotline.id, 'nonexistent');
    expect(updated!.beats).toHaveLength(1);
  });
});

describe('linkSceneToBeat', () => {
  it('sets sceneId on the matching beat by id', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    const withBeat = addBeat(tmpDir, plotline.id, 'Beat')!;
    const beatId = withBeat.beats[0].id;

    const updated = linkSceneToBeat(tmpDir, plotline.id, beatId, 'scene-42');
    expect(updated!.beats[0].sceneId).toBe('scene-42');
  });

  it('clears sceneId when passed null', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    const withBeat = addBeat(tmpDir, plotline.id, 'Beat')!;
    const beatId = withBeat.beats[0].id;
    linkSceneToBeat(tmpDir, plotline.id, beatId, 'scene-42');

    const updated = linkSceneToBeat(tmpDir, plotline.id, beatId, null);
    expect(updated!.beats[0].sceneId).toBeNull();
  });

  it('only relinks the beat matching the given id, even with duplicate titles', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'Same Title');
    const withBoth = addBeat(tmpDir, plotline.id, 'Same Title')!;
    const [first, second] = withBoth.beats;

    linkSceneToBeat(tmpDir, plotline.id, second.id, 'scene-2');

    const updated = getPlotline(tmpDir, plotline.id)!;
    expect(updated.beats.find((b) => b.id === first.id)!.sceneId).toBeNull();
    expect(updated.beats.find((b) => b.id === second.id)!.sceneId).toBe('scene-2');
  });
});

describe('reorderBeats', () => {
  it('updates sortOrder to match the given id order', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'A');
    addBeat(tmpDir, plotline.id, 'B');
    const withAll = addBeat(tmpDir, plotline.id, 'C')!;
    const [a, b, c] = withAll.beats;

    const reordered = reorderBeats(tmpDir, plotline.id, [c.id, a.id, b.id]);

    expect(reordered!.beats.map((beat) => beat.id)).toEqual([c.id, a.id, b.id]);
    expect(reordered!.beats.map((beat) => beat.sortOrder)).toEqual([0, 1, 2]);
  });

  it('reorders correctly even when two beats share a title (the original bug)', () => {
    const plotline = createPlotline(tmpDir, { title: 'Plot', storyId: 'story-1' });
    addBeat(tmpDir, plotline.id, 'Duplicate');
    const withBoth = addBeat(tmpDir, plotline.id, 'Duplicate')!;
    const [first, second] = withBoth.beats;

    const reordered = reorderBeats(tmpDir, plotline.id, [second.id, first.id]);

    expect(reordered!.beats.map((beat) => beat.id)).toEqual([second.id, first.id]);
  });
});

describe('listPlotlines / getPlotline / updatePlotline / deletePlotline', () => {
  it('lists plotlines sorted by sortOrder', () => {
    createPlotline(tmpDir, { title: 'Second', storyId: 's1' });
    createPlotline(tmpDir, { title: 'First', storyId: 's1' });
    const all = listPlotlines(tmpDir);
    expect(all.map((p) => p.title)).toEqual(['Second', 'First']);
  });

  it('updates plotline fields', () => {
    const plotline = createPlotline(tmpDir, { title: 'Old', storyId: 's1' });
    const updated = updatePlotline(tmpDir, plotline.id, { title: 'New' });
    expect(updated!.title).toBe('New');
  });

  it('deletes a plotline', () => {
    const plotline = createPlotline(tmpDir, { title: 'Gone', storyId: 's1' });
    expect(deletePlotline(tmpDir, plotline.id)).toBe(true);
    expect(getPlotline(tmpDir, plotline.id)).toBeNull();
  });
});
