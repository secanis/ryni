// Rasterize a rendered SVG chart for download. The live SVG relies on Tailwind
// classes and CSS variables, so the clone gets the computed values inlined
// before it is serialized and drawn onto a canvas.

const NS = 'http://www.w3.org/2000/svg';

const STYLE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'fill-opacity',
  'stroke-opacity',
  'opacity',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'display',
  'visibility',
];

function viewBoxSize(svg: SVGSVGElement): [number, number] {
  const raw = svg.getAttribute('viewBox') || '';
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
    return [parts[2], parts[3]];
  }
  return [600, 192];
}

// Clone the chart, copy computed styles from the live nodes to the matching
// clone nodes, then drop hover-only elements.
export function prepareSvgForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...Array.from(svg.querySelectorAll('*'))];
  const clones = [clone, ...Array.from(clone.querySelectorAll('*'))];

  for (let i = 0; i < originals.length && i < clones.length; i++) {
    const computed = getComputedStyle(originals[i]);
    const target = clones[i] as SVGElement;
    for (const prop of STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) target.style.setProperty(prop, value);
    }
  }

  for (const node of Array.from(clone.querySelectorAll('[data-export-hide]'))) {
    node.remove();
  }

  const [width, height] = viewBoxSize(svg);
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  return clone;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to render chart image'));
    img.src = url;
  });
}

export async function svgToBlob(
  svg: SVGSVGElement,
  opts: { type: 'image/png' | 'image/jpeg'; scale?: number; background?: string },
): Promise<Blob> {
  const scale = opts.scale ?? 2;
  const [width, height] = viewBoxSize(svg);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = opts.background || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const markup = new XMLSerializer().serializeToString(prepareSvgForExport(svg));
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode chart image'))),
      opts.type,
      0.92,
    );
  });
}
