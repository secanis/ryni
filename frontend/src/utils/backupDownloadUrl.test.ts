import { describe, it, expect } from 'vitest';
import { backupDownloadUrl } from './backupDownloadUrl';

describe('backupDownloadUrl', () => {
  it('builds a same-origin absolute URL with a file token, never protocol-relative', () => {
    const url = backupDownloadUrl('ryni_2026-11-18.zip', 'file-token');
    // The regression: pb.baseUrl is "/", so `${pb.baseUrl}/api/...` yields
    // "//api/..." (host "api"). Guard against it.
    expect(url).not.toContain('//api');
    // PB's backup download route reads a *file* token from ?token=.
    expect(url).toMatch(
      /^https?:\/\/.+\/api\/backups\/ryni_2026-11-18\.zip\?token=file-token$/,
    );
  });

  it('encodes the backup key', () => {
    expect(backupDownloadUrl('a b.zip', 't')).toContain('/api/backups/a%20b.zip');
  });
});
