# Spike: Spec 分层 — flow、interaction contract 和视觉契约

**Status: decided** · 2026-11-02（定于 2026-11-04；Q8 留到 backlog stacking 的 PR 再定）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（habit / project / step / one-off / backlog、`completeTaskAction`、`HabitSignal`），和代码、mockup、tracker 一一对应。

回答 tracker 的两条：Cross-cutting › Future 的 *Spike: leverage the UI flows table*，以及 Harness engineering › *e2e after isolation* 的第一个 sub-bullet（*Review the flow docs against the product*）的审查那一半。

**第 1 轮之后**（2026-11-02，owner 在对话里）：先把旧 flow 的错漏修好，这是关键；新的 flow，以及改动到的旧 flow，按新标准写 Interactions；没改动的旧 flow 不回填。为此要一套增量迁移的机制：旧的放进一份 allowlist，assert 它只减不增。最近对 workflow 的改进很多，每次都把旧的全修一遍代价太大，这套机制以后的新规则也要用。见 *增量迁移 · Ratchet*。表格因此从页面级改成每个 flow 下的一节（原来的 Q2）。

**第 2 轮之后**（2026-11-03，owner 在对话里）：修 flow 时发现真正的 bug 都在 Rules 一层（见 *Rules 是能执行的 contract*），Rules 也要进 ratchet。Owner 提出把 flow 做成真正的 source of truth：**每个 flow 一个文件**（`flows/<feature>/<flow>.md`），文件里四节，每节对应一种保证。Displays 取消，拆进 Rules 和 Visual。旧 flow 的内容不一次改完，之后开专门的 session 迁；第一个按新格式写的 flow 是 backlog stacking。*提案* 和 *实施计划* 已经按这一轮重写。

**第 3 轮**（2026-11-04）：`plan.md` 解冻，和 `mcp.md` 一起逐条修完；又找到四个只在 UI 或 MCP 上成立的规则（漏洞表的后两行，加上 Q7c 和 matrix 的 reprioritize），都在 server 修掉了；action 一律经过 service。Q2、Q3 按推荐定下，Q8 留到下一个 PR。

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

## 提案：每个 flow 一个文件，四节

```text
design/flows/
├── README.md                # 格式、四节的定义、Before / After 的例子
├── board/
│   ├── README.md            # feature 的定位、实体和生命周期、对整页成立的规则、flow 清单
│   ├── landing.md
│   └── backlog.md
├── projects/ …
├── sync/                    # 原来的 shared.md
└── mcp/                     # 原来的 mcp.md
```

- **一个 flow 一个文件**：ratchet 的 key 就是文件路径，内容指纹就是整个文件；一个文件对应一个 e2e `describe`；agent 只读它要改的 flow；review 的 diff 更小。
- **feature 的 `README.md`** 放属于整个 feature、不属于某个 flow 的事实：projects 的 Step Lifecycle、「modal 等刷新的数据落地才关」、board 的「Todo · Done 两列」。

一个 flow 文件的四节：

| 节 | 回答 | 写什么 | 保证 |
| --- | --- | --- | --- |
| **Visual** | 长什么样 | 开发前引用 mockup 的文件，开发后引用 scenario tab；一张 **States** 表：页面的每个状态（空状态、没有 plan、全部 archived……）什么时候出现，对应哪个 scenario tab | 引用必须存在（`flow-visual`）；像素由 console smoke + owner 验收 |
| **Steps** | 数据怎么走、导航怎么走 | 第一句是「谁、在哪、为什么」（取代原来的 Trigger）；之后是客观的步骤，尽量不写 UI | 由 Rules 和 Interactions 的 test 覆盖 |
| **Rules** | 什么必须一直成立 | 只放规则，每条注明测它的 test：数据规则用 integration test，衍生规则（例如 habit dots）用纯 helper 的 unit test | 引用的 test 必须存在（`flow-rules`） |
| **Interactions** | 每个用户动作 | 一行一个：Entry → server action → 是否乐观 → 之后（能观察到的结果：toast、计时、回滚、选中、导航、别的页面怎么变） | 一行一个 e2e test，design 阶段是 `contractTest`（`flow-interactions`） |

- **Displays 取消**：它装着两样东西。编码规则（habit dots：一个 instance 一个 dot，done 就填满，本卡的 dot 带环）是一条衍生规则，有 unit test，进 Rules；显示在哪、长什么样，进 Visual。
- **现在 Rules 里混着的空状态和边界情况**进 Visual 的 States 表；导航和 UI 行为进 Interactions。Rules 只剩能配上 test 的规则。
- **数据决定的顺序是 Rule**（列表、卡片、step 怎么排），配上 test；区块怎么排布是 Visual（Q4）。
- **描述性的东西**（查询个数、函数名、调用者清单）不写进 flow：代码和 `reference.md` 里有。

