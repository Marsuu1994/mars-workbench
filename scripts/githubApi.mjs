/**
 * The GitHub REST helpers the repo checks share (check-review-log,
 * check-mockup-links): the repository from GITHUB_REPOSITORY, the token from
 * GITHUB_TOKEN when there is one, and the pull request a run is about.
 */
import {readFileSync} from 'node:fs';

const API = 'https://api.github.com';
const PAGE_SIZE = 100;

const token = process.env.GITHUB_TOKEN;
export const repository = process.env.GITHUB_REPOSITORY;
if (!repository) {
  throw new Error('GITHUB_REPOSITORY is required');
}
export const [repoOwner] = repository.split('/');

export const fetchJson = async path => {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      // CI passes the workflow token; a public repository also answers without one.
      ...(token && {Authorization: `Bearer ${token}`}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path}: ${response.status}`);
  }
  return response.json();
};

/** Every page of a list endpoint. */
export const fetchAll = async path => {
  const items = [];
  for (let page = 1; ; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await fetchJson(
      `${path}${separator}per_page=${PAGE_SIZE}&page=${page}`,
    );
    items.push(...batch);
    if (batch.length < PAGE_SIZE) return items;
  }
};

/** The PR this run is about: the event's, an override, or the open PR of the pushed branch. */
export const findPullNumber = async () => {
  if (process.env.PR_NUMBER) return Number(process.env.PR_NUMBER);
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const event = eventPath ? JSON.parse(readFileSync(eventPath, 'utf8')) : {};
  if (event.pull_request) return event.pull_request.number;
  const branch = process.env.GITHUB_REF_NAME;
  if (!branch) return null;
  const pulls = await fetchJson(
    `/repos/${repository}/pulls?state=open&head=${repoOwner}:${encodeURIComponent(branch)}`,
  );
  return pulls[0]?.number ?? null;
};
