# Spike: Week model restructure — habits · projects · one-offs

**Status: awaiting owner review** · 2026-10-08 · Mockup: `design/mockup/future-work/temp-week-model-v2.html` · PR #47

> 语言约定：沿用 daily-rhythm spike 的写法——叙述用中文，产品名词、状态、代码标识保留英文（habit / project / one-off / backlog / Today …），和代码、mockup、tracker 里的叫法一一对应。

## Trigger · 起因

PR #47 的 exploration 把一周的工作拆成三种：**habit**（固定节奏，按周计数）、**project**（目标 + 有序 steps，不过期）、**one-off**（priority matrix）。Owner review 的结论：

- **认可**：三分法、去掉 Doing、kind-first 卡片（habit / project 左下角的进度信号）、Plan week 三步流程。
- **问题**：一次迈得太大，要拆成能独立上线的小步。
- **移出本轮 scope**，记进 tracker：per-kind risk rules（现有 risk 先关掉）、daily rhythm 仪式（Open / Close the day）。
- **待回答**：project 用什么 entity、migration 多大；Todo 改什么名；backlog 堆叠做不做。

这份 spike 回答这三个问题，给出一个 8 个 PR 的执行序列，最后列出待拍板的事。

## Scope · 本轮做什么

| In scope（按 PR 顺序） | Out of scope（已记进 tracker） |
| --- | --- |
| Board 只留两列（Today · Done），去掉 Doing | Per-kind risk rules——现有 risk 在 PR 1 直接关掉 |
| 关掉现有 risk（badge、边框、15:00 / 20:00 时钟阈值） | Daily rhythm：Open / Close the day 和通知 |
| Kind-first 卡片、habit 进度点、Done 改成日志行 | Backlog 堆叠（PR #44）和按 kind 分组的标题 |
| Habit 漏掉的那天安静过期（去掉 rollover） | |
| One-off 可选 due date（只显示，不变色） | |
| Projects：entity、页面、上 board、MCP | |
| Habit 自带 cadence，加 Habits 页 | |
| Plan week 三步规划 | |

## Q1 · Project 用什么 entity？migration 有多大？

### 先看 step 的生命周期

一个 project step 的生命周期和现在的 one-off（`AD_HOC`）几乎一样，和 template instance 却不一样：

| | template instance（`DAILY` / `WEEKLY`） | one-off（`AD_HOC`） | project step |
| --- | --- | --- | --- |
| 内容 | 从 template 复制，彼此相同 | 各不相同 | 各不相同 |
| 怎么产生 | sync 按 frequency 生成 | 用户在 matrix 里建 | 用户或 Claude 在 project 里写 |
| 不属于任何一周时 | 不存在 | `planId = null`，在 matrix 上 | `planId = null`，在 project 里排队 |
| 进入一周 | 建 plan 时生成 | Track this week，或建 plan 时带上 | 规划时选「这周推进 N 步」 |
| 周末没做完 | `EXPIRED` | 不过期；下一个 plan 带上，或退回 matrix | 不过期；下一个 plan 带上，或退回 project |

所以关键问题不是「project 像不像 template」，而是 **step 应该复用 one-off 的生命周期**。这套生命周期在现有代码里已经齐了：`expireAllNonDoneTasks` 跳过 `AD_HOC`，`updateTasksPlanId` 把任务挂到 plan，`unlinkAdhocTasksFromPlan` 把没选的退回池子，DONE 的任务保留 plan 归属（points 历史不丢）。

### 三个选项

