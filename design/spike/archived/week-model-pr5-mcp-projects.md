# Spike: Week model Phase 1 · PR 5 — MCP for projects

**Status: decided** · 2026-10-14（提出 2026-10-13；review 和讨论见 PR #61）· 回答 tracker 条目 *Week model Phase 1 › PR 5*（Plan › Medium）· 上游：`design/spike/archived/week-model-restructure.md`（approved，「PR 5 — MCP 支持 projects」一节）、`design/flows/projects.md`（Draft Steps with Claude (MCP) Flow）、`design/flows/plan.md`（Plan with Claude (MCP) Flow）· 拆出去的：时间预算、并行上限的硬限制、habit / project 的 lifecycle → `design/spike/week-model-phase2-pain-points.md`（draft）· Mockups：`mockup-projects-v2.html` 的 tab 07、`mockup-week-model-phase1-v2.html` 的 06 Claude (MCP)。两段对话抄在本文「验收」一节，mockup 删掉以后也还在

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off、`create_project`、`instanceIndex` …），和代码、mockup、tracker 一一对应。**LLM 读的文字**（guide、tool descriptions、`.describe()`、错误信息）直接给英文成稿：这些就是要写进代码的原文。

## Decision · 拍板（2026-10-14）

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · step 的位置怎么表达 | **B，锚点**（`beforeStepId`）；而且 **Projects 页的拖动排序也改用同一套逻辑**，MCP 和用户操作保持一致 | 一个纯函数 `applyStepPatch` 同时给 `update_project` 和 Projects 页用；`reorderProjectSteps` / `assignStepNumbers` 换成 `moveProjectStep` |
| Q2 · 排新一周时对 project 多主动 | 三个选项都不用：**始终先问意图**。排期时先回顾上周（做了什么、每个 project 还剩几步），再问是继续专注这些，还是换新的、探索新的 | Guide 的 *Planning a week* 一节 |
| Q3 · 「其实是 project」的旧 template | **A**，建议转换一次，用户拒绝就不再提 | Guide 里一行；清理账号里没用的 template 另记 tracker（archive 还是删，做的时候再定） |
| Q4 · 发现 1（MCP 的 `create_plan` 退回所有 step） | **A**，在 PR 5 里修，不单独发 hotfix | PR 5 合并之前，跨周建 plan 用 app 里的 plan form |
| Q5 · 新 project 和这周的 plan 一次写完？ | **A**，planning 和 scheduling 分开 | 不加 `newProjects`；先用 project / habit 工具，再用 plan 工具 |
| Q6 · claude.ai 收不到 server instructions，指引放哪 | **B**，单独一个工具，名字直白：`get_planning_guide_before_everything`；其他每个工具的 description 开头都提醒先调它 | 不往 context 里加 `guide` 字段 |
| 讨论中加的 | archived 摘要带上 `goal`；project 尽量 10 步以内、最多 50 步（prompt 引导 + service 层的总上限，UI 和 MCP 同一条规则）；step 不乱改顺序；先确认意图、看和已有的 habit / project 有没有重叠；focus 软提醒（3 个 habit、4 个 active project，暂定）；PR 5 加 `update_habit` | 见「Prompt」和各个工具 |

下文已经按结论改写；「待拍板」一节保留当时的选项，选中的那个标了 ✓。

## 一页看完 · Summary

| | 内容 |
| --- | --- |
| 新做 | 4 个工具：`get_planning_guide_before_everything`（只读，返回 guide）、`update_habit`、`create_project`、`update_project`，加上它们的 service、schema 和错误信息 |
| 更新 | `get_planning_context` 加 `projects` / `archivedProjects` 和 plan 上的 `projectSteps`；`create_plan` 加 `carryOverProjectStepIds` / `addProjectStepIds`；`update_plan` 加 `addProjectStepIds` / `removeProjectStepIds`；guide 重写；每个工具的 description 开头加「先读 guide」 |
| UI 顺带改 | Projects 页的拖动排序改用 `moveProjectStep`（和 `update_project` 同一个纯函数）；加 step 时检查 50 步上限 |
| Prompt | Rules 清单；三种 kind 怎么分；排一周的对话流程（回顾 → 问意图 → 看 focus → 先 plan 后 schedule）；开始新东西时先确认、看重叠、控制 project 的大小；step 不乱改顺序；All steps done 和 archive；写之前要告诉用户什么。成稿见「Prompt」 |
| 顺手修 | MCP 的 `create_plan` 现在会把上周没做完的 step **全部**退回 project（发现 1） |
| 实测发现 | claude.ai 不把远程 connector 的 server instructions 交给模型，一开始也只给工具名（发现 4），所以 guide 做成一个工具 |

## Trigger · 起因

Phase 1 的最后一个 PR。approved spike 只定了 PR 5 的范围（context 加 projects、两个新工具、plan 工具带 step、prompt），并把 finished project 和 archive 的 prompt 留到这个 PR 再定稿。动手之前需要回答：

- 每个工具具体收什么、回什么，校验什么，报什么错；
- context 给 Claude 多少 project 数据，形状是什么；
- prompt 怎么写：哪些是新规则，哪些是改旧规则，原文是什么；
- 改哪些文件、文档，怎么验收。

这份 spike 不重开已定的事：step 只经由 `create_plan` / `update_plan` 排期（不单独做 schedule 工具）、archive 只由用户发起、`update_project` 是 patch 形式、工具不建 one-off。

## 出发点 · What's already there

| 来自 | 已有 | PR 5 怎么用 |
| --- | --- | --- |
| MCP 3/5、5/5 | 3 个工具（`get_planning_context` / `create_plan` / `update_plan`）、`runTool`（`PlanningError` → `isError`）、`PLANNING_ERROR`、server instructions + tool descriptions | 照这个结构加工具；`runTool` 不改 |
| `planningService` | `getPlanContextByPlanId`、`createPlanFromSpec`、`patchActivePlan`、`assertNoPatchConflicts` | 加 step 参数和校验；context 加 projects |
| `planService`（PR 3 / 4a） | `createPlanInTx` / `updatePlanInTx` 已经收 `projectStepIds`（整份选择：列出的挂上，plan 上其余没做完的退回 project）；`getCarryOverProjectStepIds` | MCP 算出整份选择后传下去，不改核心 |
| `projectService`（PR 3） | `createProject`（带 steps，一个 transaction）、`archiveProject`、单步的 add / update / delete / reorder | `create_project` 直接复用 `createProject`；`update_project` 要把多个操作放进一个 transaction，所以复用 DAL；`reorderProjectSteps` 换成 `moveProjectStep` |
| `lib/db/projects.ts` | `getProjectsWithSteps`（一次查询，含 archived）、`createProjectSteps`、`linkProjectStepsToPlan`、`unlinkUnfinishedStepsByProjectId`、`renumberProjectSteps` | context 和校验都从 `getProjectsWithSteps` 在内存里算（AGENTS：小数据量一次查询 + 内存过滤） |
| `lib/db/taskTemplates.ts` | `updateTaskTemplate`（title / description / size，owner-scoped） | `update_habit` 直接用 |
| `utils/projectUtils.ts`（PR 4c） | `getStepState`（`DONE` / `THIS_WEEK` / `LAST_WEEK` / `UPCOMING`）、`isAllStepsDone`、`assignStepNumbers` | step 的 `state` 直接用 `ProjectStepState` 的值，和 Projects 页同一套判断；`assignStepNumbers` 被 `applyStepPatch` 取代 |
| `Task.doneAt` | done 的时间 | context 里 done step 的 `doneOn` |

读代码和实测时发现 4 件事：

