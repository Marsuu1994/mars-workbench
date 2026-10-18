# Spike: Test baseline

**Status: awaiting owner review** · 2026-10-18（2026-10-17 起草）· 回答 tracker 条目 *Milestone — Quality gate before Phase 2 › Step 5*（Cross-cutting › High）· 基于 main `045568a`（#74）· 起因：Step 4 的 review（PR #74）中 owner 问「用本地 DB 测 service 算不算 e2e」，并加了一条探索：agent 自己起浏览器验 UI 有没有必要、花多少 token、能不能用 CI 加 owner 验收代替 · 相关：`src/utils/`、`src/services/`、`src/lib/db/`、`src/mcp/`、`scripts/`（Step 4 的本地栈）、`src/app/design/`、`.github/workflows/ci.yml`

> 语言约定：叙述用中文；工具名、测试术语和代码标识保留英文（Vitest、Playwright、unit / integration / e2e、`toBoardCards`、`services: postgres`、cache read），和代码、tracker 一一对应。

这份 spike 分八部分：现状；三种测试的边界；选型（runner、integration 用的 DB、e2e，以及这一步不做的）；本次在云端容器里的验证；每层测什么；coverage 目标；agent 验收能不能交给 CI + owner 验收 + 返工（附从 session 记录里取的 token 数据）；实施计划和待 owner 决定的问题，问题编号方便逐条回复。

**结论先行**：

1. **工具**：Vitest 5 跑 unit 和 integration，Playwright 跑 e2e，三样都进 CI。
2. **分层**：纯函数的 unit test 数量最多；service 和 MCP 工具连真实 Postgres 做 integration test，不 mock DAL；e2e 只做每页一个 smoke、Design Console smoke 和 4 条关键路径。e2e 是唯一要登录、要起 Supabase 栈的一层。
3. **Coverage**：不设全局数字，因为组件和路由占了代码的约 2/3，不在 unit 的范围内。门槛按目录设：`src/utils` lines ≥ 90%，services + DAL lines ≥ 80%；落地时按实测值写进配置，之后只升不降。
4. **agent 验收**：大部分可以交给 CI + owner 在 Vercel preview 上验收 + 返工，能省 token。但省下的主要不是截图（一张约 1.4k token），而是在大上下文里多出来的调用：每次调用都要把整个上下文再读一遍，同样一轮自验，在 45 万 token 的上下文里比在 10 万里贵 4 倍多。推荐按改动类型分级，不一刀切。
5. **本次验证**：在云端容器里用 Vitest 5.0.5 和容器自带的 Postgres 16 跑通了原型，三类测试共 25 个，1 秒内跑完：unit、service integration、直接调 `/api/mcp` 的 route handler。空库跑完 19 个 migration 用 1.6 秒。

## 现状

- 仓库里没有任何测试。CI 只跑 Prettier、ESLint、tsc、knip 和 theme check。
- 逻辑层约 5.9k 行：`utils` 1.3k、`services` 2.2k、DAL 1.5k、`mcp` 0.4k、`schemas.ts` 0.5k。组件和路由约 14k 行：`components` 8.7k、`app` 5.5k（含 Design Console）。
- Step 4 已经提供了三样东西：
  - 本地 Supabase 栈（Postgres 17 + Auth）；
  - seed：按「今天」生成一周数据，走 services；
  - `dev:session`：不经 Google 登录，输出 Playwright 的 storageState。
- agent 现在怎么验 UI：AGENTS.md › UI Workflow 让 agent 在 Design Console 里验。实际做法是起 `next dev`，用 Playwright 驱动 Chromium 截图或者量 DOM（见下文实测）。之后 owner 在 Vercel preview 上再看一遍。
- 依赖上的一个前提：Vitest 5 要求 `@types/node` ≥ 22，项目还是 `^20`。`engines` 已经是 Node 22.x，实施时一起升。

## 三种测试

