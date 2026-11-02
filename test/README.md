# Tests

Three layers, each where it pays (the decision record: `design/spike/archived/test-baseline.md`). AGENTS.md holds what every task needs — run `npm test` before a push, how agents verify UI; this file is how the tests are written.

| Layer | Runner | Lives in | Talks to |
| --- | --- | --- | --- |
| unit | Vitest | `src/**/x.test.ts`, next to the module | nothing — pure functions; only outside edges mocked (Supabase Auth's `getClaims`) |
| integration | Vitest | `src/**/x.int.test.ts`, next to the module | a real Postgres: services, the DAL, `/api/mcp` in process; no browser, no Auth |
| e2e | Playwright | `e2e/`, one spec per flow doc | the app on the local Supabase stack, each test signed in as its own fresh user |

Shared helpers live here in `test/`: `factories.ts` (data through the services), `time.ts` (frozen moments of one week), `buildTask.ts` (DAL rows for unit tests), `seedData.ts` + `seedWeek.ts` (the dev user's seeded week, `npm run db:seed`), and `integration/` (the database's setup).

## Commands

```bash
npm test               # unit + integration, in UTC and Los Angeles time
npm run test:unit      # unit only: no database
npm run test:coverage  # what CI runs: everything, failing below the coverage floors
npm run test:e2e       # Playwright: every spec in both widths, reuses a running npm run dev
npx vitest run src/services/syncService.int.test.ts   # one file
npx playwright test e2e/board.spec.ts --project=mobile  # one spec at one width
```

## Unit and integration

- **Both timezones**: every Vitest project runs once in `UTC` (Vercel) and once in `America/Los_Angeles` (`next dev` on the owner's Mac). A date bug usually shows in one of them only.
- **A real database, never a mocked DAL or Prisma**: integration tests assert the state a service leaves behind, so they survive refactors that change how it calls the DAL. They run against `mars_test`, a database of its own beside the dev one; `test/integration/globalSetup.ts` finds a Postgres (`TEST_DATABASE_URL` in CI, else the local stack, else a cloud container's system Postgres, started on demand), creates and migrates the database and empties it before each run.
- **A fresh user per test**: `newUserId()` in `beforeEach`. Every query is scoped by userId and the app tables have no foreign key to Auth, so tests never see each other's rows — no cleanup, and files run in parallel.
- **Build data through the services** with `test/factories.ts`, frozen at a moment from `test/time.ts`: the data then has the dates and invariants the app would give it. Tests may read the database through Prisma to assert what a service left behind; app code outside the DAL may not.
- **Freeze time with `freezeTime()`**, which fakes `Date` only, so database connections keep their timers; the integration setup restores real timers after each test.
- **A known bug is an `it.fails`** naming its tracker item; flip it to `it` in the PR that fixes it.
- **A bug fix starts with a failing test** at the lowest layer that reproduces it.
- **Coverage floors** in `vitest.config.mts` (`src/utils`, services + DAL) only go up: raise them when coverage grows, never lower them to pass. Components, actions and pages have no floor; e2e and the owner's acceptance cover them.
- **`tools/list` is snapshotted** (`src/app/api/mcp/__snapshots__/`): it is what Claude sees. A change to a tool's schema or description fails until the snapshot is updated on purpose (`npx vitest run -u`).

## e2e

- **Every test is its own user.** The fixtures (`e2e/fixtures.ts`) give each test a fresh Auth user, sign it in through the API (`storageState`) and hand it `seed`: `test/factories.ts` writing as that user. A test seeds exactly what it reads — no shared seed, no order between tests — so every test runs alone, repeatedly and in parallel (`fullyParallel`). Nothing is cleaned up: CI's database is thrown away, and a local one only gathers users the dev user never sees. A signed-out test overrides `storageState` with an empty one and creates no user. The global setup only reads the stack's secret key once, for every worker.
- **Shared setup, by layer**: the run (`e2e/globalSetup.ts`: the key), the test (the fixtures: `user`, `storageState`, `seed`), the test body (its own `seed.*` calls; a shape a spec repeats is a small function in that spec, called explicitly). Never a `beforeEach` that seeds a shared world — that is the old seed again.
- **One spec per flow doc** (`board`, `plan`, `priorities`, `projects`, `dump`, `auth`), **one `test.describe` per flow**, named after the flow doc's `##` heading, so a report reads against the flow docs. Flows that ship without an e2e test yet are listed in `e2e/not-implemented.md`; delete a row when its test lands.
- **Both widths**: the `desktop` and `mobile` projects run every product spec. Where the two differ, the step is a helper in `e2e/actions/` that takes `isMobile` (opening the backlog, Track This Week), so a test is written once. A rule the flow doc gives for one width only is `test.skip` on the other, quoting the doc — never a skip to get green. The `design-console` project (every scenario tab and gallery tab renders and its play steps run) is desktop only: the console draws phone widths in its own frames.
- **Which layer**: e2e proves a journey is wired end to end — the action lands and the page shows it, asserted once. The value's edge cases are integration tests (the service on a real database); how each state looks is a Design Console scenario. Bad: an e2e test per progress-bar state. Good: one drag to Done asserting today's count went up, and the counts' edge cases in `boardService.int.test.ts`.
- **Any console error fails a test** (`e2e/fixtures.ts`).
- **Locate by role and visible text**, the way a user finds a control; a page can hold a hidden copy of some text — its other layout, or a streamed Suspense chunk React hasn't swapped in yet — so match the visible one (`expectToSee`). Before clicking or typing, open the page with `openPage()`, which waits until React has hydrated it.
- **Specs import the factories, not the app's internals**: Playwright loads TypeScript as CommonJS, which is why the Prisma client is generated as CommonJS (`prisma/schema.prisma`). A spec writes data only through `seed`; reads go through the page.
- **Let a server action land before leaving the page**: an optimistic update shows before its action saves it, and a reload or navigation right after one aborts the save — CI's slower runner loses that race where a local run doesn't. Start `waitForServerAction(page, path)` (`e2e/fixtures.ts`) before the click and await it before you leave.
- **Timing**: CI's e2e job summary lists each spec's time per project (`npm run e2e:timing`, from the JSON report).
- **Contracts are behaviour not built yet.** `e2e/contract/<feature>.spec.ts` holds what a merged design promises and the code doesn't do yet, one `contractTest(title, failsAt, body)` per behaviour (`e2e/fixtures.ts`). It passes while `body` fails at `failsAt` — the first assertion the missing behaviour trips, reached before the test changes any data — and fails when `body` fails anywhere else or passes. The `contract` project runs before every other project, so a contract that broke or landed fails the run in seconds.
- **Flipping is mechanical.** When the implementation makes a contract pass, CI fails with `Run npm run contract:flip <feature>`: that command rewrites each `contractTest` into a `test` (body untouched), moves the file to `e2e/features/` and formats it. Never edit a contract by hand to make it pass; a contract that is wrong means the design changed.
- **Dates stay out of e2e**: the server is another process and its clock can't be frozen, so date logic is tested at the integration layer.
