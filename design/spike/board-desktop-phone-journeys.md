# Spike: Board 在桌面和手机上，一套 journey 还是两套

**Status: decided** · 2026-11-09（同日定；Q4–Q5 留给 native iOS 的 spike）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（Todo / Done / backlog、`doneAt`、`BoardPage`、`useBreakpoint`），和代码、mockup、tracker 一一对应。

回答 PR #115 第 9 轮 owner 的问题（`reviews/pr-115.md`）。挂在 tracker 的 *Week model Phase 2 › Design PR — Board · tap to complete* 下面。

## 起因 · Trigger

`mockup-board-tap-to-complete.html` 的 D · Done 定了：没有 Done 列，一天的清单藏在那天的圈后面，桌面是浮窗，手机是 sheet。定完以后 owner 发现两件事：

1. 桌面只剩 Todo 和 backlog，看起来光秃秃的。
2. Owner 最大的 friction 在手机；桌面其实还好，而且 owner 喜欢在桌面上看到一长串 done。

如果桌面把 Done 列加回来、手机继续走圈 + sheet，两边就是两套不同的 user journey。Owner 的问题是：

- 这是不是一个好的决定？
- 维护两套 journey 对代码有什么影响？
- 以后要把手机拿出来做 native iOS app，这件事怎么影响上面两个答案？

## 先分清：「两套 journey」指的是哪一层

一件事在两个设备上可以在三层上不同：

| 层 | Board 上的例子 | 现在 |
| --- | --- | --- |
| **数据和规则** | 什么算完成、`doneAt` 记在哪天、只能往前移（`updateTaskStatus` 的 `WHERE`）、今天的总数怎么算 | 一套：`src/services/` + DAL，actions 和 MCP tools 都走它 |
| **交互和状态** | 点卡片选中、再点取消、只有 ✓ Complete 才完成；点某天的圈打开那天的清单 | mockup 里一套，两个宽度一样 |
| **呈现和布局** | 清单是一列、是浮窗还是 sheet；卡片是全宽卡还是 mini 卡 | 已经按宽度分开：`useBreakpoint`、`src/components/` 里 23 个文件有只在一个宽度出现的 class（`md:hidden`、`max-md:` 等）、`TaskCardMiniFace` / `TaskCardFace`、`MobileBacklog` / `DesktopBacklog`、`MobileMoveToSheet` |

Owner 想要的差别只在**第三层**：同一份「这天做完了什么」，桌面一直摊开，手机收在圈后面。前两层没有理由不同。只要前两层是一套，就不算「两套 journey」，而是「一套 journey、两种呈现」。

## Research（每条都有来源，标了的没有核实）

**设备之间的一致性**

