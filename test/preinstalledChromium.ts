import {existsSync} from 'node:fs';

/** Where a cloud agent's container ships a Chromium for Playwright to drive. */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';

/**
 * The container's Chromium when there is one, for Playwright's e2e run and
 * Vitest's component tests alike. Elsewhere (a Mac, CI) it's undefined, and
 * Playwright launches the pinned one `npx playwright install chromium`
 * provides.
 */
export const preinstalledChromiumPath = existsSync(PREINSTALLED_CHROMIUM)
  ? PREINSTALLED_CHROMIUM
  : undefined;
