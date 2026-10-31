import {
  expect,
  test as base,
  type Page,
  type PlaywrightTestArgs,
  type PlaywrightWorkerArgs,
  type TestInfo,
} from '@playwright/test';
import {basename, relative} from 'node:path';

/**
 * Every e2e test fails on a browser console error or an uncaught page error,
 * so a page that renders but logs a crash doesn't pass.
 */
export const test = base.extend<{failOnConsoleErrors: void}>({
  failOnConsoleErrors: [
    async ({page}, use) => {
      const errors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      await use();
      expect(errors, 'console errors').toEqual([]);
    },
    {auto: true},
  ],
});

export {expect};

/** The active plan's edit page, as the Plan nav item links to it. */
export const PLAN_LINK = 'a[href^="/kanban/plans/"]';

/**
 * Opens a page and waits until it is hydrated: a click or key press before
 * React attaches its handlers lands on server HTML and does nothing.
 */
export const openPage = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

/**
 * Waits for the next server action the page posts to `path` to answer. An
 * optimistic update shows before its action saves it, so a reload or
 * navigation right after one can abort the save: start waiting before the
 * click, and await it before leaving the page.
 */
export const waitForServerAction = (page: Page, path: string) =>
  page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === path,
  );

/** The fixtures a contract's body gets: Playwright only sets up the ones a
    test destructures, so the wrapper names them. */
type ContractFixtures = Pick<
  PlaywrightTestArgs & PlaywrightWorkerArgs,
  'page' | 'context' | 'request' | 'browser'
>;

type ContractBody = (
  fixtures: ContractFixtures,
  testInfo: TestInfo,
) => Promise<void>;

/** The spec file on the call stack, relative to the working directory. */
const findSpecFile = (): string => {
  const frames = new Error().stack?.split('\n') ?? [];
  const callerFrame = frames.find(frame =>
    /\.spec\.ts:\d+:\d+\)?$/.test(frame),
  );
  const path = callerFrame?.match(/\(?([^\s(]+\.spec\.ts):\d+:\d+\)?$/)?.[1];
  if (!path)
    throw new Error('contractTest must be called from a .spec.ts file');
  return relative(process.cwd(), path);
};

/** Terminal colour codes Playwright puts in its assertion messages. */
const ANSI_COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * A contract: behaviour the design settled and the code doesn't have yet
 * (`e2e/contract/`, test/README.md › e2e). It passes while `body` fails at
 * `failsAt` — the assertion the missing behaviour trips — and fails when
 * `body` fails anywhere else, or passes: then the behaviour has landed, and
 * the error names the command that turns the file into plain tests.
 *
 * @public Used by e2e/contract/ specs, which exist only between a design PR
 * and its implementation.
 */
export const contractTest = (
  title: string,
  failsAt: RegExp,
  body: ContractBody,
) => {
  // Playwright files the test under this helper's location, so the spec it
  // belongs to comes from the call site
  const specPath = findSpecFile();
  return test(title, async ({page, context, request, browser}, testInfo) => {
    let failure: unknown;
    try {
      await body({page, context, request, browser}, testInfo);
    } catch (error) {
      failure = error;
    }
    if (failure === undefined) {
      const feature = basename(specPath, '.spec.ts');
      throw new Error(
        `Contract passes (${specPath}): the behaviour has landed. Run npm run contract:flip ${feature} and commit.`,
      );
    }
    const message = (
      failure instanceof Error ? failure.message : String(failure)
    ).replace(ANSI_COLOUR, '');
    if (!failsAt.test(message)) {
      throw new Error(
        `Contract (${specPath}) failed somewhere other than ${failsAt}:\n${message}`,
      );
    }
  });
};
