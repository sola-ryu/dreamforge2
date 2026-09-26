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

const PEOPLE: RelationType[] = [
  'friend',
  'lover',
  'sibling',
  'parent',
  'child',
  'mentor',
  'student',
  'ally',
  'enemy',
  'rival',
  'related_to'
];

/**
 * Relation types worth offering first for a pair of entity types; the rest are still
 * available, just under "Other", so nothing becomes unreachable.
 */
export function relationTypeGroups(
  sourceType: string,
  targetType: string | null
): { suggested: RelationType[]; other: RelationType[] } {
  const pair = [sourceType, targetType ?? sourceType];
  const has = (type: string) => pair.includes(type);

  let suggested: RelationType[];
  if (pair.every((t) => t === 'character')) suggested = PEOPLE;
  else if (has('organization'))
    suggested = ['member_of', 'leader_of', 'ally', 'enemy', 'related_to'];
  else if (has('character') && has('location')) suggested = ['home', 'located_in', 'related_to'];
  else if (has('character') && has('item'))
    suggested = ['owns', 'used_by', 'created_by', 'related_to'];
  else if (pair.every((t) => t === 'location')) suggested = ['located_in', 'part_of', 'related_to'];
  else suggested = ['related_to'];

  return { suggested, other: RELATION_TYPES.filter((t) => !suggested.includes(t)) };
}
