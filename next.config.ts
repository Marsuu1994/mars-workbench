import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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

export default withNextIntl(nextConfig);
