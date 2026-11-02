import {assertLocalServices, getLocalSecretKey} from '../scripts/localEnv';

/**
 * Before every run: refuse anything but the local stack, and read its secret
 * key once — every test creates its user with it, and the workers inherit it
 * from here instead of each asking the Supabase CLI (about 2.5 s a call).
 */
export default function globalSetup() {
  assertLocalServices('The e2e setup');
  getLocalSecretKey();
}
