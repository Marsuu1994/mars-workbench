import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load from .env.local for Next.js compatibility
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
