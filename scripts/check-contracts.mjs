/**
 * Contracts — run in CI with the other quick checks (test/README.md › e2e).
 *
 * A contract is an e2e `test.fail` for behaviour a design PR settled and the
 * code doesn't have yet. Every `test.fail` under e2e/ must carry the tag of
 * the mockup it pins — `{tag: '@<area>'}` for design/mockup/mockup-<area>.html
 * — and that mockup must still exist. The implementation PR deletes the
 * mockup, so a contract it forgot to turn into a plain `test` fails here.
 *
 * Locally: npm run check:contracts
 */
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const E2E_DIR = 'e2e';
const mockupPath = area => `design/mockup/mockup-${area}.html`;

/** `test.fail(` up to its body — the title and details arguments. */
const CONTRACT_HEAD = /\btest\.fail\(([\s\S]*?)(?:async\b|\(\s*\{|\)\s*;)/g;
const MOCKUP_TAG = /tag:\s*\[?\s*(['"`])@([a-z0-9-]+)\1/;

const listSpecFiles = dir =>
  readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSpecFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });

const problems = [];
let contractCount = 0;
for (const file of listSpecFiles(E2E_DIR)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(CONTRACT_HEAD)) {
    contractCount++;
    const line = source.slice(0, match.index).split('\n').length;
    const area = match[1].match(MOCKUP_TAG)?.[2];
    if (!area) {
      problems.push({
        file,
        line,
        message:
          "test.fail without a mockup tag: a contract is test.fail(title, {tag: '@<area>'}, body) for design/mockup/mockup-<area>.html",
      });
    } else if (!existsSync(mockupPath(area))) {
      problems.push({
        file,
        line,
        message: `@${area} is a contract, but ${mockupPath(area)} is gone: the implementation is in, so make it a plain test (drop .fail and the tag)`,
      });
    }
  }
}

if (problems.length > 0) {
  for (const {file, line, message} of problems) {
    console.log(`::error file=${file},line=${line}::${message}`);
  }
  console.error(
    `${problems.length} of ${contractCount} contracts need attention (test/README.md › e2e).`,
  );
  process.exit(1);
}
console.log(`${contractCount} contracts, each pinning an open mockup.`);
