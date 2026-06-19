import type { EntityType } from '$lib/types';

const ROUTE_MAP: Record<string, EntityType> = {
  characters: 'character',
  organizations: 'organization',
  locations: 'location',
  cultures: 'culture',
  species: 'species',
  items: 'item',
  notes: 'note'
};

const TYPE_TO_ROUTE: Record<EntityType, string> = {
  character: 'characters',
  organization: 'organizations',
  location: 'locations',
  culture: 'cultures',
  species: 'species',
  item: 'items',
  note: 'notes'
};

export function routeToEntityType(route: string): EntityType | null {
  return ROUTE_MAP[route] || null;
}

export function entityTypeToRoute(type: EntityType): string {
  return TYPE_TO_ROUTE[type];
}

export function isValidEntityRoute(route: string): boolean {
  return route in ROUTE_MAP;
}
