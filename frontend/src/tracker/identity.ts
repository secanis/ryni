// RÝNI tracker — visitor identity (localStorage, no cookie) + DNT gate.

const KEY_PREFIX = 'ryni_visitor_';

export function getVisitorId(storage: Pick<Storage, 'getItem' | 'setItem'>, siteId: string): string {
  const key = KEY_PREFIX + siteId;
  const existing = storage.getItem(key);
  if (existing) return existing;

  const id = generateId();
  try {
    storage.setItem(key, id);
  } catch {
    // Storage may be blocked (private mode); a fresh id per page view is
    // still usable — it just can't correlate across navigations.
  }
  return id;
}

export function shouldTrack(nav: { doNotTrack?: string | null }): boolean {
  // navigator.doNotTrack === "1" means "please don't track" → send nothing.
  return nav.doNotTrack !== '1';
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return 'v' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}
