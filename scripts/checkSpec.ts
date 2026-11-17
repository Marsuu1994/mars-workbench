/**
 * `npm run check:spec` (CI):
 * - every item in a spec v2 doc is held by a test whose title names it, and
 *   no title names an item that isn't there (design/flows/README.md › Items
 *   and IDs);
 * - the legacy docs (design/flows/legacy.txt) only get fewer, and none grows,
 *   compared with main where this branch left it.
 *
 * `npm run check:spec -- --list board` prints board.md's items, each with
 * where it stands and the tests holding it. In CI, every spec's list goes
 * into the job summary.
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {
  LEGACY_LIST_PATH,
  findLegacyProblems,
  findSpecProblems,
  formatSpecList,
  formatSpecTable,
  listSpecItems,
  parseLegacyList,
  parseSpecItems,
} from './specCoverage';

const FLOWS_DIR = 'design/flows';
const TEST_ROOTS = ['src', 'e2e', 'scripts', 'test'];
const TEST_FILE = /\.(test\.tsx?|spec\.ts)$/;
const LIST_FLAG = '--list';
const MAIN = 'origin/main';

const git = (args: string[]) => spawnSync('git', args, {encoding: 'utf8'});

/** A file as it is at a commit, or null where it doesn't exist. */
const readAt = (commit: string, path: string) => {
  const {status, stdout} = git(['show', `${commit}:${path}`]);
  return status === 0 ? stdout : null;
};

const docs = readdirSync(FLOWS_DIR)
  .filter(name => name.endsWith('.md') && name !== 'README.md')
  .map(name => ({name, markdown: readFileSync(join(FLOWS_DIR, name), 'utf8')}));
const legacy = parseLegacyList(readFileSync(LEGACY_LIST_PATH, 'utf8'));

const specs = docs
  .filter(({name}) => !legacy.includes(name))
  .map(({name, markdown}) => ({path: join(FLOWS_DIR, name), markdown}));

const testFiles = TEST_ROOTS.flatMap(root =>
  readdirSync(root, {recursive: true, encoding: 'utf8'})
    .filter(name => TEST_FILE.test(name))
    .map(name => join(root, name)),
).map(path => ({path, source: readFileSync(path, 'utf8')}));

const listFlagIndex = process.argv.indexOf(LIST_FLAG);
if (listFlagIndex !== -1) {
  const page = process.argv[listFlagIndex + 1];
  const spec = specs.find(({path}) => path === join(FLOWS_DIR, `${page}.md`));
  if (!spec) {
    console.error(
      `${LIST_FLAG} takes a spec v2 page: ${specs.map(({path}) => path).join(', ')}.`,
    );
    process.exit(1);
  }
  process.stdout.write(
    formatSpecList(spec.path, listSpecItems(spec, testFiles)),
  );
  process.exit(0);
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  for (const spec of specs) {
    appendFileSync(
      summaryPath,
      formatSpecTable(spec.path, listSpecItems(spec, testFiles)),
    );
  }
}

// Main where this branch left it, so main moving on doesn't change the answer
const {status: baseStatus, stdout: baseOutput} = git([
  'merge-base',
  MAIN,
  'HEAD',
]);
if (baseStatus !== 0) {
  console.error(
    `check:spec compares the legacy docs with ${MAIN}, which this clone doesn't have: run \`git fetch origin main\` (CI checks out with fetch-depth: 0).`,
  );
  process.exit(1);
}
const baseCommit = baseOutput.trim();
const baseLegacyList = readAt(baseCommit, LEGACY_LIST_PATH);
const markdownByName = new Map(
  legacy.flatMap(name => {
    const markdown = readAt(baseCommit, join(FLOWS_DIR, name));
    return markdown === null ? [] : [[name, markdown] as const];
  }),
);

const problems = [
  ...findLegacyProblems({
    docs,
    legacy,
    base: {
      legacy: baseLegacyList === null ? null : parseLegacyList(baseLegacyList),
      markdownByName,
    },
  }),
  ...findSpecProblems(specs, testFiles),
];

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

for (const {path, markdown} of specs) {
  const items = parseSpecItems(markdown);
  const pendingCount = items.filter(item => item.pending).length;
  console.warn(
    `${path}: ${items.length - pendingCount} items, each held by a test${
      pendingCount > 0 ? ` (${pendingCount} pending)` : ''
    }.`,
  );
}
console.warn(
  `${legacy.length} legacy docs left (${LEGACY_LIST_PATH}), none grown.`,
);
