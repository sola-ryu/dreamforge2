import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = env.DATABASE_PATH || path.join(process.cwd(), 'data', 'dreamforge.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (dev) {
  db.pragma('journal_mode = MEMORY');
}

export default db;
