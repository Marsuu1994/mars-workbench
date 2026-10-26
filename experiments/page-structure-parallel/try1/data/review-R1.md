评审完成。本地验证：`format:check`、`lint`、`typecheck`、`knip` 全部通过，单元测试 30 个文件 256 个用例全绿（集成测试需要 Postgres、e2e 未跑）。

## 评分

1. **Correctness — 5**。三页的 handler 一一对应：`togglePopover` 的 setState updater 与旧的 `onSendToggle(isPopoverOpen ? null : task.id)` 等价，`isTracked` / `hasActivePlan` 由 `MoveToRows` 从 context 重算，`BoardHeader` 移到 `DragDropContext` 外不改 DOM（它不渲染节点），`flex flex-col h-full` 包裹原样保留。四项静态检查加单元测试全绿。

2. **Spec conformance — 4**。改名（`BoardPage` / `PrioritiesPage` / `DumpPage`）、三个 context 的字段、各组件 prop 数（`QuadrantCell` 9→2、`MatrixTaskCard` 9→2、`MoveToRows` 5→2、`DumpComposer` 2→0 等）、两个 adapter 及其单测、console 的 inert context 与 adapter 复用、baseline / tracker / AGENTS.md 的措辞，都和 spike 的逐页计划一致。缺的是 spike「共享的文件」里点名的 README Update Log，以及 spike 自身的归档。

3. **Consistency — 5**。三页同一套写法：`<Feature>Page.tsx` + `<Feature>PageContext.ts`（interface、`createContext(null)`、`use<Feature>PageContext` 在 provider 外 throw），route 函数统一命名 `Kanban<Feature>Page`，adapter 都在 `src/utils/` 并有 `*.test.ts`，scenario 都通过同一个 adapter 喂 fixture，gallery specimen 都包 `inert*PageContext`，与 `ProjectsPageContext` 的形状完全对齐。

4. **Conventions — 4**。分层、命名（全词、`tasksByQuadrant`、`trackTask`）、render 函数、`Record<Enum, T>`、常量抽取都合规；`FALLBACK_QUADRANT` 随 `groupTasksByQuadrant` 迁到 utils 并更新了唯一引用。扣分点是 Version Control › Before every push 的第 2、3 步没做（README 一行未改）。

5. **Scope — 4**。没有无关改动，附带的 `useDumpFeed` 注释、`TaskModalPanel` import、tracker 里「去掉 `'use client'`」那半句都是 spike 点名的连带变化。遗漏：README Update Log / Current State、spike 未 `git mv` 到 `archived/`。

6. **Readability — 5**。每个 container 的 docstring 写清了页面、state 归属和 context 走向；`renderMatrix` / `renderBoard` 把 return 保持为大纲；scenario 用 `renderPrioritiesPage` 收口；从 route → adapter → container → context → leaf 可以顺着读下来。

## 缺陷清单

- **major** · `README.md:32-40`、`README.md:106` — 没有今天的 Update Log 条目，Current State › Design System 仍写着 scenario「rendering the same screen components as the live pages」，screen 层已删，这句现在是错的；AGENTS.md 规定每次 push 前必须改这两处。
- **minor** · `design/spike/component-structure.md` — Board / Priorities / Dump 落地、Plan 已决议推迟，spike 的实现在本 PR 结束，但没按 `design/spike/README.md` 第 5 步移到 `archived/` 并修正 tracker 第 33 行的链接。
- **nit** · `src/app/design/constants.ts:431` — `MATRIX_CARD_ACTIVE_PLAN_ID = 'plan-1'` 与 `baseTask` 第 151 行的 `planId: 'plan-1'` 是两处必须保持一致的同一字面量，注释也承认它「是 baseTask 的 planId」，应由一个常量派生。
- **nit** · `src/utils/dump.ts:87-89` — `DumpFeedResult` 手写复刻了 `fetchDumpEntriesAction` 的返回形状（且 `error` 放宽成 `unknown`），可用 `Awaited<ReturnType<typeof fetchDumpEntriesAction>>` 的 type import 保持单一定义。

```json
{"label": "R1", "scores": {"correctness": 5, "spec": 4, "consistency": 5, "conventions": 4, "scope": 4, "readability": 5}, "defects": [{"severity": "major", "where": "README.md:32-40, README.md:106", "what": "No Update Log entry for today and Current State still says scenarios render 'the same screen components as the live pages', which the screen layer's removal makes false; AGENTS.md requires both before every push."}, {"severity": "minor", "where": "design/spike/component-structure.md", "what": "The spike's implementation finishes in this change (Plan deferred by decision) but it was not git mv'd to design/spike/archived/ nor its tracker link fixed, as the spike README's lifecycle step 5 requires."}, {"severity": "nit", "where": "src/app/design/constants.ts:431", "what": "MATRIX_CARD_ACTIVE_PLAN_ID = 'plan-1' duplicates baseTask's planId literal at line 151 instead of deriving from one constant."}, {"severity": "nit", "where": "src/utils/dump.ts:87-89", "what": "DumpFeedResult re-declares fetchDumpEntriesAction's return shape (with error loosened to unknown) instead of deriving it from the action's type."}]}
```
