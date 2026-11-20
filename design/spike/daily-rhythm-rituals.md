# Spike: Daily rhythm — Open the day 和 Night recap

**Status: awaiting owner review** · 2026-11-19 · Tracker: Daily rhythm

> 语言约定：叙述用中文，产品名词、状态和代码标识保留英文（board / Todo / Done / backlog / habit / project step / one-off / `TODO` / `BACKLOG` / `EXPIRED`），和代码、spec、tracker 一一对应。屏幕上的 UI 文案是英文。

## Trigger · 起因

Daily rhythm（Phase 2）第一步只做两个新 flow：早上的 **Open the day** 和晚上的 **Night recap**。Owner 的要求（2026-11-19，转述）：

**Open the day**

- board 上有一个 entry；点开是一个专门的 flow：desktop 上是 modal，mobile 上是 overlay。
- 上半部分是 **Today**：今天要做的。一开始只放昨天没做完的；没有就是一个 empty prompt。
- 下半部分是一个简略版的 **backlog**：有一个推荐区，也能展开看全部，包括 priority matrix 第一象限（Do first）的 one-off。
- 推荐现在用固定算法：按剩下的任务和剩下的天数分配。最终目标是 LLM 推荐、user 手动补充和调整；MVP 只做固定推荐 + 手动 plan。
- Complete 和 Cancel 跟普通 modal 一样。
- 还没做这个 ritual 时 Todo 列是空的，它的 empty 文案要有开启一天的 cheerful 感觉。
- entry 暂定早上 8 点到下午 2 点出现，过了就不显示。

**Night recap**

- 对 Todo 和 Done 的一个仪式：user 在这里总结今天，把还在 Todo 的放到 Done、放到下一天，或者放弃不做（expire）。
- 和 Open the day 类似的 modal，确认按钮是 **Wrap the day**。
- entry 暂定晚上 9 点到凌晨 4 点出现，过了就不显示。
- 做完以后有庆祝动画和图片，再附一个 prompt：去 Dump 页写日记，或者直接关掉。

**记下来、以后做**：Skip（跳过今天，board 变成「好好休息」的样子）；LLM 推荐。

不在这份 spike 里：notification（这个 channel 不做）、Phase 2 的 Plan week 和 habit cadence。

参考：PR #33 里没有合进来的 `daily-rhythm-notifications.md` spike 和它的 `mockup-daily-rhythm.html`（branch `claude/notification-task-tracking-design-gcxwy0`）画过 Today sheet、Close sheet 和 board 顶部的 ritual strip。这份 spike 从它出发，去掉了 notification、capacity hint、focus 星标、slot 和 streak。

## 现在的产品 · 和这个设计相关的部分

- Todo 不是严格的「今天」：没做完的 weekly habit task、project step 和 one-off 会一直留在 Todo 里，跨天；只有 daily habit task 过了当天会 expire（`specs/shared.md` › Daily Sync）。
- 「今天」按 `KANBAN_TZ`（Los Angeles）的日历日算，午夜换天：午夜以后第一次打开页面就跑 Daily Sync。
- Backlog 只放这周的 habit task 和 project step，按 group 显示（BL-1、BL-9）；one-off 从来不进 backlog：track 到这周就直接进 Todo。
- 第一象限的 one-off 在 matrix 上是 `planId = null`、`status = BACKLOG`，track 以后变成 `TODO` 并挂到 active plan 上（`specs/priorities.md` › Track This Week）。
- Server 只让 task 往前走：`BACKLOG → TODO`、`BACKLOG → DONE`、`TODO → DONE`（R1）。用户不能把 task 设成 `EXPIRED`；project step 和 one-off 从来不 expire。
- PR #115 / #128 的 tap-to-complete mockup 的 Ideas 2 指出 Today ring 的「今天的总数」没定义好，问题之一正是昨天的欠账留在 Todo 里；它列的方案 e 就是「早上自己选今天做哪几张」，即 Open the day。

## 两个 flow 共用的部分

### Rhythm day：一天从凌晨 4 点开始

Night recap 的窗口跨过午夜（21:00–04:00）。照现在的规则，凌晨 1 点打开 app 会先跑 Daily Sync：昨天没做完的 daily habit task 已经 expire，Todo 也已经被清回去（见 Data › D1），recap 就没东西可收了。所以两个 ritual 需要「一天」在凌晨 4 点才结束：

