# Board (/kanban) · 新结构试写（temp）

> **这是什么**：`design/specs/board.md` 按新结构重排的试写版，给 owner review 结构用（PR #132，2026-11-19）。说的事和 `board.md` 一样，只是换了摆法；不一样的地方列在最后的「和 board.md 的出入」。`board.md` 仍然是实现和测试对照的那一份，`check:spec` 不读这个文件夹。结构定了以后改写成英文、替换 `board.md`，这个文件删掉。
>
> 语言约定：叙述用中文，产品名词、state、ID 和代码标识保留英文（board / Todo / Done / backlog / habit task / project step / one-off）；屏幕上的文案是英文。

Board 是 user 过这一周的地方。Habit 这周每跑一次，plan 上就有一张 task（*habit task*）。Habit task 和这周的 project step 在 backlog 里等着，user 把它们拉进 Todo；one-off 直接进 Todo。做完一张，就把它挪到 Done。

## 这份 spec 怎么摆

| 部分 | 写什么 | ID |
| --- | --- | --- |
| Page states | server 给了什么，页面显示哪一屏 | ST |
| Components | 一个组件一节，只写 static：给定数据和它的 state，屏幕上看得到什么 | RING · DAY · COL · CARD · TAP · BL |
| Client actions | user 做了什么，让哪个组件从哪个 state 到哪个 state；不碰 server | A |
| Server actions | 写数据的动作、一次 move 里发生什么、规则 | A · MV · R |
| Motion | 哪个动作或数据变化触发哪个 `fx-*` | FX |
| Journeys | 平常怎么用，一串 action ID | J |

一个组件的一节里有三种东西：

- **显示**：从数据来的。数据决定的变体（空了、合上了、最后一张）也在这里，写成「…的时候」。
- **States**：只有 user 能改的才算 state（开着 / 关着、选中 / 没选中）。一张表：state、这个 state 下显示什么、哪个 action 进、哪个 action 出。
- **被某个 state 带出来的东西**（一天的清单、project 的 queue）：自己的小节，自己的 ID。

Board 上 user 能改的 state 一共四个：backlog（closed / open）、project 的 queue（closed / open）、日格的清单（closed / open）、Todo 卡（normal / selected）。Client actions 那张表里的每一行，就是其中一个 state 的一次变化。

Hover、按下、focus 的样子不算 state：每个能点的东西都一样，归 design language。Spec 只说哪些东西能点。

Marker 和现在一样，写在 ID 前面：没有 marker 是已经建好、有测试的；*(pending)* 是设计了还没建；*(removing)* 的条目集中在最后的「正在移除」一节。

## Page states

打开 `/kanban` 先跑 sync（`specs/shared.md`），然后按 server 给的东西显示三屏里的一屏。

- **ST-1 New user**：User 这周没有 plan，也没有等着处理的上周 plan（既没有 `ACTIVE` 也没有 `PENDING_UPDATE`）。Server 什么都不给。页面显示空的 board，请 user 做第一个 plan；它的按钮打开 plan 页（A1）。
- **ST-2 Returning user**：上周的 plan 结束了（`PENDING_UPDATE`），这周还没有 plan。Server 给上周的 recap，数的是那个 plan 上的每一张 task：habit task、project step、one-off，expire 的也算。空的 board 显示这份 recap，它的按钮打开 plan 页做这周的 plan（A1）。Recap 显示：
  - completion rate：上周的 task 做完了多大比例
  - tasks done：做完几张，一共几张
  - points earned：做完的 task 挣了多少 points
- *(pending)* **ST-4 Active plan**：这周有 plan（`ACTIVE`），页面显示 board。Server 给：
  - plan：它的周、它的 mode、它的 habit 和每个 habit 多久跑一次
  - plan 上除了 expire 的以外的每一张 task
  - 每个在 plan 上有 step 的 project，连同它所有的 step（step 卡用它们画 path）
  - plan 这一周里今天之前的每一天（按 `KANBAN_TZ`）：那天有几张 daily habit task expire 了没做。过去那些天的圈要数它（RING-2）

  不再给 progress counts：每天的圈由页面用手上的 task 自己数（RING-2）。

## Components

### Day rings

Board 最上面是一排圈，plan 这一周的每一天一个，周一到周日。一天的圈就是那天的工作：整圈是那天排的全部，那天每做完一张 task 就填上一段。这一排在两个宽度上都取代 progress dashboard（Progress）。

#### 显示

- *(pending)* **RING-1** 这一排显示哪几天、怎么显示：
  - 每一格，两个宽度一样：今天那格比别的宽、带框，里面是它的圈、Today 这个词和它的数 **d of p done**，d 是做完的，p 是排的（RING-2）。别的格子是那天的短名字，下面是它的圈。
  - desktop：七天都在，周一到周日。
  - mobile：今天那格，加上它旁边放得下的「今天之前的天」。这一排的宽度是屏幕宽度两边各减 20 px，格子之间隔 4 px，今天那格至少 132 px 宽，别的每格至少 54 px，剩下的平均分。在 320、375、390、430 px 上分别是 2、3、3、4 个别的天。一周刚开始、今天之前的天不够放时，用今天之后的天补上，所以同一个宽度下格子数总是一样。
  - 圈的大小不随屏幕宽度变，变的只是格子数。