| 测试 | 边界 | 要什么 | 这个项目里 |
| --- | --- | --- | --- |
| unit | 一个函数；要么没有依赖（纯函数），要么只 mock 外部边界 | 什么都不要 | `src/utils/`、有业务规则的 zod schema、MCP 的 `runTool` 和 token 校验 |
| integration | service 或 MCP route + DAL + **真实 Postgres**；没有浏览器，没有 Auth | 一个 Postgres | `src/services/`、`/api/mcp` |
| e2e | 浏览器 → Next → action → service → DB | app + DB + Auth（Supabase 栈） | 每页 smoke、Design Console smoke、关键路径 |

用真实 DB 测 service 是 integration test，不是 e2e。e2e 指 Playwright 这类工具从浏览器一路走到 DB。

## 选型

### Test runner：Vitest ✓

| | Vitest 5 | Jest 30 | `node:test` |
| --- | --- | --- | --- |
| TS、ESM、`@/` alias | 原生支持；alias 只要配置里一行 `resolve.tsconfigPaths: true`（本次验证） | 要 `ts-jest` 或 SWC 转译，alias 另配 `moduleNameMapper` | 要 tsx loader，alias 另配 |
| 多套环境（两个时区、接不接 DB） | 一份配置里用 `projects` 分 | 多份 config | 手写脚本 |
| coverage | `@vitest/coverage-v8`，可以按目录设门槛 | 内置 | 实验性 |
| Next.js 官方文档 | 有配置指南 | 有配置指南 | 没有 |

推荐 Vitest。项目已经是 ESM + TS + path alias，Vitest 不用额外的转译配置。

### Integration test 用什么 DB

| | A · 真实 Postgres ✓ | B · Testcontainers | C · PGlite | D · mock DAL / Prisma |
| --- | --- | --- | --- | --- |
| 怎么起 | CI 用 `services: postgres:17`；本地用栈里单独的一个库 | 每次跑测试时起一个 Postgres 容器 | 进程内的 WASM Postgres | 不碰 DB |
| 和 prod 一致 | 同为 Postgres 17 | 同 | PG 17 的单连接版本 | — |
| 生产代码要不要改 | 不用 | 不用 | `src/lib/prisma.ts` 要能换 adapter，或者测试里 mock 掉它 | 不用 |
| 代价和风险 | 本地要先有一个 Postgres | 要 Docker；每次起容器多几秒；云端容器还要先起 dockerd | 只有一条连接：services 里有 `Promise.all` 并发读，也有 `$transaction`，可能互相等；Prisma adapter 是社区维护的 | 断言的是调用顺序；Step 7 一重构，行为没错测试也会挂 |

推荐 A。分层 mock 在这个 codebase 里收益低，草稿里已经分析过，结论不变：

- **DAL mock Prisma**：DAL 函数就是一条查询，mock 之后只能断言「用参数 X 调了 `findMany`」，查询写错照样测不出来。
- **service mock DAL**：断言的是调用顺序，Step 7 改调用方式就会挂；services 用 `prisma.$transaction(async tx => …)`，连事务也得 mock。integration test 断言的是执行后 DB 里的状态，重构之后照样成立。
- **action mock service**：action 只有 zod → `getCurrentUserId` → service → `revalidatePath`，mock 完只剩 schema，可以直接单独测。Step 7 可能把 action 换成共用 handler，到时测 handler 一次就够。

方案 A 的三个细节：

- **隔离：每个 test 一个随机 `userId`。** app 表只存 `user_id`，没有指向 `auth.users` 的外键，DAL 的每条查询都按 `userId` 过滤。所以不同 test 的数据互相看不见：不用每个 test 都清表，不用每个 worker 一个 schema，测试文件之间可以并行。global setup 在每次运行前清一次表，免得测试库越积越大。用事务回滚隔离行不通：services 自己开 `$transaction`，Prisma 不支持从外面再套一层。
- **时间：只 fake `Date`。** services 里的「今天」来自 `getTodayDate()`，也就是 `new Date()`。测试用 `vi.useFakeTimers({toFake: ['Date']})` 加 `vi.setSystemTime(...)` 把时间拨到某个周三或下周一；pg 的连接不受影响（本次验证）。
- **mock 只用于两处外部边界**：Supabase Auth（MCP 的 `getClaims`）和时间。

