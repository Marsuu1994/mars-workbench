# Spike: Projects page 重构 — 组件按 production 需要拆、写入后不再闪旧数据、独立入口

**Status: decided** · 2026-10-12（rev 2 按 owner 第一轮 review 改写；Q1–Q6 和几处 UI 调整都在 PR #59 的 review 里拍板）· 回答 tracker 条目 *Week model Phase 1 › PR 4c*（Plan › Medium）· 针对 PR #58（`claude/week-model-pr4c-projects-page`，未合并）· 上游：`design/spike/week-model-pr4-projects-ui.md`（decided）、`design/spike/board-prop-drilling.md`（C3）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（project / step / this week、`useTransition`、`ProjectsContainer` …），和代码、tracker 一一对应。

## Decision · 拍板（2026-10-12 / 13，PR #59 review）

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · 写入后的空档 | **Option 0，只改 Projects** | Projects 的两个 form、Archive、Delete step 在 transition 里关 modal；matrix 和 plan 的 `TaskModal` 不动 |
| Q2 · modal 的外壳和表单 | **保持拆开，不改** | 拆分的理由和其他建议放进新的 modal spike 当背景（见「给 modal spike 的初步发现」） |
| Q3 · 和 PR #58 的关系 | **M1** | 在 #58 的分支上改完再合 |
| Q4 · AGENTS.md | **试点说明 + production-first 原则** | 在 PR B 里加 |
| 入口顺序 | **Projects 排在 Plan 前面** | dock：Board · Priorities · Projects · Plan · Dump · Settings；sidebar 同序 |
| Step 行 | 改名 **`ProjectStep`**，**去掉行首的状态圆圈** | 这周的 step 靠行的 tint、边框和 pill 表示；done 的 step 标题变淡，右侧显示「✓ 日期」。AGENTS.md 新增一条规则：不可点的状态标记不要长得像控件（这个 PR 已经加了） |
| No projects 空状态 | **和 board 一样的整页空状态** | 问题 4 |
| config-driven modal | **单独开一个 spike** | tracker 加一条，从 state management spike 里拆出来 |
| Q5 · Archive 二次确认（2026-10-13） | **Option C**：armed 时按钮行变成一条确认条 | 复用 `ConfirmButton` 的确认行，抽成 `ConfirmBar`（4.1）；Delete step 不用这个样式，保持现在的 inline confirm |
| Q6 · All steps done banner（2026-10-13） | **D2**：中性提示条 + 绿色 flag + 普通的 Archive 按钮，点一下就 archive，没有二次确认 | `Banner` 加一个中性 tone（4.2） |

全部已拍板。

## 实现入口 · 给做 PR B 的人

在 #58 的分支（`claude/week-model-pr4c-projects-page`）上按这份 spike 重构，按下面的顺序读：

1. 上面的 Decision 表：拍板的结论，以它为准。下文的分析里如果有和它冲突的旧选项，以 Decision 为准。
2. 问题 2（route 和入口）、问题 3（组件结构和 Design Console）、问题 4（review 新增的 UI 调整）、诊断 1 的 Option 0（在 transition 里关 modal）。
3. Executable plan › PR B：commit 的顺序和 Done when。
4. Mockup `design/mockup/future-work/temp-projects-rework-v2.html`：§01 Archive 确认条（Option C）、§02 All steps done（D2）、§03 `ProjectStep`、§04 No projects 空状态、§05 dock 的顺序。照 mockup 实现；做不到的先提出来。实现完删掉这份 mockup，由 scenario 接手。

范围只限 Projects：`TaskModal`、matrix、plan form 的内部都不动。

## rev 2 改了什么

| 主题 | rev 1 | rev 2（owner 第一轮意见） |
| --- | --- | --- |
| 写入 | Projects 页改用 `useOptimistic`，modal 立刻关 | 现在的 UX（按钮 loading 直到成功）保留。真正的问题是 modal 关掉之后旧数据还要停一阵，新数据才出现：根因已经查清并实测过，修法是在 transition 里关 modal（诊断 1、Q1）。`useOptimistic` 挪到新的 state management spike |
| State management | 不引入新库 | 初步评估结论：React Query 值得单独做一个 spike（问题 1）。tracker 加一条，范围包括 server actions 盘点、数据形状转换、`useModal`、URL state |
| Route | 并进 `/kanban/plans`，layout 统一画 header | 不并。Projects 留在 `/kanban/projects`，sidebar 和 dock 各加一个入口；plan form 不动，hub tabs 和 `LinkTabBar` 删掉（问题 2） |
| 选中项 | `?project=` | 保留；URL state 的整体做法放进新 spike |
| 组件 + Design Console | 分两节写；scenario 砍到 4 个 tab | 合成一节（问题 3）。原则按 owner 意见改写：scenario 多少无所谓，代码只按 production 需要设计 |
| AGENTS.md | 全局改写规则 | 只给 Projects 页做试点；全局规则交给新的 component structure spike（tracker 加一条） |
| Auth 提速 | 计划中的 PR A | 已合并（PR #60） |

## TL;DR

| 问题 | 建议 |
| --- | --- |
| modal 关掉之后旧数据还停一阵 | Next 把 action 的返回值放在 response 最前面，整页重新 render 的结果跟在后面。我们的代码一拿到返回值就关 modal，而新数据要等 transition 提交才出现。实测空档约等于 page loader 的耗时。修法：在 `startTransition` 里调 action 和关 modal，modal 关闭和新数据会在同一帧提交，按钮的 loading 一直持续到那一刻。每个 form 改几行就行 |
| 要不要 React Query / Zustand | 初步评估：React Query 有搞头。它能替掉现在每个页面都手写一遍的那套东西（client 副本、同步、乐观更新、回滚、revalidate），`useModal` 也要有它才好做。所以单独开一个 spike；这次 Projects 不做 `useOptimistic` |
| Projects 放在哪 | 留在 `/kanban/projects`；选中项用 `?project=`；sidebar 和 dock 加一个 Projects 入口；plan form 回到 #58 之前的样子 |
| 组件怎么拆 | 只有跨功能复用的纯展示件才做成 presentational component；带状态和动作、只在本页用的组件直接吃 domain 数据。#58 的 18 个组件减到 8 个；专用 banner 改用通用的 `Banner` + `action`；frame 和 view model 树删掉 |
| Design Console | 跟着 production 走：结构上能直接渲染的 tab 都保留，不为 console 加 prop 或拆组件 |
| 怎么落地 | 在 #58 的分支上改完再合并（Q3）；auth 已经单独合并（#60） |

