import { describe, it, expect } from 'vitest';
import { trackingModeOf } from './privacy';

describe('trackingModeOf', () => {
  it('defaults unknown values to standard', () => {
    expect(trackingModeOf(undefined)).toBe('standard');
    expect(trackingModeOf('')).toBe('standard');
    expect(trackingModeOf('garbage')).toBe('standard');
  });

  it('passes through known modes', () => {
    expect(trackingModeOf('session')).toBe('session');
    expect(trackingModeOf('minimal')).toBe('minimal');
  });
});
