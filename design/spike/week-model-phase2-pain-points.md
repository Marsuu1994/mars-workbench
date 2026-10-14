# Spike: App pain points for Week model Phase 2

**Status: draft** · 2026-10-13（2026-10-14 加入 owner 的笔记：lifecycle、共用入口、同一套词）· 定稿留到 Phase 2 真正开工时 · 回答 tracker 条目 *Week model Phase 2 › Investigate the app pain points*（Plan › Future）；也回答 *Redesign the point system and metric tracking*（Cross-cutting › Medium）的方向问题 · 来源：PR 5 spike 讨论（PR #61）· 相关：`design/spike/week-model-restructure.md`（Phase 1，approved）、`design/spike/week-model-pr5-mcp-projects.md`（MCP，decided）· Phase 2 exploration：`design/mockup/future-work/mockup-week-model-phase2-v2.html`

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off、size / points、`TaskSize` …），和代码、mockup、tracker 一一对应。

## Trigger · 起因

讨论 PR 5 时，owner 提了几个用下来的痛点：

1. **Size 越用越多余，定位也模糊了。** Size 最初仿照 agile 的 story point（1 point = 1 天），后来改成 1 point = 1 小时，但实际使用中没有起作用。一个好的工具应该关注用户愿意把多少时间分给 habit 和 project，再给每个小 task 估 effort，合理规划时间；但做得太细会让定位偏移。App 最初的目的是规划要做哪些固定的事，加入 project 之后定位有些模糊。**现在想做到的是：让 LLM 高效地分配我的时间。**
2. **给 habit 和 project 加规则**，比如一周最多并行 3 个 habit、同时最多 4 个 active project，限制关注点，不要太分散。
3. **Habit 和 project 的 lifecycle**（owner 的笔记，2026-10-14）：active、archive / pause、complete。Habit 的 pause 表示暂停，类似 project 的 archive；complete 表示这个 habit 已经内化了，不需要再跟踪。Habit 和 project 的入口放在一起；新的规则要让人和 AI 都容易懂。

这份 spike 是 **draft**：不排 PR，也不在现在拍板。它把问题和选项整理出来，等 Phase 2 真正开工时再定稿，作为 Phase 2 规划的输入。它把问题和选项整理出来，等 owner 定了方向，再作为 Phase 2 规划的输入。Phase 2 已经有的方向（habit 自带 cadence、三步的 Plan week、去掉 AI chat、Done 改成按天的日志）见 tracker。

## 现状 · What's there today

| 用到 size / points 的地方 | 现在做什么 |
| --- | --- |
| 建 template、step、one-off | 用户必须选 size（5 档），有 effort 提示和 L / XL 的拆分提醒 |
| 卡片 | 中性的 size chip |
| Board 的 metrics | Today / Week / Daily avg 都按 points 算 |
| MCP、AI chat | 按 size 和 `completionRate` 校准；prompt 里写着「EXTRA_SMALL ~1h = 1 pt」 |
| Plan | **没有**「这周有多少时间」的输入；一周排得满不满，只能靠 frequency × size 心算 |

| 数量 | 现在 |
| --- | --- |
| 一周的 template（habit） | 不限 |
| Project | 不限；archive 是用户主动收起 |

`TaskSize → points` 是 1 / 2 / 3 / 5 / 8，effort 提示是 ~1h / ~2h / ~3h / ~5h / ~8h：**points 本来就等于估算的小时数**。这一点让下面的选项 B 不需要数据迁移。

---

## 痛点 1 · Size、定位和时间分配

### 诊断

Size 本身不是多余的，是放错了位置。现在它做两件事：

- **让用户估算**：建任务时必须选 size；
- **把估算当成绩展示**：board 上的 points。

但「分配时间」真正需要的是另外两样东西，现在都没有：

- **输入：用户的容量和意图。** 这周有多少时间，habit 和 project 各分多少，哪个 project 优先。
- **反馈：计划和实际的差距。** `completionRate` 和 expired 已经有了，但没有和容量联系起来。

### 选项

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 维持现状 | 用户继续选 size，points 继续当指标；只在 prompt 里让 LLM 用 size 估负载 | 不改代码 | 痛点原样留着：size 还是用户的负担，points 还是没人看的数字，LLM 也不知道用户这周有多少时间 |
| **B** · 每周时间预算 ✓ | 用户给容量和分配；LLM 估 size 并在预算内装箱；board 显示小时；points 作为分数退场 | 直接回答「让 LLM 分配我的时间」；用户只需要回答「这周有几小时」；粒度停在「周」，不偏离「决定这周做什么」的定位 | 新增用户设置；估算不准要靠「计划 vs 实际」校准；用户可能懒得每周填 |
| C · 精细时间管理 | 每个 task 估分钟，排进具体时段（日历式） | 最精确 | 变成日历 app，偏离定位；维护成本最高；和 board 的「拖到 Todo / Done」重叠 |