### 例子：Complete One-off

**Before**：`priorities.md` › Complete One-off Flow › Steps 1（现在的写法）

> UI closes the chooser, removes the card optimistically, the title-bar counts update, and a 5 s "Marked done" toast with an **Undo** button and a draining countdown bar appears (desktop: bottom-center; mobile: above the dock) — "· +N pts this week" when an active plan absorbed the points. Hovering the toast holds the clock.

**After**：`flows/priorities/complete-one-off.md`

> **Steps**
> 1. The user marks a one-off done from its card on the matrix. Complete the task: `status = DONE`, `doneAt = now`; an unassigned task joins the current-week `ACTIVE` plan when there is one.
> 2. Undo restores the snapshot taken before step 1 — `status` back to `BACKLOG` / `TODO`, `doneAt` cleared, the plan link detached only if step 1 added it.
>
> **Rules**
> - `planId` is only ever added, never re-attributed — `matrixService.int.test.ts` › …
> - Undo only detaches a plan link, never attaches one — …

| Action | Entry | Writes | Optimistic | After |
| --- | --- | --- | --- | --- |
| Done | Move-to 的 Done 行（desktop popover / mobile sheet），有没有 plan、是否 tracked 都可以 | `completeTaskAction` | 是：卡片离开，title bar 的计数下降 | Undo toast 显示 5 s，hover 时暂停，有 plan 时带 +N pts；第二次 Done 会顶掉它；写入失败时卡片回来，toast 撤回 |
| Undo | Undo toast，5 s 之内 | `undoCompleteTaskAction`，等 Done 的写入落地之后才发 | 是：卡片回到原位 | toast 关闭 |

### 套进 TDD 的顺序

1. **Design PR**：写新的 flow 文件，或改受影响的那几个：Visual 引用 mockup，Steps 和 Rules 写好，每个新的 Interactions 行写一条 `contractTest`，title 是 `<Action>: …`；会失败的 Rule test 写成 `it.fails`。
2. **Implementation PR**：实现到 contract 通过、`it.fails` 翻成 `it`；`contract:flip` 把 contract 移进 `e2e/features/`；Visual 的引用从 mockup 改成 scenario tab，mockup 删掉。

第 1 轮提的 `planned` 标记不要了：一行的 test 还是 `contractTest`，就说明它还没实现，`check:ratchet` 的 summary 会列出来。

### 随时间变化的行为也能进 e2e

`test/README.md` 写着「Dates stay out of e2e」，原因是 server 在另一个进程里，它的时钟冻结不了。但 toast 的 5 s 是浏览器的计时器。Playwright 1.64（本 repo 的版本）的 `page.clock` 可以在页面加载之前 `install()`，再用 `runFor(5000)` 快进，所以「Undo 窗口过了以后 Undo 消失」这类断言可以写成 e2e，不会变慢，也不会 flaky。这条规则要在 test/README 里讲清楚：server 的日期仍然不进 e2e，客户端的计时器可以进。不急，第一次给 toast 写 e2e 时加上就行。

## Rules 是能执行的 contract

**第 2 轮审查发现**（2026-11-03，修 board / priorities / projects 时）：真正的 bug 全在 Rules 这一层，而且是同一个模式。规则只在 UI 上成立（按钮不显示、卡片拖不动、detail 打不开），server 什么都接受；同一条规则在 MCP 那条路径上往往是严格的。

| 规则 | UI | 页面的 action | MCP |
| --- | --- | --- | --- |
| Done 不能往回（Q7b） | Done 卡片拖不动 | 接受 DONE → TODO | — |
| matrix 上的 one-off 只能经 Track 上 board | 走不到 | `updateTaskStatus` 不看 `planId` | — |
| archived 的 project 不能改（H1） | detail 打不开 | 五个写入都不检查 | `update_project` 检查 |
| Take back 只对本周的 step（H2） | 只在本周的 step 上显示 × | 也接受上周 plan 上的 | — |
| 表单的 Update Plan 只改本周的 ACTIVE plan（Q7c） | 表单通常是新打开的 | 不检查 | `update_plan` 检查 |
| 只有上周没完成的 one-off 和 step 能 carry（第 3 轮，`plan.md`） | 表单只列出它们 | 什么 id 都接受 | `create_plan` 检查 |
| template line 只能是 habit，频率 1–10（第 3 轮） | DAILY / WEEKLY，stepper 1–10 | 任意 `TaskType`，频率不限 | schema 检查 |