### e2e：Playwright ✓

- 能直接接上 Step 4 的 `dev:session`，它输出的就是 Playwright 的 storageState。云端容器预装了 Chromium。Design Console 的 scenario 页也能顺手测。
- Cypress 不考虑：`dev:session` 输出的是 Playwright 的格式，换 Cypress 要另写一套登录；云端容器预装的也是 Playwright 的浏览器。
- 版本：`@playwright/test` 固定一个版本，CI 装同版本的 Chromium。云端容器里预装的是 Playwright 1.56（Chromium rev 1194）；版本不一致时，用 `executablePath: /opt/pw-browsers/chromium` 启动，不重新下载。
- 浏览器先只跑 Chromium。Playwright 也能跑 WebKit，以后可以加一个 WebKit 的 smoke；但 Linux 上的 WebKit 不等于 iOS 真机，下文 logo 闪烁那类问题未必能复现。

### 这一步不做的

- **组件测试**（React Testing Library + jsdom，或 Vitest 的 browser mode）：
  - 组件大多是展示层。它们的各种状态由 Design Console 的 scenario 固定下来，由 owner 看。
  - 逻辑按 AGENTS.md › *Server shapes inputs* 已经拆到 `src/utils/` 的纯 adapter 里（比如 `toBoardCards`），在 unit 层测。
  - 有状态的 hook（`useOptimisticTasks`）要等 Step 7 定下 mutation layer 再测，现在写，到时会跟着重写。
- **视觉回归**（Playwright 的 `toHaveScreenshot`，给每个 scenario tab 拍基准图，之后逐像素比对）：
  - 每次有意的 UI 改动都要重新生成基准图，而且只能在 CI 的 Linux 环境里生成，否则字体渲染不同会误报。
  - fx 主题里有 8 组 keyframes 动画，要关掉动画或者把那块遮掉。
  - 现在 UI 改得频繁，维护基准图的成本高于收益。Phase 2 的 UI 稳定后再评估（Q10）。

## 本次验证（云端容器，2026-10-18）

原型没有提交，放在这个 session 的 scratchpad 里；实施时按下文重写。

- **环境**：Node 22.22，Vitest 5.0.5 + `@vitest/coverage-v8` 5.0.5，容器自带的 PostgreSQL 16.15。prod 是 17.6，CI 会用 17。
- **依赖冲突**：直接 `npm i -D vitest` 会报 peer 冲突，Vitest 5 要 `@types/node` 为 `^22 || >=24`，项目是 `^20`。升到 `^22` 之后 tsc 照样通过。
- **配置**：
  - 配置文件要叫 `vitest.config.mts`。叫 `.ts` 会被当成 CommonJS 加载并告警。
  - `resolve.tsconfigPaths: true` 就能识别 `@/`，不用装插件。
  - 分三个 project：`unit`（`TZ=UTC`）、`unit-la`（`TZ=America/Los_Angeles`）、`integration`（`TZ=UTC`，`DATABASE_URL` 指向测试库）。
- **建库**：空库上 `prisma migrate deploy` 跑完 19 个 migration，用时 1.6 秒。
- **测试**：共 25 个，都通过，跑一遍不到 1 秒。加 MCP 那 3 个之前的 22 个连跑了三次，每次都是绿的。
  - **unit**：`dateUtils` 在两个时区各跑一遍，测了 LA 时区的「今天」跨 UTC 午夜、ISO week 跨年、`normalizeForDate`；`applyStepPatch` 测了先移动再插入，以及冲突检测。
  - **service integration**：
    - `createPlanFromSpec` 建出一周：新 habit 生成了 DAILY 和 WEEKLY instance，选中的 step 排进了本周；
    - 同一周再建一个 plan，被 `PlanningError` 拒绝；
    - `patchActivePlan` 删掉一个 habit，它没完成的 instance 也被删掉；
    - 把时间拨到下周一，`ensureSynced` 把 plan 翻成 PENDING_UPDATE，5 个 instance 过期，step 变成 LAST_WEEK。
  - **MCP route integration**：直接调 `src/app/api/mcp/route.ts` 导出的 `POST`，不起 server，以 `MCP_DEV_USER_ID` 的身份发 JSON-RPC 请求：
    - `tools/list` 返回 7 个工具，名字列表做成了 inline snapshot；
    - `create_project` 真的写进了 DB；
    - 编造一个 `planId` 调 `update_plan`，返回 `isError`。
