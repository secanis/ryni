import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { DEFAULT_DISCLOSURE_URL, disclosureText, bannerSnippet } from './disclosure';

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
    expect(text).toContain('referring site');
    expect(text).toContain('screen size');
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
      'This site counts anonymous page views — no tracking data is stored on your device.',
    );
  });

  it('omits the Learn more link when privacyUrl is absent', () => {
    expect(bannerSnippet({ mode: 'standard' })).not.toContain('Learn more');
    expect(bannerSnippet({ mode: 'standard' })).not.toContain('href=');
  });

  it('defaults the Learn more link target to the Rýni website', () => {
    expect(DEFAULT_DISCLOSURE_URL).toBe('https://ryni.secanis.ch');
  });

  it('includes a Learn more link as part of the banner copy when privacyUrl is set', () => {
    const banner = bannerSnippet({ mode: 'standard', privacyUrl: 'https://example.com/privacy' });
    // The link belongs to the summary sentence, not a separate element after it.
    expect(banner).toContain(
      '<span>This site uses privacy-friendly analytics. <a href="https://example.com/privacy"',
    );
    expect(banner).toContain('Learn more</a></span>');
  });

  it('escapes the privacy URL', () => {
    const banner = bannerSnippet({ mode: 'standard', privacyUrl: 'https://example.com/?a="b"' });
    expect(banner).toContain('https://example.com/?a=&quot;b&quot;');
  });

  it('dismisses via an inline handler, so it also works when injected with innerHTML', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', {
      runScripts: 'dangerously',
      url: 'https://example.com',
    });
    const { document, localStorage } = dom.window;
    // innerHTML never executes inline <script> tags — the reported bug.
    document.getElementById('host')!.innerHTML = bannerSnippet({ mode: 'standard' });
    expect(document.getElementById('ryni-disclosure')).not.toBeNull();

    document.getElementById('ryni-disclosure-dismiss')!.click();

    expect(document.getElementById('ryni-disclosure')).toBeNull();
    expect(localStorage.getItem('ryni_disclosure_dismissed')).toBe('1');
  });

  it('stays hidden on the next page load once dismissed', () => {
    const dom = new JSDOM(
      `<!doctype html><html><body><script>localStorage.setItem('ryni_disclosure_dismissed','1');</script>${bannerSnippet(
        { mode: 'standard' },
      )}</body></html>`,
      { runScripts: 'dangerously', url: 'https://example.com' },
    );
    expect(dom.window.document.getElementById('ryni-disclosure')).toBeNull();
  });
});
