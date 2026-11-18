import { createSignal } from 'solid-js';
import { pb } from '~/services/pocketbase';
import type { Site } from '~/types';

export type UserRole = 'admin' | 'user';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** External auth provider name (e.g. "oidc"), or null for a local account. */
  provider: string | null;
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
export function buildUserRows(
  regular: RawUser[],
  admins: RawUser[],
  externalProviders: Map<string, string> = new Map(),
): UserRow[] {
  const toRow = (u: RawUser, role: UserRole): UserRow => ({
    id: u.id,
    email: u.email,
    name: u.name ?? '',
    role,
    provider: externalProviders.get(u.id) ?? null,
  });
  const adminRows = admins.map((u) => toRow(u, 'admin'));
  const adminEmails = new Set(adminRows.map((u) => u.email.toLowerCase()));
  const userRows = regular
    .filter((u) => !adminEmails.has(u.email.toLowerCase()))
    .map((u) => toRow(u, 'user'));
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
  // OAuth2/OIDC logins are recorded in `_externalAuths` (recordRef → user id).
  // Anything with a link is non-local; the rest authenticate with a password.
  const externalProviders = new Map<string, string>();
  try {
    const links = (await pb.collection('_externalAuths').getFullList()) as unknown as Array<{
      recordRef: string;
      provider: string;
    }>;
    for (const link of links) {
      if (link.recordRef && link.provider && !externalProviders.has(link.recordRef)) {
        externalProviders.set(link.recordRef, link.provider);
      }
    }
  } catch {
    // Unreadable (non-superuser) — treat everyone as local.
  }
  setUsers(buildUserRows(regular, admins, externalProviders));
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