## Trigger · 起因

Owner 对 PR #58（Projects page）的意见，两轮：

1. 页面不复杂，却拆成了 18 个组件，很多拆分只是为了 frame 而 frame，读起来反而更难。
2. 个人项目照大厂实践来做，却没做到克制。要不要引入 state management（Zustand、React Query，或两者组合）？
3. modal 里 submit、按钮 loading，到这里 UX 都没问题；问题出在请求成功、modal 关掉之后，新数据没有马上出现，要等一阵。这一点最恼火。
4. 如果把 React Query 用到所有 feature 上，是不是这些麻烦就都不需要了？想单独开一个 spike 看 state management、server actions 的数量、数据形状转换，以及能不能把所有 modal 收进一个 config driven 的 `useModal`。
5. Projects 暂时不并进 plan route（Phase 2 本来就要大改 plan）。Projects 保留自己的 route，入口放进 sidebar 和 bottom dock；plan form 先不动，link tabs 也不需要。
6. 组件：不为做 dumb component 而硬做。像 step 行这种带丰富状态和动作、只在 Projects 页用的组件，不需要设计成 UI component；值得设计的是纯展示的东西（task card、banner）。像 all-done banner 带 Archive、no-plan banner 带链接这种，用一个通用 banner 加一个可选的 action node 就行。这次只改 Projects，全站的组件结构另开 spike。
7. Design Console 的 scenario 多一点没关系，只是写代码时不要为了方便做 gallery 去设计，要按 production 的需要来。

范围：只改 Projects 页，以及它碰到的导航和 plan form 上 #58 加的那一行 tabs。Board、matrix、plan form 的内部不动；顺带发现的问题记在 *Along the way*。

---

## 诊断 1 · modal 关掉之后，旧数据还停一阵

### 现象

New project / Save project / Add step / Save step：点提交 → 按钮 loading → 请求成功 → modal 关掉 → **列表还是旧的** → 过一阵新数据才出现。

### 根因（读了 Next 16.2.9 和 React 19.2 的源码）

1. 调 Server Action 时，Next 马上执行 `startTransition(() => setState(deferredPromise))`（`app-router-instance.js` 的 `dispatchAction`）。router 的下一个 state 是一个 promise，渲染时用 `use()` 解开，所以页面要等这个 transition 提交才会换成新数据。
2. Server 端先跑 action，再重新 render 当前 route。两者放在同一个 Flight stream 里返回，action 的返回值在最前面的 root row，重新 render 的页面跟在后面，可能还在 stream（Next 文档：*A single response carries data and UI*）。
3. Client 端 `createFromFetch` 读到 root row 就 resolve，接着 reducer 立刻调 `resolve(actionResult)`（`server-action-reducer.js`），这一步发生在新的 router state 算出来之前。
4. 我们的 `await createProjectAction(...)` 在这时返回，接着 `onSaved(); onClose();`。这是普通的 setState（urgent update），会马上提交，于是 modal 立刻消失，列表还是旧的。
5. 等页面剩下的 payload 到齐、render 完，router 的 transition 才提交，新数据这时才出现。

所以空档大约等于「server 重新 render 这一页剩下的时间 + client render」。Projects 页的 loader 是：`getUser()`（PR #60 之后变成本地验签）+ `ensureSynced` + 全量 projects 查询。

### 实测

临时加了一个测试 route（没有提交）：写入 300ms，page loader 700ms；用 Playwright 每帧采样一次 DOM，两种写法各跑两次。

| 写法 | 按钮 loading | modal 关闭 | 新数据出现 | 空档（旧数据露出来的时间） |
| --- | --- | --- | --- | --- |
| 现在：`await` 之后直接 `onClose()` | 点了马上出现 | 402 / 496 ms | 1,066 / 1,160 ms | **664 / 663 ms** |
| 在 transition 里关 modal | 点了马上出现 | 1,051 / 1,067 ms | 同一帧 | **0** |

两种写法里，新数据出现的时刻差不多，所以这个修法不会让写入变快。它只是去掉了「modal 已经关了、列表还是旧的」那一段：loading 一直持续到新数据出现，然后 modal 关闭，列表同时更新。要让这一刻来得更早，靠的是 server 端变快（PR #60），或者以后改成 client cache（问题 1）。

### 修法：在 transition 里关 modal（Option 0）

```tsx
// ProjectFormPanel (StepFormPanel likewise) — useTransition's isPending replaces isSubmitting
const [isPending, startTransition] = useTransition();

const handleSubmit = (event: FormEvent) => {
  event.preventDefault();
  setError(null);
  startTransition(async () => {
    const result = isCreate
      ? await createProjectAction({title, goal})
      : await updateProjectAction(project.id, {title, goal});
    if (result.error) {
      setError(toFormErrorMessage(result.error));
      return;
    }
    // After an await, updates leave the transition unless wrapped again; inside
    // it, the close commits together with the router's re-render.
    startTransition(() => {
      onSaved(result.data.id);
      onClose();
    });
  });
};
```

- **为什么有效**：React 19 在一个 async action 还没完成时，会把这期间开始的所有 transition 放进同一个 lane（react-dom 的 `currentEntangledLane`）。Next 的 router 更新是在我们的 action 里面发起的，所以也在这个 lane 里；这个 lane 要等 action 完成、新页面 render 好，才一起提交。`isPending` 会一直是 true，直到「the final state is shown to the user」（React 文档），正好拿来当按钮的 loading。
- **为什么 `await` 之后还要再包一层**：React 文档写明，`await` 之后的 setState 不算 transition，必须再用 `startTransition` 包一次（*known limitation*）。不包的话，`onClose()` 又会变回立刻提交。
- **改动量**：Projects 的两个 form panel 的 submit，加上 Archive 和 Delete step 这两个 `await` 完就关 modal 的地方。每处改几行，不新增组件。matrix 和 plan 的 `TaskModal` 不动（Q1 拍板）。
- **和以后的方案不冲突**：如果 state spike 选了 React Query，这里会换成 `await mutateAsync()` 加更新 cache；这几行一起删掉就行。

