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
});