- **确认了几个前提**：
  - `ensureSynced` 外面包的 React `cache()` 在 RSC 之外直接透传，不影响测试。
  - services、DAL、utils 都不 import `server-only` 或 `next/*`，在普通 Node 里就能跑。
  - 随机 `userId` 的隔离在并行 worker 下成立。
  - ESLint 和 knip 对测试文件都没有报错，knip 能自动识别 Vitest。
- **coverage 起点**：只有这 4 个 service test 加十来个 unit test，`utils` + `services` + DAL 的行覆盖率就到了 42%，其中 `planningService` 73%。一条 integration test 能走过 service 和 DAL 的很多行，这是它比 mock 划算的地方。
- **agent 截图的实测**：`next dev` 冷启动到 board scenario 页能打开用了 11 秒；截 3 张图用了 3.7 秒。按「宽 × 高 ÷ 750」估算，1280 × 800 的截图约 1.4k token，390 × 844 的约 0.4k token。

## 每层测什么

### Unit（Vitest，不连 DB）

约 10 个文件，100 个左右的 case。

| 模块 | 重点 |
| --- | --- |
| `dateUtils` | LA 的「今天」跨 UTC 午夜；ISO week 跨年（W53 / W01）；`getMondayFromPeriodKey`；`isPeriodCurrent`；夏令时切换日（2026-03-08、2026-11-01）；`countWeekdaysInRange` |
| `taskUtils` | `computeHabitWeeks`：NORMAL 和 EXTREME、plan 周中开始、减频率后保留 DONE 的 instance、mode 切换后落在 slot 之外的 instance；`sortTasks`：DAILY 在前、同组连续、平局时的排序规则 |
| `boardCardUtils` | `toBoardCards`：按状态分组、跳过 EXPIRED、step 路径用 board 上的最新状态、project 不在 lookup 里 |
| `planUtils` | `diffPlanTemplates`；`applyTemplatePatch` 的三种冲突 |
| `projectUtils` | `applyStepPatch` 的五种冲突和放置顺序；`numberStepPath`；`getStepState`；`summarizeProject` |
| `authRedirect` | `getSafeNextPath`：`//host`、`/\host`、控制字符都退回 `/`，防 open redirect |
| `statsUtils`、`sizeUtils`、`dump`、`formErrors`、`theme` | 小函数；`shiftDayKey` 跨月和跨夏令时 |
| `schemas.ts` | 只测带业务规则的：step 上限 50、patch 里字段的互斥和必填组合 |
| `mcp/middleware` | `runTool` 的三种错误包装；`verifyMcpAccessToken`：没有 token 时只有 development 用 dev 身份，production 一律拒绝，claims 不对返回 undefined（mock `getClaims`） |

### Integration（Vitest + Postgres）

约 8 个文件，50 个左右的 case。

