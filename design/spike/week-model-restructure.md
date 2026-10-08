# Spike: Week model restructure — Phase 1: Projects MVP

**Status: awaiting owner review (round 2)** · 2026-10-08 · PR #47

Mockups:
- Phase 1，待批准：`design/mockup/future-work/temp-week-model-phase1-v2.html`
- Phase 2，只是 exploration，不规划：`design/mockup/future-work/temp-week-model-phase2-v2.html`

> 语言约定：沿用 daily-rhythm spike 的写法。叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog …），和代码、mockup、tracker 里的叫法一一对应。

## Trigger · 起因

第一轮 exploration 提出把一周的工作拆成三种：**habit**（固定节奏）、**project**（目标加有序的 steps）、**one-off**（matrix）。Owner 认可了方向，同时要求分期，并且 design first：

- **Phase 1**：支持 project type、重做卡片、MCP 支持 project。做完就是一个上线可用的 project MVP。
- **Phase 2**：habit、重做 plan form、cleanup，主要是 refactoring。**先不规划**，记进 tracker。
- Phase 1 的第一个 PR 只写文档，把 Phase 1 的设计落到 baseline 和 flows 里，然后再写代码。

这一版 spike 只规划 Phase 1：记录已定的事，给出数据模型，说明 Phase 1 对现有 flow 的影响和新增的 flow，最后给出 5 个 PR 的执行序列和这一轮待拍板的事。

## 已定的事 · Decisions

| 议题 | 决定 |
| --- | --- |
| 三种 kind | habit / project / one-off ✓ |
| Project entity | **选项 B**：新建 `Project` 表；step 是 `type = PROJECT` 的 Task，复用 one-off 的生命周期（见下文「数据模型」） |
| Todo 的名字 | 先不改 |
| Todo → Backlog 拖拽 | 不动。说明：代码里其实拖不进 backlog（desktop backlog 是 `isDropDisabled`，`handleDragEnd` 遇到 backlog 也直接 return）。能拖的是列与列之间往回拖，比如 In Progress → Todo；而 `board.md` 写的是只能往前拖。这是文档和代码的出入，不在 Phase 1 处理 |
| App 内 AI chat（OpenAI） | 移除，放在 Phase 2 |
| Plan Mode | 抛弃 NORMAL / EXTREME。habit 只支持 **Daily（每天）** 和 **N× / week**，放在 Phase 2；habit 级别的「工作日 / 每天 / 自定义」记进 tracker（Plan › Future） |
| Backlog 堆叠 | 不管，tracker 里已有（PR #44） |
| One-off due date | 不做，记进 tracker |
| Risk | Phase 1 的新卡片不带 risk；per-kind 规则留在 tracker |
| Daily rhythm 仪式 | 不做，留在 tracker |
| 分期 | Phase 1 = project + 卡片 + MCP；Phase 2 = habit + plan form + cleanup |

## Phase 1 scope

| Phase 1 做 | Phase 1 不动 |
| --- | --- |
| `Project` entity，Plan 变成 hub（This week · Projects），加上 Projects 页 | 三列 board（Todo · In Progress · Done），Todo 不改名 |
| Step 上 board：排进这周就进 backlog，之后和其他任务一样拖动；周末不过期，回到 project 原来的位置 | Template、每周 plan 里的 type × frequency、Plan Mode、plan form 的主体、AI chat |
| Plan form 的 carry-over：上周没做完的 step 和 one-off 一起列出 | Daily rollover 的行为（卡片上改成中性的 ↩ 日期） |
| Kind-first 卡片：desktop、backlog sheet、mobile 136px 小卡；关掉 risk；去掉 #n | Priority matrix 和 Track This Week |
| MCP：context 里加 projects，新增 `create_project` / `update_project`，`create_plan` / `update_plan` 能带 step | Habits 页、Plan week 三步流程、去掉 Doing（都在 Phase 2） |

## 数据模型（Phase 1）

### 为什么选 B