- **rhythm day**：`KANBAN_TZ` 的 04:00 到第二天 04:00。凌晨 1 点 wrap 的是前一天。
- 推荐：Daily Sync、Done 的「今天」、Today ring 都改按 rhythm day 算（换天的时刻从 00:00 挪到 04:00），全 app 只有一种「今天」（Q1）。另一种是只有两个 ritual 用 rhythm day、其余照旧按午夜，但那样凌晨 1 点 Todo 已经清掉，recap 要去「已经被 sync 处理过的」task 里找，规则复杂，不推荐。
- 一周的边界（周一）跟着挪：周一 00:00–04:00 还算上周日。

### Entry 和时间窗

| Ritual | 窗口（`KANBAN_TZ`） | 什么时候出现 |
| --- | --- | --- |
| Open the day | 08:00–14:00 | 有 active plan（ST-3），今天还没 open |
| Night recap | 21:00–04:00 | 有 active plan，今天还没 wrap，且 Todo 或今天的 Done 至少有一张 |

- 同一个位置：board 顶部、header 下面的一条 **strip**：一个亮的 LED、ritual 的名字、一行说明（Open："2 from yesterday · 4 suggested"；Recap："3 done · 2 still open"）和 →。点它打开对应的 modal。
- Desktop 和 mobile 一样；mobile 上它在 Todo 那一行上面。
- 窗口外不显示；做完了也不显示。两个窗口不重叠，所以一次最多一条。
- 窗口在页面开着的时候到点：strip 在下一次页面加载或回到前台时出现或消失，不用计时器（Q2）。
- 一个 ritual 已经打开、在里面操作时过了窗口：照样可以提交，不打断。

### Modal / overlay

- Desktop：居中的 modal（`OverlayShell` 的 `center`，比 task modal 宽，内容上下排）。
- Mobile：全屏 overlay，从底部升起盖住 board 和 tab bar。`OverlayShell` 现在没有全屏的 variant，要加一个（`fullscreen`），或者用 `sheet` 拉满高度（Q8）。
- 和 form modal 一样：点 backdrop 不关（`dismissOnBackdrop = false`），免得一碰就丢了选好的东西；Esc 和 Cancel 一样，什么都不写。

### 记录：一天一行

| 方案 | 怎么做 | Pros | Cons |
| --- | --- | --- | --- |
| **O1 一天一行**（推荐） | 新表 `Day`：`userId`、`date`（rhythm day 的日期）、`openedAt`、`wrappedAt`，`(userId, date)` unique | 两个 ritual 和以后的 Skip（`skippedAt`）都有地方放；有历史，以后能算 ritual 完成率 | 多一张表 |
| O2 Plan 上的列 | `Plan.openedDate`、`Plan.wrappedDate`，像 `lastSyncDate` | 最小 | 只知道最后一天；Skip 再加列；没有历史 |

推荐 O1。每个 ritual 在提交的同一个 transaction 里 upsert 这一行。

### 每天的 snapshot：day ring 的今天总数和做完数

Board 的 day ring（`specs/board.md` 的 RING-2，PR #132）现在这样数一天：

- 今天：今天做完的 + Todo 里的卡；
- 过去的一天：那天做完的 + 那天 expire 的 daily habit task。

Spec 把这个算法标成了 temporary workaround：没有任何地方记下「那天排了什么」，所以一天的数隔夜会变。

- 晚上还留在 Todo 的卡，第二天不再算进昨天的总数：没做完的一天看起来像做完了。
- 没从 backlog 拉出来的 daily habit task 当晚 expire，第二天反而算进昨天的总数：昨晚合上的圈又缺了一段。
- Phase 2 去掉 Daily 以后没有 task 按天 expire，过去的圈只剩「满」和「空」两种。

Owner（2026-11-19，PR #132 的 review，原话）：

> 我们需要去define怎么判断task是今天的pending item，早上把backlog的task拿到今天，那么这就是今天的total number + 1，晚上把task 挪到明天。所以确实需要一份plan的snapshot我们才有准确的今天总数和done数

