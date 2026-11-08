# Spike: App pain points for Week model Phase 2

**Status: draft** · 2026-10-13（2026-10-14 加入 owner 的笔记：lifecycle、共用入口、同一套词；2026-11-03 第二轮：owner 用了一个月后对 size / points、反馈和 risk 的三个新观察，加上一轮竞品和文献调研，写成痛点 4、5 并修订痛点 1——这一轮的结论等 owner 在 PR 上 review）· 定稿留到 Phase 2 真正开工时 · 回答 tracker 条目 *Week model Phase 2 › Investigate the app pain points*（Plan › Future）、*Redesign the point system and metric tracking*（Cross-cutting › Medium）和 *Per-kind risk rules*（Board › Future）· 来源：PR 5 spike 讨论（PR #61）、owner 2026-11-03 的 brainstorm · 相关：`design/spike/archived/week-model-restructure.md`（Phase 1，implemented）、`design/spike/archived/week-model-pr5-mcp-projects.md`（MCP，implemented）、`design/spike/daily-rhythm-notifications.md`（PR #33，awaiting review：ritual、nudge、day card）· Phase 2 exploration：`design/mockup/mockup-week-model-phase2.html`

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off、size / points、`TaskSize` …），和代码、mockup、tracker 一一对应。

## Trigger · 起因

讨论 PR 5 时，owner 提了几个用下来的痛点：

1. **Size 越用越多余，定位也模糊了。** Size 最初仿照 agile 的 story point（1 point = 1 天），后来改成 1 point = 1 小时，但实际使用中没有起作用。一个好的工具应该关注用户愿意把多少时间分给 habit 和 project，再给每个小 task 估 effort，合理规划时间；但做得太细会让定位偏移。App 最初的目的是规划要做哪些固定的事，加入 project 之后定位有些模糊。**现在想做到的是：让 LLM 高效地分配我的时间。**
2. **给 habit 和 project 加规则**，比如一周最多并行 3 个 habit、同时最多 4 个 active project，限制关注点，不要太分散。
3. **Habit 和 project 的 lifecycle**（owner 的笔记，2026-10-14）：active、archive / pause、complete。Habit 的 pause 表示暂停，类似 project 的 archive；complete 表示这个 habit 已经内化了，不需要再跟踪。Habit 和 project 的入口放在一起；新的规则要让人和 AI 都容易懂。

一个月后（2026-11-03）owner 又补了三条，都指向 points 这套东西不合理，并要求连带调研 risk level 的设计：

4. **根本不会去看 size。** Habit 的 estimate 和实际没有区分度——「这是 habit 不是工作」，时间安排也没那么灵活，不会按小时重排一周（更 J 的计划型用户也许会，owner 不会）。
5. **分数不是反馈。** Points 的进度没有用，「完成了多少」比 points 有用；真正起作用的是卡片上那排小 dot。
6. **没有 reward 的感觉。** 怎么把反馈给到用户是最难的一块：大家的多巴胺回路已经被短视频改过了，看一个数字涨根本没有 reward feedback。这多半是公认的难题，要去看别的 app 和文献怎么做。
7. **Risk level 要重新设计**，结合 Phase 2 的改动一起想。

这份 spike 是 **draft**：不排 PR，也不在现在拍板。它把问题和选项整理出来，等 Phase 2 真正开工时再定稿，作为 Phase 2 规划的输入。痛点 1–3 来自第一轮，痛点 4、5 和痛点 1 的修订来自第二轮的调研（调研本身在文末「调研 · Research」）。Phase 2 已经有的方向（habit 自带 cadence、三步的 Plan week、去掉 AI chat、Done 改成按天的日志、卡片上的 ✓）见 tracker 和 Phase 2 mockup。

## 现状 · What's there today

| 用到 size / points 的地方 | 现在做什么 |
| --- | --- |
| 建 template、step、one-off | 用户必须选 size（5 档），有 effort 提示和 L / XL 的拆分提醒 |
| 卡片 | 中性的 size chip（`M·3`）；signal line 上 habit 是本周的 dots（一个 instance 一个点，做完填实，自己那颗带环），step 是 project 的 path |
| Board 的 metrics | Today ring（done / total 个数）、Today points、Week points（done / projected）、Daily avg、Week progress bar——除 ring 和 bar 外都按 points 算 |
| 一周结束 | 空 board 上的 recap：完成率、done / total、points earned |
| MCP | 按 size 和 `completionRate` 校准；guide 里写着「EXTRA_SMALL ~1h = 1 pt」，让 Claude 把 step 和 one-off 的 points 和 habit 的一起数 |
| Plan | **没有**「这周有多少时间」的输入；一周排得满不满，只能靠 frequency × size 心算 |
| Risk | Phase 1 关掉：卡片没有 risk badge、边框和 15:00 / 20:00 的时钟阈值（`design/flows/board.md` 的旧规则留作参考） |
| 完成的瞬间 | 把卡拖到 Done：卡片划线、dot 填实、ring 走一格；没有其他反馈 |

| 数量 | 现在 |
| --- | --- |
| 一周的 template（habit） | 不限 |
| Project | 不限；archive 是用户主动收起 |

`TaskSize → points` 是 1 / 2 / 3 / 5 / 8，effort 提示是 ~1h / ~2h / ~3h / ~5h / ~8h：**points 本来就等于估算的小时数**。这一点让痛点 1 的选项不需要数据迁移。

---

## 痛点 1 · Size、points 和时间分配

### 诊断

Size 本身不是多余的，是放错了位置。现在它做两件事：

- **让用户估算**：建任务时必须选 size；
- **把估算当成绩展示**：board 上的 points。

但「分配时间」真正需要的是另外两样东西，现在都没有：

- **输入：用户的容量和意图。** 这周有多少时间，habit 和 project 各分多少，哪个 project 优先。
- **反馈：计划和实际的差距。** `completionRate` 和 expired 已经有了，但没有和容量联系起来。

**2026-11-03 补充：owner 一个月的使用把问题缩得更小——size 对 habit 不提供任何信息。** 一个 habit 的 instance 每次都是同一个 template，estimate 和实际不会有区分度；决定「跑 3 次」之后，每次是 XS 还是 S 不改变任何决定。调研（文末「调研 · Research」A、B）从三个方向印证了这一点：

- **没有一个主流 habit tracker 要用户估 effort。** 14 个里只有 Habitica 让选难度（4 档乘数），其他的把「大小」定义成可观察的目标：次数、数量或计时器时长。有 points 的产品也不按大小给分：Finch 每个 goal 固定 5 energy，Todoist Karma 只看个数和准时。Habitica 唯一的同行评议研究（Diefenbach & Müssig 2019，n = 45）里所有参与者都出现了反效果，而「觉得奖励机制不合理」是动机下降的预测因子——一个和真实投入对不上的分数不只是没人看，还会侵蚀对系统的信任。
- **Agile 那边早就吵完了。** Thoughtworks（2013）发现 story 大小趋同后按个数和按 points 画的 burn-up「惊人地相似」，于是只数个数；Magennis「没见过 story point 预测好过数个数」；Vacanti 用一个几秒钟的 right-size 判断（「能在一个 sitting 里做完吗？」）加 WIP limit 取代估点；Jeffries（story point 一词的作者）说「追踪 estimate 和 actual 的差距至多是浪费」；Cohn 守住的底线只剩一句——**只在估算能影响某个决定时才估**。个数失效的唯一情形是「已交付的和剩下的大小不一致」，而同一个 template 的 habit instance 恰好不会这样。
- **行为研究说人估不准，而且学不会。** 时间预测被 anchor 拉着走（d ≈ 1.19，知道有偏差也去不掉）；小任务倾向高估、大任务倾向低估；30 个任务的反馈只把 90% 区间的覆盖率从 64% 提到 81%，而且**亲自做事的人进步最少**（Halkjelsvik & Jørgensen 2018）。让用户自己校准 habit 的 size，是文献里最难的那个版本。
- **Habit 的强度看的是「开始」，不是「做了多久」。** Phillips & Gardner（2016）：instigation habit（到点自动开始）是唯一预测锻炼频率的因素，execution habit 不是——instance 的大小是 execution 的细节。Etkin（2016，JCR，6 个实验）：给一件本来喜欢的活动计量，产出变多、乐趣变少、之后更不愿继续，因为它「变成了工作」；按「学习 / 有用」framing 时这个效应消失。给 reading、workout 这样的 habit 标 size 和 points，正是这个条件。
- **个人 planner 只在日历需要的时候用时长。** Sunsama、Motion、Reclaim 用分钟数是为了把事排进日历；Things、To Do 没有大小字段；抽象的 point 只存在于团队工具。做了 planned-vs-actual 的产品（Sunsama、Marvin）都没公布准确率数据，用户要的也不是逐条对比，而是**从历史学出来的容量**（Marvin 的「最近 30 天的典型一天」、Sunsama 用户五年里反复要的汇总报告）。

结论：**size 对 habit 不该问；对 step 和 one-off 顶多是「一个 sitting 能不能做完」的 right-size 判断，由 LLM 默认给**；一周的负载用**个数**说（habit instance、step、one-off 各几个）；校准靠**历史的完成量**（`completionRate`、最近几周实际做完的个数），不靠逐条的 estimate vs actual。Points 作为分数退场——它作为反馈的替代品在痛点 4。