Project step 的生命周期和 one-off（`AD_HOC`）一样：不属于任何一周时 `planId = null`，周末不过期，建新 plan 时被带上或者退回原处，DONE 后保留 plan 归属。这套逻辑现有代码里已经有了：`expireAllNonDoneTasks` 跳过 `AD_HOC`，`updateTasksPlanId` 把任务挂到 plan，`unlinkAdhocTasksFromPlan` 把没选的退回去。

另外两个选项被否掉的原因：

- **复用 TaskTemplate**：每一条读、写、统计 template 的路径都得加 kind 过滤，包括 4 个 `getTaskTemplates` 调用方、`resolvePlanEntries`、PlanTemplate 校验、`getPlanTemplateStats`、`deleteIncompleteTasksByTemplateIds`。漏一处就是数据 bug。
- **独立的 ProjectStep 表**：等于同一件事存两份，状态要来回同步。

### Migration

全是加法，不改现有数据，不需要 backfill。

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

Project 只能 archive，不做硬删除。kind 由 `TaskType` 推出来，Task 上不加 kind 列：

| UI 里的 kind | DB 里的 `TaskType` |
| --- | --- |
| habit | `DAILY` · `WEEKLY` |
| project step | `PROJECT`（新增） |
| one-off | `AD_HOC` |

### 代码里要显式处理 `PROJECT` 的地方

- `expireAllNonDoneTasks`：周末不 expire。
- Carry-over 和 unlink：`getCarryOverAdhocTaskIds` 和 `unlinkAdhocTasksFromPlan` 要推广到 step。step 退回时只清 `planId`，`position` 保持不变。
- `getBoardMetricsByPlanId`：这是按 daily / weekly / adhoc 分桶的 raw SQL，要加一个 project 桶。
- `Record<TaskType, …>` 类的映射（i18n `Enums.TaskType`、排序）：漏掉的地方 TypeScript 编译时会报出来。
- 不用改的：matrix 的查询本来就只查 `AD_HOC`；`getPlanTemplateStats` 按 `templateId` 分组，step 没有 templateId；daily expiry 按 `forDate` 过滤，step 没有 `forDate`。

## Phase 1 对 flow 的影响

### 改动的 flow

| 文档 | Flow | 改什么 |
| --- | --- | --- |
| `shared.md` | End of Period Sync Flow | 第 1 步：除了 `AD_HOC`，`PROJECT` 也不 expire。没做完的 step 留在 pending plan 上，由下一个 plan 决定带上还是退回 |
| `shared.md` | Ensure Synced · Daily Sync | 不变 |
| `board.md` | Backlog Flow | backlog 里多了这周排上的 step。卡片规则改写：没有 #n，没有 risk，rollover 在 context 位置显示为 ↩ 日期。「Ad-hoc tasks never appear in the backlog」那句保留（step 不是 ad-hoc） |
| `board.md` | Progress Tracking Flow | metrics 加 project 桶。step 和其他任务一样计入 Today 和 Week；Week projection 包含 backlog 里的 step |
| `board.md` | Task Risky Level Visual Effect Flow | **删除**（risk 关掉），规则移到 tracker |
| `board.md` | Drag and Drop Flow | 规则不变，step 和其他任务一样移动 |
| `plan.md` | Create Plan Flow | 第 1 步：多预载 pending plan 上没做完的 step，默认选中，和 one-off 一样。第 6–7 步：选中的 step 挂到新 plan，保留原状态；没选中的退回 project（`planId = null`、`BACKLOG`，`position` 不变） |
| `plan.md` | Update Plan Flow | 第 3 步：已在这周的 step 可以取消选择，取消后退回 project；ReviewChangesModal 写明「回到 <project>」。plan form 里**不能新加** step |
| `plan.md` | AI Assisted Plan Creation Flow | 审批时 step 和 one-off 一样全部带上（现在对 one-off 就是全带）。AI chat 本身在 Phase 2 移除 |
| `plan.md` | Plan with Claude (MCP) Flow | context 加 projects；新增工具 `create_project` / `update_project`；`create_plan` 加 `carryOverProjectStepIds` / `projectStepIds`；`update_plan` 能加、减 step。Rules 加上 step 的校验：只能排本人的、没做完的、没在这周 plan 上的 step |
| `plan.md` | Create / Update Task Template Flow | 不变 |
| `priorities.md` | 全部 | 不变 |

