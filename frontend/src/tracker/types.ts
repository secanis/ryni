// RÝNI tracker — shared types for the standalone browser script.

export type TrackType = 'view' | 'end' | 'heartbeat';

export type TrackingMode = 'standard' | 'session' | 'minimal';

/** The subset of `Storage` the tracker uses — no dependency on window types. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Normalize the `data-ryni-mode` attribute value to a tracking mode.
 * Unknown/absent/garbage values fall back to `standard`.
 */
export function normalizeMode(raw: string | null | undefined): TrackingMode {
  if (raw === 'session' || raw === 'minimal') return raw;
  return 'standard';
}

export interface ClientInfo {
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  timezone: string;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface Payload {
  visitor: string;
  type: TrackType;
  page?: string;
  title?: string;
  referrer?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  timezone?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  duration?: number;
}

export interface TrackerConfig {
  /** Rýni origin (Variant A) or the site's own origin (Variant B). */
  server: string;
  /** The site's tracking id — also the ingest path segment. */
  site: string;
  /** Re-fire on pushState/popstate (SPA route changes). */
  detailed: boolean;
  /** Visitor-id persistence tier: standard, session, or minimal. */
  mode: TrackingMode;
}