### 选项：时间怎么分配

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 维持现状 | 用户继续选 size，points 继续当指标；只在 prompt 里让 LLM 用 size 估负载 | 不改代码 | 痛点原样留着：size 还是用户的负担，points 还是没人看的数字，LLM 也不知道用户这周有多少容量 |
| **B** · 容量从历史学，LLM 在容量内装箱 ✓ | 预算默认 = 最近几周实际完成的量（按 kind 的个数；size 若保留则加一个小时合计）；用户只在例外的周说一句（「这周很忙」）；LLM 估大小、装箱、说出取舍；board 不再显示 points | 直接回答「让 LLM 分配我的时间」；用户什么都不用填，和 owner「不会按小时重排」的习惯一致；粒度停在「周」 | 新用户前几周没有历史（用 guide 里的默认：3 个 habit、4 个 project 已经是满的）；LLM 的 size 估算要靠完成量校准，不靠逐条对比 |
| C · 精细时间管理 | 每个 task 估分钟，排进具体时段（日历式） | 最精确 | 变成日历 app，偏离定位；维护成本最高；和 board 的「拖到 Todo / Done」重叠；owner 明确不是这类用户 |

**推荐 B。** 比第一轮的 B 少了「每周问几小时」这一步：调研说用户想要的是学出来的容量，不是每周填表。如果用一句话来写定位：*决定这周把有限的注意力花在哪些重复的事（habit）和要走完的事（project）上，再看实际做到了多少。* One-off 在 matrix 上，是「空隙里的事」，不进预算，或者预算里留一块缓冲。

### 选项：size 和 points 的去留

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| a · 照旧 | 用户必选，points 当指标 | — | 痛点 4、5 都是从这里长出来的 |
| b · size 由 LLM 默认、用户可改，points 换成小时（第一轮的推荐） | board 的 metrics 从 pts 变 h | 不迁移 | 「这周 8h 里完成了 3h」还是一个没有参照、没有感觉的数字；对 habit 仍然是噪音 |
| **c** · size 从前台退场 ✓ | 卡片不再显示 size chip；board 的 metrics 全部换成个数（痛点 4）；表单里 size 可选、默认 S（Claude 建的由它给）；`points` 列保留为小时估算，只给 LLM 的装箱和 Plan week 的「这周 vs 平时」合计用 | 不迁移、不改 schema，一个 UI PR 就能做；LLM 还有一个单位可用 | 两套单位（个数给人看、小时给 LLM 用）要在文档里说清；habit 的 size 还在表里，只是没人看 |
| d · 彻底删掉 size 和 points | habit 的时长写进 description（「45 min — gym or run」，mockup 里已经这么写）；step 和 one-off 只有一个 right-size 判断（一个 sitting · 要拆）；负载 = 按 kind 的个数 | 概念最少；和调研的结论完全一致 | 一次迁移（两张表、MCP 的 size 参数、Zod、SizePicker / SizeChip、i18n、fixtures）；LLM 失去唯一的数值单位，装箱只能数个数 |

**推荐 c，d 作为 Phase 2 cleanup 的候选。** c 把 size 从每个人每天看的地方拿掉，代价接近零；跑几周之后如果 LLM 的小时合计也没人用——Plan week 的「这周 vs 平时」用个数就够——就在 cleanup 时走 d，和 `DOING`、`Plan.mode` 一起删。先退场，再删除。

### B 的分工

| 谁 | 负责 |
| --- | --- |
| 用户 | 例外时说一句容量（「这周出差」）；habit 和 project 的先后；规则（痛点 2）；最后拍板 |
| LLM | 给每个 step 估 size（right-size：一个 sitting，否则拆）；在历史容量内装箱；把取舍说出来（「上四周你平均做完 15 个 habit instance 和 3 个 step，这周 Spanish 3 次、Biomedical 先停」） |
| App | 存规则；记录 done 和 expired；算出最近几周的完成量，放进 context 和 Plan week |

### B 的实现计划（分步，每步都能停）

1. **B0 · 只改 guide。** 不改 schema。*Calibrate with lastPlan* 那一条改成：用最近几周实际完成的个数（每个 habit 的 completed / total、做完的 step 和 one-off 数）当这周的容量，不问用户有几小时；只在用户说这周特殊时调整。一个小 PR，Phase 2 之前就能发。
2. **B1 · context 里给历史。** `get_planning_context` 加 `recentWeeks`：最近 4 个 plan 每周按 kind 的 planned / done 个数（和小时合计，c 保留 `points` 的话）。Plan week 的「Last 4 weeks you finished …」读同一份数据。
3. **B2 · UI 退场。** 卡片去掉 size chip；board 的 metrics 换成个数（痛点 4 定形状）；SizePicker 变成可选、默认 S；`en.json` 里的「pts」只剩 Plan week 的合计（或者也换成个数）。
4. **B3 · Phase 2 的 Plan week** 三步：habits → projects → one-offs，侧栏对比「这周 vs 最近四周」。`user_preferences` 只为痛点 2 的上限而建；容量不需要用户设置。

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
| **B** · service 层硬限制，可在 Settings 改 ✓ | UI 和 MCP 走同一个检查；超了就做不了，要先去改设置或收起一个 | 规则是用户自己定的，「想超出就先去改设置」是一个有意识的动作，不是一时冲动；UI 和 Claude 行为一致；MCP 的报错直接让 Claude 问「要收起哪个」 | 需要用户设置表（`user_preferences`，只放上限——痛点 1 的容量从历史学，不需要设置）；UI 要有「到上限了」的状态 |
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

## 痛点 4 · 反馈和 reward：points 不是反馈

### 诊断：为什么分数没有感觉，dots 有

Owner 的三个观察（分数没用、完成个数有用、卡片上的 dots 有用）不是个人口味，调研（文末「调研 · Research」B、C）里每一条都有对应：

- **一个计数器越大越没感觉。** Duolingo 自己写过：从 2 天到 3 天是 +50%，从 200 到 201 是 +0.5%。「Week 23 / 41 pts」没有参照物，「Daily avg 3.2」像一个分数。Points 还是异质东西的加总（habit、step、one-off，各自的 size），这个数字在世界里没有对应物；dots 一对一地对应着做过或没做的 instance——**dots 把工作画出来，points 把工作数出来**。GitHub 2016 年拿掉 streak 计数后的自然实验（433k 开发者）说明计数器改变的是人**做什么**（为了保链提交一行）而不是做多少；Done 日志展示的是实质（卡片本身），避开了这一点。
- **分数不增加内在动机，而且会衰减。** 唯一把「量化」和「分数」拆开做随机对照的研究（Zuckerman & Gal-Oz 2014，走路 app，n = 59）：有实际走路时长的版本和加了 points、leaderboard 的版本没有差别，访谈里参与者说 points「没有意义，他们更关心走了多久」——这就是 owner 的观察在随机实验里的样子。Points / levels / leaderboards 提高了产出数量，对内在动机和 competence 的影响为零（Mekler et al. 2017，n = 273）；gamification 的效应随时间衰减——一周内 d = 1.57，按年 −0.20，「很可能是新鲜感在起作用」（Kim & Castelli 2021 meta-analysis）；Habitica 的 45 个用户全部出现了反效果，「觉得奖励机制不合理」预测动机下降（Diefenbach & Müssig 2019）。SDT 的老结论在这里：预期的、完成即给的有形奖励降低内在动机（Deci, Koestner & Ryan 1999 meta-analysis：有形奖励 d = −0.30，预期奖励 −0.32），而**信息性的正向反馈**是唯一为正的那类（d = +0.33）。Hamari（2013）的 1.5 年 field experiment：badge 只对看它的人起作用——owner 不看 size 和合计，它们按定义就是惰性的。
- **Dots 落在反馈研究里效果最好的那个格子，points 落在最差的。** Harkin et al.（2016，138 个随机研究的 meta-analysis）：监控进度提高目标达成（d+ = 0.40），其中监控**行为**（而不是抽象结果）d+ = 0.79、**记录下来** 0.43 vs 0.29、**当场反馈** 0.68 vs 0.35——卡片上的 dots 正是这三样。Kluger & DeNisi（1996，607 个效应量）：38% 的反馈干预让表现变差；拉低的是把注意力引向自我评价的那类（和标准比的达成度、表扬 d = 0.09、打击性反馈 −0.14），拉高的是 velocity（和自己上周比的变化，0.55 vs 0.28）和任务信息。「Week 23 / 41 pts」「Daily avg」是达成度对标准，正是弱的那一格。
- **挫折比进展重 2–3 倍。** Amabile & Kramer 的 12,000 份日记：进展是好日子最强的驱动，而挫折的效应是进展的 2–3 倍。「23 / 41 pts」把每一天都读成一个 shortfall；同样的数据换成「做了什么」，就把更强的那个负向通道关掉了。
- **dots 为什么有效**：它是空间的、逐个的、二元的、当场的（Woolley & Fishbach 2017：当场的奖励比延迟的更能预测坚持；一周的合计是延迟的、抽象的）；填实和空心同时显示「做到哪」和「还剩多少」，哪一边小就看哪一边（small-area hypothesis，Koo & Fishbach 2012）；每一颗都是一个被画出来而不是被数出来的 small win；它是一条不会归零的链——错过的那天是一颗空心 dot，Forest 的说法是「死树留着，是诚实的记录，不是判决」；而且它就在你拖的那张卡上。有对照实验的例子是 UbiFit Garden（Consolvo et al. 2008）：手机壁纸上的花园（花 = 活动，蝴蝶 = 达标），3 个月的 field study 里有花园的人维持了活动量，没有的人显著下降——**非数字、累积的画面**是「变大」仍然有 reward 感的唯一形式。

