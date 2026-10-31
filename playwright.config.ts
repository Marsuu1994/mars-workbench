import {existsSync} from 'node:fs';
import {defineConfig} from '@playwright/test';
import {config} from 'dotenv';

// The app's and the global setup's environment: the local stack (CI creates
// .env.local from .env.example with `npm run setup`).
config({path: '.env.local', quiet: true});

const BASE_URL = 'http://localhost:3000';
export const E2E_STORAGE_STATE = '.auth/e2e-session.json';

/**
 * A cloud agent's container ships a Chromium for Playwright to drive; on a
 * Mac or in CI, `npx playwright install chromium` provides the pinned one.
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';

const isCI = Boolean(process.env.CI);

const DESKTOP = {viewport: {width: 1280, height: 800}};
const MOBILE = {
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'e2e',
  // One e2e user and one database: tests run one at a time.
  workers: 1,
  forbidOnly: isCI,
  reporter: isCI ? [['github'], ['html', {open: 'never'}]] : 'list',
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: BASE_URL,
    storageState: E2E_STORAGE_STATE,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: existsSync(PREINSTALLED_CHROMIUM)
        ? PREINSTALLED_CHROMIUM
        : undefined,
    },
  },
  projects: [
    {name: 'smoke-desktop', testMatch: /smoke\.spec\.ts/, use: DESKTOP},
    {name: 'smoke-mobile', testMatch: /smoke\.spec\.ts/, use: MOBILE},
    {
      name: 'design-console',
      testMatch: /designConsole\.spec\.ts/,
      use: DESKTOP,
    },
    // Journeys change the e2e user's week, so they run after the smokes
    {
      name: 'journeys',
      testMatch: /journeys\.spec\.ts/,
      use: DESKTOP,
      dependencies: ['smoke-desktop', 'smoke-mobile', 'design-console'],
    },
  ],
  webServer: {
    // Locally, a running `npm run dev` is reused: it serves the same database,
    // and the e2e user keeps the dev user's week untouched.
    command: isCI ? 'npm run build && npm run start' : 'npm run dev',
    url: `${BASE_URL}/auth/login`,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
});
