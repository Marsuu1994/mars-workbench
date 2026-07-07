import {config} from 'dotenv';
import {defineConfig, env} from 'prisma/config';

// Load from .env.local for Next.js compatibility
config({path: '.env.local'});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use direct connection (bypasses pooler) for CLI operations
    // (migrations, db push, introspection). Runtime uses pooled
    // DATABASE_URL via the PrismaPg adapter in src/lib/prisma.ts.
    url: env('DIRECT_URL'),
  },
});
