# Spike: Week model Phase 1 · PR 5 — MCP for projects

**Status: awaiting owner review** · 2026-10-13 · 回答 tracker 条目 *Week model Phase 1 › PR 5*（Plan › Medium）· 上游：`design/spike/week-model-restructure.md`（approved，「PR 5 — MCP 支持 projects」一节）、`design/flows/projects.md`（Draft Steps with Claude (MCP) Flow）、`design/flows/plan.md`（Plan with Claude (MCP) Flow）· Mockups：`mockup-projects-v2.html` 的 tab 07、`mockup-week-model-phase1-v2.html` 的 06 Claude (MCP)。两段对话抄在本文「验收」一节，mockup 删掉以后也还在

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off、`create_project`、`instanceIndex` …），和代码、mockup、tracker 一一对应。**LLM 读的文字**（server instructions、tool descriptions、`.describe()`、错误信息）直接给英文成稿：这些就是要写进代码的原文。

## 一页看完 · Summary

| | 内容 |
| --- | --- |
| 新做 | 两个工具：`create_project`、`update_project`，加上它们的 service、schema 和错误信息 |
| 更新 | `get_planning_context` 加 `projects` / `archivedProjects` 和 plan 上的 `projectSteps`；`create_plan` 加 `carryOverProjectStepIds` / `addProjectStepIds`；`update_plan` 加 `addProjectStepIds` / `removeProjectStepIds`；server instructions 重写，tool descriptions 改 3 条、加 2 条 |
| Prompt | 三种 kind 怎么分（判断标准比 approved 的版本收紧了一点，见「Prompt」）、project 和 step 怎么写、怎么排进这周、All steps done 和 archive 的规则、写之前要告诉用户什么。成稿见「Prompt」一节 |
| 顺手修 | MCP 的 `create_plan` 现在会把上周没做完的 step **全部**退回 project（发现 1，Q4） |
| 待拍板 | 4 件，见「待拍板」：Q1 step 的位置怎么表达，Q2 排新一周时对 project 多主动，Q3 「其实是 project」的旧 template，Q4 发现 1 先发 hotfix 还是等 PR 5 |

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
| `projectService`（PR 3） | `createProject`（带 steps，一个 transaction）、`archiveProject`、单步的 add / update / delete / reorder | `create_project` 直接复用 `createProject`；`update_project` 要把多个操作放进一个 transaction，所以复用 DAL，不复用这些 service |
| `lib/db/projects.ts` | `getProjectsWithSteps`（一次查询，含 archived）、`createProjectSteps`、`linkProjectStepsToPlan`、`unlinkUnfinishedStepsByProjectId`、`renumberProjectSteps` | context 和校验都从 `getProjectsWithSteps` 在内存里算（AGENTS：小数据量一次查询 + 内存过滤） |
| `utils/projectUtils.ts`（PR 4c） | `getStepState`（`DONE` / `THIS_WEEK` / `LAST_WEEK` / `UPCOMING`）、`isAllStepsDone`、`assignStepNumbers` | step 的 `state` 直接用 `ProjectStepState` 的值，和 Projects 页同一套判断 |
| `Task.doneAt` | done 的时间 | context 里 done step 的 `doneOn` |

读代码时发现 3 件事：

1. **MCP 的 `create_plan` 现在会把上周没做完的 step 全部退回 project。** `createPlanFromSpec` 调 `createPlanFromEntries` 时没传 `projectStepIds`，`createPlanInTx` 把 `projectStepIds ?? []` 当成「带上哪些」，于是 pending plan 上所有没做完的 step 都被 unlink（`planId = null`、`BACKLOG`）。PR 4a 修了 plan form 的同一个问题，MCP 这条路径没修。不丢数据（step 回到 project 原位，「+ This week」能再排），但用户在 Claude 里建下周 plan 时 step 会悄悄离开这周。下一个跨周点是 **2026-10-19（周一，W43）**。见 Q4。
2. **`linkProjectStepsToPlan` 不检查 step 在不在别的 plan 上、project 有没有 archive。** Plan form 只渲染 pending plan 上的 step，所以没问题；但 MCP 收的是 LLM 传来的 id，必须在 `planningService` 里先校验（见各工具的「校验」）。
3. **`projectService` 返回 `{error: 'projectNotFound'}` 这种表单用的形状，不抛错**；单步操作各开各的 transaction，DAL 的 `updateProject` / `updateProjectStep` 没有 `tx` 参数。`update_project` 一个 patch 里有多个操作，要原子，所以要给这两个 DAL 函数加 `tx?`，在新 service 里组合。

---

## 改动一览 · Tools

