import { createSignal } from 'solid-js';
import { pb } from '~/services/pocketbase';
import type { SiteStats } from '~/types';

const [stats, setStats] = createSignal<SiteStats | null>(null);
const [loading, setLoading] = createSignal(false);

async function load(siteId: string, range: { from: string; to: string }): Promise<void> {
  setLoading(true);
  try {
    const res = await pb.send(`/api/ryni/sites/${siteId}/stats`, { query: range });
    setStats(res as unknown as SiteStats);
  } finally {
    setLoading(false);
  }
}

export const statsStore = { stats, loading, load };