| 范围 | 重点 |
| --- | --- |
| `syncService` | 同一天调两次 `ensureSynced` 只生成一次；第二天让昨天的 DAILY 过期、生成今天的；NORMAL 的周末不生成；跨周后 plan 翻成 PENDING_UPDATE，WEEKLY 过期，one-off 和 step 不过期 |
| `planningService`、`planService` | `createPlanFromSpec`：默认 carry over 全部、指定子集、各种 `PlanningError`；`patchActivePlan`：加 template、改频率、删 template 时 instance 的重建，跨周后旧 `planId` 被拒，one-off 和 step 的增删；plan form 的 `updatePlan`：只放掉表单里勾掉的，form 打开期间 Claude 加的 one-off 不丢 |
| `projectService`、`projectPlanningService` | 编号；50 步上限；移动和删除后重新编号；排进和移出本周；archive 放掉没完成的 step；`patchProject` 有冲突时整体拒绝，什么都不写 |
| `matrixService` | 没有 plan 时 track 报错；complete 之后 undo，恢复原来的状态和 plan 关联 |
| `boardService` | 固定的一周数据下，Today、Week projected、days elapsed 的数字 |
| `/api/mcp` | `tools/list` 的工具名和 input schema 做 snapshot：这是 Claude 看到的契约，改了要在 diff 里显式更新；每个工具一条正常路径；错误包装；无效的 bearer token 返回 401 |

- tracker 里有一个已知 bug：Edit Plan 保存的是整份 template 列表，会撤掉 form 打开期间 Claude 对 habit 的改动。可以先把它写成一个 `it.fails` 的 test，修的时候翻过来。
- 测试数据：`scripts/seed.ts` 里「建 habit、建 plan、建 project」的几段抽成共用的 helper，seed、integration test 和 e2e 的 setup 都用它。

### E2E（Playwright + 本地 Supabase 栈）

- **用户**：e2e 的 global setup 用 admin API 建一个独立的 `e2e@mars.local`，清掉它的数据，用上面的 helper 重新 seed，再登录写出 storageState。这样本地跑 e2e 不会动 dev user 的数据。
- **每页 smoke**，desktop（1280）和 mobile（390）各一遍：
  - 未登录访问 `/kanban`，跳到登录页；
  - board、priorities、projects、plan（编辑本周的 plan）、dump、settings sheet 都能渲染出 seed 的内容，控制台没有 error。
- **Design Console smoke**：每个 scenario 页的每个 tab 点一遍，断言控制台没有 error、play step 没有报错。下文那次实测里，agent 自己写过一个脚本做同样的事（"Render every Design Console page and collect errors"）。交给 CI 之后，就不用每个 session 都在上下文里再做一遍。
- **关键路径**，4 条，串行：
  1. **board**：把一张 Todo 卡拖到 Done，进度数字跟着变，刷新后还在。`@hello-pangea/dnd` 支持键盘拖动（空格抓起、方向键移动、空格放下），比模拟鼠标稳定。
  2. **priorities → board**：加一个 one-off，点 Track this week，board 上出现这张卡。
  3. **projects → board**：给 project 加一步，点 + This week，board 的 backlog 里出现这张 step 卡和它的路径。
  4. **plan**：编辑本周的 plan，删掉一个 habit，在 Review changes 里确认后，board 上它没完成的卡消失。
- **不在 e2e 里测的**：
  - 日期逻辑：server 是另一个进程，Playwright 冻结不了它的时间。交给 integration。
  - MCP：production build 里没有 dev 身份。交给 integration。
  - OAuth consent：要 Google 和 claude.ai，留给手动验证。

## Coverage

- 用 `@vitest/coverage-v8`。报告覆盖整个 `src/`，门槛只按目录设：

  | 目录 | 门槛 |
  | --- | --- |
  | `src/utils/**` | lines ≥ 90%，branches ≥ 80%（纯函数，测起来便宜） |
  | `src/services/**` + `src/lib/db/**` | lines ≥ 80%（integration test 顺带覆盖 DAL） |
  | `src/mcp/**` | 不设百分比；规则是每个工具至少一条 route 级 test |
  | components、actions、hooks、`app/` | 不设，由 e2e 和 owner 验收负责 |

- **不设全局数字**：组件和路由占代码的约 2/3。全局要求 80%，只能逼着写低价值的组件测试；全局数字低，又看不出逻辑层到底测到了没有。
- **门槛只升不降**：落地时按实测值向下取整写进配置，之后只往上调。CI 跑 `vitest run --coverage`，低于门槛就红。
- **新规则**（写进 AGENTS.md）：修 bug 时，先在能复现它的最低一层写一个会失败的 test，再修。
- e2e 不计入 coverage：给 Next 的 server 插桩成本高，收益小。

