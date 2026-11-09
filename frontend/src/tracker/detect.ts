// RÝNI tracker — UA-derived browser / OS / device / screen.
//
// Deliberately coarse: enough for aggregate breakdowns, no fingerprinting.

import type { ClientInfo } from './types';

export function detectClient(
  nav: { userAgent?: string; maxTouchPoints?: number; language?: string },
  screen?: { width: number; height: number },
): ClientInfo {
  const ua = nav.userAgent || '';
  const touch = nav.maxTouchPoints ?? 0;
  return {
    browser: detectBrowser(ua),
    os: detectOs(ua),
    device: detectDevice(ua, touch),
    screen: screen ? `${screen.width}x${screen.height}` : '',
    language: nav.language || '',
    timezone: detectTimezone(),
  };
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

export function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/chrome\//i.test(ua) && /crios\//i.test(ua)) return 'Chrome iOS';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  if (/msie|trident/i.test(ua)) return 'Internet Explorer';
  return 'Other';
}

export function detectOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/cros/i.test(ua)) return 'Chrome OS';
  return 'Other';
}

export function detectDevice(ua: string, touch: number): string {
  if (/ipad/i.test(ua)) return 'Tablet';
  if (/tablet/i.test(ua)) return 'Tablet';
  if (/mobile/i.test(ua)) return 'Mobile';
  if (touch > 1 && /android|iphone/i.test(ua)) return 'Mobile';
  return 'Desktop';
}
