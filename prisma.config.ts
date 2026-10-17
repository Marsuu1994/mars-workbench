import {config} from 'dotenv';
import {defineConfig, env} from 'prisma/config';

// The local stack's .env.local, like Next.js; `npm run db:deploy:prod` points
// this at .env.prod instead, the only way a Prisma command reaches production.
config({path: process.env.PRISMA_ENV_FILE ?? '.env.local'});

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
