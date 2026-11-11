import { describe, it, expect } from 'vitest';
import { backupName } from './backupName';

// PocketBase v0.40 rejects backup names that don't match
// ^[a-z0-9_-]+\.zip$ (apis/backup_create.go).
const PB_BACKUP_NAME_RE = /^[a-z0-9_-]+\.zip$/;

describe('backupName', () => {
  it('produces a name PocketBase accepts', () => {
    expect(backupName()).toMatch(PB_BACKUP_NAME_RE);
  });

  it('stays within PocketBase 150 character limit', () => {
    expect(backupName().length).toBeLessThanOrEqual(150);
  });

  it('is a deterministic, sortable ryni_ timestamp', () => {
    const date = new Date('2026-11-11T20:21:33.123Z');
    expect(backupName(date)).toBe('ryni_2026-11-11t20-21-33-123z.zip');
  });

  it('produces distinct names for distinct milliseconds', () => {
    expect(backupName(new Date('2026-11-11T20:21:33.123Z'))).not.toBe(
      backupName(new Date('2026-11-11T20:21:33.124Z')),
    );
  });
});