### 「多巴胺回路被短视频改了」这件事

机制上没有争议（Eyal、Harris、Alter、Lembke 都讲 variable reward），但「所以要和它比刺激」这个结论不成立：

- Eyal 自己的分类里，planner 的奖励属于 **rewards of the self**（mastery、completion），变化来自工作本身而不是 UI；他也指出这种拉力在「队列清空」的那一刻消失——所以**让「清空 / 关上这一天」本身成为奖励状态**，而不是一个数字。Lembke 的建议是重新校准、容忍无聊，不是用更强的刺激去赢。
- 公布过数字的产品里，烟花带来的很少，规则带来的更多：Duolingo 的 streak 动画给新用户 +1.7% D7；「一节课就算一天」+3.3% D14，streak wager +14% D7，weekend amulet +4% 回访 / −5% 断链，两个 streak freeze +0.38% DAU。**杠杆在宽恕和降低门槛，不在更响的庆祝。**
- 更响的那一边有记录在案的代价：断掉的 streak 比完整的 streak 更泄气（Silverman & Barasch 2023，7 个研究；自责时更强，可修复时更弱；「什么算 streak 是可以定义的」）；streak 和 reminder 制造依赖，app 一停行为就停（Renfree et al. 2016）；正向强化对 habit 的自动化无效，起作用的是情境线索和 if-then plan（Stawarz, Cox & Blandford 2015）；Asana 刻意让 unicorn 随机出现，Apple 的 haptics 原则是「别因为能加就加，会稀释真正重要的东西」。
- 「短视频把回路改了」这个前提本身的证据：Nguyen et al.（2025，Psychological Bulletin，71 个研究、98k 人）发现短视频使用和注意力（r = −.38）、抑制控制（−.41）负相关，但 87% 是横断面研究，效应跟着「强迫性使用」的分数走（−.37）而不是时长（−.20）；Chiossi et al.（CHI 2023）的实验里刷 TikTok 后 prospective memory 变差——这是「planner 应该是安静的、重新展示意图的地方」的理由，不是「要更刺激」的理由。「多巴胺排毒」的说法误读了多巴胺（Grinspoon，Harvard Health 2020）。没有任何研究显示对低强度信息性反馈的敏感度被「重训」过；owner 自己「dots 有效」就是反例。更好的解释是 habituation 加上**数字没有现实世界里的对应物**。
- 诚实的结论：**没有研究证明安静的、内在的反馈留人更久**；证据只说分数不增加内在动机、效应会衰减、有反效果。所以这确实是公认的难题，但难题的形状不是「怎么做出爽感」，而是「怎么让闭合感和可见的记录替代分数，并且不惩罚人」。这个产品能做的三件事：当场的、局部的确认（每次都有，很短）；会填满的画面（dots、按天的日志）；一天和一周的闭合（ritual）。

### 调研：别人在完成的瞬间、一天、一周做什么

| 时刻 | 做法 | 谁 | 结果 / 说法 |
| --- | --- | --- | --- |
| 完成瞬间 | 快速手势 + 当场的局部状态变化 + 可选声音 | Things（checkbox、Taptic）、Todoist（完成音；Karma 在别的页面）、Streaks（长按大按钮、自定义音效、「让每天打勾出奇地满足」） | 用户说「满足」的都是这一类；数字都放在别处 |
| 完成瞬间 | 偶然的庆祝 | Asana 的 unicorn（官方：「连续完成几个才可能出现」，随机、可关）；Duolingo 的 streak 动画 | 偶然惊喜和每次确认是两份工作：Asana 用户从 2022 起一直在要「每次都出现」，官方不答 |
| 完成瞬间 | 会长大的东西 | Finch 的鸟（每个 goal 固定 5 energy，不按大小）、Forest 的树、Habitica 的角色、UbiFit 的花园 | 非数字、累积；Forest 把死树留下当记录 |
| 一天 | 日终闭合 | Apple rings（「每天关上」+ 晚间 nudge）、Todoist 的 daily goal 饼图、Finch 的鸟晚上回来讲故事、Sunsama 的 daily shutdown | 「这一天关上了」是奖励状态本身 |
| 一周 | 送到面前的回顾 | Apple 周一的 notification + Weekly Summary；WHOOP 周一的 assessment；RescueTime 的周邮件；Sunsama 的 weekly review（三步，第一步写「本周的大赢」） | 回顾几乎都是**送达**的；没有 push 就在下次打开时迎面给（Sunsama：没 shutdown 就先 review 昨天） |
| 长期 | 填满的画面 | GitHub 贡献图、Streaks 的日历、year in pixels、Forest 的森林、Strava 的 Year in Sport | 画面填满，不是数字递增 |
| 宽恕 | 不归零 | Duolingo freeze / wager / amulet（都有正向 retention 数据）；Calm、Day One 可修复；Habitify skip / off mode；Apple 90 天 pause；Loop 的衰减分 | 所有公布数字的产品，杠杆都在这里 |
| 反思 | 日终 15 分钟 | Di Stefano, Gino, Pisano & Staats：Wipro 的培训生每天最后 15 分钟写当天学到的，一个月后考试高 22.8% | 承载效应的是「写下来」这一步；一份不带提示的日志是便宜的那一半 |

### 选项

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 照旧 | points 的 Today / Week / Daily avg + ring + bar | 不改代码 | 没感觉；对着 projected 的 shortfall meter |
| B · 游戏化 | XP、等级、streak 计数、每次撒花（Habitica / Duolingo 路线） | 头一周新鲜 | 新鲜感 ≤ 1 周；不增加内在动机；断链更泄气；Habitica 式反效果；每次撒花会 habituate——owner 已经说了「光看分值没用」，更响的分值也不会有 |
| **C** · 把反馈做成画面：dots 到处、按天的 Done 日志、✓ 的当场确认 ✓ | board 顶部一条 7 格的「本周」日条（每天一格：做了几个 / 计划几个）加「今天」的个数；Done 列变成按天分组的日志（Phase 2 已定）；✓ 按下去是一个很短的局部动画加一下振动，每次都有，不撒花；周末的 recap 变成 7 格 + 每个 habit 的一行 dots + 做完的 step / one-off 清单 | 和 owner 观察到的「dots 有效」一致；全是个数和画面，没有分数；不需要新数据，全部从现有 tasks 推导 | 安静：想要爽感的人会觉得淡；board 顶部只有一行可用 |
| D · Ritual：Close the day 的 day card | 晚上一次性关掉这一天，day card 先说做成了什么再说明天；process streak（关掉的天数）可免罚（daily-rhythm spike 的 D1 + D2） | 文献里最强的两条（progress principle、日终反思）都落在这里；peak-end | 依赖 daily rhythm；没有 push 时只能在下次打开时补 |
| E · LLM 写的回顾文案 | 周一让 Claude 讲上周 | 变化对抗 habituation | 每条都有成本和延迟，容易空洞；MCP 的 recap 已经在做（guide › Planning a week 第 1 步） |

**推荐 C 为基础，D 作为 daily rhythm 的一部分叠上去；B 不做；E 已经由 MCP 的 recap 覆盖，不另做。**

### C 的形状

1. **卡片**：signal（dots / path）不动，去掉 size chip（痛点 1）。✓（Phase 2 定）按下去：划线、dot 填实、一个约 150 ms 的局部动画，Android 上 `navigator.vibrate` 一下（iOS 的 PWA 没有 haptics，只有动画）；默认无声，声音以后 opt-in。不做随机庆祝。
2. **Board 顶部**（替换 `ProgressDashboard`）：「本周」7 格日条 Mon–Sun，每格是当天 planned 的 instance 做了几个（格里用 dots 或一条 mini bar，今天的格带环）；「今天」done / planned 的个数（Today ring 保留，按个数）。去掉 Today points、Week points、Daily avg；Week progress 并进日条。Phase 2 mockup 里 Done 行的「Mon 4 · Tue 2 · Wed 0」就是它的种子，去掉 pts 即可。
3. **Done 列 → 按天的日志**（Phase 2 已定）：每天一组，卡片缩成一行；carried / late 的过去式标记（痛点 5）。这就是 done list：做过的事按天摆出来，不是数出来。
4. **周末的 recap**（空 board 的 returning user）：7 格日条、每个 habit 一行 dots（done / target）、做完的 step 和 one-off 的清单；不再显示 completion % 和 points earned。Fresh-start effect（Dai, Milkman & Riis 2014）：周末只回顾不提要求，「Create plan」是新一周的起点。
5. **Miss 不归零，回来才是要标的事**：没有 streak 计数；错过的 instance 是空心 dot；每周一重新开始（Lally et al. 2010：漏一次对 habit 形成没有实质影响）。Milkman et al.（2021，Nature，61,293 人、54 种干预）里最有效的一种是**奖励漏掉一次之后的回归**（+16%），不是奖励不断的连续——所以隔几天回来时迎接的是「这是今天」，不是欠账。以后要 streak 的话只做 process streak（关掉一天的次数，可免罚，daily-rhythm spike D2），不做结果 streak。Habit 的周目标也可以是区间（「3–5 次」，Scott & Nowlis 2013：区间目标更容易再投入），4 / 5 就是达成而不是 shortfall——Phase 2 定 cadence 时顺带决定。
6. **数据**：全部从现有 tasks 推导（`doneAt`、`forDate`、`periodKey`、status）；`BoardProgress` 换成按天的 done / planned 个数（现在的 aggregate 已经按 `KANBAN_TZ` 的「今天」过滤，扩成 7 个桶）。不改 schema。
7. **MCP**：Claude 的 recap 读同一份按天的个数，先说做成了什么（guide 的 recap first 已经是这个顺序）。

