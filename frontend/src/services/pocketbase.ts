import PocketBase from 'pocketbase';

// The PB base URL resolves from (in order):
//   1. window.__RYNI_CONFIG__.pbUrl (written at container start by
//      40-ryni-config.sh), or
//   2. import.meta.env.VITE_PB_URL (build-time), or
//   3. same origin (nginx proxies /api/ to PocketBase in Docker).
declare global {
  interface Window {
    __RYNI_CONFIG__?: { pbUrl?: string };
  }
}

const runtimeUrl = typeof window !== 'undefined' ? window.__RYNI_CONFIG__?.pbUrl : undefined;
const baseUrl = (runtimeUrl || import.meta.env.VITE_PB_URL || '').replace(/\/+$/, '');

export const pb = new PocketBase(baseUrl || undefined);