## agent 验收：能不能交给 CI + owner 验收 + 返工

### 现在怎么验

AGENTS.md › UI Workflow 让 agent 在 Design Console 里验 UI 改动。实际做法是：起 `next dev`，写一个 Playwright 脚本，截图后读图；或者在 DOM 上量尺寸、抓控制台报错。之后 owner 在 Vercel preview 上再看一遍。preview 连的是 prod 数据（Step 4 的 Q7）。

### 实测：session 记录里的 token 和费用

数据来自 Claude Code 的 session 记录：每轮对话的 `modelUsage`，按 list price 计。模型都是 Opus 5.5。下表的「调用」指一次模型请求，每一次工具来回算一次。

| 场景 | 调用 | 上下文（token） | 费用 | 平均每次调用 |
| --- | --- | --- | --- | --- |
| PR #46：卡片 badge 换行，一个很小的 UI 修复（整个 session）。agent 用静态 HTML 复刻那一排 badge，再用 Chromium 截图验证 | 32 | 7.6 万 → 10.3 万 | $1.19 | 约 $0.04 |
| PR #72：做本地 `/design` 免登录，同时试着复现 logo 闪烁（headless Chromium 逐帧录屏、量亮度），没复现 | 27 | 37.6 万 → 42.2 万 | $3.18 | 约 $0.12 |
| PR #72：owner 发来手机截图后，定位原因、修复，再在 Chromium 里做像素对比 | 11 | 43.0 万 → 44.3 万 | $1.40 | 约 $0.13 |
| PR #72：修 `sw.js` 和 manifest 被登录拦截，再本地验证 | 8 | 45.1 万 → 45.6 万 | $1.02 | 约 $0.13 |

从这些数据能看出四点：

- **钱主要花在重读上下文上。** 每次调用都要把整个上下文再读一遍。这部分走 prompt cache，按 cache read 计费。以表里最后一行为例：cache read 363 万 token，新写入 7 千，输出 6 千；按金额算，cache read 约占九成。所以，一次调用的成本 ≈ 上下文大小 × cache read 单价；从记录反推，单价约每百万 token $0.25–0.28。上下文 10 万时一次调用约 $0.03，45 万时约 $0.13。
- **截图本身便宜，但会留在上下文里。** 1280 × 800 的截图约 1.4k token，手机尺寸约 0.4k。它之后每次调用都会被再读一遍：10 张 desktop 截图约 1.4 万 token，如果后面还有 200 次调用，就是约 280 万 token 的重读。
- **同样一轮自验，session 越往后越贵。** 一轮自验通常 6–12 次调用：起 server、等编译、写脚本、跑、读图、调整、再跑。上下文 10 万时，这一轮约 60–120 万 token（$0.2–0.4）；45 万时约 270–540 万 token（$0.8–1.6），贵 4 倍多。
- **headless Chromium 看不到的问题，agent 验不出来。** logo 闪烁只在 WebKit 上出现（iOS 的 Safari 和 Chrome 都是 WebKit）。表里第二行那一轮，专门为复现闪烁做的浏览器探测至少有 7 次，每次的上下文约 39–41 万，合计约 280 万 token（约 $0.8），都没复现。owner 的一张手机截图到手后，第三行那一轮 11 次调用就修好了。

### 换成 CI + owner 验收 + 返工，成本怎么变

