import { describe, it, expect, vi } from 'vitest';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('~/services/pocketbase', () => ({ pb: { send: mockSend } }));

import type { SiteExportPayload, SiteExportRecord } from '~/types';
import { CSV_COLUMNS, exportFilename, fetchSiteExport, toCsv, toJson } from './siteExport';

const HEADER =
  'created,path,title,referrer,browser,os,device,screen_size,language,timezone,utm_source,utm_medium,utm_campaign,duration,is_new_visitor';

const record: SiteExportRecord = {
  created: '2026-11-01T10:00:00.000Z',
  path: '/',
  title: '',
  referrer: '',
  browser: '',
  os: '',
  device: '',
  screen_size: '',
  language: '',
  timezone: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  duration: 42,
  is_new_visitor: false,
};

const payload: SiteExportPayload = {
  site: { id: 'site1', name: 'Example.COM', tracking_id: 'abc' },
  from: '2026-11-18T00:00:00.000Z',
  to: '2026-11-25T00:00:00.000Z',
  exportedAt: '2026-11-25T12:00:00.000Z',
  records: [record],
};

const withRecord = (overrides: Partial<SiteExportRecord>): SiteExportPayload => ({
  ...payload,
  records: [{ ...record, ...overrides }],
});

describe('site export helpers', () => {
  it('fetches the export payload from the site export route', async () => {
    mockSend.mockResolvedValueOnce(payload);
    const range = { from: payload.from, to: payload.to };

    const result = await fetchSiteExport('site1', range);

    expect(mockSend).toHaveBeenCalledWith('/api/ryni/sites/site1/export', { query: range });
    expect(result).toEqual(payload);
  });

  it('writes the exact column header', () => {
    expect(CSV_COLUMNS.join(',')).toBe(HEADER);
    expect(toCsv(payload).split('\n')[0]).toBe(HEADER);
  });

  it('quotes commas, doubled quotes and newlines', () => {
    const csv = toCsv(
      withRecord({
        path: '/,a',
        title: 'He said "hi"',
        referrer: 'line1\nline2',
      }),
    );
    expect(csv).toContain('"/,a"');
    expect(csv).toContain('"He said ""hi"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it('prefixes formula-leading string cells with an apostrophe', () => {
    const csv = toCsv(
      withRecord({
        path: '=1+1',
        title: '+cmd',
        referrer: '-x',
        browser: '@x',
        os: '\tx',
      }),
    );
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-x");
    expect(csv).toContain("'@x");
    expect(csv).toContain("'\tx");
  });

  it('leaves numbers and booleans unescaped', () => {
    const csv = toCsv(withRecord({ duration: 42, is_new_visitor: true }));
    expect(csv).toContain(',42,true');
    expect(csv).not.toContain("'42");
  });

  it('emits only the header line for an empty payload', () => {
    expect(toCsv({ ...payload, records: [] })).toBe(`${HEADER}\n`);
  });

  it('serialises JSON without visitor_id', () => {
    const json = toJson(payload);
    expect(JSON.parse(json)).toEqual(payload);
    expect(json).not.toContain('visitor_id');
  });

  it('builds a slugged filename from the site name and range', () => {
    expect(exportFilename('Example.COM', payload.from, payload.to, 'csv')).toBe(
      'ryni-example-com-2026-11-18_2026-11-25.csv',
    );
    expect(exportFilename('Rüni Test', payload.from, payload.to, 'json')).toBe(
      'ryni-runi-test-2026-11-18_2026-11-25.json',
    );
    expect(exportFilename('', payload.from, payload.to, 'csv')).toBe(
      'ryni-site-2026-11-18_2026-11-25.csv',
    );
  });
});
