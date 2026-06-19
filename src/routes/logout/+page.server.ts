import { redirect } from '@sveltejs/kit';
import db from '$lib/server/db';
import { sessions } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load = async ({ cookies }) => {
  const sessionId = cookies.get('dreamforge-session');

  if (sessionId) {
    drizzleDb.delete(sessions).where(eq(sessions.id, sessionId)).run();
    cookies.delete('dreamforge-session', { path: '/' });
  }

  throw redirect(302, '/');
};
