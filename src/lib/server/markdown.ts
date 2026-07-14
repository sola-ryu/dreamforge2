import fs from 'node:fs';
import path from 'node:path';

export interface Frontmatter {
  id: string;
  name: string;
  type: string;
  tags?: string[];
  status?: string;
  imagePath?: string | null;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

export interface MarkdownFile {
  frontmatter: Frontmatter;
  body: string;
}

export function parseMarkdown(content: string): MarkdownFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: { id: '', name: '', type: 'note' },
      body: content
    };
  }

  const frontmatter = parseYaml(match[1]);
  const body = match[2].trimStart();

  return { frontmatter: frontmatter as Frontmatter, body };
}

export function serializeMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const yaml = serializeYaml(frontmatter);
  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

export function readMarkdownFile(filePath: string): MarkdownFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseMarkdown(content);
  } catch {
    return null;
  }
}

export function writeMarkdownFile(
  filePath: string,
  frontmatter: Record<string, unknown>,
  body: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, serializeMarkdown(frontmatter, body), 'utf-8');
}

function parseYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  let blockKey: string | null = null;
  let blockLines: string[] = [];

  const flushBlock = () => {
    if (blockKey !== null) {
      result[blockKey] = blockLines.join('\n').trimEnd();
      blockKey = null;
      blockLines = [];
    }
  };

  for (const line of lines) {
    if (blockKey !== null) {
      if (line.startsWith('  ')) {
        blockLines.push(line.slice(2));
        continue;
      } else {
        flushBlock();
      }
    }

    const match = line.match(/^(\w[\w_-]*?):\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value: unknown = match[2].trim();

    if (value === '' || value === 'null') {
      value = null;
    } else if (value === '|') {
      blockKey = key;
      blockLines = [];
      continue;
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (/^\d+$/.test(value as string)) {
      value = parseInt(value as string, 10);
    } else if (/^\d+\.\d+$/.test(value as string)) {
      value = parseFloat(value as string);
    } else if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
      value = (value as string)
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
      try {
        value = JSON.parse(value as string);
      } catch {
        value = (value as string).slice(1, -1);
      }
    }

    result[key] = value;
  }

  flushBlock();
  return result;
}

function serializeYaml(data: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (key === 'body') continue;

    if (Array.isArray(value)) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'string') {
      if (value.includes('\n')) {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }

  return lines.join('\n') + '\n';
}
