# Spike: Spec 分层 — flow、interaction contract 和视觉契约

**Status: awaiting owner review** · 2026-11-02

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（habit / project / step / one-off / backlog、`completeTaskAction`、`HabitSignal`），和代码、mockup、tracker 一一对应。

回答 tracker 的两条：Cross-cutting › Future 的 *Spike: leverage the UI flows table*，以及 Harness engineering › *e2e after isolation* 的第一个 sub-bullet（*Review the flow docs against the product*）的审查那一半。

**第 1 轮之后**（2026-11-02，owner 在对话里）：先把旧 flow 的错漏修好，这是关键；新的 flow，以及改动到的旧 flow，按新标准写 Interactions；没改动的旧 flow 不回填。为此要一套增量迁移的机制：旧的放进一份 allowlist，assert 它只减不增。最近对 workflow 的改进很多，每次都把旧的全修一遍代价太大，这套机制以后的新规则也要用。见 *增量迁移 · Ratchet*。表格因此从页面级改成每个 flow 下的一节（原来的 Q2）。

## 起因 · Trigger

Owner 要转向更严格的 spec driven + TDD：先定 design doc 和 mockup，再写 e2e 定下行为，implementation 只需要把 CI 做绿。按这个顺序走，spec 必须**准确**，而且**能逐条对上测试**。现在有两个问题：

1. **Flow docs 过时。** 下面的审查列出约 40 处和代码对不上的地方，其中几处是事实错误，不只是措辞旧了。
2. **UI 上的行为没有地方写。** 例子：habit 卡片上的 week dots（进度）、matrix 把卡片 move 到 Done 之后那个 5 s、可以 Undo 的 toast。`flows/README.md` 规定 flow 只写事实、不写 UI detail，UI detail 归 Design Console 和 mockup。但 mockup 在实现之后就删了，scenario tab 只能钉住**静态**状态，加一句 `note`。toast 多久消失、hover 时暂停、第二次 Done 会顶掉第一个这类**随时间变化的行为**，没有一份文档写。结果是各个 flow 各写各的：`priorities.md` 把 toast 的结构写进了 Steps，违反了它自己的 README；`board.md` 把 habit dots 的规则放在 Backlog Flow 的 Rules 里，可这条规则其实对 board 上每张卡都成立。

Owner 的判断：flow 的定位是**精确**，讲 **data path**；所有东西都塞进 flow 会很啰嗦。

## 现状：一个 feature 的 spec 现在散在哪里

| 什么样的事实 | 例子 | 现在写在哪 | 由什么测试 |
| --- | --- | --- | --- |
| 数据怎么走、规则 | Complete 时 `planId` 只加不改 | flow doc | integration；e2e 每个 flow 一个 `describe` |
| 每个控件做什么：入口 → action → 是否乐观 → 之后 | 点 Done → `completeTaskAction` → 卡片先消失 → toast | 一部分在 flow 的 Trigger 文字里，一部分在已归档的 PR 4 spike 的 Interactions 表里（`archived/week-model-pr4-projects-ui.md`），没有 living 的位置 | e2e，部分有 |
| 衍生的指示物表达什么 | habit dots：一个 dot 一个 instance，done 就填满，本卡的 dot 带环 | 零散：flow 的 Rules、组件的 JSDoc | 有时有 unit test（`computeHabitWeeks`），有时没有 |
| 随客户端时间变化的行为 | toast 5 s、hover 暂停、第二次顶掉第一次 | `priorities.md` 的 Steps（属于 UI detail） | 无（`e2e/not-implemented.md`） |
| 长什么样（像素） | toast 的位置、倒计时条 | 实现前在 mockup，实现后在 scenario tab | console smoke test + owner |

中间三行没有固定的位置。flow 要么被 UI detail 撑长（priorities），要么干脆不写（board）。

## UI flows table 适合当 visual contract 吗

**结论：它适合当 interaction contract，但当不了 visual contract。** 它覆盖上表第二行，再顺带盖住第四行；第三行和第五行它表达不了。

Tracker 那条的设想是：每个改 server state 的用户动作，按页面各占一行，列出入口 → server action → 是否乐观 → 之后（选中、导航、回滚）。原型是 PR 4 spike 里 Projects 页的 Interactions 表。

