/**
 * The contract flip as a pure text transform, so it can be tested without
 * touching files: `contractTest(title, failsAt, body)` becomes
 * `test(title, body)`, and the fixtures import trades `contractTest` for
 * `test`. `scripts/flipContract.ts` applies it to a file and moves the file.
 */

/** A quoted string literal (single, double or template), escapes included. */
const STRING_LITERAL =
  String.raw`'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|` + '`(?:\\\\.|[^`\\\\])*`';

/** A regex literal with its flags. */
const REGEX_LITERAL = String.raw`\/(?:\\.|[^/\\\n])+\/[a-z]*`;

/** `contractTest(<title>, <failsAt>,` — the part the flip rewrites. */
const CONTRACT_CALL = new RegExp(
  String.raw`\bcontractTest\(\s*(${STRING_LITERAL})\s*,\s*${REGEX_LITERAL}\s*,\s*`,
  'g',
);

/** The fixtures import's specifier list. */
const FIXTURES_IMPORT = /import\s*\{([^}]*)\}\s*from\s*(['"])\.\.\/fixtures\2/;

const swapImport = (source: string) =>
  source.replace(FIXTURES_IMPORT, (statement, names: string, quote: string) => {
    const kept = names
      .split(',')
      .map(name => name.trim())
      .filter(name => name && name !== 'contractTest' && name !== 'test');
    const specifiers = ['test', ...kept].sort().join(', ');
    return `import {${specifiers}} from ${quote}../fixtures${quote}`;
  });

/** Every contract in `source` as a plain test; the body is left untouched. */
export const flipContractSource = (source: string): string => {
  const flipped = source.replace(CONTRACT_CALL, 'test($1, ');
  if (/\bcontractTest\b/.test(flipped.replace(FIXTURES_IMPORT, ''))) {
    throw new Error(
      'A contractTest call is not in the form contractTest(title, /failsAt/, body); flip it by hand.',
    );
  }
  return swapImport(flipped);
};