### 痛点 4 的待拍板

见「待拍板」的 Q9–Q12。

---

## 痛点 5 · Risk level：按 kind 重做

### 诊断：旧的 risk 为什么关掉

Phase 1 之前的 risk 按时钟和天数算：今天的 daily 过了 20:00 转 warning，昨天 rollover 过来的过了 15:00 转 danger，weekly 看 `daysElapsed`，one-off 看创建以来的天数（`design/flows/board.md` › Task Risky Level，已标 switched off）。PR #47 初版 mockup 的 Cards & risk 画面把问题说清了：**一条彩色边框承载四个不相关的意思**——「今晚会 rollover」「weekly 落后 pace」「这个 one-off 放久了」「过了 20:00」——卡片说不出是哪一个。

调研给了两个更底层的解释：

- **它标的是「今天还没做」这个几乎每天早上都为真的二元状态。** Streaks、Habitify、Duolingo 都把这件事当成 count（"3 remaining"）和 reminder 处理，不上色。一个大部分时间都亮着的颜色，就是 alarm 研究里的高 false-alarm 率：ICU 里 72–99% 的 alarm 是假的（Sendelbach & Funk 2013），操作者的响应率会向 alarm 的可靠度靠拢（cry-wolf effect，Bliss et al. 1995）。颜色亮得越多，越没人看。
- **Urgency 本身会扭曲选择。** Mere-urgency effect（Zhu, Yang & Hsee, JCR 2018）：人会放下重要的事去做「看起来急」的事，哪怕后者回报更低；把回报摆在旁边能减弱这个效应。满板的 amber 等于把注意力推向「谁在变色」，而不是「谁重要」。

Phase 1 把 risk 整个关掉是对的。要带回来，规则必须每条都对应一个 kind 自己真实的风险，而且只在用户能做点什么的时候亮（Carbon、NN/g：没有可做的动作就不要 status indicator）。

### 调研：别人怎么标「有风险」

| 做法 | 谁在用 | 规则 | 对我们的启发 |
| --- | --- | --- | --- |
| Pace（buffer 天数） | Beeminder | 唯一把 pace 完整定义出来的 habit 工具：risk = 还能偷懒几天；绿 ≥ 3 天、蓝 2、橙 1（「明天就是 emergency」）、红 0（「今晚不做就 derail」） | 对 N× / week 的 habit：buffer = 剩余天数 − 剩余次数。Owner 定的 amber 条件（剩的次数 ≥ 剩的天数）正是 Beeminder 的**红**，比它宽一档——对一个没有罚款的工具是合理的 |
| 长期强度分 | Loop Habit Tracker | score 每天乘 0.5^(√f / 13)：daily habit 13 天不做强度才掉一半 | 是「这个 habit 在漂」的长记忆指标，不是本周内的 alarm；Phase 2 Habits 页「最近四周」的小柱子是它的位置 |
| Count + 文字，不上色 | Streaks、Apple Watch、Habitify | "3 remaining"、"on track or falling behind"、complication 和 app badge；Habitify 没有任何 at-risk 状态 | 最小主义工具都用数字和词说 risk，颜色留给 kind |
| 一个周期一次的固定 nudge | Fitbit、Garmin | Fitbit 整点前 10 分钟不够 250 步振动一次，达标再振一次；Garmin 静止 60 分钟提醒 | 「一个周期一次、不升级、做了就清」的形状适合 daily instance，属于 daily-rhythm spike 的 nudge，不属于卡片颜色 |
| Card aging | Trello、Jira、Businessmap | Trello 按周淡出（社区说 1 / 2 / 4 周）；Jira 每待一天一个点（最多 32）；Businessmap 的 aging WIP 对比 cycle time 的 85 百分位 | 都是以周计的节奏，没有一个在第一天就变红；我们的卡片只活 1–7 天，不在这个区间 |
| Carry-over 计数 | Amazing Marvin | Procrastination Count：从第一次排期起每天一个「!」，先橙、3 天后红；可显示成「!6」或「!!!」 | 唯一把 carry-over 计数画在卡片上的工具：**count + 颜色**，不是只有颜色 |
| 自动收走 | Sunsama、Motion | Sunsama 连续 rollover N 天后自动归档；Motion 把 "Can't fit" / "Past due" 钉在顶部并建议拆块 | Kanban 文献对卡住的卡片的答案也是「太大或被 block → 拆」；两周是常见的「stuck」经验值 |
| 人判断的 health | Linear、Asana | On track / At risk / Off track 都由人选；Linear 只自动算 staleness：先虚线边框，再灰色 "Update Missing"，从不变红 | 软升级两步，终点不是红 |
| 到期即红 | Todoist、Asana、ClickUp、Planner、To Do | 过期那一刻日期变红；没有一个工具在到期前 2 天变 amber；「快到了」靠分组（Today、Next 7 days、Overdue 区） | 「due 当天红」和所有工具一致；「2 天内 amber」是我们自己的约定，要靠 app 教会用户 |

心理学与 HCI 的几条底线：

- 警示色是有序的（红 > 橙 > 黄；Chapanis 1994，Braun & Silver 1995），但人**分不清 WARNING 和 CAUTION**：两档「黄」读不出差别，所以每个 kind 只有一档 amber，不做两级。
- WCAG 1.4.1：颜色不能是唯一的信息载体，约 8% 的男性有色觉缺陷；NN/g 测得 icon + 颜色比只有颜色快 37%。→ 每个 risk 都要有一个非颜色的孪生信号（空心 dots 的个数、「×2」、日期文字）。
- 控制性的措辞引发 reactance（Miller et al. 2007）；停止 self-tracking 的人一半感到 guilt，把「回来继续」的提示读成 judgmental（Epstein et al.，UbiComp / CHI 2016）。→ 文案是问句（"Split it?"），habit 永远不红：红色的 habit 是 app 在评判人，不是在报告一个外部 deadline。
- Small-area hypothesis（Koo & Fishbach 2012）：周后半段看「还剩几次」比看「做了几次」更有动力；U 形曲线（Bonezzi et al. 2011）说中段最泄气。→ pace 的 amber 配合空心 dots，正好是周后半段「还剩多少」的小面积。

### 选项

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 不做 risk（保持关闭） | dots 和 path 已经显示进度；leftovers 交给 Close the day | 零 false alarm | 一个 3× / week 的 habit 周四还 0 次、一个 step 带了三周、一个今天到期的 one-off，和其他卡片长得一样 |
| **B** · 按 kind、画在 signal line 上、只有 amber 加一个红 ✓ | habit pace amber；step carried ≥ 2× amber + 「×2」；one-off due 2 天内 amber、当天或过期红——板上唯一的红（PR #47 初版 mockup 的规则，tracker 的方向） | 三条小规则，各自绑在 kind 自己的 signal 上；红只有一个意思；非颜色孪生信号现成（dots、计数、日期） | 要新存两样数据（`carriedCount`、`dueAt`）；habit 的 amber 可能连亮几天，要最淡；「2 天内 amber」没有行业默认，要学 |
| C · Beeminder 式四色梯子 | habit 卡片按 buffer 天数绿 / 蓝 / 橙 / 红 | 多一档「明天就得做」的预警 | 卡片上已经有 kind 色，再叠四色读不出来；研究说两档黄本来就分不清；n = 1 的工具不值 |
| D · Risk 只出现在 ritual 和 notification 里 | Close the day 列出落后的卡、午间 nudge 最多一条；卡片不变色 | 在离散时刻评估，天然不会满板颜色；形状和 Fitbit 的一次 nudge 一样 | 依赖 daily rhythm 的 Phase 1+（push），时间上在后面；两次 ritual 之间 board 什么都不说 |

**推荐 B，评估时机借 D 的思路。** Risk 由存着的事实（`carriedCount`、`dueAt`、本周的 instances）加「今天是哪天」在渲染时推导，输入只在跨天和用户做完一件事时变化：颜色在一天之内只会因为做完而消失，不会因为时钟变深——不存 risk 字段，也不要时钟。过去的 risk（哪些 carry 过、哪些迟了）归 Phase 2 的 Done 日志，board 只带当下能动手的那部分。daily rhythm 落地后，Close the day 的清单就是当天所有 amber / red 的卡片，午间 nudge 从同一组规则里挑最严重的一条——tracker 里「re-derive the midday nudge's triggers」这一条到此有了答案。

