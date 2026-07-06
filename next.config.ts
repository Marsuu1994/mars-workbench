import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

// Defaults to ./src/i18n/request.ts for the per-request i18n config.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
