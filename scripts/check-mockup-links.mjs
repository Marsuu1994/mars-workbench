/**
 * Mockup links — run by the Mockup links workflow whenever a pull request is
 * opened, pushed to or has its description edited (design/README.md ›
 * Mockups).
 *
 * Every mockup a pull request adds or changes under design/mockup/ must be
 * linked from its description, rendered through raw.githack on the PR's
 * branch, so the owner opens it from the PR without a checkout. A missing
 * link fails the check and prints the line to paste.
 *
 * Locally: GITHUB_REPOSITORY=owner/repo PR_NUMBER=100 node scripts/check-mockup-links.mjs
 */
import {fetchAll, fetchJson, findPullNumber, repository} from './githubApi.mjs';

const MOCKUP_FILE = /^design\/mockup\/[^/]+\.html$/;
const RENDERER = 'https://raw.githack.com';

const pullNumber = await findPullNumber();
if (!pullNumber) {
  console.log('No open pull request for this run; nothing to check.');
  process.exit(0);
}

const pull = await fetchJson(`/repos/${repository}/pulls/${pullNumber}`);
const files = await fetchAll(`/repos/${repository}/pulls/${pullNumber}/files`);
const mockups = files
  .filter(file => file.status !== 'removed' && MOCKUP_FILE.test(file.filename))
  .map(file => file.filename);

const linkFor = path => `${RENDERER}/${repository}/${pull.head.ref}/${path}`;
const description = pull.body ?? '';
const unlinked = mockups.filter(path => !description.includes(linkFor(path)));

if (unlinked.length > 0) {
  for (const path of unlinked) {
    console.log(
      `::error file=${path}::Not linked from the PR description. Add: ${linkFor(path)}`,
    );
  }
  console.error(
    `PR #${pullNumber}: ${unlinked.length} of ${mockups.length} mockups are not linked from the description (design/README.md › Mockups).`,
  );
  process.exit(1);
}
console.log(`PR #${pullNumber}: all ${mockups.length} mockups linked.`);