### 新增的 flow（新文档 `design/flows/projects.md`）

1. **Projects Landing Flow**
   - 入口：Plan hub 的 Projects tab，进入 `/kanban/projects`。侧栏的 Plan 项和 dock 的 Plan tab 保持激活。
   - 步骤：`ensureSynced` → 列出未 archive 的 project（进度 done/total、下一步、这周排了几步）→ 选中一个看详情。Desktop 是左右两栏；mobile 进入 `/kanban/projects/[id]`。
   - 规则：archived 的 project 单独列在下面。
2. **Create Project Flow**
   - 入口：「+ New project」。
   - 步骤：填 title（必填）、goal（可选）、first steps（可选，一行一步，size 默认 S）→ 在一个 transaction 里建 project 和 steps：`position` 从 1 往下排，`planId = null`，`BACKLOG`，`type = PROJECT`。
   - 规则：空行忽略。
3. **Edit Project Flow**
   - 可以改 title、goal，可以 archive / unarchive。
   - 规则：archive 时没做完的 step 退出这周（回到 project）并隐藏；done 的 step 保留 plan 归属。
4. **Manage Steps Flow**
   - 加 step（默认追加到末尾）；改 title、description、size；拖动调整顺序（只能拖 upcoming 的 step）；删除。
   - 规则：`position` 保持连续；done 的 step 锁定，不能改也不能删（它们带着 points 历史）；删除一个排在这周的 step，会同时把它从这周拿掉。
5. **Schedule Step Flow**
   - 入口：upcoming step 上的「+ This week」（Projects 页），或者 MCP。
   - 步骤：需要有 ACTIVE plan（没有时按钮禁用，提示和 matrix 的 no-plan 状态一样）→ 设 `planId = active plan`、`BACKLOG` → step 出现在 board 的 backlog → 之后走 board 现有的 flow。
   - 撤回：还在 backlog 里的 step 可以点 × 拿掉（`planId = null`）。已经开始的 step 只能通过 Edit Plan 取消选择来拿掉。
   - 规则：任何 upcoming step 都可以排，不强制按顺序。
6. **Draft Steps with Claude (MCP) Flow**
   - 入口：用户请 Claude 规划一个 project。
   - 步骤：`get_planning_context` → Claude 提议 project 和这周的 steps → 用户同意 → `create_project`（或 `update_project` 追加 steps）→ `update_plan`（或 `create_plan`）把 step 排进这周。
   - 规则：先提议、后写入（和现有 MCP 规则一致）；工具仍然不创建 one-off。
7. **Step Lifecycle**（参考小节，不是 flow）：
   - 未排期：`planId = null` · `BACKLOG`
   - 排进这周：`planId = plan` · `BACKLOG`
   - 之后在 board 上：`TODO` → `DOING` → `DONE`
   - 周末没做完：仍挂在 pending plan 上；到下一个 plan 时，要么被带上（保留状态），要么退回 project（`planId = null` · `BACKLOG`，`position` 不变）。
   - project 进度 = DONE 的 step 数 / step 总数；done 的 step 显示完成日期。

## Executable plan · Phase 1 PR 序列

| # | PR | 内容 | Schema | 大小 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| 1 | **Phase 1 文档** | baseline、新的 `flows/projects.md`、按上一节改写的 flows、tracker | — | S | PR #47 |
| 2 | Kind-first 卡片 + 关掉 risk | 只改卡片，不改行为 | — | M | 1 |
| 3 | Project 数据层 | migration、DAL、service、action、生命周期 | 加法 | M | 1 |
| 4 | Projects UI + step 上 board | Plan hub、Projects 页、排期、step 卡片、plan form carry-over | — | M–L | 2、3 |
| 5 | MCP 支持 projects | context、新工具、server instructions | — | M | 3 |