- *(pending)* **RING-2** 一天的圈数什么，按 `KANBAN_TZ`。这个数法是 temporary workaround：还没有地方记下每天排了什么，所以页面用手上的 task 自己算。等 daily rhythm 给每天存一份总数和做完数的 snapshot 以后换掉；在哪设计，见 `design/tracker.md` 里 board 设计那一条。
  - done，每一天都一样：plan 上那天做完的 task，按做完的时间算，不分 kind。
  - planned，今天：今天做完的 task，加上 Todo 里的每一张卡。Backlog 里的 task 要拉进 Todo 才算今天排的，所以拉一张卡，今天的 planned 加一。
  - planned，今天之前的某天：那天做完的 task，加上那天 expire 了没做的 daily habit task（ST-4）。
  - planned，今天之后的某天：还没有；那天的工作要到那天才知道。
  - 一天结束时：从这时起它的 planned 按「过去的一天」来数，所以在这个 workaround 下它隔夜会变。不随当天 expire 的 Todo 卡（weekly habit task、project step、one-off）不再算它的，因为它们留在 Todo 里等第二天。没做的 daily habit task 不管在哪都随当天 expire：原来在 Todo 的继续算，从没拉出 backlog 的开始算。所以晚上合上的圈，第二天早上可能缺一段；没合上的圈，也可能显示成合上了。
- *(pending)* **RING-3** 圈怎么画：
  - 轨道：整圈是那天的 planned，没做的部分是空的轨道。
  - 弧：每做完一张 task 加一段同样长的弧，颜色是它 kind 的颜色，和它卡片左边那条边一样。弧从 12 点开始顺时针，先 habit，再 project step，再 one-off。
  - 没排东西：圈是一条空轨道。
  - 合上：那天排了东西、而且排的全做完了，圈中心有一个 ✓。
  - 做完的比排的多：圈画满、算合上，数读成什么都行。RING-2 现在的数法不会出现这种情况；这一条是给以后替换它的数法的。
- *(pending)* **RING-4** 读屏把今天和之前的每一格读成：那天的名字，然后做完几张、排了几张，然后每个排了东西的 kind 做完几张、排了几张："Thu: 1 of 5 done — habits 1 of 2, steps 0 of 2, one-offs 0 of 1"。
- *(pending)* **RING-5** 今天的圈合上的时候（RING-3），今天那格一直保持合上的样子：框变成 success 色，圈里有 ✓，数读成 **All N done**，N 是今天的 planned。页面加载时就已经合上的圈也是这个样子，不庆祝（FX-4）。
- *(pending)* **RING-6** 今天的圈合上以后又拉一张卡进 Todo，圈重新打开：圈上有一段空的，✓ 没了，框不再是 success 色，数又读成 **d of p done**。新拉的那张也做完，圈再合上，再庆祝一次（FX-4）。
- *(pending)* **RING-7** 今天之后的格子不是 button，点了什么都不开：它的圈是空轨道，读屏只读那天的名字。

#### States · 日格的清单

今天和之前的每一格是 button，各有一个 state：它那天的清单关着还是开着。这和圈「合上」不是一回事：圈合不合上是数据决定的（RING-3）。

| State | 显示什么 | 进入 | 离开 |
| --- | --- | --- | --- |
| closed（默认） | 格子是 RING-1 的样子 | A14 | A13 |
| open | 格子画成选中，它那天的清单显示着（DAY-1） | A13 | A14 |

- *(pending)* **DAY-1** 清单 open 的那一格画成选中，它那天的清单显示着（A day's list）。同一时间最多一格是 open。
- *(pending)* **DAY-5** 键盘和读屏：每个是 button 的格子能用 Tab 走到、用 Enter 或 Space 按，读屏能听到它的清单是不是开着。清单打开时焦点移到清单的 close button，关上时焦点回到那一格。

### A day's list

日格是 open 的时候显示的东西。

- *(pending)* **DAY-2** 在哪显示：
  - desktop：一个 panel，浮在那排圈下面、那天的格子正下方，盖在 board 上面。后面的 board 保持原样。
  - mobile：一个从底部升起的 sheet，最高占屏幕高度的 70%，后面的 board 变暗。
- *(pending)* **DAY-3** 从上到下显示：
  - header：那天的名字（今天是 **Today**）、那天的数 **d of p done**（和它的圈一样，RING-2）、一个 close button
  - 那天做完的每张 task 一行：kind 的图标和 task 的标题；project step 在标题下面多一行 project 的名字。先 habit，再 project step，再 one-off；同一个 kind 里按做完的时间，早的在上。
  - 那天什么都没做完的时候：行的位置显示 **Nothing yet**

  清单只读：里面的行不能点、不能拖、不能挪回去（R7）。

### Columns

- *(pending)* **COL-6** Board 有哪几列。在 backlog 里等着的 task 两列都不出现，expire 的 task 哪都不出现，每列的表头显示它有几张卡。
  - desktop：两列并排，Todo 和 Done，都和 board 一样高。Todo 的表头带 **Today**，Done 的带 **This week**：Done 放 plan 上所有做完的 task，一周里每一天的都在。
  - mobile：只有 Todo。做完的 task 离开 board，user 到它那天的清单里找（DAY-3）。
- **COL-2** Todo 的顺序：
  - 按 kind：先 one-off，再 daily habit，再 weekly habit，再 project step
  - 同一个 kind 里按 group：一个 habit 的 task、一个 project 的 step 挨在一起，group 之间按各自第一张 task 创建的时间排；one-off 按它自己创建的时间
  - 同一个 group 里按顺序：copy 1、2、3… 或 step 1、2、3…
  - 还分不出先后的：按创建时间，再按 id
