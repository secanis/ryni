import PocketBase from 'pocketbase';
import { getPb, getTestAdminCredentials } from '../../setup.ts';

/** Authenticate as the superuser and return a client with that auth. */
export async function createAdminClient(): Promise<PocketBase> {
  const pb = getPb();
  const { email, password } = getTestAdminCredentials();
  await pb.collection('_superusers').authWithPassword(email, password);
  return pb;
}

/** Create a regular `users` account and return an authenticated client. */
export async function createUserClient(
  uniqueSuffix: string = '',
): Promise<{ pb: PocketBase; userId: string; email: string; password: string }> {
  const admin = await createAdminClient();
  const suffix = uniqueSuffix || Date.now().toString(36);
  const email = `user-${suffix}@ryni.test`;
  const password = 'testpassword123456';

  let userId = '';
  try {
    const created = await admin.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name: `User ${suffix}`,
    });
    userId = created?.id || '';
  } catch {
    try {
      const found = await admin.collection('users').getFirstListItem(`email="${email}"`);
      userId = found?.id || '';
    } catch {
      /* ignore */
    }
  }

  const pb = new PocketBase(getPb().baseUrl);
  await pb.collection('users').authWithPassword(email, password);
  return { pb, userId, email, password };
}