1. **MCP 的 `create_plan` 现在会把上周没做完的 step 全部退回 project。** `createPlanFromSpec` 调 `createPlanFromEntries` 时没传 `projectStepIds`，`createPlanInTx` 把 `projectStepIds ?? []` 当成「带上哪些」，于是 pending plan 上所有没做完的 step 都被 unlink（`planId = null`、`BACKLOG`）。PR 4a 修了 plan form 的同一个问题，MCP 这条路径没修。不丢数据（step 回到 project 原位，「+ This week」能再排），但用户在 Claude 里建下周 plan 时 step 会悄悄离开这周。**在 PR 5 里修（Q4）；合并之前，跨周建 plan 用 plan form。**
2. **`linkProjectStepsToPlan` 不检查 step 在不在别的 plan 上、project 有没有 archive。** Plan form 只渲染 pending plan 上的 step，所以没问题；但 MCP 收的是 LLM 传来的 id，必须在 `planningService` 里先校验（见各工具的「校验」）。
3. **`projectService` 返回 `{error: 'projectNotFound'}` 这种表单用的形状，不抛错**；单步操作各开各的 transaction，DAL 的 `updateProject` / `updateProjectStep` 没有 `tx` 参数。`update_project` 一个 patch 里有多个操作，要原子，所以要给这两个 DAL 函数加 `tx?`，在新 service 里组合。
4. **claude.ai 不把远程 connector 的 server instructions 交给模型。** Owner 在 claude.ai 里问：模型只看得到 claude-in-chrome（本地扩展）的 instructions；Mars-Workbench、Gmail、Indeed、Claude Docs 这些远程 connector 的都没有。我们的 server 是对的：`route.ts` 把 `MCP_SERVER_INSTRUCTIONS` 传给了 `createMcpHandler`，而且同一个线上 connector 连进 Claude Code 时，上下文里出现了逐字一致的 instructions（Claude Docs 的也在）。另外，两个客户端都是 deferred loading：一开始模型只看到 connector 名和工具名，description 和参数要加载以后才看到。所以：
   - 只写在 server instructions 里的规则，在 claude.ai 上读不到；
   - 「什么时候用这个 connector」只能靠 connector 名、工具名和用户的说法来判断。

   Claude Docs 遇到同样的问题，做法是提供一个 `guide` 工具。我们照这个做（Q6），并且让工具名本身就带着指令。

---

## 改动一览 · Tools

| 工具 | 变化 | 一句话 |
| --- | --- | --- |
| `get_planning_guide_before_everything` | 新 | 只读，无参数；返回 guide 全文（`MCP_SERVER_INSTRUCTIONS` 这个常量） |
| `get_planning_context` | 改 | 加 `projects`（整条 path，每个 step 带 `state`）、`archivedProjects`（摘要，带 `goal`）；`activePlan` / `lastPlan` 加 `projectSteps` |
| `update_habit` | 新 | 改一个 habit（template）的 title、description、size |
| `create_project` | 新 | title + goal + 有序 steps，一个 transaction；回 project 和每个 step 的 `stepId` |
| `update_project` | 新 | patch：title、goal、archive / unarchive，steps 的 add / edit / move / remove；一个 transaction |
| `create_plan` | 改 | + `carryOverProjectStepIds`（不传 = 全部带上）、+ `addProjectStepIds`（UPCOMING 的 step）；修发现 1 |
| `update_plan` | 改 | + `addProjectStepIds`、+ `removeProjectStepIds`；结果的 `changes` 加两项 |

所有工具的 description 都以同一句开头（`get_planning_guide_before_everything` 自己除外）：*"If you haven't read get_planning_guide_before_everything in this conversation, or no longer have it, call it first."*

### `get_planning_guide_before_everything`（新）

**Input**：无。**Output**：`{guide: string}`，内容就是 `MCP_SERVER_INSTRUCTIONS`。guide 只维护这一份：server instructions 照常下发（Claude Code 这类会转发的客户端读它），这个工具给 claude.ai 这类不转发的客户端。

**为什么是这个名字**：claude.ai 一开始只给模型看工具名，名字本身就是指令。长度 36，在 64 字符的限制内。

**Annotations**：`readOnlyHint: true`、`idempotentHint: true`、`openWorldHint: false`。和其他工具一样走 `runTool`（要求有登录用户），返回内容和用户无关。

### `get_planning_context`

现有字段不变，加三处。例子（下周一，上周排了 Spanish A1 的两课，做完一课）：

```jsonc
{
  "today": "2026-10-19", "weekday": "Monday", "timeZone": "America/Los_Angeles",
  "week": {"periodKey": "2026-W43", "start": "2026-10-19", "end": "2026-10-25"},
  "activePlan": null,
  "lastPlan": {
    "planId": "…", "periodKey": "2026-W42", "description": "…", "mode": "NORMAL",
    "templates": ["…"], "adhocTasks": ["…"], "overall": {"…": "…"},
    // 新：这个 plan 上的 steps，done 的也列（= 上周的结果），没做完的就是 carry-over 候选
    "projectSteps": [
      {"stepId": "s1", "projectId": "p1", "projectTitle": "Spanish A1", "stepNumber": 1,
       "title": "Lesson 1 — Greetings + introductions", "size": "EXTRA_SMALL", "points": 1, "status": "DONE"},
      {"stepId": "s2", "projectId": "p1", "projectTitle": "Spanish A1", "stepNumber": 2,
       "title": "Lesson 2 — Numbers and time", "size": "EXTRA_SMALL", "points": 1, "status": "TODO"}
    ]
  },
  "templates": ["…"],
  // 新：没 archive 的 project，最新的在前；每个都给整条 path
  "projects": [
    {
      "projectId": "p1", "title": "Spanish A1", "goal": "Hold a 5-minute conversation by December.",
      "doneCount": 1, "stepCount": 8, "allStepsDone": false,
      "steps": [
        {"stepId": "s1", "stepNumber": 1, "title": "Lesson 1 — Greetings + introductions", "description": null,
         "size": "EXTRA_SMALL", "points": 1, "state": "DONE", "doneOn": "2026-10-14"},
        {"stepId": "s2", "stepNumber": 2, "title": "Lesson 2 — Numbers and time", "description": "https://…",
         "size": "EXTRA_SMALL", "points": 1, "state": "LAST_WEEK", "doneOn": null},
        {"stepId": "s3", "stepNumber": 3, "title": "Lesson 3 — Ordering food", "description": null,
         "size": "EXTRA_SMALL", "points": 1, "state": "UPCOMING", "doneOn": null}
        // … s4–s8
      ]
    }
  ],
  // 新：archived 的只给摘要（带 goal），用户要 unarchive 时用
  "archivedProjects": [
    {"projectId": "p0", "title": "Finance basics", "goal": "Understand index funds and a budget.", "doneCount": 6, "stepCount": 6}
  ]
}
```

- `state` 用 `getStepState` 算，值就是 `ProjectStepState`：`UPCOMING`（不在任何一周）、`THIS_WEEK`（在 activePlan 上）、`LAST_WEEK`（没做完、还挂在 lastPlan 上）、`DONE`。和 Projects 页同一个函数，两边永远一致。
- Board 上的状态（BACKLOG / TODO / DONE）只在 plan 的 `projectSteps` 里出现，project 的 step 上不重复。
- 实现：`getPlanningContext` 多一次 `getProjectsWithSteps`（和现有读取并行），projects、archived 摘要、两个 plan 的 `projectSteps` 都在内存里从这一次结果算出来。`getPlanContextByPlanId` 也被两个写工具的结果用，所以它自己取一次 projects（或者由调用方传入，实现时按代码量定）。
- `overall` 不变，仍然只统计 template instance。
- 「回顾上周」（guide 的 *Planning a week*）要的数据都在这里：每个 habit 的 `completionRate`、`lastPlan.projectSteps` 的 status、每个 project 的 `doneCount` / `stepCount`。

### `update_habit`（新）

**Input**（`habitPatchSchema`）：`templateId`（uuid）、`title?`、`description?`、`size?`，至少一个字段（refine）。

**Output**：`{habit: TaskTemplateSummary}`（和 context 里 `templates` 的一项同形）。

**做什么**：`planningService.updateHabit` 调 DAL 的 `updateTaskTemplate`；`count === 0` 时抛 `TemplateNotFoundError`，`runTool` 已经把它映射成 `MCP_ERROR.TEMPLATE_NOT_FOUND`。

**规则**：只改 template，从此以后生成的 instance 用新值；已经在 board 上的 instance 保留原来的 title 和 size（baseline：编辑 template 不影响已生成的 Task）。这周跑几次仍然由 `update_plan` 的 `updateTemplates` 改。

**为什么现在加**：guide 要求 Claude 遇到重叠时问「扩展已有的 habit 还是新开」（比如多骑单车 vs 已有的 Workout habit）；没有这个工具，Claude 只能提建议、做不到。Phase 2 habit 自带 cadence 时，这个工具再加字段即可，是纯加法。

