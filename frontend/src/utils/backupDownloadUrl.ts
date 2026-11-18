import { pb } from '~/services/pocketbase';

// Build the download URL for a backup archive.
//
// PocketBase's backup download route does NOT accept the Authorization header
// — it resolves a short-lived *file* token from the `?token=` query
// (apis/backup.go: FindAuthRecordByToken(fileToken, TokenTypeFile)). So the
// caller must first fetch a superuser file token via `pb.files.getToken()`.
//
// Going through the SDK's buildURL also avoids the protocol-relative
// "//api/..." URL that a default baseUrl of "/" produces with string
// concatenation.
export function backupDownloadUrl(key: string, fileToken: string): string {
  return pb.backups.getDownloadURL(fileToken, key);
}
