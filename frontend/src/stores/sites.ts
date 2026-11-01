import { createSignal } from 'solid-js';
import { pb } from '~/services/pocketbase';
import type { Site } from '~/types';

const [sites, setSites] = createSignal<Site[]>([]);
const [loading, setLoading] = createSignal(false);

async function load(): Promise<void> {
  setLoading(true);
  try {
    const list = await pb.collection('sites').getFullList({ sort: '-created' });
    setSites(list as unknown as Site[]);
  } finally {
    setLoading(false);
  }
}

async function create(data: {
  name: string;
  tracking_id: string;
  endpoint_slug: string;
  allowed_origins: string[];
}): Promise<Site> {
  const rec = await pb.collection('sites').create({
    ...data,
    created_by: pb.authStore.model?.id,
  });
  await load();
  return rec as unknown as Site;
}

async function get(id: string): Promise<Site> {
  return (await pb.collection('sites').getOne(id)) as unknown as Site;
}

async function remove(id: string): Promise<void> {
  await pb.collection('sites').delete(id);
  setSites((prev) => prev.filter((s) => s.id !== id));
}

// Grant/revoke access by user id (the share dialog resolves email → id).
async function share(id: string, userId: string, role: 'viewer' | 'manager'): Promise<void> {
  const site = (await pb.collection('sites').getOne(id)) as unknown as Site;
  const field = role === 'manager' ? 'managers' : 'viewers';
  const existing = site[field] || [];
  const updated = existing.includes(userId) ? existing : [...existing, userId];
  await pb.collection('sites').update(id, { [field]: updated });
  await load();
}

export const sitesStore = { sites, loading, load, create, get, remove, share };
