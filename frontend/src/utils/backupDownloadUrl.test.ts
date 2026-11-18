import { describe, it, expect } from 'vitest';
import { backupDownloadUrl } from './backupDownloadUrl';

describe('backupDownloadUrl', () => {
  it('returns a same-origin absolute URL, never protocol-relative', () => {
    const url = backupDownloadUrl('ryni_2026-11-18.zip');
    // The regression: pb.baseUrl is "/", so `${pb.baseUrl}/api/...` yields
    // "//api/..." (host "api"). Guard against it.
    expect(url).not.toContain('//api');
    expect(url).toMatch(/^https?:\/\/.+\/api\/backups\/ryni_2026-11-18\.zip$/);
  });

  it('encodes the backup key', () => {
    expect(backupDownloadUrl('a b.zip')).toContain('/api/backups/a%20b.zip');
  });
});