**合适的地方**

- **粒度和 e2e 完全一致。** `test/README.md` 规定 e2e 证明「一个 action 落地，页面显示它，assert 一次」，正好是表里的一行。所以一行对应一个 e2e test，design PR 里每个新的行就是一条 `contractTest`。TDD 需要的「spec 可以逐条对上测试」，在这一层天然成立。
- **紧凑。** flow 的 Trigger 里那些按断点写的长句（desktop 点 hover 出来的 →，mobile 点卡片打开 sheet……）可以缩成一格 Entry。flow 反而变短。
- **「之后」一列能装下时间行为。** 例如「toast 5 s，hover 暂停，有 Undo；第二次 Done 顶掉它」。Toast 是 Done 这个动作的后果，写在这一行正合适。

**不合适的地方**

- **衍生指示物不是动作。** Habit dots、project 进度条、tracked 卡片变暗、Today ring 都是**数据的编码方式**：同样的数据永远显示成同样的东西，跟用户点了什么无关。它们需要另一张表。
- **像素没法用表格写。** 写出来就是又一份会过时的 mockup。像素继续归 mockup（实现前）和 scenario tab（实现后）。
- **原设想只收改 server state 的动作。** 但有些纯客户端的动作也带规则，例如 backlog 打开后焦点的去向（已经有 e2e），Archived accordion 默认是否展开。这些也该进表，Writes 一列写 `—`。

## 提案：一个 feature 的 spec 分四层

| 层 | 回答 | 写在哪 | 测试 |
| --- | --- | --- | --- |
| **Flows** | 数据怎么走，规则和不变量 | flow 的 `##` 段（只写数据和导航） | integration；e2e 的 `describe` |
| **Interactions** | 每个用户动作：入口 → 写入 → 是否乐观 → 之后（包括 toast、计时、回滚、选中、导航） | 每个 flow 下的 `### Interactions` | **一行一个 e2e test**；design 阶段是 `contractTest` |
| **Displays** | 每个衍生指示物用什么数据、按什么规则编码 | 所属 flow 下的 `### Displays`（可选） | 编码的边界情况由纯 helper 的 unit test 覆盖；接线由一条 e2e 覆盖（可选） |
| **Visual** | 长什么样 | mockup → scenario tab | console smoke + owner 验收 |

文字 spec 只负责 **意义**（Displays）和 **行为**（Interactions、Flows），这三层都能测；像素留给能画像素的地方。

### 两张表长什么样

拿 owner 举的两个例子写。

**Before**：`priorities.md` › Complete One-off Flow › Steps 1（现在的写法）

> UI closes the chooser, removes the card optimistically, the title-bar counts update, and a 5 s "Marked done" toast with an **Undo** button and a draining countdown bar appears (desktop: bottom-center; mobile: above the dock) — "· +N pts this week" when an active plan absorbed the points. Hovering the toast holds the clock.

**After**：flow 只留数据，

> 1. Complete the task: `status = DONE`, `doneAt = now`; an unassigned task joins the current-week `ACTIVE` plan when there is one.
> 2. Undo restores the snapshot taken before step 1 — `status` back to `BACKLOG` / `TODO`, `doneAt` cleared, the plan link detached only if step 1 added it.

UI 的部分进这个 flow 的 `### Interactions`：

| Action | Entry | Writes | Optimistic | After |
| --- | --- | --- | --- | --- |
| Done | Move-to 的 Done 行（desktop popover / mobile sheet），有没有 plan、是否 tracked 都可以 | `completeTaskAction` | 是：卡片离开，title bar 的计数下降 | Undo toast 显示 5 s，hover 时暂停，有 plan 时带 +N pts；第二次 Done 会顶掉它；写入失败时卡片回来，toast 撤回 |
| Undo | Undo toast，5 s 之内 | `undoCompleteTaskAction`，等 Done 的写入落地之后才发 | 是：卡片回到原位 | toast 关闭 |

Board 的 habit dots 进 Progress Tracking Flow 的 `### Displays`：