这正是两个 ritual 要写的数据：Open the day 把 task 拿进今天，Night recap 把没做完的挪到明天。所以 snapshot 跟着上一节的 `Day` 行走：

- 记什么：那一天的总数和做完数，按 kind 分开（ring 的弧按 habit、step、one-off 着色，读屏也按 kind 读）。可以是 `Day` 上的六个数，也可以是一列 JSON。
- 什么时候记：一天结束的时候。Wrap the day 提交时记；没 wrap 的那天，在下一个 rhythm day 的第一次 sync 里记，赶在把 Todo 清回 backlog（Data › D1）之前。
- 今天还没结束时：ring 照样从 task 当场算，snapshot 只管已经结束的天。
- 有了它，board 可以拿掉 RING-2 的 workaround，以及 ST-4 里「过去每天 expire 了几个 daily habit task」那个数。
- 做完的比总数多时（例如总数定在早上，白天又做了计划外的）：owner 已定，圈按满的画，数字照实写（board spec 的 RING-3）。

「今天的总数」到底含哪些 task 还没定，见 Q13。

## Flow 1 · Open the day

### 结构

```
┌ Open the day ─────────────────── Thu, Nov 19 ┐
│ TODAY                                    3   │
│  ↩ Draft outline        (Bio · 3/8)      ×   │  ← 昨天没做完的，标 ↩
│  ↩ Renew passport       (One-off · Do first) ×│
│  · Workout              (Weekly × 3)     ×   │  ← 从下面加进来的
│ ─────────────────────────────────────────── │
│ SUGGESTED                       Add all (3)  │
│  + Read ch. 4      Bio · 3 left in 2 days     │
│  + Flashcards      Daily · today's            │
│  + Call landlord   One-off · 2 left · 2 days  │
│ ▸ Show all (backlog + Do first)              │
│ ─────────────────────────────────────────── │
│                     Cancel   [Start the day] │
└──────────────────────────────────────────────┘
```

### Today 区

- 打开时只放**昨天没做完的**（Data › D1 定义），每张标 ↩；一张都没有就是 empty prompt，例如 "Nothing carried over" / "Pick from below to plan your day"。
- 每张卡一个 ×，把它放回下面的列表。同一个 habit 或 project 在 Today 里有几张时，只有最后加进来的那张有 ×，这样 step 的顺序不会乱（对应 R6：只有 group 的下一张能拉）。
- 卡片样子沿用 board 的 card（kind、title、progress），不显示 size。

### 下面的 backlog：推荐区 + 展开

- **Suggested**：固定算法算出来的几张，每张一行，带一句为什么（"3 left in 2 days"），点 + 加到 Today；右上角 **Add all**。
- **Show all**：展开以后是完整的列表，分四段，空的段不显示：
  - Habits、Projects：跟 board 的 backlog 一样按 group，一个 group 一张卡显示它的下一张（BL-9、BL-10），+ 加的是下一张；
  - One-offs this week：这周已经 track、今天不在 Today 里的 one-off；
  - Do first：matrix 第一象限里还没 track 的 one-off。加进来 = Start the day 时把它 track 到这周并放进 Todo。
- 加到 Today 的卡从推荐区和列表里消失；× 放回去以后回到原来的位置。推荐随 Today 的变化当场重算（同一个 group 在 Today 里多了一张，它的推荐就少一张）。

### 固定推荐算法

纯函数，放在 `src/utils/`，client 上算（server 只给 rows，见 AGENTS.md › Layers › *Server shapes inputs*）：

- **剩下的天数 D**：和 Progress 一样算，包括今天——`NORMAL` 数今天到周日的工作日，`EXTREME` 数今天到周日的每一天，至少 1。`NORMAL` 的周末今天本身不算工作日：推荐区为空，写一句 "It's the weekend · nothing suggested"，Show all 照常（Q7）。
- **每个 group 今天该做几张**：`quota = ceil(R ÷ D)`，`R` = 这个 group 这周还没做完、也没 expire 的 task 数（昨天没做完的也算在内）。
- **推荐几张** = `quota − 这个 group 已经在 Today 里的张数`，不够 0 就是 0；推荐的是这个 group 按顺序接下来的那几张（habit 按 copy 顺序，step 按 step 顺序）。
- 按 kind：
  - daily habit：今天的 instance 全部推荐（今晚就 expire），不用公式；
  - weekly habit、project：用公式，一个 habit 或一个 project 是一个 group；
  - 这周已 track 的 one-off：所有这样的 one-off 算一个 group，用公式，按 quadrant 的紧急程度排（Do first、Squeeze in、Schedule、Maybe later），同一个 quadrant 按创建时间；
  - Do first 里没 track 的 one-off：不推荐，只在 Show all 里。
