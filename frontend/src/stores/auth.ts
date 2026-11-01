import { createSignal } from 'solid-js';
import { ClientResponseError, type RecordModel } from 'pocketbase';
import { pb } from '~/services/pocketbase';

// Auth is deliberately simpler than STJÓRNA: a single global admin
// (PocketBase superuser) plus regular `users`, with per-site roles handled
// by the `sites` collection. No tenant/membership tiers.

const [user, setUser] = createSignal<RecordModel | null>(
  pb.authStore.isValid ? pb.authStore.model : null,
);
const [isSuperuser, setIsSuperuser] = createSignal<boolean>(pb.authStore.isSuperuser);
const [ready, setReady] = createSignal<boolean>(false);

function resetState(): void {
  setUser(null);
  setIsSuperuser(false);
}

function isAuthenticated(): boolean {
  return user() !== null;
}

async function init(): Promise<void> {
  if (!pb.authStore.isValid) {
    resetState();
    setReady(true);
    return;
  }
  // Confirm server-side and rotate the token. Drop revoked/expired sessions;
  // keep the locally-valid session on network errors.
  const collection = pb.authStore.isSuperuser ? '_superusers' : 'users';
  try {
    await pb.collection(collection).authRefresh();
  } catch (e: unknown) {
    if (e instanceof ClientResponseError && (e.status === 401 || e.status === 403 || e.status === 404)) {
      pb.authStore.clear();
      resetState();
    }
  }
  setUser(pb.authStore.model);
  setIsSuperuser(pb.authStore.isSuperuser);
  setReady(true);
}

async function signIn(email: string, password: string): Promise<void> {
  try {
    await pb.collection('users').authWithPassword(email, password);
  } catch (err) {
    // The global admin lives in the `_superusers` collection, not `users`.
    // Fall back there only on a credential failure, not on network errors.
    if (err instanceof ClientResponseError && (err.status === 400 || err.status === 404)) {
      await pb.collection('_superusers').authWithPassword(email, password);
    } else {
      throw err;
    }
  }
  setUser(pb.authStore.model);
  setIsSuperuser(pb.authStore.isSuperuser);
}

async function signInWithOidc(): Promise<void> {
  await pb.collection('users').authWithOAuth2({ provider: 'oidc' });
}

function signOut(): void {
  pb.authStore.clear();
  resetState();
}

// Keep the store in sync with the SDK (token cleared in another tab, 401
// handler, authRefresh rotation).
pb.authStore.onChange(() => {
  setUser(pb.authStore.model);
  setIsSuperuser(pb.authStore.isSuperuser);
});

export const auth = {
  user,
  isSuperuser,
  ready,
  isAuthenticated,
  init,
  signIn,
  signInWithOidc,
  signOut,
};