| Display | Shows on | Encodes | Rule | Tested |
| --- | --- | --- | --- | --- |
| Habit dots | board 卡片、backlog 卡片（mini 版） | 这一周这个 habit 的每个 instance | 按顺序一个 instance 一个 dot，done 的填满，本卡的 dot 带环；超过 `HABIT_DOTS_MAX` 只显示 `done/target` | unit：`computeHabitWeeks`（`taskUtils.test.ts`）；scenario：Board |

Tracker 设想的列（入口、action、是否乐观、之后）全都保留。表放在它所属的 flow 下面（`### Interactions`、`### Displays`，和 Trigger / Steps / Rules 并列），所以 e2e 知道这条 test 进哪个 `describe`，迁移也能按 flow 一个一个来。Interactions 的 Entry 一列取代了 Trigger 里按断点写的长句，Trigger 只剩一句「谁、在哪个页面、因为什么」。

### 套进 TDD 的顺序

1. **Design PR**：改 flow 的数据步骤；在受影响的 flow 下写新的或改动的 Interactions / Displays 行；像素画进 mockup；每个新的 Interactions 行写一条 `contractTest`，title 是 `<Action>: …`。
2. **Implementation PR**：实现到 contract 通过，`contract:flip` 把它移进 `e2e/features/`，和现在一样是机械动作。Mockup 删掉之后，文字 spec 仍然在：flow 下的两张表，加上 scenario tab。

第 1 轮提的 `planned` 标记不要了：一行的 test 还是 `contractTest`，就说明它还没实现，`check:ratchet` 的 summary 会列出来。代价是 design PR 和 implementation PR 之间，living doc 里会有几行写的是还没做的东西；这段时间通常只有几天，而且 contract 文件就在旁边。

### 随时间变化的行为也能进 e2e

`test/README.md` 写着「Dates stay out of e2e」，原因是 server 在另一个进程里，它的时钟冻结不了。但 toast 的 5 s 是浏览器的计时器。Playwright 1.64（本 repo 的版本）的 `page.clock` 可以在页面加载之前 `install()`，再用 `runFor(5000)` 快进，所以「Undo 窗口过了以后 Undo 消失」这类断言可以写成 e2e，不会变慢，也不会 flaky。这条规则要在 test/README 里讲清楚：server 的日期仍然不进 e2e，客户端的计时器可以进。不急，第一次给 toast 写 e2e 时加上就行。

## 增量迁移 · Ratchet

### 问题

每加一条新规则（page structure、e2e 隔离、design PR……），都面临同一个选择：要么在同一个 PR 里把所有旧代码修一遍，PR 很大、很慢；要么只对新代码执行，但没有任何东西记录哪些旧代码还没迁、也挡不住新代码照着旧代码写。`e2e/not-implemented.md` 是第二种做法的手写版：一份要人手维护的清单，CI 不检查它，它会过时。

### 机制

一个 **ratchet**（棘轮：只能往一个方向转）由三样东西组成：

- **一个 checker**：一个函数，算出当前所有违反这条规则的地方，每个用一个稳定的 key 表示（例如 `board.md#Drag and Drop Flow`）。
- **一份 baseline**：`scripts/ratchet/baseline/<rule>.txt`，一行一个 key，按字母排序，就是还没迁移的旧东西，可以加 `#` 注释。
- **（可选）内容指纹**：一个 key 对应的内容（例如 flow 那一节的正文，空白折叠之后），用来判断这个 PR 有没有动它。

`npm run check:ratchet`（CI）对每条规则做四个比较。V 是当前的违规，B 是这个 PR 的 baseline，B₀ 是 `main` 上的 baseline：

| # | 条件 | 结果 | 保证什么 |
| --- | --- | --- | --- |
| 1 | key 在 V，不在 B | fail：「新的违规，按新标准写」 | 新东西一律按新标准 |
| 2 | key 在 B，不在 V | fail：「已经迁好了，跑 `npm run ratchet:prune`」 | baseline 永远准确 |
| 3 | key 在 B，不在 B₀ | fail：「baseline 只能缩小」 | 旧债不增加（你要的 assertion） |
| 4 | key 在 B，且它的内容相对 `main` 改了 | fail：「改了一个旧的，顺手迁过去」 | 碰到就迁，不碰不迁 |

