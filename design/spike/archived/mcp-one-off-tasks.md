# Spike: MCP 支持 one-off — 读取、批量创建、标记完成

**Status: decided** · 2026-10-22（提出和拍板同一天，见 PR #79）· 回答 tracker 条目 *One-offs over MCP*（Priorities › Medium）· 上游：`design/flows/priorities.md`（Add Priority Task / Reprioritize / Complete One-off）、`design/flows/plan.md`（Plan with Claude (MCP) Flow）、`week-model-pr5-mcp-projects.md`（工具的结构、guide 工具、「先读 guide」那句）

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（one-off / habit / project / step、`AD_HOC`、`quadrant`、`get_planning_context` …），和代码、tracker 一一对应。**LLM 读的文字**（guide、tool descriptions、`.describe()`、错误信息）直接给英文成稿，就是要写进代码的原文。

## Decision · 拍板（2026-10-22）

Owner：六个问题都按推荐来。

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · 读取放在哪 | **A**，并进 `get_planning_context` | 顶层加 `oneOffTasks`；Rule 2 不变 |
| Q2 · one-off 还是 adhoc | **A**，对 LLM 统一叫 one-off | 新工具、新字段叫 one-off；`carryOverAdhocTaskIds` / `removeAdhocTaskIds` / plan 的 `adhocTasks` / `removedAdhocTasks` 一起改名；代码内部不动 |
| Q3 · reopen | **A**，只能完成 | Guide 的 Rule 9 |
| Q4 · 改 quadrant | **B**，status 加 quadrant | `update_one_off_tasks` 带 `reprioritizeTasks` |
| Q5 · 完成时挂不挂 plan | **A**，和 matrix 一样 | `completeAdhocTasks` 是 matrix 和 MCP 共用的那一条写入 |
| Q6 · done 的 one-off | **B**，plan 上的列表带上 done 的 | 新 DAL `getAdhocTasksByPlanId`；guide 的回顾一步提到 one-off |

下文已经按结论写好；「待拍板」一节保留当时的选项。

## 一页看完 · Summary

| | 内容 |
| --- | --- |
| 新做 | 2 个写工具：`create_one_off_tasks`（一次 1–20 个，落在 priority matrix，不进任何一周）、`update_one_off_tasks`（批量标记完成、换 quadrant） |
| 更新 | `get_planning_context` 加顶层 `oneOffTasks`：matrix 上全部没做完的 one-off，带 quadrant 和 state（Q1）；plan 上的 one-off 列表带上 done 的（Q6）；guide 里 one-off 的部分重写；LLM 看到的 `adhoc` 字段统一改叫 one-off（Q2） |
| 复用 | 完成走 matrix 的 Complete One-off 规则：`completeAdhocTask` 改成批量版，matrix 和 MCP 都用它（Q5）；新建走 Add Priority Task 的建法：拼 `AD_HOC` 行的逻辑从 action 挪进 DAL，两边共用 |
| 不做 | 把 one-off 放进一周（track / add to plan）、删除、改 title 或 size、reopen（Q3），见「不在范围内」 |
| 大小 | 一个 PR（S–M）；spike、拍板和实现都在这个 PR 里 |

## Trigger · 起因

Owner 想让 Claude 也能管 one-off：看 matrix 上有什么，一次记下好几件事，说「X 和 Y 做完了」时直接标掉。现在的 MCP 做不到：

- **看不到**：`get_planning_context` 只列挂在 plan 上、没做完的 one-off（`activePlan.adhocTasks` / `lastPlan.adhocTasks`）。matrix 上没 track 的（`planId = null`），Claude 看不到。
- **建不了、改不了**：guide 写的是 "These tools never create them; they only carry over or drop the ones attached to a plan."

Owner 定的范围：read、create（支持批量）、update status。add to plan 这一类暂时不做。

## 出发点 · What's already there

