# Spike: Board · tap to complete 分几个阶段做

**Status: awaiting owner review** · 2026-11-19

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（Todo / Done / backlog、habit / project / one-off、`doneAt`、`BoardPage`），和代码、mockup、tracker 一一对应。

挂在 tracker 的 *Week model Phase 2 › Design PR — Board · tap to complete* 和 *Board implementation PR* 下面。

## 起因 · Trigger

Board · tap to complete（PR #115，mockup `design/mockup/mockup-board-tap-to-complete.html`）是 Phase 2 里最大的一块 board 改动：一套卡片、点两下完成、每天一个圈、完成的 juice 和 toss、关圈的庆祝、一天清单的浮窗和 sheet。2026-11-19 owner 把它退回 pending，mockup 页首写了两件要先做的事：

1. **没写下来的动效**：mockup 里有一些动画没有在任何 tab 里说清楚，要么写下来，要么删掉。
2. **Before 要重画**：Before 必须是当时的产品；PR #126（backlog grouping）落地以后，Before 已经和 `main` 对不上。

在这两件事处理完、owner 重新定稿之前，`write-spec` 不会写 spec（它要一个已定的设计），`implement-spec` 也就没东西可建。所以这件事一次做不完，要分阶段。这个 spike 提出怎么分，以及每一阶段等谁。

## 分阶段 · Phases

每一阶段是一个 PR，从 `main` 开，前一个合并以后再开下一个（第 1 阶段除外，它就是 PR #115 的续集）。

1. **Mockup rework**（本 PR，`claude/board-tap-to-complete-pr1-mockup-rework`）：处理页首的 ① 和 ②，等 owner 重新定稿。
   - ① 每个 tab（T、C、D、M）加一张「动效」表：触发、哪个元素怎么动、多久、reduced motion 下剩什么。没有产品依据又不在任何决定里的动画删掉。
   - ② Before 对照 `main` 重画：卡片、backlog（默认收起、可以点开）、空 backlog 的 FinishBox、Done 的排序。
2. **Spec**（`write-spec`，`write-spec-reviewer` 检查）：把 F · Final 写进 `design/specs/board.md`，标 *(pending)*。要在这一阶段定下来的：
   - 今天的圈数什么（Ideas 2）。
   - 一天做完以后又加的工作会重新打开圈，第二次关圈再庆祝一次（Ideas 6）。
   - Done 按 `doneAt` 排序已经是 COL-3，不用再写。
3. **前置：`BoardPage` 让 React Compiler 编译**（tracker › *Components the React Compiler skips*）。它现在每次渲染都重建 context 和所有卡片；后面的阶段会给这一页加很多动画，先修这个。可以单独一个小 PR，也可以并进第 4 阶段。
4. **实现 A · 卡片和点两下完成**（`implement-spec`，mockup 的 K 和 T）：Todo、Done、Backlog 用一套卡片，one-off 的 quadrant 放进 kind line，点一下选中、只有 ✓ Complete 才完成，去掉 undo snackbar。数据层不变。
5. **实现 B · 每天一个圈**（P 和 D）：一天一个圈、按 kind 上色，替掉 points dashboard；点圈打开那天的清单（桌面浮窗、手机 sheet）；Todo 空了显示 COL-5 的 FinishBox。
6. **实现 C · juice、toss 和庆祝**（M 和 C）：完成时随机一种 juice，卡片 toss 进今天的圈，关圈时转一圈加 sparks；全部遵守 reduced motion。

A、B、C 的顺序按依赖排：B 的圈是 C 的 toss 落点，A 的卡片是 B、C 都要用的。每一阶段结束时 board 都能正常用。

## 开放问题 · Questions

1. 这个分法可以吗？还是想把 4、5、6 合成一个大的实现 PR（tracker 现在写的是一个 *Board implementation PR*）？
2. 第 3 阶段（React Compiler）单独一个 PR，还是并进第 4 阶段？
3. 第 1 阶段里 `doneIn`（Done 卡进来的 900ms）不在 motion token 上（150 / 240 / 420ms）。保留 900ms，还是改成 420ms 的 `fx-boot-in`？
4. C 的圈弧画 500ms，也不在 token 上。保留，还是改？
5. D、T、C 的 demo 里卡片离开还是旧的 leave 动画，M 的 toss 已经取代它（表里标了 superseded）。要不要把这三个 demo 也换成 toss，还是留着作为历史？
