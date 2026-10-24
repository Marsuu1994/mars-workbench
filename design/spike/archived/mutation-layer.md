# Spike: Mutation layer — 保留 RSC 刷新、不引入 client cache，先压缩往返

**Status: decided** · 2026-10-23（owner 在 PR #80 拍板：Q6–Q8 在第一轮 review 里答，Q6a 和其余问题随后在对话里答；同一个 PR 实施并归档；2026-10-24 应 owner 要求追记原生 hook 实测、Next 的首写 bug 和升级到 16.4.3 的结果，见「追记」）· 回答 tracker 条目 *Quality gate › Step 7 — Mutation layer › State management* · 上游：`archived/projects-page-refactor.md`（React Query 初步评估、close-then-stale 根因）、`archived/board-prop-drilling.md`（`useOptimisticTasks` 的来历）、`archived/agents-md-simplification.md`（Q4：*Server shapes inputs* 的 pending 一半）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（board / step / one-off、`revalidatePath`、`staleTimes`、`useOptimisticTasks` …），和代码、tracker 一一对应。

本稿只覆盖 Step 7 的第一个话题 State management；另外两个话题（shared server-action handler、error-handling plumbing）各自单独做（Q8）。

## Decision · 拍板（2026-10-23，PR #80）

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · 方向 | **Option A** | 不引入 React Query / Zustand / Jotai；写入继续 `revalidatePath`，压缩往返 |
| Q2 · `staleTimes` | **`dynamic: 60`，不加 focus refresh** | 回到 60 秒内去过的页面直接用缓存；外部写入最多晚 60 秒可见 |
| Q3 · Close-then-stale | **(c) 新数据到了再关** | 一个共用的 `useModalSubmit`，覆盖 close-then-stale 一节表里的所有入口 |
| Q4 · 首次访问的 300 ms 下限 | **压缩往返之后再量再定** | 这次不动 `loading.tsx`；量完的数字进 PR，下限的去留作为 tracker 条目 |
| Q5 · Plan form | **都做** | 存 template 后去掉 `router.refresh()`；plan 提交改成在 action 里 `redirect` |
| Q6 · 读 action | **保留**：UI 和 server 之间要有清晰的一层 | 不改 |
| Q6a · 绕过 action 的页面 | **都改成走 action，并定为 agent 必须遵守的规则** | Projects、Dump、plan form 的两个页面和 root layout 都经 action 读数据；ESLint 禁止 `src/app/` 的页面和 layout 引入 service、DAL、Prisma 和 auth helper，AGENTS.md › Layers 加一行 |
| Q7 · 落地方式 | **Option A 全部在本 PR 里做** | — |
| Q8 · Step 7 的另外两个话题 | **各自单独** | tracker 的 Step 7 改成一个话题一个 spike、一个 PR |

## 追记 · 2026-10-24：原生 hook 实测，Next 的首写 bug

拍板之后 owner 又问了两件事，要求结果记进本 spike：`useOptimisticTasks` 能不能换成原生 `useOptimistic`（先实测再改）；`revalidateTag` 能不能做到改 project 而不动 kanban。

**`revalidateTag`：不做（owner 拍板）。** 我们的读取都是不缓存的 Prisma 查询，没有可以按 tag 失效的东西。客户端那边，action 只要 revalidate 了（path、tag 或 `refresh()`），Next 16.2.9 都会清掉整个 BFCache 和 prefetch cache，源码里写着 `TODO: Evict only segments with matching tags and/or paths`。况且大多数 project 写入本来就会显示在 board 上。

### 实测：乐观更新换成 `useOptimistic`

本地生产构建，网络延迟 0 / 400 ms，用 Playwright 逐帧记录页面：

| 场景 | `main` | 本 PR 首版（自写 pending 叠加） | `useOptimistic` |
| --- | --- | --- | --- |
| 两次拖拽重叠（1.5 s 延迟强制重叠） | 不闪回 | 不闪回 | 不闪回 |
| 写入返回 `{error}` | 回滚 | 只回滚这一笔 | 只回滚这一笔 |
| 请求直接失败（断网、崩溃） | 等下一次写入刷新后才回滚 | **一直停在错误位置**（首版带进来的回归） | 立刻回滚 |
| matrix 完成后马上撤销 | — | 不闪 | 不闪 |

结论：换成 `useOptimistic`，调用处 API 不变。更正：首版说 `main` 上「第二次编辑会闪回」，复现不了。强制重叠时 `main` 也没有闪回，看起来是 Next 把排队 action 的页面更新合在一起提交了。

### 重测：modal 在 action 的 transition 里关（Option 0 / 原生关闭）

