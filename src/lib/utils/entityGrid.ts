import type { FieldDef } from '$lib/entityFields';

/** A column in the entity grid: a field def plus how the grid should edit it. */
export interface GridColumn extends FieldDef {
  /** Long-text fields are edited in the side panel rather than inline. */
  panelOnly: boolean;
}

const CORE_COLUMNS: FieldDef[] = [
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'tags', label: 'Tags', type: 'tags' }
];

/**
 * Build the grid's columns from the merged (static + custom) field defs the page loads.
 * Images are excluded — they have their own link/unlink flow on the entity page.
 */
export function buildGridColumns(mergedFields: FieldDef[]): GridColumn[] {
  const fields = [
    ...CORE_COLUMNS,
    ...mergedFields.filter((f) => f.type !== 'image' && !CORE_COLUMNS.some((c) => c.key === f.key))
  ];
  return fields.map((f) => ({
    ...f,
    panelOnly: f.type === 'textarea' || f.type === 'markdown'
  }));
}

/** Read a field off an entity, accounting for the core fields that live outside frontmatter. */
export function getCellValue(entity: Record<string, any>, key: string): unknown {
  if (key === 'name') return entity.name;
  if (key === 'status') return entity.status;
  if (key === 'tags') return entity.tags;
  return entity.frontmatter?.[key];
}

/** Whether a cell renders nothing of its own, so a neighbour may overflow across it. */
export function isCellEmpty(entity: Record<string, any>, column: GridColumn): boolean {
  // Both always paint something: a checkbox, or the status icon (draft is the default).
  if (column.type === 'boolean' || column.key === 'status') return false;
  const value = getCellValue(entity, column.key);
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === '';
}

/** How a row's cells share horizontal space, spreadsheet-style. */
export interface CellLayout {
  /** Number of following columns this cell may overflow into. */
  spill: number;
  /** This cell sits in the overflow path of an earlier one, so it draws no placeholder. */
  covered: boolean;
}

export function layoutRow(entity: Record<string, any>, columns: GridColumn[]): CellLayout[] {
  const empty = columns.map((c) => isCellEmpty(entity, c));
  const layout: CellLayout[] = columns.map(() => ({ spill: 0, covered: false }));

  for (let i = 0; i < columns.length; i++) {
    if (empty[i]) {
      layout[i].covered = i > 0 && (!empty[i - 1] || layout[i - 1].covered);
      continue;
    }
    let run = 0;
    while (i + run + 1 < columns.length && empty[i + run + 1]) run++;
    layout[i].spill = run;
  }
  return layout;
}

/** The string an inline editor starts with for a given cell. */
export function toEditString(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/**
 * Apply a committed cell edit to a local entity object, mirroring the coercion the
 * `quickUpdate` action performs server-side so optimistic updates match what was saved.
 */
export function applyCellValue(
  entity: Record<string, any>,
  column: GridColumn,
  raw: string
): Record<string, any> {
  let parsed: unknown = raw;
  if (column.type === 'tags') {
    parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (column.type === 'boolean') {
    parsed = raw === 'true';
  } else if (column.type === 'number') {
    parsed = raw === '' ? '' : Number(raw);
  }

  if (column.key === 'name') return { ...entity, name: raw };
  if (column.key === 'status') return { ...entity, status: raw };
  if (column.key === 'tags') return { ...entity, tags: parsed as string[] };
  return { ...entity, frontmatter: { ...entity.frontmatter, [column.key]: parsed } };
}