**Annotations**：`readOnlyHint: false`、`destructiveHint: false`、`idempotentHint: true`、`openWorldHint: false`。

### `create_project`（新）

**Input**（`projectSpecSchema`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string，必填 | |
| `goal` | string，可选 | |
| `steps` | `[{title, description?, size}]`，默认 `[]`，最多 50 | 按顺序，第一个是 step 1 |

**Output**：`{project: ProjectContext}`，形状同 context 里的一个 project（steps 都是 `UPCOMING`，带 `stepId`）。

**做什么**：直接调 `projectService.createProject`（已经是一个 transaction），再映射成 `ProjectContext`。不排期。

**Annotations**：`readOnlyHint: false`、`destructiveHint: false`、`idempotentHint: false`、`openWorldHint: false`。

### Project 的 50 步上限（新规则，UI 和 MCP 共用）

- 常量 `PROJECT_STEP_LIMIT = 50`（`utils/projectUtils.ts`）。
- 在 service 层检查：`createProject`（steps 数）、`addProjectStep`（加完以后的总数）、`patchProject`（patch 之后的总数）。UI 的 Add Step 和 MCP 走同一个检查。
- 超了：表单显示 `en.json` 里的新 copy（「A project holds at most 50 steps」），MCP 返回 `PLANNING_ERROR.PROJECT_STEP_LIMIT`。
- 「尽量 10 步以内」只是 prompt 引导，不在代码里检查。

### `update_project`（新）

**Input**（`projectPatchSchema`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `projectId` | uuid | |
| `title` | string，可选 | |
| `goal` | string，可选 | 空字符串 = 清空 |
| `archived` | boolean，可选 | `true` archive，`false` unarchive |
| `addSteps` | `[{title, description?, size, beforeStepId?}]`，默认 `[]` | 不给 `beforeStepId` = 加在 path 末尾 |
| `updateSteps` | `[{stepId, title?, description?, size?}]`，默认 `[]` | 至少改一个字段 |
| `moveSteps` | `[{stepId, beforeStepId?}]`，默认 `[]` | 移到某个 step 前面；不给 = 移到末尾 |
| `removeStepIds` | uuid[]，默认 `[]` | |

整个 patch 至少要改一样东西（和 `planPatchSchema` 一样用 refine）。

**应用顺序**（一个 transaction）：

1. 读 project 和全部 steps（`getProjectWithStepsById(…, tx)`）。不存在或不是本人的 → `PROJECT_NOT_FOUND`。
2. 纯函数 `applyStepPatch(steps, patch)`（`utils/projectUtils.ts`，对应 plan 的 `applyTemplatePatch`）在内存里算出新 path 和 conflicts：先去掉 removed，再按顺序处理 moves，再按顺序插入 adds，最后整条 path 从 1 编号。有 conflict，或者总数超过 50，就整个拒绝，什么都不写。
3. 写入：批量删 removed → 逐个改 updated → 插入新 step（带算好的编号）→ 一条 SQL 给现有 step 重新编号 → title / goal → 最后处理 `archived`（`true` 时同时把没做完的 step 退出这周，和 `archiveProject` 一样）。
4. 回 `{changes, project}`：`changes` 是 `addedSteps` / `updatedSteps` / `movedSteps` / `removedSteps`（`{id, title}`，和 `PlanChangeRef` 同形）加上 `archived?`；`project` 是改完的 `ProjectContext`。

**校验**（任何一条不过都整个拒绝，`PATCH_REJECTED` 包装，和 `update_plan` 一致）：

- 所有 `stepId` / `beforeStepId` 都是这个 project 的 step。
- updated / moved / removed 的 step 没有 DONE（done 锁定，和 UI 一样）。
- `beforeStepId` 必须是没做完、而且没被删掉的 step，也不能是被移动的那个 step 自己。
- 同一个 step 不能既被删又被改或移动；同一个 id 在同一个列表里不能出现两次。
- Project 已 archive：除非同一个 patch 里 `archived: false`，否则拒绝。
- 总步数不超过 50。

**编号**：整条 path（包括 done step）重新从 1 编号，没动过的 step 之间的先后不变。Done step 的编号可能跟着变（Projects 页的行和 board 卡片的 n/N 都会显示新编号）——这不是新规则：现在删除一个 step 时，`shiftStepsAfterIndex` 已经会把后面所有 step 的编号减一，包括 done 的。

**DAL**：`updateProject`、`updateProjectStep` 加 `tx?`；新增 `deleteProjectSteps(userId, projectId, stepIds, tx)`（批量，只删没做完的）和 `renumberProjectPath(userId, projectId, stepIds, stepNumbers, tx)`（同 `renumberProjectSteps` 的 `unnest` 写法，但不排除 done）。

**Annotations**：`destructiveHint: true`（删 step、archive）。

### Projects 页的拖动排序改用同一套逻辑（Q1）

现在拖动发的是「全部未完成 step 的新顺序」，server 用 `assignStepNumbers` 让它们接手原来的编号（done 的编号不动）。改成和 `update_project` 的 `moveSteps` 同一套：

- `ProjectDetail` 的 `onDragEnd` 给出 `{stepId, beforeStepId}`：目标位置上的那一步；往下拖时是目标位置后面那一步；拖到最后时不给。
- `ProjectsPage.handleMove` 用 `applyStepPatch(localSteps, {moveSteps: [{stepId, beforeStepId}]})` 算出乐观的新编号，交给 `runOptimisticTasksUpdate`，再调 `moveProjectStepAction`。
- Server 端 `projectService.moveProjectStep` 在一个 transaction 里跑同一个 `applyStepPatch` + `renumberProjectPath`。乐观结果和 server 结果是同一个函数算的，永远一致。
- 删掉 `reorderProjectSteps`、`reorderProjectStepsAction`、`reorderProjectStepsSchema`、`assignStepNumbers`；新增 `moveProjectStepSchema`（`{stepId, beforeStepId?}`）。
- 行为变化：拖动跨过 done step 时，done 的编号可能会变（以前不变）。换来的是全 app 只有一条编号规则。画面不变，Design Console 不用动。

### `create_plan`（改）

`planSpecSchema` 加两个字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `carryOverProjectStepIds` | uuid[]，可选 | lastPlan 上没做完的 step 里带上哪些；不传 = 全部（和 `carryOverAdhocTaskIds` 一样）；`[]` = 都退回 project |
| `addProjectStepIds` | uuid[]，默认 `[]` | 新排进这周的 `UPCOMING` step |

**校验**：carry-over 的必须是 pending plan 上没做完的 step（`getCarryOverProjectStepIds`）；add 的必须是 `UPCOMING`（本人的、没做完、`planId = null`）而且 project 没 archive；两个列表不能重叠，各自不能重复。`EMPTY_PLAN` 的判断把 step 也算进去。

**传下去**：`projectStepIds = carryOver ∪ add` 交给 `createPlanFromEntries`，其余逻辑不变。这一步同时修掉发现 1。

### `update_plan`（改）

`planPatchSchema` 加两个字段：`addProjectStepIds`（`UPCOMING` 的 step，排进这周，进 backlog）、`removeProjectStepIds`（这周 plan 上没做完的 step，退回 project：`planId = null`、`BACKLOG`、编号不变）。「patch 什么都没改」的 refine 把这两个列表算进去。

**校验**：add 同 `create_plan`；remove 的必须是这个 plan 上没做完的 step；两个列表不能重叠。

**传下去**：`projectStepIds = （plan 上现在没做完的 step − remove）∪ add`，只在两个列表有一个非空时传，交给 `updatePlanInTx`（和现有 `adhocTaskIds` 的做法一样）。

**结果**：`changes` 加 `addedProjectSteps`、`removedProjectSteps`。

---

## Prompt · LLM 要读的文字

### 写在哪里，模型才读得到（发现 4）

| 位置 | claude.ai | Claude Code | 放什么 |
| --- | --- | --- | --- |
| connector 名 + 工具名 | ✓ 一开始就看到 | ✓ | 让模型想到用它；`get_planning_guide_before_everything` 这个名字本身就告诉模型第一步做什么 |
| tool description、`.describe()` | ✓ 调用前加载 | ✓ | 开头统一一句「先读 guide」；然后是这个工具自己的规则：ids 从哪来、副作用、同意后再写 |
| `get_planning_guide_before_everything` 的返回值 | ✓ 调了就读到 | ✓ | guide 全文 |
| server instructions | ✗ | ✓ | 同一份 guide，给会转发的客户端 |