- **COL-3** Done 按做完的时间排，最近的在最上面。
- *(pending)* **COL-7** Mobile 上 Todo 是一列全宽的卡，一张在一张下面，按 Todo 的顺序（COL-2）。每张和 desktop 上是同一张卡（CARD-9）。
- *(pending)* **COL-8** Todo 空了、而且今天（按 `KANBAN_TZ`）至少做完过一张 task 的时候，Todo 在两个宽度上都显示一个虚线框：一个标题说今天清空了，下面两句，一句说今天拉的都做完了，一句说可以从 backlog 再拉、或者今天到此为止。没有按钮，也没有链接。最后一张卡一离开 Todo 它就出现：用 ✓ Complete 完成的，等卡落进今天的圈（FX-2）；拖过去的，一放到 Done 上就出现。它用 `fx-boot-in` 进来（每次出现都是），停在它该在的位置；reduced motion 下直接出现。今天什么都没做完的时候，空的 Todo 什么都不显示。

### Card

Board 上只有一种卡，放在 Todo、Done 和 backlog 三个地方。这一节先说每张卡都有的部位，再说三个地方各自不同的，再说三种 kind 各自不同的。Backlog 怎么把卡分 group、怎么叠 pile，在 Backlog 一节（BL-9、BL-11）。

#### 每张卡都有的

- *(pending)* **CARD-9** 每张卡，不管在哪个宽度、哪个地方，从上到下是这几个部位：
  - kind line：这张 task 是哪种 kind。每种 kind 写什么，见「三种 kind 的不同」。
  - title：task 的标题
  - description：task 的 description，最多两行，多的截掉
  - progress：这个 kind 的进度，这张卡自己的那一格带环。每种 kind 画什么，见「三种 kind 的不同」。
  - action，在右下角：这张卡在它所在的地方能做的那一件事。每个地方是什么，见「三个地方的不同」。

  哪张卡都不显示 task 的 size 和 points。

#### 三个地方的不同

| ID | 在哪 | kind line 右边 | title | description | action | 卡片本身 |
| --- | --- | --- | --- | --- | --- | --- |
| *(pending)* CARD-13 | Todo | 空的 | 正常 | 显示 | 一个圆圈；卡选中后变成 ✓ Complete（TAP-1） | 选中时有确认边框（TAP-1） |
| CARD-2 | Done | 空的 | 划掉 | 不显示 | 没有 | 变暗；不能拖（R4） |
| *(pending)* CARD-14 | backlog | group 后面还有 task 时是 **+N more**（BL-11） | 正常 | 显示 | ↑ Todo，两个宽度都有，把 task 拉进 Todo（A9） | group 后面还有 task 时垫着 pile（BL-11） |

Backlog 的卡显示的是它那个 group 的下一张 task（BL-9）。

- *(pending)* **CARD-12** 哪些卡能拖：
  - desktop：Todo 和 backlog 里的卡除了用自己的 action，也能拖（A4、A6、A15）。
  - mobile：哪张卡都不能拖。卡只靠自己的 action 动，所以 mobile 上 backlog 的 task 只能经过 Todo 到 Done。

#### 三种 kind 的不同

- *(pending)* **CARD-10 Habit**
  - kind line：说它是 habit，不写多久跑一次。
  - progress：只有这周的 dots，旁边不写做完了几个。读屏把 dots 读成「做完几个 / 一共几个」。
  - dots：这个 habit 这周每跑一次有一个。Daily habit 是每个要跑的日子 N 个（`NORMAL` mode 是工作日，`EXTREME` mode 是每一天）；weekly habit 是 N 个。Task 做完的 dot 是实的，没做完的是空的；这张卡自己那张 task 的 dot 带环，在 Todo、Done、backlog 都一样。
  - 不在 plan 上了：habit 已经不在 plan 上的时候，它的卡不显示 progress。
- *(pending)* **CARD-11 Project step**
  - kind line：写 project 的名字，取代 kind 的名字；不写这是第几步。
  - progress：project 的 path，每个 step 按顺序一段。Step 做完的那段是实的，没做完的是空的；这张卡自己的 step 带环，在 Todo、Done、backlog 都一样。读屏把 path 读成「做完几步 / 一共几步」。
  - 没有 project：board 没拿到这个 step 的 project 的时候，卡不显示 progress。
- *(pending)* **CARD-15 One-off**
  - kind line：kind 的名字、一条竖线、它在 priority matrix 的哪个 quadrant（**ONE-OFF | DO FIRST**）。
  - progress：没有。
- **CARD-7** 一张卡落到 Done 上的时候，它的 dot 或者 path 上的那段马上填上，不等 server。

#### States · Todo 卡

Todo 卡分两下完成，两个宽度一样：一下选中，第二下点它的 ✓ Complete。Desktop 另外还能拖（A6、A15）。

| State | 显示什么 | 进入 | 离开 |
| --- | --- | --- | --- |
| normal（默认） | 卡是 CARD-13 的样子，右下角是一个圆圈 | A11 | A10 |
| selected | 确认边框，右下角是 ✓ Complete（TAP-1） | A10 | A11；A12 把它完成 |

- *(pending)* **TAP-1** 选中的卡有确认边框，它的圆圈变成实心的 ✓，旁边出现 **Complete**：两样合起来就是它的 ✓ Complete button。卡的大小和位置不变，board 上别的东西也不动。同一时间最多一张卡是 selected。Done 和 backlog 里的卡不能选中。
- *(pending)* **TAP-3** 靠点击完成一张卡，只有 ✓ Complete 这一个办法（A12）。它出现后 350 ms 内不接受点击，所以在圆圈上很快地连点两下，只会选中，不会完成。
- *(pending)* **TAP-4** 键盘和读屏：每张 Todo 卡能用 Tab 走到。在没选中的卡上按 Enter 选中它；在选中的卡上按 Enter 完成它，和 ✓ Complete 一样，也要过那 350 ms（TAP-3）；Esc 取消选中（A11）。Desktop 上 Space 仍然是把卡提起来拖的键（A15）。读屏能听到卡是不是选中，✓ Complete 的名字带着它要完成的那张 task。

