import {describe, expect, it} from 'vitest';
import {flipContractSource} from './contractFlip';

const CONTRACT = `import {contractTest, expect, openPage} from '../fixtures';

contractTest("the backlog stacks a habit's instances", /×2/, async ({page}) => {
  await openPage(page, '/kanban');
  await expect(page.getByText('×2')).toBeVisible();
});

contractTest(
  'a pull takes the earliest step',
  /Unit 3 \\/ 4/i,
  async ({page}) => {
    await openPage(page, '/kanban');
  },
);
`;

describe('flipContractSource', () => {
  // Spacing inside the call is left to Prettier, which the CLI runs after
  it('turns every contract into a plain test, body untouched', () => {
    expect(flipContractSource(CONTRACT))
      .toBe(`import {expect, openPage, test} from '../fixtures';

test("the backlog stacks a habit's instances", async ({page}) => {
  await openPage(page, '/kanban');
  await expect(page.getByText('×2')).toBeVisible();
});

test('a pull takes the earliest step', async ({page}) => {
    await openPage(page, '/kanban');
  },
);
`);
  });

  it('keeps a single test import when the file already had one', () => {
    const source = `import {contractTest, test} from '../fixtures';\ncontractTest('a', /b/, async () => {});\n`;
    expect(flipContractSource(source)).toBe(
      `import {test} from '../fixtures';\ntest('a', async () => {});\n`,
    );
  });

  it('refuses a contract it cannot flip mechanically', () => {
    const source = `import {contractTest} from '../fixtures';\ncontractTest(TITLE, /b/, async () => {});\n`;
    expect(() => flipContractSource(source)).toThrow(/flip it by hand/);
  });
});