| 选项 | 做法 | Pros | Cons |
| --- | --- | --- | --- |
| **A. 复用 TaskTemplate** | `TaskTemplate` 加 `kind`（HABIT / PROJECT）；step 是 `templateId` 指向它的 Task | 不加表 | template 的语义是「生成相同的实例」，project 什么都不生成。所有读 template 的地方都得按 kind 过滤：`getTaskTemplates` 的 4 个调用方（新建 / 编辑 plan 页、MCP context、AI chat），2 个建 template 的写入点（template modal，以及建 plan 时带上新 template 的 `resolvePlanEntries`——MCP 和 AI chat 审批都走这里），还有 PlanTemplate 校验——project 一旦进了 PlanTemplate，sync 会按 frequency 生成带 project 标题的副本。step 的 `templateId` 还会混进 `getPlanTemplateStats`，以及 `deleteIncompleteTasksByTemplateIds`（`update_plan` 移除 template 时会把 step 一起删掉）。`size` 是 NOT NULL，对 project 没有意义。漏掉一处就是数据 bug |
| **B. 新 `Project` 表，step 就是 Task** ✅ | 新表 `projects`；`TaskType` 加 `PROJECT`；`Task` 加 `projectId`、`position` | 现有 template 路径一处不用改；step 是普通 Task，board、points、Done、拖拽都直接能用；生命周期照搬 one-off；migration 全是加法 | 一张新表加一套 DAL / service / action；新的 `PROJECT` type 要在几个地方显式处理（下面列出） |
| C. 新 `Project` + 独立 `ProjectStep` 表 | step 单独存，排进一周时复制成 Task | step 和 task 概念最分离 | 同一件事存两份，状态要来回同步（Task 做完要写回 step）；等于把生命周期再实现一遍 |

**建议 B。** project 不是 template 的一种，step 也不是 template 的实例；step 是「有归属、有顺序的 one-off」。

### Migration 有多大

不大，而且**全是加法**：不改现有数据，不需要 backfill。

```sql
-- migration 1（单独一个文件：Postgres 的新 enum 值在提交前不能被使用）
ALTER TYPE "TaskType" ADD VALUE 'PROJECT';

-- migration 2
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  goal        text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ADD COLUMN project_id uuid REFERENCES projects(id);  -- 不级联删除：做完的 step 带着 points 历史
ALTER TABLE tasks ADD COLUMN position int;                             -- step 在 project 内的顺序
CREATE INDEX idx_tasks_project_id_position ON tasks (project_id, position);
```

Project 不做硬删除，只 archive。`TaskType` 现在表达的是「这个任务是怎么来的」：`DAILY` / `WEEKLY` 由 template 生成，`AD_HOC` 手动建。加一个 `PROJECT` 正好延续这个语义。kind 可以从 type 推出来，Task 上不需要单独的 kind 列：

| UI 里的 kind | DB 里的 `TaskType` |
| --- | --- |
| habit | `DAILY` · `WEEKLY` |
| project step | `PROJECT`（新增） |
| one-off | `AD_HOC` |

真正的工作量在代码，不在 schema。`PROJECT` 需要显式处理的地方：

- `expireAllNonDoneTasks`：周末不 expire `PROJECT`（和 `AD_HOC` 一样）。
- 建 plan 时的 carry-over / unlink：把 `unlinkAdhocTasksFromPlan` 推广到 `AD_HOC + PROJECT`，没被选中的 step 退回 project（`planId = null`）。
- `getBoardMetricsByPlanId`：这是按 daily / weekly / adhoc 分桶的 raw SQL，要加一个 project 桶。
- `Record<TaskType, …>` 类的映射（i18n `Enums.TaskType`、排序）：TypeScript 编译时会把漏掉的地方全部报出来。
- 不用改：matrix 的查询本来就按 `type = AD_HOC` 过滤，step 不会漏进 matrix；`getPlanTemplateStats` 按 `templateId` 分组，step 没有 templateId，不会混进统计。

整个重构一共 4 个小 migration，分散在不同的 PR 里（见下面的执行序列），没有一个是破坏性的。删旧东西（`DOING` enum 值、`Plan.mode`）集中放在最后的 cleanup PR。

### 现有那些「其实是 project」的 template

Biomedical course、Protein 3D visualizer 这类 WEEKLY template 不做自动迁移。下一周规划时不再选它们，改在 Projects 页或通过 Claude（MCP）建成 project 就行。历史数据和统计保持原样。

## Q2 · Todo 叫什么

