import { createSignal } from 'solid-js';
import { pb } from '~/services/pocketbase';
import type { Site } from '~/types';

export type UserRole = 'admin' | 'user';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface RawUser {
  id: string;
  email: string;
  name?: string;
}

const [users, setUsers] = createSignal<UserRow[]>([]);
const [allSites, setAllSites] = createSignal<Site[]>([]);

// The global admin lives in `_superusers`, not `users`. Merge both into one
// list, admins first, deduped by email (an admin who also has a `users`
// record appears once, as admin).
export function buildUserRows(regular: RawUser[], admins: RawUser[]): UserRow[] {
  const adminRows: UserRow[] = admins.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    role: 'admin',
  }));
  const adminEmails = new Set(adminRows.map((u) => u.email.toLowerCase()));
  const userRows: UserRow[] = regular
    .filter((u) => !adminEmails.has(u.email.toLowerCase()))
    .map((u) => ({ id: u.id, email: u.email, name: u.name ?? '', role: 'user' }));
  return [...adminRows, ...userRows];
}

async function loadUsers(): Promise<void> {
  const regular = (await pb
    .collection('users')
    .getFullList({ sort: 'email' })) as unknown as RawUser[];
  let admins: RawUser[] = [];
  try {
    admins = (await pb
      .collection('_superusers')
      .getFullList({ sort: 'email' })) as unknown as RawUser[];
  } catch {
    // Non-superusers can't read `_superusers`; the page is gated to them, but
    // stay resilient and just show the regular users.
    admins = [];
  }
  setUsers(buildUserRows(regular, admins));
}

async function loadSites(): Promise<void> {
  const list = await pb.collection('sites').getFullList({ sort: '-created' });
  setAllSites(list as unknown as Site[]);
}

// Set (or clear, role=null) a user's role on a site.
async function setUserSiteRole(
  userId: string,
  siteId: string,
  role: 'viewer' | 'manager' | null,
): Promise<void> {
  const site = (await pb.collection('sites').getOne(siteId)) as unknown as Site;
  let managers = (site.managers || []).filter((id) => id !== userId);
  let viewers = (site.viewers || []).filter((id) => id !== userId);
  if (role === 'manager') managers = [...managers, userId];
  if (role === 'viewer') viewers = [...viewers, userId];
  await pb.collection('sites').update(siteId, { managers, viewers });
  await loadSites();
}

/** role of `userId` on `siteId`, or null. */
function roleOn(userId: string, siteId: string): 'viewer' | 'manager' | null {
  const site = allSites().find((s) => s.id === siteId);
  if (!site) return null;
  if ((site.managers || []).includes(userId)) return 'manager';
  if ((site.viewers || []).includes(userId)) return 'viewer';
  return null;
}

export const adminStore = { users, allSites, loadUsers, loadSites, setUserSiteRole, roleOn };
