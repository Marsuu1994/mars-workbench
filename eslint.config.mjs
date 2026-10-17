import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // No leftover console.log; console.error / warn report real failures
  // (optimistic rollbacks, runTool). Scripts under scripts/ print freely.
  {
    files: ['src/**'],
    rules: {
      'no-console': ['error', {allow: ['error', 'warn']}],
    },
  },
  // Server-only modules never reach client code (AGENTS.md → Layers). Type
  // imports are erased at build time, so a component may still type its
  // props with a DAL row.
  {
    files: ['src/components/**', 'src/hooks/**', 'src/store/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '(^@/|\\.\\./)(services|lib/db|lib/prisma|generated/prisma|utils/statsUtils)(/|$)',
              allowTypeImports: true,
              message:
                'Server-only module: call a server action instead (`import type` is fine).',
            },
          ],
        },
      ],
    },
  },
  // Disable ESLint rules that conflict with Prettier formatting.
  // Keep this last so it overrides stylistic rules from the configs above.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
