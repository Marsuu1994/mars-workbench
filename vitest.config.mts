import {defineConfig} from 'vitest/config';

/**
 * Every suite runs in production's timezone (Vercel is UTC) and in the
 * owner's (`next dev` on the Mac): date bugs hide in the gap between them.
 */
const TIME_ZONES = {utc: 'UTC', la: 'America/Los_Angeles'};

const UNIT_TESTS = ['src/**/*.test.ts', 'scripts/**/*.test.ts'];
const INTEGRATION_TESTS = 'src/**/*.int.test.ts';

export default defineConfig({
  resolve: {tsconfigPaths: true},
  test: {
    projects: Object.entries(TIME_ZONES).flatMap(([suffix, timeZone]) => [
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
