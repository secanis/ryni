import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Pin the accessibility contract of the design tokens: the accent button's
// foreground must meet WCAG AA (4.5:1) against its accent background, in both
// themes. Tokens live in index.css; parse the source and compute contrast.
const css = readFileSync(path.resolve(import.meta.dirname, './index.css'), 'utf8');

function block(selector: string): string {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
  return css.match(re)?.[1] ?? '';
}

function token(blockCss: string, name: string): string {
  const re = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`);
  return blockCss.match(re)?.[1] ?? '';
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('accent/accent-fg meet WCAG AA contrast in both themes', () => {
    for (const selector of [':root', '.dark']) {
      const b = block(selector);
      const accent = token(b, 'accent');
      const fg = token(b, 'accent-fg');
      expect(accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      const ratio = contrast(accent, fg);
      expect(ratio, `${selector}: ${accent} on ${fg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