| 工具 | 变化 | 一句话 |
| --- | --- | --- |
| `get_planning_context` | 改 | 加 `projects`（整条 path，每个 step 带 `state`）、`archivedProjects`（摘要）；`activePlan` / `lastPlan` 加 `projectSteps` |
| `create_project` | 新 | title + goal + 有序 steps，一个 transaction；回 project 和每个 step 的 `stepId` |
| `update_project` | 新 | patch：title、goal、archive / unarchive，steps 的 add / edit / move / remove；一个 transaction |
| `create_plan` | 改 | + `carryOverProjectStepIds`（不传 = 全部带上）、+ `addProjectStepIds`（UPCOMING 的 step）；修发现 1 |
| `update_plan` | 改 | + `addProjectStepIds`、+ `removeProjectStepIds`；结果的 `changes` 加两项 |

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
  // 新：archived 的只给摘要，用户要 unarchive 时用
  "archivedProjects": [{"projectId": "p0", "title": "Finance basics", "doneCount": 6, "stepCount": 6}]
}
```

- `state` 用 `getStepState` 算，值就是 `ProjectStepState`：`UPCOMING`（不在任何一周）、`THIS_WEEK`（在 activePlan 上）、`LAST_WEEK`（没做完、还挂在 lastPlan 上）、`DONE`。和 Projects 页同一个函数，两边永远一致。
- Board 上的状态（BACKLOG / TODO / DONE）只在 plan 的 `projectSteps` 里出现，project 的 step 上不重复。
- 实现：`getPlanningContext` 多一次 `getProjectsWithSteps`（和现有读取并行），projects、archived 摘要、两个 plan 的 `projectSteps` 都在内存里从这一次结果算出来。`getPlanContextByPlanId` 也被两个写工具的结果用，所以它自己取一次 projects（或者由调用方传入，实现时按代码量定）。
- `overall` 不变，仍然只统计 template instance。

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

### `update_project`（新）

**Input**（`projectPatchSchema`，形状取决于 Q1；下面是推荐的 Option B）：

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
2. 纯函数 `applyStepPatch(steps, patch)`（`utils/projectUtils.ts`，对应 plan 的 `applyTemplatePatch`）在内存里算出新 path 和 conflicts：先去掉 removed，再按顺序处理 moves，再按顺序插入 adds，最后整条 path 从 1 编号。有 conflict 就整个拒绝，什么都不写。
3. 写入：批量删 removed → 逐个改 updated → 插入新 step（带算好的编号）→ 一条 SQL 给现有 step 重新编号 → title / goal → 最后处理 `archived`（`true` 时同时把没做完的 step 退出这周，和 `archiveProject` 一样）。
4. 回 `{changes, project}`：`changes` 是 `addedSteps` / `updatedSteps` / `movedSteps` / `removedSteps`（`{id, title}`，和 `PlanChangeRef` 同形）加上 `archived?`；`project` 是改完的 `ProjectContext`。

**校验**（任何一条不过都整个拒绝，`PATCH_REJECTED` 包装，和 `update_plan` 一致）：

- 所有 `stepId` / `beforeStepId` 都是这个 project 的 step。
- updated / moved / removed 的 step 没有 DONE（done 锁定，和 UI 一样）。
- `beforeStepId` 必须是没做完、而且没被删掉的 step，也不能是被移动的那个 step 自己。
- 同一个 step 不能既被删又被改或移动；同一个 id 在同一个列表里不能出现两次。
- Project 已 archive：除非同一个 patch 里 `archived: false`，否则拒绝。

**编号**：整条 path（包括 done step）重新从 1 编号，没动过的 step 之间的先后不变。Done step 的编号可能跟着变（Projects 页的行和 board 卡片的 n/N 都会显示新编号）——这不是新规则：现在删除一个 step 时，`shiftStepsAfterIndex` 已经会把后面所有 step 的编号减一，包括 done 的。

**DAL**：`updateProject`、`updateProjectStep` 加 `tx?`；新增 `deleteProjectSteps(userId, projectId, stepIds, tx)`（批量，只删没做完的）和 `renumberProjectPath(userId, projectId, stepIds, stepNumbers, tx)`（同 `renumberProjectSteps` 的 `unnest` 写法，但不排除 done）。

**Annotations**：`destructiveHint: true`（删 step、archive）。

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

### 对 approved 判断标准的一处收紧（可否决）

approved spike 写的是「每次内容一样就是 habit，不一样就是 project step」。反例：「每天做 2 道 LeetCode」——每次题目不同，但它是 habit：没有终点，也没有一条要走完的清单。改成问两件事：

> **有没有一条有限、有序、能走完的清单，通向一个目标？** 有 → project，清单上的每一项是一个 step。没有（重复的练习，哪怕每次内容不同）→ habit。

下面的成稿按这个写。

### Server instructions（`src/mcp/prompts/serverInstructions.ts`，整段替换）

标了 `[Q2]` / `[Q3]` 的两行取决于对应问题的结论（这里写的是推荐选项），落代码时不带标记。

```text
Mars Workbench is the user's weekly kanban planner. These tools let you plan the user's week and their projects together with them.