去掉 Doing 以后，这一列的意思就是「今天要做的」。

| 名字 | 说明 |
| --- | --- |
| **Today** ✅ | 最直白；和 dashboard 现有的 Today ring 对得上；mobile 上也短 |
| Focus | 不承诺日期，暗示「只挑几件」；但和 daily-rhythm spike 里的 focus 星标重名 |
| Up next | 中性，但没说是今天 |
| On deck | 有意思，但不符合「clear and boring」 |

**建议用 Today**。Done 保留原名，加副标题「this week」。只改显示文案（`en.json`），DB 里的 `TaskStatus.TODO` 不动。

连带一个问题：daily rhythm 不在本轮 scope，所以没有 Close the day 来清空 Today。没做完的 weekly habit、step、one-off 第二天会**留在 Today**；daily habit 则按新规则当晚安静过期。语义上说得通（「还是打算今天做」），但需要一个把卡片放回去的动作。现在 `KanbanBoard` 不允许拖回 backlog（`destination.droppableId === BACKLOG` 时直接 return）。**建议在 PR 1 放开 Today → Backlog**（非 DONE 的卡片），作为 Not today 的最小替代。

## Q3 · Backlog 要不要堆叠

**建议 park。**

- **Habit**：堆叠只对 frequency > 1 的相同实例有意义。PR #44 已经实现了（按 `templateId + forDate` 分组，纯前端），但它是在旧 `TaskCard` 上做的（拆出了 `TaskCardFace`），而 PR 2 会重写卡片面。现在合并，堆叠卡面就要做两遍。PR 2 落地后，把 #44 的分组逻辑、×N chip 和 lips 移到新卡片上，是一个小 follow-up。
- **Project**：不需要堆叠，每个 step 都不同。#44 的分组 key 对没有 `templateId` 的任务直接用 `task.id`，所以 step 和 one-off 天然不会被叠到一起，以后合 #44 也不用为 project 改任何东西。
- **按 kind 分组的标题**（mockup 里 backlog 的 Habits / Project steps / One-offs）也一起 park。现有的 `sortTasks` 已经按 type 排序，同类卡片本来就挨在一起，新卡片的 kind 色条也足够区分。

## Q4 · Plan

Mockup 里的 Plan week 作为目标不变：三步（habit 保留或跳过 → 每个 project 推进几步 → 从 matrix 挑 one-off），右侧显示容量参考。它依赖 habit 自带 cadence（PR 6）和 project（PR 4），所以排在序列靠后（PR 7）。Habits 页和 Projects 页放在 Plan 下的 hub（Week · Habits · Projects）里，dock 保持 5 个 tab。

## 改完之后的数据模型

```prisma
enum TaskType { DAILY WEEKLY AD_HOC PROJECT }      // + PROJECT（PR 4）

model Project {                                     // 新表（PR 4）
  id, userId, title, goal String?, isArchived, createdAt, updatedAt
  tasks Task[]
}

model TaskTemplate {                                // UI 里叫 habit；表名不改
  …title, description, size, isArchived
  cadenceType TaskType?   // DAILY | WEEKLY：habit 的默认节奏（PR 6）
  frequency   Int?
  everyDay    Boolean @default(false)  // DAILY：每天 or 工作日，取代 Plan.mode（PR 6）
  isPaused    Boolean @default(false)
}

model PlanTemplate {                                // 仍是每周快照：生成、统计、update_plan 都照旧读它
  …type, frequency
  everyDay Boolean @default(false)                  // PR 6
}

model Task {
  …
  projectId String?            // PROJECT step 属于哪个 project（PR 4）
  position  Int?               // step 的顺序（PR 4）
  dueDate   DateTime? @db.Date // AD_HOC 的可选截止日（PR 3）
}
```

PlanTemplate 继续作为每周的快照，habit 的默认 cadence 只负责预填它。这样 sync 的生成逻辑、统计、`update_plan` 的语义都不用动，PR 6 就能保持小。

## Executable plan · PR 序列