### 其他原因（rev 1 的诊断，仍然成立）

| # | 原因 | 处理 |
| --- | --- | --- |
| 2 | 一次写入的确认，就是在 server 上把整页重新 render 一遍（`revalidatePath`） | 新 spike（问题 1） |
| 3 | Auth 每个请求调 4 次 `getUser()`，每次都走网络 | PR #60：`getClaims()` 本地验签 + `cache()` |
| 4 | Server Actions 在 client 上一次只发一个，连续写入要排队 | 新 spike |
| 5 | 手写的 `useOptimisticTasks` 会闪回：连着点两行的 + This week，第一个 response 带回的 props 会用 `useEffect` 把第二行的乐观更新盖掉 | 新 spike；board 和 matrix 也有同样的问题 |

---

## 诊断 2 · 组件为什么拆了这么多

PR #58 新增的 `domain/projects/` 有 18 个组件（另加 `constants.ts`），共 1,585 行；Design Console 为它新增了 756 行；adapter 和类型 266 行。

| 角色 | 组件 | 为什么存在 |
| --- | --- | --- |
| screen | `ProjectsScreen` | AGENTS › *Screen components*：route 和 scenario 要渲染同一个 screen。可 container 本来就只吃 props，scenario 直接渲染它也不会漂移 |
| container | `ProjectsContainer`（397 行） | 管状态和写入，所有 render 函数也在这里 |
| frame（只接收 `ReactNode` 插槽） | `ProjectsPanes`、`ProjectList`、`ProjectDetail`、`ProjectStepList` | AGENTS › Layers 要求 container「renders the result into layout frames through `children`」。`ProjectDetail` 有 6 个插槽：读 container 只看到在给插槽接线，读 frame 又看不到内容 |
| wrapper | `DraggableStepRow`、`ProjectModal`、`StepModal` | dnd 的 render prop；modal 外壳 |
| 只用一次的小件 | `ProjectsHeader`、`ProjectDetailHeader`、`NoActivePlanBanner`、`AllStepsDoneBanner`、`ArchivedProjectRow` | 26 到 51 行 |
| 有内容的 | `ProjectListItem`、`ProjectStepRow`、`ProjectFormPanel`、`StepFormPanel` | 有自己的逻辑或状态 |

再加上 `toProjectsView` 那棵 view model 树（`ProjectsView` → `ProjectSummary` / `ProjectDetailModel` → `ProjectHeaderModel` / `ProjectStepRowModel` union），想知道「点了 + This week 之后发生了什么」，要依次经过：`ProjectStepRow` → `DraggableStepRow` → `ProjectsContainer.renderPath` → `handleSchedule` → `useOptimisticTasks` → `toProjectsView` → `toProjectDetail` → `toStepRow` → 回到 `ProjectStepRow`。一共 8 跳，横跨 4 个文件。

根子在规则：AGENTS.md 里有几条规则，原本是为 board（树很深，真有 prop drilling）和 Design Console 定的，结果变成了每个页面的默认做法。Projects 页的树只有两层。

---

## 开源项目参考

| 项目 | 栈 | Server state | Client state | 页面怎么组织 | 写入 |
| --- | --- | --- | --- | --- | --- |
| **Kan**（kanbn/kan，开源 Trello） | Next 15 · tRPC · Drizzle | TanStack Query（经 tRPC） | React state；`providers/modal.tsx` 是一个全局 modal 栈（`openModal(contentType, entityId)`），modal 只拿 id | `views/board/index.tsx` 一个文件 1,097 行；`components/` 下 23 个文件 | `onMutate` 里 `setData` 乐观更新，`onError` 回滚，`onSettled` invalidate；表单**先关 modal 再 `mutate`** |
| **Midday**（财务 SaaS） | Next 16 · tRPC | TanStack Query：page 在 server 上 prefetch，`HydrateClient` 交给 client | Zustand 只存 UI 状态（选中的行、表格列、筛选）；选中项和打开的 sheet 用 `nuqs` 放进 URL（`?customerId=`、`?createCustomer=`） | `components/` 平铺几百个文件，按功能命名 | mutation 之后 invalidate |
| **Dub** | Next 15 | SWR | — | — | `next-safe-action`，然后调 SWR 的 `mutate` |
| **Vercel Commerce** | Next · RSC | Server Components | — | — | Server Action 配 `useOptimistic` + reducer |

观点类：

- **Dan Abramov**（container / presentational 模式的提出者）2019 年在原文开头加的更新：*"I don't suggest splitting your components like this anymore. … I've seen it enforced without any necessity and with almost dogmatic fervor far too many times."*
- **TkDodo**（React Query maintainer），*You Might Not Need React Query*：数据全在 Next 这类框架的 server 上取的新 app，*"You probably don't need React Query"*；它的价值在 client 端的异步状态。
- **Next.js 文档**：Server Action 的 response 同时带着结果和整页新 UI；一次只发一个 action；不要用 Server Action 读数据。

---

## 问题 1 · State management：初步评估 → 单独开 spike

### 初步评估：React Query 有没有搞头