### B 的规则

| Kind | Signal | Amber | Red | 非颜色的孪生信号 | 需要的数据 |
| --- | --- | --- | --- | --- | --- |
| Habit（N× / week） | 本周 dots | `target − done ≥ daysLeft`（含今天） | 从不 | 空心 dots 的个数 | 已有（instances + cadence） |
| Habit（Daily） | 本周 dots | 从不：错过的那天悄悄过期，变成一个淡 dot | 从不 | — | — |
| Project step | path | `carriedCount ≥ 2`（第三周还在） | 从不 | context 行「↩ ×2」，hover / sheet 文案 "Split it?" | `Task.carriedCount`，carry-over 时 +1 |
| One-off | 日期 | `dueAt` 在 2 天内 | `dueAt` 是今天或已过 | 日期文字（"Due Fri" / "Due today"） | `Task.dueAt`（tracker 的 Optional due date） |

- 颜色只落在 signal line（dots、path、日期）上，**不碰 kind 边**：三种 kind 的颜色是固定的，warning 和 error 本来就留给 per-kind risk（`design/baseline.md` › Kind is derived from `TaskType`）。
- 没有 due date 的 one-off 没有 risk：「放得久」不等于「急」，quadrant 说重要不重要，日期说什么时候。Matrix 卡片用同一条规则。
- Paused 的 habit 和 project（痛点 3）不参与。
- `carriedCount` 也记在 one-off 上：它不上色，但 Plan week 的「Carried from last week」分组和 MCP 的 context 都用得上。

### B 的实现计划

1. **Schema**：`tasks.carried_count Int @default(0)`，create_plan 的 carry-over（`updateTasksPlanId` 那一步）给带过来的 step 和 one-off 各 +1；`tasks.due_at Timestamptz?`（one-off 专用，和 tracker 的 due date 条目合并成一个 PR）。两列都是加法，不需要 backfill。
2. **推导**：`toBoardCards` 给每张卡算 `risk`（none / amber / red），输入是 task、habitWeek 和 `today`（`KANBAN_TZ` 的日期，不含时刻）；纯函数，单元测试覆盖三个 kind 的边界（周日、`daysLeft = 1`、`carriedCount` 1 / 2、due 今天 / 明天 / 第三天）。
3. **渲染**：`HabitSignal` / `StepPath` / 日期文字各接一个 `risk` prop，映射到 `text-warning` / `text-error`（`Record<Risk, string>`，字面类名）；mini face 同样。
4. **Context**：`get_planning_context` 加 `carriedCount`、`dueAt` 和 habit 的 pace（`left` / `daysLeft`），guide 加一句：带了两周的 step 建议拆；本周 pace 落后的 habit 问要不要减 frequency。
5. **Done 日志**（Phase 2）：条目带「↩ carried ×2」「late」这类过去式标记；board 不再标过去。
6. **Daily rhythm**（之后）：Close the day 的清单和午间 nudge 读同一个 `risk`。

### 痛点 5 的待拍板

见「待拍板」的 Q13–Q16。

---

## 五个痛点的关系

- **数量上限控制分散（2），容量控制总量（1），lifecycle 给上限一个出口（3），反馈把进度画出来（4），risk 把 pace 画在同一条线上（5）。** 合在一起，LLM 才有东西可以权衡：「你有 4 个 project、上四周平均做完 3 个 step，我建议给 Spanish 3 次、Biomedical 这周先暂停。」
- **4 和 5 共用一套 per-kind signal。** Habit 的 dots（进度 = 填实，pace = 颜色）、step 的 path（进度 = 填实，carry = 颜色 + 「×2」）、one-off 的日期（进度 = done，risk = 颜色）。一张卡只有一条 signal line，既是反馈也是 risk；kind 边不动。
- **Points 从三个地方退场**：卡片（痛点 1 的 c）、board 的 metrics（痛点 4 的 C）、MCP 的校准（痛点 1 的 B：个数和完成率）。留下的 `points` 列只是 LLM 的小时估算，等 cleanup 时决定删不删（Q3 的 d）。
- **Phase 2 已定的三件事正好是这些结论的载体**：habit 自带 cadence → pace 可算；Done 变成按天的日志 → done list，也是过去的 risk 的归处；卡片上的 ✓ → 当场的确认。Plan week 的侧栏「这周 vs 最近四周」用个数。
- **daily-rhythm spike（PR #33）是 4 的 D 和 5 的 D 共同的落点**：Close the day 的 day card 用痛点 4 的形状（个数和 dots，不是 points），午间 nudge 从痛点 5 的规则取触发条件。
- **预算和上限共用 `user_preferences`**（theme 仍然在 cookie 里，不搬）；容量不需要用户设置，表里只有上限。

## 和已合并的 PR 5、daily-rhythm spike 的关系

PR 5 已合并：guide 里的 focus 软提醒（3 / 4，暂定）、`update_habit`、Rules 清单都在；context 的形状只做加法，以后加 `recentWeeks`、`limits`、`status`、`carriedCount`、`dueAt` 不用返工。第一轮想搭 PR 5 的 B0 没搭上，改成单独一个只改 guide 的小 PR（Q6）。

Daily-rhythm spike 写在 Phase 1 之前；tracker 里记着拿起来时要按 kind 重组 sheet、把「Still on it」映射成留在 Todo、重推午间 nudge 的触发条件。这份 spike 补上了后两件事的输入：触发条件 = 痛点 5 的 risk，day card 的形状 = 痛点 4 的 C。

---

## 待拍板 · Open questions（Phase 2 开工时再定）

| # | 问题 | 选项 | 推荐 |
| --- | --- | --- | --- |
| Q1 | 时间分配的方向 | A 维持现状 · B 容量从历史学、LLM 在容量内装箱 · C 精细时间管理 | **B** |
| Q2 | 容量怎么来 | a 每周问总时长 · b 总时长 + habit / project 的比例 · c 每个 project 各自的配额 · d 从最近几周的完成量推，用户只在例外的周说一句 | **d**。第一轮推荐的 a 退场：owner 不会按小时重排一周，调研说用户要的是学出来的容量，不是每周填表 |
| Q3 | Size 和 points 的去留 | a 照旧 · b LLM 默认、points 换成小时 · c 从前台退场（卡片和 metrics 不显示；表单可选；`points` 列只给 LLM）· d 彻底删除 | **c，d 留给 Phase 2 cleanup**：先退场，再删除 |
| Q4 | 上限是硬还是软 | A 只写在 prompt · B 硬限制、可在 Settings 改 · C 软提醒 | **B** |
| Q5 | Active project 怎么数 | a 手上的（没 archive 的）· b 这周有 step 的 · c 两个都要 | **先 a**，就是 owner 说的「同时最多拥有 4 个」；b 等用一阵再看 |
| Q6 | B0（只改 guide）的时机 | a 单独一个小 PR，Phase 2 之前就发 · b 等 Phase 2 | **a**：PR 5 已合并，没搭上；一行 guide 不等 Phase 2 |
| Q7 | Lifecycle 怎么存 | A 推导 · B `status` 枚举 · C 只给 project 做 | **B** |
| Q8 | Habit 和 project 的共用入口 | A 一个页面两个 tab · B 一个列表混排 | **A**，在 Phase 2 mockup 里定 |
| Q9 | 反馈的方向 | A 照旧 · B 游戏化 · C 画面：dots、7 格日条、按天的 Done 日志、✓ 的当场确认 · D ritual 的 day card | **C 先做，D 随 daily rhythm 叠上去**；B 不做 |
| Q10 | 完成瞬间的反馈 | a 什么都不加 · b 很短的局部动画 + 振动，无声，每次都有 · c 加声音 · d 偶然的庆祝（Asana 式） | **b**；声音以后 opt-in；不做随机庆祝 |
| Q11 | Board 顶部的指标 | a 保留 points 的指标 · b 个数（today 和 week 的 done / planned）· c 7 格日条 + today 的个数 | **c** |
| Q12 | Streak | a 不做 · b process streak（关掉一天的次数，可免罚）· c 每个 habit 的连续周数 | **a**；b 随 daily rhythm 再议；c 不做 |
| Q13 | Risk 的方向 | A 保持关闭 · B 按 kind、画在 signal line 上，amber 加一个红 · C Beeminder 式四色梯子 · D 只在 ritual / notification 里 | **B，评估时机借 D**：按天推导，不看时钟 |
| Q14 | Habit pace 的阈值 | a `left ≥ daysLeft`（owner 定的；= Beeminder 的红）· b `left ≥ daysLeft − 1`（Beeminder 的橙：从明天起每天都得做） | **a**：amber 的意思是「从今天起每天都得做」，亮的天数更少、可靠度更高；不够再换 b |
| Q15 | Step 的 carry 阈值 | a `carriedCount ≥ 2`（第三周还在）· b `≥ 1`（第二周） | **a**：带一次是 step 正常的流转；Marvin 的 3 天变红和 Kanban 两周的 stuck 都指向第二次 |
| Q16 | One-off 的红 | a due 当天和过期都红，直到 done · b 当天 amber、过期才红 | **a**：所有工具都在到期那一刻变红；当天就是「今天必须」 |