故意不管（owner，2026-11-19）：开始拖的时候选中留不留。选中的卡和别的卡一样能拖，实现选简单的。

### Backlog

#### 显示

- **BL-1** Backlog 放的是等着被拉上 board 的 task：这周还没上 board 的 habit task，和排在这周的 project step。它从来不放 one-off：把一张 one-off track 到这周，它直接进 Todo。
- **BL-8** Strip 或 pill 上，以及 panel 或 sheet 的 header 上，显示有几张 task 在等：backlog 里每一张 habit task 和每一个 project step，不是有几个 group。8 以内显示数字，0 也显示；超过 8 显示 **8+**。读屏听到的永远是真的数。
- *(pending)* **BL-20** Panel 或 sheet 的 header 下面没有「拖」或「点」的提示，两个宽度都没有：header 后面直接是两段卡（BL-9），或者空的时候的虚线框（BL-19）。
- *(pending)* **BL-19** Backlog 空了的时候，它的入口两个宽度都留着：desktop 的 strip 和 mobile 的 pill，以及 panel 或 sheet 的 header，显示 0（BL-8）。打开以后，panel 或 sheet 在卡的位置显示一个虚线框：一个标题说 everything is on deck，下面两句，一句说这周的 plan 都在 board 上了，一句说可以改 plan 再加、或者这周到此为止。没有按钮，也没有链接。User 在它开着的时候拉走最后一张 task，它不关，虚线框出现在卡的位置。

#### Groups

- **BL-9** Backlog 的 task 按 group 等着：一个 habit 在 backlog 里的 task 是一个 group，一个 project 在 backlog 里的 step 是另一个。两个宽度上每个 group 都是一张卡，显示这个 group 的下一张 task：habit 是编号最小的 copy，project 是编号最小的 step。只有一张 task 的 group 是一张普通的卡；下一张后面还有 task 在等，它的卡就垫着一叠 pile（BL-11）。Group 分两段，先 Habits 再 Projects；没有 group 的那一段不显示。
- **BL-16** 每一段里，group 按它的 habit 或 project 本身创建的时间排（habit 自己的创建时间，不是它加进这周 plan 的时间），早的在前；task 本身不影响顺序。Habit 或 project 是同一时刻创建的，按 habit 或 project 的 id 排。
- **BL-11** 下一张后面还有 task 的 group，卡上显示 **+N more**，N 是后面还有几张；卡下面每一张垫一层薄 sheet，最多三层。Sheet 上没有字，也不能点。Group 只剩最后一张 task 的时候两样都没有。
- **BL-13** 一个 group 的下一张 task 离开 backlog 的时候，卡一放下或者 ↑ Todo 一点，backlog 就变，不等 server（MV-6）：
  - 这个 group 的卡显示它后面的那张 task，**+N more** 减一；后面不到三张以后，下面的 sheet 也跟着减一层
  - Project 开着的 queue 留着，它的第一行现在在卡上；下一步后面没有 step 了，queue 就没了
  - Group 的最后一张 task 离开，它的卡就没了；那一段里没有 group 了，那一段也没了
- *(pending)* **BL-18** Desktop 上，user 拖着一张 backlog 卡的时候，它在 panel 里原来的位置是一个和卡一样大的 placeholder，画得像 pile 的 sheet，上面什么都没有。卡放下之前 backlog 里别的都不变（BL-13）：它下面的 sheet、别的 group 和数量都保持原样。拖的动作取消了，卡回到原来的位置。

#### States · backlog

| State | 显示什么 | 进入 | 离开 |
| --- | --- | --- | --- |
| closed（默认，每次加载都是：BL-4） | desktop：board 右边一条窄 strip；mobile：tab bar 上面一个 pill（BL-2） | A3 | A2 |
| open | desktop：strip 展开成 panel；mobile：一个 sheet 从底部升起，后面的 board 变暗（BL-2） | A2 | A3 |

- **BL-2** Desktop 上 backlog 是 board 右边的一条窄 strip，打开成一个 panel。Mobile 上它是 tab bar 上面的一个 pill，打开是一个从底部升起的 sheet，后面的 board 变暗。
- **BL-4** 每次页面加载 backlog 都是关着的；页面不记它上次开没开。
- **BL-5** 键盘和读屏只能走到 backlog 正在显示的那部分：关着的时候 Tab 跳过 panel，panel 开着的时候跳过 strip。打开 backlog 时焦点移到它的 close button，关上时焦点回到 strip 或 pill。页面第一次加载时焦点留在原处。

#### States · project 的 queue

每张 project 的 backlog 卡，下一步后面还有 step 的时候，有一个 queue。

| State | 显示什么 | 进入 | 离开 |
| --- | --- | --- | --- |
| closed（默认，backlog 每次打开时都是） | **+N more** 带一个 chevron，卡下面是 sheet（BL-11） | A8；A3 | A8 |
| open | Sheet 的位置换成 queue：下一步后面的每个 step 一行（BL-12） | A8 | A8；A3 |

- **BL-12** Project 的 **+N more** 带一个 chevron，点它打开这个 project 的 queue（A8）：在 sheet 的位置，下一步后面的每个 step 一行，按 step 的顺序，每行是 step 的编号和标题。再点一次关上。Habit 的 **+N more** 只是文字，点了什么都不开。关上 backlog（A3）会把所有开着的 queue 关上，所以 backlog 每次打开时 queue 都是关着的。

