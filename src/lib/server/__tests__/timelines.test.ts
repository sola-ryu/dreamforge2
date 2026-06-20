import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadTimeline,
  addEvent,
  updateEvent,
  deleteEvent,
  updateCalendar
} from '../timelines';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-timeline-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadTimeline', () => {
  it('returns default timeline when no file exists', () => {
    const result = loadTimeline(tmpDir);
    expect(result.calendar.name).toBe('Gregorian');
    expect(result.calendar.months).toHaveLength(12);
    expect(result.calendar.epoch).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('loads timeline from existing file', () => {
    const data = {
      calendar: { name: 'Test', months: ['Jan', 'Feb'], epoch: 1000 },
      events: []
    };
    fs.writeFileSync(path.join(tmpDir, 'timeline.json'), JSON.stringify(data));

    const result = loadTimeline(tmpDir);
    expect(result.calendar.name).toBe('Test');
    expect(result.calendar.months).toEqual(['Jan', 'Feb']);
    expect(result.calendar.epoch).toBe(1000);
  });

  it('loads timeline with events', () => {
    const data = {
      calendar: { name: 'Gregorian', months: ['Jan'], epoch: 0 },
      events: [
        {
          id: 'evt-1', year: 100, month: 1, day: 1, era: 'AD',
          title: 'Event', description: 'Desc', significance: 'major' as const,
          entityIds: [], createdAt: 'now', modifiedAt: 'now'
        }
      ]
    };
    fs.writeFileSync(path.join(tmpDir, 'timeline.json'), JSON.stringify(data));

    const result = loadTimeline(tmpDir);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Event');
  });
});

describe('addEvent', () => {
  it('adds and returns a new event', () => {
    const event = addEvent(tmpDir, {
      year: 100, month: 1, day: 1, era: 'AD',
      title: 'Battle', description: 'Great battle', significance: 'major',
      entityIds: ['ent-1']
    });

    expect(event.id).toBeTruthy();
    expect(event.title).toBe('Battle');
    expect(event.createdAt).toBeTruthy();
    expect(event.modifiedAt).toBe(event.createdAt);
  });

  it('persists event to disk', () => {
    addEvent(tmpDir, {
      year: 200, month: null, day: null, era: 'AD',
      title: 'Persisted', description: '', significance: 'minor',
      entityIds: []
    });

    const reloaded = loadTimeline(tmpDir);
    expect(reloaded.events).toHaveLength(1);
    expect(reloaded.events[0].title).toBe('Persisted');
  });

  it('sorts events by year, month, day', () => {
    addEvent(tmpDir, { year: 300, month: 6, day: 1, era: 'AD', title: 'Mid', description: '', significance: 'trivial', entityIds: [] });
    addEvent(tmpDir, { year: 100, month: 1, day: 1, era: 'AD', title: 'Early', description: '', significance: 'major', entityIds: [] });
    addEvent(tmpDir, { year: 500, month: 1, day: 1, era: 'AD', title: 'Late', description: '', significance: 'major', entityIds: [] });

    const result = loadTimeline(tmpDir);
    expect(result.events.map((e) => e.title)).toEqual(['Early', 'Mid', 'Late']);
  });

  it('sorts events with same year by month and day', () => {
    addEvent(tmpDir, { year: 100, month: 3, day: 15, era: 'AD', title: 'C', description: '', significance: 'minor', entityIds: [] });
    addEvent(tmpDir, { year: 100, month: 1, day: 1, era: 'AD', title: 'A', description: '', significance: 'major', entityIds: [] });
    addEvent(tmpDir, { year: 100, month: 2, day: 10, era: 'AD', title: 'B', description: '', significance: 'major', entityIds: [] });

    const result = loadTimeline(tmpDir);
    expect(result.events.map((e) => e.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('updateEvent', () => {
  it('updates an existing event', async () => {
    const added = addEvent(tmpDir, {
      year: 100, month: 1, day: 1, era: 'AD',
      title: 'Old Title', description: 'Old', significance: 'minor',
      entityIds: []
    });

    await new Promise((r) => setTimeout(r, 10));

    const updated = updateEvent(tmpDir, added.id, { title: 'New Title', significance: 'major' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('New Title');
    expect(updated!.significance).toBe('major');
    expect(updated!.modifiedAt).not.toBe(added.modifiedAt);
  });

  it('returns null for non-existent event', () => {
    const result = updateEvent(tmpDir, 'nonexistent', { title: 'Nope' });
    expect(result).toBeNull();
  });
});

describe('deleteEvent', () => {
  it('deletes an existing event', () => {
    const added = addEvent(tmpDir, {
      year: 100, month: 1, day: 1, era: 'AD',
      title: 'ToDelete', description: '', significance: 'major',
      entityIds: []
    });

    const deleted = deleteEvent(tmpDir, added.id);
    expect(deleted).toBe(true);

    const reloaded = loadTimeline(tmpDir);
    expect(reloaded.events).toHaveLength(0);
  });

  it('returns false for non-existent event', () => {
    expect(deleteEvent(tmpDir, 'nonexistent')).toBe(false);
  });
});

describe('updateCalendar', () => {
  it('updates calendar config', () => {
    const result = updateCalendar(tmpDir, { name: 'Test Calendar', epoch: 500 });
    expect(result.name).toBe('Test Calendar');
    expect(result.epoch).toBe(500);
    expect(result.months).toHaveLength(12);
  });

  it('persists calendar changes', () => {
    updateCalendar(tmpDir, { name: 'Persisted Calendar' });
    const reloaded = loadTimeline(tmpDir);
    expect(reloaded.calendar.name).toBe('Persisted Calendar');
  });
});