## 风险

- **估算不准**：LLM 给 step 的 size 和实际耗时会有偏差。靠完成量校准（做完几个、completionRate），不靠逐条的 estimate vs actual——文献说逐条校准进步最慢。
- **新用户没有历史**：前几周的容量用 guide 里的默认（3 个 habit、4 个 project 已经是满的）和用户说的话。
- **硬上限卡住人**：遇到临时的第 5 个 project 会烦。改设置就能放开，这是有意的摩擦；如果用下来太烦，退回 C（软提醒）不需要改数据。
- **反馈太安静**：C 全是个数和画面，没有分数。用几周后觉得缺什么，叠 D（day card），不回到 points。
- **Amber 连亮**：habit pace 的 amber 在周后半段可能连亮几天。颜色最淡，空心 dots 的个数做孪生信号；还是烦就把阈值退到 Q14 的 b，或者只在 Close the day 里显示（D）。
- **「2 天内 amber」要学**：没有行业默认；日期文字（"Due Fri"）跟着颜色一起出现就够。
- **两套单位**（个数给人看、小时给 LLM 用，Q3 的 c）：在 baseline 和 guide 里写清；用几周看要不要走 d。
- **范围蔓延**：时间预算很容易滑向日历式的时间块（选项 C），反馈很容易滑向游戏化（痛点 4 的 B）。粒度停在周和个数。
- **调研的局限**：竞品的现状以 2025–2026 的帮助文档为准，几处只能从搜索摘要或社区帖子确认；文献里有十几篇只核对了元数据没有重读；没有一项研究直接比较过 habit tracker 的可视化形式（dots vs 数字 vs ring）——owner 自己的观察是这件事上现有最好的证据。细节见「调研 · Research」的 gaps。

## Considered, not proposed · 考虑过但不提议

- **日历式排程**（痛点 1 的选项 C）：偏离「决定这周做什么」的定位。
- **超过上限时自动暂停**：暂停和完成都是用户的决定（Phase 1 已定 archive 只由用户发起），系统不替用户收起。
- **按天的容量**（工作日 / 周末不同）：等个数的容量用过一阵再说；Phase 2 的 habit cadence 已经会区分工作日。
- **把 points 留作游戏化的分数**，以及 XP、等级、leaderboard、每次撒花：痛点 4 的 B。
- **结果 streak**（连续几周全勤）：断了比没有更泄气（Silverman & Barasch 2023）；周重置的 dots 已经是有界的、可修复的 streak。
- **给 habit 的红色、时钟阈值**（20:00 / 15:00）：痛点 5 的诊断；Todo 已经表示今天，leftovers 在 Close the day 里有答案。
- **Beeminder 式的罚款 / commitment contract**：接受率 11%、承诺的人里 66% 仍然失败（Giné, Karlan & Zinman 2010）；对 n = 1 的 planner 过重。
- **LLM 写的激励文案**：MCP 的 recap 已经覆盖；不另做。
- **和短视频比刺激**：证据指向相反的方向（痛点 4）。
- **Loop 式的长期 habit strength 分**：Phase 2 Habits 页「最近四周」的小柱子已经是它的位置，不另做一个分数。

## 拍板之后

1. 方向定了以后，在 Phase 2 规划里把它排进 PR 序列（新开一份 Phase 2 spike；Phase 1 的 `week-model-restructure.md` 已经归档，不再扩写）。不等 Phase 2 就能做的小 PR：B0（只改 guide）、痛点 1 的 c（去 size chip、metrics 换个数）、痛点 5 的两列加法（`carriedCount`、`dueAt`）。
2. Tracker：*Redesign the point system and metric tracking*、*Per-kind risk rules*、*Optional due date on one-off tasks* 和 *One entry for habits and projects* 并进 Phase 2 那一条，按结论改写或删掉。
3. 状态从 draft 改成 awaiting owner review，走 `design/spike/README.md` 的 spike 流程；实现时按 README 归档，并重写它替掉的 living docs：`baseline.md` 的 Size system / Size UI、`flows/board.md` 的 Progress Tracking 和 Risk 两节、README 的 Board。

---

## 调研 · Research（2026-11-03）

四条线并行查：竞品怎么做 estimation / size / points（A）、竞品怎么做完成反馈和 reward（B）、行为科学和 HCI 文献（C）、risk / urgency 的信号（D）。以官方帮助文档、公司博客和同行评议论文为主，社区帖子只作旁证并标出；app 的现状以 2025–2026 的页面为准，直接访问不到的页面（Finch 的帮助中心、Habitica 的 wiki、Medium、Linear 的文档、Apple 的 HIG）靠搜索摘要确认并标为「摘要」。原始笔记（每条都带链接）留在这次 session 的 scratchpad，不进仓库；这里只放结论和出处。

### A · 竞品：estimation、size、points

| App | 大小 / effort 的输入 | Points | 备注 |
| --- | --- | --- | --- |
| Habitica | 唯一让选难度的主流 tracker：4 档乘数（0.1 / 1 / 1.5 / 2），没有时长字段 | XP / gold / damage；公式由任务价值的衰减（0.9747^value）、属性、crit、streak 主导，难度只是其中一个乘数 | Diefenbach & Müssig（2019，IJHCS）：45 人两周，全部出现反效果；觉得奖励机制不合理预测动机下降 |
| Finch | 无 | 每个 goal 固定 5 energy（Reddit + 评测，帮助中心 403） | 「刷牙 5 energy，两小时作业也 5 energy」 |
| Todoist | 可选 duration，和 Karma 无关 | Karma：个数、准时、功能使用；可关掉（「不想要赚分和丢分的压力」）；过期罚从 2 天（2014）放宽到 5 天（2026 的帮助页） | 用户称之为 vanity game；Productivity view 的头条是完成个数和 streak |
| Streaks · Habitify · Loop · Strides · Way of Life · Productive · HabitNow · Done · Fabulous | 次数、数量（自定义单位）或计时器时长——都是可观察的目标，不是判断 | 无 | Loop 的强度分 = 指数移动平均，日 habit 13 天不做才掉一半 |
| Streak21（2026） | — | 「no scores, no pressure」是卖点 | |
| Amazing Marvin | 时长估算（5m / 15m / 30m / 1h+），未估算默认 20 分钟；容量从最近 30 天学 | Reward Points 只作 opt-in 的 strategy，可随时重置 | Procrastination Count（见 D） |
| Sunsama · Motion · Reclaim · Akiflow · Amie | 分钟时长，因为要排进日历；Sunsama 的 workload 对阈值黄 / 红，planned vs actual（2025-06 起 actual 另成日历块） | 无 | Sunsama 用户五年里反复要汇总的准确率报告，一位专门要「recurring tasks 的 audit」；没有厂商公布准确率数据 |
| Things 3 · Microsoft To Do | 无 | 无 | To Do 用户要 duration 的唯一理由：看一天的总量「不超过 8 小时」 |
| Linear · Jira · Trello | 抽象 point 只存在于团队工具；Linear 未估算 = 1 point；Jira「不对应任何时长」 | | |
| Duolingo | — | XP + leagues（可关、多次调整；2022 Android 单课 XP 从 ~25 降到 ~15；Kotaku 2023 记录刷分）；2024-10 加 Duolingo Score（0–160，量课程进度而不是活动量） | 没有一个产品删掉过 points；做法是可选化，或在旁边加一个更难刷的指标 |

Agile 和行为研究：

- Jeffries（2019，*Story Points Revisited*）：story point 一词的作者「对改名感到抱歉」；追踪 estimate vs actual「至多是浪费」；替代是把 story 切到一天以内。Zuill（2013，#NoEstimates）：「我们需要的是决定，不是估算」；Duarte：数交付的个数，用 throughput 预测。
- Thoughtworks（Li 2013）：「每个 story 都是 4 点」成了常态后，按个数和按点数画的三个月 burn-up「惊人地相似」，改成只数个数。Magennis：「没见过 story point 的预测好过数个数」。ProKanban（2026）：个数不需要估算，一个团队的 refinement 时间减了 60%。Vacanti（*Actionable Agile Metrics*，2025 版）：right-size 是一个几秒钟的 yes / no（「能在 SLE 内做完吗」），承认它仍是一种估算，只是频率和粒度变了。Cohn（2026）守住的底线：只在估算能影响某个决定时才估。个数失效的唯一记录（Black Swan Farming）：已交付和剩余的大小不一致。
- Halkjelsvik & Jørgensen（*Time Predictions*，Springer 2018，开放获取）：anchoring 大而顽固——被告知客户期望 800 h 的人中位数估 300 h，被告知 40 h 的估 100 h，对照 160 h，「警告无效」；magnitude effect：小任务倾向高估、大任务倾向低估；30 个任务的准确率反馈把 90% 区间的覆盖率从 64% 提到 81%，亲自做事的人「强烈过度自信」。Shepperd, Mair & Jørgensen（2018，410 名开发者）：anchor 的效应 d = 1.19，培训后 0.72。Roy, Christenfeld & Jones（2012）：短任务高估、长任务低估。
- 个人 planner 用来表达负载的东西：小时对预算（Sunsama 的 workload、Marvin 的 Left to plan / Over by、Motion 的 Could not fit）、个数对上限（Ivy Lee 的 6、Streaks 的 24、Todoist 默认每天 5 / 每周 25、Sunsama 建议 3–5 个真任务）、从历史学出来的基线（Marvin 的 30 天典型日和 pace 线）。没有一个个人工具把抽象大小加总；energy 是 tag，不是数量。