### Progress

> **As is.** Day rings（RING-1 到 RING-7）取代这块 dashboard。它在 `board.md` 里原样留着、没有 ID，等圈建好的那个改动把它删掉；这里不重抄。

## Client actions

只改页面上的 state，不碰 server。一行是一个 state 的一次变化，「触发」列出所有会让它发生的事，别的 action 带出来的也在里面。

| ID | 组件 | From → To | 触发 | 之后 |
| --- | --- | --- | --- | --- |
| A1 | 空的 board | 留在这页 → plan 页 | 点空 board 的按钮 | plan 页打开 |
| A2 | Backlog | closed → open | 点 strip（desktop）或 pill（mobile） | 焦点进到它的 close button（BL-5） |
| A3 | Backlog | open → closed | 点 panel 或 sheet 的 close button | 焦点回到 strip 或 pill（BL-5） |
| A8 | Project 的 queue | closed ⇄ open | 点 project 的 backlog 卡上带 chevron 的 **+N more**；关上 backlog（A3）也会把它关上 | 下一步后面的 step 显示在 sheet 的位置，或者收回去（BL-12） |
| *(pending)* A10 | Todo 卡 | normal → selected | 点 Todo 卡的任何地方，两个宽度一样 | 卡显示它的 ✓ Complete（TAP-1） |
| *(pending)* A11 | Todo 卡 | selected → normal | 再点一下选中的卡（✓ Complete 以外的地方）；点 Todo 卡以外的任何地方；按 Esc；点另一张 Todo 卡（选中移过去，A10）；打开一天的清单（A13）；打开 backlog（A2） | 什么都没完成。滚动不会取消选中，也没有计时取消 |
| *(pending)* A13 | 日格的清单 | closed → open | 点今天那格，或者今天之前某天的格子 | 清单打开：desktop 是 panel，mobile 是 sheet（DAY-2）；焦点移到它的 close button（DAY-5） |
| *(pending)* A14 | 日格的清单 | open → closed | 点清单的 close button；再点一下那天的格子；点清单外面的任何地方（mobile 上是变暗的 board）；按 Esc；点另一天的格子（那一格打开，A13）；打开 backlog（A2）；选中一张卡（A10） | 焦点回到那天的格子（DAY-5） |

## Server actions

写数据的动作，都走 `updateTaskStatusAction`。

| ID | Action | 在哪 | 写成 | 结果 |
| --- | --- | --- | --- | --- |
| A4 | Pull to Todo（desktop） | 把 backlog 卡拖到 Todo 上 | `TODO` | 卡动了（A move） |
| *(pending)* A9 | Pull to Todo | 点 backlog 卡上的 ↑ Todo，两个宽度一样 | `TODO` | 卡动了（A move），panel 或 sheet 留着等下一张 |
| A6 | Finish from the backlog | 把 backlog 卡拖到 Done 上（desktop） | `DONE` | 卡动了（A move） |
| *(pending)* A15 | Finish by dragging（desktop） | 把 Todo 卡拖到 Done 上（desktop） | `DONE` | 卡动了（A move），什么都不飞（FX-2） |
| *(pending)* A12 | Complete | 点选中的卡上的 ✓ Complete，两个宽度一样 | `DONE` | 卡播它的 juice、飞进今天的圈（FX-1、FX-2），然后动（A move） |

### A move

一张卡动的时候发生什么（A4、A6、A9、A12、A15）：

- *(pending)* **MV-6** 卡在 server 回答之前就动：卡一放下、或者 ↑ Todo 一点就动；用 ✓ Complete 完成的，等它落进今天的圈（FX-2）。它去 Todo 里它该在的位置（按 COL-2 排）；做完的，desktop 上去 Done 的最上面，mobile 上离开 board。同一时刻：
  - 数量跟着走：它离开的那列和它落下的那列改各自表头的数（COL-6）；离开 backlog 的卡让 backlog 的数量减一（BL-8）
  - 卡的 progress，做完的时候：每一张显示它的卡上，它的 dot 或者那一段都填上（CARD-7）；读屏把 habit 卡的 dots 读成多做完一个
  - 今天的圈把它数进去（RING-2）：拉进 Todo 的卡让今天的 planned 加一；从 Todo 做完的卡让今天的 done 加一；从 backlog 直接做完的卡两个都加一
- **MV-2** Server 存下新的 status。挪到 Done 时记下做完的时间；挪到 Todo 时清掉它。
- *(pending)* **MV-7** Server 回答以后，页面重新读数据。圈已经数过这次 move 了（MV-6），所以 reload 不会让它们变。挪到 Done 的 one-off 同时离开 priority matrix。
- *(pending)* **MV-8** Server 拒绝一次 move 的时候，今天的圈把 MV-6 为它加的数拿回去；这次 move 合上的圈重新打开，不再庆祝第二次。用 ✓ Complete 完成的卡像 MV-4 那样回到 Todo。
- **MV-4** Server 拒绝一次 move 的时候，只有那一张卡回到原来的位置。别的卡还在保存的话，它等它们存完再回去。

### Rules

Server 上：

- **R1** Server 只让 task 往前走：Backlog → Todo、Backlog → Done、Todo → Done。别的 move 它都拒绝，所以做完的工作一直算数。
- **R2** Server 只动 plan 上的 task。还在 priority matrix 上的 one-off 要 track 到这周才上 board，不是靠 move。
- **R3** Server 只动 user 自己的 task。

Board 上：

