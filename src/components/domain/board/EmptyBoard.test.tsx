// Spec: design/flows/board.md
import {describe, expect, it} from 'vitest';
import {page} from 'vitest/browser';
import {renderPage} from '../../../../test/component/renderPage';
import {EmptyBoard} from './EmptyBoard';
import {CREATE_PLAN_HREF} from './emptyBoardConstants';

describe('Empty board', () => {
  it("ST-1 A1 a new user's empty board asks for a first plan, its button opening the plan page", async () => {
    await renderPage(<EmptyBoard />);

    await expect
      .element(page.getByRole('link', {name: 'Create your first plan'}))
      .toHaveAttribute('href', CREATE_PLAN_HREF);
  });

  it("ST-2 A1 a returning user's empty board shows last week's recap, its button opening the plan page", async () => {
    await renderPage(
      <EmptyBoard
        recap={{
          doneCount: 3,
          totalCount: 4,
          donePoints: 7,
          completionRate: 0.75,
        }}
      />,
    );

    const recap = document.body.textContent.replace(/\s+/g, ' ');
    expect(recap).toContain('75%');
    expect(recap).toContain('3/4');
    expect(recap).toContain('7');
    await expect
      .element(page.getByRole('link', {name: 'Create new plan'}))
      .toHaveAttribute('href', CREATE_PLAN_HREF);
  });
});