原因是每个 PR 只实现、只测眼前那条路径的正常情况，没人问「server 接受什么」；有了第二个 client（MCP，还是一个会编 id 的 LLM），一条规则就有了一严一松两份实现。

**提案**：flow 里的内容分三种，当 contract 的程度不同。

| 内容 | 当 contract | 保证 |
| --- | --- | --- |
| **数据规则**（forward-only、done 锁住、archived 不能改、一个 step 只在一个 plan 上） | 必须能执行：规则写在**每条写入路径都经过的地方**（DAL 的 WHERE，或 service），不只写在 UI，也不只写在 page 和 MCP 的其中一边 | 每条规则一个 integration test（衍生数据的规则，例如 habit dots，用纯 helper 的 unit test） |
| **Interactions / Steps** | 每一行一个 e2e test | `flow-interactions` ratchet |
| **描述性的东西**（查询个数、函数名、调用者清单、实现顺序） | 不当 contract，**不写进 flow** | 代码、`reference.md` |

- **AGENTS.md › Layers 加一条**：一条数据规则写在每条写入路径都经过的地方，它的 test 是 integration test。修 Q7b 时 `updateTaskStatus` 就是这样做的：规则在 DAL 的 WHERE 里，以后的调用者自动继承。
- **Rules 也进 ratchet**（owner 定）：第二条规则 `flow-rules`，每条 rule 写明测它的 test，checker 核对那个 test 存在。旧的 Rules 不一次改完：引入规则时全部写进 baseline，之后开专门的 session 去迁，碰到就迁。
- **现在的 Rules 混着三种东西**，迁移时要拆开：真正的数据规则（留下，配 test）；空状态和边界情况的呈现（例如「没有 project 时显示空状态」，是页面的 state，归 visual contract）；导航和 UI 行为（归 Interactions）。

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

### Flow 的四条规则

四条规则的 key 都是 flow 文件的路径，指纹是整个文件。

| 规则 | checker 核对 |
| --- | --- |
| `flow-format` | 文件有 Visual、Steps、Rules、Interactions 四节 |
| `flow-visual` | 引用的 mockup 文件或 scenario tab 存在 |
| `flow-rules` | 每条 rule 引用的 test 存在 |
| `flow-interactions` | 每一行 interaction 在 `e2e/<feature>.spec.ts` 的 `describe('<Flow>')` 里有一个 title 以 `<Action>:` 开头的 test，或者在 `e2e/contract/` 里有同样开头的 `contractTest` |

- **迁移分两步**，按上面「机械的改动一次改完」的原则：
  1. **拆文件是机械的**：每个 `##` 切成一个文件，加上每个 feature 的 README，内容原样搬。一次做完。
  2. **整理成四节要判断**：交给 ratchet。旧文件全部进四条规则的 baseline，之后开专门的 session 迁，碰到就迁。
- **没有用户动作的 flow**（MCP、sync）的 Interactions 只写一行 `None — <在哪里测>`。
- **取代 `e2e/not-implemented.md`**：它的「Not covered yet」就是 `flow-interactions` 的 baseline，「Not for e2e」就是那些 `None — …` 行。

### 以后的候选规则

Tracker 上已经有几条适合用 ratchet，而不是一次全修：

- *Rules the page-structure runs were missing* › 一个页面的 input type 是 `<Feature>PageData`：key 是页面，baseline 是还没改的页面（Plan 本来就要等 Phase 2）。
- 新的 ESLint 规则（例如 helper 和 handler 统一函数写法）：直接开成 error，加上 bulk suppression。
- Docs split by reader：key 是还没拆的目录。

规则写进 AGENTS.md › *Adding a rule*，一行：旧代码一时达不到的新标准作为 ratchet 落地，新代码遵守，旧的只减不增，碰到就迁；做法在 `scripts/ratchet/README.md`。

## Flow 过时清单（审查结果）

2026-11-02 对着 `main`（`e49a14d`）审查。分四类：**错**（和代码矛盾）、**名**（标识或文件改名、删除了）、**漏**（代码做了对数据或导航有实质影响的事，flow 没写）、**UI**（写在 flow 里的 UI detail，按本提案应该搬进表格）。

### `board.md`

