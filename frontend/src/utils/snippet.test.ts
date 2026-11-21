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

  it('emits no data-ryni-mode for standard mode', () => {
    const { variantA, variantB } = buildSnippets({ server: 'https://ryni.example', site: 'abc123', mode: 'standard' });
    expect(variantA).not.toContain('data-ryni-mode');
    expect(variantB).not.toContain('data-ryni-mode');
  });

  it('emits data-ryni-mode="session" on both variants', () => {
    const { variantA, variantB } = buildSnippets({ server: 'https://ryni.example', site: 'abc123', mode: 'session' });
    expect(variantA).toContain('data-ryni-mode="session"');
    expect(variantB).toContain('data-ryni-mode="session"');
  });

  it('emits data-ryni-mode="minimal" on both variants', () => {
    const { variantA, variantB } = buildSnippets({ server: 'https://ryni.example', site: 'abc123', mode: 'minimal' });
    expect(variantA).toContain('data-ryni-mode="minimal"');
    expect(variantB).toContain('data-ryni-mode="minimal"');
  });

  it('proxy note describes the forwarding route', () => {
    const { proxyNote } = buildSnippets({ server: 'https://ryni.example', site: 'abc123' });
    expect(proxyNote).toContain('proxy_pass https://ryni.example/t/');
  });
});