| # | PR | 用户能看到的变化 | Schema | 大小 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| 1 | Board 两列 + 关掉 risk | Doing 消失，Todo 改名 Today，能拖回 backlog，不再有 risk badge 和边框 | data：`DOING → TODO` | S | — |
| 2 | Kind-first 卡片 + 安静过期 | 新卡片（kind 色条、上下文、habit 进度点）；Done 变成按天分组的日志；漏掉的 daily habit 安静过期 | — | M | 1 |
| 3 | One-off due date | matrix 能设截止日，卡片上显示 | `tasks.due_date` | S | 2 |
| 4 | Projects | Plan › Projects 页；step 可加到这周并上 board；周末不过期 | `PROJECT` + `projects` + `tasks.project_id / position` | M–L | 2 |
| 5 | MCP 支持 projects | Claude 能建 project、写 steps、排进这周 | — | M | 4 |
| 6 | Habits | Plan › Habits 页；cadence 存在 habit 上；Plan Mode 改成每个 habit 自己选「每天 / 工作日」 | template cadence 列 + backfill；`plan_templates.every_day` | M–L | 2 |
| 7 | Plan week 三步 | 新的规划流程取代 PlanForm；决定 app 内 AI chat 的去留 | — | L | 4、6 |
| 8 | Cleanup | 删掉 `DOING` enum 值、`Plan.mode`、废弃的 i18n | 破坏性，放最后 | S | 7 |

PR 3、4、6 只依赖 PR 2，彼此独立，顺序可以调整。

### PR 1 — Board 两列 + 关掉 risk

- Board 只剩 Today · Done（desktop 列、mobile 行），Done 加副标题「this week」。
- matrix 的 Move to 去掉 In Progress（`priorities/constants.ts`）；`trackTaskSchema` / `updateTaskStatusSchema` 不再接受 `DOING`；PlanForm 里的状态标签同步改。
- 放开 Today → Backlog 拖拽（仅非 DONE 卡片）。
- 关掉 risk：卡片不再渲染 `RiskBadge` 和 risk 边框；删除 `computeRiskLevel` 和 `riskBorder` 常量（新规则在 tracker 里，旧代码可以从 git 找回）。`computeTemplateProgress` 保留给 PR 2 的进度点用，去掉其中的 `doing` 计数。
- Rollover tag 这个 PR 不动，留给 PR 2。
- **Schema**：一个 data migration：`UPDATE tasks SET status = 'TODO' WHERE status = 'DOING'`。enum 值保留到 PR 8（Postgres 删 enum 值要重建整个类型）。
- **MCP**：`serverInstructions` / `toolDescriptions` 里的「backlog, to-do, in progress」改成「backlog, today」。
- **Design Console**：board / priorities / plan 的 fixtures 去掉 DOING，board scenario 改成两列。
- **Done when**：全仓库的 `TaskStatus.DOING` 只剩 enum 定义；scenario 和真实页面一致；`tsc`、`lint`、`format:check`、`check:themes`、`build` 都通过。

### PR 2 — Kind-first 卡片 + habit 安静过期

- 在 `src/utils/` 加 `getTaskKind(type)`：`DAILY` / `WEEKLY` → habit，`AD_HOC` → one-off（PR 4 再加 `PROJECT`）。
- 新卡片面（desktop `TaskCard` 和 `MobileBacklogCard`）：
  - 第一行：kind 色条 + 图标 + 标签，加上下文（habit 显示 cadence，one-off 显示象限）。颜色用 `success` / `secondary` / `info`，通过 `Record<Kind, …>` 映射到字面 class。
  - 第二行：标题 + ✓。
  - 最后一行：信号，加中性的 size chip。
  - 去掉 type pill、#n、rollover tag。
