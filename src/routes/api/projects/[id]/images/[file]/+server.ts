import fs from 'node:fs';
import path from 'node:path';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export async function GET({ params, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) return new Response('Not found', { status: 404 });

  const filePath = path.join(project.dataPath, 'images', params.file);
  if (!fs.existsSync(filePath)) return new Response('Not found', { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  const mime: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  const content = fs.readFileSync(filePath);
  return new Response(content, {
    headers: { 'content-type': mime[ext] || 'application/octet-stream' }
  });
}
