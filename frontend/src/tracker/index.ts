// RÝNI tracker — standalone browser entry point.
//
// Bundled to an IIFE (frontend/public/ryni.js) and loaded via:
//   <script src="..." data-ryni-server="https://ryni.example"
//           data-ryni-site="<tracking_id>" data-ryni-detailed></script>
//
// Reads config synchronously (document.currentScript), then:
//   - honors Do Not Track,
//   - reads/creates the visitor id in localStorage,
//   - POSTs a "view" via sendBeacon (text/plain → no CORS preflight),
//   - heartbeats every 60s while visible,
//   - sends "end" + duration on pagehide/visibilitychange,
//   - re-fires on pushState/popstate when data-ryni-detailed is set.

import { getVisitorId, shouldTrack } from './identity';
import { detectClient } from './detect';
import { buildPayload, endpointUrl } from './track';
import type { TrackerConfig, UtmParams } from './types';

function readConfig(): TrackerConfig {
  const el = document.currentScript as HTMLScriptElement | null;
  return {
    server: (el?.getAttribute('data-ryni-server') || '').replace(/\/+$/, ''),
    site: el?.getAttribute('data-ryni-site') || '',
    detailed: el?.hasAttribute('data-ryni-detailed') ?? false,
  };
}

function currentPath(): string {
  return location.pathname + location.search;
}

// Pull the standard UTM campaign params from the URL query (skipped entirely
// when none are present, so we don't store a bundle of empty strings).
function utmParams(): UtmParams | undefined {
  try {
    const q = new URLSearchParams(location.search);
    const source = q.get('utm_source');
    const medium = q.get('utm_medium');
    const campaign = q.get('utm_campaign');
    if (!source && !medium && !campaign) return undefined;
    return {
      source: source || undefined,
      medium: medium || undefined,
      campaign: campaign || undefined,
    };
  } catch {
    return undefined;
  }
}

const cfg = readConfig();
const visitor = cfg.site ? getVisitorId(window.localStorage, cfg.site) : '';

let pageStart = Date.now();
let tracked = false;

function send(type: 'view' | 'end' | 'heartbeat', duration?: number): void {
  if (!cfg.server || !cfg.site || !visitor) return;
  const payload = buildPayload({
    visitor,
    type,
    page: type === 'view' ? currentPath() : undefined,
    title: type === 'view' ? document.title : undefined,
    referrer: type === 'view' ? document.referrer : undefined,
    client: type === 'view' ? detectClient(navigator, window.screen) : undefined,
    utm: type === 'view' ? utmParams() : undefined,
    duration,
  });
  try {
    navigator.sendBeacon(endpointUrl(cfg.server, cfg.site), JSON.stringify(payload));
  } catch {
    /* no-op — tracking must never break the page */
  }
}

function trackPage(): void {
  send('view');
  pageStart = Date.now();
}

function endSession(): void {
  send('end', Math.max(0, Math.round((Date.now() - pageStart) / 1000)));
}

function start(): void {
  if (!cfg.server || !cfg.site) return;
  if (!shouldTrack(navigator)) return;

  trackPage();

  // Heartbeat for the live-visitor count.
  setInterval(() => {
    if (document.visibilityState === 'visible') send('heartbeat');
  }, 60_000);

  // Final duration on tab hide / close.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') endSession();
  });
  window.addEventListener('pagehide', endSession);

  // SPA route changes (only when explicitly requested).
  if (cfg.detailed) {
    type HistoryFn = (data: unknown, unused: string, url?: string | URL | null) => void;
    const wrap = (orig: HistoryFn): HistoryFn =>
      function (this: unknown, data: unknown, unused: string, url?: string | URL | null) {
        orig.call(this, data, unused, url);
        trackPage();
      };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', trackPage);
  }

  tracked = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

export { tracked };