- ~~**错** Drag and Drop › Rules、Backlog › Desktop 3：说「Todo is the only drop target」「BACKLOG → TODO → DONE only」。实际上 desktop 的 backlog 卡片可以**直接拖到 Done**：`handleDragEnd` 只拒绝拖回 backlog，Done 列没有 `isDropDisabled`（`BoardPage.tsx:49-60`）。见 Q7a。~~ 已修：有意为之（Q7a），两处都改成 backlog 可以直接拖到 Done
- ~~**错** Rules：「done points append-only」只由 UI 保证。Done 卡片不能拖（`isDragDisabled`），但 server 接受把 DONE 改成 TODO，并清空 `doneAt`（`schemas.ts:88-92`、`lib/db/tasks.ts:263-277`）。见 Q7b。~~ 已修：bug，server 现在只接受往前的移动（`updateTaskStatus`）
- ~~**错** Progress Tracking › Steps：说「Two parallel queries」，实际是四个（plan templates、tasks、metrics、project paths，`boardService.ts:63-73`）。~~ 已修
- ~~**错** Progress Tracking › Trigger：说「Computed server-side」。Daily Avg、today %、week % 是在 client 上算的（`ProgressDashboard.tsx:25-37`）。~~ 已修
- ~~**错** Backlog › Desktop 2：排序说成「daily then weekly, by `instanceIndex`/`createdAt`」。实际是 daily 在前，其余（weekly、step、one-off）按 template 或 project 分组，组按最早的 `createdAt` 排，组内按 `instanceIndex` 排（`taskUtils.ts:185-225`）。~~ 已修（照代码写；做 backlog stacking 时再看）
- ~~**名** Week Points › `dailyFuturePoints`：说「`template.points × frequency`」，实际是 `sizeToPoints(size) × frequency`；EXTREME 下剩余天数至少按 1 算（`boardService.ts:87-101`）。~~ 已修
- ~~**名** Progress › 1：说「`BACKLOG/TODO/DONE`」，查询其实是 `status != EXPIRED`，DOING 由 `toBoardCards` 过滤掉。~~ 已修（随 Progress Tracking 重写）
- ~~**名** Risk › General：「Planned: Future in `design/baseline.md`」这一节已经不存在；对应的是 tracker 的 *Ad-hoc task deletion and auto-clear logic*。~~ 已修
- ~~**漏** Landing：没有 plan 时还有 `getEmptyBoardState`。有 `PENDING_UPDATE` plan 时显示上一周的回顾（完成率、done 数、points）和「Create New Plan」，否则显示「Create Your First Plan」（`kanban/page.tsx:11-17`）。~~ 已修
- ~~**漏** mobile 的 Todo ↔ Done 拖动：两列变成横排，仍然可以拖。flow 只写了 mobile 的 backlog。~~ 不改：Drag and Drop 本来不限 desktop；横排是布局，归 Design Console
- ~~**漏** 写入失败：静默回滚，只有 `console.error`，flow 没写「没有提示」（tracker 的 Error presentation 已经记了）。~~ 不改：随 tracker 的 Error presentation › Board 一起改
- **UI** habit dots 的规则放在 Backlog Flow 的 Rules 里，它其实是对每张卡都成立的衍生规则（unit test：`computeHabitWeeks`），应该进 board 的 README 或 Progress 的 Rules；Backlog 的 strip / pill / sheet 的形态放在 Trigger 里，应该搬进 Interactions。

### `shared.md`

- ~~**错** Daily Sync › 1：说先写 `lastSyncDate`「to prevent concurrent re-runs」。这个写入和后面的步骤在同一个 transaction 里，而且发生在 `ensureSynced` 读完 `lastSyncDate` 之后，挡不住并发。真正防重复的是 `uq_task_daily` 上的 `createMany({skipDuplicates})`（`syncService.ts:71-77`）。~~ 已修
- ~~**名 / 漏** Ensure Synced › Trigger 的调用者清单：plan 页面的 loader 叫 `fetchNewPlanForm` / `fetchEditPlanForm`，root layout 经由 `getAppShellAction` 调用。清单还漏了 `completeMatrixTask`、`getPlanCreationContext` 和 MCP 的 `updatePlan` / one-off patch / project patch。建议改成写规则（「every read or write that depends on the active plan」），不再列清单，免得再次过时。~~ 已修

### `priorities.md`

