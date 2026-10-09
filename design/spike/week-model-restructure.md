# Spike: Week model restructure — Phase 1: Projects MVP

**Status: awaiting owner approval (round 5, open questions all answered)** · 2026-10-09 · PR #47

Mockups:
- Phase 1，待批准：`design/mockup/future-work/temp-week-model-phase1-v2.html`
- Phase 1 的 Projects flows，待批准：`design/mockup/future-work/temp-projects-v2.html`。每个 tab 是下面「新增的 flow」里的一个 flow，用编号的画面画出路径（要点的控件描边、结果着色），最后一个 tab 可以直接操作
- Phase 2，只是 exploration，不规划：`design/mockup/future-work/temp-week-model-phase2-v2.html`

> 语言约定：沿用 daily-rhythm spike 的写法。叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog …），和代码、mockup、tracker 里的叫法一一对应。

## Trigger · 起因

第一轮 exploration 提出把一周的工作拆成三种：**habit**（固定节奏）、**project**（目标加有序的 steps）、**one-off**（matrix）。Owner 认可了方向，同时要求分期，并且 design first：

- **Phase 1**：支持 project type、重做卡片、MCP 支持 project。做完就是一个上线可用的 project MVP。
- **Phase 2**：habit、重做 plan form、cleanup，主要是 refactoring。**先不规划**，记进 tracker。
- Phase 1 的第一个 PR 只写文档，把 Phase 1 的设计落到 baseline 和 flows 里，然后再写代码。

这一版 spike 只规划 Phase 1：记录已定的事，给出数据模型，说明 Phase 1 对现有 flow 的影响和新增的 flow，最后给出 5 个 PR 的执行序列。待拍板的事已经全部定了。

## 已定的事 · Decisions

| 议题 | 决定 |
| --- | --- |
| 三种 kind | habit / project / one-off ✓ |
| Project entity | **选项 B**：新建 `Project` 表；step 是 `type = PROJECT` 的 Task，复用 one-off 的生命周期（见下文「数据模型」） |
| Todo 的名字 | 先不改 |
| App 内 AI chat（OpenAI） | 移除，放在 Phase 2 |
| Plan Mode | 抛弃 NORMAL / EXTREME。habit 只支持 **Daily（每天）** 和 **N× / week**，放在 Phase 2；habit 级别的「工作日 / 每天 / 自定义」记进 tracker（Plan › Future） |
| Backlog 堆叠 | 不管，tracker 里已有（PR #44） |
| One-off due date | 不做，记进 tracker |
| Risk | Phase 1 的新卡片不带 risk；per-kind 规则留在 tracker |
| Daily rhythm 仪式 | 不做，留在 tracker |
| 分期 | Phase 1 = project + 卡片 + MCP；Phase 2 = habit + plan form + cleanup |
| Plan form 里的 step | 只加载已有的 project steps（这个 plan 选中的），像 one-off 一样只能勾选 / 取消。plan form 不设计新建 project / step 的功能，Phase 2 再回头 |
| Projects 页的「+ This week」 | 保留。上面的限制只针对 plan 部分；Projects 页照常建 project、加 step，用「+ This week」/ × 排期 |
| AI chat 的 flow | 不改，Phase 2 直接移除 |
| Risk 的 flow 文档 | 不删，标为 *pending update*，旧规则留作参考 |
| 新建 / 编辑 project 和 step | 用 modal，沿用 TaskModal（Add Priority Task / Create Task Template）的模式；见 `temp-projects-v2.html` |
| Project 做完 | 不自动收起。所有 step 都 DONE 时，UI 显示「All steps done」标识，由 steps 推导，不存库、不加字段。Archive 是用户主动收起 |
| Doing 列 | **Phase 1 去掉，放在 PR 2**：board 只剩 Todo · Done，进行中的任务留在 Todo。现有的 DOING 任务迁到 TODO；Postgres 里的 `DOING` 值先留着，Phase 2 cleanup 再删 |
| Projects 的入口 | Plan 页变成 hub（This week · Projects），路由 `/kanban/projects`；侧栏和 dock 不加新项。要不要给 habit / project 单独的入口，记进 tracker 做 exploration |
| Rollover 的显示 | habit 卡片在 context 位置显示中性的「↩ 日期」，不用警告色 |
| 卡片上的 ✓ | Phase 1 不加，只能拖动 |
| MCP 怎么排 step | 并进 `create_plan` / `update_plan` 的参数，不单独做 schedule 工具；Phase 2 沿用 |
| 排期顺序 | 不强制，任何 upcoming step 都能排进这周 |

