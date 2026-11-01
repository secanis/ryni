// RÝNI tracker — shared types for the standalone browser script.

export type TrackType = 'view' | 'end' | 'heartbeat';

export interface ClientInfo {
  browser: string;
  os: string;
  device: string;
  screen: string;
}

export interface Payload {
  visitor: string;
  type: TrackType;
  page?: string;
  referrer?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  duration?: number;
}

export interface TrackerConfig {
  /** Rýni origin (Variant A) or the site's own origin (Variant B). */
  server: string;
  /** The site's tracking id — also the ingest path segment. */
  site: string;
  /** Re-fire on pushState/popstate (SPA route changes). */
  detailed: boolean;
}
