export interface CampaignUrlInput {
  /** Page URL (absolute or root-relative) the campaign link should point at. */
  base: string;
  /** utm_source — where the traffic comes from. */
  source?: string;
  /** utm_medium — the channel type. */
  medium?: string;
  /** utm_campaign — the specific campaign. */
  campaign?: string;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

/**
 * Append UTM campaign parameters to a URL.
 *
 * Existing query parameters and the fragment are preserved. Any existing
 * `utm_source` / `utm_medium` / `utm_campaign` values are replaced, so editing
 * a campaign always yields exactly one value per parameter. Empty values are
 * omitted; with no values at all the base URL is returned unchanged.
 */
export function buildCampaignUrl(input: CampaignUrlInput): string {
  const base = input.base.trim();
  if (!base) return '';

  const next: Array<[string, string | undefined]> = [
    ['utm_source', input.source],
    ['utm_medium', input.medium],
    ['utm_campaign', input.campaign],
  ];
  // Nothing to build: keep the URL exactly as entered.
  if (!next.some(([, raw]) => raw?.trim())) return base;

  const hashAt = base.indexOf('#');
  const hash = hashAt === -1 ? '' : base.slice(hashAt);
  let head = hashAt === -1 ? base : base.slice(0, hashAt);

  const queryAt = head.indexOf('?');
  const query = queryAt === -1 ? '' : head.slice(queryAt + 1);
  if (queryAt !== -1) head = head.slice(0, queryAt);

  const pairs = query
    ? query
        .split('&')
        .filter(Boolean)
        .filter((pair) => !UTM_KEYS.includes(pair.split('=')[0] as (typeof UTM_KEYS)[number]))
    : [];

  for (const [key, raw] of next) {
    const value = raw?.trim();
    if (value) pairs.push(`${key}=${encodeURIComponent(value)}`);
  }

  return head + (pairs.length ? `?${pairs.join('&')}` : '') + hash;
}