- **R4** Done 里的卡不能拖。
- **R5** 什么都不能放进 backlog。
- **R6** 只有 group 的下一张 task 能从 backlog 拉出来：project 的 queue 里的 step 不能拖，也没有 ↑ Todo。只有 board 守这条：server 动一张 task 时不查它在 group 里的位置（R1），所以 board 以外的写入路径，比如以后 Claude 通过 MCP 用的 tool，不受它限制。
- *(pending)* **R7** 一天的清单只读：里面的东西不能挪回 Todo 或 backlog。Server 也拒绝这种 move（R1）。

Server 拒绝一次 move 的时候，卡像 MV-4 那样回去。

## Motion

一张卡被选中、完成、计数的时候播什么。每个 motion 长什么样（什么在动、动多远、多久）归它的 `fx-*` utility，在 `design/design-language/README.md` › Motion 和 › FX utility layer。每个 motion 结束时 layout 和静止时一样；系统要求 reduced motion 时都不播，只有 FX-2 留的那一下淡出例外。

| ID | 触发 | 哪个元素、播什么 | Reduced motion |
| --- | --- | --- | --- |
| *(pending)* FX-1 | 点 ✓ Complete（A12） | 卡在原地先播一个 *juice*：`fx-juice-wobble`、`fx-juice-shine`、`fx-juice-burst`、`fx-juice-flip` 里每次随机一个，页面上不会连着两次一样 | 不播 juice |
| *(pending)* FX-2 | Juice 播完 | 卡用 `fx-toss` 飞进今天的圈：卡的一个替身画在 board 上面（哪一列都裁不掉它），从卡的位置飞到今天那格；它落下，卡就离开 Todo（MV-6）。原来在它下面的卡用 `fx-slide` 滑上来补位。把卡拖到 Done 上什么都不飞 | 不飞也不滑：卡在原地用 `fx-fade-out` 淡出，然后离开 Todo，下面的卡直接补上 |
| *(pending)* FX-3 | 页面上某一天的数变了 | 它的圈上的弧用 `fx-ring-grow` 长到或者缩到新的长度；一张卡做完的时候，今天那格另外用 `fx-ring-tick` 轻轻跳一下 | 弧直接变成新的长度，格子不跳 |
| *(pending)* FX-4 | 页面上做完的一张 task 让今天的圈合上（RING-3），用 ✓ Complete 或者拖到 Done 都算 | 今天那格用 `fx-ring-close` 庆祝：圈转一圈，迸出火花，颜色按今天做完的 task 各 kind 的比例分，✓ 在圈中心画出来。页面加载时已经合上的圈不播 | 不播：✓、success 色的框和 **All N done** 直接出现（RING-5） |
| *(pending)* FX-5 | Desktop 上，页面上做完的一张卡落到 Done 的最上面 | 它用 `fx-done-in` 亮一下，然后保持 Done 的样子（CARD-2）。只有那一刻亮：页面重新渲染或者 reload 的时候不再亮 | 不亮 |
| *(pending)* FX-6 | 选中一张卡（A10）；取消（A11） | 卡上播 `fx-arm`：圆圈长成 ✓，**Complete** 在旁边进来；取消时倒着播 | 卡直接变成 selected 或 normal 的样子 |
| *(pending)* FX-7 | 点 ✓ Complete；今天的圈合上（FX-4，两条路都算） | 设备能振动的时候：前者请求一次短的双振，后者请求一次长一点的。这两个不是 motion | 照常振 |
| *(pending)* FX-8 | 按住一张 Todo 卡，或者一个是 button 的日格 | 按住的时候它用 `fx-press` 缩一点，松开回来。Done 和 backlog 里的卡、今天之后的格子不缩 | 不缩 |

故意不管（owner，2026-11-19）：一张卡还在飞的时候，点另一张 Todo 卡会怎样。很少有人会这样用，所以没有条目、没有测试，实现选简单的。

## Journeys

- **J1 New user**：
  - 空的 board（ST-1）：请 user 做第一个 plan
  - 开始做 plan（A1）：plan 页打开
- **J2 Returning user**：
  - 空的 board（ST-2）：显示上周的 recap
  - 开始做这周的 plan（A1）：plan 页打开
- *(pending)* **J12 A week's work - desktop**，backlog 里有一个 habit 的两张 task 和一个 project 的两个 step，今天什么都没做完：
  - board（ST-4）：Todo 和 Done 都是空的，今天的圈是空轨道，读成 **0 of 0 done**
  - 打开 backlog（A2）：panel 里有两个 group，habit 在 Habits 下面，project 在 Projects 下面，header 下面没有提示（BL-20）。每张卡显示它那个 group 的下一张 task，带 **+1 more**，垫着一层 sheet。数量是 4，和 strip 上一样。
  - 打开 project 的 queue（A8）：下一步后面的那个 step 显示在 pile 的位置
  - 把 project 的下一步拖到 Todo 上（A4）：它在 Todo 里；Todo 的数量加一，backlog 的减一。Project 的卡现在显示它的第二步，是一张普通的卡，没有 **+N more**，也没有 queue（BL-13）。今天的圈马上读成 **0 of 1 done**（MV-6）。
  - 点 habit 卡上的 ↑ Todo（A9）：habit 的下一张 task 进了 Todo，panel 还开着，habit 的卡显示它的第二张 task、是一张普通的卡，今天的圈读成 **0 of 2 done**
  - 关上 backlog（A3）：strip 显示 2
  - 选中 habit task（A10）：它显示 ✓ Complete
  - 完成它（A12）：它播 juice、飞进今天的圈；然后它在 Done 的最上面、亮一下，它的 dot 填上，读屏把这个 habit 的 dots 读成多做完一个。Todo 的数量减一，Done 的加一，今天的圈读成 **1 of 2 done**，habit 的那段弧填上了。
  - 打开今天的清单（A13）：里面列着这张 habit task（DAY-3）
  - reload：step 还在 Todo，habit task 还在 Done，今天的圈读成 **1 of 2 done**；strip 显示 2，打开 backlog，两个 group 都是普通的卡
