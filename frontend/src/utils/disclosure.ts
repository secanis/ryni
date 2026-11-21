// RÝNI — privacy disclosure copy and dismissal banner generators.

import type { TrackingMode } from '~/types';

export interface DisclosureTextInput {
  mode: TrackingMode;
  siteName?: string;
}

export interface BannerSnippetInput {
  mode: TrackingMode;
  privacyUrl?: string;
}

const OPENING = 'This website uses Rýni, a self-hosted privacy-friendly analytics tool.';

const RECORDS =
  'It records the pages you view, the referring site, your browser and device type, screen size, language, time zone, and the time spent on each page.';

const TAIL =
  'No IP address is stored, no cross-site tracking is performed, and the data never leaves this server. ' +
  'The legal basis is legitimate interest (Art. 6(1)(f) GDPR) in understanding how this site is used. ' +
  "You can object at any time by enabling the 'Do Not Track' setting in your browser. " +
  'Data is retained for [retention period]. Controller: [controller name and contact].';

/** Storage-and-recording middle sentences, tier-dependent. */
function middle(mode: TrackingMode): string {
  switch (mode) {
    case 'session':
      return (
        'To measure a single visit, Rýni stores a temporary random identifier for the duration of your visit only (nothing persistent). ' +
        RECORDS
      );
    case 'minimal':
      return 'Rýni stores nothing on your device and cannot link your visits together. It records only anonymous page views together with your browser and device type.';
    default:
      return (
        "To count unique visits, Rýni stores a random identifier in your browser's local storage (no cookies are used). " +
        RECORDS
      );
  }
}

/** Canonical privacy disclosure text for a tracking tier. */
export function disclosureText(input: DisclosureTextInput): string {
  return `${OPENING} ${middle(input.mode)} ${TAIL}`;
}

const SUMMARIES: Record<TrackingMode, string> = {
  standard: 'This site uses privacy-friendly analytics.',
  session: 'This site measures visits with a temporary, non-persistent identifier.',
  minimal: 'This site counts anonymous page views — nothing is stored on your device.',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Self-contained fixed bottom banner: inline styles + inline script, no external
 * requests, no consent buttons. Dismissal is stored per tier: `standard` persists
 * in localStorage, `session`/`minimal` in sessionStorage (storage guarded by
 * try/catch so a blocked storage never throws on the host page).
 */
export function bannerSnippet(input: BannerSnippetInput): string {
  const mode: TrackingMode =
    input.mode === 'session' || input.mode === 'minimal' ? input.mode : 'standard';
  const summary = SUMMARIES[mode];
  const storage = mode === 'standard' ? 'localStorage' : 'sessionStorage';
  const learnMore = input.privacyUrl
    ? `<a href="${escapeHtml(input.privacyUrl)}" target="_blank" rel="noopener noreferrer" style="color:#93c5fd;text-decoration:underline;">Learn more</a>`
    : '';

  return `<div id="ryni-disclosure" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 14px;padding:12px 16px;background:#1f2937;color:#f3f4f6;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;box-shadow:0 -1px 4px rgba(0,0,0,0.35);"><span>${summary}</span>${learnMore}<button id="ryni-disclosure-dismiss" type="button" aria-label="Dismiss" style="cursor:pointer;border:1px solid #6b7280;background:transparent;color:#f3f4f6;border-radius:6px;padding:4px 10px;font-size:13px;line-height:1.4;">Dismiss</button></div><script>(function(){var key='ryni_disclosure_dismissed';var bar=document.getElementById('ryni-disclosure');var btn=document.getElementById('ryni-disclosure-dismiss');function hide(){if(bar&&bar.parentNode){bar.parentNode.removeChild(bar);}}function dismiss(){try{${storage}.setItem(key,'1');}catch(e){}hide();}try{if(${storage}.getItem(key)){hide();}}catch(e){}if(btn){btn.addEventListener('click',dismiss);}})();</script>`;
}
