import { describe, it, expect } from 'vitest';
import { mergeFields, ENTITY_FIELDS } from '$lib/entityFields';
import type { FieldDef } from '$lib/entityFields';

describe('mergeFields', () => {
  it('merges static and custom fields, deduplicating by key', () => {
    const staticFields: FieldDef[] = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ];
    const customFields: FieldDef[] = [
      { key: 'nickname', label: 'Nickname', type: 'text' },
      { key: 'name', label: 'Full Name', type: 'text' }
    ];

    const result = mergeFields(staticFields, customFields);
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('description');
    expect(result[1].key).toBe('nickname');
    expect(result[2].key).toBe('name');
  });

  it('returns only custom fields when they override all static', () => {
    const staticFields: FieldDef[] = [
      { key: 'a', label: 'A', type: 'text' },
      { key: 'b', label: 'B', type: 'text' }
    ];
    const customFields: FieldDef[] = [
      { key: 'a', label: 'Custom A', type: 'textarea' },
      { key: 'b', label: 'Custom B', type: 'textarea' }
    ];

    const result = mergeFields(staticFields, customFields);
    expect(result).toHaveLength(2);
    expect(result).toEqual(customFields);
  });

  it('preserves static fields when no custom fields provided', () => {
    const staticFields: FieldDef[] = [{ key: 'name', label: 'Name', type: 'text' }];

    const result = mergeFields(staticFields, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('name');
  });

  it('preserves static field order, appends custom fields at the end', () => {
    const staticFields: FieldDef[] = [
      { key: 'a', label: 'A', type: 'text' },
      { key: 'b', label: 'B', type: 'text' },
      { key: 'c', label: 'C', type: 'text' }
    ];
    const customFields: FieldDef[] = [
      { key: 'd', label: 'D', type: 'text' },
      { key: 'b', label: 'Custom B', type: 'textarea' }
    ];

    const result = mergeFields(staticFields, customFields);
    expect(result).toHaveLength(4);
    expect(result[0].key).toBe('a');
    expect(result[1].key).toBe('c');
    expect(result[2].key).toBe('d');
    expect(result[3].key).toBe('b');
  });

  it('handles empty static fields', () => {
    const customFields: FieldDef[] = [{ key: 'custom', label: 'Custom', type: 'text' }];
    const result = mergeFields([], customFields);
    expect(result).toEqual(customFields);
  });

  it('handles both empty arrays', () => {
    const result = mergeFields([], []);
    expect(result).toEqual([]);
  });

  it('works with actual ENTITY_FIELDS data', () => {
    const characterFields = ENTITY_FIELDS.character;
    const customFields: FieldDef[] = [{ key: 'newField', label: 'New Field', type: 'text' }];
    const result = mergeFields(characterFields, customFields);
    expect(result).toHaveLength(characterFields.length + 1);
    expect(result[result.length - 1].key).toBe('newField');
  });
});