- Habit 进度点：目标数来自 PlanTemplate（WEEKLY 取 frequency；DAILY 取 frequency × 本周生成的天数），完成数来自 board 已经加载的任务，不加新查询。没有 risk 颜色。
- Done 列改成按天分组的紧凑日志行。
- 安静过期：`runDailySync` 把过期 cutoff 从 yesterday 改成 today（`expireStaleDailyTasks` 本身不用改），删掉 `isRolloverTask` / `RolloverTag`，同步改写 baseline 里的 rollover 规则。
- 不做堆叠（见 Q3）。
- **Schema / MCP**：都不涉及（MCP 文案里没有提 rollover）。
- **Design Console**：卡片的 gallery 条目（三种 kind × 状态），更新 board fixtures。
- **Done when**：真实卡片和 mockup Cards 屏一致（去掉 amber / red 之后的样子）。

### PR 3 — One-off due date

- Migration：`ALTER TABLE tasks ADD COLUMN due_date date`。只对 `AD_HOC` 有意义，由 zod 校验。
- 新建 / 编辑 priority task 时加「Due date (optional)」：快捷 chip（None · Today · Tomorrow · Next Mon）加日期选择。
- matrix 卡片和 board 卡片显示中性的 due chip，不变色（risk 在 tracker 里）。
- MCP：context 里的 one-off summary 带上 `dueDate`。

### PR 4 — Projects（entity + 页面 + 上 board）

- Migration（两个文件，见 Q1）：`ADD VALUE 'PROJECT'`；建 `projects` 表，加 `tasks.project_id`、`tasks.position` 和 index。
- 新增 DAL `lib/db/projects.ts`、`projectService`（建 / 改 / archive project；加 / 改 / 删 / 排序 step）和 `projectActions`。
- Plan hub：Plan 页加 Week · Projects 两个 tab（Habits tab 在 PR 6 加）。
- Projects 页：列表（进度条、下一步、本周排了几步）+ 详情（有序 steps、拖拽排序、加 step）。
- 「+ This week」：把 step 挂到 active plan 上（设 `planId`，状态 `BACKLOG`）。不用等新的 Plan week，PR 4 本身就能端到端用起来。
- 生命周期：`expireAllNonDoneTasks` 跳过 `PROJECT`；建新 plan 时没做完的 step 退回 project（推广 `unlinkAdhocTasksFromPlan`）；DONE 的 step 保留 plan 归属。
- Board：`PROJECT` 的卡片面（project 名 + n/N + step bar）；`getBoardMetricsByPlanId` 加 project 桶。
- **Design Console**：projects scenario；卡片 gallery 加上 project。

### PR 5 — MCP 支持 projects

- `get_planning_context` 加 projects：每个 project 接下来的 steps、本周已排的 steps、上周做完和没做完的 steps。
- 新工具：`create_project`，`add_project_steps`（按顺序追加 steps，带 size 和说明），以及把 steps 排进这周的能力——可以单独做成 `schedule_project_steps`，也可以并进 `create_plan` / `update_plan` 的参数。倾向并进去，少一个工具。
- Server instructions 讲清楚三种 kind，以及判断标准：每次内容一样就是 habit，不一样就是 project step。
- 这一步覆盖了 tracker 里「Add AI-generated task instance flow」那条，落地后删掉它。

### PR 6 — Habits（cadence 存在 habit 上 + Habits 页）

- Migration：`task_templates` 加 `cadence_type`、`frequency`、`every_day`、`is_paused`，用每个 template 最近一次的 PlanTemplate 做 backfill；`plan_templates` 加 `every_day`，用所在 plan 的 `mode` 做 backfill（EXTREME → true）。
- 生成：`runDailySync` 改读 `planTemplate.everyDay`，不再读 `plan.mode`。
- 建 plan 时（现有 PlanForm、MCP、AI chat），用 habit 的默认 cadence 预填 PlanTemplate。PlanTemplate 仍是每周快照，所以 sync、统计和 `update_plan` 的语义都不变。
- Habits 页（Plan › Habits）：列表显示 cadence、size、本周进度点、最近 4 周；编辑支持 Daily（工作日 / 每天）、Times per week（N 次）、size、pause。
- UI 里把 template 叫作 habit（改 i18n），DB 表名不改。
- MCP：context 里的 template 带上默认 cadence；`mode` 参数标为 deprecated（PR 8 删除）。

