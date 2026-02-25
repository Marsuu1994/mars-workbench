import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@/generated/prisma/client": path.resolve(
        __dirname,
        "./src/test/prisma-mock.ts"
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
