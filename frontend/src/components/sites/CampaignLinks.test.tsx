import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import CampaignLinks from './CampaignLinks';

afterEach(() => {
  document.body.innerHTML = '';
});

function mount(baseUrl?: string) {
  const host = document.createElement('div');
  // The host must be in the document: Solid delegates input events at the
  // document level, so a detached node would never run the onInput handlers.
  document.body.appendChild(host);
  render(() => <CampaignLinks baseUrl={baseUrl} />, host);
  return host;
}

function type(host: HTMLElement, id: string, value: string) {
  const input = host.querySelector(`#${id}`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('CampaignLinks', () => {
  it('explains the supported UTM parameters', () => {
    const host = mount();

    expect(host.textContent).toContain('utm_source');
    expect(host.textContent).toContain('utm_medium');
    expect(host.textContent).toContain('utm_campaign');
    expect(host.textContent).toContain('utm_term');
    expect(host.textContent).toContain('UTM campaign');
  });

  it('builds the campaign link from the form', () => {
    const host = mount('https://mysite.example/landing');

    type(host, 'campaign-source', 'newsletter');
    type(host, 'campaign-medium', 'email');
    type(host, 'campaign-name', 'launch-2026');

    const out = host.querySelector('[data-testid="campaign-url"]');
    expect(out?.textContent).toBe(
      'https://mysite.example/landing?utm_source=newsletter&utm_medium=email&utm_campaign=launch-2026',
    );
  });

  it('prefills the page URL from the site origin', () => {
    const host = mount('https://mysite.example');

    const base = host.querySelector('#campaign-base') as HTMLInputElement;
    expect(base.value).toBe('https://mysite.example');
  });
});