# Workflow
1. Call get_planning_context first, every time you plan or change a plan or a project. It reflects today's date and catches the week up (a finished week's plan becomes lastPlan). Use only ids it returns or that a write just returned.
2. No activePlan: propose a new week and create it with create_plan. An activePlan: propose changes and apply them with update_plan, passing activePlan.planId. Projects can be created and changed with or without an activePlan.
3. Talk every proposal through with the user, and write only after they agree — create_plan, update_plan, create_project and update_project alike. Afterwards, tell them what changed.

# Three kinds of work
A week mixes three kinds of work:
- Habit: work that repeats with no end — a workout, flashcards, two coding problems a day. A habit is a reusable template that a plan runs DAILY or WEEKLY.
- Project step: one item on a finite, ordered list that leads to a goal — lesson 3 of a course, chapter 5 of a book. A project is that goal plus its path of steps; steps never expire and go onto a week a few at a time.
- One-off: a single task with nothing behind it. One-offs live on the user's priority matrix. These tools never create them; they only carry over or drop the ones attached to a plan.
To choose, ask: is there a finite list to get through? Yes → a project, one step per item. No → a habit, even if the content differs each time. "Three lectures a week from a 12-lecture course" is a project with 12 steps, 3 of them on this week — not a WEEKLY × 3 template.

# Habits
- A template is its title, description and size. Size sets effort and points: EXTRA_SMALL ~1h = 1 pt, SMALL ~2h = 2, MEDIUM ~3h = 3, LARGE ~5h = 5, EXTRA_LARGE ~8h = 8. Prefer SMALL to MEDIUM; split larger work into smaller templates.
- type and frequency are chosen per week, not part of the template: DAILY × n is n task instances every day; WEEKLY × n is n instances across the whole week. Frequency runs from 1 to 10. "Three times a week" is WEEKLY × 3, never DAILY × 3.
- mode: NORMAL generates daily instances on weekdays only; EXTREME every day, weekends included.
- Generated instances start in the user's backlog; the user pulls them onto the board.

# Projects
- Before creating a project, check projects for one that already covers the goal; extend it with update_project instead of creating a second one.
- create_project writes the whole path at once: ordered steps, each a title, a size (the same scale as templates) and an optional description — a link, notes, what done looks like. Keep each step to one sitting, EXTRA_SMALL to MEDIUM; split anything bigger into several steps.
- update_project renames a project, changes its goal, adds, edits, moves or removes steps, and archives or unarchives it. Done steps are locked.
- Writing a project schedules nothing. Put steps on the week with addProjectStepIds — in update_plan for this week's plan, in create_plan for a new one. Any UPCOMING step can go, in any order; it lands in the user's backlog. A step never expires: unfinished at the end of the week, it waits on lastPlan (state LAST_WEEK) until the next plan carries it over or sends it back.
- Every step has a state: UPCOMING (on no week), THIS_WEEK (on activePlan), LAST_WEEK (unfinished on lastPlan), DONE. Its board status is in the plan's projectSteps.
- A project with allStepsDone: true has nothing left to do but stays open. When you plan a week, or when the user brings it up, ask whether to add its next steps or archive it.
- Archiving is the user's decision. Archive only when the user asks for it or says yes to that question — never on your own, never to tidy up. Archiving takes the project's unfinished steps off the week.

# Planning well
- Reuse existing templates (by templateId) instead of creating near-duplicates; create a new template only when nothing fits. Never invent or alter an id.
- [Q2] When you plan a new week, include each active project in the proposal: carry over its LAST_WEEK steps and add its next UPCOMING steps, as many as last week's pace supports. The user trims from there. Mid-week, add steps only when the user asks.
- [Q3] If a template in lastPlan or activePlan is really a project (a finite list run as a WEEKLY habit, like "Biomedical lecture"), suggest once making it a project with its real steps and dropping the template from the next plan. Don't press if the user declines.
- Calibrate with lastPlan: a low completionRate or many expired instances means the user over-committed, so ease the frequency or drop the template; a high completionRate leaves room to add. Unfinished project steps on lastPlan say the same about projects. The user's stated goals override the stats.
- Keep the load realistic for the days left in the week, counting project steps' points along with the habits'.