PR 2 和 PR 3 互不依赖，可以并行。PR 5 合并后，Phase 1 MVP 上线可用。

### PR 1 — Phase 1 文档（design first）

- `baseline.md`：
  - Entities 加 **Project**，**Task** 加 project step 的说明；
  - Schema 加 `projects` 表、`TaskType.PROJECT`、`Task.projectId / position`；
  - Architecture Decision 记下选项 B 及其理由。
  - 标注方式沿用 DumpEntry 的先例：「*(designed — Phase 1 pending)*」。
- `flows/projects.md`：新文档，写入上面 6 个 flow 加 Step Lifecycle，按现有 flow 文档的格式（Trigger / Steps / Rules）。
- `flows/shared.md`、`board.md`、`plan.md`：按「改动的 flow」那张表改写；Task Risky Level Visual Effect Flow 删除，在 tracker 里留指针。
- `design/README.md`：flows 列表加上 `projects.md`。
- `reference.md` 不动。它是现有代码的查找表，等代码落地再更新。
- **Done when**：owner 批准文档。

### PR 2 — Kind-first 卡片 + 关掉 risk

- 在 `src/utils/` 加 `getTaskKind(type)`，加 `Record<Kind, …>` 映射到字面 class（`success` / `secondary` / `info`）。
- 新卡片面：desktop `TaskCard`、`MobileBacklogCard`、mobile board 的 136px 小卡。
  - 第一行：kind（色条 + 图标 + 标签）和 context。habit 的 context 是它的 plan line（Daily / 3× / week），rollover 时换成 ↩ 日期；one-off 的 context 是象限。
  - 中间：标题，以及（仅 desktop 和 sheet）说明。
  - 最后一行：信号（habit 是这周的点，用 board 已加载的任务算，不加查询）+ 中性的 size chip。
  - Done 列沿用变暗的同一张卡。
  - 不加 ✓（待拍板 5）。
- 删除：`computeRiskLevel`、`RiskBadge`、risk 边框常量、卡片上的 type pill、#n、`RolloverTag`。`computeTemplateProgress` 保留给进度点用，去掉其中的 `doing` 计数。
- Design Console：卡片的 gallery 条目（三种 kind × 位置），更新 board scenario 的 fixtures。
- **Done when**：真实卡片和 Phase 1 mockup 的 Cards 屏一致；`tsc`、`lint`、`format:check`、`check:themes`、`build` 都通过。

### PR 3 — Project 数据层

- 两个 migration（见「数据模型」）。
- 新增 `lib/db/projects.ts`、`projectService`、`projectActions`，加上 zod schema。覆盖：建 / 改 / archive project；加 / 改 / 删 / 排序 step；排进这周 / 撤回。
- 生命周期：`expireAllNonDoneTasks` 跳过 `PROJECT`；推广 carry-over 和 unlink；`getBoardMetricsByPlanId` 加 project 桶；补齐 `TaskType` 的各种映射。
- 这个 PR 没有 UI。
- **Done when**：migration 在本地 Postgres 跑通；用脚本验证周末不过期、carry-over、unlink 保留 `position`、DONE 保留 plan 归属；构建全绿。

### PR 4 — Projects UI + step 上 board

- Plan hub：Plan 页加 This week · Projects 两个 tab。`/kanban/projects` 和 `/kanban/projects/[id]` 也让侧栏的 Plan 项保持激活。
- Projects 页：列表 + 详情、新建 / 编辑 / archive、管理 steps、「+ This week」和 ×。
- Step 卡片面：project 名 + n/N + step bar，基于 PR 2 的卡片骨架。
- Plan form：在 One-off Tasks 旁边加 Project Steps 的 carry-over 区块；ReviewChangesModal 写明 step 回到哪个 project。
- Design Console：新的 projects scenario；更新 plan scenario 和 board fixtures（加上 step）；之后删除 Phase 1 mockup。
- **Done when**：手动跑通「建 project → 排进这周 → 在 board 上做完 → 下周 carry-over」。

### PR 5 — MCP 支持 projects

