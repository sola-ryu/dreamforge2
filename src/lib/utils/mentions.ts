import { entityTypeToRoute } from './entityTypes';
import type { EntityType } from '$lib/types';

const MENTION_LINK = /\[@([^\]]+)\]\(mention:\/\/([a-z]+)\/([^)\s]+)\)/g;

/**
 * Rewrites the stored `[@Label](mention://type/id)` form into a link the app can
 * actually follow. Read-only views otherwise render a dead `mention://` href.
 * Unknown types keep their label but lose the link, since there is nowhere to go.
 */
export function linkifyMentions(markdown: string | null | undefined, projectId: string): string {
  if (!markdown) return '';

  return markdown.replace(MENTION_LINK, (_match, label: string, type: string, id: string) => {
    const route = entityTypeToRoute(type as EntityType);
    if (!route) return label;
    return `[@${label}](/projects/${projectId}/${route}/${id})`;
  });
}
