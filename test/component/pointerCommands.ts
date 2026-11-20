/**
 * Browser commands a component test calls through `commands` from
 * `vitest/browser`, for what `userEvent` can't do: hold the mouse button
 * down on an element, so a test can read how it looks while it is pressed
 * (`:active`), then let go.
 */
import type {BrowserCommand} from 'vitest/node';

/** Presses the mouse button down at the centre of the element `selector`
    matches inside the test's frame, and keeps it down. */
const holdPointer: BrowserCommand<[selector: string]> = async (
  context,
  selector,
) => {
  if (!('iframe' in context)) throw new Error('Needs the Playwright provider');
  const box = await context.iframe.locator(selector).boundingBox();
  if (!box) throw new Error(`Nothing to press at ${selector}`);
  await context.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await context.page.mouse.down();
};

/** Lets go of the mouse button that holdPointer pressed. */
const releasePointer: BrowserCommand<[]> = async context => {
  if (!('page' in context)) throw new Error('Needs the Playwright provider');
  await context.page.mouse.up();
};

export const pointerCommands = {holdPointer, releasePointer};

declare module 'vitest/browser' {
  interface BrowserCommands {
    holdPointer: (selector: string) => Promise<void>;
    releasePointer: () => Promise<void>;
  }
}
