export const RELATION_TYPES = [
  'related_to',
  'member_of',
  'leader_of',
  'owns',
  'home',
  'enemy',
  'ally',
  'parent',
  'child',
  'sibling',
  'mentor',
  'student',
  'friend',
  'lover',
  'rival',
  'located_in',
  'part_of',
  'created_by',
  'used_by'
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export function isRelationType(value: unknown): value is RelationType {
  return typeof value === 'string' && (RELATION_TYPES as readonly string[]).includes(value);
}

/** "member_of" reads as "member of" wherever a relation is shown to a person. */
export function relationLabel(type: string): string {
  return type.replace(/_/g, ' ');
}
