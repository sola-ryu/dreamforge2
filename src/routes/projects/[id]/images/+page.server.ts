import { fail, redirect } from '@sveltejs/kit';
import { listProjectImages, uploadImages, scanExistingImages } from '$lib/server/images';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) throw redirect(302, '/projects');

  scanExistingImages(params.id, project.dataPath);
  const images = listProjectImages(params.id, project.dataPath);

  return {
    project: { ...project, pinned: Boolean(project.pinned) },
    images
  };
};

export const actions = {
  upload: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const project = drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
      .get();

    if (!project) return fail(404, { error: 'Project not found' });

    const form = await request.formData();
    const files = form.getAll('files') as File[];

    if (!files || files.length === 0) {
      return fail(400, { error: 'No files provided' });
    }

    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const uploads: { name: string; buffer: Buffer }[] = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowed.includes(ext)) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      uploads.push({ name: file.name, buffer });
    }

    if (uploads.length === 0) {
      return fail(400, { error: 'No valid image files provided' });
    }

    uploadImages(params.id, project.dataPath, uploads);

    return { success: true, count: uploads.length };
  }
};