| 关注点 | 现在（每个页面各写一遍） | 用 React Query 之后 |
| --- | --- | --- |
| 读 | server component 取数据，作为 props 往下传 | page 在 server 上 prefetch，再 `useQuery`；或者 client 直接 `useQuery`（需要 GET Route Handler） |
| 页面里的 client 副本 | `useOptimisticTasks` + `useEffect` 同步（board、matrix、projects 各一份） | query cache 就是唯一的副本 |
| 写入后怎么更新 | `revalidatePath` → server 把整页重新 render | 用 mutation 返回的行 `setQueryData`，或者 `invalidateQueries` 只重取相关的 query |
| 乐观更新、回滚 | 每个页面手写 | `onMutate` / `onError` / `onSettled`，官方模式 |
| modal 关了才更新 | 要自己处理 transition（诊断 1） | `await mutateAsync()` 之后 cache 已经是新的，再关 modal |
| 跨页面一致 | 下次导航时重新取 | 改了 step，board 的 query 被 invalidate；回到 board 先显示缓存，同时在后台刷新 |
| MCP 从外面写入 | 下次导航才看得到 | 切回窗口自动 refetch（`refetchOnWindowFocus`） |
| server → UI 形状 | adapter + `useMemo`（`toBoardCards`、`toProjectsView`） | `select`：cache 存 server 形状，`select` 派生 UI 形状。思路和现在一样，只是有了官方的位置 |
| UI → server | 每个 handler 自己拼参数 | mutation variables 的类型，加上共用的 zod schema |
| 代价 | — | 多一个依赖（约 13 kB gz）；读要新写 GET Route Handler（Server Action 是 POST 且串行，不适合读）；每个 GET 也要跑 `ensureSynced`；要配 `QueryClientProvider` 和 hydration；全站迁移是一个多 PR 的项目 |

**结论：有搞头。** 它替掉的正好是现在每个页面都要重复手写的那一套，而 `useModal` 也要有它才好做（见下）。所以这次 Projects 不做 `useOptimistic`，写入的 UX 保持现状，只修诊断 1 的空档（Q1）。

Zustand：在参考项目里只用来存跨组件共享的 UI 状态（选中项、筛选条件、modal 栈）。如果 `useModal` 的状态要做成全局，Zustand 是候选之一，另一个候选是 URL query params。

### 新 spike 的范围（加进 tracker）

1. **React Query 和 / 或 Zustand**：怎么选型；和 RSC 怎么分工（哪些页面保持 server render，哪些改用 client cache）；迁移顺序。
2. **Server actions 盘点**：main 上有 35 个 action，其中 7 个其实是读（`fetchBoardAction`、`getEmptyBoardStateAction`、`fetchPriorityMatrixAction`、`fetchDumpEntriesAction`、`getTemplateStatsAction`、`getActiveAiChatAction`、`getConsentRequestAction`），#58 还会再加一个 `fetchProjectsPageAction`。读改成 query，去掉不必要的 action。和已有的 *Spike: shared server-action handler* 一起看。
3. **形状转换**：server → UI（`select` 或 adapter）、UI → server（mutation input），按 fetch 和 mutate 的 use case 各举例子。
4. **`useModal`**：owner review 之后拆成单独的 spike（见「给 modal spike 的初步发现」）。这里只看它和 client cache 的关系：modal 只拿 id、自己从 cache 读数据，要有 client cache 才好做。
5. **URL query params 做 state**：选中项（Projects 的 `?project=` 是第一个例子）、打开的 modal（Midday 的 `?createCustomer=`）、筛选条件。分析哪些适合放进 URL（可以分享、刷新后保留、后退能撤销），哪些不适合。

rev 1 里 `useOptimistic` 的设计稿留在文末附录，作为新 spike 的候选方案之一。

---

## 问题 2 · Projects 的入口和 route

- **Route**：留在 `/kanban/projects`。选中的 project 用 `?project=<id>` 表示，取代 `/kanban/projects/[id]`：`ProjectsPage` 用 `useSearchParams().get('project')` 读，用 `window.history.pushState` 改（Next 已经把 pushState 接进了 router，`useSearchParams` 会跟着变，但不会请求 server）。
  - Mobile：URL 里有 `project` 就只显示 detail，没有就只显示列表。进 detail、点「‹ All projects」、浏览器后退，都在 client 端瞬间完成，不再有整页 render 和 skeleton。
  - Desktop：URL 里没有 `project` 时选中第一个 active project；刷新后选中项保留；后退会回到上一个选中的 project。
  - 可以删掉的：`[id]` route、`ProjectsScreen` 用 `key` 强制 remount 的写法、`ProjectListItem` 里按断点 `preventDefault` 的分支、两处 `router.push`。
- **入口**：sidebar 加一个「Projects」，dock 加一个 tab。图标用 `MapIcon`（project kind 的图标）。dock 从 5 个 tab 变成 6 个：Board · Priorities · Projects · Plan · Dump · Settings。Projects 排在 Plan 前面，sidebar 也是这个顺序（拍板）。
- **Plan form 回到 #58 之前的样子**：`PlanChrome` 去掉 tabs 那一行；Plan 导航只在 `/kanban/plans` 下高亮。删掉 `PlanHubTabs`、`isPlanHubPath`，以及 PR 4b 加的 `LinkTabBar`（之后没有别的地方用，连同它的 gallery 条目一起删）。tracker 里「Explore entry points for habits and projects」的 projects 部分就算有了答案。
- **Header**：Projects 页自己的 header，「Projects」+「+ New project」（desktop）。不再显示「Plan」和周，因为这里已经不是 Plan hub 的一个 tab 了。
- **数据**：`fetchProjectsPage` 不变（`ensureSynced` + projects + steps + `activePlanId`）；page 直接调 service，删掉把 action 当 loader 用的 `fetchProjectsPageAction`。

---

## 问题 3 · 组件结构和 Design Console

### 原则（owner rev 2 意见）

1. **只有纯展示、跨功能复用的组件，才设计成 presentational component**：`TaskCard`、`Banner`、`Pill`、`ProgressBar`、`SizeChip`……它们只吃数据，不知道有什么 action。
2. **带丰富状态和动作、只在一个页面用的组件是 feature component**：直接吃 domain 数据（`TaskItem`、`ProjectItem`），自己算显示状态；不为它设计 view model 类型，也不硬拆成「dumb 组件 + container」。step 行就是这种。
3. **专用的 banner 不单独做成组件**：通用的 `Banner` 已经有 `action?: ReactNode`，All steps done（带 Archive）、No plan（带 Create plan 链接）都在用的地方直接写。
4. **不写只接收 `ReactNode` 插槽的 frame。**
5. **Design Console 跟着 production 走，不反过来**：scenario 多少无所谓；代码结构只按 production 的需要设计。production 的结构能直接渲染的状态就做成 tab，渲染不了的就不做，不为 console 加 prop、拆组件。
6. **范围**：这次只改 Projects；全站的组件结构交给新的 component structure spike（tracker）。