- **CI 里的测试不进上下文。** 通过时不花 token。失败时，agent 被 PR 事件唤醒，读一段日志（几千到几万 token），再修。
- **owner 验收不新增成本。** owner 本来就在 preview 上看。新增的是：发现问题之后要返工一轮。
- **一轮返工的调用数和一轮自验差不多，但它发生在 session 后段，上下文更大**，还要等 owner 一个来回。如果 session 已经归档，新 session 还要重新读一遍相关代码。上表第三、四行就是两轮返工，分别是 $1.40 和 $1.02。
- **什么时候省**：设一轮自验花 V，一轮返工花 R（R 大约是 V 到 2V），p 是「自验能拦下 owner 本来会退回的问题」的概率。去掉自验，每次省下 V，多出 p × R。
  - p 低的改动，去掉自验是净省：自验大多什么也发现不了，或者根本验不出来（比如只在 WebKit 上出现的问题）。
  - p 高的改动，去掉自验只是把成本挪到返工，还多花 owner 一轮时间：比如容易换行、溢出、在断点处走样的布局改动。
- **更大的杠杆，是把每次都要做的检查挪进 CI。** e2e smoke 和 Design Console smoke 写一次，之后每个 PR 都自动跑，不花 token；agent 的自验则每个 session 都要重新花一次。

### 推荐：按改动类型分级（Q8）

| 改动 | 由谁来验 | agent 开不开浏览器 |
| --- | --- | --- |
| 逻辑、数据、MCP（services、utils、schemas、DAL） | `npm test` + CI | 不开 |
| 样式、文案、小的视觉调整 | CI 的 smoke + owner 在 preview 上看 | 不开 |
| 布局改动（换行、溢出、断点、浮层层级），或者新增、修改了 scenario tab 或 play step | CI + owner；agent 只看改到的 scenario tab，desktop 和 mobile 各一张视口截图；能用 DOM 测量（宽高、是否溢出）回答的问题就不截图 | 开，只开一轮 |
| 只在设备上出现的问题（iOS / WebKit、PWA） | 先请 owner 发截图或录屏 | 不先自己复现 |
| owner 点名要 agent 看 | — | 开 |

另外两点：

- 真要看图时，尽量放在 session 前段做；或者交给一个新开的 subagent，只给它任务说明，让它返回文字结论。这样截图和脚本输出不会留在主上下文里被反复重读。subagent 能省多少，是按「上下文小、每次调用便宜」推出来的，还没实测（Q9）。
- 定下来之后，AGENTS.md › UI Workflow 里的 "verify UI changes there" 改成上表的规则。Design Console 仍然是 owner 和 agent 查看已实现 UI 的地方。

## CI 和本地怎么跑

**npm scripts**：

- `npm test`：unit + integration（`vitest run`），需要一个本地 Postgres。
- `npm run test:unit`：不连 DB，任何环境都能跑。
- `npm run test:e2e`：需要本地栈（`db:setup`）。Playwright 的 `webServer` 自己跑 `next build` 和 `next start`。

**CI**：`.github/workflows/ci.yml` 新增两个 job，和现有的 job 并行。

- `test`：`services: postgres:17` → `npm ci` → `prisma generate` → 对测试库 `prisma migrate deploy` → `vitest run --coverage`。预计 1–2 分钟，大部分时间花在 `npm ci` 上。
- `e2e`：`npm run setup`（`.env.local`、install、起 Supabase 栈、migrate、seed）→ 装同版本的 Chromium → `playwright test`；失败时上传 trace 和报告。预计 5–8 分钟，大部分时间花在第一次拉约 4 GB 的镜像上；在 GitHub runner 上实际多久，实施时实测。
- 仓库是 public，GitHub 自带的 runner 不计分钟。

**本地和云端 agent**：

- integration 用本地栈 Postgres 里一个单独的库 `mars_test`。global setup 负责：库不存在就建，跑 `migrate deploy`，清表。不碰 dev 的 seed 数据。和 `scripts/localEnv.ts` 一样，拒绝非本机地址。
- 云端容器里，栈没起时可以退回容器预装的 Postgres 16（Q3）。

**AGENTS.md**：

- Commands 加上测试命令；
- *Before every push* 第 5 条加上 `npm test`，e2e 留给 CI；
- *Where the rules live* 加一行，指向测试约定的 README；
- UI Workflow 换成上面的分级规则。

## 实施计划

