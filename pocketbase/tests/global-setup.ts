import { startPocketBase } from '../setup';
import globalTeardown from './global-teardown';

export default async function globalSetup() {
  console.log('[vitest global-setup] Starting shared PocketBase instance...');
  await startPocketBase();
  console.log('[vitest global-setup] PocketBase ready');
  return globalTeardown;
}