- **引入规则的 PR** 在 `main` 上还没有 baseline，3 和 4 都不适用：它一次性写入全部旧的 key。
- **`ratchet:prune`** 只删除已经迁好的行，从不添加，所以和 `contract:flip` 一样是机械动作。
- **改名也算碰到**：把一个旧 flow 的标题改掉，旧 key 消失（触发 2），新 key 是新违规（触发 1），所以改名的 PR 也要迁移它。
- **Job summary** 打印每条规则还剩几个，迁移进度不用另记。规则全部迁完之后，删掉它的 baseline 文件，这条规则就成了普通的 check。
- **Lint 规则不重造。** ESLint 9.39（本 repo 的版本）自带 bulk suppressions：`eslint-suppressions.json` 加上 `--suppress-rule`、`--prune-suppressions`，suppression 用不上时 ESLint 自己会报错（对应第 2 条）。Ratchet 只对它补上第 3 条：每条规则的 suppression 数不能比 `main` 多。新的 lint 规则因此可以直接开成 error，旧的违规一次 suppress 掉。
- **什么时候不用 ratchet**：机械的改动（Prettier 排序 Tailwind class、改名）用 codemod 一次改完，不留旧债。Ratchet 只给需要判断的迁移用，比如写 Interactions、改 page structure。

### 第一条规则：`flow-interactions`

- **规则**：`design/flows/` 里的每个 `##` flow 都有 `### Interactions`；其中每一行，在 `e2e/<feature>.spec.ts` 的 `describe('<Flow>')` 里都有一个 title 以 `<Action>:` 开头的 test，或者在 `e2e/contract/<feature>.spec.ts` 里有同样 title 开头的 `contractTest`。
- **没有用户动作的 flow**（MCP 的三个、`shared.md` 的三个 sync）不是旧债，它们的 `### Interactions` 只写一行 `None — <在哪里测>`，在这个 PR 里写好，不进 baseline。
- **key** 是 `<file>#<heading>`，指纹是那一节的正文。
- **Baseline**：大约 25 个有用户动作的旧 flow，在这个 PR 修完错漏之后写入。
- **取代 `e2e/not-implemented.md`**：它的「Not covered yet」就是 baseline，「Not for e2e」就是那些 `None — …` 行。
- **Displays 不进 ratchet。** 只在 design 引入或改动指示物时写；它没有像 Interactions 那样一行对一个 test 的结构，硬加 check 不划算。

### 以后的候选规则

Tracker 上已经有几条适合用 ratchet，而不是一次全修：

- *Rules the page-structure runs were missing* › 一个页面的 input type 是 `<Feature>PageData`：key 是页面，baseline 是还没改的页面（Plan 本来就要等 Phase 2）。
- 新的 ESLint 规则（例如 helper 和 handler 统一函数写法）：直接开成 error，加上 bulk suppression。
- Docs split by reader：key 是还没拆的目录。

规则写进 AGENTS.md › *Adding a rule*，一行：旧代码一时达不到的新标准作为 ratchet 落地，新代码遵守，旧的只减不增，碰到就迁；做法在 `scripts/ratchet/README.md`。

## Flow 过时清单（审查结果）

2026-11-02 对着 `main`（`e49a14d`）审查。分四类：**错**（和代码矛盾）、**名**（标识或文件改名、删除了）、**漏**（代码做了对数据或导航有实质影响的事，flow 没写）、**UI**（写在 flow 里的 UI detail，按本提案应该搬进表格）。

### `board.md`