一个 PR，就是这个 spike 的 PR（AGENTS.md › *One task, one branch, one PR*），按下面的顺序提交：

1. **依赖**：`vitest`、`@vitest/coverage-v8`、`@playwright/test` 固定版本；`@types/node` 升到 `^22`。
2. **Vitest 配置和测试数据**：`vitest.config.mts`（unit 分两个时区，加 integration）；测试库的 global setup；共用的测试数据 helper，从 `scripts/seed.ts` 抽出来，seed 也改用它。
3. **Unit test**：按上面的表。
4. **Integration test**：按上面的表，含 `/api/mcp`。
5. **Coverage 门槛**：按实测值写进配置。
6. **Playwright**：配置；e2e user 的 global setup，复用 `dev:session` 的登录逻辑；每页 smoke；Design Console smoke；4 条关键路径。
7. **CI**：`test` 和 `e2e` 两个 job。
8. **文档**：
   - 测试约定的 README（放在哪由 Q1 决定）；
   - AGENTS.md：命令、push 前的检查、UI Workflow、*Where the rules live* 索引表；
   - README Getting Started 加上测试命令；
   - tracker 删掉 Step 5，写 Update Log；
   - spike 归档。

## 待 owner 决定的问题

**Q1 · 工具和测试文件的位置。** 工具用 Vitest 5 + Playwright？测试文件放哪：

- **(a) 和源码放在一起**（推荐）：`src/utils/dateUtils.test.ts`、`src/services/planService.int.test.ts`；e2e 放在根目录的 `e2e/`；共用 helper 和测试约定的 README 放在根目录的 `test/`。
- **(b) 集中放**：`tests/unit`、`tests/integration`、`tests/e2e`。

**Q2 · service 测试连真实 Postgres，不 mock DAL？** 推荐连真实 DB（方案 A），每个 test 用一个随机 `userId` 隔离。mock 只留给 Supabase Auth（`getClaims`）和时间。

**Q3 · 云端 agent 跑 integration test 用哪个 Postgres？**

- **(a) 只用本地栈**（Step 4 的 `db:setup`）：和 Mac 上一致；但云端第一次要拉约 4 GB 镜像，等几分钟。
- **(b) 栈没起时，退回容器预装的 Postgres 16**（推荐）：2 秒起来，适合只改逻辑的任务。它和 prod 的 17 差一个大版本，由 CI 的 17 兜底。

**Q4 · 时区。** unit 和 integration 都在 `UTC`（Vercel）和 `America/Los_Angeles`（owner 的 Mac 上跑 `next dev` 的时区）各跑一遍？推荐都跑：只多花约 1 秒，而以前的日期 bug 就出在时区上（见 `normalizeForDate` 的注释）。

**Q5 · e2e 的范围。** 每页 smoke（两个视口）+ Design Console smoke + 4 条关键路径，用一个独立的 e2e user。有要加或者要去掉的吗？

**Q6 · e2e 在 CI 里什么时候跑？**

- **(a) 每个 PR 都跑**（推荐）：和其他 job 并行；public 仓库不花钱；只有失败时 agent 才需要看。
- **(b) 只在改了 `src/`、`prisma/`、`e2e/` 的 PR 上跑**：纯文档的 PR 能省下 5–8 分钟。
- **(c) 只在 main 上跑**：PR 里就看不到 e2e 的结果了。

**Q7 · coverage 门槛。** `utils` lines 90% / branches 80%，services + DAL lines 80%，其余目录不设；只升不降。可以吗？

**Q8 · agent 验收按上面的分级表执行？** 还是更激进：agent 永远不开浏览器，全交给 CI + owner；或者更保守：所有 UI 改动 agent 都自验？

**Q9 · 需要看图时交给新开的 subagent？** 推荐先试：实施这一步时挑两三个 UI 任务，对比在主上下文里自验和交给 subagent 自验各花多少 token。

**Q10 · 这一步不做组件测试和视觉回归，等 Phase 2 的 UI 稳定后再评估？** 推荐是。