- *(pending)* **J13 A week's work - mobile**：J12 在手机上，数据和步骤一样，除了：
  - 打开 backlog（A2）：pill 打开 sheet
  - 拉 project 的下一步（A9）：点它卡上的 ↑ Todo，不拖；sheet 留着等下一张
  - 关上 backlog（A3）：pill 显示 2，sheet 后面的 board 又能点到了
  - 完成 habit task（A12）：它飞进今天的圈、离开 Todo；board 上没有 Done，今天的圈读成 **1 of 2 done**
  - 打开今天的清单（A13）：清单在 sheet 里打开
  - reload：habit task 在今天的清单里，不在 board 上
- *(pending)* **J14 Finish from the backlog - desktop-only**，backlog 里有一个 habit 的两张 task，Todo 是空的，今天什么都没做完：
  - board（ST-4）：Todo 和 Done 都是空的，今天的圈读成 **0 of 0 done**
  - 打开 backlog（A2）：habit 的卡带 **+1 more**，垫着一层 sheet
  - 把 habit 的下一张 task 拖到 Done 上（A6）：什么都不飞（FX-2）。它在 Done 的最上面，它的 dot 填上，读屏把这个 habit 的 dots 读成多做完一个；Done 的数量加一，backlog 的减一，habit 的卡显示它的第二张 task、是一张普通的卡。今天的圈马上把它同时算进 planned 和 done，合上了：庆祝（FX-4），读成 **All 1 done**（RING-5），Todo 显示今天清空了（COL-8）。
  - reload：task 还在 Done，今天的圈还是合上的，不庆祝
- *(pending)* **J15 Wrap up the day - desktop**，Todo 里有一张 habit task 和一个 project step，backlog 里还有别的，今天什么都没做完：
  - board（ST-4）：Todo 显示这两张卡，Done 是空的，今天的圈读成 **0 of 2 done**
  - 选中 habit task（A10），再选中 step（A10）：选中移到 step 上，habit task 回到 normal
  - 再点一下 step，点在 ✓ Complete 以外的地方（A11）：它回到 normal，什么都没完成
  - 选中 habit task 并完成它（A10、A12）：它飞进今天的圈；它在 Done 的最上面，dot 填上；step 还在 Todo，今天的圈读成 **1 of 2 done**
  - 选中 step 并完成它（A10、A12）：它飞进今天的圈；它在 Done 的最上面，它在 path 上的那段填上。今天的圈合上并庆祝（FX-4）：读成 **All 2 done**，有 ✓，框变成 success 色（RING-5），空的 Todo 显示今天清空了（COL-8）。
  - reload：今天的圈还是合上的，不庆祝；Todo 还显示今天清空了，Done 里有这两张 task
- *(pending)* **J16 Wrap up the day - mobile**：J15 在手机上，数据和步骤一样，除了：每张完成的卡离开 board，不落到 Done 上（COL-6）；虚线框显示在 Todo 的列表里（COL-7）；reload 以后两张 task 都在今天的清单里。
- *(pending)* **J17 Look back at a day - desktop**，周三，有一个一天跑两次的 habit：周一的两张 habit task 和一张 one-off 都在周一做完了；周二的两张 habit task 做完一张，另一张 expire 了；Todo 是空的，今天什么都没做完：
  - board（ST-4）：周一的圈是合上的，有 ✓；周二的圈填了一半；周四到周日的圈是空轨道，不是 button（RING-7）
  - 打开周一的清单（A13）：它浮在那排圈下面、周一那格的正下方。Header 读成 Mon 和 **3 of 3 done**，行是那两张 habit task，然后是 one-off（DAY-3）。
  - 打开周二的清单（A13）：周一的清单关上，周二的读成 **1 of 2 done**，有一行 habit task
  - 再点一下周二那格（A14）：清单关上
  - 打开今天的清单（A13）：header 读成 Today 和 **0 of 0 done**，清单显示 **Nothing yet**
  - 按 Esc（A14）：清单关上，焦点回到今天那格
- *(pending)* **J18 Look back at a day - mobile**：J17 在 390 px 的手机上，数据和步骤一样，除了：
  - board（ST-4）：这一排显示周一到周四：今天、它前面的两天，再用周四补上（RING-1）
  - 每个清单都在从底部升起的 sheet 里打开，后面的 board 变暗（DAY-2）
  - 不按 Esc，改成点 sheet 外面变暗的 board（A14）：sheet 关上
- *(pending)* **J19 Clear the backlog - desktop**，backlog 里有一个 habit 的两张 task：
  - board（ST-4）：strip 显示 2
  - 打开 backlog（A2）：habit 的卡带 **+1 more**，垫着一层 sheet，数量是 2
  - 点它卡上的 ↑ Todo（A9）：habit 的卡显示它的第二张 task、是一张普通的卡，panel 还开着，数量是 1
  - 提起最后一张卡（BL-18）：它原来的位置是一个空的 placeholder，数量还是 1
  - 把它放到 Todo 上（A4）：panel 显示 everything is on deck，数量是 0（BL-19）
  - 关上 backlog（A3）：strip 还在，显示 0
  - 再打开（A2）：panel 还是显示 everything is on deck
