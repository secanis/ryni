// RÝNI — shared frontend types.

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
  avgDuration: number;
  bounceRate: number;
  currentVisitors: number;
  series: SeriesPoint[];
  referrers: Breakdown[];
  browsers: Breakdown[];
  os: Breakdown[];
  devices: Breakdown[];
  screens: Breakdown[];
  pages: Breakdown[];
}

export interface Snippets {
  variantA: string;
  variantB: string;
  proxyNote: string;
}
