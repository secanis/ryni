import { describe, it, expect } from 'vitest';
import { pickVersion, pickCommit, shortCommit, commitUrl, formatBuildTime } from './version';

describe('pickVersion', () => {
  it('prefers RYNI_VERSION', () => {
    expect(pickVersion('v0.1.0', 'v0.0.9-3-gabc', '0.1.0')).toBe('v0.1.0');
  });
  it('falls through an empty RYNI_VERSION to git describe', () => {
    expect(pickVersion('', 'v0.0.9-3-gabc', '0.1.0')).toBe('v0.0.9-3-gabc');
  });
  it('falls back to the package version when git has nothing', () => {
    expect(pickVersion(undefined, '', '0.1.0')).toBe('0.1.0');
  });
  it('returns dev when everything is empty', () => {
    expect(pickVersion('', '', '')).toBe('dev');
  });
});

describe('pickCommit', () => {
  it('prefers RYNI_COMMIT', () => {
    expect(pickCommit('abc1234', 'def5678')).toBe('abc1234');
  });
  it('falls back to the local sha', () => {
    expect(pickCommit(undefined, 'def5678')).toBe('def5678');
  });
  it('returns local when both are empty', () => {
    expect(pickCommit('', '')).toBe('local');
  });
});

describe('shortCommit', () => {
  it('shortens a full sha to 7 characters', () => {
    expect(shortCommit('0123456789abcdef0123456789abcdef01234567')).toBe('0123456');
  });
  it('leaves non-sha values untouched', () => {
    expect(shortCommit('local')).toBe('local');
  });
});

describe('commitUrl', () => {
  it('links a 7-40 char hex sha', () => {
    expect(commitUrl('0123456')).toBe('https://github.com/secanis/ryni/commit/0123456');
  });
  it('returns null for non-sha values', () => {
    expect(commitUrl('local')).toBeNull();
    expect(commitUrl('unknown')).toBeNull();
  });
});

describe('formatBuildTime', () => {
  it('formats an ISO timestamp', () => {
    expect(formatBuildTime('2026-11-15T10:20:30.000Z')).not.toBe('');
    expect(formatBuildTime('2026-11-15T10:20:30.000Z')).not.toBe('Invalid Date');
  });
  it('returns an empty string for empty or invalid input', () => {
    expect(formatBuildTime('')).toBe('');
    expect(formatBuildTime('not-a-date')).toBe('not-a-date');
  });
});
