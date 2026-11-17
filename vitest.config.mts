import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';
import {preinstalledChromiumPath} from './test/preinstalledChromium';

/**
 * Every suite runs in production's timezone (Vercel is UTC) and in the
 * owner's (`next dev` on the Mac): date bugs hide in the gap between them.
 * Component tests run once, in Chromium, whose timezone `TZ` doesn't reach:
 * date logic lives in utils, where the unit tests cover both.
 */
const TIME_ZONES = {utc: 'UTC', la: 'America/Los_Angeles'};

const UNIT_TESTS = ['src/**/*.test.ts', 'scripts/**/*.test.ts'];
const INTEGRATION_TESTS = 'src/**/*.int.test.ts';
const COMPONENT_TESTS = 'src/**/*.test.tsx';

/** A desktop window; a mobile test resizes it (`page.viewport`). */
const DESKTOP_VIEWPORT = {width: 1280, height: 800};

export default defineConfig({
  resolve: {tsconfigPaths: true},
  test: {
    projects: [
      {
        extends: true,
        // Next's client modules (next/link) read build-time flags off
        // process.env, which next build inlines; the browser has none.
        define: {'process.env': JSON.stringify({NODE_ENV: 'test'})},
        test: {
          name: 'component',
          include: [COMPONENT_TESTS],
          setupFiles: ['test/component/setup.ts'],
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: {executablePath: preinstalledChromiumPath},
            }),
            headless: true,
            viewport: DESKTOP_VIEWPORT,
            instances: [{browser: 'chromium'}],
          },
        },
      },
      ...Object.entries(TIME_ZONES).flatMap(([suffix, timeZone]) => [
        {
          extends: true,
          test: {
            name: `unit-${suffix}`,
            include: UNIT_TESTS,
            exclude: [INTEGRATION_TESTS],
            env: {TZ: timeZone},
          },
        },
        {
          extends: true,
          test: {
            name: `integration-${suffix}`,
            include: [INTEGRATION_TESTS],
            env: {TZ: timeZone},
            globalSetup: ['test/integration/globalSetup.ts'],
            setupFiles: ['test/integration/setup.ts'],
          },
        },
      ]),
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/generated/**',
        'src/app/design/**',
        'src/i18n/**',
        'src/**/*.test.ts',
      ],
      // Floors per layer, set at what the suite reached (targets were 90 / 80
      // / 80): raise them as coverage grows, never lower them.
      thresholds: {
        'src/utils/**': {lines: 97, branches: 95},
        'src/{services,lib/db}/**': {lines: 91},
      },
    },
  },
});
