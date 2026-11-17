/**
 * `npm run check:spec` (CI): every item in a spec v2 doc is held by a test
 * whose title names it, and no title names an item that isn't there
 * (design/flows/README.md › Items and IDs). A doc is spec v2 unless the
 * ratchet still lists it as legacy (scripts/ratchet/baseline/spec-v2.txt).
 *
 * `npm run check:spec -- --list board` prints board.md's items, each with
 * where it stands and the tests holding it. In CI, every spec's list goes
 * into the job summary.
 */
import {appendFileSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {
  findSpecProblems,
  formatSpecList,
  formatSpecTable,
  listSpecItems,
  parseSpecItems,
} from './specCoverage';

const FLOWS_DIR = 'design/flows';
const LEGACY_BASELINE = 'scripts/ratchet/baseline/spec-v2.txt';
const TEST_ROOTS = ['src', 'e2e', 'scripts', 'test'];
const TEST_FILE = /\.(test\.tsx?|spec\.ts)$/;
const LIST_FLAG = '--list';

const legacyDocs = new Set(
  readFileSync(LEGACY_BASELINE, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean),
);

const specs = readdirSync(FLOWS_DIR)
  .filter(name => name.endsWith('.md') && name !== 'README.md')
  .map(name => join(FLOWS_DIR, name))
  .filter(path => !legacyDocs.has(path))
  .map(path => ({path, markdown: readFileSync(path, 'utf8')}));

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

const problems = findSpecProblems(specs, testFiles);

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