### PR 7 — Plan week 三步

- 取代 PlanForm 的新建和编辑：
  1. habit 保留或跳过（预填默认 cadence）；
  2. 每个 project 一个 stepper（接下来 N 步，上周带过来的排最前）；
  3. 从 matrix 挑 one-off（带过来的、本周到期的、Do first 的默认勾上）；
  - 右侧显示本周总点数和最近 4 周的完成范围。
- 编辑现有 plan 时继续用 ReviewChangesModal，diff 里加上 project steps。
- 后端：`createPlanInTx` / `updatePlanInTx` 已经支持 template entries 和挂 one-off，扩展成也能挂 step（用 PR 4 推广后的版本）。
- **App 内 AI chat（OpenAI）的去留**：它只会起草 template，不认识 project，而 AI 规划现在走 Claude + MCP。建议在这个 PR 里移除，或者冻结、不跟进新模型。待拍板。
- 如果还嫌大，可以拆成「新建」和「编辑」两个 PR（PlanForm 625 行，ReviewChangesModal 450 行）。

### PR 8 — Cleanup

- 删 `TaskStatus.DOING`（重建 enum 类型）、`Plan.mode` 和 `PlanMode` enum，清掉无用的 i18n 和 scenario；README、baseline、flows、reference 收尾。
- 这是唯一的破坏性 migration：先在本地 Postgres 跑一遍，上 production 前先备份。

### 每个 PR 都要做的事

- 按 AGENTS.md 分层：zod → service → DAL；user-facing copy 放进 `en.json`；推送前跑 `npm run format`。
- Design Console 的 scenario 和 gallery 要和真实页面同步，不一致就是 bug。
- MCP 的 LLM-facing 文案和行为同步更新，工具说明里不能出现已经不存在的状态。
- 文档：改写 README Current State 里对应的条目，Update Log 追加记录，tracker 删掉已完成项。
- Migration 先在本地 Postgres 验证。local dev 目前和 production 共用同一个 Supabase（见 tracker 里 dev-environment 那条），加法 migration 风险低，但仍然是直接作用在线上数据上。

## 待拍板

1. Todo 改成什么名字：**Today**（建议）、Focus，或者别的？
2. PR 1 要不要放开 Today → Backlog 的拖拽？（建议放开，作为 Not today 的最小替代）
3. Project entity：选 **B**（建议）？
4. PR 顺序：4–5（project + MCP）排在 6–7（habit + 新规划）前面？（建议这样：project 是全新能力，而且 migration 全是加法；habit 和 planner 是最重的重构，放后面）
5. App 内 AI chat：PR 7 里移除、冻结，还是跟进新模型？（建议移除）
6. Plan Mode 改成每个 habit 自己选「每天 / 工作日」，放在 PR 6 做？（建议做；如果保留 plan 级别的 mode，PR 6 会小一些）
7. PR #44（堆叠）：保持 open 当参考，等 PR 2 之后再移植？还是先关掉？

## 风险

- **PR 2 改变了 board 的日常行为**：daily 不再 rollover。上线当天，昨天没做完的 daily 会在第一次 sync 时直接过期。这正是已经做出的决定，可以接受，但要在 Update Log 里写清楚。
- **PR 6 的 backfill** 依赖每个 template 最近一次的 PlanTemplate。从没进过 plan 的 template 没有默认 cadence，Habits 页要能显示「未设置」。
- **PR 7 是最大的一步**，可以按上面说的拆成「新建」和「编辑」两个 PR。

## 批准之后

1. 把 mockup 更新到裁剪后的 scope：Todo 改名、去掉 amber / red、删掉 Day loop 屏、标注堆叠和分组标题已 park。然后改名为 `mockup-week-model-v2.html`，PR #47 合并。
2. 从 PR 1 开始。每个 PR 合并后，在 tracker 的 restructure 条目里更新进度。