## Phase 1 scope

| Phase 1 做 | Phase 1 不动 |
| --- | --- |
| `Project` entity，Plan 变成 hub（This week · Projects），加上 Projects 页和它的 modal（New Project / Edit Project / Add Step / Edit Step） | Todo 不改名，backlog 和拖动的方式 |
| Step 上 board：排进这周就进 backlog，之后和其他任务一样拖动；周末不过期，回到 project 原来的位置 | Template、每周 plan 里的 type × frequency、Plan Mode、plan form 的主体、AI chat |
| Plan form 只渲染这个 plan 选中的 steps，和 one-off 一样只能勾选 / 取消 | Daily rollover 的行为（卡片上改成中性的 ↩ 日期） |
| Kind-first 卡片：desktop、backlog sheet、mobile 136px 小卡；关掉 risk；去掉 #n；去掉 Doing 列（Todo · Done） | Priority matrix（Track This Week 只少了 In Progress 这个目标） |
| MCP：context 里加 projects，新增 `create_project` / `update_project`，`create_plan` / `update_plan` 能带 step | Habits 页、Plan week 三步流程、Done 按天分组和卡片上的 ✓（都在 Phase 2） |

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
CREATE INDEX idx_tasks_project_id_instance_index ON tasks (project_id, instance_index);
-- step 在 project 内的顺序复用现有的 instance_index（见下）
```

Project 只能 archive，不做硬删除。

**Step 的顺序复用 `instanceIndex`**，不加新的 `position` 列（owner review 提出）：

- 它本来就是「这个任务在来源里排第几个」：template instance 是第几个副本，step 是 project 里的第几步。
- 它是 `NOT NULL` 的 int，已经在 DAL 的 `taskSelect` 里；`sortTasks` 本来就用它排同组任务的先后，所以 board 上同一个 project 的 steps 会按顺序排。
- 两个唯一约束 `uq_task_daily` / `uq_task_weekly` 都包含 `templateId`。step 的 `templateId` 是 NULL，Postgres 把 NULL 当作互不相同，所以重新排序时不会撞约束。
- 单独加一个可空的 `position` 列，几乎所有行上都会是 NULL。

约定：对 step 来说 `instanceIndex` 从 1 开始，就是 UI 上显示的「第 n 步」。重新排序时，在一个 transaction 里给这个 project 没做完的 steps 重新编号。代价是字段名读起来像「副本序号」，所以要在 schema 上加注释说明；要不要把 Prisma 字段改成更中性的名字（保留 `@map("instance_index")`），留到 Phase 2 的 cleanup 再决定。

kind 由 `TaskType` 推出来，Task 上不加 kind 列：

| UI 里的 kind | DB 里的 `TaskType` |
| --- | --- |
| habit | `DAILY` · `WEEKLY` |
| project step | `PROJECT`（新增） |
| one-off | `AD_HOC` |

### 代码里要显式处理 `PROJECT` 的地方

- `expireAllNonDoneTasks`：周末不 expire。
- Carry-over 和 unlink：`getCarryOverAdhocTaskIds` 和 `unlinkAdhocTasksFromPlan` 要推广到 step。step 退回时只清 `planId`，`instanceIndex`（step 序号）保持不变。
- `sortTasks`：分组键从 `templateId` 改成 `templateId ?? projectId`，让同一个 project 的 steps 排在一起、按 `instanceIndex` 排序。
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
| `board.md` | Task Risky Level Visual Effect Flow | 标为 **pending update**：Phase 1 不渲染 risk；flow 里保留旧规则作参考，等 per-kind 规则（tracker）回来时再改写 |
| `board.md` | Drag and Drop Flow | 去掉 DOING：列只剩 Todo · Done，转换是 BACKLOG → TODO → DONE；Track This Week 的例外（`BACKLOG → DOING`）删掉。step 和其他任务一样移动 |
| `plan.md` | Create Plan Flow | plan form 只渲染选中的 project steps：pending plan 上没做完的 step 默认选中，和 one-off 一样只能勾选 / 取消。选中的挂到新 plan，保留原状态；取消的退回 project（`planId = null`、`BACKLOG`，`instanceIndex` 不变）。plan form 没有新建 project / step 的功能 |
| `plan.md` | Update Plan Flow | 同样只渲染这周已挂上的 steps，只能取消（退回 project）；ReviewChangesModal 写明「回到 <project>」。plan form 没有加 step 的功能，Phase 2 再回头。删除未完成实例的规则里去掉 DOING |
| `plan.md` | AI Assisted Plan Creation Flow | **不改**，Phase 2 直接移除。实现上：它审批时只带 one-off，没带上的 step 由推广后的 unlink 退回 project |
| `plan.md` | Plan with Claude (MCP) Flow | context 加 projects；新增工具 `create_project` / `update_project`；`create_plan` 加 `carryOverProjectStepIds` / `projectStepIds`；`update_plan` 能加、减 step。Rules 加上 step 的校验：只能排本人的、没做完的、没在这周 plan 上的 step |
| `plan.md` | Create / Update Task Template Flow | 不变 |
| `priorities.md` | Track This Week Flow | 「Move to」的目标只剩 Todo（加上分隔线下的 Done），不再有 In Progress |
| `priorities.md` | 其余 flow | 不变（Complete One-off 的 undo 照旧恢复原状态，只是不会再有 DOING） |

### 新增的 flow（新文档 `design/flows/projects.md`）

1. **Projects Landing Flow**
   - 入口：Plan hub 的 Projects tab，进入 `/kanban/projects`。侧栏的 Plan 项和 dock 的 Plan tab 保持激活。
   - 步骤：`ensureSynced` → 列出未 archive 的 project（进度 done/total、下一步、这周排了几步）→ 选中一个看详情。Desktop 是左右两栏；mobile 进入 `/kanban/projects/[id]`。
   - 规则：一个 project 都没有时，显示空状态：「New project」，外加一句提示可以请 Claude 起草；archived 的 project 单独列在列表最下面，带 Unarchive。
   - **All steps done**：project 至少有一个 step、且全部 DONE 时，列表卡片的「Next:」换成「✓ All steps done」标识，详情里出现一条 banner：「加下一批 step，或者 archive」，带 Archive（同样两步确认）。这个状态由 steps 推导，不存库；project 留在列表里，不自动 archive；再加一个 step 就回到进行中。
2. **Create Project Flow**
   - 入口：Projects 页的「+ New project」，或者空状态里的同一个按钮。
   - 步骤：打开 **New Project** modal（TaskModal 同款外壳：标题栏 + ×、project 的说明 banner、Title 必填、Goal 可选、Cancel / Create project）→ 建好后进入这个 project 的详情，空状态提示「+ Add the first step」。
   - 规则：Title 为空时 Create project 不可点；project 没有 size（它的大小是 steps 之和）；desktop 是居中 modal，mobile 是 bottom sheet。
3. **Edit Project Flow**
   - 入口：project 详情右上角的「Edit」，打开 **Edit Project** modal（New Project 去掉 banner）：改 title、goal；footer 左边是 Archive。
   - Archive 是两步确认，沿用 sign-out 的模式：Archive → 同一个按钮变成「Archive?」，下面写明「Unfinished steps leave this week」。
   - 规则：archive 是用户主动收起，入口是这个 modal 和 All steps done 的 banner；archive 时没做完的 step 退出这周（回到 project），project 移到 Archived，列表选中下一个 project；done 的 step 保留 plan 归属；Unarchive 原样恢复。
4. **Manage Steps Flow**
   - 加：「+ Add step」打开 **Add Step** modal，字段和 Create Task Template 一样（Title 必填、Description 可选、Size 选择器带 effort 提示和 L / XL 拆分提醒），标题栏写明 project 名和「becomes step n」；保存后追加到末尾，modal 关闭（和 Add Priority Task 一样一次加一步，批量起草交给 Claude）。
   - 改 / 删：没做完的 step 每行有常显的 ✎（只在 hover 时出现的控件在触屏上找不到），打开 **Edit Step** modal（同样的字段，footer 左边是 Delete step）。Delete 同样两步确认：Delete step → 「Delete step?」；删掉后后面的 step 前移一位。编辑一个排在这周的 step，board 上的卡片同步更新。
   - 排序：desktop 拖 upcoming / 这周的 step 的把手；mobile 长按拖动。done 的 step 固定在最上面，按完成顺序排。
   - 规则：`instanceIndex` 保持连续；done 的 step 锁定，不能改也不能删（它们带着 points 历史）；删除一个排在这周的 step，会同时把它从这周拿掉。
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
   - 之后在 board 上：`TODO` → `DONE`
   - 周末没做完：仍挂在 pending plan 上；到下一个 plan 时，要么被带上（保留状态），要么退回 project（`planId = null` · `BACKLOG`，`instanceIndex` 不变）。
   - project 进度 = DONE 的 step 数 / step 总数；done 的 step 显示完成日期；全部 DONE 时 UI 显示 All steps done（推导，不存库）。

## Executable plan · Phase 1 PR 序列

| # | PR | 内容 | Schema | 大小 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| 1 | **Phase 1 文档** | baseline、新的 `flows/projects.md`、按上一节改写的 flows、tracker | — | S | PR #47 |
| 2 | Kind-first 卡片 + 关掉 risk + 去掉 Doing | 新卡片；board 变成 Todo · Done | data migration（DOING → TODO） | M | 1 |
| 3 | Project 数据层 | migration、DAL、service、action、生命周期 | 加法 | M | 1 |
| 4 | Projects UI + step 上 board | Plan hub、Projects 页和 4 个 modal、排期、step 卡片、plan form 渲染选中的 steps | — | M–L | 2、3 |
| 5 | MCP 支持 projects | context、新工具、server instructions | — | M | 3 |

PR 2 和 PR 3 互不依赖，可以并行。PR 5 合并后，Phase 1 MVP 上线可用。

### PR 1 — Phase 1 文档（design first）

- `baseline.md`：
  - Entities 加 **Project**，**Task** 加 project step 的说明；
  - Schema 加 `projects` 表、`TaskType.PROJECT`、`Task.projectId`（step 顺序复用 `instanceIndex`）；
  - Architecture Decision 记下选项 B 及其理由；
  - Kanban board 和 Drag and drop 的描述改成两列（Todo · Done）。
  - 标注方式沿用 DumpEntry 的先例：「*(designed — Phase 1 pending)*」。
- `flows/projects.md`：新文档，写入上面 6 个 flow 加 Step Lifecycle，按现有 flow 文档的格式（Trigger / Steps / Rules）。
- `flows/shared.md`、`board.md`、`plan.md`、`priorities.md`：按「改动的 flow」那张表改写；Task Risky Level Visual Effect Flow 标为 *pending update*，保留旧规则作参考，并指向 tracker 里的 per-kind risk 条目。
- `design/README.md`：flows 列表加上 `projects.md`。
- `reference.md` 不动。它是现有代码的查找表，等代码落地再更新。
- **Done when**：owner 批准文档。

### PR 2 — Kind-first 卡片 + 关掉 risk + 去掉 Doing

- 在 `src/utils/` 加 `getTaskKind(type)`，加 `Record<Kind, …>` 映射到字面 class（`success` / `secondary` / `info`）。
- 新卡片面：desktop `TaskCard`、`MobileBacklogCard`、mobile board 的 136px 小卡。
  - 第一行：kind（色条 + 图标 + 标签）和 context。habit 的 context 是它的 plan line（Daily / 3× / week），rollover 时换成 ↩ 日期；one-off 的 context 是象限。
  - 中间：标题，以及（仅 desktop 和 sheet）说明。
  - 最后一行：信号（habit 是这周的点，用 board 已加载的任务算，不加查询）+ 中性的 size chip。
  - Done 列沿用变暗的同一张卡。
  - 不加 ✓（已定，和 Phase 2 的两列 board 一起上）。
- 删除：`computeRiskLevel`、`RiskBadge`、risk 边框常量、卡片上的 type pill、#n、`RolloverTag`。`computeTemplateProgress` 保留给进度点用，去掉其中的 `doing` 计数。
- 去掉 Doing 列：
  - Board：`KanbanBoard` / `BoardColumn` 去掉 Doing 列（desktop 和 mobile），`taskUtils` 的分组去掉 DOING。
  - 写入：`src/schemas.ts` 里移动和 Track This Week 的状态 enum 去掉 DOING；matrix 的「Move to」只剩 Todo 和 Done。
  - 显示：PlanForm 的状态 pill、priorities 的状态点、`en.json` 里「Todo / In Progress」的 copy；MCP 的 server instructions 和 tool descriptions 里的「in progress」。
  - 数据：一个 data migration 把现有 DOING 任务改成 TODO。Postgres 的 `DOING` enum 值先保留（删 enum 值要重建类型），Phase 2 cleanup 再删。
- Design Console：卡片的 gallery 条目（三种 kind × 位置），更新 board、plan、priorities scenario 的 fixtures（去掉 DOING）。
- **Done when**：真实卡片和 Phase 1 mockup 的 Board / Cards 屏一致；`tsc`、`lint`、`format:check`、`check:themes`、`build` 都通过。

### PR 3 — Project 数据层

- 两个 migration（见「数据模型」）。
- 新增 `lib/db/projects.ts`、`projectService`、`projectActions`，加上 zod schema。覆盖：建 / 改 / archive project；加 / 改 / 删 / 排序 step；排进这周 / 撤回。
- 生命周期：`expireAllNonDoneTasks` 跳过 `PROJECT`；推广 carry-over 和 unlink；`getBoardMetricsByPlanId` 加 project 桶；补齐 `TaskType` 的各种映射。
- 这个 PR 没有 UI。
- **Done when**：migration 在本地 Postgres 跑通；用脚本验证周末不过期、carry-over、unlink 保留 `instanceIndex`、DONE 保留 plan 归属；构建全绿。

### PR 4 — Projects UI + step 上 board

- Plan hub：Plan 页加 This week · Projects 两个 tab。`/kanban/projects` 和 `/kanban/projects/[id]` 也让侧栏的 Plan 项保持激活。
- Projects 页：列表 + 详情、「+ This week」和 ×、All steps done 的标识和 banner（在 UI 里推导）。
- 4 个 modal：New Project、Edit Project（含 Archive）、Add Step、Edit Step（含 Delete step）。复用 TaskModal 的零件（`OverlayShell` / `OverlayHeader`、`FieldRow`、size 的 `ChoicePills`、footer），是加新 mode 还是拆出共用的 form 部件，实现时按代码量决定。
- Step 卡片面：project 名 + n/N + step bar，基于 PR 2 的卡片骨架。
- Plan form：在 One-off Tasks 旁边加 Project Steps 区块，只渲染这个 plan 选中的 steps，只能勾选 / 取消；ReviewChangesModal 写明 step 回到哪个 project。
- Design Console：新的 projects scenario；更新 plan scenario 和 board fixtures（加上 step）；之后删除 Phase 1 和 Projects 两个 mockup。
- **Done when**：手动跑通「建 project → 排进这周 → 在 board 上做完 → 下周 carry-over」。

### PR 5 — MCP 支持 projects

- `get_planning_context`：加 projects（进度、接下来的 steps 带 id 和 size）、这周已排的 steps 及其状态、上周 steps 的结果。
- 新工具：`create_project`、`update_project`（patch 形式：rename、goal、archive，以及 add / edit / remove / reorder steps）。
- `create_plan` 加 `carryOverProjectStepIds`（不传 = 全部带上，和 one-off 一致）和 `projectStepIds`；`update_plan` 能加、减 step。
- Server instructions 和 tool descriptions：讲清三种 kind，判断标准是「每次内容一样就是 habit，不一样就是 project step」；`src/utils/errorMessages.ts` 加 step 相关的报错。
- **Project 的 prompt 细节（做这个 PR 时再 finalize）**：archive 是用户主动的收起，Claude 不自己 archive，用户同意后才调用 `update_project`；context 里标出 all steps done 的 project，Claude 排下周时问用户是加下一批 step 还是 archive。
- MCP Inspector smoke test。
- **Done when**：在 Claude 里跑通 Projects mockup「07 Draft with Claude」的对话。

### 每个 PR 都要做的事

- 按 AGENTS.md 分层（zod → service → DAL）；user-facing copy 放进 `en.json`；推送前跑 `npm run format`。
- Design Console 的 scenario 和 gallery 要和真实页面同步；MCP 的 LLM-facing 文案和行为同步。
- 文档：改写 README Current State 里对应的条目，Update Log 追加记录，tracker 更新 Phase 1 那一条的进度。
- Migration 先在本地 Postgres 验证（local dev 和 production 共用同一个 Supabase）。

## Phase 2 · 不规划，已记进 tracker

- Habit 自带 cadence：Daily（每天）或 N× / week，抛弃 Plan Mode；新增 Plan › Habits 页。
- Plan week 三步流程取代 plan form；移除 app 内 AI chat。
- Board：Done 改成本周按天分组的日志；卡片加 ✓（Doing 在 Phase 1 已经去掉）。
- Habit 漏掉的那天安静过期（去掉 rollover）。
- Cleanup：`DOING` enum 值、`Plan.mode`、废弃的 copy 和 scenario。

方向见 Phase 2 的 mockup。另有几条独立的 tracker 项：habit 级别的天数选择、habit / project 的单独入口、per-kind risk、one-off due date、daily rhythm、backlog 堆叠。

## 待拍板

无。这一轮的 6 项都已拍板，记在「已定的事」里。

## 风险

- **PR 2 关掉 risk 之后**，board 上没有任何「快到期 / 落后了」的提示，直到 per-kind risk 回来（tracker）。
- **去掉 Doing 之后**，board 上分不出「正在做」和「今天要做」，两者都在 Todo。
- **Migration 直接作用在线上 Supabase**：local dev 和 production 共用同一个。这几个 migration 都是加法，但仍要先在本地 Postgres 验证。
- **旧 template 和新 project 会并存**：Biomedical course 这类「其实是 project」的 WEEKLY template，下周不再选就行，不做自动迁移。

## 批准之后

1. 在 PR #47 里把 mockup 改名归档：Phase 1 → `mockup-week-model-phase1-v2.html`（PR 4 的 scenario 页接手后删除），Projects → `mockup-projects-v2.html`（同样在 PR 4 之后删除），Phase 2 → `mockup-week-model-phase2-v2.html`（留在 future-work，由 tracker 指向）。
2. 合并 PR #47，开 PR 1（文档）。
