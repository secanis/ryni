import { pb } from '~/services/pocketbase';

// Build the download URL for a backup archive.
//
// Must go through the SDK's buildURL: `pb.baseUrl` is the literal "/" by
// default, so naive string concatenation produces a protocol-relative
// "//api/backups/…" URL that resolves to host "api" and is blocked by CSP.
export function backupDownloadUrl(key: string): string {
  return pb.buildURL(`/api/backups/${encodeURIComponent(key)}`);
}