### 被发现 · Discovery

一开始模型只看到「Mars-Workbench」和几个工具名，所以用户说「plan my week」时命中率最高，「我今天该干嘛」「帮我学西班牙语」就不一定。这一层 server 能做的有限：

- **工具名**：除了新加的 `get_planning_guide_before_everything`，其余沿用；`get_planning_context` / `create_plan` / `create_project` / `update_habit` 里有 plan、project、habit，加上 connector 名已经够具体。
- **connector 的显示名**是用户在 claude.ai 添加时自己填的。推荐填「Mars Workbench – weekly planner」，写进 README 的接入说明。
- **最可靠的触发方式在用户那边**：在 claude.ai 的个人偏好或某个 Claude Project 的 instructions 里加一句「讨论这周计划、habit、project 时，用 Mars Workbench connector」。Settings 或 consent 页以后可以给一段能复制的文字（不在这个 PR 里）。

### 对 approved 判断标准的一处收紧

approved spike 写的是「每次内容一样就是 habit，不一样就是 project step」。反例：「每天做 2 道 LeetCode」——每次题目不同，但它是 habit：没有终点，也没有一条要走完的清单。改成问：

> **有没有一条有限、有序、能走完的清单，通向一个目标？** 有 → project，清单上的每一项是一个 step。没有（重复的练习，哪怕每次内容不同）→ habit。

### Guide 全文（`src/mcp/prompts/serverInstructions.ts`，整段替换）

同时用作 server instructions 和 `get_planning_guide_before_everything` 的返回值。开头的 *Rules* 是给人和 AI 都看的短清单，后面各节展开。

```text
Mars Workbench is the user's weekly kanban planner. These tools let you plan the user's week, their habits and their projects together with them.

# Rules
1. Read this guide (get_planning_guide_before_everything) before anything else in a conversation, and again if you lose it.
2. Call get_planning_context before you propose or change anything. Use only ids it returns or that a write just returned; never invent or alter an id.
3. Ask before you assume, and propose before you write: write only after the user agrees, then tell them what changed.
4. Plan, then schedule: settle projects and habits first (create_project, update_project, update_habit), then put the week together (create_plan, update_plan).
5. Keep the focus narrow: 3 habits and 4 active projects are already a full plate.
6. Keep projects finishable: aim for 10 steps or fewer; 50 is the limit.
7. Keep project steps in their order unless the user asks.
8. Archiving a project is the user's call, never yours.

# Three kinds of work
A week mixes three kinds of work:
- Habit: work that repeats with no end — a workout, flashcards, two coding problems a day. A habit is a reusable template that a plan runs DAILY or WEEKLY.
- Project: a goal reached through a finite, ordered list of steps — a course, a book. Its steps never expire and go onto a week a few at a time.
- One-off: a single task with nothing behind it. One-offs live on the user's priority matrix. These tools never create them; they only carry over or drop the ones attached to a plan.
To choose, ask: is there a finite list to get through? Yes → a project, one step per item. No → a habit, even if the content differs each time. "Three lectures a week from a 12-lecture course" is a project with 12 steps, 3 of them on this week — not a WEEKLY × 3 template.

# Planning a week
1. Recap first: what got done last week (each habit's completion, the project steps done) and where each active project stands (steps done and left).
2. Ask before proposing: keep the focus on these habits and projects, or change something? Anything new to start or explore? Don't assume.
3. Check the focus: with 3 or more habits, or 4 or more active projects, say the focus is already spread, and suggest finishing or archiving something before adding more.
4. Plan, then schedule: settle new or changed projects and habits first, then build the week — create_plan when there is no activePlan, update_plan (passing activePlan.planId) when there is.
5. Calibrate with lastPlan: a low completionRate or many expired instances means the user over-committed, so ease the frequency or drop the habit; a high completionRate leaves room to add. Unfinished project steps on lastPlan say the same about projects. Keep the load realistic for the days left in the week, counting project steps' points with the habits'. The user's stated goals override the stats.
6. Propose the week, and write only after the user agrees.
Mid-week, change the plan only as the user asks.

# Starting something new
- When it's unclear, ask what it is: a goal with an end (a project) or something to keep doing (a habit).
- Check what already exists. If it overlaps a habit or project (more biking vs a "Workout" habit), ask whether to extend that one — its title, description or size with update_habit, how often it runs this week with update_plan, more steps with update_project — or to start a new one.
- Keep a project finishable: aim for 10 steps or fewer. If the goal is bigger (a whole certificate program), propose its first milestone (the first course) as the project; the rest can become later projects. A project holds at most 50 steps; if the user insists on more, say so and stop there.
- If there are no templates, no projects and no lastPlan, this is the user's first week: explain the three kinds of work in two sentences, ask what they want to keep doing and what they want to finish, then propose a small first week.
- If a habit in lastPlan or activePlan is really a project (a finite list run as a WEEKLY habit, like "Biomedical lecture"), suggest once making it a project with its real steps and dropping the habit from the next plan. Don't press if the user declines.

# Habits
- A habit (a template) is its title, description and size. Size sets effort and points: EXTRA_SMALL ~1h = 1 pt, SMALL ~2h = 2, MEDIUM ~3h = 3, LARGE ~5h = 5, EXTRA_LARGE ~8h = 8. Prefer SMALL to MEDIUM; split larger work into smaller habits.
- Reuse existing habits (by templateId) instead of creating near-duplicates; create a new one only when nothing fits.
- type and frequency are chosen per week, not part of the habit: DAILY × n is n task instances every day; WEEKLY × n is n instances across the whole week. Frequency runs from 1 to 10. "Three times a week" is WEEKLY × 3, never DAILY × 3.
- mode: NORMAL generates daily instances on weekdays only; EXTREME every day, weekends included.
- Generated instances start in the user's backlog; the user pulls them onto the board.

# Projects
- create_project writes the whole path at once: ordered steps, each a title, a size (the same scale as habits) and an optional description — a link, notes, what done looks like. Keep each step to one sitting, EXTRA_SMALL to MEDIUM; split anything bigger.
- update_project renames a project, changes its goal, adds, edits, moves or removes steps, and archives or unarchives it. Done steps are locked.
- Writing a project schedules nothing. Put steps on the week with addProjectStepIds — in update_plan for this week's plan, in create_plan for a new one. Any UPCOMING step can go, in any order; it lands in the user's backlog. A step never expires: unfinished at the end of the week, it waits on lastPlan (state LAST_WEEK) until the next plan carries it over or sends it back.
- Every step has a state: UPCOMING (on no week), THIS_WEEK (on activePlan), LAST_WEEK (unfinished on lastPlan), DONE. Its board status is in the plan's projectSteps.
- Keep the steps in the order they were written. Move a step only when the user asks, or when a new step has to come before others. Never reorder to tidy up.
- A project with allStepsDone: true has nothing left to do but stays open. When you plan a week, or when the user brings it up, ask whether to add its next steps or archive it.
- Archiving is how the user pauses or closes a project. Archive only when the user asks for it or says yes to that question — never on your own, never to tidy up.

# Tell the user before writing
- create_plan completes lastPlan and moves its unfinished one-off tasks and project steps into the new plan — all of them unless carryOverAdhocTaskIds or carryOverProjectStepIds narrows it. The rest go back: one-offs to the priority matrix, steps to their project, in the same place.
- update_plan: removing a habit, or changing its type or frequency, deletes that habit's unfinished instances (backlog, to-do) and regenerates them in the backlog; completed tasks are kept. Removing a one-off sends it back to the priority matrix; removing a project step sends it back to its project, in the same place, out of the user's to-do.
- update_habit changes the habit from now on; task instances already generated keep their old title and size.
- update_project: removing a step deletes it and the steps after it move up; if it was on this week, it leaves the board too. Archiving takes every unfinished step of the project off the week; unarchiving brings the project back, not its steps' places on the week.
```

和现在这一版比：

