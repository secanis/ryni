import { describe, it, expect } from 'vitest';
import { disclosureText, bannerSnippet } from './disclosure';

describe('disclosureText', () => {
  it('standard mode states local storage, no cookies, legitimate interest and placeholders', () => {
    const text = disclosureText({ mode: 'standard' });
    expect(text).toContain('local storage');
    expect(text).toContain('no cookies');
    expect(text).toContain('legitimate interest');
    expect(text).toContain('[retention period]');
    expect(text).toContain('[controller name and contact]');
  });

  it('session mode uses temporary/duration wording and no local storage', () => {
    const text = disclosureText({ mode: 'session' });
    expect(text).toContain('temporary');
    expect(text).toContain('duration of your visit');
    expect(text).not.toContain('local storage');
  });

  it('minimal mode states nothing stored and cannot link visits', () => {
    const text = disclosureText({ mode: 'minimal' });
    expect(text).toContain('stores nothing');
    expect(text).toContain('cannot link');
  });
});

describe('bannerSnippet', () => {
  it('minimal banner uses sessionStorage and not localStorage', () => {
    const banner = bannerSnippet({ mode: 'minimal' });
    expect(banner).toContain('sessionStorage');
    expect(banner).not.toContain('localStorage');
  });

  it('standard banner uses localStorage', () => {
    const banner = bannerSnippet({ mode: 'standard' });
    expect(banner).toContain('localStorage');
  });

  it('uses sessionStorage for session mode', () => {
    const banner = bannerSnippet({ mode: 'session' });
    expect(banner).toContain('sessionStorage');
    expect(banner).not.toContain('localStorage');
  });

  it('emits the verbatim one-line summary per tier', () => {
    expect(bannerSnippet({ mode: 'standard' })).toContain('This site uses privacy-friendly analytics.');
    expect(bannerSnippet({ mode: 'session' })).toContain(
      'This site measures visits with a temporary, non-persistent identifier.',
    );
    expect(bannerSnippet({ mode: 'minimal' })).toContain(
      'This site counts anonymous page views — nothing is stored on your device.',
    );
  });

  it('omits the Learn more link when privacyUrl is absent', () => {
    expect(bannerSnippet({ mode: 'standard' })).not.toContain('Learn more');
    expect(bannerSnippet({ mode: 'standard' })).not.toContain('href=');
  });

  it('includes a Learn more link when privacyUrl is set', () => {
    const banner = bannerSnippet({ mode: 'standard', privacyUrl: 'https://example.com/privacy' });
    expect(banner).toContain('Learn more');
    expect(banner).toContain('https://example.com/privacy');
  });
});