**推荐 B。** 如果用一句话来写定位：*决定这周把有限的时间花在哪些重复的事（habit）和要走完的事（project）上，再看实际做到了多少。* One-off 在 matrix 上，是「空隙里的事」，不进预算，或者预算里留一块缓冲。

### B 的分工

| 谁 | 负责 |
| --- | --- |
| 用户 | 这周有几小时；habit 和 project 怎么分（或者 project 的先后）；规则（痛点 2）；最后拍板 |
| LLM | 给每个 habit 和 step 估 size；在预算内装箱；把取舍说出来（「这样 Spanish 有 3h，Biomedical 这周先停」） |
| App | 存预算和规则；记录 done 和 expired；算出计划 vs 实际，放进 context 和 board |

### B 的实现计划（分步，每步都能停）

1. **B0 · 只改 prompt 的实验。** 不改 schema。排新一周时，用户没说的话，Claude 先问「这周大概有几小时」；把 size 换算成小时加总，控制在预算内，再按上周的完成率打折。试 2–3 周，看这个问题本身有没有用。可以搭 PR 5 一起发（Q6），也可以单独一个小 PR。
2. **B1 · 存下来。** 新表 `user_preferences`（`user_id` 主键，`weekly_capacity_hours`，以及 Q2 定的分配字段）；Settings 里加一个输入；`get_planning_context` 加 `capacity`、`plannedHours`、上周的 `doneHours`。用户不填时，默认沿用上周的值。
3. **B2 · UI 换成小时。**
   - Board 的 metrics 从 points 换成小时（「这周 8h 里完成了 3h」）。`points` 列直接当估算的小时数用，不需要迁移；copy 和 `en.json` 里的「pts」改成「h」。
   - Size 选择器变成可选（Q3）。
4. **B3 · Phase 2 的 Plan week** 自然变成三步：预算 → habits → projects，预算条贯穿整个流程。

### 痛点 1 的待拍板

见「待拍板」的 Q1–Q3。

---

## 痛点 2 · 并行上限（WIP limits）

这就是 Kanban 的 WIP limit，和这个 app 的出身契合。Owner 给的数字：一周最多 3 个 habit，同时最多 4 个 active project。

### 数什么

- **Habit**：这周 plan 上的 template 个数。`DAILY × 2` 也算 1 个。
- **Project** 的「active」有两种意思：
  - **手上的**：没有 archive 的 project 数量。管的是你手上有几条线。Owner 说的「同时最多拥有 4 个」是这个。
  - **这周的**：这周有 step 的 project 数量。管的是这一周的注意力。
  - 两个都有意义；可以先只做「手上的」（Q5）。
- **Archive 会多一层含义。** 有了上限以后，archive 同时表示「做完了收起」和「先停一下」。痛点 3 的 lifecycle 把这两层分开。
- **Unarchive（恢复）也算进上限**：4 个都在的时候，要先暂停或完成一个才能恢复另一个。

### 选项

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 只写在 prompt 里 | Claude 劝；app 不拦 | 最便宜，B0 那样可以先试 | 在 app 里操作完全不受约束；Claude 被说服就会超 |
| **B** · service 层硬限制，可在 Settings 改 ✓ | UI 和 MCP 走同一个检查；超了就做不了，要先去改设置或收起一个 | 规则是用户自己定的，「想超出就先去改设置」是一个有意识的动作，不是一时冲动；UI 和 Claude 行为一致；MCP 的报错直接让 Claude 问「要收起哪个」 | 需要用户设置表（和痛点 1 的 B1 是同一张）；UI 要有「到上限了」的状态 |
| C · 软提醒 | UI 显示警告、MCP 结果里带 warning，但都放行 | 不会卡住用户 | 提醒久了会被忽略，起不到限制关注点的作用 |
| D · UI 软、MCP 硬（或反过来） | 两边规则不同 | — | 不一致，不推荐 |

**推荐 B。** PR 5 已经先做了 A：guide 里的软提醒（3 个 habit、4 个 active project，暂定），用来试阈值合不合适。

### B 的实现计划

1. `user_preferences` 加 `max_habits_per_week`（默认 3）、`max_active_projects`（默认 4）；`null` = 不限。
2. 检查放在 service 层：
   - `createProject`、`unarchiveProject` 检查「手上的」project 数；
   - `createPlan` / `updatePlan`（以及 MCP 的 `createPlanFromSpec` / `patchActivePlan`）检查这周的 template 数；
   - 超了就返回 typed error：表单显示 copy，MCP 返回 `PLANNING_ERROR`（「You have 4 active projects, the user's limit. Ask which one to archive or pause first.」）。
