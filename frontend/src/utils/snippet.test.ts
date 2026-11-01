import { describe, it, expect } from 'vitest';
import { buildSnippets, generateTrackingId } from './snippet';

describe('generateTrackingId', () => {
  it('produces an 8-char lowercase alphanumeric id', () => {
    expect(generateTrackingId()).toMatch(/^[a-z0-9]{8}$/);
  });

  it('produces distinct ids', () => {
    expect(generateTrackingId()).not.toBe(generateTrackingId());
  });
});

describe('buildSnippets', () => {
  it('builds variant A pointing at the Rýni server', () => {
    const { variantA } = buildSnippets({ server: 'https://ryni.example/', site: 'abc123' });
    expect(variantA).toBe(
      '<script async src="https://ryni.example/ryni.js" data-ryni-server="https://ryni.example" data-ryni-site="abc123"></script>',
    );
  });

  it('builds variant B as same-origin', () => {
    const { variantB } = buildSnippets({ server: 'https://ryni.example', site: 'abc123' });
    expect(variantB).toBe('<script async src="/ryni.js" data-ryni-site="abc123"></script>');
  });

  it('includes data-ryni-detailed when requested', () => {
    const { variantA } = buildSnippets({ server: 'https://ryni.example', site: 'abc123', detailed: true });
    expect(variantA).toContain('data-ryni-detailed');
  });

  it('proxy note describes the forwarding route', () => {
    const { proxyNote } = buildSnippets({ server: 'https://ryni.example', site: 'abc123' });
    expect(proxyNote).toContain('proxy_pass https://ryni.example/t/');
  });
});
