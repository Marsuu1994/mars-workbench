# Testing Strategy — Mars Workbench

## Current State

- **62 source files, ~4,800 LOC** across Chat and Kanban features
- **Zero tests**, zero test infrastructure
- Clear architectural layers: Utils → DAL → Services → Actions → Components

---

## Framework Choice: Vitest

| Criteria | Vitest | Jest |
|----------|--------|------|
| ESM support | Native | Requires transforms |
| Speed | Fast (esbuild/swc) | Slower |
| TypeScript | Out of the box | Needs ts-jest |
| Next.js compat | Good (with alias config) | Good (with next/jest) |
| API | Jest-compatible | — |
| Watch mode | Instant (HMR-based) | Slower |

**Recommendation: Vitest** — modern, fast, native ESM/TypeScript, Jest-compatible API so migration is trivial if ever needed.

### Additional Libraries

| Library | Purpose | Phase |
|---------|---------|-------|
| `vitest` | Test runner + assertions | 1 |
| `@testing-library/react` | Component rendering + queries | 3 |
| `@testing-library/user-event` | User interaction simulation | 3 |
| `jsdom` | Browser environment for components | 3 |
| `msw` | Mock HTTP/streaming for API + hooks | 3 |

No integration/E2E testing libraries needed initially — the biggest ROI is in unit tests for the logic-heavy layers.

---

## What to Test (and What Not To)

### Test

| Layer | Why | Example |
|-------|-----|---------|
| **Utils** | Pure functions, high branch count, date math edge cases | `getISOWeekKey`, `computeRiskLevel`, `sortTasks` |
| **Schemas** | Validation rules protect data integrity | `createPlanSchema` refinements |
| **Services** | Core business logic, transaction orchestration, most likely to break | `createPlan`, `updatePlan` template diffing, `fetchBoard` metrics |
| **DAL** | Query correctness (with mocked Prisma) | `expireStaleDailyTasks`, `countIncompleteTasksByTemplateId` |
| **Components** (complex) | State-heavy forms with branching UI | `PlanForm`, `ReviewChangesModal` |

### Don't Test (or defer)

| Layer | Why |
|-------|-----|
| **Actions** | Thin glue: validate → service → revalidate. Tested indirectly through services and schemas. |
| **Simple components** | `EmptyBoard`, `TaskTypeBadge`, `LoadingIndicator` — trivial rendering, no logic. |
| **Pages/Layouts** | Server component wrappers. Tested better by E2E if ever needed. |
| **Zustand store** | 67 LOC, 6 flat actions, no derived state. Not worth the setup cost. |
| **API routes** | Chat CRUD is straightforward delegation. LLM streaming is better tested manually. |

---

## Phased Plan

### Phase 1 — Infrastructure + Utils (smallest effort, immediate value)

**Goal:** Set up Vitest, get a green `npm test`, cover the pure-function layer.