- **错** Drag and Drop › Rules、Backlog › Desktop 3：说「Todo is the only drop target」「BACKLOG → TODO → DONE only」。实际上 desktop 的 backlog 卡片可以**直接拖到 Done**：`handleDragEnd` 只拒绝拖回 backlog，Done 列没有 `isDropDisabled`（`BoardPage.tsx:49-60`）。见 Q7a。
- **错** Rules：「done points append-only」只由 UI 保证。Done 卡片不能拖（`isDragDisabled`），但 server 接受把 DONE 改成 TODO，并清空 `doneAt`（`schemas.ts:88-92`、`lib/db/tasks.ts:263-277`）。见 Q7b。
- **错** Progress Tracking › Steps：说「Two parallel queries」，实际是四个（plan templates、tasks、metrics、project paths，`boardService.ts:63-73`）。
- **错** Progress Tracking › Trigger：说「Computed server-side」。Daily Avg、today %、week % 是在 client 上算的（`ProgressDashboard.tsx:25-37`）。
- **错** Backlog › Desktop 2：排序说成「daily then weekly, by `instanceIndex`/`createdAt`」。实际是 daily 在前，其余（weekly、step、one-off）按 template 或 project 分组，组按最早的 `createdAt` 排，组内按 `instanceIndex` 排（`taskUtils.ts:185-225`）。
- **名** Week Points › `dailyFuturePoints`：说「`template.points × frequency`」，实际是 `sizeToPoints(size) × frequency`；EXTREME 下剩余天数至少按 1 算（`boardService.ts:87-101`）。
- **名** Progress › 1：说「`BACKLOG/TODO/DONE`」，查询其实是 `status != EXPIRED`，DOING 由 `toBoardCards` 过滤掉。
- **名** Risk › General：「Planned: Future in `design/baseline.md`」这一节已经不存在；对应的是 tracker 的 *Ad-hoc task deletion and auto-clear logic*。
- **漏** Landing：没有 plan 时还有 `getEmptyBoardState`。有 `PENDING_UPDATE` plan 时显示上一周的回顾（完成率、done 数、points）和「Create New Plan」，否则显示「Create Your First Plan」（`kanban/page.tsx:11-17`）。
- **漏** mobile 的 Todo ↔ Done 拖动：两列变成横排，仍然可以拖。flow 只写了 mobile 的 backlog。
- **漏** 写入失败：静默回滚，只有 `console.error`，flow 没写「没有提示」（tracker 的 Error presentation 已经记了）。
- **UI** habit dots 的规则放在 Backlog Flow 的 Rules 里，应该是 Displays 的一行；Backlog 的 strip / pill / sheet 的形态放在 Trigger 里，应该搬进 Interactions。

### `shared.md`

- **错** Daily Sync › 1：说先写 `lastSyncDate`「to prevent concurrent re-runs」。这个写入和后面的步骤在同一个 transaction 里，而且发生在 `ensureSynced` 读完 `lastSyncDate` 之后，挡不住并发。真正防重复的是 `uq_task_daily` 上的 `createMany({skipDuplicates})`（`syncService.ts:71-77`）。
- **名 / 漏** Ensure Synced › Trigger 的调用者清单：plan 页面的 loader 叫 `fetchNewPlanForm` / `fetchEditPlanForm`，root layout 经由 `getAppShellAction` 调用。清单还漏了 `completeMatrixTask`、`getPlanCreationContext` 和 MCP 的 `updatePlan` / one-off patch / project patch。建议改成写规则（「every read or write that depends on the active plan」），不再列清单，免得再次过时。

### `priorities.md`

- **错** Track This Week › 2：说「the send button hides」。实际上 tracked 卡片保留 send 按钮（Done 仍然可以选），只是 size chip 换成了 This Week tag（`MatrixTaskCard.tsx:20-28`）。
- **漏** Reprioritize：拖回同一个象限什么也不做；象限内的顺序不保存，卡片落在它 `createdAt` 的位置，而不是放下的位置（`tasks.ts:489`）。见 Q7d。
- **漏** Landing：象限内按 `createdAt asc, id asc` 排序。MCP flow 依赖这个「matrix order」，Landing 却没写。
- **漏** Track › 4：除了 `/kanban`，还 revalidate `/kanban/priorities`。
- **UI** Complete One-off › 1 的 toast 结构、Track 的 Rules 里 hint bar 的文案和断点、Add 的 Trigger 里按断点写的控件、mobile 的「Added to {quadrant}」toast（2.5 s）：都应该搬进 Interactions / Displays。
- 链接：Sibling docs 漏了 `dump.md`。

### `plan.md`