- ~~**错** Track This Week › 2：说「the send button hides」。实际上 tracked 卡片保留 send 按钮（Done 仍然可以选），只是 size chip 换成了 This Week tag（`MatrixTaskCard.tsx:20-28`）。~~ 已修
- ~~**漏** Reprioritize：拖回同一个象限什么也不做；象限内的顺序不保存，卡片落在它 `createdAt` 的位置，而不是放下的位置（`tasks.ts:489`）。见 Q7d。~~ 已修：有意为之
- ~~**漏** Landing：象限内按 `createdAt asc, id asc` 排序。MCP flow 依赖这个「matrix order」，Landing 却没写。~~ 已修
- ~~**漏** Track › 4：除了 `/kanban`，还 revalidate `/kanban/priorities`。~~ 已修
- **UI** Complete One-off › 1 的 toast 结构、Track 的 Rules 里 hint bar 的文案和断点、Add 的 Trigger 里按断点写的控件、mobile 的「Added to {quadrant}」toast（2.5 s）：都应该搬进 Interactions / Visual。
- ~~链接：Sibling docs 漏了 `dump.md`。~~ 已修：所有 flow doc 都删掉了 Sibling docs

### `plan.md`

> **先冻结，后来又解冻**（owner，2026-11-03）：一开始打算冻结到 Phase 2，但 `mcp.md` 的 Plan with Claude 要拿它当 reference，所以还是逐条修。

- ~~**错** Create Plan › Trigger：说「clicks 'Create Plan' on empty board」。按钮的文案是 Create Your First Plan / Create New Plan；另外还有三个入口：没有 plan 时 sidebar 和 dock 的 Plan 指向 `/plans/new`、Projects 的 Create plan 横幅、Priorities 的 no-plan hint。~~ 已修
- ~~**错** Create Plan › 4：说「Defaults to NORMAL」。回头用户的表单从 pending plan 的 mode 开始（`plans/new/page.tsx:23`），只有第一个 plan 和 MCP 默认 NORMAL。~~ 已修
- ~~**错** Create / Update Template › 2：说每个 size 显示 points 和 hours。按钮只显示字母和 points，hours 只针对选中的那个 size 显示一次（`SizePicker.tsx:53`）。~~ 已修
- ~~**错** Create Plan › 2.1：说「adds, removes … templates」。template 在哪里都删不掉，「remove」只是从 plan 里取消选择。~~ 已修
- ~~**名** Template 的按钮叫「Create Template」/「Save Changes」，不是「Create」/「Save」。~~ 已修
- ~~**不一致** template 的 description 在 schema 里必填，表单没标；编辑时清空拿到 zod 的默认报错。~~ 已修（owner 选 A）：表单标成必填，`updateTemplateSchema` 补上 message。
- ~~**UI bug** template 卡片的铅笔是 `opacity-0 group-hover:opacity-100`：触屏上永远透明，键盘 focus 也不显示。~~ 已修：mobile 一直显示，desktop hover 或 focus-visible 时显示。
- ~~**漏** Create Plan：step 也会预选；表单只能 carry over，没有把 untracked one-off 或 upcoming step 放上来的入口；一个 transaction；description 和 Start Week。~~ 已修
- ~~**server 漏洞** Create Plan：表单提交的 carry-over id 没有检查（`updateTasksPlanId` 的 WHERE 只有 userId 和 id），加载表单之后在 matrix 上完成的上周 one-off 会被挂到新 plan，points 跑到本周。~~ 已修：`carryOverOneOffs` 和 `linkProjectStepsToPlan` 的 WHERE 只放行 pending plan 上没完成的、或者 upcoming 的；配了 integration test。
- ~~**server 漏洞** 表单的 template line schema 接受任意 `TaskType` 和不限的 frequency。~~ 已修：和 MCP 共用 `planLineFields`。
- ~~**i18n** createPlan / updatePlan 的错误是写死的英文。~~ 已修：service 返回错误码，action 翻译。
- **H3** 一个用户只有一个 ACTIVE plan 没有保证（检查在 transaction 外面）。开了 tracker item（Plan › Medium），不在这个 PR 修。
- ~~**漏** Update Plan › 5：没有任何改动时直接保存，跳过 review（`PlanForm.tsx:299-334`）。~~ 已修
- ~~**漏** Update Plan › Rules：改 mode 不会重新生成任务，只影响以后的 daily 任务。~~ 已修
- ~~**漏** Plan 的 Description 字段在 create 和 update 时都会保存，flow 没提。~~ 已修
- ~~**漏（可能是 bug）** 表单的 `updatePlan` 没有检查 plan 是否 `ACTIVE`、是否属于本周（`planService.ts:632`；MCP 的 `update_plan` 有这个检查）。表单在周切换之后仍然开着的话，可以改到一个 `PENDING_UPDATE` 的 plan。见 Q7c。~~ 已修：编辑页只开本周的 ACTIVE plan，其他 redirect 到 board；表单的 `updatePlan` 和共用的 `updatePlanInTx` 都拒绝不是本周 ACTIVE 的 plan；配了 integration test。
- ~~**bug** Update Plan：description 清不掉（`trim() || undefined`）。~~ 已修
- ~~**死代码** edit 的 `addedAdhoc` 和 review 的 "Added to board"：edit 时 one-off 只能取消。~~ 已删
- ~~**漏** Update Plan：Steps 没写 project step；Rules 的「只有取消勾选的才离开」对 template 不成立（已知 bug，tracker › Plan）。~~ 已修