### 逐个组件：怎么处理，Design Console 跟着怎么变

| #58 的组件 | rev 2 | 理由 | Design Console |
| --- | --- | --- | --- |
| `ProjectsScreen` | 删掉；route 和 scenario 都直接渲染 `ProjectsPage` | 只包了一层 `div` 和 `key` | scenario 改为渲染 `ProjectsPage` |
| `ProjectsContainer` | 改名 `ProjectsPage`（client），吸收 `ProjectsPanes` 和 header | 状态和写入的唯一 owner | — |
| `ProjectsHeader` | 并进 `ProjectsPage`（「Projects」+「+ New project」），hub tabs 删掉 | 只用一次，没有状态 | 删掉它的 gallery 条目 |
| `ProjectsPanes` | 并进 `ProjectsPage` | 纯 frame | — |
| `ProjectList` + `ProjectListItem` + `ArchivedProjectRow` | `ProjectList.tsx` 一个文件：接收 `projects`、`steps`、`activePlanId`、`selectedProjectId` 和几个 handler，卡片和 archived 行写成文件内部的小组件 | 只在列表里用；卡片的摘要（`summarizeProject`）就地算 | `ProjectListItem`、`ArchivedProjectRow` 的 gallery 条目删掉，整页 tab 里都看得到 |
| `ProjectDetail` + `ProjectDetailHeader` + `ProjectStepList` + `DraggableStepRow` + 两个 banner | `ProjectDetail.tsx` 一个文件：接收 `project`、`steps`、`activePlanId` 和 handler；自己渲染 header、两个 `<Banner action=…>`、可拖动的 step 列表、「+ Add step」 | frame 和只用一次的小件；banner 按原则 3 处理 | 整页 tab 覆盖 |
| `ProjectStepRow` | 改名 `ProjectStep.tsx`，保留单独一个文件：接收 `step`（`TaskItem`）、`activePlanId` 和 handler，用 `getStepState` 自己算状态；去掉行首的状态圆圈（问题 4） | 状态多，done 行和 open 行都用它；按原则 2，吃 domain 数据而不是 `ProjectStepRowModel` | gallery 条目保留：production 的形状能直接用 `TaskItem` fixture 渲染 |
| `ProjectFormPanel` + `ProjectModal`、`StepFormPanel` + `StepModal` | 保持外壳和表单分开（Q2 拍板：不改） | 表单是真正的单元（状态 + submit）；外壳只在打开时 mount 表单，每次打开都是新表单，这本来就需要一个内层组件；和 app 里其他 modal（`TaskModal`、`ReviewChangesModal`、`SettingsSheet`）一致 | modal 的 scenario tab 跟着保留 |
| `toProjectsView` 和 view model 类型（`projectViewUtils.ts`） | 删掉；`utils/projectUtils.ts` 加 `getStepState`、`summarizeProject`、`groupStepsByProjectId` 这几个纯函数 | 组件直接吃 domain 行 | fixture 不变 |
| `useOptimisticTasks`（+ This week、×、reorder） | 这次不动 | 等 state spike 一起决定 | — |

结果：18 个组件减到 8 个：4 个页面组件（`ProjectsPage`、`ProjectList`、`ProjectDetail`、`ProjectStep`），加两对 modal 的外壳和表单；另加 `constants.ts`。

### Design Console 改完是什么样

- **Projects scenario**：整页 tab 保留 6 个（No projects · Projects · All steps done · All steps done · archive armed · No plan this week · Between weeks），modal tab 保留 6 个。选中哪个 project 靠 fixture 的顺序控制：把要展示的 project 放在第一个 active project 的位置，production 代码不用改。
- **少掉的一个 tab**：「Project open（/[id]）」，也就是 mobile 的 detail。现在它由 URL 的 `?project=` 决定，console 里没法 pin（多个 tab 共用一个 URL），所以不做。desktop 那边的 detail 在其他 tab 里都看得到。
- **Gallery**：删掉 `ProjectsHeader`、`ProjectListItem`、`ArchivedProjectRow`、`PlanHubTabs`、`LinkTabBar`（这几个组件不存在了）；`ProjectStep` 保留，改用 `TaskItem` fixture。
- **plan scenario**：去掉 tabs 那一行。

### AGENTS.md：只做试点，不改全局规则

全局怎么拆交给新的 component structure spike。这次只在 AGENTS.md 里加两处：

1. 在 Layers › *Server shapes inputs* 和 UI Workflow › *Screen components* 下面各加一句：Projects 页是轻量结构的试点（不要求 frame、screen 层和 view model，见这份 spike），全站规则由 component structure spike 决定。
2. 在 UI Workflow 里加一条原则（原则 5）：production 结构优先，Design Console 跟着适配；不为 console 拆组件、加 prop。

---

## 问题 4 · Review 新增的 UI 调整

都画在了 mockup `design/mockup/future-work/temp-projects-rework-v2.html` 里，三个主题都能切换。PR B 实现之后删掉这份 mockup，由 scenario 接手。

### 4.1 Archive 二次确认：Option C（§01，Q5 已拍板）

原来的问题：点了 Archive 之后，按钮变成实心的「Archive?」，旁边多一行两行高的说明，在 512px 宽的 modal 里把 Cancel / Save 挤歪了。比较过三个方案（说明单独一行放在按钮下面 / 表单和按钮行之间加红色 banner / 按钮行变成确认条），owner 选了 **C**。