### B · 竞品：完成反馈和 reward

| App | 完成瞬间 | 日 / 周 | 宽恕 | 公布过的数据 / 说法 |
| --- | --- | --- | --- | --- |
| Duolingo | XP、streak 火焰、streak 延长的全屏动画（里程碑日更华丽） | 周一的 leaderboard；Streak Society | Streak freeze、wager、weekend amulet、repair | 动画 +1.7% D7（新用户）；「一节课算一天」+3.3% D14、daily learners on streak +10.5%；wager +14% D7；amulet +4% 回访 / −5% 断链；两个 freeze +0.38% DAU；600 多个 streak 实验；「2→3 天是 +50%，200→201 是 +0.5%」；把 streak 绑到 XP 目标「让用户困惑」 |
| Asana | 随机出现的 unicorn / yeti / narwhal（「连续完成几个才可能出现」，可关） | — | — | 用户（多位提到 ADHD）从 2022 起要「每次都出现」，官方不答；另有用户要 Todoist 式的完成音 |
| Things 3 | checkbox；Taptic 用在拖动和 Magic Plus；「每个动画都有目的」 | — | — | 不做任何 gamification；现状未在官方页面确认 |
| Todoist | 完成音（用户称「pop」）；Karma 在另一页 | daily goal 饼图；周视图、4 周分解；周 streak | 休息日、vacation mode；支持可恢复最近一次断链 3 次 | Karma 可关 |
| Streaks | 长按大按钮；可选音效；「让每天打勾出奇地满足」 | 每个 goal 的日历、完成率 | 自定义日程的休息日不断链 | 「Miss a day and your streak goes back to zero」 |
| Finch | 鸟获得 energy、动画、「Your Finch feels calmer」 | 晚上鸟回来讲故事 | 不惩罚未完成（用户评价） | 创始人引 Jane McGonigal；没有官方「多巴胺」表述 |
| Forest | 一棵树 | 森林、按日 / 周 / 月的统计 | — | 官方：「机制利用 loss aversion」；「死树留着，是诚实的记录，不是判决」 |
| Apple Fitness | 关环动画（用户描述的「Catherine wheel」） | 周一的 notification + Weekly Summary；awards；All Rings Closed 100 / 365 / 500 / 1000 天 | 90 天 pause 不断 award streak | WWDC 2019 的 haptics 原则：只在能提供明确价值时加；「别因为能加就加，会稀释真正重要的东西」 |
| GitHub | — | 贡献图 | — | 2016 去掉 streak 计数（「聚焦工作本身而不是活动的持续时长」）；Moldon et al.（ICSE 2021，433k 开发者）：长 streak 大幅减少、周末提交减少、长链末尾的单提交日从 40%+ 降到 36% → 计数器改变的是人做什么 |
| Habitify · Loop · Calm · Headspace · Day One | — | — | Habitify 的 skip / off mode；Loop 的衰减分；Calm、Day One 可修复；Headspace、Calm 可隐藏 streak | |
| Sunsama · WHOOP · RescueTime | — | Sunsama 的 daily shutdown（in-app）和 weekly review（三步，第一步写 big wins；没 shutdown 就下次先 review 昨天）；WHOOP 周一的 assessment；RescueTime 的周邮件 | — | 都没有发布过结果数据 |

批评与反例：Silverman & Barasch（2023，JCR，7 个研究）：完整的 streak 增加后续参与（field 数据 b = +0.25），断掉的 streak 减少（b = −1.01）；被突出显示的断链（45%）比根本没有记录（61%）更差；可修复时缓和（85% vs 69%）；「什么算 streak 是可以定义的」。Renfree et al.（CHI 2016）：streak 和 reminder 制造依赖，app 一停行为就停。Mekler et al.（2017）：points / levels / leaderboards 提高数量、不动内在动机。Kim & Castelli（2021）：gamification 一周内 d = 1.57，按年 −0.20，「新鲜感在起作用」。Snapchat streak 被归为 Forced Action 的 dark pattern，青少年报告焦虑；Duolingo 的猫头鹰 guilt（Independent 2023、Spectator 2026）。反思：Di Stefano, Gino, Pisano & Staats：每天最后 15 分钟写当天学到的，一个月后考试高 22.8%（HBS 的总结）；Amabile & Kramer：238 人、约 12,000 份日记，进展是好日子最强的驱动，挫折的效应是进展的 2–3 倍，669 名经理把「进展」排在最后。Done list / ta-da list 没有对照研究。

### C · 文献

效应量都从论文全文引（Deci 1999、Kluger & DeNisi 1996、Harkin 2016、Sailer & Homner 2020、Silverman & Barasch 2023、Zuckerman & Gal-Oz 2014、Etkin 2016 的 working paper），其余来自摘要；元数据按 Crossref 核对。

**外在奖励与 points**