| 来自 | 已有 | 这次怎么用 |
| --- | --- | --- |
| `lib/db/tasks.ts` | `getNonDoneAdhocTasks`（全部没做完的 one-off，按 `createdAt`）、`createTask`、`updateTaskQuadrant`、`completeAdhocTask`（单个；没 track 的挂到 active plan） | 读取直接用；`completeAdhocTask` 改成批量的 `completeAdhocTasks`；新增批量建和批量换 quadrant |
| `matrixService` | `completeMatrixTask`：先 `ensureSynced` 拿 active plan，再 complete | MCP 走同一条规则 |
| `taskActions.createAdhocTaskAction` | 在 action 里拼 `AD_HOC` 行（`BACKLOG`、`planId = null`、`points`、`instanceIndex = 1`） | 挪进 DAL 的 `createMatrixTasks`，matrix 表单和 MCP 共用 |
| `planningService` | `getPlanContextByPlanId`（plan 上没做完的 one-off）、`PlanningError`、`PATCH_REJECTED` 的整体拒绝 | context 加字段；校验照这个风格 |
| `utils/projectUtils.getStepState` | step 的 `DONE` / `THIS_WEEK` / `LAST_WEEK` / `UPCOMING` | one-off 的 state 用同一套「在哪一周」的判断 |
| MCP 层 | `runTool`、`READ_GUIDE_FIRST`、`get_planning_guide_before_everything`、`tools/list` 快照测试 | 照这个结构加两个工具；`runTool` 不改（新错误都是 `PlanningError`） |

读代码时确认的几件事：

1. **去掉 add to plan 之后，「update status」实际上只剩 → `DONE`。** App 里 one-off 的 status 只有这几种走法：matrix 上的 `BACKLOG`（`planId = null`）经 Track This Week 变成 `TODO`（挂上 active plan）；`BACKLOG` 或 `TODO` 直接变 `DONE`；plan 不再带它时 `TODO → BACKLOG`（回 matrix）。`BACKLOG → TODO` 就是 add to plan；`TODO → BACKLOG` MCP 已经有了（`update_plan` 的 `removeAdhocTaskIds`）。
2. **完成不可逆。** Matrix 只有 5 秒的 Undo；board 上的 Done 卡片锁定，没有 un-complete。
3. **完成一个没 track 的 one-off，会把它挂到 active plan 上**（这周算分，出现在 board 的 Done 列）。这是 matrix 现在的规则（`priorities.md` › Complete One-off Flow）。它改了 `planId`，但不是「排进这周」：任务直接 `DONE`，不进 to-do。见 Q5。
4. **`LAST_WEEK` 的 one-off**（没做完，还挂在 PENDING_UPDATE 的上周 plan 上）在 matrix 上是普通卡片。完成它时 `planId` 不变，分数算在上周：现有规则是 `planId` 只加不改。MCP 照旧。
5. **App 里没有编辑 one-off 的 title / size，也没有删除**（删除在 tracker：*Ad-hoc task deletion and auto-clear logic*）。

---

## 改动一览 · Tools

| 工具 | 变化 | 一句话 |
| --- | --- | --- |
| `get_planning_context` | 改 | 加顶层 `oneOffTasks`；plan 上的 one-off 列表带上 done 的（Q6），改名（Q2） |
| `create_one_off_tasks` | 新 | 1–20 个 one-off，一条 INSERT；落在 matrix，不进任何一周 |
| `update_one_off_tasks` | 新 | `completeTaskIds`（标记完成）+ `reprioritizeTasks`（换 quadrant，Q4）；一个 transaction，有问题整个拒绝 |
| `create_plan` / `update_plan` | 只改名（Q2） | `carryOverAdhocTaskIds` → `carryOverOneOffTaskIds`、`removeAdhocTaskIds` → `removeOneOffTaskIds`，结果里的 `removedAdhocTasks` → `removedOneOffTasks`；行为不变 |

两个新工具的 description 和其他工具一样，以 `READ_GUIDE_FIRST` 开头。

### `get_planning_context`（改）

例子（周四，这周 plan 上有两件 one-off，做完一件）：

```jsonc
{
  "today": "2026-10-22", "weekday": "Thursday", "...": "...",
  "activePlan": {
    "planId": "…", "periodKey": "2026-W43", "...": "...",
    // 改名（Q2）+ 带上 done 的（Q6）：这周 plan 上的 one-off，status 是 board 上的状态
    "oneOffTasks": [
      {"taskId": "t1", "title": "File tax extension", "size": "SMALL", "points": 2, "status": "DONE"},
      {"taskId": "t2", "title": "Book dentist", "size": "EXTRA_SMALL", "points": 1, "status": "TODO"}
    ]
  },
  "lastPlan": null,
  "templates": ["…"], "projects": ["…"], "archivedProjects": ["…"],
  // 新：matrix 上全部没做完的 one-off，按 matrix 的顺序（quadrant，再按创建时间）
  "oneOffTasks": [
    {"taskId": "t2", "title": "Book dentist", "description": null, "size": "EXTRA_SMALL", "points": 1,
     "quadrant": "DO_FIRST", "state": "THIS_WEEK", "createdOn": "2026-10-15"},
    {"taskId": "t3", "title": "Renew passport", "description": "Expires in March", "size": "SMALL", "points": 2,
     "quadrant": "SCHEDULE", "state": "UNTRACKED", "createdOn": "2026-09-28"}
  ]
}
```