- `get_planning_context`：加 projects（进度、接下来的 steps 带 id 和 size）、这周已排的 steps 及其状态、上周 steps 的结果。
- 新工具：`create_project`、`update_project`（patch 形式：rename、goal、archive，以及 add / edit / remove / reorder steps）。
- `create_plan` 加 `carryOverProjectStepIds`（不传 = 全部带上，和 one-off 一致）和 `projectStepIds`；`update_plan` 能加、减 step。
- Server instructions 和 tool descriptions：讲清三种 kind，判断标准是「每次内容一样就是 habit，不一样就是 project step」；`src/utils/errorMessages.ts` 加 step 相关的报错。
- MCP Inspector smoke test。
- 落地后从 tracker 删掉「Add AI-generated task instance flow」，这一条由它覆盖。
- **Done when**：在 Claude 里跑通 mockup 第 07 屏的对话。

### 每个 PR 都要做的事

- 按 AGENTS.md 分层（zod → service → DAL）；user-facing copy 放进 `en.json`；推送前跑 `npm run format`。
- Design Console 的 scenario 和 gallery 要和真实页面同步；MCP 的 LLM-facing 文案和行为同步。
- 文档：改写 README Current State 里对应的条目，Update Log 追加记录，tracker 更新 Phase 1 那一条的进度。
- Migration 先在本地 Postgres 验证（local dev 和 production 共用同一个 Supabase）。

## Phase 2 · 不规划，已记进 tracker

- Habit 自带 cadence：Daily（每天）或 N× / week，抛弃 Plan Mode；新增 Plan › Habits 页。
- Plan week 三步流程取代 plan form；移除 app 内 AI chat。
- Board 去掉 Doing；Done 改成本周按天分组的日志；卡片加 ✓。
- Habit 漏掉的那天安静过期（去掉 rollover）。
- Cleanup：`DOING` enum 值、`Plan.mode`、废弃的 copy 和 scenario。

方向见 Phase 2 的 mockup。另有几条独立的 tracker 项：habit 级别的天数选择、per-kind risk、one-off due date、daily rhythm、backlog 堆叠。

## 待拍板（round 2）

1. **Doing 列的移除放在 Phase 2。** 你列 Phase 1 时没有提到它，我按 Phase 2 处理了。OK 吗？
2. **Projects 的入口**：Plan 页变成 hub（This week · Projects），路由 `/kanban/projects`，侧栏和 dock 都不加新项。OK 吗？
3. **Plan form 的 carry-over**：上周没做完的 step 默认选中、可以取消（取消后回到 project），和 one-off 一样。还是不进 plan form，一律自动回到 project？
4. **Rollover 的显示**：Phase 1 的 habit 卡片在 context 位置显示中性的「↩ 日期」，不再用警告色。OK 吗？
5. **Phase 1 卡片不加 ✓**，只能拖动；✓ 和 Phase 2 的两列 board 一起上。OK 吗？
6. **MCP 怎么排 step**：并进 `create_plan` / `update_plan` 的参数，不单独做一个 schedule 工具。OK 吗？
7. **排期顺序**：step 可以不按顺序排进这周，任何 upcoming step 都能「+ This week」。OK 吗？

## 风险

- **PR 2 关掉 risk 之后**，board 上没有任何「快到期 / 落后了」的提示，直到 per-kind risk 回来（tracker）。
- **Migration 直接作用在线上 Supabase**：local dev 和 production 共用同一个。这几个 migration 都是加法，但仍要先在本地 Postgres 验证。
- **旧 template 和新 project 会并存**：Biomedical course 这类「其实是 project」的 WEEKLY template，下周不再选就行，不做自动迁移。

## 批准之后

1. 在 PR #47 里把 mockup 改名归档：Phase 1 → `mockup-week-model-phase1-v2.html`（PR 4 的 scenario 页接手后删除），Phase 2 → `mockup-week-model-phase2-v2.html`（留在 future-work，由 tracker 指向）。
2. 合并 PR #47，开 PR 1（文档）。