3. UI：
   - 到上限时，「+ New project」和 Unarchive 禁用，提示「4 of 4 active — archive one first」；
   - Plan form 选到第 3 个 template 后，其余的不能再选，提示同样的话。
4. `get_planning_context` 加 `limits: {maxHabitsPerWeek, maxActiveProjects}`，guide 里加一句：提案不超过上限；要超的话，先问收起哪个。
5. **开启规则时已经超了的数据不动**：不会自动 archive，只拦新增。
6. Settings 里一个小区块，改上限。

### 痛点 2 的待拍板

见「待拍板」的 Q4、Q5。

---

## 痛点 3 · Habit 和 project 的 lifecycle、入口、用词

### Lifecycle：Active / Paused / Completed

现在 project 只有「没 archive / archived」两种，template 有一个 `isArchived` 但 UI 里没有入口。按 owner 的方向，两者用同一套三个状态：

| | Active | Paused | Completed |
| --- | --- | --- | --- |
| Project | 进行中，step 往这周排 | 先停一下，path 原样保留，可以恢复 | 收尾了：step 全部 done，或者用户宣布完成 |
| Habit | 每周在跟踪 | 暂时不跟踪，以后可能回来 | 已经内化，不再需要跟踪；历史保留 |

- **只有 Active 计入上限**（痛点 2）。想开新的，就先暂停或完成一个：这正是上限的出口。
- **从 Paused / Completed 都能回到 Active**，回来时受上限约束。
- **Habit 的 Completed 是一个正向的结束**，不是失败；回顾时可以单独列出「这段时间内化了哪些 habit」。

### 选项：状态怎么存

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 推导 | 不改 schema。Project：archived 且全部 done = Completed，archived 但有没做完的 = Paused；Habit：`isArchived` = Paused，没有 Completed | 不用迁移 | Habit 表达不了 Completed；project 的「全部 done 但还想留着当 Active」和「宣布完成但还有没做的 step」都表达不了 |
| **B** · 存一个 `status` 枚举 ✓ | Project 和 template 都把 `isArchived` 换成 `status`（`ACTIVE` / `PAUSED` / `COMPLETED`） | 两种东西一套词；用户的意图直接存下来；查询和上限检查都简单 | 一次迁移：project 全部 done 的转成 COMPLETED、其余 archived 的转成 PAUSED；template 的 `isArchived` 转成 PAUSED |
| C · 只给 project 做 | Habit 继续只有 archive | 改动小 | 两种东西的规则不一样，违背「同一套词」 |

**推荐 B。** 实现计划：

1. 新枚举 `LifecycleStatus`；`projects.status`、`task_templates.status` 两个列，一次迁移把 `is_archived` 转过去（规则见上），之后删掉 `is_archived`。
2. Service：`pauseProject` / `completeProject` / `resumeProject`，habit 同样三个；暂停 project 时把没做完的 step 退出这周（和现在的 archive 一样），暂停 habit 时从之后的 plan 里拿掉。
3. MCP：`update_project` / `update_habit` 的 `archived` 换成 `status`；guide 的 Rules 和 *Tell the user* 跟着改。
4. UI：Projects 页的 Archived 区分成 Paused 和 Completed；All steps done 的 banner 给「Complete」和「Add next steps」。

### 入口：habit 和 project 放在一起

现在 project 有自己的侧栏和 dock 入口；habit 还在 plan form 里。Owner 的方向是两者放在同一个入口。

- **A · 一个页面、两个 tab**（Habits · Projects），同一套 lifecycle 筛选（Active / Paused / Completed），上限显示在页头（「3 of 3 habits · 2 of 4 projects」）。
- **B · 一个列表混排**，用 kind 区分。
- 这个页面也是 Phase 2 三步 Plan week 的前一站：先在这里定 focus，再排这周。

先倾向 A：两种东西的字段不同（habit 有 cadence，project 有 path），混排会让每一行都很杂。具体在 Phase 2 的 mockup 里定。

### 同一套词，人和 AI 都容易懂

- UI、文档、给 LLM 的文字用同一套词：habit / project / one-off；active / paused / completed。不在 UI 上叫「Archive」、在 guide 里叫「pause」。
- 规则写成一小块编号清单（PR 5 的 guide 开头已经有 *Rules*），app 里（Settings 或帮助页）展示的也是同一份文字，改规则只改一处。
- 代码里的旧名字（`template`、`isArchived`、`instanceIndex`）在 Phase 2 cleanup 时按这套词改，或者至少不再出现在给人和 LLM 看的文字里。