- NN/g 的 cross-channel consistency 研究说：核心任务每个渠道都要有，核心 workflow 要相似；但也要明白「什么时候可以牺牲一致性」（[NN/g 2016](https://www.nngroup.com/articles/cross-channel-consistency/)）。按使用场景优化时，手机适合「短的、会被打断的 microtask」，桌面适合「长的、复杂的工作」；原则是「core consistency + 在合适的地方妥协」（[NN/g 2017](https://www.nngroup.com/articles/context-specific-cross-channel/)）。
- 手机平均一次 72 s，桌面 150 s，要为打断而设计（[NN/g 2015](https://www.nngroup.com/articles/mobile-ux/)）。
- 反方：Luke Wroblewski 问，屏幕大了，为什么优先级要变？（[Mobile First ch.2](https://lukew.com/mobilefirst/04-chapter-2/index.html)）Brad Frost：「手机用户不想做桌面上做的事」是个迷思（[content parity](https://bradfrost.com/blog/post/content-parity/)）。
- Apple HIG 给了答案：iOS 上次要的信息「一步可达」，会话常常只有一两分钟（[Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)）；macOS 上「同样的内容，嵌套更少、更少的 modal」，会话可以几个小时（[Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)）。**优先级不变，屏幕大了就少一层 modal。**
- Android 的 canonical layout 正好有这个模式：*supporting pane*，只在和主内容一起时才有意义的内容；窄屏放进 bottom sheet，宽屏放在主内容旁边（约 70/30）（[Android Developers](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts)）。一天的 done 清单就是 Todo 的 supporting pane。

**产品**

- 拆成两套的，都是因为设备干的是**不同的活**：Linear Mobile 是为「away from keyboard」设计的（[Linear](https://linear.app/changelog/2024-09-19-introducing-linear-mobile)）；Figma 手机只能看、评论、试 prototype，不能编辑（[Figma](https://help.figma.com/hc/en-us/articles/1500007537281)）。
- 同一件事故意少给一个视图，会被当成缺陷：Sunsama 的 iOS app 是「companion」，评论说「underfeatured… can't see more than one day at a time」，开发者回复「we haven't got parity on the mobile app yet」（[App Store](https://apps.apple.com/app/id1475755747)）。
- Things 3 是「三个 app，但基本一样」：同样的 list（包括 Logbook）在每个平台都有，Mac 多了键盘，iPhone 多了 haptics（[MacStories](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/)）。同一套 journey，各用各平台的输入方式。

**两套的代码成本**

- Karen McGrane 对 m-dot 分站的总结：「每次改动两边都要更新……不同步、白费功夫」（[2012](https://karenmcgrane.com/a-separate-mobile-website-no-forking-way/)）。
- Backends for Frontends：「one experience, one BFF」；两个前端共用的逻辑往下沉到 domain service，而不是做成共享库（[Sam Newman](https://samnewman.io/patterns/architectural/bff/)）。我们的 `src/services/` + DAL 已经是这个 core，actions 和 MCP tools 已经是它上面的两个薄前端。
- Basecamp 五个人做四个平台，靠的是共享 web core、native 只做导航（[Signal v. Noise 2014](https://signalvnoise.com/posts/3766-hybrid-how-we-took-basecamp-multi-platform-with-a-tiny-team)）。全 SwiftUI 的 app 放弃了这份节省，UI 一定要写两遍。

**Native iOS 需要服务端有什么**

- Next.js 自己的说法：Route Handlers 是「public HTTP endpoints，任何 client 都能访问」；server actions 的主要用途是「从你的 frontend client 改数据」（[Next.js BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend)）。Swift client 调不了 server actions，要有 JSON 的 route handlers。
- Supabase 支持 native 的 Google / Apple 登录，再用 `signInWithIdToken()` 换 session（[Supabase 2023](https://supabase.com/blog/native-mobile-auth)）。route handlers 就要接受 Bearer token，不只是 cookie（推断）。
- 装了 app 以后，Smart App Banner 会把网页直接打开到 app 里的对应位置（[Apple](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)）——网页的手机布局可以留作没装 app 时的 fallback。
- Offline / sync：没有研究，是 native 自己的 spike。

**看到做完的事**

- 每天 15 分钟回顾，表现比对照组好 22.8%（[HBS Working Knowledge 2014](https://www.library.hbs.edu/working-knowledge/reflecting-on-work-improves-job-performance)）——桌面上的长时间回顾，正需要一个看得见的 done 清单。
- 离目标远时，强调做完的更有动力；接近目标时，强调还剩的更有动力（Koo & Fishbach 的 small-area hypothesis，[ScienceDaily 2012](https://www.sciencedaily.com/releases/2012/04/120416113113.htm)；研究对象是咖啡店集点卡，能不能迁移没验证）。风险：周后半段，一长列 done 也许不如 Todo 推动人。

## 选项

### A · 一套 journey，桌面把清单摊开（推荐）

- **两个宽度完全一样的**：卡片的 tap twice、完成后卡片离开 Todo、进到那天的清单、圈接上一段；点某天的圈 = 看那天的清单；同样的词（Today / All 5 done / Today's plan is done）。
- **只在呈现上不同**：桌面在 Todo 旁边放一个一直开着的 **Done pane**——就是那天的清单常驻展开，按天分组（本周，今天在最上面）；点某天的圈，pane 滚到那一天并高亮它。手机上同一个清单收在圈后面，点了升起 sheet。浮窗（D 定稿里桌面的 popover）就不需要了。
- **好在哪**：桌面不再光秃秃，owner 喜欢的一长串 done 回来了；换设备不用重新学（NN/g 的 core consistency）；这正是 HIG（大屏少一层 modal）和 Android supporting pane 描述的做法；完成一张卡时，桌面上能看到它「掉进」今天的清单，比消失更有成就感。
- **差在哪**：周后半段一长列 done 可能分散注意力（Koo & Fishbach）——解法在呈现层：之前的天默认折叠，今天展开。桌面上 Done pane 占掉大约 30% 宽度。

### B · 两套 journey

- 桌面恢复第 1 轮的 Done 列（完成的卡片拖进去或点 ✓ 进去，按状态而不是按天），可能还保留拖到 Done；手机走圈 + sheet + tap twice。两边各自演化。
- **好在哪**：每个设备都可以按自己的场景单独调。
- **差在哪**：同一件事（完成、回顾）两套规则——拖到 Done 和 tap twice 的防误触不一样；flow doc、e2e contract、Design Console scenario 都要写两份，改一边要记得另一边（McGrane 的 fork 成本）；以后 native iOS 再实现一遍手机那套，变成三份；换设备时要切换心智模型。研究里拆成两套的产品，都是因为设备干的是不同的活，这里不是。

### C · 现状定稿：一套 journey，桌面也是浮窗

- **好在哪**：最少的代码，两个宽度一模一样。
- **差在哪**：桌面光秃秃（owner 的观察）；大屏上还要多点一下才能看到 done，HIG 说桌面该少一层 modal；没用上桌面的空间。

## 代码影响

**A**

- 数据：不需要新字段。`Task.doneAt` 已经有了；按天分组、以及每天的圈都从它推导，在 service 里按用户的时区算好，页面拿到的是 `doneByDay`。
- 组件：一个 `DayDoneList`（某几天的清单，按 kind 排），两个外壳：手机的 sheet、桌面的 pane——呈现的分叉只在这一处，和现在 `MobileBacklog` / `DesktopBacklog` 的做法一样。圈的点击在两边都是「选中那一天」，只是桌面的效果是滚动 pane，手机是打开 sheet。
- 状态：tap twice 的选中状态、选中的那一天，放在 `BoardPage` 的 context 里（AGENTS.md › Page structure），两种呈现共用。
- 测试：e2e 本来就跑两个宽度（`playwright.config.ts` 的 desktop / mobile project）。A 的 spec 是一份 flow、两个宽度各一组断言；Design Console 的 Board scenario 加一个 Done pane 的 tab。
- 文档：`flows/board.md` 一份 Interactions，写「点某天 → 那天的清单」，呈现差别写在 Visual。

**B**

- 两套组件树：桌面的 Done 列（`BoardColumn` 的 Done 分支、DnD 到 Done 的 droppable）和手机的圈 + sheet + tap twice；两份 interaction 规则、两份 e2e、两份 scenario。
- 完成的规则会有两条路径：拖到 Done 和 tap twice。server 那一层仍然只有一个 `updateTaskStatus`，所以数据不会错，但「误触怎么防」只在手机成立。

**C**：只有 D 已定的浮窗和 sheet，最小。

## Native iOS 的影响

这一节和选哪个选项关系不大，但它决定**什么必须先放在服务端**：

1. **一套 HTTP API。** Server actions 不能被 Swift 调用，要有 JSON 的 route handlers（比如 `src/app/api/v1/…`），和 actions 一样薄：validate（复用 `src/schemas.ts` 的 zod）→ service。AGENTS.md 现在规定 route handlers 只交给 `src/mcp/` 或 `src/lib/`，到时候要改成「也可以交给 service」。不要让 app 直接用 Supabase 的表（PostgREST）——那样会绕开 services，违反「data rule 要在每条写路径上」（AGENTS.md › Layers）。
2. **登录。** Supabase 的 native Google / Apple 登录拿到 session，route handlers 验 Bearer token；MCP 的 identity middleware 已经在验 token，可以参照。
3. **规则留在服务端。** 「今天的总数」（Ideas 2）、每天的圈、tap twice 只是 UI——但「什么算完成、完成算在哪天」必须是 service 的输出，web 和 iOS 拿到的是同一份数字，不各算各的。
4. **会被写两遍的**：所有的 view、view 的状态、乐观更新、动画。**只写一遍的**：API contract、domain 规则、enum、flow doc。
5. **网页的手机布局**：native 上线之前，它就是手机版；上线之后，它是没装 app 时的 fallback（Smart App Banner 把装了 app 的人送进 app）。所以网页手机版不会被删，但不再需要追着 native 做新东西。

**对选项的影响**：手机的 journey 迟早要在 SwiftUI 里再实现一遍。A 的话，web 的两种呈现 + iOS 的一种呈现都照着**一份** journey 写；B 的话，iOS 要照着手机那一套写，桌面那一套只在 web 上存在，三份实现、两份规则。

## 我的看法（owner 问了「你觉得呢」）

**选 A。** 理由：

1. Owner 想要的差别（桌面摊开、手机收起）只是呈现，不需要两套 journey 就能得到。
2. 研究里拆成两套的产品，都是因为设备干的是不同的活；这里桌面和手机干的是同一件事：完成、回顾。
3. 以后要做 native，一份 journey 是三个实现（web 桌面、web 手机、iOS）的共同 spec；两份 journey 会让每条规则、每个测试都写两遍。
4. A 只在 D · Done 的已定方案上改一处：桌面的浮窗换成常驻的 pane，其余（圈、sheet、tap twice、Celebration）都不动。

## 实施计划（A）

1. **这个 PR**：在 mockup 的 D · Done 上做一个修订（amendment，标日期）：桌面换成 Todo + Done pane + backlog 的三栏，pane 按天分组、今天在上、之前的天折叠，点圈滚到那天；手机不变。Ideas 里补一条「周后半段 done 太长」的观察点。
2. **实现 PR（之后，从 `main` 开）**：`doneByDay` 进 board 的 service 输出；`DayDoneList` + 两个外壳；`flows/board.md` 按新格式写 Interactions；e2e contract 两个宽度各一组。
3. **Native iOS（另开 spike）**：API 层（route handlers + Bearer auth）、offline / sync、SwiftUI 的结构。AGENTS.md 关于 route handlers 的那一条在那个 spike 里改。

## 待拍板的问题

1. **选 A、B 还是 C？**（推荐 A）
2. **桌面的 Done pane 放什么**：本周按天分组、今天在上、之前的天折叠（推荐）；只放今天；还是跟着圈选中的那一天切换？
3. **Pane 放在哪**：Todo 和 backlog 之间（完成的卡往右「掉进」pane，推荐），还是最右边、backlog 之外？
4. **Native iOS 什么时候开始**：现在只记下来（上面第 1–3 条留给 native 的 spike），还是现在就先做 API 层？推荐等 Phase 2 的 board 实现之后再开，因为 board 的 service 输出（`doneByDay`、今天的总数）要先定。
5. **网页的手机布局在 native 之后的地位**：作为 fallback 维持、不再加新功能（推荐），还是继续和 native 同步？

## Decision · 2026-11-09

Owner（PR #115 第 10 轮，对话里）：「你把 done 那一节分成 desktop 和 mobile 两个部分，然后 mobile 部分就按现在的做法，desktop 按 spike 的来」。

1. **A**：一套 journey，两种呈现。手机不变：点圈，那天的清单从 sheet 升起。桌面：D 定稿里的浮窗换成常驻的 Done pane。
2. **Pane 放本周、按天分组**：今天在最上面展开，之前的天折叠；点某天的圈，那一组展开、高亮、滚到它（按推荐）。
3. **Pane 在 Todo 和 backlog 之间**（按推荐）。
4. 留给 native iOS 的 spike（tracker › Cross-cutting › Future）。
5. 同上。

画在 `mockup-board-tap-to-complete.html` 的 D · Done（修订 2026-11-09）：Desktop 和 Mobile 两节。