- **样子**：平时 footer 不变，红色描边的 Archive 在左，Cancel / Save 在右。点了 Archive 之后，整个按钮行换成一条确认条：archive 图标 +「Archive Biomedical course?」，下面一行小字「It moves to Archived; its unfinished steps leave this week.」，右侧是 **Keep**（回到原来的 footer）和 **Archive**（执行）。确认条显示期间，Cancel / Save 先收起来。手机上 Keep / Archive 换到文字下面一行，靠右。
- **不是新 pattern**：这条确认条就是 `ConfirmButton` 的确认状态（Settings 的 sign out 已经在用）：错误色边框和底色、图标 + 提示、Cancel + Confirm 两个小按钮。
- **怎么做（不麻烦）**：
  1. 把 `ConfirmButton` 的确认行抽成 `ui/ConfirmBar`（`icon` · `prompt` · `cancelLabel` · `confirmLabel` · `onCancel` · `onConfirm` · `isPending`）；`ConfirmButton` 改成「平时的整行按钮 + `ConfirmBar`」，Settings 看起来完全不变。
  2. `ProjectFormPanel` 加一个 `isArchiveArmed` state：没 armed 时渲染 `ModalFormFooter`，`leading` 是一个普通的红色描边「Archive」按钮（点了只做 arm）；armed 时把 footer 换成 `ConfirmBar`，archive 失败时，错误提示（`FormErrorAlert`）显示在确认条上面。Archive 照样走 Option 0（在 transition 里关 modal）。
  3. 改动大约 3 个文件，新增的代码大多是从 `ConfirmButton` 挪过来的。
- **Delete step 不用这个样式**：保持现在的 inline confirm（「Delete step」→ 实心「Delete step?」→ 再点一次删除），不加说明。
- **`InlineConfirmButton` 变简单**：Edit Project 不再用它，All steps done banner 也不再用它（4.2），只剩 Delete step 在用，而 Delete step 不需要 `hint`、`hintSide`、`size`，这三个 prop 删掉。`Banner` 不需要新增 `error` tone。
- **Design Console**：「Edit project · archive armed」tab 的 `play` 点的还是 Archive，看到的是确认条；gallery 加一个 `ConfirmBar`，`ConfirmButton` 的条目不变。

### 4.2 All steps done banner：D2（§02，Q6 已拍板）

这里 archive 是预期中的下一步，而且可以撤回（列表里能 Unarchive），所以**点一下就 archive**，不做二次确认。绿色底配红色按钮很难看，三个设计都去掉了这个组合，区别在于这一刻要多显眼：

| 设计 | 做法 | Pros | Cons |
| --- | --- | --- | --- |
| D1 | 保留绿色 banner，按钮换成普通的描边「Archive」 | 改动最小；仍然有完成的庆祝感 | 一整块绿底，表达的状态在列表卡片和进度条上已经有了 |
| **D2 ✓ 选定** | 安静的提示条：底色和周围卡片一样，只有 flag 图标是绿色；粗体「All steps done」+ 说明 + 普通的描边「Archive」 | 放在 step 列表旁边不抢眼，读起来是「下一步」而不是警告；就是 `Banner` 的布局（图标 · 文字 · action），不用加新 tone | 庆祝感比 D1 弱 |
| D3 | 不要 banner：进度那行变成「✓ All steps done」pill，Archive 放进 header，和 Edit 并排 | 不多一块东西 | 少了「加下一批 step，或者 archive」的提示，看不出下一步该做什么；Archive 只在全部做完时出现，header 的形状会变 |

实现（D2）：`ProjectDetail` 里直接写 `<Banner icon={<FlagIcon …/>} action={<button …>Archive</button>}>`，`Banner` 需要一个中性的 tone（现在只有 secondary / success / warning）。D1 不用改 `Banner`。

### 4.3 `ProjectStep`：去掉状态圆圈（§03，已定）

行首的圆圈看起来像 checkbox 或 radio，好像能点，其实只是把行里已经写着的信息又说了一遍。改成：

- 这周的 step：靠 project 色的 tint、边框和「This week · todo / backlog」pill 表示；
- done 的 step：标题变淡，右侧显示「✓ Mon, Oct 5」，这里的 ✓ 只是文字前的一个字形，不是控件；
- last week、upcoming：不变（pill，或者 size + 「+ This week」）。

grid 少一列（`16px 26px 1fr auto`）。新规则已经写进 AGENTS.md › JSX & components：*Status marks must not look like controls*。

### 4.4 No projects：和 board 一样的整页空状态（§04，已定）

原来虚线框的 inline 空状态对整个页面来说太小。改成和 `EmptyBoard` 一样的 `EmptyState`（page variant）：大号的淡色 `MapIcon`、24px 的标题、说明文字、一个发光的「New project」，以及「or ask Claude to draft one」那行小字，铺满 header 下面的整块区域。页面为空时，header 里的「New project」隐藏，页面上只留一个入口。detail 栏里的「No steps yet」「No active projects」是页面中的一节，仍然用 inline variant。

### 4.5 Dock 和 sidebar 的顺序（§05，已定）

Board · Priorities · Projects · Plan · Dump · Settings。375px 宽时 6 个 tab 每个约 62px，10px 的标签放得下；实现时再截图确认一次。

---

## 给 config-driven modal spike 的初步发现

owner review 时提出：所有 modal 都是同一个模式——表单输入 → server action → transition → 关闭——能不能收进一个 `useModal`，用 config 映射不同的 modal？这件事单独开一个 spike（tracker），下面是这份 spike 里已经发现的东西，供它当背景。

**现有的 modal 和 sheet**（共 8 个；加上 #58 的两个）

| 组件 | 类型 | 在哪 | 和表单 modal 同一个模式吗 |
| --- | --- | --- | --- |
| `TaskModal`（3 种 mode：New / Edit template、Add priority task） | 表单 | plan form、priorities | 是 |
| `ProjectModal`、`StepModal`（#58） | 表单，带 Archive / Delete 的二次确认 | Projects | 是 |
| `ReviewChangesModal` | 提交 plan 前的确认 | plan form | 部分：确认之后由 `PlanForm` 提交并跳转 |
| `AiPlanChatModal` | 聊天 | plan form | 否 |
| `SettingsSheet` | 设置 | 全局 | 否 |
| `MobileBacklog`、`MobileMoveToSheet` | 移动端 sheet | board、priorities | 否 |

