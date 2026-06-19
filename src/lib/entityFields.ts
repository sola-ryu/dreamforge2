import type { EntityType } from '$lib/types';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'tags' | 'markdown' | 'entityRef' | 'image' | 'boolean' | 'date';
  entityType?: EntityType;
  placeholder?: string;
  required?: boolean;
}

export const ENTITY_FIELDS: Record<EntityType, FieldDef[]> = {
  character: [
    { key: 'motivations', label: 'Motivations', type: 'textarea' },
    { key: 'traits', label: 'Traits', type: 'tags' },
    { key: 'backstory', label: 'Backstory', type: 'markdown' },
    { key: 'personalityType', label: 'Personality Type', type: 'text', placeholder: 'e.g. INTJ, Choleric' }
  ],
  organization: [
    { key: 'members', label: 'Members', type: 'entityRef', entityType: 'character' },
    { key: 'leaders', label: 'Leaders', type: 'entityRef', entityType: 'character' },
    { key: 'ownership', label: 'Ownership', type: 'tags' }
  ],
  location: [
    { key: 'geology', label: 'Geology', type: 'textarea' },
    { key: 'ecosystem', label: 'Ecosystem', type: 'textarea' },
    { key: 'parentLocation', label: 'Parent Location', type: 'entityRef', entityType: 'location' },
    { key: 'landOwnership', label: 'Land Ownership', type: 'text' }
  ],
  culture: [
    { key: 'languages', label: 'Languages', type: 'tags' },
    { key: 'rituals', label: 'Rituals & Ceremonies', type: 'textarea' },
    { key: 'values', label: 'Value Systems', type: 'textarea' },
    { key: 'mythos', label: 'Mythos', type: 'markdown' }
  ],
  species: [
    { key: 'biology', label: 'Biology', type: 'textarea' },
    { key: 'traits', label: 'Traits', type: 'tags' },
    { key: 'subtypes', label: 'Subtypes', type: 'tags' },
    { key: 'influence', label: 'World Influence', type: 'textarea' }
  ],
  item: [
    { key: 'owner', label: 'Owner', type: 'entityRef', entityType: 'character' },
    { key: 'significance', label: 'Significance', type: 'textarea' },
    { key: 'properties', label: 'Properties', type: 'tags' }
  ],
  note: []
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  character: 'Character',
  organization: 'Organization',
  location: 'Location',
  culture: 'Culture',
  species: 'Species',
  item: 'Item',
  note: 'Note'
};

export const ENTITY_PLURAL: Record<EntityType, string> = {
  character: 'Characters',
  organization: 'Organizations',
  location: 'Locations',
  culture: 'Cultures',
  species: 'Species',
  item: 'Items',
  note: 'Notes'
};

export function mergeFields(staticFields: FieldDef[], customFields: FieldDef[]): FieldDef[] {
  const customKeys = new Set(customFields.map((f) => f.key));
  return [...staticFields.filter((f) => !customKeys.has(f.key)), ...customFields];
}