| 段落 | 变化 |
| --- | --- |
| 开头、Rules | 新。8 条短规则，人和 AI 都能一眼看懂；替代旧的 Workflow |
| Three kinds of work | 新。收紧后的判断标准；one-off 那句从旧的 How a plan works 挪过来 |
| Planning a week | 新（Q2）。回顾 → 问意图 → 看 focus（3 / 4，暂定）→ 先 plan 后 schedule → 校准 → 提案；calibrate 和 load 从旧的 Planning well 挪进来，并把 step 算进去 |
| Starting something new | 新。先确认是 project 还是 habit；看和已有的有没有重叠，问扩展还是新开；project 的大小（10 / 50）；空账号的第一周；Q3 那一行 |
| Habits | 旧 How a plan works 的内容，「template」改称 habit（括号注明 template）；Reuse 那条从旧的 Planning well 挪过来 |
| Projects | 新。写法、排期只走 plan 工具、step 的 state、不乱改顺序、All steps done、archive |
| Tell the user before writing | create_plan 和 update_plan 加上 step 的去向；新增 update_habit、update_project 两条 |

### Tool descriptions（`src/mcp/prompts/toolDescriptions.ts`）

```ts
// Every tool but the guide opens with this: claude.ai hands the model no
// server instructions, so the guide is a tool the model has to call.
const READ_GUIDE_FIRST =
  "If you haven't read get_planning_guide_before_everything in this conversation, or no longer have it, call it first. ";

export const TOOL_DESCRIPTIONS = {
  GET_PLANNING_GUIDE_BEFORE_EVERYTHING:
    'How planning works in Mars Workbench: the rules, the three kinds of work (habits, projects, one-offs), how to plan a week, how to start something new, and what each write changes. Call this before anything else in a conversation, and again if you no longer have it.',
  GET_PLANNING_CONTEXT:
    READ_GUIDE_FIRST +
    "Read what you need to plan the user's week, habits and projects in Mars Workbench: today's date and week; this week's active plan (its habits with type, frequency and progress so far, plus the one-off tasks and project steps on it); last week's finished plan with per-habit completion stats, its project steps (done, and unfinished ones that can carry over) and the one-off tasks that carry over; the user's habits (templates); and their projects, each with its goal, progress and whole path of steps. Call it before you propose or change anything — the ids the other tools take come from here.",
  CREATE_PLAN:
    READ_GUIDE_FIRST +
    "Create this week's plan — only when get_planning_context shows no activePlan. Run existing habits by templateId in `templates`, add brand-new ones in `newTemplates`, and put UPCOMING project steps on the week with `addProjectStepIds`. Completes lastPlan and moves its unfinished one-off tasks and project steps into the new plan (all of them by default). Task instances and steps land in the user's backlog. Agree on the plan with the user before calling.",
  UPDATE_PLAN:
    READ_GUIDE_FIRST +
    "Change this week's active plan (activePlan.planId from get_planning_context); only what you pass changes. Removing a habit, or changing its type or frequency, deletes that habit's unfinished task instances (backlog, to-do) and regenerates them in the backlog; completed tasks are never touched. `addProjectStepIds` puts UPCOMING project steps in the backlog; `removeProjectStepIds` sends steps back to their project. Agree on the change with the user before calling.",
  UPDATE_HABIT:
    READ_GUIDE_FIRST +
    "Change a habit (templateId from get_planning_context): its title, description or size; only what you pass changes. It applies to task instances generated from now on; ones already generated keep their old title and size. How often it runs this week is set with update_plan instead. Agree on the change with the user before calling.",
  CREATE_PROJECT:
    READ_GUIDE_FIRST +
    "Create a project: a goal reached through a finite, ordered path of steps, such as a course or a book (repeating work with no end is a habit instead). Give its title, an optional goal and its steps in order, each with a title, a size and an optional description; aim for 10 steps or fewer, at most 50. Check get_planning_context's projects first so you don't create a second one for the same goal. Returns the project with every step's stepId, in order. Schedules nothing: put steps on the week afterwards with update_plan or create_plan. Agree on the project and its steps with the user before calling.",
  UPDATE_PROJECT:
    READ_GUIDE_FIRST +
    "Change a project (projectId and stepIds from get_planning_context); only what you pass changes. Rename it or change its goal; add steps (at the end, or before a given step); edit, move or remove steps that aren't done; archive or unarchive it. Done steps are locked, and steps keep their order unless the user asks. Removing a step deletes it, and takes it off the board if it is on this week. Archiving takes every unfinished step off the week — archive only when the user asks. Agree on the change with the user before calling.",
};
```

### 字段说明（`src/schemas.ts` 的 `.describe()`）

模型读的是字段说明，所以写「这个字段是什么」，不写校验规则（沿用现有 MCP schema 的约定）。

```ts
// create_plan
carryOverProjectStepIds: "Which of lastPlan's unfinished project steps (state LAST_WEEK) move into this plan. Omit to carry all of them over; [] carries none (the rest return to their projects)",
addProjectStepIds: 'UPCOMING project steps to put on this week, by stepId from get_planning_context or create_project',

// update_plan
addProjectStepIds: 'UPCOMING project steps to put on this week; they land in the backlog',
removeProjectStepIds: 'Project steps on this week to send back to their project',

// update_habit
templateId: 'A templateId from get_planning_context',
title: 'A new name',
description: 'A new description',
size: 'Effort: EXTRA_SMALL ~1h, SMALL ~2h, MEDIUM ~3h, LARGE ~5h, EXTRA_LARGE ~8h', // 复用现有的 size 说明

// create_project
title: "The project's name, e.g. 'Spanish A1'",
goal: 'What finishing the project means, in one sentence',
steps: 'The path in order, step 1 first',
'steps[].title': "What this step covers, readable on its own, e.g. 'Lesson 3 — Ordering food'",
'steps[].description': 'A link, notes, or what done looks like',
'steps[].size': 'Effort: EXTRA_SMALL ~1h, SMALL ~2h, MEDIUM ~3h, LARGE ~5h, EXTRA_LARGE ~8h',

// update_project
projectId: 'A projectId from get_planning_context',
title: 'A new name',
goal: 'A new goal; an empty string clears it',
archived: 'true archives the project — only when the user asks; false unarchives it',
addSteps: 'New steps, in order',
'addSteps[].beforeStepId': 'Insert the new step right before this step; omit to add it at the end of the path',
updateSteps: 'A new title, description or size for steps that are not done',
moveSteps: 'Steps that are not done, moved to a new place in the path — only when the user asks',
'moveSteps[].beforeStepId': 'Move the step right before this one; omit to move it to the end',
removeStepIds: 'Steps that are not done, to delete',
```

### 错误信息（`src/utils/errorMessages.ts` 的 `PLANNING_ERROR`）

每条都说清楚哪里错、该怎么做；patch 类的错误继续用 `PATCH_REJECTED` 包起来（「No changes were made. …」）。`update_habit` 找不到 template 时复用现有的 `MCP_ERROR.TEMPLATE_NOT_FOUND`。

```ts
// 改写
EMPTY_PLAN:
  'A plan needs at least one template, carried-over one-off task or project step.',

// plan 工具里的 step
PROJECT_STEPS_LISTED_TWICE: (stepIds: string[]) =>
  `Project steps listed more than once: ${stepIds.join(', ')}.`,
PROJECT_STEPS_NOT_IN_LAST_PLAN: (stepIds: string[]) =>
  `Not unfinished project steps of the last plan: ${stepIds.join(', ')}. carryOverProjectStepIds takes steps in state LAST_WEEK.`,
PROJECT_STEPS_NOT_UPCOMING: (stepIds: string[]) =>
  `Not upcoming project steps: ${stepIds.join(', ')}. addProjectStepIds takes steps in state UPCOMING of a project that isn't archived.`,
PROJECT_STEPS_NOT_IN_PLAN: (stepIds: string[]) =>
  `Not unfinished project steps of this plan: ${stepIds.join(', ')}.`,

// project 工具
PROJECT_NOT_FOUND: (projectId: string) =>
  `Project not found: ${projectId}. Use a projectId from get_planning_context.`,
PROJECT_ARCHIVED: (projectId: string) =>
  `Project ${projectId} is archived. To change it, unarchive it in the same call (archived: false) — only if the user asked.`,
PROJECT_STEP_LIMIT: (stepCount: number) =>
  `A project holds at most ${PROJECT_STEP_LIMIT} steps; this change would leave ${stepCount}. Propose the first milestone as its own project instead.`,
