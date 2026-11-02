/**
 * e2e timing — how long each spec (one per flow doc) takes in each project,
 * from Playwright's JSON report, as a Markdown table. CI appends it to the
 * e2e job's summary; it is the data for choosing which specs a PR runs
 * (design/spike/archived/e2e-data-isolation.md › Q8).
 *
 * Locally: npx playwright test --reporter=json > e2e-timing.json
 *          npm run e2e:timing -- e2e-timing.json
 */
import {readFileSync} from 'node:fs';

const [reportPath] = process.argv.slice(2);
if (!reportPath) {
  console.error('Usage: npm run e2e:timing -- <playwright json report>');
  process.exit(1);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

/** Milliseconds per `${spec file}\t${project}`, summed over every attempt. */
const durations = new Map();
const projects = new Set();

const addSuite = (suite, file) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      projects.add(test.projectName);
      const key = `${file}\t${test.projectName}`;
      const total = test.results.reduce((sum, {duration}) => sum + duration, 0);
      durations.set(key, (durations.get(key) ?? 0) + total);
    }
  }
  for (const child of suite.suites ?? []) addSuite(child, file);
};
for (const suite of report.suites) addSuite(suite, suite.file);

const files = [
  ...new Set([...durations.keys()].map(key => key.split('\t')[0])),
].sort();
const projectNames = [...projects].sort();
const seconds = milliseconds =>
  milliseconds === undefined ? '—' : `${(milliseconds / 1000).toFixed(1)} s`;

const lines = [
  `### e2e timing — ${seconds(report.stats.duration)} wall clock`,
  '',
  'Summed test time per spec and project (setup included; workers run in parallel, so the sum exceeds the wall clock).',
  '',
  `| Spec | ${projectNames.join(' | ')} |`,
  `| --- | ${projectNames.map(() => '---').join(' | ')} |`,
  ...files.map(
    file =>
      `| \`${file}\` | ${projectNames.map(project => seconds(durations.get(`${file}\t${project}`))).join(' | ')} |`,
  ),
];
console.log(lines.join('\n'));
