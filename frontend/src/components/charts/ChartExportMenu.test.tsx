import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import ChartExportMenu from './ChartExportMenu';

function mount(onExport: (type: 'png' | 'jpeg') => void) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(() => <ChartExportMenu onExport={onExport} />, host);
  return host;
}

function click(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  ) as HTMLElement;
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ChartExportMenu', () => {
  it('opens the format menu on the Export button', () => {
    const host = mount(() => {});
    expect(host.textContent).not.toContain('PNG');
    click(host, 'Export');
    expect(host.textContent).toContain('PNG');
    expect(host.textContent).toContain('JPG');
  });

  it('exports PNG and closes', () => {
    const onExport = vi.fn();
    const host = mount(onExport);
    click(host, 'Export');
    click(host, 'PNG');
    expect(onExport).toHaveBeenCalledWith('png');
    expect(host.textContent).not.toContain('PNG');
  });

  it('exports JPG and closes', () => {
    const onExport = vi.fn();
    const host = mount(onExport);
    click(host, 'Export');
    const jpg = [...host.querySelectorAll('button')].find((b) => b.textContent === 'JPG')!;
    jpg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onExport).toHaveBeenCalledWith('jpeg');
    expect(host.textContent).not.toContain('JPG');
  });
});
