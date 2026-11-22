import { describe, it, expect } from 'vitest';
import { parseLabels, siteLabels } from './labels';

describe('parseLabels', () => {
  it('splits, trims and drops blanks', () => {
    expect(parseLabels('a, b , ,c')).toEqual(['a', 'b', 'c']);
  });

  it('dedupes case-insensitively keeping the first spelling', () => {
    expect(parseLabels('Acme, acme, ACME')).toEqual(['Acme']);
  });

  it('caps at 20 labels', () => {
    expect(parseLabels(Array.from({ length: 25 }, (_, i) => `l${i}`).join(','))).toHaveLength(20);
  });

  it('caps each label at 32 chars', () => {
    expect(parseLabels('x'.repeat(40))[0]).toHaveLength(32);
  });

  it('does not split multi-byte characters when truncating', () => {
    expect(parseLabels('😀'.repeat(20))[0]).toBe('😀'.repeat(16));
  });

  it('returns [] for empty or whitespace input', () => {
    expect(parseLabels('')).toEqual([]);
    expect(parseLabels('  , ,')).toEqual([]);
  });
});

describe('siteLabels', () => {
  it('returns [] for a legacy site without labels', () => {
    expect(siteLabels({})).toEqual([]);
  });

  it('returns the stored labels', () => {
    expect(siteLabels({ labels: ['prod'] })).toEqual(['prod']);
  });

  it('trims and caps unnormalized stored labels', () => {
    expect(siteLabels({ labels: ['  padded  '] })).toEqual(['padded']);
    expect(siteLabels({ labels: ['x'.repeat(40)] })[0]).toHaveLength(32);
  });

  it('caps the rendered count at 20', () => {
    expect(siteLabels({ labels: Array.from({ length: 25 }, (_, i) => `l${i}`) })).toHaveLength(20);
  });
});
