// RÝNI — shared frontend types.

export type TrackingMode = 'standard' | 'session' | 'minimal';

export type DisclosureMode = 'none' | 'text' | 'banner';

export interface Site {
  id: string;
  name: string;
  tracking_id: string;
  allowed_origins: string[];
  endpoint_slug: string;
  created_by: string;
  managers: string[];
  viewers: string[];
  created: string;
  updated: string;
  tracking_mode?: TrackingMode;
  disclosure_mode?: DisclosureMode;
  labels?: string[];
}

export interface Breakdown {
  value: string;
  count: number;
}

export interface SeriesPoint {
  date: string;
  views: number;
  uniqueVisitors: number;
}

export interface SiteStats {
  views: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  sessions: number;
  pagesPerSession: number;
  avgDuration: number;
  avgSessionDuration: number;
  bounceRate: number;
  currentVisitors: number;
  series: SeriesPoint[];
  referrers: Breakdown[];
  browsers: Breakdown[];
  os: Breakdown[];
  devices: Breakdown[];
  screens: Breakdown[];
  pages: Breakdown[];
  hours: Breakdown[];
  daysOfWeek: Breakdown[];
  durations: Breakdown[];
  landingPages: Breakdown[];
  exitPages: Breakdown[];
  languages: Breakdown[];
  timezones: Breakdown[];
  titles: Breakdown[];
  utmSources: Breakdown[];
  utmMediums: Breakdown[];
  utmCampaigns: Breakdown[];
}

export interface SiteExportRecord {
  created: string;
  path: string;
  title: string;
  referrer: string;
  browser: string;
  os: string;
  device: string;
  screen_size: string;
  language: string;
  timezone: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  duration: number;
  is_new_visitor: boolean;
}

export interface SiteExportPayload {
  site: { id: string; name: string; tracking_id: string };
  from: string;
  to: string;
  exportedAt: string;
  records: SiteExportRecord[];
}

export interface Snippets {
  variantA: string;
  variantB: string;
  proxyNote: string;
}

export interface SiteMember {
  id: string;
  email: string;
  name: string;
}

export interface SiteMembers {
  managers: SiteMember[];
  viewers: SiteMember[];
}
