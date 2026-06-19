import { redirect } from '@sveltejs/kit';
import { searchEntities } from '$lib/server/entities';
import db from '$lib/server/db';
import { projects } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const project = drizzleDb
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)))
    .get();
  if (!project) throw redirect(302, '/projects');

  const query = url.searchParams.get('q') || '';
  const results = query ? searchEntities(params.id, query) : [];

  return { query, results, projectName: project.name };
};