- **顺序**：按 board 的 COL-2——one-off、daily、weekly、step，group 内按顺序。
- **没有上限**。`ceil` 偏向前面多做一点，周末不会堆；group 多的时候总数可能偏多，上限（从最近几周学出来的 capacity）留给以后，见 `week-model-phase2-pain-points.md`（Q6）。

例子（周三，`NORMAL`，D = 3：周三、四、五）：

| Group | R | quota = ceil(R/3) | 已在 Today | 推荐 |
| --- | --- | --- | --- | --- |
| Workout（Weekly × 3，还剩 2） | 2 | 1 | 0 | 1 |
| Bio（还剩 5 步，step 3 昨天没做完） | 5 | 2 | 1（step 3） | 1（step 4） |
| Flashcards（Daily） | — | 今天的 1 张 | 0 | 1 |
| 这周的 one-off（还剩 2） | 2 | 1 | 0 | 1（Do first 的那张） |

今天合计：Today 里 1 张 + 推荐 4 张。

### Start the day 和 Cancel

- **Start the day**（primary）：一次批量提交，然后关掉，board 的 Todo 就是 Today 里的那些：
  - Today 里每张 `BACKLOG` 的 task → `TODO`（habit task、step、这周的 one-off）；
  - Today 里每张没 track 的 Do first one-off → track 到 active plan 并 `TODO`；
  - upsert 今天的 `Day.openedAt`。
  - 整批在一个 transaction 里；失败就一张也不动，modal 不关，显示错误。
- Today 是空的时候 Start the day 不能按：一张都不选就是 Skip，留到以后做（Future）。
- **Cancel**：什么都不写，关掉，strip 还在。
- 只往前走：这个 ritual 只做 `BACKLOG → TODO`。

### Todo 列的 empty state

- 条件：今天还没 open，且 Todo 是空的。和 COL-5（"All clear for the day"，今天做完过东西才显示）互不重叠，除非用户没 open 就直接从 backlog 拉卡、做完：那时 COL-5 优先，因为它说的是刚发生的事。
- 样子沿用 COL-5 的虚线框：一个标题、下面两句（Principles 3.7：整句、各占一行、不加标点）。没有按钮：entry 只有一个，就是 strip（Q9）。
- 14:00 以后 strip 没了，但 Todo 还可能是空的、今天也没 open。文案的第二句说 "Open the day"，这时就说错了（Principles 3.6）。推荐：14:00 以后换成不提 ritual 的一版，例如 "Nothing on today yet" / "Pull something from the backlog when you're ready"（Q10）。
- 文案候选（Principles 3.5 让标题在开始的时候可以 cheer；3.6 不说屏幕不知道的事，所以带 "morning" 的那条只在上午对）：

| # | Title | Line 1 | Line 2 | 注 |
| --- | --- | --- | --- | --- |
| A | Fresh day, fresh start! | Nothing on today yet | Open the day to pick what you'll do | 不挑时间 |
| B | Ready when you are! | Today is a blank page | Open the day and fill it with what matters | 不挑时间 |
| C | Let's make today count! | Your day hasn't started yet | Open the day to choose today's tasks | 不挑时间 |
| D | Good morning! | A new day is waiting | Open the day to plan it in a minute | 窗口是 8–14 点，下午 1 点说 morning 不对 |
| E | New day, new wins! | Todo fills up once you open the day | Pick a few things and get rolling | 第一句解释了 Todo 为什么是空的 |

## Flow 2 · Night recap

### 结构