### `mcp.md`（新）

- 2026-11-03 新建：三个 MCP flow 从 `plan.md`、`projects.md`、`priorities.md` 原样搬过来，让 `plan.md` 冻结时它们照常维护。搬的时候没有审查，审查结果写在这里。
- 顺序改成 Draft Projects → Manage One-offs → Plan with Claude，Draft Steps 改名为 Draft Projects（owner，2026-11-04）。
- **S2，已定**（owner，2026-11-04）：MCP flow 的 Rules 只放 server 强制的规则；模型的行为（先问、先提案、用户同意才写、archive 是用户的决定、步数和 milestone）以 guide（`src/mcp/prompts/serverInstructions.ts`）为准，Steps 里一句话指过去，不再抄。flow 里抄的那份已经和 guide 有出入（「about 10 steps」对「10 or fewer」）。
- ~~**错** Draft Projects：「The tools never create one-offs」，写于 one-off tool 之前。~~ 已修
- ~~**漏** Draft Projects：删 step 后面的往前补位、本周的离开 board；archive 把没完成的 step 拿出一周；patch 先 unarchive、最后 archive；`create_project` 的 step 全是 upcoming，0–50 个。~~ 已修
- ~~**漏** Manage One-offs：完成上周 plan 上的 one-off 保留那个 link；没有 plan 时不挂；同一个 id 同时在两个列表里也算重复；reprioritize 和 matrix 的规则一样。~~ 已修
- ~~**漏** Plan with Claude：`lastPlan` 只在新 plan 建好之前存在（recap 只发生在建新一周时）；`EMPTY_PLAN`；step 不能既 carry 又 add；mode 默认 NORMAL；`description` 传空字符串会清空；H3 指向 tracker。~~ 已修
- 拆文件时要挪的：Plan with Claude 的 Identity 和 Errors 两条适用于所有 MCP tool，挪进 `mcp/README.md`。
- ~~**server 漏洞** `updateAdhocTaskQuadrants` 的 WHERE 不看 status：matrix 页面的 action 直接调它，完成了的 one-off 也能改 quadrant（MCP 有 service 检查）。~~ 已修：WHERE 加 `status: {not: DONE}`，配了 integration test。

### `projects.md`

- ~~**错** Schedule Step › 4：说「A step already on the board leaves the week only through Edit Plan's deselect」。实际还有三条路：archive 它的 project（`projectService.ts:139`）、删除这个 step、`update_plan` 的 `removeProjectStepIds`。~~ 已修
- ~~**漏** Edit Project › Rules：说「Only the user archives … from this modal or from the All steps done state」。MCP 的 `update_project` 在用户同意之后也可以 archive。~~ 已修
- ~~**漏** Archive 会清掉 `?project=`，由第一个 active project 接手；Unarchive 会选中恢复的 project，mobile 上直接进入它的 detail（`e2e/projects.spec.ts:90` 依赖这个行为）。~~ 已修
- ~~**漏** Landing › 2：列表按最新的在前；mobile 的列表行没有进度条，也没有「N this week」。~~ 已修
- ~~**漏** 两个状态没有 flow：No plan this week（警告横幅加 Create plan，所有 + This week 禁用；flow 只写了「scheduling is unavailable」），以及所有 project 都 archived 之后 detail 区的空状态。~~ 已修
- ~~**altitude** 开头的 Status 块（「PR 3 … PR 5」）是工作记录，不属于 living doc，应该删掉。~~ 已修
- ~~链接：Sibling docs 漏了 `dump.md`。~~ 已修：所有 flow doc 都删掉了 Sibling docs
- 第 2 轮新发现，已修：Create Project 的「size is the sum of its steps」（没有任何地方算）；archived 的 project 只在 UI 上不能改（H1，规则下沉到 DAL，MCP 的 patch 改成先 unarchive、最后 archive）；Take back 也接受上周的 step（H2，只认本周的 active plan）；archive 退回的是任何 plan 上的 step；done 的 step 也不能当作移动的位置。

### `dump.md`

