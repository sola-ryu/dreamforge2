import type { FieldDef } from '$lib/entityFields';

/** A column in the entity grid: a field def plus how the grid should edit it. */
export interface GridColumn extends FieldDef {
  /** Long-text fields are edited in the side panel rather than inline. */
  panelOnly: boolean;
}

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', class: 'text-muted-foreground' },
  { value: 'wip', label: 'In Progress', class: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'complete', label: 'Complete', class: 'text-green-600 dark:text-green-400' }
] as const;

export type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];

/** The option a stored status maps to; anything unrecognised reads as draft. */
export function statusOption(value: unknown) {
  return STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[0];
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

/** Columns the grid always shows: the spreadsheet's row header and its cursor anchor. */
export const LOCKED_COLUMNS = ['status', 'name'];

/**
 * The columns worth showing before the user has chosen: the locked ones, tags, and any
 * field at least one row has filled in. Fields nobody has touched stay behind the picker.
 */
export function defaultVisibleKeys(
  rows: Record<string, any>[],
  columns: GridColumn[]
): Set<string> {
  const keys = new Set<string>([...LOCKED_COLUMNS, 'tags']);
  for (const column of columns) {
    const filled = (row: Record<string, any>) =>
      column.type === 'boolean'
        ? getCellValue(row, column.key) === true
        : !isCellEmpty(row, column);
    if (rows.some(filled)) keys.add(column.key);
  }
  return keys;
}

export type SortDirection = 'asc' | 'desc';

function sortKey(entity: Record<string, any>, column: GridColumn): string | number | null {
  const value = getCellValue(entity, column.key);
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? value.join(', ').toLowerCase() : null;
  if (column.type === 'number') {
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
  if (column.type === 'boolean') return value === true ? 1 : 0;
  const text = String(value).trim().toLowerCase();
  return text === '' ? null : text;
}

/** Stable sort by one column; rows with nothing in the cell always sink to the bottom. */
export function sortRows<T extends Record<string, any>>(
  rows: T[],
  column: GridColumn,
  direction: SortDirection
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, key: sortKey(row, column) }))
    .sort((a, b) => {
      if (a.key === null && b.key === null) return a.index - b.index;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      if (typeof a.key === 'number' && typeof b.key === 'number') {
        return (a.key - b.key) * sign || a.index - b.index;
      }
      return (
        String(a.key).localeCompare(String(b.key), undefined, { numeric: true }) * sign ||
        a.index - b.index
      );
    })
    .map((entry) => entry.row);
}

/** Split clipboard text (spreadsheet-style TSV) into a rows × cells matrix. */
export function parseClipboardGrid(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}

/**
 * A pasted value in the form `quickUpdate` accepts, or null when the column cannot take
 * it (an unknown status, a number that is not one).
 */
export function normalizePastedValue(column: GridColumn, raw: string): string | null {
  const value = raw.trim();
  if (column.key === 'status') {
    const option = STATUS_OPTIONS.find(
      (o) => o.value === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
    );
    return option ? option.value : null;
  }
  if (column.key === 'name') return value === '' ? null : value;
  if (column.type === 'number') return value === '' || !Number.isNaN(Number(value)) ? value : null;
  if (column.type === 'boolean') {
    const truthy = ['true', 'yes', 'y', '1', 'x', 'on'];
    const falsy = ['false', 'no', 'n', '0', '', 'off'];
    if (truthy.includes(value.toLowerCase())) return 'true';
    if (falsy.includes(value.toLowerCase())) return 'false';
    return null;
  }
  return column.type === 'textarea' || column.type === 'markdown' ? raw.trimEnd() : value;
}
