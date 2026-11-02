import {existsSync} from 'node:fs';
import {defineConfig} from '@playwright/test';
import {config} from 'dotenv';

// The app's and the global setup's environment: the local stack (CI creates
// .env.local from .env.example with `npm run setup`).
config({path: '.env.local', quiet: true});

const BASE_URL = 'http://localhost:3000';

/**
 * A cloud agent's container ships a Chromium for Playwright to drive; on a
 * Mac or in CI, `npx playwright install chromium` provides the pinned one.
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';

const isCI = Boolean(process.env.CI);

/** Everything but the product specs: the console and the contracts. */
const PRODUCT_SPECS_IGNORE = [/designConsole\.spec\.ts/, /contract\//];

const DESKTOP = {viewport: {width: 1280, height: 800}};
const MOBILE = {
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'e2e',
  // Every test runs as its own user (e2e/fixtures.ts), so all of them run in
  // parallel; CI's runner also hosts the app and the Supabase stack
  fullyParallel: true,
  workers: isCI ? 2 : undefined,
  forbidOnly: isCI,
  // In CI the JSON report feeds the job summary's per-spec timing
  // (scripts/e2e-timing.mjs)
  reporter: isCI
    ? [
        ['github'],
        ['html', {open: 'never'}],
        ['json', {outputFile: 'e2e-timing.json'}],
      ]
    : 'list',
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: existsSync(PREINSTALLED_CHROMIUM)
        ? PREINSTALLED_CHROMIUM
        : undefined,
    },
  },
  projects: [
    // Contracts run first and alone, so a landed or broken contract fails the
    // run in seconds instead of after every other project
    {name: 'contract', testMatch: /contract\/.*\.spec\.ts/, use: DESKTOP},
    // The product specs, one per flow doc, at both widths
    {
      name: 'desktop',
      testIgnore: PRODUCT_SPECS_IGNORE,
      use: DESKTOP,
      dependencies: ['contract'],
    },
    {
      name: 'mobile',
      testIgnore: PRODUCT_SPECS_IGNORE,
      use: MOBILE,
      dependencies: ['contract'],
    },
    // A developer tool that draws phone widths in its own frames: desktop only
    {
      name: 'design-console',
      testMatch: /designConsole\.spec\.ts/,
      use: DESKTOP,
      dependencies: ['contract'],
    },
  ],
  webServer: {
    // Locally, a running `npm run dev` is reused: it serves the same database,
    // and each e2e user's rows stay apart from the dev user's.
    command: isCI ? 'npm run build && npm run start' : 'npm run dev',
    url: `${BASE_URL}/auth/login`,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
});