- **页面加载后的第一次写入，约 1/3 永久卡住。** POST 已经返回 200，等了 98 s 新页面仍然没提交，modal 一直 loading。在已加载的页面上连续写 50 次，一次也没卡。加载后等 5 s 再写，照样 7/20 卡住，所以和时间无关。
- 在 action 返回时补一次同步更新：降到 1/25，不为 0。
- 本 PR 首版（等新数据，5 s 超时兜底）也中招：同样场景下 2–4/25 转满 5 s 才关。`main` 看不出来，是因为它在 action 返回时就关 modal，这次同步更新让 React 重新尝试那次提交。
- 落地的 workaround：`useWaitForFreshData` 等待期间每 200 ms 重渲染一次。125 次首次写入都在 40–230 ms 内关闭，没有一次等到超时。modal 继续「等新数据再关」，不放进 transition。

### 根因：Next 16.2.x 的 known issue

- **[vercel/next.js#98303](https://github.com/vercel/next.js/issues/98303)**（open）*Server Action update never commits: a transition lane stays suspended and is never pinged*，特征和我们的一致：
  - 只在生产构建出现，只有一次新的更新才能救回来。
  - 触发条件是 `loading.js`、页面在它下面一层、每次请求都 await 的 async layout、action 写 cookie 并 `revalidatePath`。前三条我们都满足，「写 cookie」没确认。
  - 版本数据：16.2.6 卡住率 5–46%，它内置的 React 和我们的 16.2.9 相同（`19.3.0-canary-3f0b9e61-20260317`）。16.3.4 和 16.4 canary 各跑 480 次都是 0。
- 相关报告：
  - [#86055](https://github.com/vercel/next.js/issues/86055)：已关闭，维护者归因于 React 的修复，随 16.3.0 发布。
  - [Discussion #88767](https://github.com/vercel/next.js/discussions/88767)：生产环境约 30% 卡住。
  - [#97990](https://github.com/vercel/next.js/issues/97990)：报告在 16.2.9、16.2.12、16.3.3 上仍能复现，因为没有公开复现被关掉了。所以「16.3 以后修好」还没有完全确认。
  - [#100489](https://github.com/vercel/next.js/issues/100489)：在 16.4 / 16.5 canary 上仍 open，触发方式是 action 进行中调用 `pushState`。Projects 页的 URL 变更已经挪到提交之后，绕开了它。
- 所以 200 ms 重渲染只是给丢掉的重试信号打补丁，正解是升级 Next。

### 升级到 16.4.3 的评估（先本地试装）

- **改动**：`next` 和 `eslint-config-next` 升到 16.4.3（后者原来停在 16.0.4）。`react` / `react-dom` 不动，App Router 用的内置 React 变成 `19.3.0-canary-278794d7-20261002`。
- **检查**：typecheck、lint、knip、生产构建、单元 + 集成（48 个文件，416 + 2 个预期失败）、e2e（26 个）全部通过，代码一行不用改。
- **已拍板（owner）**：16.3 起 `next dev` 一发现是 agent 在跑，就往 AGENTS.md 末尾写一段 agent-rules，删掉后会再加回来，内容逐字比对、改了也会被覆盖。next.config 设 `agentRules: false` 关掉；那段唯一的规则（先读 `node_modules/next/dist/docs/` 里对应版本的文档）用我们自己的话写进 AGENTS.md › Session start。
- **没逐项核对**：16.4 的默认行为变化（严格路由匹配、页面匹配不到路由时报错等）。构建和 e2e 都没受影响。

### 16.4.3 实测：workaround 拿掉（owner 拍板升级）

本地生产构建，去掉 200 ms 重试，页面加载完 1 s 后做第一次写入，每种 25 次。16.2.9 的基线在同一环境重测，一次「卡住」= 等满 5 s 超时才关：

| flow | 16.2.9 | 16.4.3 |
| --- | --- | --- |
| template | 3 / 25 | 0 / 25 |
| step-add | 5 / 25 | 0 / 25 |
| project-edit | 3 / 25 | 0 / 25 |
| matrix-add | 0 / 25 | 0 / 25 |

- 16.4.3 加测，全部 0 卡住：页面一到 DOMContentLoaded 就写（50 次）、400 ms 网络延迟（30 次）、看板首次拖动后的进度更新（15 次）。modal 在点击后 60–260 ms 关闭，和带重试时的 40–230 ms 差不多。
- modal 关在 transition 里：16.4.3 上 155 次 0 卡住（16.2.9 约 7/20 永久卡住）。这次不换：它要和 Step 9 的 config-driven modals 一起权衡（tracker）。
- 结果：PR #80 升级到 16.4.3，删掉 200 ms 重试和对应的 tracker 条目。
- owner 同时定了一条规则：绕开别人 bug 的写法可以用，但要标出来（AGENTS.md › Coding Conventions › *A workaround is fine, but marked*）。代码里现有的四处都标上了。其中 plan form 吞掉 redirect 的 rejection 那处在 16.4.3 上复查过：action 的 reducer 给 redirect error 标了 `handled`，全局 handler 却不看这个标记，不吞的话会再导航一次 board。16.4.3 上这次导航走 client cache，不发请求也不多一条 history，但仍然会发生，所以保留。

## TL;DR

| 问题 | 结论（本地实测，Next 16.2.9 / React 19.2） |
| --- | --- |
| 切换页面为什么慢 | 每次导航都重跑目标页的 loader（`staleTimes.dynamic` 默认 0），但数据 24–183 ms 就到了；内容固定在 ~310 ms 才出现，因为 `loading.tsx` 的骨架一旦显示，React 至少 300 ms 后才换上内容 |
| 一次写入做了什么 | 任何 `revalidatePath` 都让 action 在同一个请求里从 root 重渲当前页。Board 拖一张卡 = 写入 3 条 SQL + 整个 Board loader 8 条 = 11 次 DB 往返，约 10 次串行；不 revalidate 是 3 次 |
| 去掉 `revalidatePath` 行不行 | 不行：router cache 里写入前的 payload 会复活。去掉后按后退键（`staleTimes` 为 0 也一样），或 `staleTimes` > 0 时点链接回到 Board，刚拖到 Done 的卡又回到 Todo |
| 调高 `staleTimes` 行不行 | 保留 `revalidatePath` 时可以：回到刚去过的 Board 从 372 ms 变成 70 ms，数据正确 |
| 要不要 React Query / Zustand / Jotai | 现在不要（Option A）。已记录的痛点都能在现有模型里修；只有 client cache 才能给的是"写入不重渲当前页"，而那 8 次往返大半可以先靠压缩 loader 拿回来 |

**建议 Option A**：保留 RSC 刷新；Board loader 的串行往返从 7 段压到 2 段，写入从 3 次压到 1 次；`staleTimes.dynamic` 调到 30–60 s；`useOptimisticTasks` 在新 props 到达时把还在 pending 的 patch 叠回去（修闪回）；所有 close-then-stale 的入口统一改成"新数据到了再关"。全部问题已拍板，见 Decision。

## 触发

Step 7 原本要回答：每个页面手写的 client 副本（`useOptimisticTasks` + `useEffect` 同步，写入后靠 `revalidatePath` 整页重渲）要不要交给 React Query 和 / 或 Zustand；owner 还想看 Jotai 这类方案。讨论中 owner 先问了更前面的问题：到底有没有必要，现在具体痛在哪。于是这份 spike 先把已记录的痛点逐条对着代码复核，再在本地 production build 上实测导航和写入，最后才比较方案。

## 现在的数据流

以下都在本仓库和 `node_modules/next`（16.2.9）的源码里核实过。

| 场景 | 实际发生的事 |
| --- | --- |
| 切换页面 | 所有 kanban 页面都读 cookie，都是动态页面；client router 对动态页面的 `staleTimes.dynamic` 默认 0，所以每次点 sidebar / dock 都发一次 RSC 请求。Server 从第一个不同的 segment 开始渲染（`walk-tree-with-flight-router-state.js`），root layout 不重跑，只跑 proxy（`getClaims` 本地验签）和目标页的 loader。每个页面都有 `loading.tsx`，先出骨架 |
| 后退 / 前进 | 走 back/forward cache，不看 `staleTimes`（`bfcache.js`：*"A back/forward navigation will disregard the stale time"*）；只有 revalidate 过的 action 会让它整体失效 |
| 写入 | 23 个写入 action 里，除了切 theme（只设 cookie），22 个都调 `revalidatePath`。只要调过一次，不管 revalidate 的是哪个 path，response 都带上**当前页**的重渲（`action-handler.js` 里只有没 revalidate 才 `skipPageRendering`），而且从 root 开始渲染（client 源码：*"Currently the server always renders from the root in response to a Server Action"*）。Client 随后清掉 back/forward cache 和 prefetch cache，可见的 `<Link>` 全部重新 prefetch |
| 排队 | Server action 在 client 上一次只发一个，连续写入依次排队 |
| Client | 新 RSC 在 transition 里 reconcile，组件不 remount、state 保留；但 `useOptimisticTasks` 的 `useEffect(() => setLocalTasks(tasks))` 把本地副本整份换掉，还没确认的乐观 patch 被盖掉，这就是闪回 |

## 实测

### 方法

- 本地 `next start`（production build）+ 本地 Supabase + headless Chromium，桌面 viewport。每组预热 2 轮，取 10 轮中位数，轮间波动小（Board 内容出现在 309–321 ms 之间）。
- 时间在页面里取：`performance.now()` 记点击 / 按键，`MutationObserver` 记骨架和内容出现，Resource Timing 记请求。
- Postgres 前面挂一个 TCP 代理：数 client → server 的 chunk（≈ DB 往返），可以给每次往返加 20 ms，模拟 server 与 DB 不在同一台机器；另一个版本解析 wire protocol，记下每次往返的 SQL。
- "不 revalidate"用一个临时 env 开关跳过 `updateTaskStatusAction` 的 `revalidatePath`；`staleTimes` 用临时 build。都没有提交。
- 没覆盖：浏览器到 Vercel 的网络、serverless 冷启动、production DB 的真实往返延迟。数字看结构，不看绝对值。

### 切换页面

| 目标页 | DB 往返 | 数据到齐（每次往返 +0 / +20 ms） | 骨架出现 | 内容出现（+0 / +20 ms） |
| --- | --- | --- | --- | --- |
| Priorities | 2 | 24 / 47 ms | ~15 ms | 317 / 318 ms |
| Projects | 3 | 28 / 90 ms | ~15 ms | 313 / 311 ms |
| Board | 8（约 7 次串行） | 41 / 183 ms | ~15 ms | 313 / 311 ms |

内容出现的时间和数据快慢无关：react-dom 显示过 Suspense fallback 之后，要到 `globalMostRecentFallbackTime + 300` ms 才提交内容（防闪烁）。只要数据在 300 ms 内到齐，导航的体感就由 `loading.tsx` 决定。

### 拖一张卡到 Done

| | response（gzip） | DB 往返 | 请求完成（每次往返 +0 / +20 ms） |
| --- | --- | --- | --- |
| 现在（`revalidatePath`） | 9.8 KB（解压约 30 KB） | 11 | 46 / 258 ms |
| 去掉 `revalidatePath` | 0.4 KB | 3 | 29 / 84 ms |

两种情况下卡片落进 Done 都是立刻的（乐观更新）。这段时间用户看不到，但它决定了连续写入要排多久的队、闪回的窗口有多长；对没有乐观更新的 modal，它就是按钮 loading 加 close-then-stale 空档的长度。

### 这 11 条 SQL

| # | SQL | 来自 |
| --- | --- | --- |
| 1–3 | `BEGIN` · `UPDATE tasks … RETURNING` · `COMMIT` | 写入：Prisma 把 `updateManyAndReturn` 包进事务，一条语句占 3 次往返 |
| 4 | `plans WHERE status = ACTIVE` | 从这里起是 `revalidatePath` 引发的 Board 重渲。`ensureSynced`（root layout 和 page 共用，`cache()` 去重） |
| 5 | `plans WHERE id = …` | `getPlanWithTemplates`：把 #4 刚读过的 plan 又读一遍 |
| 6–7 | `plan_templates` · `task_templates` | 同上：Prisma 的嵌套关系每层单独发一条 |
| 8 ∥ 9 | `tasks WHERE plan_id = …` ∥ `COUNT(*) FILTER …` | `getBoardTasksByPlanId` 和 `getBoardMetricsByPlanId`（进度面板的聚合），并行 |
| 10–11 | `projects WHERE id IN …` · `tasks WHERE type = PROJECT …` | `getProjectPathsByIds`：step 卡片画 project 路径，要等 #8 返回 project id |

#4–11 和"从 Priorities 切到 Board"时抓到的 8 条完全相同：`revalidatePath('/kanban')` 的代价，就是在 action 里把整个 Board loader 再跑一遍来确认一次写入。串行链是 4 → 5 → 6 → 7 → (8 ∥ 9) → 10 → 11。写入之后那批 prefetch 不查 DB（拖完 4 秒内仍只有这 11 条）。

### 去掉 `revalidatePath` 之后：router cache 里的旧 payload

拖一张卡到 Done → 点链接去 Priorities → 回到 Board：

| 配置 | 点链接回 Board | 按后退键回 Board |
| --- | --- | --- |
| `staleTimes` 0 + revalidate（现在） | Done ✓，372 ms | Done ✓ |
| `staleTimes` 0 + 不 revalidate | Done ✓，378 ms | **Todo ✗**（DB 是 Done） |
| `staleTimes` 60 s + revalidate | Done ✓，**70 ms** | Done ✓ |
| `staleTimes` 60 s + 不 revalidate | **Todo ✗** | **Todo ✗** |

原因：本地副本活在页面组件里，离开页面就 unmount；回来时页面由缓存的 RSC payload 重新渲染，而那份是写入前的。`revalidatePath` 同时在做两件事：刷新当前页，以及让 router cache 失效、再用新的 response 填回去。去掉它，第二件事就没人做；client 也没有"只清缓存、不重渲"的 API（`router.refresh()` 一样重渲当前页）。所以"首次加载之后转成 client 逻辑、跨页面不重新加载"本身就要求一份比页面活得久的 client cache，那正是 Option D。

## 痛点复核

| # | 痛点（出处） | 核实 | Option A 怎么处理 |
| --- | --- | --- | --- |
| 1 | Close-then-stale（`projects-page-refactor` 诊断 1、tracker） | 在，不止 Projects，见下节 | 统一改成新数据到了再关（Q3） |
| 2 | 连点闪回（同上，诊断 5） | 在，Board / Matrix / Projects 共用这个 hook | pending-aware 的 `useOptimisticTasks` |
| 3 | 写入失败没有提示（Step 8） | 在 | 不在本稿，属于 Step 8 |
| 4 | 连续写入排队（诊断 4） | 在，Next 的行为 | 写入变快，排队就变短；React Query 若仍走 server action，一样排队 |
| 5 | 写入 = 整页重渲（诊断 2） | 在，量化为 3 + 8 | 压缩 loader 和写入的往返 |
| 6 | Claude 通过 MCP 写入后，开着的页面不知道（评估表） | 在 | 不变：下次导航可见（开 `staleTimes` 后最多晚 N 秒）；要更快可在窗口回到前台时 `router.refresh()`（Q2） |
| 7 | 每个页面各写一份 client 副本（tracker） | 部分过时：三页已共用一个 70 行的 hook，另有 `useDumpFeed` | 保留，补 pending 处理和测试（`archived/test-baseline.md` 把这个 hook 的测试推迟到了 Step 7） |
| 8 | 29 个 action 里 6 个是读（tracker） | 4 个只在 server page 里调用（`fetchBoardAction`、`getEmptyBoardStateAction`、`fetchPriorityMatrixAction`、`getConsentRequestAction`）；从 client 调的只有 `fetchDumpEntriesAction`（load more）和 `countIncompleteByTemplateAction`（plan form） | 保留（Q6）；绕过 action 的页面和 root layout 都改成走 action（Q6a） |
| 9 | Server ↔ UI 形状转换、URL state（tracker） | adapter + `useMemo`、`?project=` + `pushState` 都运转正常 | 不变 |
| 10 | 首次访问的 300 ms 下限（本次新发现） | 每个页面都有 `loading.tsx` | Q4 |

## Close-then-stale：所有出现的地方

模式：入口 `await` 一个会 revalidate 的 action，一返回就关 modal（或结束按钮 loading、改选中项），而新数据要等同一个 response 后面的页面重渲提交才出现（根因见 `archived/projects-page-refactor.md` 诊断 1）。有乐观更新的写入不受影响：Board 的拖拽 / pull，Matrix 的 track / complete / 拖象限 / undo，Projects 的 + This week / × / reorder，Dump 的 capture。

| 页面 | 入口 | 现在 | 空档里用户看到的 |
| --- | --- | --- | --- |
| Projects | Project modal：New project / Save project | `await` → `onSaved` → `onClose()` | 新建：URL 已指向新 project，但它还不在 props 里，desktop 显示原来最新的那个，mobile 的详情关回列表，重渲后再打开。保存：旧标题和 goal |
| Projects | Archive（project modal、all-done banner）· Unarchive（archived row） | `await` → 改 URL / 关 modal | 被 archive 的 project 还在 active 列表里，desktop 上可能还选中着它；unarchive 的还在 archived 里 |
| Projects | Step modal：Add step / Save step / Delete step | `await` → `onClose()` | 新 step 还没出现 / 旧内容 / 已删的 step 还在 |
| Priorities | Task modal（one-off）：desktop 象限里的 +、mobile 的全局 add | `await` → 关 modal；mobile 同时弹 "added" toast | 象限里还没有新卡；mobile 的 toast 先于卡片出现 |
| Plan form | Task modal（template）：New / Edit template | `await` → `router.refresh()` + `onClose()` | 列表里还没有新 template / 旧内容。实测本地 modal 在 132 ms 关、template 在 299 ms 出现；而且页面渲染了两遍：action 的 revalidate 一遍，`router.refresh()` 又一遍 |

除 plan form 一行是实测外，"用户看到的"一栏按代码推断。

Plan form 的提交（create / update，含 Review changes modal 的确认）不是 close-then-stale：`router.push('/kanban')` 之前表单一直在。但它的 action revalidate 了，response 先把要离开的 plan 页重渲一遍，push 再取一次 Board（Q5）。

修法：

| | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| (a) 在 transition 里关（Projects spike 的 Option 0） | `startTransition` 包住 action 和关闭 | 改动最小 | 试过并撤回：Next 16.2.9 / React 19.2 上偶尔不提交，modal 一直 loading |
| (b) 先 patch 再关 | action 返回新行，container 先改本地副本再关 modal，重渲到达后替换 | 一关就看到新数据，最快 | 每个列表都要有本地副本（Projects 的 project 列表、plan form 的 templates 现在都没有），每种写入要手写插入 / 更新逻辑；server 才算得出的字段（step 编号、排序、进度）要么重复一遍，要么还是等重渲 |
| (c) 新数据到了再关 | 写入成功后不立即关，modal 保持 loading，等页面的新 props 到达（container 的 rows 引用变化）再关，另加超时兜底 | 一个共用 hook 覆盖所有入口；不需要本地副本，不重复 server 逻辑 | loading 持续"写入 + 重渲"，靠压缩往返来缩短；要保证这类写入都 revalidate 当前页（Option A 正好保留） |

### (c) 的共用 hook 管什么

Owner 在 review 里问：它管 modal 的 open / close state，还是数据？两者都不是。它管的是**一次提交的过程**：提交 → action → 等新数据 → 关闭。open state 留在原处（例如 `ProjectsPage` 的 `openModal`），hook 只决定什么时候调 `onClose`；数据仍由 page 的 props 提供，hook 只观察它。

```tsx
// 每个 form panel 用一次，换掉现在手写的 isSubmitting / error / await → onClose
const {isPending, error, submit} = useModalSubmit({
  freshData: projects, // 新数据会出现在哪份 props
  onClose,
});

const handleSubmit = (event: FormEvent) => {
  event.preventDefault();
  submit(
    () => createProjectAction({title, goal}),
    result => onSaved(result.data.id), // 和关闭同时执行
  );
};
```

- `submit` 先记下提交那一刻 `freshData` 的引用，再调 action。失败时给出 `error`、结束 pending，modal 不关。
- 成功后不关，`isPending` 保持 true；等 `freshData` 的引用变了（revalidate 带回的新 props 已经提交），在 effect 里调成功回调和 `onClose`。如果 action 返回时引用已经变了，立即关。
- 兜底：N 秒内等不到新 props 也照样关。这类写入都 revalidate 当前页，正常不会走到这一步。
- 它就是 `archived/projects-page-refactor.md` 为 Step 9 记下的 `useModalSubmit` 核心（`isPending` / `error` / `submit`），多了"等新数据"这一步；Step 9 的 config-driven modal 可以直接建在它上面。
- 要观察的数据都是 page 已有的 props：Projects 的 projects 和 steps、Priorities 的 tasks、plan form 的 templates，不需要新的本地副本。

### 把 modal 挪到 root 层能不能解决

Owner 还问：能不能把 modal root 挪出当前页面、放到 window root 层，让页面的 revalidate 不和 modal state 冲突？单靠这一步解决不了：

- **revalidate 本来就不打断 modal state**：RSC 刷新是 reconcile，页面里的 client 组件不 remount，modal 的输入和 loading 都还在。问题不在状态被打断，而在时机：modal 在 action 返回时立即关，列表要等之后的 router transition 提交才换数据。modal 放在哪一层，列表都在同一时刻更新。
- **放在 root 层，(c) 反而更难做**：root 层的 host 看不到页面的 rows，不知道新数据什么时候到。host 打开 modal 时也只拿得到实体的快照或 id，要按 id 取最新数据就需要 client cache（`projects-page-refactor` 里"全局 host 需要按 id 拿数据"那条），又回到 Option D。
- **Root 层 host 真正的价值**是让 modal 跨页面存活，任何页面都能打开同一个 modal（例如以后"在任何地方加一个 one-off"）。这属于 Step 9 *Config-driven modals*（open state 放 store / context / URL），这次不动。
- **两者不冲突**：hook 只需要知道"新数据会出现在哪份 props"。以后 modal 搬到 root 层，页面得把这份数据接给 host（例如经 context），这一点在 Step 9 一起设计。

## `ensureSynced` 为什么每个请求都跑

讨论中问过：能不能只在 initial load 时 sync？

- 平时它只花 1 条查询（#4：读 active plan），周期和当天是否已 sync 都在内存里判断；真正的 sync 写入，一天只在第一个请求上发生一次。这条查询 loader 本来就要（Board 按 plan id 取 tasks），挪走也省不掉。
- 拖卡片的 action 不调它。调它的写入（Matrix 的 track / complete、Projects 的 schedule step、plan 和 MCP 的写入）是为了确认 plan 属于当前这一周（`design/flows/priorities.md` 的 stale-plan guard）。同一个请求里由 `cache()` 去重。
- 只在 initial load sync 的风险：PWA 开着跨午夜或跨周时没有整页加载，sync 不跑，昨天的 daily task 不过期、今天的不生成，写入还可能挂到已结束的 plan 上（`design/flows/shared.md`）。
- 把 sync 挪出请求路径，正路是 tracker › Future 已有的 *Cron-driven sync*；它不是为了性能，现在不需要。

## Options

### Option A — 保留 RSC 刷新，压缩往返（建议）

写入继续 `revalidatePath`，页面继续由 server 刷新；把这套模型本身的开销压下去，修掉接缝上的两个 bug。

1. **Board loader：7 段串行 → 2 段。** 去掉 #5（直接用 #4 的 plan id 查 templates）；#6–7 合成一条（手写 join，或评估 Prisma 的 `relationJoins`，本项目未开启）；templates、tasks、metrics、project 路径都只依赖 plan id，全部并行，project 路径改成按 plan 直接查，不等 tasks。Priorities（2）、Projects（3）和 plan 页用同样的方法各量一遍。
2. **写入：3 次 → 1 次。** 单行写入不包事务：一条 `UPDATE … RETURNING`（`$queryRaw`，或先验证 Prisma 的 `update({where: {id, userId}})` 是否不开事务）。先做 `updateTaskStatus`，再看其他高频写入。
3. **`experimental.staleTimes.dynamic` 设为 30–60 s**（Q2）：回到刚去过的页面直接用缓存。正确性依赖"所有影响别的页面的写入都 revalidate"，现在满足。
4. **`useOptimisticTasks` 记住 pending 的 patch：** 每个 patch 记在它所属的写入名下，新 props 到达时以新 props 为底，把还没 settle 的 patch 叠回去，写入 settle 后丢掉它。行为和 React 的 `useOptimistic` 一样，但不依赖 transition：dnd 要求在 `onDragEnd` 里同步重排，Next 16.2.9 上 transition 偶尔不提交，这两点是之前没换 `useOptimistic` 的原因。补上推迟的 hook 测试：连点两行不闪回、失败只回滚自己的 patch。
5. **Close-then-stale：** 按 Q3 的结论改上一节表里的每个入口。
6. **Plan form（Q5）：** 存 template 后删掉多余的 `router.refresh()`；plan 提交改成在 action 里 `redirect('/kanban')`。Next 在 server 内部取目标页再转发（`createRedirectRenderResult`），不再重渲要离开的 plan 页，也省掉 client 的第二次请求；Vercel 上是否多一次 function 调用要验证。
7. **读 action（Q6、Q6a）：** 保留；Projects、Dump、plan form 的两个页面和 root layout 也改成经 action 读，ESLint 守住这条边界，AGENTS.md › Layers 加一行。
8. **AGENTS.md › *Server shapes inputs* 的 pending 一半：** 写成"container 把 rows 按 server 形状存为 state，乐观 patch 带着 pending 状态叠在上面；revalidate 回来的 props 换掉底，pending 的 patch 再叠上去"，并去掉 pending 标记（`archived/agents-md-simplification.md` Q4）。
9. **前后对比：** 每一步都用 SQL 代理抓一次往返次数，导航和写入的数字写进 PR。

| 优点 | 缺点 |
| --- | --- |
| 不加依赖，不新增读接口，不引入第二套数据源；改动集中在 DAL、一个 hook 和几个 modal | 写入仍然重渲当前页（压缩后约 1 + 2 段串行往返），连续写入仍要排队 |
| 切换页面和写入一起变快，按串行往返的倍数省 | 外部写入（MCP）要导航才可见，开 `staleTimes` 后最多晚 N 秒 |
| 闪回和 close-then-stale 从根上修掉，Phase 2 的新页面照这个模式写 | `staleTimes` 仍是 experimental（14.2 引入，16.2.9 的文档仍这样标） |

### Option B — 热路径写入不 revalidate（不建议）

拖拽、toggle 这类已有乐观更新的写入不调 `revalidatePath`，action 返回需要的数据（例如进度聚合），client 自己 patch。实测：即使 `staleTimes` 为 0，按后退键回到页面也会看到写入前的数据；调高 `staleTimes` 后点链接也一样。要修，需要一份比页面活得久的 client 副本，那就是 Option D / E。

### Option C — 完全不 revalidate + 调高 `staleTimes`（不建议）

讨论中提出的方向：首次加载拿 server 数据，之后全是 client 逻辑，跨页面靠 router cache。实测四种组合里只有它在点链接和按后退键时都出错。而且非乐观的写入（新建 project / step / template，plan 的创建和更新，后者在 server 上生成 task 实例）在 client 上没有可改的副本；进度聚合这类只有 server 算得出的数据也会过期。

### Option D — React Query 接管页面数据

RSC prefetch 首屏并 hydrate，client 的 query cache 是唯一副本；写入用 `setQueryData` / invalidate，不再 revalidate。

| 优点 | 缺点 |
| --- | --- |
| 写入请求只剩 3 次往返（实测的"不 revalidate"）；重取在后台，可以只取受影响的 query | 要一套 client 能调的读接口（GET route handler；server action 是 POST 且串行），每个都要鉴权、跑 `ensureSynced`、返回和 RSC 首屏一致的形状 |
| Cache 跨页面存活：回到页面先显示缓存，再后台刷新；`refetchOnWindowFocus` 能接住 MCP 写入 | 两条读路径（RSC 首屏 + GET 重取）、hydration 接缝、`QueryClientProvider`；每个页面的 container 都要改写，迁移要好几个 PR |
| 乐观更新有官方模式 | 闪回不会自动消失：要 `cancelQueries`，并等最后一个 mutation 完成再 invalidate。写入若仍走 server action，照样排队；导航仍取 RSC，除非把页面改成从 cache 渲染 |

### Option E — Zustand / Jotai

用来装 rows 的话，同步规则（过期、失效、pending、回滚）都要自己写，等于手写一个 Option D。用来放 UI state（modal 栈、选中项）的话，现在 `useState` 和 URL 就够了，等 Step 9 的 `useModal` 真需要全局的 open state 再看。

### 什么时候重新考虑 Option D

压缩往返之后再量一次。出现下面任一情况再回到 D：production 上写入的等待仍然明显（例如 modal 的 loading）；Phase 2 的新页面需要跨页面共享、即时一致的数据；MCP 写入需要在开着的页面上即时出现。

## 问题与答复（已拍板，见 Decision）

1. ✓ **方向：** 采用 Option A，现阶段不引入 React Query / Zustand / Jotai？**Owner：按建议，是。**
2. ✓ **`staleTimes.dynamic`：** 30 s、60 s，还是不开？外部写入最多晚 N 秒可见。要不要另加"窗口回到前台时 `router.refresh()`"来接住 MCP 写入？**Owner：按建议，60 s，focus refresh 先不加。**
3. ✓ **Close-then-stale 修法：** (b) 先 patch 再关、(c) 新数据到了再关，还是混用？**Owner：按建议，(c)**，一个共用 hook（是什么、为什么不靠挪 modal 到 root 层，见「(c) 的共用 hook 管什么」和下一节）。
4. ✓ **首次访问的 300 ms 下限：** 保留骨架；对 loader 压缩后足够快的页面去掉 `loading.tsx`（导航时旧页面停到新页面就绪，链接用 `useLinkStatus` 显示 pending）；还是压缩后再量再定？**Owner：按建议，压缩后再量再定。**
5. ✓ **Plan form：** 存 template 后删掉多余的 `router.refresh()`，plan 提交改成在 action 里 `redirect`？**Owner：按建议，都做。**
6. ✓ **读 action：** 4 个只在 server 上调用的改成直接调 service？**Owner：保留**，UI 和 server 之间要有清晰的一层。
   - 6a. ✓ 顺带：Projects 页直接调 service（`fetchProjectsPage`），Dump 页直接调 DAL（`countDumpEntries`），都绕过了这一层。要不要在本 PR 里改成走 action，和其他页面一致？**Owner：都改成走 action，并定为 agent 必须遵守的规则**（root layout 和 plan form 的两个页面也一样）。
7. ✓ **落地方式：** **Owner：Option A 全部在本 PR 里做。** Board 先做（往返最多，闪回和进度聚合都在），再做其余页面和 close-then-stale。
8. ✓ **Step 7 的另外两个话题**（shared server-action handler；error-handling plumbing，后者已有 PR #32 的 spike）：**Owner：各自单独**，不并进本 spike。
