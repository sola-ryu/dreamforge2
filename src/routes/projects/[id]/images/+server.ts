import { fail } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export async function POST({ params, locals, request }) {
  if (!locals.user) return fail(401, { error: 'Unauthorized' });

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) return fail(404, { error: 'Project not found' });

  const form = await request.formData();
  const file = form.get('file') as File;
  if (!file) return fail(400, { error: 'No file provided' });

  const ext = path.extname(file.name) || '.png';
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  if (!allowed.includes(ext.toLowerCase())) {
    return fail(400, { error: 'File type not allowed' });
  }

  const imagesDir = path.join(project.dataPath, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(imagesDir, fileName);

  const buffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  return new Response(JSON.stringify({ url: `/api/projects/${params.id}/images/${fileName}` }), {
    headers: { 'content-type': 'application/json' }
  });
}
