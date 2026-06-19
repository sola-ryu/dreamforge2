import { redirect } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export async function GET({ params, locals }) {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  return new Promise((resolve) => {
    archive.on('end', () => {
      const zipBuffer = Buffer.concat(chunks);
      resolve(
        new Response(zipBuffer, {
          headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip"`
          }
        })
      );
    });

    archive.directory(project.dataPath, false);
    archive.finalize();
  });
}
