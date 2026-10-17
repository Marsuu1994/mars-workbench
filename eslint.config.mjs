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
  // Code style for production code (AGENTS.md → Tooling). The Design Console
  // is the console's own scaffolding, so it is left out.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/design/**', 'src/generated/**'],
    rules: {
      'import/no-default-export': 'error',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/no-multi-comp': ['error', {ignoreStateless: false}],
      'id-length': [
        'error',
        {
          min: 2,
          properties: 'never',
          // id / tx are long enough already; t is next-intl's, _ an unused
          // parameter, i / j index loops, a / b sort comparators, T / K / V
          // type parameters.
          exceptions: ['t', '_', 'i', 'j', 'a', 'b', 'T', 'K', 'V'],
        },
      ],
    },
  },
  // Next.js convention files (and next-intl's request config) must default
  // export, and are written as function declarations.
  {
    files: [
      'src/app/**/{page,layout,loading,not-found,error,global-error,template,default,route}.{ts,tsx}',
      'src/i18n/request.ts',
    ],
    rules: {
      'import/no-default-export': 'off',
      'react/function-component-definition': 'off',
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
