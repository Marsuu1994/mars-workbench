import type {NextConfig} from 'next';
import {PHASE_DEVELOPMENT_SERVER} from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';
import {assertLocalServices} from './scripts/localEnv';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // `next dev` would otherwise append a managed block to AGENTS.md whenever an
  // agent starts it; its one rule (read the installed version's docs) lives in
  // AGENTS.md › Session start instead
  agentRules: false,
  experimental: {
    // A page visited in the last 60 s comes back from the client cache, with
    // no loader run and no skeleton. Our writes keep it correct: each one
    // revalidates, which empties the cache. Writes from elsewhere (Claude over
    // MCP) show up to 60 s late (design/spike/archived/mutation-layer.md).
    staleTimes: {dynamic: 60},
  },
  async headers() {
    return [
      {
        // The OAuth consent page must never render inside another site's
        // frame: an overlaid, invisible Allow button would grant a client
        // access with one tricked click (clickjacking).
        source: '/oauth/:path*',
        headers: [
          {key: 'Content-Security-Policy', value: "frame-ancestors 'none'"},
          {key: 'X-Frame-Options', value: 'DENY'},
        ],
      },
    ];
  },
};

// Defaults to ./src/i18n/request.ts for the per-request i18n config.
const withNextIntl = createNextIntlPlugin();

// `next dev` runs against the local Supabase stack only, so local work never
// writes production data by accident; ALLOW_REMOTE_SUPABASE=1 lets a
// deliberate session through.
const getNextConfig = (phase: string) => {
  if (
    phase === PHASE_DEVELOPMENT_SERVER &&
    process.env.ALLOW_REMOTE_SUPABASE !== '1'
  ) {
    assertLocalServices('next dev (ALLOW_REMOTE_SUPABASE=1 overrides)');
  }
  return withNextIntl(nextConfig);
};

export default getNextConfig;