- Deci, Koestner & Ryan（1999，Psychological Bulletin，128 个实验）：有形奖励 d = −0.30、预期奖励 −0.32、完成即给 −0.36；正向的信息性反馈 +0.33。[doi:10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627)。两派争论里都同意的危险格：有趣的活动 + 预期的有形奖励 + 和表现松散相关——就是给一个自己选的 habit 定一个固定分值。
- Cerasoli, Nicklin & Ford（2014）：incentive 买数量，内在动机买质量和坚持。Hamari, Koivisto & Sarsa（2014）、Koivisto & Hamari（2019，819 篇）：效果「高度依赖情境和用户」，混合结果「惊人地多」。
- Sailer & Homner（2020，meta-analysis）：行为效应 g = .25，高严谨子集里不显著；行为效应由 game fiction（.41 vs .10）和社交（竞争 + 合作 .70，单独竞争 .12，无 −.06）承载——单人 planner 两样都没有。Mazeas et al.（2022，JMIR，16 个 RCT）：对比非游戏化的主动对照 g = 0.23，14 周随访 0.15。[doi:10.2196/26779](https://doi.org/10.2196/26779)。
- Zuckerman & Gal-Oz（2014，Personal and Ubiquitous Computing）：随机分到「只量化」「加 points」「加 leaderboard」的三组走路时长无差别；points「没有意义」。[doi:10.1007/s00779-014-0783-2](https://doi.org/10.1007/s00779-014-0783-2)。Mekler et al.（2017）[doi:10.1016/j.chb.2015.08.048](https://doi.org/10.1016/j.chb.2015.08.048)。Munson & Consolvo（2012）：奖杯只激励了 23 人里的 3 个；用户看重的是一个主目标加一个后备目标，和不带评判的提醒。Hamari（2013）：badge 只对看它的人起作用。Koivisto & Hamari（2014）：用得越久越觉得 gamification 没用（novelty）。Hanus & Fox（2015）：16 周的 badge + leaderboard 课程，内在动机和成绩都更低。Robertson（2010）「pointsification」；Nicholson（2015）：给信息，不给分数。

**进度监控与反馈**

- Harkin et al.（2016，Psychological Bulletin，138 个随机研究、N = 19,951）：提示监控进度 → 目标达成 d+ = 0.40；监控行为 0.79 vs 监控结果对行为 0.17；记录下来 0.43 vs 0.29；当场的行为反馈 0.68 vs 无反馈 0.35。[doi:10.1037/bul0000025](https://doi.org/10.1037/bul0000025)。
- Kluger & DeNisi（1996，607 个效应量）：平均 d = .41，但 38% 的反馈干预降低表现；velocity（变化）.55 vs .28；含正确做法的信息 .43 vs .25；表扬 .09 vs .34；打击性 −.14；对自尊威胁高 .08 vs 低 .47。[doi:10.1037/0033-2909.119.2.254](https://doi.org/10.1037/0033-2909.119.2.254)。
- Etkin（2016，JCR，6 个实验）：计量让人多做、少享受、更不愿继续（阅读实验：多读 2 页，继续的意愿低于对照的 48.5%）；framing 成「有用 / 学习」时效应消失。[doi:10.1093/jcr/ucv095](https://doi.org/10.1093/jcr/ucv095)。
- Kivetz, Urminsky & Zheng（2006）goal gradient；Nunes & Drèze（2006）endowed progress（预盖两枚章的 10 格卡 34% vs 空的 8 格卡 19%）；Koo & Fishbach（2012）small-area hypothesis [doi:10.1086/663827](https://doi.org/10.1086/663827)；Bonezzi, Brendl & De Angelis（2011）stuck in the middle；Cheema & Bagchi（2011）：进度条离目标远时可能反而降低努力；Fishbach, Eyal & Finkelstein（2010）：新手要正向反馈，老手对缺口更有反应。Amabile & Kramer（2011）progress principle。Ghibellini & Meier（2025，meta-analysis）：Zeigarnik 的记忆效应不可靠，恢复中断任务的倾向（Ovsiankina）成立。

**Streak、lapse、commitment**

- Silverman & Barasch（2023，JCR）[doi:10.1093/jcr/ucac029](https://doi.org/10.1093/jcr/ucac029)：见 B。Cochran & Tesser（1996）what-the-hell effect。Lally et al.（2010）：漏一次「对 habit 形成没有实质影响」。Milkman et al.（2021，Nature，54 种干预、61,293 人）：最有效的是奖励漏掉后的回归（+16%）；45% 的干预在进行中有效，只有 8% 在结束后仍有效。[doi:10.1038/s41586-021-04128-4](https://doi.org/10.1038/s41586-021-04128-4)。Dai, Milkman & Riis（2014）fresh start effect。Giné, Karlan & Zinman（2010）：commitment contract 接受率 11%，承诺者 66% 失败。Maaß（2026，观察研究）：Duolingo 擅长留存，不培养独立于 app 的 habit。Attig & Franke（2019 / 2020）：tracker 不在时动机下降，外在动机者更明显；觉得数据没用是永久弃用的预测因子。

**Habit 的形成**

- Lally et al.（2010）：「66 天」是 96 人里拟合良好的 39 人的中位数，区间 18–254 天；Keller et al.（2021，RCT）中位 59 天；Singh et al.（2024，meta-analysis）中位 59–66、均值 106–154。Wood & Neal（2007）、Wood & Rünger（2016）：habit 是情境线索到反应的联结，靠重复和当场的奖励。Woolley & Fishbach（2017）：当场的奖励比延迟的更能预测坚持。[doi:10.1177/0146167216676480](https://doi.org/10.1177/0146167216676480)。Judah et al.（2018，探索性）：每次重复的愉悦加快 habit 增长。Gardner（2015）：habit 是线索触发的自动性，不是频率；Phillips & Gardner（2016）：instigation habit 是唯一预测频率的因素。[doi:10.1037/hea0000249](https://doi.org/10.1037/hea0000249)。Fogg 的「celebration」没有独立的对照研究，间接支持来自上面两条；表扬类反馈在 Kluger & DeNisi 里 d ≈ .09。Gollwitzer & Sheeran（2006）：implementation intention d = 0.65。Milkman, Minson & Volpp（2014）、Kirgios et al.（2020）：temptation bundling +10–14%，可复制。Stawarz, Cox & Blandford（2015，CHI）：4 周研究里正向强化「几乎没有效果」，事件线索提高自动性，reminder 反而阻碍。

**估算**

- Kahneman & Tversky（1979）planning fallacy；Buehler, Griffin & Ross（1994）：预测 33.9 天，实际 55.5，30% 按时；Buehler, Griffin & Peetz（2010）：有经验也不消失，outside view 和 unpacking 有效；Kruger & Evans（2004）：拆解提高预测；Roy, Christenfeld & McKenzie（2005）：对实际时长的反馈改善预测，新任务没有低估。没有研究直接比较「N 次 / 周」和「N 分钟 / 周」的框架；间接证据（Medina-Mirapeix et al. 2009）：每次的时长比每周的次数更容易坚持，两者的预测因子不同。Scott & Nowlis（2013）：区间目标比单点目标更容易再投入。

**Habit tracker 的 HCI 研究**

- Stawarz et al.（2015）：115 个 app 里几乎都只有 self-tracking 和 reminder；Renfree et al.（2016）依赖；Stawarz et al.（2020）：线索要试错。Consolvo et al.（2008，UbiComp，UbiFit Garden）：3 个月 field experiment（n = 28），壁纸上的花园维持了活动量，没有的组显著下降。[doi:10.1145/1409635.1409644](https://doi.org/10.1145/1409635.1409644)。Gouveia, Karapanos & Hassenzahl（2015，256 人 10 个月）：只有 30% 设过目标，其中 80% 再没改过；70% 以上的使用是约 5 秒的一瞥。Tang & Kay（2017）：日历式回顾要区分「没数据」和「没做」。Epstein et al.（2015 / 2016）lived informatics：lapse 和 resume 是常态，弃用常常不是失败（Clawson et al. 2015）。Rooksby et al.（2014）：documentary 式的追踪是被认可的风格之一。没有一项对照研究比较过 chain、数字、ring 三种形式。

**短视频与注意力**

- Nguyen et al.（2025，Psychological Bulletin，71 个研究、98,299 人）：短视频使用和认知 r = −.34、注意力 −.38、抑制控制 −.41；87% 横断面；强迫性使用的分数（−.37）比时长（−.20）更能解释。[doi:10.1037/bul0000498](https://doi.org/10.1037/bul0000498)。Chiossi et al.（CHI 2023，N = 60）：刷 TikTok 后 prospective memory 变差，Twitter / YouTube 组不变。Su et al.（2021，NeuroImage，30 人）：个性化推荐激活 VTA 等区域的 BOLD——不是多巴胺的测量。Grinspoon（Harvard Health 2020）：「多巴胺排毒」误读了多巴胺。没有研究检验过重度短视频使用是否改变对低强度信息性反馈的敏感度。

**Pop-science 核对**：21 天 ✗（无依据）；66 天 ≈（子样本中位数）；celebration（创始人数据，无独立试验）；「streak 建 habit」✗（建的是 retention，断了重罚）；never miss twice ✓；多巴胺排毒 ✗；Zeigarnik ✗（Ovsiankina ✓）；IKEA effect ✓（以完成为条件）。

### D · Risk 与 urgency 的信号

出处（结论已在痛点 5 的表里）：Beeminder 的 glossary 和帮助文章 118（颜色 = 安全缓冲天数）；Loop 的 `Score.kt`；Streaks、Habitify 的帮助中心（Habitify 没有任何 at-risk 状态）；Duolingo 2017 / 2020 的博客和 KDD 2020 的 reminder 论文（优化的是文案，不是时间；被忽略后自动停发）；Apple Watch 的 watchOS 指南（「on track or falling behind」）；Garmin 和 Fitbit 的手册；Trello Card Aging（阈值只有社区说法：1 / 2 / 4 周）；Jira Days in column（每天一个点，最多 32，颜色映射无官方文档）；Businessmap 的 blocked card 和 Aging WIP；Linear 的 project updates 文档（health 由人选；staleness 先虚线后灰）；Asana、ClickUp、Planner、Todoist 的帮助页（过期即红，无 amber 前导）；Things 的 Deadlines；TickTick 的 Overdue 分组和 Countdown Mode；Google Calendar 的 overdue 汇总条目；Sunsama 的 rollover 和 overplanning；Amazing Marvin 的 Procrastination Count；Motion 的 Past Due / Can't Fit；Akiflow；ProKanban、Scrum.org、Nave 关于 aging work 的实践（85 百分位、两周 stuck）。心理学与 HCI：Zhu, Yang & Hsee（2018，JCR）mere-urgency effect [doi:10.1093/jcr/ucy008](https://doi.org/10.1093/jcr/ucy008)；Zhu, Bagchi & Hock（2018）mere-deadline effect；Ariely & Wertenbroch（2002）自设 deadline（Study 2 的复制失败）；Sendelbach & Funk（2013）alarm fatigue；Bliss, Gilson & Deaton（1995）cry-wolf；Manzey et al.（2014）：告知 alarm 的可靠度能恢复响应；Pielot et al.（2014）每天约 63 条 notification；Chapanis（1994）、Braun & Silver（1995）警示色的顺序，WARNING 和 CAUTION 分不清；WCAG 2.1 SC 1.4.1；NN/g（Harley 2016：icon + 颜色快 37%；Flaherty 2024：indicator 的分类）；IBM Carbon 的 status indicator pattern；Miller et al.（2007）控制性措辞的 reactance；Epstein et al.（2016）lapsed tracker 的 guilt；Smith, Keil & Depledge（2001）mum effect。

### Gaps · 没查到或没法核实的

- Finch 的官方规则（能量、每日上限）、Habitica 的 wiki、Linear 的 estimates 文档、Apple 的 HIG 颜色和 haptics 页面只能靠搜索摘要；Things 3 完成时有没有声音 / haptic 没有官方说法。
- Sunsama 的默认 workload 阈值、Reclaim / Motion 的周容量报告、Toggl / Rize 的 planned vs actual 没来得及查。
- Duolingo 2025 的 Energy 系统、Streak Society 和 Friend Streak 的现状只有第三方指南；Duolingo 没有公开过 streak-at-risk 提醒的时间实验。
- Trello 的 aging 阈值和 Jira 的点颜色只有社区说法，且互相矛盾；monday.com 的 Deadline Mode 页面 403。
- 文献里按元数据核对但没有重读的：Hanus & Fox 2015、Cheema & Bagchi 2011、Scott & Nowlis 2013、Gardner 2015、Fishbach et al. 2010、Wood & Neal 2007、Wood & Rünger 2016、Gollwitzer & Sheeran 2006、Kruger & Evans 2004、Buehler et al. 2010、Halkjelsvik & Jørgensen 2012、Hermsen et al. 2016、Rooksby et al. 2014、Inzlicht et al. 2018、Eisenberger 1992。
- 完全没找到的：比较 habit tracker 可视化形式（chain / 数字 / ring）的对照研究；比较「N 次」和「N 分钟」目标框架的实验；Fogg 的 celebration 的独立评估；任何公开的 Duolingo field experiment；红 / 黄 / 绿 dashboard 对决策准确性影响的同行评议研究；关于持续负向 UI 线索导致 learned helplessness 的研究。
