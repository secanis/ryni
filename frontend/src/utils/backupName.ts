// Backup file name for PocketBase's /api/backups endpoint.
//
// PocketBase v0.40 validates the name with ^[a-z0-9_-]+\.zip$ — uppercase
// letters, dots and colons are rejected. That means the raw ISO timestamp
// (…T20:21:33.123Z) can NOT be used as-is; lowercase it and strip the
// separators.

export function backupName(date: Date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, '-').toLowerCase();
  return `ryni_${stamp}.zip`;
}
