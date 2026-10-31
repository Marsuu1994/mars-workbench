/**
 * `npm run contract:flip <feature>`: the implementation PR's one mechanical
 * step once a feature's contracts pass (test/README.md › e2e). Rewrites
 * `e2e/contract/<feature>.spec.ts` into plain tests, moves it to
 * `e2e/features/` with `git mv`, and formats it.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {flipContractSource} from './contractFlip';

const CONTRACT_DIR = 'e2e/contract';
const FEATURES_DIR = 'e2e/features';

const feature = process.argv[2];
if (!feature) {
  throw new Error('Usage: npm run contract:flip <feature>');
}

const contractPath = `${CONTRACT_DIR}/${feature}.spec.ts`;
const featurePath = `${FEATURES_DIR}/${feature}.spec.ts`;
if (!existsSync(contractPath)) {
  throw new Error(`No contract at ${contractPath}`);
}
if (existsSync(featurePath)) {
  throw new Error(`${featurePath} already exists`);
}

mkdirSync(FEATURES_DIR, {recursive: true});
execFileSync('git', ['mv', contractPath, featurePath], {stdio: 'inherit'});
writeFileSync(
  featurePath,
  flipContractSource(readFileSync(featurePath, 'utf8')),
);
execFileSync('npx', ['prettier', '--write', featurePath], {stdio: 'inherit'});
console.warn(`Flipped ${contractPath} → ${featurePath}`);