**Setup tasks:**
1. Install `vitest` as devDependency
2. Create `vitest.config.ts` with path alias (`@/*` → `./src/*`)
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`
4. Create a test folder convention: co-located `__tests__/` dirs or `.test.ts` siblings

**Test targets:**

| File | Functions | Est. Tests | Priority |
|------|-----------|------------|----------|
| `dateUtils.ts` | `getISOWeekKey`, `getMondayFromPeriodKey`, `getSundayFromPeriodKey`, `sameDay`, `normalizeForDate` | ~20 | P0 |
| `taskUtils.ts` | `computeRiskLevel`, `sortTasks`, `groupAndSortTasks`, `computeTemplateProgress` | ~20 | P0 |
| `schemas.ts` | All 6 schemas — valid inputs, invalid inputs, refinement edge cases | ~15 | P1 |

**Why start here:** Zero dependencies on DB, React, or Next.js. Pure input → output. Covers the most bug-prone date math and risk logic. Gives confidence to refactor later.

**Estimated effort:** 1–2 sessions

---

### Phase 2 — Services (highest business value)

**Goal:** Test the core business logic with mocked DAL calls.

**Approach:** Mock the DAL functions (e.g., `vi.mock('@/lib/db/tasks')`) so services run without a database. Test the orchestration logic, not the queries.

**Test targets:**

| File | Functions | Key Scenarios | Est. Tests |
|------|-----------|---------------|------------|
| `boardService.ts` | `fetchBoard` | Metrics calculation: today done/total, week projected, days elapsed | ~10 |
| | `runDailySync` | Expire stale tasks, generate today's instances, idempotent re-run | ~6 |
| | `runEndOfPeriodSync` | Expire all non-done, transition plan status | ~4 |
| `planService.ts` | `createPlan` | Transaction flow: plan + templates + tasks + ad-hoc linking | ~8 |
| | `updatePlan` | Template diffing: added/removed/modified, description-only shortcut | ~10 |
| | `generateTasksForTemplates` | DAILY × frequency, WEEKLY × frequency, AD_HOC passthrough | ~6 |

**Key edge cases to cover:**
- `fetchBoard` when no active plan exists (returns `null`)
- `fetchBoard` metrics when all tasks are EXPIRED
- `runDailySync` called twice on the same day (idempotent)
- `runDailySync` across period boundary (triggers end-of-period)
- `createPlan` when an ACTIVE plan already exists (error)
- `updatePlan` with no template changes (description-only, skips transaction)
- `updatePlan` with a mix of added + removed + modified templates

**Estimated effort:** 2–3 sessions

---

### Phase 3 — DAL + Components (expand coverage)

**Goal:** Verify query logic and test complex interactive components.

#### 3a. DAL (mocked Prisma)

Mock `prisma` from `@/lib/prisma` and verify the correct Prisma calls are made with the right arguments.

| File | Focus | Est. Tests |
|------|-------|------------|
| `tasks.ts` | `expireStaleDailyTasks` date filter, `deleteIncompleteTasksByTemplateIds` status filter, `updateTaskStatus` auto-sets `doneAt` | ~12 |
| `plans.ts` | `getActivePlan` returns first ACTIVE, `updatePlanStatus` transitions | ~6 |
| `planTemplates.ts` | `createManyPlanTemplates` with `skipDuplicates` | ~4 |

#### 3b. Components (React Testing Library)

Install `@testing-library/react`, `@testing-library/user-event`, `jsdom`. Test user interactions and state.

| Component | Focus | Est. Tests |
|-----------|-------|------------|
| `PlanForm` | Template selection toggle, frequency change, config cache on re-check, form submission calls action | ~12 |
| `ReviewChangesModal` | Renders added/removed/modified diffs, shows incomplete counts, submit/cancel | ~8 |
| `TaskModal` | Create vs edit mode, validation, points input | ~6 |
| `KanbanBoard` | Column rendering, drag-drop status update | ~4 |

**Estimated effort:** 3–4 sessions

---

## Test File Conventions

```
src/features/kanban/utils/__tests__/dateUtils.test.ts
src/features/kanban/utils/__tests__/taskUtils.test.ts
src/features/kanban/services/__tests__/boardService.test.ts
src/features/kanban/services/__tests__/planService.test.ts
src/features/kanban/components/__tests__/PlanForm.test.tsx
src/features/kanban/__tests__/schemas.test.ts
src/lib/db/__tests__/tasks.test.ts
```

- Co-located `__tests__/` directories next to the code they test
- File naming: `[source].test.ts` or `[source].test.tsx`

---

## Summary

| Phase | Scope | Tests | Effort | Value |
|-------|-------|-------|--------|-------|
| **1** | Utils + Schemas | ~55 | 1–2 sessions | High — covers bug-prone pure logic |
| **2** | Services | ~44 | 2–3 sessions | Highest — core business rules |
| **3** | DAL + Components | ~52 | 3–4 sessions | Medium — query correctness + UI |
| **Total** | | **~151** | **6–9 sessions** | |

Phase 1 alone provides significant safety net for the riskiest code (date math, risk calculation, validation). Each subsequent phase adds coverage to the next most valuable layer.