- **`state`**：`UNTRACKED`（不在任何一周，`planId = null`）、`THIS_WEEK`（在 activePlan 上）、`LAST_WEEK`（没做完，还挂在 lastPlan 上，等下一个 plan 带上或退回）。写工具的结果里还会出现 `DONE`。判断和 step 的 `getStepState` 是同一套，抽成一个共用的「在哪一周」函数；只有 `planId = null` 那一档名字不同：step 叫 `UPCOMING`（path 上接下来的几步），one-off 没有顺序，叫 `UNTRACKED`，对应 matrix 上的 Track This Week。
- **不给 board 的 `status`**：没做完的 one-off，state 已经决定了 status（`UNTRACKED` 是 `BACKLOG`，另外两档是 `TODO`）。
- **`createdOn`**：让 Claude 能说「这件事放了三周了」。
- **顶层不列 done 的**（matrix 也不显示）。这周和上周做完的在 plan 的列表里（Q6）。
- **和 plan 上的列表有重叠**（这周的 one-off 两边都有），和 `projects` / `projectSteps` 一样：顶层看 matrix，plan 上看这周的 board。
- **实现**：顶层用 `getNonDoneAdhocTasks`（现在已经在 `getPlanContextByPlanId` 里查）；plan 的列表改用新的 `getAdhocTasksByPlanId`（任何 status）。

### `create_one_off_tasks`（新）

