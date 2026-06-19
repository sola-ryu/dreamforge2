import db from '$lib/server/db';
import { sessions, users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from '$lib/server/migrate';
import { seed } from '$lib/server/seed';
import type { Handle } from '@sveltejs/kit';

const drizzleDb = drizzle(db);

// Run migrations and seed on startup
migrate();
seed();

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('dreamforge-session');

  if (sessionId) {
    const session = drizzleDb
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (session && session.expiresAt > Math.floor(Date.now() / 1000)) {
      const user = drizzleDb
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .get();

      event.locals.user = user || null;
      event.locals.session = session;
    } else {
      if (session) {
        drizzleDb.delete(sessions).where(eq(sessions.id, sessionId)).run();
      }
      event.cookies.delete('dreamforge-session', { path: '/' });
      event.locals.user = null;
      event.locals.session = null;
    }
  } else {
    event.locals.user = null;
    event.locals.session = null;
  }

  const response = await resolve(event);
  return response;
};