```
┌ Night recap ──────────────────── Thu, Nov 19 ┐
│ DONE TODAY                               3   │
│  ✓ Workout · ✓ Flashcards · ✓ Read ch. 4     │  ← 今天做完的，只读
│ ─────────────────────────────────────────── │
│ STILL OPEN                               2   │
│  Draft outline (Bio · 4/8)                   │
│     [ Done ] [ Tomorrow ] [ Let go ]         │  ← 每张三选一，默认 Tomorrow
│  Renew passport (One-off · Do first)         │
│     [ Done ] [ Tomorrow ] [ Let go ]         │
│ ─────────────────────────────────────────── │
│                     Cancel   [Wrap the day]  │
└──────────────────────────────────────────────┘
```

### 两段

- **Done today**：rhythm day 里做完的所有 task，按做完的时间，只读。这是「总结」的部分：先说做成了什么。空的时候写一句 "Nothing checked off today"，不加评价。
- **Still open**：还在 Todo 的每一张，三选一：
  - **Done**：今天做了，只是没在 board 上点；
  - **Tomorrow**：明天再做，明天的 Open the day 里标 ↩；
  - **Let go**：不做了。
- 默认选 **Tomorrow**：和没 recap 时 sync 会做的事一样（Data › D1），所以直接按 Wrap the day 不会让任何东西意外消失。
- Todo 是空的时候没有 Still open 这一段，Wrap the day 照样能按：今天全做完了，正好庆祝。

### 「Let go」对每种 kind 做什么

Owner 说的是 expire。但现在 project step 和 one-off 从来不 expire，expire 了它们就从 project 和 matrix 上永远消失了。推荐按 kind 分（Q4）：

| Kind | Let go 做什么 | 为什么 |
| --- | --- | --- |
| daily habit task | → `EXPIRED` | 今晚本来就会 expire，dot 留空 |
| weekly habit task | → `EXPIRED` | 这周这一次不做了，dot 留空 |
| project step | 回到它的 project，不在这周了（离开 plan，位置不变） | 和 End of Period 把没带过来的 step 还给 project 是同一件事；step 还在，以后的周还能排 |
| one-off | 回到 priority matrix，不再 track（`planId = null`、`BACKLOG`，quadrant 不变） | 和 End of Period 把没带过来的 one-off 还给 matrix 是同一件事；要真删掉，去 matrix 上删 |

另一种：四种 kind 都 `EXPIRED`，step 和 one-off 加一个「被放弃」的终态。不推荐：放弃这周不等于放弃这件事。

### Wrap the day 和 Cancel

- **Wrap the day**（primary）：一次批量提交：
  - Done → `DONE`，`doneAt` = 现在（rhythm day 让凌晨 1 点做完的也记在前一天）；
  - Tomorrow → `BACKLOG`，`carriedOn` = 下一个 rhythm day；
  - Let go → 按上表；
  - upsert 今天的 `Day.wrappedAt`。
  - 整批在一个 transaction 里；失败就一张也不动，modal 不关，显示错误。
  - 然后 modal 换成庆祝（下一节），不关。
- **Cancel**：什么都不写，关掉，strip 还在。
- 新的状态变化：用户第一次能让 task `TODO → EXPIRED`、`TODO → BACKLOG`、离开 plan。它们只走这个 ritual 的 action，board 上的 move（R1）不变；规则写在 recap 的 service 里，DAL 的 `WHERE` 带 `status = TODO`，保证只动还在 Todo 的。

### 庆祝和日记

- Wrap 成功以后，同一个 modal 里播放庆祝动画，然后显示一张图和两句话：
  - 一句说今天：例如 "3 done today"（只说数字，Principles 3.6）；
  - 一个 prompt：例如 "Anything on your mind before bed?"。
- 两个按钮：**Write it down**（primary）→ 关掉并跳到 `/kanban/dump`，输入框获得焦点；**Close** → 关掉，留在 board。
- 动画：沿用 tap-to-complete 的那套（随机的 juice、Principles 3.1 / 3.2），系统要求 reduced motion 时只留淡入。具体在 mockup 的动效 tab 里定。
- 图片（Q5）：
  - G1 一组固定的插画放在 `public/`，每晚随机一张（推荐，MVP）；
  - G2 根据今天做完的东西生成（LLM / 图像模型），以后再说。
- Dump 页要不要知道「是从 recap 来的」（例如输入框里放一个日期开头），Q11。

## Data · 状态和数据变化

### Todo 变成严格的「今天」

「今天还没 open 时 Todo 是空的」需要一条新规则：

