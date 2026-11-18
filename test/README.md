# Tests

Four layers, each where it pays (the decision records: `design/spike/archived/test-baseline.md`, and `design/spike/spec-layers-v2.md` for component tests and spec IDs). AGENTS.md holds what every task needs — run the tests before a push, how agents verify UI; this file is how the tests are written.

This file is the one home of the rules for writing a test. The `implement-spec` skill and the `implement-spec-reviewer` agent point here rather than restate them (AGENTS.md › Adding a rule); which spec items need a test yet is `design/specs/README.md`'s.

| Layer | Runner | Lives in | Talks to |
| --- | --- | --- | --- |
| unit | Vitest | `src/**/x.unit.test.ts`, next to the module | nothing — pure functions; only outside edges mocked (Supabase Auth's `getClaims`) |
| integration | Vitest | `src/**/x.int.test.ts`, next to the module | a real Postgres: services, the DAL, actions, `/api/mcp` in process; no browser, no Auth |
| component | Vitest browser mode, in Chromium | `src/**/X.component.test.tsx`, next to the component | a page's container or a component under it, given rows as its props; the server actions it calls are mocked |
| e2e | Playwright | `e2e/`, one spec per spec doc | the app on the local Supabase stack, each test signed in as its own fresh user |

Shared helpers live here in `test/`:

- `component/`: the page's providers and stylesheet for component tests;
- `factories.ts`: data written through the services;
- `time.ts`: frozen moments of one week;
- `buildTask.ts`: DAL rows for unit tests;
- `seedData.ts` and `seedWeek.ts`: the dev user's seeded week (`npm run db:seed`);
- `integration/`: the database's setup.

## Commands

```bash
npm test               # every Vitest layer: unit + integration in UTC and Los Angeles time, component in Chromium
npm run test:unit      # unit only: no database
npm run test:component # component only: Chromium, no database
npm run test:coverage  # what CI runs for unit + integration, failing below the coverage floors
npm run check:spec     # every spec v2 item is held by a test that names it (CI); -- --list <page> lists them
npm run test:e2e       # Playwright: every spec in both widths, reuses a running npm run dev
npx vitest run src/services/syncService.int.test.ts   # one file
npx playwright test e2e/board.spec.ts --project=mobile  # one spec at one width
```

## Which layer

A behaviour is tested in the layer its logic lives in:

- a derivation in a pure helper: unit;
- a rule on the server, and an action's server side: integration;
- what a component shows for given data (a card's parts and look, a column's order on screen, focus), and an action's client side (the action it calls, the optimistic change, the rollback): component;
- a journey: e2e.

A behaviour whose parts live in different layers is tested in each: the returning user's recap is computed on the server (integration) and shown by the empty board (component), both tests naming ST-2.

A part that only a real server shows is tested by e2e too, even when its logic lives in a lower layer: the page getting the saved data without a reload, a redirect, what's still there after a reload. A component test can only stand in for these, so a journey step asserts them. `design/specs/board.md` MV-3 is the example: the integration test checks the action asks for a reload, the component test fakes the new props, and only J3's A7 step shows the progress actually moving.

Beyond that, e2e proves only that a journey is wired end to end: the action lands and the page shows it, asserted once. The edge cases of a value are integration tests, and how each state looks is a component test, which the Design Console also shows the owner. Bad: an e2e test per progress-bar state. Good: one drag to Done asserting today's count went up, and the counts' edge cases in `boardService.int.test.ts`.

## Every test

- **Assert the outcome, not how the code reaches it**: what the user sees, or what a service leaves in the database — not class names, internal calls or the steps the code takes. Each layer's section below says how it reads the outcome.
- **See it fail**: a bug fix starts with a test that fails, in the lowest layer that reproduces it, and a test for behaviour not built yet fails before the code lands. A test for behaviour that already exists is checked by breaking the code once: the test must turn red, then the code goes back.
- **Wait for the change before asserting**: an assertion runs only once the page has had its chance to change — after the action's promise resolves, after the `rerender` with the server's new props, after a transition. This matters most for an assertion that is already true before anything happens ("it goes back", "it stays", "nothing else moved"): run too early, it passes whether the code works or not. Bad: MV-4 asserting right after the refused save resolves, so it stays green even when the rollback doesn't wait. Good: the same assertion after the page has had a chance to roll back, red as soon as the rollback stops waiting.

## Unit and integration

- **Both timezones**: every Vitest project runs once in `UTC` (Vercel) and once in `America/Los_Angeles` (`next dev` on the owner's Mac). A date bug usually shows in one of them only.
- **A real database, never a mocked DAL or Prisma**: integration tests assert the state a service leaves behind, so they survive refactors that change how it calls the DAL. They run against `mars_test`, a database of its own beside the dev one; `test/integration/globalSetup.ts` finds a Postgres (`TEST_DATABASE_URL` in CI, else the local stack, else a cloud container's system Postgres, started on demand), creates and migrates the database and empties it before each run.
- **A fresh user per test**: `newUserId()` in `beforeEach`. Every query is scoped by userId and the app tables have no foreign key to Auth, so tests never see each other's rows — no cleanup, and files run in parallel.
- **Build data through the services** with `test/factories.ts`, frozen at a moment from `test/time.ts`: the data then has the dates and invariants the app would give it. Tests may read the database through Prisma to assert what a service left behind; app code outside the DAL may not.
- **Freeze time with `freezeTime()`**, which fakes `Date` only, so database connections keep their timers; the integration setup restores real timers after each test.
- **A known bug is an `it.fails`** naming its tracker item; flip it to `it` in the PR that fixes it.
- **Coverage floors** in `vitest.config.mts` (`src/utils`, services + DAL) only go up: raise them when coverage grows, never lower them to pass. Components, actions and pages have no floor; component tests, e2e and the owner's acceptance cover them.
- **An action's integration test mocks only its two edges outside the database**: who is signed in (`getCurrentUserId`) and which pages Next reloads (`revalidatePath`, asserted by path). Everything under it runs for real.
- **`tools/list` is snapshotted** (`src/app/api/mcp/__snapshots__/`): it is what Claude sees. A change to a tool's schema or description fails until the snapshot is updated on purpose (`npx vitest run -u`).

## Component

- **Render the page's container (or a component under it) with `renderPage`** (`test/component/renderPage.tsx`): the root layout's providers, and the app's stylesheet loaded once (`test/component/setup.ts`). The page's fixtures come from its Design Console scenarios (`src/app/design/scenarios/<feature>/fixtures.ts`), so the console and the tests read the same week.
- **Server actions are the mock boundary**: `vi.mock('@/actions/<module>', () => ({…: vi.fn()}))` — a factory, since the real module imports Prisma, which a browser can't load. The server's answer is a revalidated page and then the action's result: `rerender` with the server's new props, then resolve the action's promise.
- **React settles every pending transition together**: an optimistic change rolls back only once every write in flight has answered. A test that leaves a save unanswered answers it before it ends, or the next test's rollbacks wait on it.
- **Read what the user sees**: computed styles (`getComputedStyle`), position on the page and focus. Read the DOM and retry with `expect.poll`; a locator built from an element (`page.elementLocator`) pins the element's text, which a move changes.
- **Widths**: the window is desktop-sized; a mobile test calls `page.viewport` and the file resets it after each test. A page that fills its parent's height (as AppShell's `<main>`) renders inside a full-height frame.
- **Drags use the keyboard**, as in e2e: dnd can't be driven by a mouse in a test.

## e2e

- **Every test is its own user.** The fixtures (`e2e/fixtures.ts`) give each test a fresh Auth user, sign it in through the API (`storageState`) and hand it `seed`: `test/factories.ts` writing as that user. A test seeds exactly what it reads — no shared seed, no order between tests — so every test runs alone, repeatedly and in parallel (`fullyParallel`). Nothing is cleaned up: CI's database is thrown away, and a local one only gathers users the dev user never sees. A signed-out test overrides `storageState` with an empty one and creates no user. The global setup only reads the stack's secret key once, for every worker.
- **Shared setup, by layer**: the run (`e2e/globalSetup.ts`: the key), the test (the fixtures: `user`, `storageState`, `seed`), the test body (its own `seed.*` calls; a shape a spec repeats is a small function in that spec, called explicitly). Never a `beforeEach` that seeds a shared world — that is the old seed again.
- **One e2e spec per spec doc** (`board`, `plan`, `priorities`, `projects`, `dump`, `auth`; `mcp.md` and `shared.md` are tested in process — `/api/mcp` and the services). A spec v2 page's e2e spec is its journeys, one test per journey, each action a `test.step` named by its ID (`e2e/board.spec.ts`). A legacy doc's spec keeps one `test.describe` per flow, named after the legacy doc's `##` heading, until the doc migrates.
- **Both widths**: the `desktop` and `mobile` projects run every product spec. Where the two differ, the step is a helper in `e2e/actions/` that takes `isMobile` (opening the backlog, Track This Week), so a test is written once. A rule the spec gives for one width only is `test.skip` on the other, quoting the doc — never a skip to get green. The `design-console` project (every scenario tab and gallery tab renders and its play steps run) is desktop only: the console draws phone widths in its own frames.
- **Any console error fails a test** (`e2e/fixtures.ts`).
- **Locate by role and visible text**, the way a user finds a control; a page can hold a hidden copy of some text — its other layout, or a streamed Suspense chunk React hasn't swapped in yet — so match the visible one (`expectToSee`). Before clicking or typing, open the page with `openPage()`, which waits until React has hydrated it.
- **Specs import the factories, not the app's internals**: Playwright loads TypeScript as CommonJS, which is why the Prisma client is generated as CommonJS (`prisma/schema.prisma`). A spec writes data only through `seed`; reads go through the page.
- **Let a server action land before leaving the page**: an optimistic update shows before its action saves it, and a reload or navigation right after one aborts the save — CI's slower runner loses that race where a local run doesn't. Start `waitForServerAction(page, path)` (`e2e/fixtures.ts`) before the click and await it before you leave.
- **Timing**: CI's e2e job summary lists each spec's time per project (`npm run e2e:timing`, from the JSON report).
- **Dates stay out of e2e**: the server is another process and its clock can't be frozen, so date logic is tested at the integration layer.

## Spec IDs

A page migrated to spec v2 (`design/specs/README.md`) has an ID on every item, and a test names the IDs it holds at the start of its title: `it('CARD-2 R4 a Done card is dimmed …')`, `test('J3 …')`, a journey's `test.step('A4 …')`. A test may hold several IDs and an ID may be held by several tests; what counts is that every ID is held by at least one, in the layer Which layer gives it.

- **Name the spec**: a test file whose titles name IDs says which spec they're from, on its first line: `// Spec: design/specs/board.md`. A file can hold several specs' items, one comment per spec. `check:spec` reads titles only in files with this comment, so an unrelated title such as `UTF-8 input is decoded` is never taken for an ID, and a test in a file without it holds nothing.
- **Write it from the item's text**: the assertions are the outcomes the item states — its counts, caps, order and what is absent — read off the item, not off the code under test. An item that can't be asserted as written is a question about the spec, not a reason to assert whatever the code does.
- **Write tests sparingly**: the IDs one scenario can assert together share one test (`CARD-2 R4` checks the Done card's look and its missing drag handle on the same render); split only when the layer differs or the scenario needs its own setup.
- **A title names only what the test proves**: for each ID in its title, the test has an assertion that fails when that item breaks. A journey step that only reaches a state names no ID. Bad: `test.step('ST-3 the board', …)` that only opens the page. Good: `test.step('A7 MV-3 finish the step', …)` asserting the card is in Done and today's count went up, before any reload.
- **The markers say which items need a test yet**, and when an implementation PR is done (`design/specs/README.md` › Items and IDs).
- **`npm run check:spec`** (CI) fails when an item no test holds, a `(bug)` item no `it.fails` holds, a title naming an ID its spec doesn't have or one still pending, an item that isn't a `(bug)` held only by an `it.fails`, or an ID used twice. A skipped or commented-out test holds nothing, and a `describe.skip` fails the check, since the tests inside would still count. It also keeps the legacy docs from growing (`design/specs/README.md` › Legacy docs).
- **`npm run check:spec -- --list <page>`** prints the page's items, each with where it stands (held, pending, removing, bug) and the tests holding it. CI writes the same list for every spec into the job summary.