- ~~**错** Landing › 1：说「Await `syncService.ensureSynced` like every kanban page」。这个页面明确跳过它（`kanban/dump/page.tsx:10`：「plan-independent — no ensureSynced」）。~~ 已修
- ~~**错** Landing › 3：说 composer「auto-focused on desktop」。代码里没有任何 autoFocus。~~ 已修
- ~~**错** Quick Capture › Trigger：说「mobile: the round send button」。两个断点用的是同一个写着 Dump 的按钮，只有 ⌘↵ 的提示是 desktop 独有的；composer 在两个断点上都固定在 title bar 下面。~~ 已修
- ~~**名** 说 state 存在 `dumpStore`（Zustand）里，但没有这个 store：feed 是 `useDumpFeed` 的本地 state，经由 `DumpPageContext` 传下去。`ENTRY_MAX_LENGTH` 现在叫 `DUMP_ENTRY_MAX_LENGTH`。~~ 已修
- ~~**漏** title bar 的总条数是另一个读取（`countDumpEntriesAction`），capture 时会乐观地加一，失败时回滚。~~ 已修
- ~~**漏** cursor 无效时，分页会静默停止。~~ 已修
- ~~文档之间的矛盾：`baseline.md:62` 仍然说 DumpEntry 是「designed — V1 pending」。~~ 已修
- 第 2 轮新发现，已修：Status 块（工作记录）；一次只能 capture 一条（上一条落地之前，Dump 按钮是禁用的）；capture 失败时总条数也会回滚；server 用同样的规则校验长度；header 的周来自今天的日期，不来自 plan。

### `auth.md`

基本准确。

- ~~**漏** Sign-Out 会先关掉 sheet，再 `router.push('/auth/login')`。~~ 已修
- ~~**漏** Login › 6 的「homepage」：`/` 会 redirect 到 `/kanban`。~~ 已修
- ~~链接：Sibling docs 漏了 `projects.md` 和 `dump.md`。~~ 已修：所有 flow doc 都删掉了 Sibling docs
- 第 2 轮新发现，已修：`/auth/*` 整段免检，原来没写；dev identity 只在本地开发生效，preview 和没有 `VERCEL_ENV` 的 production build 都要 token；theme 的写入不等待，失败了下次加载会回到存着的那个；cookie 值不是合法 theme 时也用默认；Sign-Up 之后落在空 board 上；整份文档改成 README 的格式（`###` 节、`---` 分隔）。
- `auth.md` 改成 Auth & Settings（owner，2026-11-03）：Settings 现在只有 theme 和 sign-out 两个动作，和 auth 放在一起，拆文件时同在 `auth/` 下。
- 拆文件时要挪的：`/api/mcp` 的 Token rules 是一个独立的 flow（`auth/mcp-token.md`），现在挂在 Consent 的 Rules 后面。

### 顺带发现，不属于 flow 的

- ~~Priorities 的「Move-to sheet (mobile)」scenario tab 的 note 还写着「the two board columns」，实际只剩 Todo 一列（`src/app/design/scenarios/priorities/page.tsx`）。~~ 已修

## 实施计划

**这个 PR**（spike 和 flow 的修复，已做）：

1. **修 flow**：每个 flow doc 按上面的清单修掉「错」「名」「漏」，`plan.md` 解冻后也修了，MCP 的 flow 搬进 `mcp.md`。Q7 判定为有意的写进 flow；判定为 bug 的在 server 端修掉，配上 integration test：Q7b、board move 要求 `planId`、H1、H2、Q7c、表单的 carry-over、template line 的 schema、完成了的 one-off 的 reprioritize。H3 开了 tracker item。标成「UI」的那些文字不搬，等拆成四节时再搬。
2. **AGENTS.md › Layers** 加一条：一条数据规则写在每条写入路径都经过的地方——行自己的状态放 DAL 的 `WHERE`，跨行的规则放 service，并发能打破的不变量用数据库约束；它的 test 是 integration test。暂定，由 tracker 的 *DAL / service / action* spike 定稿。
3. **action 一律经过 service**：原来直接调 DAL 的 board move、matrix 的 add 和 reprioritize、template、review 的 incomplete counts、dump，都挪进了 service（dump 新建 `dumpService`）。

**backlog stacking 的 PR**（第一次按新格式做）：