# Tell the user before writing
- create_plan completes lastPlan and moves its unfinished one-off tasks and project steps into the new plan — all of them unless carryOverAdhocTaskIds or carryOverProjectStepIds narrows it. The rest go back: one-offs to the priority matrix, steps to their project, in the same place.
- update_plan: removing a template, or changing its type or frequency, deletes that template's unfinished instances (backlog, to-do) and regenerates them in the backlog; completed tasks are kept. Removing a one-off sends it back to the priority matrix; removing a project step sends it back to its project, in the same place, out of the user's to-do.
- update_project: removing a step deletes it and the steps after it move up; if it was on this week, it leaves the board too. Archiving takes every unfinished step of the project off the week; unarchiving brings the project back, not its steps' places on the week.
```

和现在这一版比：

| 段落 | 变化 |
| --- | --- |
| 开头、Workflow | 「plan」扩成「plan 和 project」；第 3 条把 4 个写工具都列出来；ids 可以来自写入的结果（`create_project` 回的 `stepId` 要交给 `update_plan`） |
| Three kinds of work | 新段。判断标准（收紧后的版本）+ approved spike 里 Biomedical 的例子换成通用说法；one-off 那句从旧的 How a plan works 挪过来 |
| Habits | 旧 How a plan works 的内容，原样保留 |
| Projects | 新段。写法（一次写整条 path、step 的大小、description 的用途）、排期只走 plan 工具、step 的 state、All steps done 和 archive 的规则（approved spike 留到这个 PR 定稿的部分） |
| Planning well | 加 Q2、Q3 两条；calibrate 和 load 两条把 step 算进去 |
| Tell the user before writing | create_plan 和 update_plan 加上 step 的去向；新增 update_project 一条 |

### Tool descriptions（`src/mcp/prompts/toolDescriptions.ts`）

```ts
export const TOOL_DESCRIPTIONS = {
  GET_PLANNING_CONTEXT:
    "Read what you need to plan the user's week and projects in Mars Workbench: today's date and week; this week's active plan (its templates with type, frequency and progress so far, plus the one-off tasks and project steps on it); last week's finished plan with per-template completion stats, its project steps (done, and unfinished ones that can carry over) and the one-off tasks that carry over; the user's reusable templates; and their projects, each with its goal, progress and whole path of steps. Call it first whenever you plan or change a plan or a project — the ids the other tools take come from here.",
  CREATE_PLAN:
    "Create this week's plan — only when get_planning_context shows no activePlan. Run existing templates by templateId in `templates`, add brand-new ones in `newTemplates`, and put UPCOMING project steps on the week with `addProjectStepIds`. Completes lastPlan and moves its unfinished one-off tasks and project steps into the new plan (all of them by default). Task instances and steps land in the user's backlog. Agree on the plan with the user before calling.",
  UPDATE_PLAN:
    "Change this week's active plan; only what you pass changes. Removing a template, or changing its type or frequency, deletes that template's unfinished task instances (backlog, to-do) and regenerates them in the backlog; completed tasks are never touched. `addProjectStepIds` puts UPCOMING project steps in the backlog; `removeProjectStepIds` sends steps back to their project. Agree on the change with the user before calling.",
  CREATE_PROJECT:
    "Create a project: a goal reached through a finite, ordered path of steps, such as a course or a book (repeating work with no end is a habit template instead). Give its title, an optional goal and its steps in order, each with a title, a size and an optional description. Returns the project with every step's stepId, in order. Schedules nothing: put steps on the week with update_plan or create_plan. Agree on the project and its steps with the user before calling.",
  UPDATE_PROJECT:
    "Change a project; only what you pass changes. Rename it or change its goal; add steps (at the end, or before a given step); edit, move or remove steps that aren't done; archive or unarchive it. Done steps are locked. Removing a step deletes it, and takes it off the board if it is on this week. Archiving takes every unfinished step off the week — archive only when the user asks. Agree on the change with the user before calling.",
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

// create_project
title: "The project's name, e.g. 'Spanish A1'",
goal: 'What finishing the project means, in one sentence',
steps: 'The path in order, step 1 first',
'steps[].title': "What this step covers, readable on its own, e.g. 'Lesson 3 — Ordering food'",
'steps[].description': 'A link, notes, or what done looks like',
'steps[].size': 'Effort: EXTRA_SMALL ~1h, SMALL ~2h, MEDIUM ~3h, LARGE ~5h, EXTRA_LARGE ~8h', // 复用现有的 size 说明

// update_project
projectId: 'A projectId from get_planning_context',
title: 'A new name',
goal: 'A new goal; an empty string clears it',
archived: 'true archives the project — only when the user asks; false unarchives it',
addSteps: 'New steps, in order',
'addSteps[].beforeStepId': 'Insert the new step right before this step; omit to add it at the end of the path',
updateSteps: 'A new title, description or size for steps that are not done',
moveSteps: 'Steps that are not done, moved to a new place in the path',
'moveSteps[].beforeStepId': 'Move the step right before this one; omit to move it to the end',
removeStepIds: 'Steps that are not done, to delete',
```

### 错误信息（`src/utils/errorMessages.ts` 的 `PLANNING_ERROR`）

每条都说清楚哪里错、该怎么做；patch 类的错误继续用 `PATCH_REJECTED` 包起来（「No changes were made. …」）。

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

// update_project
PROJECT_NOT_FOUND: (projectId: string) =>
  `Project not found: ${projectId}. Use a projectId from get_planning_context.`,
PROJECT_ARCHIVED: (projectId: string) =>
  `Project ${projectId} is archived. To change it, unarchive it in the same call (archived: false) — only if the user asked.`,
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

| 文件 | 新 / 改 | 内容 |
| --- | --- | --- |
| `src/mcp/tools/createProject.ts` | 新 | `create_project`：schema + annotations → `projectPlanningService.createProjectFromSpec` |
| `src/mcp/tools/updateProject.ts` | 新 | `update_project` → `projectPlanningService.patchProject` |
| `src/mcp/registerTools.ts` | 改 | 注册两个新工具 |
| `src/mcp/constants.ts` | 改 | `MCP_SERVER_INFO.version` 0.3.0 → 0.4.0 |
| `src/mcp/prompts/serverInstructions.ts` | 改 | 整段替换（成稿见上） |
| `src/mcp/prompts/toolDescriptions.ts` | 改 | 改 3 条，加 2 条 |
| `src/schemas.ts` | 改 | `planSpecSchema` +2 字段；`planPatchSchema` +2 字段和 refine；新 `projectSpecSchema`、`projectPatchSchema`（step 字段复用 `projectStepInputSchema`） |
| `src/services/planningService.ts` | 改 | context 加 projects / archivedProjects / `projectSteps`；`createPlanFromSpec`、`patchActivePlan` 加 step 校验，算出整份 `projectStepIds` 传下去；修发现 1 |
| `src/services/projectPlanningService.ts` | 新 | `createProjectFromSpec`、`patchProject`（一个 transaction，抛 `PlanningError`）。不塞进 `planningService.ts`：那个文件已经 392 行，加上 context 和 step 参数会到 500 多 |
| `src/utils/projectUtils.ts` | 改 | 纯函数 `applyStepPatch`（新 path + conflicts，对应 `applyTemplatePatch`）、`toProjectContext`（project + steps + activePlanId → `ProjectContext`，用 `getStepState`） |
| `src/lib/db/projects.ts` | 改 | `updateProject`、`updateProjectStep` 加 `tx?`；新增 `deleteProjectSteps`、`renumberProjectPath` |
| `src/utils/errorMessages.ts` | 改 | 见上 |
| `src/types/plan.ts` | 改 | `ProjectContext`、`ProjectStepContext`、`ArchivedProjectSummary`、`PlanProjectStepSummary`；`PlanContext.projectSteps`；`PlanningContext.projects` / `archivedProjects`；`PlanPatchResult.changes` +2；`ProjectPatchResult` |
| `src/mcp/middleware/runTool.ts` | 不改 | project 工具也抛 `PlanningError` |

没有 migration，没有 UI，没有 i18n（全是 LLM 读的文字），Design Console 不动。

### 文档

| 文档 | 改什么 |
| --- | --- |
| `design/flows/plan.md` | Plan with Claude (MCP) Flow：把 *Projects (designed — Phase 1 pending, PR 5)* 那一块并进 Steps / Rules；参数名换成 `addProjectStepIds` |
| `design/flows/projects.md` | 顶部 Status 去掉 MCP 的 pending；Draft Steps with Claude 的第 3、4 步写上 `beforeStepId` 和 `addProjectStepIds`，Rules 加上 Q2 的结论 |
| `design/baseline.md` | *Designed: Phase 1* 一节去掉第 2 条（MCP for projects）；如果 4d 已经把整节收掉，就不用改 |
| `design/reference.md` | MCP 表加 2 行、改 3 行；Services 加 `projectPlanningService.ts`；DAL 加 `deleteProjectSteps`、`renumberProjectPath` |
| `README.md` | Current State 的 *Plan with Claude (MCP)* 改成一行：Claude 也能起草 project、把 step 排进这周；Update Log 追加 |
| `design/tracker.md` | 删 PR 5 那条 sub-bullet；如果 4d 也已落地，parent 一起删 |
| `design/mockup/future-work/mockup-projects-v2.html` | 删（PR 4 spike 的 Q4 已定） |

---

## 默认做法 · 可以逐条否决

1. **参数名用 `addProjectStepIds`**，`create_plan` 和 `update_plan` 对称；不用 flows 里写的 `projectStepIds`。原因：plan form 的 `projectStepIds` 是「整份选择」，MCP 这个是「新加的」，同名不同义会混。
2. **context 给每个 project 的整条 path**，done 的也给（带 `doneOn`），不只是「接下来几步」。`update_project` 的 edit / move / remove 要 id，起草下一批 step 时要知道做过什么。一条 40 步的 path 大约 6 KB，可以接受。
3. **Archived project 只给摘要**（id、title、done / total），用户要 unarchive 时用。
4. **project 的 step 上只有 `state`，不重复 board status**；board status 在 plan 的 `projectSteps` 里。
5. **对 LLM 叫 `stepNumber`**（= `instanceIndex`），不暴露 `instanceIndex` 这个名字。
6. **`create_project` 一次最多 50 个 step**（zod `.max(50)`），控制 payload；更长的 path 用 `update_project` 分批加。
7. **对 archived project 的 patch 整个拒绝**，除非同一个 patch 里有 `archived: false`。
8. **archive 和别的改动在同一个 patch 里时，先改，最后 archive。**
9. **`update_project` 对 THIS_WEEK 的 step 和 UI 一样**：能改，能删（删了 board 上也没了）；DONE 锁定。
10. **`create_project` 不排期**（approved：排期只走 plan 工具）。「建 project + 排前两步」是两次写入，不原子；第二次失败时 project 已经在了，Claude 重读 context 再排就行。
11. **一个 patch 里有任何问题就整个拒绝、什么都不写**，用 `PATCH_REJECTED` 把所有问题一起报出来，和 `update_plan` 一致。
12. **Plan form 的写入路径不加同样的校验**：它只能写本人的 step，不是安全问题。MCP 的校验放在 `planningService`，因为 LLM 会传错 id。
13. **`overall` 不混入 step**，仍然只统计 template instance；step 的结果看 `projectSteps` 的 status。
14. **不建同名 project 的保护只写在 prompt 里**（「先看有没有已经覆盖这个目标的 project」），server 不拒绝同名——UI 也允许同名。

---

## 待拍板 · Open questions

### Q1 · `update_project` 里 step 的位置怎么表达

用户会说「在第 4 课后面加一次复习」「把 Lesson 6 挪到最后」。Projects 页拖动时发的是「全部未完成 step 的新顺序」（`reorderProjectSteps`）。

| | 形状 | 好处 | 代价 |
| --- | --- | --- | --- |
| **A** · 追加 + 整份顺序 | `addSteps` 只能加在末尾；`reorderStepIds` 列出所有未完成 step 的新顺序 | 复用 `reorderProjectSteps` 的语义和校验，新代码最少 | 在中间插一步要调两次（先加，拿到 id 再排），不原子；Claude 要把每个未完成 step 都列一次，30 步的 path 漏一个就是 `stepOrderMismatch`；参数看不出到底动了哪一步，不好向用户复述 |
| **B** · 锚点 ✓ | `addSteps[].beforeStepId`、`moveSteps[{stepId, beforeStepId?}]`；不给锚点 = 末尾 | 一次调用、原子；参数就是意图（「Quiz 插在 Lesson 5 前」）；只传变化的部分 | 新的纯函数 `applyStepPatch`（约 50 行）和一个包括 done 在内的整条 path 重编号 |
| **C** · 声明整条 path | `steps`：完整的未完成 step 列表，已有的带 id，新的不带，没列的删除 | 一种形状覆盖所有操作 | 漏写一行就删掉一个 step；每次都要回传所有 title，容易被悄悄改写；不是 approved 的 patch 形式 |

**实现**：A 在 `patchProject` 里先加后排，复用 `assignStepNumbers`。B 见上文「`update_project`」。C 要 diff 新旧列表，删除判定靠缺席。

**推荐 B。** 锚点用 `beforeStepId`，不用 `afterStepId`：「不给 = 末尾」和「插到某一步前面」两种就能表达所有位置，不需要用 `null` 表示「最前面」，避免「省略」和「null」两种含义混淆。

### Q2 · 排新一周时，Claude 对 project 有多主动

所有写入都要用户同意，所以问题是 Claude 的**提案**里默认有没有 project 的 step。

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 被动 | 只有用户提到某个 project，才排它的 step | 最不意外 | project 靠用户记着才会动；用 project 就是为了稳步推进，这个选项让它停在原地 |
| **B** · 默认带上 ✓ | 新一周的提案里，每个 active project 带上 LAST_WEEK 的 step 和接下来的 UPCOMING step，数量按上周的节奏定；用户删减 | project 自然往前走；和 carry-over「默认全带上」一致；用户只需要删 | 提案变长；可能排得太满——靠 calibrate 那条规则压住 |
| C · 列出来问 | 列出 active project，问这周推进哪几个 | 用户明确选 | 每周多一轮来回 |

三个选项在周中都一样：只有用户要求才加 step。

**实现**：只差 prompt 的 `[Q2]` 那一行（A：删掉这行，加一句「Schedule a project's steps only when the user asks」；C：改成「list the active projects and ask which to move this week」），代码相同。

**推荐 B。**

### Q3 · 「其实是 project」的旧 template

approved spike 的风险一节：Biomedical course 这类按 WEEKLY 跑的 template，其实是一条有限的清单，「下周不再选就行，不做自动迁移」。问题是 Claude 要不要提醒。

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| **A** · 提一次 ✓ | 只看 lastPlan / activePlan 里的 template；像有限清单的，建议一次转成 project（建 project + 下周不选这个 template），用户拒绝就不再提 | 旧数据会慢慢迁过来；不是自动迁移，用户决定 | 判断可能出错（尤其判断标准收紧之前）；可能显得啰嗦 |
| B · 不提 | 用户自己问才转 | 不打扰 | 旧 template 会一直以 habit 的方式跑，进度点和 project 的 path 都对不上 |

**实现**：A 是 prompt 的 `[Q3]` 那一行；B 删掉这行。不迁移历史数据（template 的 instance 留在原来的 plan 上）。

**推荐 A。**

### Q4 · 发现 1：先发 hotfix，还是等 PR 5

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · PR 5 里修 | 作为 PR 5 的第一个 commit。合并之前，跨周建 plan 用 app 里的 plan form（它会正确带上 step） | 少一个 PR | 这份 spike 先要 review，PR 5 大概率赶不上 10-19 的跨周；在那之前用 Claude 建 plan，step 会悄悄退回 project |
| **B** · 先发 hotfix ✓ | 一个小 PR：`createPlanFromSpec` 把 `getCarryOverProjectStepIds` 的结果作为 `projectStepIds` 传下去（默认全部带上，不加参数），server instructions 的 create_plan 那句加上「and project steps」。PR 5 再加 `carryOverProjectStepIds` | 10 行左右；「默认全带上」在 approved spike 里已经定了，没有设计问题；不管 PR 5 什么时候合，这个坑都先填上 | 多一个 PR；prompt 在 PR 5 里还会整段重写 |

**推荐 B。**

---

## 验收 · Verification

### Inspector CLI（本地 Postgres，`MCP_DEV_USER_ID`）

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:3000/api/mcp --transport http --method tools/call --tool-name <tool> --tool-arg <key>=<value>
```

逐条跑，每条之后查 DB：

1. `tools/list`：5 个工具，description 和 schema 是新的。
2. `create_project`（8 个 step）→ 编号 1–8，全部 `planId = null`、`BACKLOG`；`get_planning_context` 里 8 个都是 `UPCOMING`。
3. `update_plan` `addProjectStepIds: [s1, s2]` → 两个 step 进这周的 backlog；context 里变成 `THIS_WEEK`，`activePlan.projectSteps` 有它们。
4. `update_project`：`beforeStepId` 插一步、`moveSteps` 挪一步、改一步、删一个 THIS_WEEK 的 step → 编号连续；被删的 step 不在 board 上了。
5. `update_project` `archived: true` → 没做完的 step 都离开这周；`archivedProjects` 里有它；再 `archived: false` 恢复，step 全部是 `UPCOMING`。
6. 模拟跨周（把 active plan 的 `periodKey` 改成上一周，下一次 `ensureSynced` 会把它翻成 `PENDING_UPDATE`）→ `create_plan` 不传 `carryOverProjectStepIds` → 没做完的 step 全部带上，状态不变；再来一次传 `[]` → 全部退回 project，编号不变。
7. 每条错误路径（错的 projectId、DONE step、archived project、把 LAST_WEEK step 放进 `addProjectStepIds`、两个列表重叠、锚点是被删的 step …）都返回 `isError`、信息可读，而且 DB 没变。
8. 用户隔离：第二个用户的 id 全部报 not found。
9. `tsc`、`lint`、`format:check`、`check:themes`、`build` 全绿。

### Claude 里的对话

Claude 连不上 localhost，所以在 preview deployment 上跑（preview 接受 token）。注意 preview 和本地开发都连线上的 Supabase（tracker 里有「Separate dev environment」一条），对话写进的是真实数据：用一个测试 project，跑完 archive。

**对话 1**（来自 `mockup-projects-v2.html` tab 07）：

> You：Set me up a Spanish A1 path, two short lessons a week.
> Claude：`get_planning_context` → 提议 **Spanish A1**，8 课，每课约一小时，Lesson 1–2 排这周。「Shall I set it up?」
> You：Yes.
> Claude：`create_project({title: "Spanish A1", goal, steps: [8 lessons]})` → `update_plan({planId, addProjectStepIds: [L1, L2]})`
> 结果：Projects 页最上面是 Spanish A1，整条 path，前两步在这周。

**对话 2**（来自 `mockup-week-model-phase1-v2.html` 06 Claude (MCP)，跨周）：

> You：I want three days this week for a biomedical course, about an hour each. Find me a good intro series.
> Claude：`get_planning_context` → 提议 **Biomedical course**，12 讲的系列，每讲带链接，Lecture 1–3 排这周。
> You：Go.
> Claude：`create_project({title: "Biomedical course", goal: "Finish the 12-lecture intro series", steps: [12 lectures]})` → `update_plan({planId, addProjectStepIds: [L1, L2, L3]})`
> *下周一*
> Claude：`get_planning_context` → lastPlan：Biomedical 做完 2 讲，Lecture 3 没做完。提议带上 Lecture 3、加 Lecture 4–5，同意后 `create_plan({templates, carryOverProjectStepIds: [L3], addProjectStepIds: [L4, L5]})`

**再加两段**，覆盖这个 PR 新定的 prompt：

- **All steps done**：把一个测试 project 的 step 全部拖到 Done，然后请 Claude 排下周 → Claude 问「加下一批，还是 archive？」，没得到同意就不调用 `update_project`。
- **habit vs project**：「I want to do two LeetCode problems a day」→ Claude 用 template（DAILY × 1 或 × 2），不建 project；「I want to work through *Designing Data-Intensive Applications*, a chapter at a time」→ Claude 提议建 project，每章一个 step。

## Executable plan

一个 PR（M），按下面的顺序 commit（如果 Q4 选 B，第 3 步的修复已经先发了）：

1. 类型、schema、错误信息。
2. `get_planning_context`：projects、archivedProjects、plan 的 `projectSteps`。
3. `create_plan` / `update_plan` 的 step 参数和校验（修掉发现 1）。
4. DAL 加 `tx` 和两个新函数；`applyStepPatch`；`projectPlanningService`；两个新工具。
5. Server instructions、tool descriptions、version。
6. 文档（见「文档」那张表），删 `mockup-projects-v2.html`。

分支名：`claude/week-model-pr5-mcp-projects`。

**Done when**：上面的 Inspector 清单全过；Claude 里跑通 4 段对话；构建全绿。PR 5 合并后，Phase 1 MVP 完成。

## 风险

- **判断错 kind**：Claude 可能把有限清单建成 habit，或者反过来。靠收紧后的判断标准、例子和 tool description 里重复的一句压住；验收里有一段专门测。
- **提案排得太满**（Q2 选 B 时）：每个 project 都往这周塞 step。靠 calibrate 规则和「数量按上周的节奏」压住，用户也能删。
- **建 project 和排期之间不原子**（默认做法 10）：中间失败时 project 已经在、step 没排。Claude 重读 context 就能看到并补上。
- **验收写进线上数据**：dev 和 prod 共用 Supabase。用测试 project，跑完 archive。
- **AI chat 审批仍然把 step 退回 project**：按设计（approved spike：AI chat 不改，Phase 2 移除），不在这个 PR 里动。

## Considered, not proposed · 考虑过但不提议

- **单独的 `schedule_steps` 工具**：approved spike 已经否掉，排期并进 plan 工具。
- **`create_project` 带 `scheduleFirst: n`**，建完直接排前 n 步：建和排就原子了，但 project 工具会去碰 plan，排期也就有了两个入口。
- **`delete_project`**：project 只能 archive，不做硬删除。
- **单独的 `get_projects` 读取工具**：context 多一次查询、几 KB，换来「先调 `get_planning_context`」这一条规则不变。
- **MCP 的 prompts / resources primitives**（比如一个「plan my week」的 prompt 模板）：超出 Phase 1。
- **对 plan form 的写入路径也加 step 校验**：见默认做法 12。

## 批准之后

1. 按拍板结果改写「Prompt」里 `[Q2]` / `[Q3]` 两行和 Q1 的 schema；如果 Q4 选 B，先开 hotfix PR。
2. 开 PR 5。之后的进度记在 tracker 的 Phase 1 条目下，这份 spike 不再更新。
