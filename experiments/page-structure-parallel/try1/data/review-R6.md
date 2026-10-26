审查完成。以下是对 R6 的评分和缺陷清单。

**验证结果**：`format:check`、`lint`、`typecheck`、`knip` 全部通过，`test:unit` 30 个文件 258 个测试通过。e2e 和 Board 的 `ui-verifier` 浏览器检查本次未运行（无数据库 / Docker）。

**1. Correctness — 5**
三页的 DOM 结构与改前一致（`DragDropContext` 不产生 DOM，click-away 层、toast、sheet、modal 仍是同一个 `flex-col` 的子节点）；`togglePopover(taskId)` 的 `current === taskId ? null : taskId` 与旧的 `onSendToggle(isPopoverOpen ? null : task.id)` 等价；`groupTasksByQuadrant` / `isTrackedTask` 与原 `useMemo` 分组和两处 `isTracked` 逐字对应，且有单元测试覆盖 null quadrant 和 no-plan 分支。

**2. Spec conformance — 4**
每页计划项都落地：`BoardPage` / `PrioritiesPage` / `DumpPage` 改名并吸收 screen 层，三个 `*PageContext.ts` 字段与 spike 完全一致，props 缩减数字（9→2、9→2、4→1、5→2、6→2、5→1、2→0、4→3）全部命中，`toPrioritiesPageProps` / `toDumpPageProps` 放在指定文件并带测试，console 用同一 adapter 转 fixture，`inert*PageContext` 入 `constants.ts`，baseline / tracker / AGENTS.md / design README 都按计划改。缺 README Update Log 当日条目和 Current State 修订（见缺陷）。

**3. Consistency — 5**
三个 context 文件与 `ProjectsPageContext.ts` 同一模板（`createContext<… | null>`、`use()`、同样的 throw 文案）；三个 route 都是 `Kanban<Feature>Page` + `<Page {...adapter()} />`，与 Projects route 一致；两个有 adapter 的页面各自的 scenario 和 fixtures 都走 adapter，两个 adapter 都有 `*.test.ts`。

**4. Conventions — 4**
层级边界守住（utils / types 只 `import type` service 类型，lint 通过）；`FALLBACK_QUADRANT` 搬到 `utils/oneOffUtils.ts` 让 `TaskModalPanel` 不再跨 feature 引 constants；i18n 文案未动。扣分点：`DumpFeedResult` 手写镜像 action 的返回类型，与 `useDumpFeed` 的 `DumpFeedInit` 又是一份相同形状（DRY）；Version Control 的 README 两条前置要求未执行。

**5. Scope — 4**
diff 里没有无关改动，Plan、Auth、Settings 按 Q5/Q6 未碰；遗漏的是 README Update Log 和 Current State。

**6. Readability — 5**
每页从 route 一行就能看到 adapter 和 container；容器的 return 是 outline（`renderMatrix()`、`renderTaskModal()`、`renderBoard()`）；三个 context 的字段都有一行注释说明用途；旧名注释（`KanbanBoard` → `BoardPage`）全部跟进。

**缺陷清单**

- **major** · `README.md:104`–`110` · 没有本次实现的 2026-10-26 Update Log 条目（现有条目只记录了 spike 和 Projects 定稿）；AGENTS.md › Version Control 要求每次 push 前补当日条目。
- **major** · `README.md:39` · Current State 仍写 scenario 页 "rendering the same screen components as the live pages"，screen 层已删，这句现在是错的。
- **minor** · `src/types/dump.ts:4`–`10` · `DumpFeedPage` / `DumpFeedResult` 手写镜像 `fetchDumpEntriesAction` 的推断返回类型，且与 `src/hooks/useDumpFeed.ts:35` 的 `DumpFeedInit` 形状重复；一处定义（如从 action 推导）更符合 DRY。
- **minor** · 整体 · spike「执行和验证」第 3、4 条（真实页面逐个点 handler、Board 布局搬动后的一次 `ui-verifier`）在 diff 和文档里都没有记录，无法从本提交确认是否做过。
- **nit** · `src/components/domain/priorities/PrioritiesPage.tsx:177` · `togglePopover` 是 context 对象里的内联闭包，而同一对象的其他 handler 都是命名函数（Projects 页全部命名）。
- **nit** · `src/app/design/scenarios/priorities/fixtures.ts:139` · 重写的这一行保留了 `t => t.id`，`t` 按 AGENTS.md 是 next-intl 专用名（console 不在 lint 范围内，但该行被改动）。

```json
{"label": "R6", "scores": {"correctness": 5, "spec": 4, "consistency": 5, "conventions": 4, "scope": 4, "readability": 5}, "defects": [{"severity": "major", "where": "README.md:104-110", "what": "No 2026-10-26 Update Log entry for this implementation, which AGENTS.md › Version Control requires before every push."}, {"severity": "major", "where": "README.md:39", "what": "Current State still says scenario pages render 'the same screen components as the live pages'; the screen layer no longer exists."}, {"severity": "minor", "where": "src/types/dump.ts:4-10", "what": "DumpFeedPage/DumpFeedResult hand-mirror fetchDumpEntriesAction's inferred return type and duplicate useDumpFeed's DumpFeedInit shape (DRY)."}, {"severity": "minor", "where": "overall", "what": "The spike's verification steps 3-4 (handler click-through on the live pages, ui-verifier for the Board layout move) are recorded nowhere in the commit."}, {"severity": "nit", "where": "src/components/domain/priorities/PrioritiesPage.tsx:177", "what": "togglePopover is an inline closure in the context object while every other handler there and in ProjectsPage is a named function."}, {"severity": "nit", "where": "src/app/design/scenarios/priorities/fixtures.ts:139", "what": "Rewritten line keeps the single-letter `t` callback parameter, which AGENTS.md reserves for next-intl."}]}
```