| 方案 | 怎么做 | Pros | Cons |
| --- | --- | --- | --- |
| **D1 每天第一次 sync 把 Todo 清回去**（推荐） | Daily Sync（rhythm day 换天后的第一次）把 plan 上所有还在 `TODO` 的 task 改回 `BACKLOG`，记 `carriedOn = today` | status 就是它的意思：Todo = 今天，backlog = 这周的池子；board 的查询不用改；Night recap 的 Tomorrow 和「没 recap」结果一样；Today ring 的分母（PR #115 Ideas 2）不再含昨天的欠账 | sync 第一次做反向的状态变化（规则要写清楚）；backlog 要开始放 one-off（BL-1 要改，board 的 backlog 多一个 One-offs 段） |
| D2 给 Todo 加日期 | 新列 `Task.todoDate`；Todo 只显示 `todoDate = today` 的 `TODO` | 不改 status | 有一批「`TODO` 但不在 Todo」的 task，board、matrix、MCP、统计每一处都要多一个日期条件，容易漏；没 open 的那天这些 task 在 board 上看不见 |

推荐 D1。具体：

- `Task.carriedOn DATE?`：这张 task 从 Todo 回到 backlog、留给哪一天。「昨天没做完的」= `carriedOn = today` 且还是 `BACKLOG`。Night recap 的 Tomorrow 写的也是它。
- 只认这一天的：某天没 open 就过去了，那天留下的 task 第二天不再标 ↩，只是 backlog 里的普通 task，推荐算法照样会按 quota 推它们。
- 周一：新 plan 带过来的 one-off 和 step 现在保留原来的 status（`planService` 的 carry-over）。改成一律 `BACKLOG` + `carriedOn = today`，周一的 Today 也从上周没做完的开始（Q3）。
- daily habit task 不受影响：它们过了当天就 expire，不会成为「昨天没做完的」。

### 写入路径

- 两个新 action（例如 `openDayAction`、`wrapDayAction`），各接一个 service：校验每张 task 是这个用户的、在 active plan 上（或是没 track 的 Do first one-off）、状态是 ritual 要的那个；批量 `updateMany`；upsert `Day`。都在一个 `prisma.$transaction()` 里。
- 读：board 的读 action 多给三样：今天的 `Day` 行、Open the day 要的 Do first one-off、今天做完的 task（Done 已经有）。时间窗和 D 由 client 用日期工具算，都按 rhythm day。
- MCP：这一步不加 tool。以后 LLM 推荐时再加（Future）。

## Future · 记下来，以后做

- **LLM 推荐 + 手动调整**：推荐区的接口一开始就写成「一组 task id，每个带一句 reason」，固定算法是第一个实现；以后换成 LLM（读最近几周的完成情况、这周的目标），user 照样在同一个 modal 里加、删。入口可能是一个 MCP tool（例如 `propose_today`），或者 modal 里的一个按钮。
- **Skip**：今天不 open，`Day.skippedAt`；board 变成「好好休息」的样子（Todo 和 strip 换成一张 rest 卡，backlog 还在）。样子要单独设计。
- **推荐的上限**：从最近几周学出来的 capacity（`week-model-phase2-pain-points.md` › 痛点 1 的方向）。
- **庆祝的图**：按今天做完的东西生成（G2）。

## Implementation plan · 分几步

1. 这份 spike 定下来（这个 PR）。
2. Design PR：`design/mockup/mockup-daily-rhythm-rituals.html`，用 `ui-design` skill，一个 ritual 一个 tab，最后合成一个 F · Final：strip 的两种、两个 modal 的 desktop 和 mobile、几种数据组合（有 ↩ / 没有、周末、step 很多的一天、全做完的晚上、一张都没做的晚上）、Todo empty state 的几条文案并排、庆祝的动效 tab。
3. Spec：`write-spec` 把 mockup 写进 `specs/board.md` 的两节新内容（Open the day、Night recap），Data 一节的规则（rhythm day、sync 清回、`carriedOn`、BL-1 的改动、Let go）写进 `specs/shared.md` 和 board 的 Rules。
4. 实现，从 `main`，大概三个 PR：
   - 数据：schema + migration（`Task.carriedOn`、`Day` 和它每天的 snapshot）、rhythm day、sync 和 carry-over 的改动；board 的 ring 改成读 snapshot；
   - Open the day：推荐 util（unit test 覆盖上面的例子和每条边界）、service + action（integration test）、strip、modal、Todo empty state、Design Console 的 scenario；
   - Night recap：service + action、modal、庆祝、跳 Dump、scenario。