**三个表单 modal 共用的流程**：打开时带一个 target（mode + 对象）→ 每次打开都 mount 一个新表单 → client 校验（title 必填）→ 调 server action → 失败时在 footer 显示 `FormErrorAlert`，成功时关 modal，再执行一个回调（选中新建的项、导航）→ 破坏性操作走 inline 二次确认，之后走同一条 submit 路径。

**可以抽成 hook 的核心**：诊断 1 的 Option 0 正好是每个表单都要的那一段，可以写成一个 hook：

```ts
const {isPending, error, submit} = useModalSubmit({
  action: values => createProjectAction(values),
  onSuccess: project => select(project.id), // runs in the same transition as the close
});
```

每个 modal 的 config 只需要声明：标题、字段、zod schema、action、成功之后做什么。

**Q2 的背景（外壳和表单为什么分开）**：每次打开都要一个新表单，所以外壳只在打开时 mount 内层；表单是有状态的那一块；scenario 要在 frame 里内联渲染表单（真的 `<dialog>` 会跳出 frame 的裁剪）。如果做成全局的 modal host，这个拆分正好对得上：外壳只有一份（host），各个表单 panel 就是 registry 的条目。

**全局 host 需要按 id 拿数据**：Kan 的 `providers/modal.tsx` 是一个 modal 栈（`openModal(contentType, entityId)`），modal 用 React Query 按 id 读数据；Midday 把打开的 sheet 放在 URL 里（`?createCustomer=true`）。如果还是用 server props，全局 host 拿不到页面上的数据，只能把数据塞进 payload。所以这个 spike 要和 state management spike 一起看。

**留给这个 spike 的问题**：registry 的类型（key → payload 类型的映射）；打开状态放在哪（Zustand、context，还是 URL）；成功之后的动作（选中、导航、toast）怎么声明；非表单的 modal（聊天、设置、sheet）算不算在内；Design Console 怎么用 fixture 内联渲染 registry 里的 panel。另外，`TaskModal` 现在还有「关了才更新」的空档（owner 决定这次不动），这个 hook 落地后可以一次修掉所有表单 modal。

---

## 待拍板 · Open questions

| # | 问题 | 选项 | 推荐 |
| --- | --- | --- | --- |
| Q1 ✓ | 写入后的空档 | **Option 0**：Projects 的两个 form、Archive、Delete step 改成在 transition 里关 modal · 保持现状，等 state spike | **Option 0**（已拍板，只改 Projects） |
| Q2 ✓ | modal 的外壳和表单 | 保持拆开（scenario tab 跟着保留）· 合成一个文件，表单写成内部组件（modal tab 就没有了） | **保持拆开**（已拍板；建议放进 modal spike） |
| Q3 ✓ | 和 PR #58 的关系 | M1：在 #58 的分支上改完再合 · M2：先合 #58，再开重构 PR | **M1**（已拍板） |
| Q4 ✓ | AGENTS.md | 试点说明 + production-first 原则 · 现在就全局改写规则 · 什么都不加 | **试点说明 + 原则**（已拍板） |
| Q5 ✓ | Archive 二次确认的说明放在哪 | A 按钮行下面一行 · B 表单和按钮行之间的红色 banner · C 按钮行变成确认条（mockup §01） | 我推荐的是 B，owner 选了 **C**（已拍板；复用 `ConfirmButton` 的确认行） |
| Q6 ✓ | All steps done banner | D1 绿色 banner + 普通按钮 · D2 中性提示条 + 绿色 flag + 普通按钮 · D3 不要 banner，Archive 放进 header（mockup §02） | **D2**（已拍板） |

默认做法：dock 变成 6 个 tab，Projects 排在 Plan 前面（已拍板）；Projects header 只有「Projects」+「+ New project」，页面为空时 header 不放按钮；`LinkTabBar` 删掉。

---

## Executable plan

每一步都要：`tsc`、`lint`、`format:check`、`check:themes`、`build` 全部通过；改写 README 的 Current State，追加 Update Log；在 tracker 里删掉已经落地的 sub-bullet。不涉及 migration。

### PR A — Auth 提速 ✓ 已合并（#60）

`getClaims()` 本地验签 + `cache()`。用本地脚本验证过：`getUser()` 每次调用都请求一次 `/auth/v1/user`；`getClaims()` 在 JWKS 缓存后不发请求。

### PR B — Projects 页重构（Q3 选 M1 时，直接在 #58 的分支上做，按下面的 commit 顺序）

1. **Route 和入口**：删掉 `/[id]`，改用 `?project=`；sidebar 和 dock 加 Projects；`PlanChrome` 去掉 tabs 那一行；删掉 `PlanHubTabs`、`LinkTabBar`、`isPlanHubPath`；page 直接调 service，删掉 `fetchProjectsPageAction`。
2. **组件**：按「逐个组件」那张表合并；删掉 `projectViewUtils.ts`，在 `projectUtils.ts` 加纯函数。
3. **写入后的空档**（Q1）：两个 form panel 的 `isSubmitting` 换成 `useTransition`，在 transition 里关 modal；Archive 和 Delete step 同样处理。`TaskModal` 不动。
4. **Review 新增的 UI 调整**（问题 4）：Edit Project 的 Archive 用确认条（抽出 `ConfirmBar`，`ConfirmButton` 改用它）；All steps done banner 用 D2（`Banner` 加中性 tone、`FlagIcon`、普通的 Archive 按钮，点一下就 archive）；`InlineConfirmButton` 删掉 `hint` / `hintSide` / `size`；`ProjectStep` 去掉状态圆圈；No projects 改成整页空状态；dock 和 sidebar 的顺序。做完删掉 `temp-projects-rework-v2.html`。
5. **Design Console**：scenario 改为渲染 `ProjectsPage`，调整 fixture 的顺序；删掉已经不存在的组件的 gallery 条目；plan scenario 去掉 tabs 那一行。
6. **AGENTS.md**：试点说明 + 原则（Q4）。
7. **Done when**：
   - New / Edit project、Add / Edit step：按钮 loading 一直持续到新数据出现，modal 关闭和列表更新在同一刻，中间看不到旧数据；Archive、Delete step 同样；
   - Mobile：从列表进 detail、再后退，都不请求 server（Network 面板里没有 RSC 请求）；desktop 刷新后选中项保留；
   - sidebar 和 dock 的 Projects 在 `/kanban/projects` 下高亮，Plan 只在 `/kanban/plans` 下高亮；dock 在 375px 宽度下截图看过，6 个 tab 不挤；
   - plan form 和 #58 之前一样（截图对比）；
   - Edit project 点 Archive 之后，按钮行换成确认条，Keep 能回到原来的 footer；Settings 的 sign out 看起来没变；All steps done banner 点一下就 archive（三个主题，desktop 和 mobile 宽度各截图）；step 行没有状态圆圈；没有 project 时是整页空状态；
   - `domain/projects/` 有 8 个组件，另加 `constants.ts`。