**Input**（`oneOffTasksSpecSchema`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tasks` | `[{title, description?, size, quadrant}]`，1–20 个 | 按给的顺序建 |

每一项就是 matrix 表单用的 `createAdhocTaskSchema`，加上给 LLM 的 `.describe()`（和 `newPlanLineSchema` 扩展 `createTemplateSchema` 一个做法），schema 只有一份。`quadrant` 必填（默认做法 1）。

**Output**：`{oneOffTasks: OneOffTaskSummary[]}`，按给的顺序，每个都带 `taskId`，`state` 都是 `UNTRACKED`。

**做什么**：一条 `createManyAndReturn`（单条 INSERT，本身就是原子的），每行和 matrix 的 Add 建出来的一样：`AD_HOC`、`BACKLOG`、`planId = null`、`points = sizeToPoints(size)`、`instanceIndex = 1`。拼行的逻辑挪进 DAL 的 `createMatrixTasks(userId, specs)`，`createAdhocTaskAction` 改成调它（建一个的情况）。不用 `ensureSynced`：新建不碰任何 plan。

**校验**：只有 zod（数量、title 非空、enum）。不查重名（UI 也允许同名）；「先看 `oneOffTasks` 里有没有」写在 guide 里。

**Annotations**：`readOnlyHint: false`、`destructiveHint: false`、`idempotentHint: false`、`openWorldHint: false`。

### `update_one_off_tasks`（新）

**Input**（`oneOffTasksPatchSchema`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `completeTaskIds` | uuid[]，默认 `[]`，最多 20 | 标记完成 |
| `reprioritizeTasks` | `[{taskId, quadrant}]`，默认 `[]`，最多 20 | 换 quadrant（Q4） |

至少一个列表非空（refine，和 `planPatchSchema` 一样）。

**Output**：

```jsonc
{
  // 每个被改到的 one-off 现在的样子
  "completedTasks": [
    {"taskId": "t3", "title": "Renew passport", "description": "Expires in March", "size": "SMALL", "points": 2,
     "quadrant": "SCHEDULE", "state": "DONE", "createdOn": "2026-09-28"}
  ],
  "reprioritizedTasks": [
    {"taskId": "t4", "title": "Clean the garage", "description": null, "size": "MEDIUM", "points": 3,
     "quadrant": "MAYBE_LATER", "state": "UNTRACKED", "createdOn": "2026-10-01"}
  ]
}
```

**做什么**（一个 transaction）：

1. `ensureSynced` 拿 active plan（和 `completeMatrixTask` 一样，过了期的 ACTIVE plan 先翻成 PENDING_UPDATE）。
2. 读本人全部没做完的 one-off（`getNonDoneAdhocTasks`），在内存里校验。
3. 写入：
   - **完成**：`completeAdhocTasks(userId, taskIds, activePlanId, tx)`，即批量版的 `completeAdhocTask`。先把其中 `planId = null` 的挂到 active plan 并标 `DONE`，再把其余的只标 `DONE`，`doneAt` 用同一个时间；WHERE 里保留 `status != DONE`。`completeAdhocTask` 改成调它，所以 matrix 的 Done 和 MCP 走同一条写入。
   - **换 quadrant**：按目标 quadrant 分组，最多 4 条 `updateMany`。
   - 都用 `updateManyAndReturn`，返回的行直接映射成 summary。

**校验**（任何一条不过都整个拒绝、什么都不写，用 `PATCH_REJECTED` 包装，和 `update_plan` 一致）：

- 每个 `taskId` 都是本人没做完的 one-off，否则 `ONE_OFF_TASKS_NOT_FOUND`。done 的、别人的、不是 one-off 的、编出来的 id，都报这一条。
- 同一个 id 在两个列表里加起来只能出现一次，否则 `ONE_OFF_TASKS_LISTED_TWICE`。
- `THIS_WEEK` / `LAST_WEEK` 的 one-off 也能完成、能换 quadrant，matrix 上也可以。

**Annotations**：`readOnlyHint: false`、`destructiveHint: true`（完成不能撤回）、`idempotentHint: false`、`openWorldHint: false`。

---

## Prompt · LLM 要读的文字

### Guide（`src/mcp/prompts/serverInstructions.ts`）

只列改动的部分。没列的段落不变。

**开头一句**（改）：

```text
Mars Workbench is the user's weekly kanban planner. These tools let you plan the user's week, their habits and their projects together with them, and keep their one-off tasks.
```

**Rules**（加第 9 条）：

```text
9. Marking a one-off done can't be undone: mark only the tasks the user said are done.
```

**Three kinds of work**（One-off 那一条和「To choose」那段整段替换）：

```text
- One-off: a single task with nothing behind it — renew a passport, book the dentist. One-offs live on the user's priority matrix, sorted into four quadrants by urgency and importance; the user tracks the ones they'll do this week onto the board from there.
To choose, ask: is there a finite list to get through toward one goal? Yes → a project, one step per item. Work that repeats with no end → a habit, even if the content differs each time. Anything done once, on its own → a one-off; a list of unrelated errands is several one-offs, not a project. "Three lectures a week from a 12-lecture course" is a project with 12 steps, 3 of them on this week — not a WEEKLY × 3 template.
```

**Planning a week**（第 1、5 条各改半句）：

```text
1. Recap first: what got done last week (each habit's completion, the project steps and one-offs done) and where each active project stands (steps done and left).
…
5. … Keep the load realistic for the days left in the week, counting the points of project steps and of this week's one-offs with the habits'. The user's stated goals override the stats.
```

**One-offs**（新的一节，放在 *Projects* 后面）：

```text
# One-offs
- A one-off is a title, a size (the same scale as habits), a quadrant and an optional description — a link, notes, what done looks like.
- The quadrant is where it sits on the matrix: DO_FIRST (urgent and important), SCHEDULE (important, not urgent), SQUEEZE_IN (urgent, not important), MAYBE_LATER (neither). Propose a quadrant for each new task along with the rest of it; when you can't tell how urgent or important a task is, ask.
- create_one_off_tasks adds up to 20 at once. Check oneOffTasks first so you don't add a task that is already there.
- Every unfinished one-off has a state: UNTRACKED (on no week), THIS_WEEK (on activePlan, in the user's to-do), LAST_WEEK (unfinished on lastPlan, until the next plan carries it over or sends it back).
- New one-offs are on no week. These tools never put a one-off on a week: when the user wants one this week, tell them to track it from the priority matrix. create_plan and update_plan only carry over or send back the one-offs already on a plan.
- update_one_off_tasks marks one-offs done and moves them between quadrants. A one-off done while on no week counts toward this week's points when there is an activePlan; one already on a week keeps that week.
```

**Tell the user before writing**（加一条）：

```text
- update_one_off_tasks: a task marked done leaves the matrix for good — there is no undo.
```

### Tool descriptions（`src/mcp/prompts/toolDescriptions.ts`）

`GET_PLANNING_CONTEXT`（在 projects 那句后面加，分号连接）：

```text
…; and their unfinished one-off tasks on the priority matrix, each with its quadrant and whether it is on this week, last week or no week.
```

`CREATE_ONE_OFF_TASKS`（新）：

```text
READ_GUIDE_FIRST + Add one or more one-off tasks to the user's priority matrix — single tasks with nothing behind them (a finite list toward one goal is a project; repeating work is a habit). Give each a title, a size, a quadrant and an optional description; up to 20 per call. Check get_planning_context's oneOffTasks first so you don't add one twice. They land on no week; only the user tracks a one-off onto a week. Returns each task with its taskId, in order. Agree on the tasks and their quadrants with the user before calling.
```

`UPDATE_ONE_OFF_TASKS`（新）：

```text
READ_GUIDE_FIRST + Mark the user's one-off tasks done (completeTaskIds) or move them to another quadrant (reprioritizeTasks), by taskId from get_planning_context; unfinished tasks only. Done is final — the user can't undo it — so pass only the tasks the user said are done. A task done while on no week counts toward this week's active plan, if there is one. It never puts a task on a week or takes one off: update_plan's removeOneOffTaskIds sends a task on this week back to the matrix. Agree on the change with the user before calling.
```

### 字段说明（`src/schemas.ts` 的 `.describe()`）

| 字段 | 原文 |
| --- | --- |
| `tasks` | `One-off tasks to add to the priority matrix, in order; up to 20` |
| `tasks[].size` | `Effort: EXTRA_SMALL ~1h, SMALL ~2h, MEDIUM ~3h, LARGE ~5h, EXTRA_LARGE ~8h`（和 `newPlanLineSchema` 同一句） |
| `tasks[].quadrant`、`reprioritizeTasks[].quadrant` | `DO_FIRST: urgent and important. SCHEDULE: important, not urgent. SQUEEZE_IN: urgent, not important. MAYBE_LATER: neither` |
| `tasks[].description` | `Optional notes: a link, details, what done looks like` |
| `completeTaskIds` | `Unfinished one-off tasks to mark done, by taskId from get_planning_context. Done is final` |
| `reprioritizeTasks` | `Unfinished one-off tasks to move to another quadrant` |
| `carryOverOneOffTaskIds`（改名） | `Which of lastPlan's unfinished one-off tasks move into this plan. Omit to carry all of them over; [] carries none (the rest return to the priority matrix)` |
| `removeOneOffTaskIds`（改名） | 不变：`One-off tasks to send back to the priority matrix` |

### 错误信息（`src/utils/errorMessages.ts` 的 `PLANNING_ERROR`）

```ts
ONE_OFF_TASKS_NOT_FOUND: (taskIds: string[]) =>
  `Not unfinished one-off tasks: ${taskIds.join(', ')}. Use taskIds from get_planning_context's oneOffTasks; done tasks can't be changed.`,
ONE_OFF_TASKS_LISTED_TWICE: (taskIds: string[]) =>
  `One-off tasks listed more than once: ${taskIds.join(', ')}.`,
```

改名（Q2）：`ADHOC_TASKS_NOT_IN_LAST_PLAN` / `ADHOC_TASKS_NOT_IN_PLAN` 的 key 改成 `ONE_OFF_TASKS_…`；文字本来就写的 one-off，不用改。

---

## 代码改动清单 · Files

### MCP

| 文件 | 改动 |
| --- | --- |
| `src/mcp/tools/createOneOffTasks.ts`、`updateOneOffTasks.ts` | 新：schema + annotations → service，`runTool` 包住 |
| `src/mcp/registerTools.ts` | 注册两个新工具（放在 project 工具后面） |
| `src/mcp/prompts/serverInstructions.ts`、`toolDescriptions.ts` | 见「Prompt」 |
| `src/mcp/constants.ts` | `MCP_SERVER_INFO.version` 0.4.0 → 0.5.0 |

### Service、DAL、schema、类型

| 文件 | 改动 |
| --- | --- |
| `src/services/oneOffPlanningService.ts` | 新（对应 `projectPlanningService`）：`createOneOffTasks`、`patchOneOffTasks`，含校验 |
| `src/services/planningService.ts` | context 加 `oneOffTasks`；plan 的列表带 done（Q6）；改名（Q2） |
| `src/lib/db/tasks.ts` | 新：`createMatrixTasks`、`completeAdhocTasks`（`completeAdhocTask` 改成调它）、按 quadrant 批量更新、`getAdhocTasksByPlanId`（Q6） |
| `src/actions/taskActions.ts` | `createAdhocTaskAction` 改用 `createMatrixTasks` |
| `src/schemas.ts` | `oneOffTasksSpecSchema`、`oneOffTasksPatchSchema`、批量上限常量；改名（Q2） |
| `src/types/plan.ts` | `OneOffTaskSummary`、`OneOffTaskState`、两个结果类型；改名（Q2） |
| `src/utils/` | one-off 的 state 函数，和 `getStepState` 共用「在哪一周」的判断 |
| `src/utils/errorMessages.ts` | 两条新错误；改名（Q2） |

### 测试

| 文件 | 覆盖 |
| --- | --- |
| `src/services/oneOffPlanningService.int.test.ts`（新） | 批量建（顺序、行的形状）；完成：`UNTRACKED`（有 / 没有 active plan）、`THIS_WEEK`、`LAST_WEEK`（`planId` 不变）；换 quadrant；拒绝：done 的 id、别人的 id、step 的 id、重复的 id，而且什么都没写 |
| `src/services/planningService.int.test.ts` | context 的 `oneOffTasks` 和三种 state；plan 的列表带 done 的（Q6）；改名后的 carry-over / remove |
| `src/services/matrixService.int.test.ts` | 不改；matrix 的 Done 和 Undo 走批量版以后照样要过 |
| `src/app/api/mcp/route.int.test.ts` | `tools/list` 快照（9 个工具）；一段 tools/call：建 → 读 → 完成 → 再读 |

### 文档

| 文件 | 改动 |
| --- | --- |
| `design/flows/priorities.md` | 新的 *Manage One-offs with Claude (MCP) Flow* |
| `design/flows/plan.md` | MCP flow 第 2 步加上 one-off；"the tools never create one-offs" 那条 Rule 改写 |
| `design/baseline.md` | 功能列表里 Ad-hoc tasks 那条：matrix 或 Claude 建 |
| `design/reference.md` | 新 service 和 DAL 函数 |
| `README.md` | Current State 的 *Plan with Claude (MCP)*；Update Log |
| `design/tracker.md` | 删掉这一条；spike 移到 `archived/` |

## 默认做法

1. **`quadrant` 必填，不给默认值。** 手机上的 Add 默认 Schedule；对 LLM 必填，它要么自己判断，要么问用户。
2. **一次最多 20 个**（create 的 `tasks`、update 的两个列表各自算），zod 的 `.max()`。一次 brain dump 十几件够用了，再多应该先和用户过一遍；而且整批是 all-or-nothing，一项错整批重来，批次小一点重来的成本也小。
3. **不查重名。** UI 允许同名；guide 让 Claude 先看 `oneOffTasks`。
4. **新建的 one-off 不进任何一周**（owner 定的范围）。
5. **done 的 one-off 什么都不能改**：不能换 quadrant，也不能再完成一次。
6. **一个 id 在一次调用里只能出现一次**：同时完成又换 quadrant 没有意义。
7. **`update_one_off_tasks` 标 `destructiveHint: true`**：完成不可撤回。`create_one_off_tasks` 标 false。
8. **代码内部不改名**：`TaskType.AD_HOC`、DAL 的 `Adhoc` 函数、UI 都不动，只改 LLM 看得到的名字（Q2）。

---

## 待拍板 · Open questions（已拍板，结论见 Decision）

### Q1 · 读取放在哪

- **A（推荐）**：并进 `get_planning_context`，加顶层 `oneOffTasks`。
  - 好处：「先调 `get_planning_context`」这条规则不变，id 只从一个地方来；PR 5 对 projects 也是这么做的（单独的 `get_projects` 当时被否掉了）。
  - 代价：context 变大，一个 one-off 约 200 字节，30 个约 6 KB；只想问「matrix 上有什么」时，也要跑一遍整个 context（含 sync）。
- **B**：单独一个 `get_one_off_tasks`（可以按 quadrant / state 过滤）。
  - 好处：轻；问 matrix 的时候不用拉整周的数据。
  - 代价：多一个读取入口，guide 的 Rule 2 要加「改 one-off 之前调这个」；id 的来源变成两处。

### Q2 · 对 LLM 叫 one-off 还是 adhoc

现状：guide 和 descriptions 说 one-off，字段叫 `adhocTasks` / `carryOverAdhocTaskIds` / `removeAdhocTaskIds`；app 里卡片的 kind 标签是 "One-off"。

- **A（推荐）**：工具和新字段都叫 one-off，并把现有 3 个字段和结果里的 `removedAdhocTasks` 一起改掉。
  - 好处：LLM 只看到一个词；模型每次对话都重新读 schema，改名没有兼容成本。
  - 代价：要动 `create_plan` / `update_plan` 的 schema、类型、测试和快照。和 PR 5「对 LLM 说 habit，参数仍叫 template」的做法不一样：那次推迟改名，是因为 Phase 2 会改 habit 的模型，one-off 的模型不会变。
- **B**：工具名叫 one-off（claude.ai 一开始只给模型看工具名，这个词更好认），字段维持 adhoc。
  - 好处：改动最小，和 habit / template 的先例一致。
  - 代价：同一份 payload 里有两个词；新加的顶层字段叫哪个都别扭。
- **C**：全叫 adhoc（`create_adhoc_tasks`）。
  - 好处：和现有字段一致，一个都不用改。
  - 代价：和 guide、UI 的用词对不上。

### Q3 · 「update status」只有完成，还是也能 reopen

- **A（推荐）**：只能 → `DONE`，和 app 一样，完成不可撤回。Guide 要求只标用户说做完的那几个（Rule 9）。
  - 代价：Claude 标错了没法改，app 里也改不回来（5 秒的 Undo 只在 matrix 上点 Done 时有）。
- **B**：加 `reopenTaskIds`：`DONE` → 回 matrix（`BACKLOG`、`planId = null`、清 `doneAt`）。
  - 好处：标错了能救回来。
  - 代价：MCP 比 app 多一个能力；不知道它原来在 matrix 还是在这周的 to-do，只能一律回 matrix；如果是上周做完的，reopen 会把上周的分数拿掉，所以还要限制只能 reopen 这周完成的。规则一多，这个 PR 就不止 S 了。
- **C**：B，同时给 app 也加 un-complete。超出这次的范围。

### Q4 · update 只改 status，还是也能改 quadrant（以及 title / description / size）

- **A**：只改 status，按需求的字面意思。
- **B（推荐）**：加上 quadrant（`reprioritizeTasks`）。
  - 好处：对话里很自然（「把护照挪到 Do First」）；app 里就是拖一下；DAL 现成（`updateTaskQuadrant`）；不碰 plan。
  - 代价：比需求多了一项。
- **C**：B 再加 title / description / size。
  - 代价：app 里没有编辑 one-off 的入口，MCP 会比 UI 多一个能力；Claude 改错了，用户在 app 里改不回来。

### Q5 · 完成一个不在任何一周的 one-off 时，要不要挂到这周的 plan 上

- **A（推荐）**：和 matrix 一样，有 active plan 就挂上：算这周的分，出现在 board 的 Done 列。
  - 好处：app 和 Claude 只有一条规则，结果一样。它改了 `planId`，但不是 add to plan：任务直接 `DONE`，不进 to-do。
- **B**：不挂，`planId` 留 null。
  - 好处：严格做到「MCP 不碰 plan」。
  - 代价：同一件事，在 app 里完成算分，让 Claude 完成不算；`completeAdhocTasks` 还要多一个参数。

### Q6 · 读不读 done 的 one-off

- **A**：只读没做完的，和 matrix 显示的一样。plan 上的列表也维持只列没做完的。
- **B（推荐）**：顶层不变；plan 上的 one-off 列表带上 done 的（带 `status`），和 `projectSteps` 一样。
  - 好处：回顾上周时，Claude 能说出做完了哪些 one-off（现在说不出来）；Claude 完成一件之后，在 activePlan 上看得到。
  - 代价：多一次查询；plan 上的列表不再全是 carry-over 候选，`carryOverOneOffTaskIds` 的 description 要写明只有没做完的能带。
- **C**：单独一个历史读取（按日期范围列做完的）。超出这次的范围。

---

## 验收 · Verification

### Inspector CLI（本地 Supabase stack，`MCP_DEV_USER_ID` 是 seed 的 dev user，seed 里每个 quadrant 都有 one-off）

1. `tools/list`：9 个工具，两个新工具的 schema 和 description 和上文一致。
2. `get_planning_context`：seed 的 one-off 都在 `oneOffTasks` 里，track 过的是 `THIS_WEEK`，其余是 `UNTRACKED`；activePlan 的列表里有 seed 完成的那件（Q6 B）。
3. `create_one_off_tasks` 建 3 个 → `/kanban/priorities` 上出现在各自的 quadrant；传 21 个 → schema 错误，什么都没建。
4. `update_one_off_tasks`：完成一个 `UNTRACKED` 的 → 出现在 board 的 Done 列，Week 的分数增加；完成一个 `THIS_WEEK` 的；换一个的 quadrant；传一个 done 的 id → `isError`，同一次调用里其他的也没写。
5. Matrix 上点 Done、再点 Undo，照样能用（共用了批量写入）。

### claude.ai 里的对话

1. 「帮我记几件事：周五前续护照、给牙医打电话、有空整理车库」→ Claude 给出 3 个 one-off，各带 size 和 quadrant，用户同意后才写。
2. 「牙医的电话打了」→ Claude 从 `oneOffTasks` 找到这件，确认后标记完成，说明分数算在这周。
3. 「把护照那件放进这周」→ Claude 说它做不到，请用户在 matrix 上 track。
4. 「我想把这门课的 12 讲学完」→ Claude 提议建 project，而不是 12 个 one-off。

## Executable plan

全部在这个 PR 里（分支 `claude/mcp-one-off-tasks`），按下面的顺序 commit：

1. 这份 spike → owner review → Decision。
2. 类型、schema、错误信息；Q2 的改名。
3. DAL：`createMatrixTasks`、`completeAdhocTasks`、按 quadrant 批量更新、`getAdhocTasksByPlanId`；`createAdhocTaskAction` 和 `completeAdhocTask` 改用它们。
4. `get_planning_context`：顶层 `oneOffTasks`、plan 的列表（Q6）。
5. `oneOffPlanningService`、两个工具、注册。
6. Guide、tool descriptions、version。
7. 测试。
8. 文档（见「文档」那张表）；spike 移到 `archived/`。

**Done when**：上面的 Inspector 清单全过；claude.ai 里四段对话的表现符合预期；CI 全绿。

## 风险

- **Kind 判断错**：Claude 可能把几件不相关的事建成一个 project，或者把一门课拆成十几个 one-off。靠收紧后的判断标准（「a list of unrelated errands is several one-offs」）和验收里的第 4 段对话。
- **标错了完成没法撤回**（Q3）：靠 Rule 9、description 里的 "Done is final" 和「同意以后再写」。
- **`LAST_WEEK` 的 one-off 完成后算在上周**（现有规则）：用户可能以为算这周。Guide 里写了 "one already on a week keeps that week"，Claude 汇报时会说。
- **Guide 变长**：只加了 one-off 相关的句子；tracker 已经有「用 2–3 周后调整 guide」那一条，一起观察。

## 不在范围内 · Considered, not proposed

- **把 one-off 放进一周**（track / add to plan）：owner 说暂时不做。以后要加，放进 `update_plan` 的 `addOneOffTaskIds`（和 `addProjectStepIds` 对称），不另开工具。
- **删除 one-off**：tracker 已经有 *Ad-hoc task deletion and auto-clear logic*，先定 app 里的规则。
- **新建时直接是 `DONE`**（补记一件已经做完的事）。
- **Due date**：tracker Future 里的 *Optional due date on one-off tasks*；做的时候 create 加一个字段即可。
- **一个 `manage_one_off_tasks` 同时管建和改**：一个工具里既有新建、又有不可撤回的完成，annotation 只能标一种（destructive），客户端的确认提示会对新建也过度警告；拆成两个工具，名字也更好认。

## 拍板之后

1. 在这个 PR 里把答案写进 Decision 一节，status 改成 decided，然后照 Executable plan 实现。
2. 实现和文档都完成后，这份 spike 移到 `design/spike/archived/`。
