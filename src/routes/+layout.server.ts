import type { LayoutServerLoad } from './$types';
import { getBookmarks } from '$lib/server/bookmarks';
import db from '$lib/server/db';
import { entities } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const drizzleDb = drizzle(db);

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const bookmarks: Array<{
    id: string;
    entityId: string;
    entityName?: string;
    entityType?: string;
  }> = [];
  let projectId = '';

  // Extract project ID from URL: /projects/[id]/...
  const match = url.pathname.match(/^\/projects\/([^/]+)/);
  if (match) {
    projectId = match[1];
    if (locals.user) {
      const userBookmarks = getBookmarks(locals.user.id, projectId);
      for (const bm of userBookmarks) {
        const entity = drizzleDb
          .select()
          .from(entities)
          .where(and(eq(entities.id, bm.entityId), eq(entities.projectId, projectId)))
          .get();
        bookmarks.push({
          id: bm.id,
          entityId: bm.entityId,
          entityName: entity?.name || bm.entityId,
          entityType: entity?.type || 'unknown'
        });
      }
    }
  }

  return {
    user: locals.user || null,
    theme: 'dark',
    bookmarks,
    projectId
  };
};
