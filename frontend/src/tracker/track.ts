// RÝNI tracker — payload construction matching the ingest contract
// (POST /t/{site} with { visitor, type, page, referrer, browser, os, device, screen, duration }).

import type { ClientInfo, Payload, TrackType } from './types';

interface PayloadInput {
  visitor: string;
  type: TrackType;
  page?: string;
  referrer?: string;
  client?: ClientInfo;
  duration?: number;
}

export function buildPayload(input: PayloadInput): Payload {
  const p: Payload = { visitor: input.visitor, type: input.type };
  if (input.page != null) p.page = input.page;
  if (input.referrer != null && input.referrer !== '') p.referrer = input.referrer;
  if (input.client) {
    if (input.client.browser) p.browser = input.client.browser;
    if (input.client.os) p.os = input.client.os;
    if (input.client.device) p.device = input.client.device;
    if (input.client.screen) p.screen = input.client.screen;
  }
  if (input.duration != null) p.duration = input.duration;
  return p;
}

export function endpointUrl(server: string, site: string): string {
  return `${server.replace(/\/+$/, '')}/t/${encodeURIComponent(site)}`;
}
