import { describe, it, expect } from 'vitest';
import { disclosureModeOf, trackingModeOf } from './privacy';

describe('trackingModeOf', () => {
  it('defaults unknown values to standard', () => {
    expect(trackingModeOf(undefined)).toBe('standard');
    expect(trackingModeOf(null)).toBe('standard');
    expect(trackingModeOf('')).toBe('standard');
    expect(trackingModeOf('garbage')).toBe('standard');
  });

  it('passes through known modes', () => {
    expect(trackingModeOf('session')).toBe('session');
    expect(trackingModeOf('minimal')).toBe('minimal');
  });
});

describe('disclosureModeOf', () => {
  it('defaults unknown values to none', () => {
    expect(disclosureModeOf(undefined)).toBe('none');
    expect(disclosureModeOf('')).toBe('none');
    expect(disclosureModeOf('garbage')).toBe('none');
  });

  it('passes through known modes', () => {
    expect(disclosureModeOf('text')).toBe('text');
    expect(disclosureModeOf('banner')).toBe('banner');
  });
});