## Dependencies · 和别的工作的关系

- **Board tap-to-complete（PR #128，另一个 thread 在做）**：会改 board 的 header、Todo 的标题（Today）、Today ring 和 Todo 的 empty 提醒（COL-5），也会定完成动画。strip 放在哪、Todo 的 empty state 和它的提醒怎么共存、recap 的庆祝怎么复用它的动画，要等它的 F · Final 定了再画进 mockup。D1 和 rhythm day 让「Todo = 今天」成立，正好回答它的 Ideas 2（方案 e）。它的 spec（PR #132）先把 ring 的算法写成 temporary workaround（RING-2），等这里的每天 snapshot（见「每天的 snapshot」和 Q13）。
- **Config-driven modals（Quality gate › Step 10，PR #93）**：两个 ritual 的 modal 应该按它定下来的写法写。
- **Phase 2 去掉 Daily 和 Plan mode**（tracker › Week model Phase 2）：到那时算法里 daily 和 `NORMAL` 周末两条就没了，其余不变。

## Open questions · 待 owner 拍板

1. **Rhythm day 从凌晨 4 点开始**：同意全 app 的「今天」（sync、Done、Today ring）都从 00:00 挪到 04:00 吗？不挪的话凌晨的 recap 会扑空。
2. **时间窗到点时**：strip 在下一次加载或回到前台时才变，可以吗？还是要页面开着也到点就出现 / 消失？
3. **Todo 每天清回 backlog（D1），周一也一样**：同意「没 open 之前 Todo 是空的、昨天没做完的回到 backlog 并在 Open the day 里标 ↩」吗？这会让 board 的 backlog 也开始放这周的 one-off（多一个 One-offs 段），周一上周带过来的也走这条路。
4. **Let go**：按 kind 分（habit task expire，step 回 project，one-off 回 matrix），还是四种都 expire？
5. **庆祝的图**：先用一组固定插画随机选一张（G1）可以吗？插画的风格要你定，或者让我在 mockup 里画几种。
6. **推荐用 `ceil(R ÷ D)`、没有上限**，可以吗？另外两种：四舍五入（更少，但周五会堆）、或者给每天一个总数上限。
7. **`NORMAL` 模式的周末**：Open the day 照样出现、推荐区为空，还是周末不出现？
8. **Mobile 的 overlay**：全屏（新 variant），还是拉满高度的 bottom sheet（现有的 `sheet`，顶上留一点 board）？
9. **Todo empty state 选哪条（A–E）**，带不带按钮（推荐不带，entry 只有 strip）？
10. **14:00 以后还没 open**：Todo 的 empty 换成不提 ritual 的一版（推荐），还是什么都不显示？
11. **跳到 Dump**：只是跳过去、输入框获得焦点，还是带一个开头（例如日期）？另外 Night recap 的 Tomorrow 默认选中可以吗？
12. **open 以后还能再打开 Open the day 吗？** 推荐：不能，strip 消失，白天从 backlog 拉。没 open 就直接从 backlog 拉卡也照旧能拉，拉进来的那几张打开 ritual 时就在 Today 里、没有 ×。
13. **今天的总数怎么数（每天的 snapshot）**：一张 task 怎样算今天的 pending item？早上 Open the day 拿进 Today 的算，总数 +1（owner 已说）。还要定的：
    - open 以后白天又从 backlog 拉的：也让总数 +1（和 board 现在的 RING-2 一样），还是总数定在早上、做完它算超额（圈按满的画）？
    - 晚上 Night recap 选 Tomorrow 的：留在今天的总数里、算没做完，还是从今天的总数里拿掉？
    - Let go 的：同上。
    - 没 open 就过去的那天：总数按什么算？

    推荐：白天拉的也 +1；Tomorrow 和 Let go 都留在今天的总数里、算没做完，不然每个 wrap 过的一天都是满圈，和现在「隔夜变满」是同一个问题；没 open 的那天按当天结束时的 Todo + 做完的算。
