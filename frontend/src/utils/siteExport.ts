import { pb } from '~/services/pocketbase';
import type { SiteExportPayload, SiteExportRecord } from '~/types';

// Client-side rendering of the raw-records export. The backend returns one
// JSON payload; CSV and JSON share the same column order and values.

export const CSV_COLUMNS: readonly (keyof SiteExportRecord)[] = [
  'created',
  'path',
  'title',
  'referrer',
  'browser',
  'os',
  'device',
  'screen_size',
  'language',
  'timezone',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'duration',
  'is_new_visitor',
];

export async function fetchSiteExport(
  siteId: string,
  range: { from: string; to: string },
): Promise<SiteExportPayload> {
  return (await pb.send(`/api/ryni/sites/${siteId}/export`, {
    query: range,
  })) as SiteExportPayload;
}

// Cells beginning with these characters can be interpreted as formulas by
// spreadsheet apps, so a leading apostrophe neutralises them.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function escapeCell(value: string): string {
  let cell = value;
  if (FORMULA_LEAD.test(cell)) cell = `'${cell}`;
  if (/[",\n\r]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function toCsv(payload: SiteExportPayload): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of payload.records) {
    lines.push(
      CSV_COLUMNS.map((key) => {
        const value = row[key];
        return typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : escapeCell(value);
      }).join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function toJson(payload: SiteExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function exportFilename(siteName: string, from: string, to: string, ext: string): string {
  const slug =
    siteName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'site';
  return `ryni-${slug}-${from.slice(0, 10)}_${to.slice(0, 10)}.${ext}`;
}
