import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareSvgForExport, svgToBlob } from './svgToImage';

const NS = 'http://www.w3.org/2000/svg';

function fixture() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 50');

  const hidden = document.createElementNS(NS, 'rect');
  hidden.setAttribute('data-export-hide', '');
  svg.appendChild(hidden);

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('style', 'fill: rgb(1, 2, 3)');
  svg.appendChild(path);

  document.body.appendChild(svg);
  return svg;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prepareSvgForExport', () => {
  it('clones the svg, drops export-hidden nodes and inlines computed styles', () => {
    const svg = fixture();

    const out = prepareSvgForExport(svg);

    expect(out).not.toBe(svg);
    expect(out.querySelector('[data-export-hide]')).toBeNull();
    const path = out.querySelector('path') as SVGPathElement;
    expect((path.getAttribute('style') ?? '').replace(/\s+/g, '')).toContain(
      'fill:rgb(1,2,3)',
    );
    expect(out.getAttribute('xmlns')).toBe(NS);
    expect(out.getAttribute('width')).toBe('100');
    expect(out.getAttribute('height')).toBe('50');
  });
});

describe('svgToBlob', () => {
  it('rasterizes the svg into the requested image type', async () => {
    const svg = fixture();
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const context = { fillStyle: '', fillRect, drawImage };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, type) => {
      cb(new Blob(['x'], { type }));
    });
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:svg'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', FakeImage);

    const blob = await svgToBlob(svg, { type: 'image/jpeg', background: '#151A2D' });

    expect(blob.type).toBe('image/jpeg');
    expect(fillRect).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalled();
  });
});
