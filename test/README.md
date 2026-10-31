# Tests

Three layers, each where it pays (the decision record: `design/spike/archived/test-baseline.md`). AGENTS.md holds what every task needs — run `npm test` before a push, how agents verify UI; this file is how the tests are written.

| Layer | Runner | Lives in | Talks to |
| --- | --- | --- | --- |
| unit | Vitest | `src/**/x.test.ts`, next to the module | nothing — pure functions; only outside edges mocked (Supabase Auth's `getClaims`) |
| integration | Vitest | `src/**/x.int.test.ts`, next to the module | a real Postgres: services, the DAL, `/api/mcp` in process; no browser, no Auth |
| e2e | Playwright | `e2e/` | the app on the local Supabase stack, signed in as the e2e user |

Shared helpers live here in `test/`: `factories.ts` (data through the services), `time.ts` (frozen moments of one week), `buildTask.ts` (DAL rows for unit tests), `seedData.ts` + `seedWeek.ts` (the seed's week, shared with `npm run db:seed` and the e2e setup), and `integration/` (the database's setup).

## Commands

```bash
npm test               # unit + integration, in UTC and Los Angeles time
npm run test:unit      # unit only: no database
npm run test:coverage  # what CI runs: everything, failing below the coverage floors
npm run test:e2e       # Playwright: reseeds the e2e user, reuses a running npm run dev
npx vitest run src/services/syncService.int.test.ts   # one file
npx playwright test --project=journeys                # one e2e project
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

- **The e2e user** (`E2E_USER`, `scripts/localEnv.ts`) shares the dev database but not the dev user's data. Before every run, `npm run e2e:session` (called by `e2e/globalSetup.ts`) resets its data to the seed's week and writes its session to `.auth/e2e-session.json`. Locally, a running `npm run dev` is reused; CI builds and starts production.
- **Projects**: `contract` first (above), then `smoke-desktop` and `smoke-mobile` (every page renders the week) and `design-console` (every scenario tab and gallery tab renders and its play steps run), then `journeys` and `features` (flipped contracts), which change the week and so run last.
- **Any console error fails a test** (`e2e/fixtures.ts`).
- **Locate by role and visible text**, the way a user finds a control; a page can hold a hidden copy of some text — its other layout, or a streamed Suspense chunk React hasn't swapped in yet — so match the visible one. Before clicking or typing, open the page with `openPage()`, which waits until React has hydrated it.
- **Specs can't import Prisma or the services**: Playwright loads TypeScript as CommonJS and the generated client is ESM-only. Put what a spec needs in plain modules like `test/seedData.ts`, and database work in a tsx script.
- **Let a server action land before leaving the page**: an optimistic update shows before its action saves it, and a reload or navigation right after one aborts the save — CI's slower runner loses that race where a local run doesn't. Start `waitForServerAction(page, path)` (`e2e/fixtures.ts`) before the click and await it before you leave.
- **Contracts are behaviour not built yet.** `e2e/contract/<feature>.spec.ts` holds what a merged design promises and the code doesn't do yet, one `contractTest(title, failsAt, body)` per behaviour (`e2e/fixtures.ts`). It passes while `body` fails at `failsAt` — the first assertion the missing behaviour trips, reached before the test changes any data — and fails when `body` fails anywhere else or passes. The `contract` project runs before every other project, so a broken contract fails the run in seconds.
- **The implementation PR flips first.** Its first commit, before any code, is `npm run contract:flip <feature>`: it rewrites each `contractTest` into a `test` (body untouched), moves the file to `e2e/features/` and formats it. From then on the feature's tests fail until the implementation passes them — the PR is done when they do. A contract that passes while still a contract means the flip was skipped, and its error names the command. Never edit the tests to make them pass; a test that is wrong means the design changed.
- **Dates stay out of e2e**: the server is another process and its clock can't be frozen, so date logic is tested at the integration layer.
