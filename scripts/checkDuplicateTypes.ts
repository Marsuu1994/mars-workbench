/**
 * `npm run check:duplicate-types` (CI): no two types under src/ are declared
 * with the same shape (AGENTS.md › Coding Conventions › General, DRY). A
 * repeat is one the diff that adds it doesn't show, so neither its author nor
 * its reviewer sees it; this reads every declaration instead.
 *
 * Compared: interfaces and type aliases with at least two members, outside
 * tests and the generated Prisma client. Left alone: a component's props
 * (`…Props`), generics, and two types each derived from its own source. The
 * shapes come from the type checker, so the generated Prisma client has to
 * exist, as for `npm run typecheck`: the command stops when an import
 * doesn't resolve, rather than pass without having compared what's behind it.
 */
import ts from 'typescript';
import {
  findDuplicateTypes,
  findUnresolvedImports,
  formatDuplicateTypes,
  type DuplicateTypesOptions,
} from './duplicateTypes';

const TSCONFIG_PATH = 'tsconfig.json';
const CHECKED_ROOT = 'src/';
const GENERATED_ROOT = 'src/generated/';
const TEST_FILE = /\.test\.tsx?$/;
/** How many unresolved imports the command lists before it stops. */
const UNRESOLVED_SHOWN = 5;

const config = ts.getParsedCommandLineOfConfigFile(
  TSCONFIG_PATH,
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: diagnostic => {
      console.error(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
      process.exit(1);
    },
  },
);
if (!config) {
  console.error(`check:duplicate-types couldn't read ${TSCONFIG_PATH}.`);
  process.exit(1);
}

const program = ts.createProgram(config.fileNames, config.options);
const options: DuplicateTypesOptions = {
  root: process.cwd(),
  isChecked: file =>
    file.startsWith(CHECKED_ROOT) &&
    !file.startsWith(GENERATED_ROOT) &&
    !TEST_FILE.test(file),
};

const unresolvedImports = findUnresolvedImports(program, options);
if (unresolvedImports.length > 0) {
  const shown = unresolvedImports
    .slice(0, UNRESOLVED_SHOWN)
    .map(({file, line, module}) => `  ${file}:${line}  ${module}`);
  console.error(
    [
      `check:duplicate-types can't compare types behind ${unresolvedImports.length} imports that don't resolve:`,
      ...shown,
      'If the generated Prisma client is missing, run `npx prisma generate` (or `npm run setup`).',
    ].join('\n'),
  );
  process.exit(1);
}

const {checkedCount, duplicates} = findDuplicateTypes(program, options);

if (duplicates.length > 0) {
  console.error(formatDuplicateTypes(duplicates));
  process.exit(1);
}
console.log(
  `${checkedCount} types under ${CHECKED_ROOT}, no shape declared more than once.`,
);