### 痛点 3 的待拍板

见「待拍板」的 Q7、Q8。

---

## 三个痛点的关系

- **数量上限控制分散，时间预算控制总量，lifecycle 给上限一个出口。** 三个一起，LLM 才有东西可以权衡：「你有 4 个 project、10 小时，我建议给 Spanish 3h，Biomedical 这周先暂停。」
- **PR 5 的 Q2**（排新一周时先回顾、再问意图）在有上限和 lifecycle 之后，问的问题会更具体：「Biomedical 要暂停还是继续？」
- **预算和上限共用一张 `user_preferences` 表**（theme 仍然在 cookie 里，不搬）。
- **和 Phase 2 的 Plan week 对得上**：focus（habits ≤ 3、projects ≤ 4 active）→ 预算 → 这周的 habits 和 steps。

## 和 PR 5 的关系

PR 5 不等这份 spike：size 保留为 LLM 的估算单位，context 的形状只做加法，以后加 `capacity`、`limits`、`status` 不用返工。PR 5 已经做了的：guide 里的 focus 软提醒（3 / 4，暂定）、`update_habit`、Rules 清单。唯一可能搭车的是 B0 那一行 prompt（Q6）。

---

## 待拍板 · Open questions（Phase 2 开工时再定）

| # | 问题 | 选项 | 推荐 |
| --- | --- | --- | --- |
| Q1 | 时间分配的方向 | A 维持现状 · B 每周时间预算 · C 精细时间管理 | **B** |
| Q2 | 预算怎么给 | a 只给这周总时长 · b 总时长 + habit / project 的比例 · c 每个 project 各自的配额 | **先 a**：B0 实验只问总时长；LLM 的分配不合心意时再加 b。c 太细，接近选项 C |
| Q3 | Size 和 points 的去留 | a 照旧（用户必选，points 当指标）· b size 由 LLM 默认、用户可改，points 换成小时 · c size 只在 MCP 里，UI 隐藏 | **b**：size 还是好用的估算粒度，只是不该是用户的负担；points 换成小时不需要迁移 |
| Q4 | 上限是硬还是软 | A 只写在 prompt · B 硬限制、可在 Settings 改 · C 软提醒 | **B** |
| Q5 | Active project 怎么数 | a 手上的（没 archive 的）· b 这周有 step 的 · c 两个都要 | **先 a**，就是 owner 说的「同时最多拥有 4 个」；b 等用一阵再看 |
| Q6 | B0 实验要不要搭 PR 5 | 搭（guide 里加一行「先问这周有几小时」）· 不搭（单独一个小 PR，或者等 Phase 2） | **搭**：一行 prompt，不改 schema，PR 5 合并后就能开始试 |
| Q7 | Lifecycle 怎么存 | A 推导 · B `status` 枚举 · C 只给 project 做 | **B** |
| Q8 | Habit 和 project 的共用入口 | A 一个页面两个 tab · B 一个列表混排 | **A**，在 Phase 2 mockup 里定 |

## 风险

- **估算不准**：LLM 给的 size 和实际耗时会有偏差。靠「计划 vs 实际」校准，B1 之后 context 里有数据。
- **填预算的疲劳**：每周都问一遍会烦。默认沿用上周，只在用户想改时改。
- **硬上限卡住人**：遇到临时的第 5 个 project 会烦。改设置就能放开，这是有意的摩擦；如果用下来太烦，退回 C（软提醒）不需要改数据。
- **范围蔓延**：时间预算很容易滑向日历式的时间块（选项 C）。粒度停在周；以后最多到「天」，不到时段。

## Considered, not proposed · 考虑过但不提议

- **日历式排程**（选项 C）：偏离「决定这周做什么」的定位。
- **超过上限时自动暂停**：暂停和完成都是用户的决定（Phase 1 已定 archive 只由用户发起），系统不替用户收起。
- **按天的容量**（工作日 / 周末不同）：等周预算用过一阵再说；Phase 2 的 habit cadence 已经会区分工作日。
- **把 points 留作游戏化的分数**：owner 说实际没起作用，换成小时更直接。

## 拍板之后

1. 方向定了以后，在 Phase 2 规划里把它排进 PR 序列（新的 Phase 2 spike，或者扩写 `week-model-restructure.md` 的 Phase 2 部分）。
2. Tracker：*Redesign the point system and metric tracking* 和 *One entry for habits and projects* 并进 Phase 2 那一条，按结论改写或删掉。
3. 如果 Q6 选「搭」，PR 5 的 guide 加那一行。
4. 状态从 draft 改成 awaiting owner review，走 AGENTS 的 spike 流程。
