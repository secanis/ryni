import { pb } from '~/services/pocketbase';

export interface BackupInfo {
  key: string;
  size: number;
  modified: string;
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listBackups(): Promise<BackupInfo[]> {
  return (await pb.send('/api/backups', { method: 'GET' })) as unknown as BackupInfo[];
}

export async function createBackup(name: string): Promise<void> {
  await pb.send('/api/backups', { method: 'POST', body: { name } });
}

export async function deleteBackup(key: string): Promise<void> {
  await pb.send(`/api/backups/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

// Restores the backup named `key` on the server. Destructive: replaces the
// live database and uploaded files with the archive's contents.
export async function restoreBackup(key: string): Promise<void> {
  await pb.send(`/api/backups/${encodeURIComponent(key)}/restore`, { method: 'POST' });
}

// Uploads a .zip backup archive to the server (it then appears in the list).
export async function uploadBackup(file: File): Promise<void> {
  await pb.send('/api/backups/upload', { method: 'POST', body: { file } });
}
