// Site label helpers.
//
// Labels are free-form tags stored on the `sites` record as a JSON string
// array. The frontend is the only place they are normalized: PocketBase
// stores whatever array it is given, so every write goes through
// `parseLabels`. Display uses `siteLabels`, which tolerates legacy records
// that predate the field.

export const MAX_LABELS = 20;
export const MAX_LABEL_LEN = 32;

// Turn the settings dialog's comma-separated input into a clean label list:
// trimmed, blanks dropped, each label truncated, case-insensitive dedupe
// (first spelling wins), first MAX_LABELS kept.
export function parseLabels(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(',')) {
    const label = raw.trim().slice(0, MAX_LABEL_LEN);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length === MAX_LABELS) break;
  }
  return out;
}

// Safe read for rendering: anything that isn't a non-empty string array
// (missing field on legacy records) becomes an empty list.
export function siteLabels(site: { labels?: unknown }): string[] {
  if (!Array.isArray(site.labels)) return [];
  return site.labels.filter((l): l is string => typeof l === 'string' && l.trim() !== '');
}