STEPS_NOT_IN_PROJECT: (stepIds: string[]) =>
  `Not steps of this project: ${stepIds.join(', ')}.`,
STEPS_DONE: (stepIds: string[]) =>
  `Done steps are locked — they can't be edited, moved, removed or used as beforeStepId: ${stepIds.join(', ')}.`,
STEPS_REMOVED_AND_CHANGED: (stepIds: string[]) =>
  `Removed and also edited or moved in the same call: ${stepIds.join(', ')}.`,
STEPS_LISTED_TWICE: (stepIds: string[]) =>
  `Steps listed more than once in the same list: ${stepIds.join(', ')}.`,
STEP_POSITION_INVALID: (stepIds: string[]) =>
  `beforeStepId must be another step of this project that is not done and not removed: ${stepIds.join(', ')}.`,
```

---

## 代码改动清单 · Files

### MCP

| 文件 | 新 / 改 | 内容 |
| --- | --- | --- |
| `src/mcp/tools/getPlanningGuide.ts` | 新 | `get_planning_guide_before_everything`：无参数，返回 `{guide: MCP_SERVER_INSTRUCTIONS}` |
| `src/mcp/tools/updateHabit.ts` | 新 | `update_habit` → `planningService.updateHabit` |
| `src/mcp/tools/createProject.ts` | 新 | `create_project` → `projectPlanningService.createProjectFromSpec` |
| `src/mcp/tools/updateProject.ts` | 新 | `update_project` → `projectPlanningService.patchProject` |
| `src/mcp/registerTools.ts` | 改 | 注册 4 个新工具，guide 排第一个 |
| `src/mcp/constants.ts` | 改 | `MCP_SERVER_INFO.version` 0.3.0 → 0.4.0 |
| `src/mcp/prompts/serverInstructions.ts` | 改 | 整段替换（成稿见上） |
| `src/mcp/prompts/toolDescriptions.ts` | 改 | `READ_GUIDE_FIRST`；改 3 条，加 4 条 |
| `src/mcp/middleware/runTool.ts` | 不改 | 新工具也抛 `PlanningError` / `TemplateNotFoundError` |

### Service、DAL、schema、类型

| 文件 | 新 / 改 | 内容 |
| --- | --- | --- |
| `src/schemas.ts` | 改 | `planSpecSchema` +2 字段；`planPatchSchema` +2 字段和 refine；新 `habitPatchSchema`、`projectSpecSchema`、`projectPatchSchema`（step 字段复用 `projectStepInputSchema`）、`moveProjectStepSchema`；删 `reorderProjectStepsSchema` |
| `src/services/planningService.ts` | 改 | context 加 projects / archivedProjects / `projectSteps`；`createPlanFromSpec`、`patchActivePlan` 加 step 校验，算出整份 `projectStepIds` 传下去（修发现 1）；新 `updateHabit` |
| `src/services/projectPlanningService.ts` | 新 | `createProjectFromSpec`、`patchProject`（一个 transaction，抛 `PlanningError`）。不塞进 `planningService.ts`：那个文件已经 392 行，加上 context 和 step 参数会到 500 多 |
| `src/services/projectService.ts` | 改 | `reorderProjectSteps` → `moveProjectStep`（`applyStepPatch` + `renumberProjectPath`）；`createProject`、`addProjectStep` 检查 50 步上限 |
| `src/utils/projectUtils.ts` | 改 | `PROJECT_STEP_LIMIT`；纯函数 `applyStepPatch`（新 path + conflicts，对应 `applyTemplatePatch`）、`toProjectContext`（project + steps + activePlanId → `ProjectContext`，用 `getStepState`）；删 `assignStepNumbers` |
| `src/lib/db/projects.ts` | 改 | `updateProject`、`updateProjectStep` 加 `tx?`；新增 `deleteProjectSteps`、`renumberProjectPath` |
| `src/utils/errorMessages.ts` | 改 | 见上 |
| `src/types/plan.ts` | 改 | `ProjectContext`、`ProjectStepContext`、`ArchivedProjectSummary`、`PlanProjectStepSummary`；`PlanContext.projectSteps`；`PlanningContext.projects` / `archivedProjects`；`PlanPatchResult.changes` +2；`ProjectPatchResult` |

### UI（Q1 和 50 步上限带来的）

| 文件 | 改什么 |
| --- | --- |
| `src/components/domain/projects/project-detail/ProjectDetail.tsx` | `onDragEnd` 给出 `{stepId, beforeStepId}` |
| `src/components/domain/projects/ProjectsPage.tsx` | `handleReorder` → `handleMove`：`applyStepPatch` 算乐观编号，调 `moveProjectStepAction` |
| `src/actions/projectActions.ts` | `reorderProjectStepsAction` → `moveProjectStepAction`；`addProjectStepAction` 映射 50 步上限的错误 |
| `src/i18n/en.json` | 50 步上限的 copy |

画面不变，Design Console 不用动。

### 文档

| 文档 | 改什么 |
| --- | --- |
| `design/flows/plan.md` | Plan with Claude (MCP) Flow：把 *Projects (designed — Phase 1 pending, PR 5)* 那一块并进 Steps / Rules；参数名换成 `addProjectStepIds`；加上 guide 工具、`update_habit` |
| `design/flows/projects.md` | 顶部 Status 去掉 MCP 的 pending；Manage Steps 的 reorder 改成「移到某一步前面或末尾，整条 path 重新编号」，加上 50 步上限；Draft Steps with Claude 写上先问意图、先 plan 后 schedule、`beforeStepId` 和 `addProjectStepIds` |
| `design/baseline.md` | *Designed: Phase 1* 一节去掉第 2 条（MCP for projects）；如果 4d 已经把整节收掉，就不用改 |
| `design/reference.md` | MCP 表加 4 行、改 3 行；Services 加 `projectPlanningService.ts`，`projectService` 的 reorder 换成 move；DAL 加 `deleteProjectSteps`、`renumberProjectPath` |
| `README.md` | Current State 的 *Plan with Claude (MCP)* 改成一行：Claude 也能起草 project、调整 habit、把 step 排进这周；接入说明加上推荐的 connector 显示名和那句个人偏好；Update Log 追加 |
| `design/tracker.md` | 删 PR 5 那条 sub-bullet；如果 4d 也已落地，parent 一起删 |
| `design/mockup/future-work/mockup-projects-v2.html` | 删（PR 4 spike 的 Q4 已定） |
| 这份 spike | 按 AGENTS 的 spike 流程，在 PR 5 里移到 `design/spike/archived/` |

---

## 默认做法

1. **参数名用 `addProjectStepIds`**，`create_plan` 和 `update_plan` 对称；不用 flows 里写的 `projectStepIds`。原因：plan form 的 `projectStepIds` 是「整份选择」，MCP 这个是「新加的」，同名不同义会混。
2. **context 给每个 project 的整条 path**，done 的也给（带 `doneOn`），不只是「接下来几步」。`update_project` 的 edit / move / remove 要 id，回顾上周、起草下一批 step 时要知道做过什么。一条 40 步的 path 大约 6 KB，可以接受。
3. **Archived project 只给摘要**（id、title、goal、done / total），用户要 unarchive 时用。Project 没有 description 字段，`goal` 就是它的描述。
4. **project 的 step 上只有 `state`，不重复 board status**；board status 在 plan 的 `projectSteps` 里。
5. **对 LLM 叫 `stepNumber`**（= `instanceIndex`），不暴露 `instanceIndex` 这个名字。
6. **Project 最多 50 步，是总数**，在 service 层检查，UI 和 MCP 同一条；`create_project` 的 zod 也有 `.max(50)`。「尽量 10 步以内」只靠 prompt。
7. **对 archived project 的 patch 整个拒绝**，除非同一个 patch 里有 `archived: false`。
8. **archive 和别的改动在同一个 patch 里时，先改，最后 archive。**
9. **`update_project` 对 THIS_WEEK 的 step 和 UI 一样**：能改，能删（删了 board 上也没了）；DONE 锁定。
10. **`create_project` 不排期**（Q5：planning 和 scheduling 分开）。「先建 project 再排期」是两次写入，不原子；第二次失败时 project 已经在了，Claude 重读 context 再排就行。
11. **一个 patch 里有任何问题就整个拒绝、什么都不写**，用 `PATCH_REJECTED` 把所有问题一起报出来，和 `update_plan` 一致。
12. **Plan form 的写入路径不加同样的校验**：它只能写本人的 step，不是安全问题。MCP 的校验放在 `planningService`，因为 LLM 会传错 id。
13. **`overall` 不混入 step**，仍然只统计 template instance；step 的结果看 `projectSteps` 的 status。
14. **不建同名 project 的保护只写在 prompt 里**（「先看有没有已经覆盖这个目标的 project」），server 不拒绝同名——UI 也允许同名。
15. **Focus 的软提醒只在 prompt 里**：3 个 habit（这周或上周 plan 上的 template 数）、4 个 active project（没 archive 的），暂定；硬限制和 lifecycle 在 Phase 2 spike 里定。
16. **对 LLM 说「habit」，参数名仍然是 template**（`templates`、`templateId`）。参数改名放到 Phase 2，habit 有了自己的 cadence 时一起改。

---

## 待拍板 · Open questions（已拍板，结论见 Decision）

### Q1 · `update_project` 里 step 的位置怎么表达

用户会说「在第 4 课后面加一次复习」「把 Lesson 6 挪到最后」。Projects 页拖动时发的是「全部未完成 step 的新顺序」（`reorderProjectSteps`）。

| | 形状 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 追加 + 整份顺序 | `addSteps` 只能加在末尾；`reorderStepIds` 列出所有未完成 step 的新顺序 | 复用 `reorderProjectSteps` 的语义和校验，新代码最少 | 在中间插一步要调两次（先加，拿到 id 再排），不原子；Claude 要把每个未完成 step 都列一次，30 步的 path 漏一个就是 `stepOrderMismatch`；参数看不出到底动了哪一步，不好向用户复述 |
| **B** · 锚点 ✓ | `addSteps[].beforeStepId`、`moveSteps[{stepId, beforeStepId?}]`；不给锚点 = 末尾 | 一次调用、原子；参数就是意图（「Quiz 插在 Lesson 5 前」）；只传变化的部分 | 新的纯函数 `applyStepPatch`（约 50 行）和一个包括 done 在内的整条 path 重编号 |
| C · 声明整条 path | `steps`：完整的未完成 step 列表，已有的带 id，新的不带，没列的删除 | 一种形状覆盖所有操作 | 漏写一行就删掉一个 step；每次都要回传所有 title，容易被悄悄改写；不是 approved 的 patch 形式 |

锚点用 `beforeStepId`，不用 `afterStepId`：「不给 = 末尾」和「插到某一步前面」两种就能表达所有位置，不需要用 `null` 表示「最前面」。

**结论：B；Projects 页的拖动也改用同一套逻辑**（见「Projects 页的拖动排序改用同一套逻辑」）。

### Q2 · 排新一周时，Claude 对 project 有多主动

所有写入都要用户同意，所以问题是 Claude 的**提案**里默认有没有 project 的 step。

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 被动 | 只有用户提到某个 project，才排它的 step | 最不意外 | project 靠用户记着才会动 |
| B · 默认带上 | 新一周的提案里，每个 active project 带上 LAST_WEEK 的 step 和接下来的 UPCOMING step；用户删减 | project 自然往前走；和 carry-over「默认全带上」一致 | 提案变长；可能排得太满 |
| C · 列出来问 | 列出 active project，问这周推进哪几个 | 用户明确选 | 每周多一轮来回 |
| **D** · 先回顾、再问意图 ✓（owner） | 先说上周做了什么、每个 project 还剩几步，再问继续专注这些还是换新的、要不要探索新东西；同时看 focus 够不够集中 | 用户每周都对方向做一次有意识的选择；回顾本身就是反馈 | 每周多一轮来回（接受） |

三个选项在周中都一样：只有用户要求才改 plan。

**结论：D。** 见 guide 的 *Planning a week*。

### Q3 · 「其实是 project」的旧 template

approved spike 的风险一节：Biomedical course 这类按 WEEKLY 跑的 template，其实是一条有限的清单，「下周不再选就行，不做自动迁移」。问题是 Claude 要不要提醒。

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| **A** · 提一次 ✓ | 只看 lastPlan / activePlan 里的 template；像有限清单的，建议一次转成 project（建 project + 下周不选这个 template），用户拒绝就不再提 | 旧数据会慢慢迁过来；不是自动迁移，用户决定 | 判断可能出错；可能显得啰嗦 |
| B · 不提 | 用户自己问才转 | 不打扰 | 旧 template 会一直以 habit 的方式跑 |

**结论：A。** 另外，清理 owner 账号里没用的 template 记进 tracker；archive 还是删除，做的时候再定。

### Q4 · 发现 1：先发 hotfix，还是等 PR 5

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| **A** · PR 5 里修 ✓ | 作为 PR 5 的一部分。合并之前，跨周建 plan 用 app 里的 plan form（它会正确带上 step） | 少一个 PR | PR 5 合并之前用 Claude 建 plan，step 会悄悄退回 project（可以用「+ This week」再排回来） |
| B · 先发 hotfix | 一个小 PR：`createPlanFromSpec` 默认带上全部 pending step | 不管 PR 5 什么时候合，这个坑都先填上 | 多一个 PR；prompt 在 PR 5 里还会重写 |

**结论：A。**

### Q5 · 新 project 和这周的 plan 能不能一次写完

对话里的同意只需要一次（用户对整个提案说 yes，Claude 接着调两个工具）；claude.ai 的工具权限弹窗按工具来，选 Always allow 以后不再问。

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| **A** · 分开写 ✓ | `create_project` → `update_plan` / `create_plan` | planning 和 scheduling 分开；每个工具只做一件事 | 两次调用之间不原子；头几次多一个弹窗 |
| B · plan 工具加 `newProjects` | 同一个 transaction 里建 project 并排期 | 一次调用、原子；和 `newTemplates` 同一个模式 | 两个 plan 工具的 schema 变大；建 project 有两个入口 |
| C · 新工具 `create_plan_with_project` | 专门的组合工具 | 每个工具的 schema 都小 | 组合会越来越多；工具数量膨胀 |

**结论：A。** guide 的 Rule 4：先 plan（project / habit 工具），再 schedule（plan 工具）。

### Q6 · claude.ai 收不到 server instructions，指引放在哪（发现 4）

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 只靠 tool description | 每个工具的 description 写全它需要的规则 | 调用前一定能看到 | 通用知识要在每个 description 里各写一遍，很臃肿 |
| **B** · 单独的 guide 工具 ✓ | `get_planning_guide_before_everything`；其他工具的 description 开头都写「先调它」 | 指引只写一份；有 Claude Docs 的先例；名字本身就是指令 | 每次对话多一次调用；要靠模型去调（名字 + 每个 description 的开头一句压住） |
| C · 放进 `get_planning_context` 的返回值 | 加 `guide` 字段 | 不多一次调用 | 每次调 context 都多 1–1.5k token；context 的职责变杂 |

**结论：B，用 owner 起的名字。**

---

## 验收 · Verification

### Inspector CLI（本地 Postgres，`MCP_DEV_USER_ID`）

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --method tools/call --tool-name <tool> --tool-arg <key>=<value>
```