- *(pending)* **J20 Clear the backlog - mobile**：J19 在手机上，数据和步骤一样，除了：
  - 打开 backlog（A2）：pill 打开 sheet
  - 拉每一张 task（A9）：点它卡上的 ↑ Todo，不拖，所以没有「提起」那一步。点第一下以后数量是 1。点第二下以后 sheet 还开着，显示 everything is on deck，数量是 0（BL-19）。
  - 关上 backlog（A3）：pill 还在，显示 0

## 正在移除

已经建好、还有测试，但这次设计不要了的条目。它们的原文留在 `board.md`；实现的 PR 把条目和它的测试一起删掉。

| ID | 原来是什么 | 被谁取代 |
| --- | --- | --- |
| *(removing)* ST-3 | Active plan，server 还给 progress counts | ST-4 |
| *(removing)* COL-1 | 两列，Todo 和 Done | COL-6 |
| *(removing)* COL-4 | Mobile 上两排横着滑的 mini 卡 | COL-7 |
| *(removing)* COL-5 | Todo 空了的虚线框，卡一落到 Done 上就出现 | COL-8 |
| *(removing)* CARD-1 | 卡的部位，带 size 和 points | CARD-9 |
| *(removing)* CARD-8 | Habit 卡，带 Daily × N 或 Weekly × N | CARD-10 |
| *(removing)* CARD-4 | Step 卡，带 n/N | CARD-11 |
| *(removing)* CARD-5 | One-off 卡，quadrant 在 kind 旁边 | CARD-15 |
| *(removing)* CARD-6 | Mobile board 上的 mini 卡 | COL-7 |
| *(removing)* BL-10 | Backlog 卡自己的一套描述 | CARD-9、CARD-14、CARD-12 |
| *(removing)* BL-14 | 拖 backlog 卡时的 placeholder，里面提到提示行 | BL-18 |
| *(removing)* BL-15 | 空的 backlog，里面提到提示行 | BL-19、BL-20 |
| *(removing)* A5 | Pull to Todo（mobile） | A9 |
| *(removing)* A7 | Finish：把 Todo 卡拖到 Done 上，两个宽度 | A15；mobile 上用 A12 |
| *(removing)* MV-5 | 卡在 server 回答前就动 | MV-6 |
| *(removing)* MV-3 | Server 回答以后 progress dashboard 才数这次 move | MV-7 |
| *(removing)* J5 · J6 | A week's work | J12 · J13 |
| *(removing)* J11 | Finish from the backlog - desktop-only | J14 |
| *(removing)* J7 · J8 | Wrap up the day | J15 · J16 |
| *(removing)* J9 · J10 | Clear the backlog | J19 · J20 |

## 和 board.md 的出入

说的事一样，下面是摆法上不一样的地方。

- **并进表里、不再单独是条目的**（都是 pending，还没有测试）：
  - DAY-4（清单怎么关）：并进 A14 那一行的「触发」。
  - TAP-2（选中怎么取消）：并进 A11 那一行。
  - DAY-1 和 TAP-1 里「点一下就打开 / 选中」的那半句：并进 A13、A10；两条现在只说那个 state 下显示什么。
- **新的 ID**（Card 一节按你说的三层摆）：
  - CARD-9 只留每张卡都有的部位。
  - CARD-13（在 Todo）和 CARD-14（在 backlog）：从 CARD-9 的 action 那一条和原来的 BL-17 拆出来，和已经建好的 CARD-2（在 Done）并排成一张表。
  - CARD-15（one-off）：从 CARD-9 的 kind line 那一条拆出来，和 CARD-10、CARD-11 并排。
- **Actions 拆成两张表**：client actions 一行是一个 state 的一次变化，连带效果写在被影响的那一行的「触发」里；server actions 和 A move、Rules 放一起。ID 都没变，journey 不用动。
- **Motion 改成表**：触发、哪个元素播什么、reduced motion 三列，就是 `specs/README.md` 要求每个 motion 说清的三件事。
- **已经建好的条目只挪了位置**，说的话没变，测试不用改：ST-1、ST-2、COL-2、COL-3、CARD-2、CARD-7、BL-1、BL-2、BL-4、BL-5、BL-8、BL-9、BL-11、BL-12、BL-13、BL-16、A1–A4、A6、A8、MV-2、MV-4、R1–R6、J1、J2。
- ***(removing)* 的条目集中到最后一节**，不再和取代它们的条目挨着。

## 想请你看的几处

1. **State 的名字**：日格的清单用了 closed / open，和圈的「合上」（英文也是 closed）容易混。英文版里圈可以继续叫 closed，日格的 state 换个词（比如 list shown / hidden），或者反过来。
2. **States 表本身没有 ID**：每个 state 显示什么，靠表里指向的条目（DAY-1、TAP-1、BL-2、BL-12）。这样一个 state 一个测试；如果你想让表的每一行自己就是条目，也可以改成那样。
3. **已经建好、里面混着「显示」和「动作」的条目没有拆**（BL-12、BL-5、BL-2）：拆了要改测试的标题。这一版把它们整条放在所属的 state 下面；要不要拆，等结构定了再说。
4. **FX-8（按下缩一点）**：按「hover / 按下归 design language」的说法，它可以移出 spec，只留「哪些东西能点」。这一版先留着。
5. ***(removing)* 集中到最后**：正文读起来就是 board 将来的样子。代价是它们不再挨着取代它们的条目，和 `specs/README.md` 现在的写法不一样，要跟着改规则。
6. **Card 多了三个 ID**（CARD-13、14、15）：实现时多三个测试，换来每个地方、每种 kind 各有一条。
