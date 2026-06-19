import { redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();

  if (!project) {
    throw redirect(302, '/projects');
  }

  return {
    project: {
      ...project,
      pinned: Boolean(project.pinned)
    }
  };
};