### 这个 spike PR 自己要改的 tracker

- PR 4c 那一行：链接这份 spike（rev 2）。
- Cross-cutting 加三条 spike：state management（React Query / Zustand、actions 盘点、形状转换、URL state）；config-driven modal（`useModal`，背景见上文）；component structure（全站重新评估，Projects 是试点）。
- AGENTS.md › JSX & components 加一条规则：*Status marks must not look like controls*（这个 PR 已经加了）。
- 「Explore entry points for habits and projects」：projects 已经决定有自己的入口，这一条只剩 habits。

---

## 风险

- **dock 6 个 tab**：375px 宽时每个约 62px，`fx-display` 的标签可能挤。实现时截图确认，必要时缩小标签字号。
- **Option 0 依赖 React 19 的 lane 合并，以及 Next 在 action 内部发起 router 更新**：在 Next 16.2.9 和 React 19.2 上实测过；升级之后要重新确认（已写进 Done when）。
- **loading 时间变长**：按钮会一直转到新数据出现，慢的页面可能超过 1 秒；PR #60 会缩短这段时间。时间本身没变，只是不再先关 modal。
- **`useOptimisticTasks` 的闪回还在**（+ This week 连点时），等 state spike。
- **`useSearchParams` 和静态渲染**：如果 Design Console 的 scenario 页是静态渲染的，用了 `useSearchParams` 的组件要包在 `Suspense` 里。

## Along the way · 范围外的发现

- **同样的空档在 app 里的其他 modal 也有**：`TaskModalPanel`（plan form 的 New / Edit template、priorities 的 Add task）也是 `await` action 之后直接 `onClose()`。owner 决定这次不动，交给 modal spike。
- **Board 和 matrix 的 `useOptimisticTasks` 也会闪回**（诊断 1 第 5 条），放进 state spike。
- **Root layout 的 `getActivePlan` 没经过 `ensureSynced`**：跨周那天，侧栏的 Plan 链接可能还指向已经结束的 plan，要等下一次请求才更新。

## Considered, not proposed · 考虑过但不提议

- **Projects 并进 `/kanban/plans`，由 layout 统一 header**（rev 1）：owner 决定推迟，Phase 2 本来就要重写 plan。留给 Phase 2 的笔记：Next 的 layout 不能把数据传给 page（*Layouts cannot pass data to their children*），要让 layout 和 page 调同一个 `cache()` 过的 loader；layout 在同一个 layout 下的导航之间不会重新 render。
- **这次就上 `useOptimistic`**（rev 1 的 Option A）：交给 state spike，和 React Query 一起比较。
- **Zustand 存 projects 数据**：等于手写一个 server state cache，参考项目里没人这么用。
- **`nuqs`**：只有一个 `?project=`，`useSearchParams` 加 `pushState` 就够了；URL state 的整体做法放进新 spike。

## 附录 · rev 1 的 `useOptimistic` 设计（给 state spike 参考）

- 一个 reducer `applyProjectsChange(state, change)`，覆盖 10 种写入（create / update / archive / unarchive project，add / update / delete / schedule / unschedule / reorder step）。规则和 server 一致：archive 时未完成的 step `planId = null`；删 step 后面的编号减一；reorder 用 `assignStepNumbers`；size 变了用 `sizeToPoints` 重算 points。
- `useOptimistic({projects, steps}, applyProjectsChange)`，base 就是 server props，不复制，不用 `useEffect`；transition 期间 base 变了，React 会重放还没完成的 change，所以连点不闪回。
- modal 先用共用的 zod schema 在 client 校验，通过了再关；关 modal 的 setState 要放在 `startTransition` 外面，否则它会等 action 完成。
- 新建的行用 client 生成的 UUID（`crypto.randomUUID()`）传给 action，乐观显示的行就是最终的行，不需要临时 id。
- 失败时乐观结果自动消失，弹一个 error toast；pending 的判断是「在乐观 state 里、还不在 server props 里」。

## Sources

- Next.js — [Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions)（*Sequential dispatch on the client*、*A single response carries data and UI*）
- Next.js 16.2.9 源码 — `dist/client/components/app-router-instance.js`（`dispatchAction`：`startTransition(() => setState(deferredPromise))`）、`dist/client/components/router-reducer/reducers/server-action-reducer.js`（`resolve(actionResult)` 在算出新 state 之前）
- React — [useTransition](https://react.dev/reference/react/useTransition)（`await` 之后要再包一层 `startTransition`；`isPending` 持续到 final state 显示）、[useOptimistic](https://react.dev/reference/react/useOptimistic)；react-dom 19.2 源码 `requestTransitionLane` / `entangleAsyncAction`（async action 期间的 transition 共用一个 lane）
- Next.js — [layout.js › Caveats](https://nextjs.org/docs/app/api-reference/file-conventions/layout)、[Linking and Navigating › Native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- Supabase — [Server-side auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)、[auth.getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims)
- TkDodo — [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query)
- Dan Abramov — [Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
- TanStack Query — [Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)、[Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- 代码：[kanbn/kan](https://github.com/kanbn/kan)（`apps/web/src/views/board/`、`providers/modal.tsx`）、[midday-ai/midday](https://github.com/midday-ai/midday)（`apps/dashboard/src/store/`、`hooks/use-customer-params.ts`）、[dubinc/dub](https://github.com/dubinc/dub)、[vercel/commerce](https://github.com/vercel/commerce)（`components/cart/cart-context.tsx`）
