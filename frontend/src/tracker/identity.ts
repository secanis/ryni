// RÝNI tracker — visitor identity (no cookie) + DNT gate.

import type { StorageLike, TrackingMode } from './types';

const KEY_PREFIX = 'ryni_visitor_';

export interface VisitorStores {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
}

/**
 * Resolve the visitor id for a site according to the tracking mode.
 * Never throws: every storage read/write is wrapped, a failing store is
 * skipped rather than fatal.
 *
 * - `minimal`  → a fresh id per call, no storage touched.
 * - `session`  → read/write sessionStorage only.
 * - `standard` → read localStorage then sessionStorage; write localStorage
 *                then sessionStorage (falls back when localStorage is blocked).
 */
export function resolveVisitorId(stores: VisitorStores, siteId: string, mode: TrackingMode): string {
  const key = KEY_PREFIX + siteId;

  if (mode === 'minimal') return generateId();

  const ordered: Array<StorageLike | null | undefined> =
    mode === 'session' ? [stores.sessionStorage] : [stores.localStorage, stores.sessionStorage];

  return getOrCreate(ordered, key);
}

function getOrCreate(stores: Array<StorageLike | null | undefined>, key: string): string {
  for (const store of stores) {
    if (!store) continue;
    try {
      const existing = store.getItem(key);
      if (existing) return existing;
    } catch {
      // Storage read blocked (private mode etc.) — skip to the next store.
    }
  }

  const id = generateId();
  for (const store of stores) {
    if (!store) continue;
    try {
      store.setItem(key, id);
      return id;
    } catch {
      // Write blocked — try the next store.
    }
  }
  return id; // Ephemeral: no store accepted the id, but a fresh id still works.
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
