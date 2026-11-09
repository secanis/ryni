// RÝNI tracker — payload construction matching the ingest contract
// (POST /t/{site} with { visitor, type, page, title, referrer, browser, os,
// device, screen, language, timezone, utm_source, utm_medium, utm_campaign,
// duration }).

import type { ClientInfo, Payload, TrackType, UtmParams } from './types';

interface PayloadInput {
  visitor: string;
  type: TrackType;
  page?: string;
  title?: string;
  referrer?: string;
  client?: ClientInfo;
  utm?: UtmParams;
  duration?: number;
}

export function buildPayload(input: PayloadInput): Payload {
  const p: Payload = { visitor: input.visitor, type: input.type };
  if (input.page != null) p.page = input.page;
  if (input.title != null && input.title !== '') p.title = input.title;
  if (input.referrer != null && input.referrer !== '') p.referrer = input.referrer;
  if (input.client) {
    if (input.client.browser) p.browser = input.client.browser;
    if (input.client.os) p.os = input.client.os;
    if (input.client.device) p.device = input.client.device;
    if (input.client.screen) p.screen = input.client.screen;
    if (input.client.language) p.language = input.client.language;
    if (input.client.timezone) p.timezone = input.client.timezone;
  }
  if (input.utm) {
    if (input.utm.source) p.utm_source = input.utm.source;
    if (input.utm.medium) p.utm_medium = input.utm.medium;
    if (input.utm.campaign) p.utm_campaign = input.utm.campaign;
  }
  if (input.duration != null) p.duration = input.duration;
  return p;
}

export function endpointUrl(server: string, site: string): string {
  return `${server.replace(/\/+$/, '')}/t/${encodeURIComponent(site)}`;
}