- **错** Create Plan › Trigger：说「clicks 'Create Plan' on empty board」。按钮的文案是 Create Your First Plan / Create New Plan；另外还有三个入口：没有 plan 时 sidebar 和 dock 的 Plan 指向 `/plans/new`、Projects 的 Create plan 横幅、Priorities 的 no-plan hint。
- **错** Create Plan › 4：说「Defaults to NORMAL」。回头用户的表单从 pending plan 的 mode 开始（`plans/new/page.tsx:23`），只有第一个 plan 和 MCP 默认 NORMAL。
- **错** Create / Update Template › 2：说每个 size 显示 points 和 hours。按钮只显示字母和 points，hours 只针对选中的那个 size 显示一次（`SizePicker.tsx:53`）。
- **错** Create Plan › 2.1：说「adds, removes … templates」。template 在哪里都删不掉，「remove」只是从 plan 里取消选择。
- **名** Template 的按钮叫「Create Template」/「Save Changes」，不是「Create」/「Save」。
- **漏** Update Plan › 5：没有任何改动时直接保存，跳过 review（`PlanForm.tsx:299-334`）。
- **漏** Update Plan › Rules：改 mode 不会重新生成任务，只影响以后的 daily 任务。
- **漏** Plan 的 Description 字段在 create 和 update 时都会保存，flow 没提。
- **漏（可能是 bug）** 表单的 `updatePlan` 没有检查 plan 是否 `ACTIVE`、是否属于本周（`planService.ts:632`；MCP 的 `update_plan` 有这个检查）。表单在周切换之后仍然开着的话，可以改到一个 `PENDING_UPDATE` 的 plan。见 Q7c。

### `projects.md`

- **错** Schedule Step › 4：说「A step already on the board leaves the week only through Edit Plan's deselect」。实际还有三条路：archive 它的 project（`projectService.ts:139`）、删除这个 step、`update_plan` 的 `removeProjectStepIds`。
- **漏** Edit Project › Rules：说「Only the user archives … from this modal or from the All steps done state」。MCP 的 `update_project` 在用户同意之后也可以 archive。
- **漏** Archive 会清掉 `?project=`，由第一个 active project 接手；Unarchive 会选中恢复的 project，mobile 上直接进入它的 detail（`e2e/projects.spec.ts:90` 依赖这个行为）。
- **漏** Landing › 2：列表按最新的在前；mobile 的列表行没有进度条，也没有「N this week」。
- **漏** 两个状态没有 flow：No plan this week（警告横幅加 Create plan，所有 + This week 禁用；flow 只写了「scheduling is unavailable」），以及所有 project 都 archived 之后 detail 区的空状态。
- **altitude** 开头的 Status 块（「PR 3 … PR 5」）是工作记录，不属于 living doc，应该删掉。
- 链接：Sibling docs 漏了 `dump.md`。

### `dump.md`

- **错** Landing › 1：说「Await `syncService.ensureSynced` like every kanban page」。这个页面明确跳过它（`kanban/dump/page.tsx:10`：「plan-independent — no ensureSynced」）。
- **错** Landing › 3：说 composer「auto-focused on desktop」。代码里没有任何 autoFocus。
- **错** Quick Capture › Trigger：说「mobile: the round send button」。两个断点用的是同一个写着 Dump 的按钮，只有 ⌘↵ 的提示是 desktop 独有的；composer 在两个断点上都固定在 title bar 下面。
- **名** 说 state 存在 `dumpStore`（Zustand）里，但没有这个 store：feed 是 `useDumpFeed` 的本地 state，经由 `DumpPageContext` 传下去。`ENTRY_MAX_LENGTH` 现在叫 `DUMP_ENTRY_MAX_LENGTH`。
- **漏** title bar 的总条数是另一个读取（`countDumpEntriesAction`），capture 时会乐观地加一，失败时回滚。
- **漏** cursor 无效时，分页会静默停止。
- 文档之间的矛盾：`baseline.md:62` 仍然说 DumpEntry 是「designed — V1 pending」。

### `auth.md`

基本准确。