1. **拆文件**：`design/flows/` 按 `<feature>/<flow>.md` 机械地拆开，加上每个 feature 的 README；改掉指向旧文件的链接（e2e spec 的注释、`test/README.md`、`baseline.md`、tracker）。
2. **格式**：`flows/README.md` 写四节的定义和 Complete One-off 的 Before / After；`test/README.md`：e2e 的 title 用 `<Action>: …`；`ui-design` skill 的 Design PR 改成「写 flow 文件，每个新的 Interactions 行一条 contract」。
3. **第一个四节的 flow**：`board/backlog.md`，连同 stacking 的 design 和 implementation。
4. **Ratchet**：`scripts/ratchet/`（四个比较，加上四条 flow 规则）及其 unit test；`check:ratchet` 进 CI，`ratchet:prune` 进 Commands；`scripts/ratchet/README.md` 写怎么加一条规则；其余旧 flow 进 baseline；删掉 `e2e/not-implemented.md`。
5. **AGENTS.md**：*Adding a rule* 加 ratchet 那一行；Commands 加两条命令。
6. **Tracker**：删掉 *Spike: leverage the UI flows table*；*e2e after isolation* 的 Review 一条改成「迁移那个 flow：baseline 是还没迁的」；加一条「把旧 flow 迁成四节，一个 session 迁一个 feature」。

不做：一次性把旧 flow 改成四节，`planned` 标记，现在就加 `page.clock` 的规则，ESLint suppression 的 ratchet。

## Open questions

第 1 轮已定：分层（原 Q1）采用；旧 flow 的错漏全部修，旧的不回填（原 Q8）；用 ratchet 把每一行和 test 绑定，取代 `e2e/not-implemented.md`（原 Q4）。

第 2 轮已定：每个 flow 一个文件、四节，每个 feature 一个 README（原 Q1）；Displays 取消，拆进 Rules 和 Visual；Rules 进 ratchet；拆文件放进 backlog stacking 的 PR，那个 flow 就是示范（原 Q4）；`planned` 标记去掉（原 Q5）；ESLint suppression 的 ratchet 等第一条需要 suppress 的 lint 规则出现再做（原 Q6）。

2. **第 4 条「碰到就迁」是 fail 还是 warn？** fail 最严格，但修一个错字也要迁整个 flow；warn 只在 summary 里提醒。→ **fail**（owner，2026-11-04）：改一个 flow 的正文就顺手补上它的四节；只改空白不算改动。
3. **Interactions 的范围**（原 Q3）：只收改 server state 的动作，还是所有带规则的用户动作，纯客户端的也算？→ **所有带规则的用户动作，纯客户端的也算**（owner，2026-11-04），例如 toast 的 5 s 和 Undo；审查里标成「UI」的条目都属于这一类。
4. **要不要第五节 Notes**，放一些放不进四节的信息，例如一个 landing 里各种元素怎么排序？→ 不要（owner），排序是 Rule。
   - **数据决定的顺序是 Rule**：backlog 的分组排序（`sortTasks`，unit test）、matrix 的 `createdAt` 顺序和 projects 列表的「最新的在前」（DAL 的 `orderBy`，integration test）。MCP 的「matrix order」和 Reprioritize 都依赖它，这次审查里它也是常见的错漏：backlog 的写错了，matrix 和 projects 的没写。
   - **区块怎么排布是 Visual**：warning banner 在 header 上面这一类是 layout，由 scenario 钉住。
   - **Notes 会成为新的杂物间**：放不进四节的东西都会掉进去，没有 check 管它，又会过时。放不进四节的信息通常属于别处：「为什么」放 spike 和 `baseline.md` 的 Architecture Decision，实现放代码和 `reference.md`，跨 flow 的背景放 feature 的 README。
7. **疑似 bug**，每条判定是有意为之还是 bug：
   - a. Desktop 的 backlog 卡片可以直接拖到 Done，跳过 Todo。 → 有意为之（owner，2026-11-04），server 的 `BOARD_MOVE_SOURCES` 本来就放行
   - b. Server 接受 DONE → TODO（并清空 `doneAt`），forward-only 只靠 UI 保证。 → bug，已修
   - c. 表单的 Update Plan 不检查 plan 是否 `ACTIVE`、是否属于本周。 → bug，在这个 PR 里修（`plan.md` 解冻以后，owner 2026-11-04）
   - d. 在 matrix 里拖动，卡片落在 `createdAt` 的位置，不在放下的位置（象限内的顺序不保存）。 → 有意为之
8. **MCP flow 的 Interactions 怎么写？**（第 3 轮提出，留到 backlog stacking 的 PR 再定）现在写的是「没有用户动作的 flow 只写一行 `None — <在哪里测>`」。另一种写法：一个 tool 一行，每行对应一条 route 或 service 的 integration test，ratchet 一样检查。推荐后者：`mcp.md` 是 owner 最常用的。