逐条跑，每条之后查 DB：

1. `tools/list`：7 个工具，guide 排第一；除了 guide，每个 description 都以 `READ_GUIDE_FIRST` 开头。
2. `get_planning_guide_before_everything` 返回的文本和 `MCP_SERVER_INSTRUCTIONS` 一致。
3. `update_habit` 改 description 和 size → template 变了，已经生成的 instance 没变；错的 `templateId` → `TEMPLATE_NOT_FOUND`。
4. `create_project`（8 个 step）→ 编号 1–8，全部 `planId = null`、`BACKLOG`；`get_planning_context` 里 8 个都是 `UPCOMING`。51 个 step → zod 拒绝。
5. `update_plan` `addProjectStepIds: [s1, s2]` → 两个 step 进这周的 backlog；context 里变成 `THIS_WEEK`，`activePlan.projectSteps` 有它们。
6. `update_project`：`beforeStepId` 插一步、`moveSteps` 挪一步、改一步、删一个 THIS_WEEK 的 step → 编号连续；被删的 step 不在 board 上了。加到第 51 步 → `PROJECT_STEP_LIMIT`，DB 没变。
7. 在 Projects 页拖动同样的移动 → 编号和 `update_project` 的结果一致；乐观更新和刷新后一致。Add Step 加到第 51 步 → 表单显示上限的 copy。
8. `update_project` `archived: true` → 没做完的 step 都离开这周；`archivedProjects` 里有它（带 `goal`）；再 `archived: false` 恢复，step 全部是 `UPCOMING`。
9. 模拟跨周（把 active plan 的 `periodKey` 改成上一周，下一次 `ensureSynced` 会把它翻成 `PENDING_UPDATE`）→ `create_plan` 不传 `carryOverProjectStepIds` → 没做完的 step 全部带上，状态不变；再来一次传 `[]` → 全部退回 project，编号不变。
10. 每条错误路径（错的 projectId、DONE step、archived project、把 LAST_WEEK step 放进 `addProjectStepIds`、两个列表重叠、锚点是被删的 step …）都返回 `isError`、信息可读，而且 DB 没变。
11. 用户隔离：第二个用户的 id 全部报 not found。
12. `tsc`、`lint`、`format:check`、`check:themes`、`build` 全绿。