- **漏** Sign-Out 会先关掉 sheet，再 `router.push('/auth/login')`。
- **漏** Login › 6 的「homepage」：`/` 会 redirect 到 `/kanban`。
- 链接：Sibling docs 漏了 `projects.md` 和 `dump.md`。

### 顺带发现，不属于 flow 的

- Priorities 的「Move-to sheet (mobile)」scenario tab 的 note 还写着「the two board columns」，实际只剩 Todo 一列（`src/app/design/scenarios/priorities/page.tsx`）。

## 实施计划

都放在这个 PR 里（AGENTS.md › *One task, one branch, one PR*），决定之后按顺序做：

1. **修 flow**：按上面的清单修掉所有的「错」「名」「漏」；Q7 判定为有意的行为写进 flow，判定为 bug 的开 tracker item（能写成 `it.fails` 的写上）。标成「UI」的那些文字先不搬，等那个 flow 被碰到、迁移时再搬。`projects.md` 的 Status 块删掉。
2. **规则**：`flows/README.md` 加上 `### Interactions`（新的和改动的 flow 必须有）和 `### Displays`（可选），列的定义和 Before / After 的例子（用 toast 那个）。`test/README.md`：e2e 的 title 用 `<Action>: …`。`ui-design` skill 的 Design PR 第 4 步改成「每个新的 Interactions 行一条 contract」。
3. **Ratchet**：`scripts/ratchet/`（核心的四个比较，加上 `flow-interactions` 和 ESLint suppression 数两条规则）及其 unit test；`check:ratchet` 进 CI，`ratchet:prune` 进 Commands；`scripts/ratchet/README.md` 写怎么加一条规则。
4. **Baseline**：MCP 和 sync 的 flow 写上 `None — …`，其余旧 flow 写进 `baseline/flow-interactions.txt`；删掉 `e2e/not-implemented.md`，改掉指向它的链接（`test/README.md`、tracker）。
5. **AGENTS.md**：*Adding a rule* 加 ratchet 那一行；Commands 加两条命令。
6. **Tracker**：删掉 *Spike: leverage the UI flows table*；*e2e after isolation* 的 Review 一条改成「补 e2e 时迁移那个 flow：baseline 是还没迁的」。

不做：回填旧 flow 的表格，`planned` 标记，Displays 的 check，现在就加 `page.clock` 的规则。

## Open questions

第 1 轮已定：分层（原 Q1）采用；旧 flow 的错漏全部修，旧的不回填（原 Q8）；用 ratchet 把每一行和 test 绑定，取代 `e2e/not-implemented.md`（原 Q4）。

1. **表放在每个 flow 下面**（`### Interactions` / `### Displays`），而不是页面级的两张表，可以吗（推荐；ratchet 才能按 flow 一个一个迁）？
2. **第 4 条「碰到就迁」是 fail 还是 warn？** fail 最严格，但修一个错字也要迁整个 flow；warn 只在 summary 里提醒。推荐 fail，改一个 flow 的正文本来就该顺手补上它的 Interactions；只改空白不算改动。
3. **Interactions 的范围**（原 Q3）：只收改 server state 的动作，还是所有带规则的用户动作，纯客户端的也算（推荐后者）？
4. **示范迁移**：在这个 PR 里迁一个 flow 作为 README 的例子吗？推荐 Complete One-off：它是 toast 的例子，而且现在没有 e2e，要写一条，顺带用上 `page.clock`。
5. **`planned` 标记去掉**（原 Q5），用「test 还是 contract」表示没实现，可以吗？
6. **ESLint suppression 的 ratchet** 现在就做，还是等第一条需要 suppress 的 lint 规则出现再做？推荐等，现在 repo 里没有 suppression。
7. **疑似 bug**，每条判定是有意为之还是 bug：
   - a. Desktop 的 backlog 卡片可以直接拖到 Done，跳过 Todo。
   - b. Server 接受 DONE → TODO（并清空 `doneAt`），forward-only 只靠 UI 保证。
   - c. 表单的 Update Plan 不检查 plan 是否 `ACTIVE`、是否属于本周。
   - d. 在 matrix 里拖动，卡片落在 `createdAt` 的位置，不在放下的位置（象限内的顺序不保存）。
