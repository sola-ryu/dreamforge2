import fs from 'node:fs';
import path from 'node:path';
import type { WritingProgress } from '$lib/types';

export interface WritingLogFile {
  dailyGoal: number;
  storyTargets: Record<string, number>;
  days: Record<string, number>;
}

const LOG_FILE = 'writing-log.json';
const RECENT_DAYS = 14;
const KEEP_DAYS = 400;

export const DEFAULT_DAILY_GOAL = 500;

/** Local-time YYYY-MM-DD — writers think in their own day, not UTC. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDay(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + deltaDays);
  return dayKey(date);
}

function logPath(projectPath: string): string {
  return path.join(projectPath, LOG_FILE);
}

export function readWritingLog(projectPath: string): WritingLogFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(logPath(projectPath), 'utf-8'));
    return {
      dailyGoal:
        typeof parsed.dailyGoal === 'number' && parsed.dailyGoal >= 0
          ? parsed.dailyGoal
          : DEFAULT_DAILY_GOAL,
      storyTargets:
        parsed.storyTargets && typeof parsed.storyTargets === 'object' ? parsed.storyTargets : {},
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {}
    };
  } catch {
    return { dailyGoal: DEFAULT_DAILY_GOAL, storyTargets: {}, days: {} };
  }
}

function writeWritingLog(projectPath: string, log: WritingLogFile): void {
  try {
    fs.writeFileSync(logPath(projectPath), JSON.stringify(log, null, 2));
  } catch {
    // The log is a convenience layer over the Markdown files; a project directory
    // that cannot be written to should not break saving a scene.
  }
}

/**
 * Adds `delta` words to today's tally. Deletions (a negative delta) count against
 * the day so the number reflects net progress, but a day never goes below zero —
 * otherwise a large cut would hide the next day's work behind a deficit.
 */
export function recordWords(projectPath: string, delta: number, now: Date = new Date()): void {
  if (!Number.isFinite(delta) || delta === 0) return;

  const log = readWritingLog(projectPath);
  const key = dayKey(now);
  log.days[key] = Math.max(0, (log.days[key] || 0) + delta);

  const cutoff = shiftDay(key, -KEEP_DAYS);
  for (const day of Object.keys(log.days)) {
    if (day < cutoff) delete log.days[day];
  }

  writeWritingLog(projectPath, log);
}

export function setDailyGoal(projectPath: string, goal: number): void {
  const log = readWritingLog(projectPath);
  log.dailyGoal = Math.max(0, Math.round(goal));
  writeWritingLog(projectPath, log);
}

export function setStoryTarget(projectPath: string, storyId: string, target: number): void {
  const log = readWritingLog(projectPath);
  if (target > 0) {
    log.storyTargets[storyId] = Math.round(target);
  } else {
    delete log.storyTargets[storyId];
  }
  writeWritingLog(projectPath, log);
}

export function getWritingProgress(projectPath: string, now: Date = new Date()): WritingProgress {
  const log = readWritingLog(projectPath);
  const today = dayKey(now);

  const recent: Array<{ date: string; words: number }> = [];
  for (let i = RECENT_DAYS - 1; i >= 0; i--) {
    const date = shiftDay(today, -i);
    recent.push({ date, words: log.days[date] || 0 });
  }

  let total30 = 0;
  for (let i = 0; i < 30; i++) {
    total30 += log.days[shiftDay(today, -i)] || 0;
  }

  // A streak survives an unwritten today (the day isn't over), but not an
  // unwritten yesterday.
  let streak = 0;
  let cursor = (log.days[today] || 0) > 0 ? today : shiftDay(today, -1);
  while ((log.days[cursor] || 0) > 0) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }

  return {
    dailyGoal: log.dailyGoal,
    storyTargets: log.storyTargets,
    todayWords: log.days[today] || 0,
    streak,
    best: Object.values(log.days).reduce((max, n) => Math.max(max, n), 0),
    total30,
    recent
  };
}