### claude.ai 里的对话

Claude 连不上 localhost，所以在 preview deployment 上跑（preview 接受 token）。preview 和本地开发都连线上的 Supabase（tracker 里有「Separate dev environment」一条），对话写进的是真实数据：用测试 project，跑完 archive。**全部在 claude.ai 上跑**，确认每段对话里 Claude 先调了 `get_planning_guide_before_everything`。

**对话 1**（来自 `mockup-projects-v2.html` tab 07，按 Q5 / Q2 的结论调整）：

> You：Set me up a Spanish A1 path, two short lessons a week.
> Claude：`get_planning_guide_before_everything` → `get_planning_context` → 确认这是一个有终点的目标（project），提议 **Spanish A1**，8 课，每课约一小时，Lesson 1–2 排这周。「Shall I set it up?」
> You：Yes.
> Claude：`create_project({title: "Spanish A1", goal, steps: [8 lessons]})` → `update_plan({planId, addProjectStepIds: [L1, L2]})`
> 结果：Projects 页最上面是 Spanish A1，整条 path，前两步在这周。

**对话 2**（来自 `mockup-week-model-phase1-v2.html` 06 Claude (MCP)，跨周）：

> You：I want three days this week for a biomedical course, about an hour each. Find me a good intro series.
> Claude：提议 **Biomedical course**，12 讲的系列，每讲带链接，Lecture 1–3 排这周。
> You：Go.
> Claude：`create_project(…12 lectures)` → `update_plan({planId, addProjectStepIds: [L1, L2, L3]})`
> *下周一，You：Plan my week.*
> Claude：回顾：上周 Biomedical 做完 2 讲，Lecture 3 没做完，还剩 10 讲；各个 habit 的完成率。问：继续 Biomedical 吗，还是有新东西？用户说继续 → 提议带上 Lecture 3、加 Lecture 4–5，同意后 `create_plan({templates, carryOverProjectStepIds: [L3], addProjectStepIds: [L4, L5]})`

**再加几段**，覆盖这个 PR 新定的 prompt：

- **All steps done**：把一个测试 project 的 step 全部拖到 Done，然后请 Claude 排下周 → Claude 问「加下一批，还是 archive？」，没得到同意就不调用 `update_project`。
- **habit vs project**：「I want to do two LeetCode problems a day」→ habit，不建 project；「I want to work through *Designing Data-Intensive Applications*, a chapter at a time」→ project，每章一个 step。
- **重叠**：已经有 Workout habit 时说「I want to bike more each week」→ Claude 问是扩展 Workout（`update_habit` 改 description，或 `update_plan` 改 frequency）还是新开一个 habit。
- **目标太大**：「I want to finish the biomedical certificate program」→ Claude 提议先把第一门课做成 project（10 步以内）；用户坚持要整个项目时，说明最多 50 步。
- **Focus**：已经有 3 个 habit、4 个 active project 时说「I want to start learning guitar」→ Claude 先说 focus 已经很满，建议先完成或 archive 一个。
- **Step 顺序**：请 Claude 给某个 project 加两个 step → 加在末尾，或在需要时插到前面，其余 step 的顺序不变。

**空账号**（可选）：用第二个 Google 账号登录、加 connector，说「Help me plan my week」→ Claude 先用两句话解释三种 kind，再起草一个小的第一周。

## Executable plan

一个 PR（M），分支 `claude/week-model-pr5-mcp-projects`，按下面的顺序 commit：

1. 类型、schema、错误信息、`PROJECT_STEP_LIMIT`。
2. `get_planning_context`：projects、archivedProjects、plan 的 `projectSteps`。
3. `create_plan` / `update_plan` 的 step 参数和校验（修掉发现 1）。
4. `applyStepPatch`；DAL 加 `tx` 和两个新函数；`projectPlanningService`；`create_project`、`update_project`。
5. Projects 页的拖动改用 `moveProjectStep`；50 步上限接进 `createProject` / `addProjectStep` 和 Add Step 的错误显示。
6. `update_habit`、`get_planning_guide_before_everything`；guide、tool descriptions、version。
7. 文档（见「文档」那张表），删 `mockup-projects-v2.html`，这份 spike 移到 `archived/`。

**Done when**：上面的 Inspector 清单全过；claude.ai 里跑通上面的对话；构建全绿。PR 5 合并后，Phase 1 MVP 完成（4d 也落地时，`week-model-restructure.md` 和 `week-model-pr4-projects-ui.md` 一起移到 `archived/`）。

## 风险

- **Claude 不调 guide 工具**：靠工具名、每个 description 开头那句和 server instructions（Claude Code）三层压住；验收逐段确认。
- **判断错 kind**：Claude 可能把有限清单建成 habit，或者反过来。靠收紧后的判断标准、例子，以及「不清楚就问」；验收里有一段专门测。
- **每周多一轮来回**（Q2 选 D）：回顾 + 问意图让排期慢一步。这是 owner 选的取舍。
- **Focus 阈值是暂定的**：3 / 4 只在 prompt 里，用一阵再在 Phase 2 定（tracker 有 prompt tuning 的条目）。
- **建 project 和排期之间不原子**（默认做法 10）：中间失败时 project 已经在、step 没排。Claude 重读 context 就能看到并补上。
- **拖动跨过 done step 时编号会变**（Q1 的 UI 部分）：以前不变。删除 step 时已经是这样，只是现在拖动也一样。
- **验收写进线上数据**：dev 和 prod 共用 Supabase。用测试 project，跑完 archive。
- **AI chat 审批仍然把 step 退回 project**：按设计（approved spike：AI chat 不改，Phase 2 移除），不在这个 PR 里动。

## Considered, not proposed · 考虑过但不提议

- **单独的 `schedule_steps` 工具**：approved spike 已经否掉，排期并进 plan 工具。
- **plan 工具加 `newProjects`**（Q5 的 B）：owner 选了 planning 和 scheduling 分开。
- **把 guide 放进 `get_planning_context` 的返回值**（Q6 的 C）：owner 选了单独的工具。
- **先发 hotfix**（Q4 的 B）：owner 选了在 PR 5 里修。
- **时间预算、并行上限的硬限制、habit / project 的 lifecycle（active / paused / completed）、habit 和 project 共用入口**：改的是产品定位和数据模型，不是 MCP；在 `design/spike/week-model-phase2-pain-points.md`（draft）。
- **`create_project` 带 `scheduleFirst: n`**：project 工具会去碰 plan，违反「先 plan 后 schedule」。
- **`delete_project`**：project 只能 archive，不做硬删除。
- **单独的 `get_projects` 读取工具**：context 多一次查询、几 KB，换来「先调 `get_planning_context`」这一条规则不变。
- **MCP 的 prompts / resources primitives**（比如一个「plan my week」的 prompt 模板）：超出 Phase 1。
- **对 plan form 的写入路径也加 step 校验**：见默认做法 12。

## 拍板之后

1. 开 PR 5（见 Executable plan）。之后的进度记在 tracker 的 Phase 1 条目下，这份 spike 不再更新。
2. PR 5 里实装完、文档更新完，这份 spike 移到 `design/spike/archived/`。
