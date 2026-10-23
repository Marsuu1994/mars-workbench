# Spike: Native iOS app + desktop，共用一套 data source

**Status: awaiting owner review** · 2026-10-23（owner review 见 PR #81）· 回答 tracker 条目 *Native iOS app + desktop on one data source*（Cross-cutting › High）· 基于 main `28a8553`（#79）· 起因：owner 在对话里提出，见下文 Trigger · 相关：`src/app/api/mcp/route.ts`、`src/mcp/middleware/auth.ts`、`src/services/`、`src/schemas.ts`、`src/utils/`、`src/proxy.ts`、`public/manifest.json`、`design/baseline.md` › Architecture Decision、`design/flows/auth.md`

> 语言约定：叙述用中文；产品名词、平台和工具名、代码标识保留英文（habit / project / step / one-off、SwiftUI、WidgetKit、App Intents、Expo、TestFlight、`ensureSynced`、`getClaims()`），和代码、tracker 一一对应。

这份 spike 分六部分：起因和现状；所有方案都绕不开的硬约束；Part A 到 D 四个问题（data source、iOS 用什么写、desktop 指什么、范围和先后），每个都有选项、对比和推荐；推荐路线和备选路线的实施计划；本次在云端容器里的验证；待 owner 决定的问题，编号方便逐条回复。

**结论先行**：

- **Data source → A1**：在现有的 Next.js 上加一层给自家客户端用的 app API（`/api/v1`）。它和 `/api/mcp` 一样是 services 前面的一层薄壳，用 Supabase session 的 bearer token 鉴权。DB、业务规则、sync 都只有一份；web 继续用 Server Components 和 Server Actions，不用迁移。
- **iOS → B1 SwiftUI**：iPhone 和 iPad 一个 app，带 widget extension。做成 native 能拿到的东西（widget、App Intents，以及可能的 Mac 版）在 SwiftUI 里都是一等公民；代价是第二种语言、view 推导逻辑要移植一份、UI 只能在 macOS 上编译。B2（Expo）是可信的备选，两者的取舍集中在 Q2。
- **Desktop → 先 C1**：现在的 web 就是 desktop 版，不动。Mac 原生版等 iOS 稳定后，从同一份 SwiftUI 代码加一个 target（Q1）。
- **范围和先后**：先做 app API，再做 iOS 的「执行」部分：board、matrix、dump、widget。Plan 和 project 的编辑先留在 web 和 Claude 里，等 Phase 2 重做 plan 之后再上原生（Q4、Q7）。
- **本次验证**：仓库现有的 26 个 zod schema 全部能用 zod 4 自带的 `z.toJSONSchema()` 转成 JSON Schema。用其中的真实 schema 拼一份 OpenAPI 文档，`swift-openapi-generator` 能在云端 Linux 容器里生成 Swift client 并编译；一份由 TS 函数导出的 golden fixture 在 Swift 端逐条通过，Swift 端算错时测试会红。还发现一个坑：nullable 字段必须按 OpenAPI 3.0 写，否则生成器会悄悄丢掉它。详见「本次验证」。

## Trigger · 起因

- **2026-09-22**：owner 问，想让项目在 iOS 上支持原生 widget，PWA 是不是就不行了。结论是不行：WidgetKit 只接受原生 app 里的 SwiftUI 视图。第二天 owner 问 React Native 是不是要全部重写、desktop 能不能一起用。
- **2026-10-23**：owner 的想法变了，不再只是给 PWA 补一个 widget，而是「真正开始把 app 做成一个 native iOS app，同时也支持 desktop version，二者共用一套 data source」，要一份 spike。
- 这一个月仓库变了很多：AI planning 只走 Claude 的 MCP，有了本地 Supabase 栈和三层测试，Quality gate 还剩 Step 6 到 10。这份 spike 按 main 的现状写。

## 现状 · What's there today

1. **只有 web 一个客户端，也没有给客户端用的 API。** 读：Server Components 直接调 services（`fetchBoard` 等）。写：29 个 Server Actions，其中 6 个其实是读。Route handlers 只有 auth callback 和 MCP。Server Actions 是 Next.js 的内部协议，action id 随 build 变化，原生客户端没法稳定地调用。所以不管 iOS 用什么写，都要先有一层 HTTP API。
2. **MCP 已经证明 services 能服务第二个客户端。** `/api/mcp` 是 services 前面的另一层薄壳：bearer token，`getClaims()` 按 project 的 JWKS 本地验签，zod 校验，再调 service。但它是给 LLM 用的：工具是粗粒度的 patch，报错是写给 Claude 读的英文句子，而且只收带 `client_id` 的 OAuth token，故意拒绝浏览器 session 的 token。能复用的是它的结构和验签，不是工具本身。
3. **读有副作用：`ensureSynced`。** 每天第一次读时，sync 把过期的 daily task 标成 EXPIRED、生成今天的 instances；一周结束时把 plan 翻成 PENDING_UPDATE。root layout 和各个 service 在读之前都会调它。所以新客户端要么经过 server 读（API 调 service，自然触发），要么先让 cron 接手（tracker › Cross-cutting › Future 的 Cron-driven sync）。客户端直连 DB 读会绕过它。
4. **Server shapes inputs, the client derives the view。** Service 返回 DAL 形状的行，比如 `fetchBoard` 返回 `{plan, tasks, progress, projects}`。卡片、habit 的周点、step 的 path 在客户端由 `src/utils/` 里的纯函数推导（`boardCardUtils`、`taskUtils`、`projectUtils`、`planUtils`、`dateUtils`）。另一个 TS 客户端能直接用这些函数；Swift 客户端要移植一份。
5. **「今天」由 server 决定。** `KANBAN_TZ = America/Los_Angeles`，今天、ISO 周的 `periodKey`、Today ring 的窗口都按它算。`forDate` 是 Postgres 的 DATE，Prisma 读出来是 UTC 零点，`normalizeForDate` 专门处理这件事；测试已经抓到过两个时区 bug。手机换了时区，设备上的「今天」可能和 server 不一样。
6. **登录全是 web 流程。** Google OAuth 走浏览器跳转，session 是 `@supabase/ssr` 的 cookie，由 proxy 刷新。另有 Supabase 的 OAuth 2.1 server，只给 MCP 客户端用。
7. **PWA 只是可安装。** 有 `manifest.json` 和一个空的 `sw.js`，没有离线，没有推送。Theme 存在 cookie 里，不在 DB。
8. **开发流程全在 Linux 上。** 云端 agent session 和 CI 都是 Linux；UI 验收靠 Chromium 打开 Design Console 和 Playwright，owner 在 Vercel preview 上验收。这些都编译不了、也跑不了 iOS app，Xcode 只在 macOS 上有。仓库是 public 的。

代码量（不含测试）：

| 层 | 行数 | 多一个客户端时 |
| --- | --- | --- |
| UI：`components/`（ui 1.2k、application 0.5k、domain 7.0k）加页面 0.7k | ~9.4k | 新客户端重写 |
| 主题：`globals.css`（3 个 theme 加 `fx-*`） | 1.4k | 新客户端重做 |
| Design Console（`src/app/design/`） | 4.8k | 只覆盖 web |
| 客户端也用的逻辑：`utils/` 1.4k（含只在 server 用的 `statsUtils`）、`types/` 0.35k、`schemas.ts` 0.55k、`en.json` 373 行 | ~2.7k | TS 客户端直接用；Swift 要移植或生成 |
| Server：services 2.3k、DAL 1.7k、actions 0.6k、MCP 0.5k | ~5.1k | 不动，两个客户端共用 |

## 要回答的问题

1. **Data source**：两个客户端怎么共用一份数据、一份业务逻辑（Part A）。
2. **iOS 客户端**用什么写（Part B）。
3. **Desktop** 指什么（Part C）。
4. **范围和先后**：iOS 第一版做哪些，和 Quality gate、Phase 2 怎么排（Part D）。

不在范围内：Android、Apple Watch、收费和上架运营。

## 硬约束 · Facts every option lives with

- **Widget 只能是原生的。** Home Screen、Lock Screen 和 StandBy 的 widget 由 WidgetKit 按 timeline 渲染 SwiftUI 视图，不跑 WebView，刷新预算由系统控制。iOS 17 起，widget 上的按钮和开关可以跑 App Intent，它的 `perform()` 是 `async` 的，可以直接调 API。iOS 26 起，server 可以通过 APNs 推一条 WidgetKit push 让 widget 重载，有频率限制。
- **Google 不允许在内嵌 WebView 里登录。** 原生 app 要么用 `ASWebAuthenticationSession`（系统的登录弹窗）跑 Supabase 的 OAuth 和 PKCE，要么用 Google Sign-In SDK 拿 ID token，再调 `signInWithIdToken`。
- **上 App Store 才有的要求**（只走 TestFlight 内部测试时都不需要）：
  - 审核指南 4.8：用了 Google 这类第三方登录，就要再提供一个同等的、隐私友好的登录方式：只收 name 和 email，能隐藏 email，不做广告追踪。审核通常指向 Sign in with Apple。
  - 审核指南 5.1.1(v)：能创建账号的 app，必须能在 app 内发起删除账号。现在的 app 没有这个功能。
  - 还要一个隐私政策页，和 App Store 上的隐私标签。
- **分发**：Apple Developer Program 每年 99 美元。免费 Apple ID（Personal Team）签的包 7 天过期，最多 3 台设备，没有推送，也不能用 TestFlight。TestFlight 内部测试不经过审核，每个 build 90 天后过期。Xcode Cloud 每月含 25 小时计算时间。GitHub Actions 的标准 macOS runner 对 public 仓库免费。
- **Supabase session**：access token 默认 1 小时。refresh token 只能用一次；10 秒内的重复使用会被容忍，超过就整条 session 被吊销。App 和 widget extension 是两个进程，要共用一份 session：supabase-swift 的 `KeychainLocalStorage(accessGroup:)` 能把 session 放进共享的 Keychain access group。
- **Sign in with Apple 和现有账号**：Supabase 会把 email 已验证且相同的新 identity 挂到已有的 user 上（本地 Google 登录时验证过，见 Update Log 2026-10-21）。用 Apple 登录时如果选了 Hide My Email，email 是 relay 地址，会新建一个空 user，看不到原来的数据。
- **Mac**：iPhone 和 iPad app 不用移植就能在 Apple Silicon 的 Mac 上跑（Designed for iPad）。要真正的 Mac 界面，就是 Mac Catalyst，或者 SwiftUI 的 macOS target。macOS 14 起，Mac 桌面可以直接放 iPhone 的 widget。
- **Expo 现状**（B2 用得到）：SDK 57 是 stable（React Native 0.86），SDK 58 在 beta（RN 0.88，面向 iOS 27）。`@expo/ui`（在 JS 里用 SwiftUI 控件）和 `expo-widgets`（用 React 组件写 widget 和 Live Activity）都在 SDK 56 转为 stable。`expo-widgets` 的组件跑在一个独立的 runtime 里，不能用 hooks，也不能做异步；数据由 app 用 `updateSnapshot` 和 `updateTimeline` 推进去。Widget 上的按钮能就地更新自己的 props，但 app 进程活着时才收得到这次点击（`addUserInteractionListener`）。所以「在 widget 上把 habit 标成 done 并写回 server」要另写一个 Swift 的 App Intent。

## Part A · Data source：两个客户端怎么共用

### A1 · 在 Next.js 上加一层 app API（`/api/v1`）✓ 推荐

和 `src/mcp/` 平行的一层：

```text
src/api/                     # 新：给自家客户端（iOS，以后的 Mac）用的 HTTP API，和 mcp/ 一样薄
├── middleware/              #   auth（session bearer token）+ runRoute（错误形状、状态码）
├── routes/                  #   一个资源一个文件：zod 校验 → service → JSON
└── openapi.ts               #   从 zod schema 生成 OpenAPI 文档
src/app/api/v1/**/route.ts   # 每个文件一两行，交给 src/api/
```

- **鉴权**：`Authorization: Bearer <Supabase session 的 access token>`。验法和 MCP 一样用 `getClaims()`：JWKS 本地验签，检查 `iss`、`exp`、`sub`。区别只在 `client_id`：`/api/mcp` 只收带 `client_id` 的 OAuth token，`/api/v1` 只收不带的 session token。这样 Claude 拿到的 token 调不了 app API，app 的 token 也调不了 MCP。`proxy.ts` 的 matcher 像排除 `api/mcp` 一样排除 `api/v1`，由 API 自己回 401，而不是跳到登录页。
- **形状**：endpoint 直接返回 services 现在的返回值，和页面拿到的一样，比如 board 就是 `BoardData`。View 由各个客户端自己推导，*Server shapes inputs* 这条规则不变。日期字段约定两种写法：DATE（`forDate`）用 `"YYYY-MM-DD"` 字符串，时刻（`doneAt`、`createdAt`）用 ISO 8601 的 UTC。另有一个 `GET /api/v1/today`，返回 server 的今天、`periodKey`、`KANBAN_TZ` 和 ACTIVE plan 的 id，客户端永远不用设备时区去算「今天」。
- **Sync**：endpoint 调的 services 本来就先 `ensureSynced`，读的行为和页面一样；dump 不需要 sync，和页面一样不调。
- **契约**：请求的 zod schema 已经有了，本次验证全部能转成 JSON Schema。响应现在只有 TS 类型，要补上 zod 的响应 schema，并在 integration test 里用它 parse 真实的 service 返回值，防止两边漂移。生成的 `openapi.json`（OpenAPI 3.0.3，原因见「本次验证」第 3 条）提交进仓库，CI 检查它和代码一致，就像 MCP 的 `tools/list` snapshot。Swift client 由 `swift-openapi-generator` 从它生成。
- **版本**：Vercel 每次 merge 就部署，手机上的 app 要等 TestFlight 或 App Store 才更新，两边总有版本差。规则：`v1` 里只做加法（新 endpoint、新的可选字段）；删字段或改含义就开 `v2`。`openapi.json` 的 diff 让每次契约变化都出现在 PR 里。
- **错误**：一个形状 `{error: {code, message}}` 加 HTTP 状态码。`code` 是给程序判断的枚举，`message` 给人看。这和 Quality gate Step 7 的「一套 typed error，按 surface 映射」是同一件事，API 是继 forms、MCP 之后的第三个 surface，应该和 Step 7 一起定，至少不能和它冲突（Q7）。
- **Web 不用动**：web 继续用 Server Components 和 Server Actions，两个客户端调的是同一批 services。Web 以后要不要也改走 API，是 Step 7（mutation layer）的事，这里不绑定。
- **两端的新鲜度**：手机上改了，桌面上已经打开的 board 不会自己变，下次导航或刷新才看到；今天两个浏览器 tab 之间也是这样。最小的补法是 web 在窗口重新获得焦点时调一次 `router.refresh()`。要实时就上 Supabase Realtime，先不做。

**优点**：

- DB、业务规则、sync、事务只有一份，还是 TS，还被现有的 integration test 覆盖。
- 对任何客户端技术都成立：Swift、RN、以后的 Mac。
- 鉴权完全复用 MCP 已上线的验签，Supabase 只需要多一个 app 的 redirect URL。
- 对现有 web 零改动，可以先于 iOS 单独上线、单独测试。

**缺点**：

- 写操作必须联网，离线只能做只读缓存（够不够见 Q8）。
- 多维护一层二十个左右的 endpoint 和它们的响应 schema。
- 要守版本纪律：已经装在手机上的 app 还在调旧字段。
- 手机的每次请求都到 Vercel function，冷启动和 Vercel 到 Supabase 的区域决定延迟，今天的页面也一样。

**第一批 endpoint**（按 Part D 的范围，iOS 第一版要用的）：

| Endpoint | 调用 | 对应现在的 |
| --- | --- | --- |
| `GET /today` | `ensureSynced`、date utils | root layout 的 sync |
| `GET /board` | `boardService.fetchBoard`、`getEmptyBoardState` | `/kanban` |
| `PATCH /tasks/{id}`（`status`） | `db/tasks.updateTaskStatus` | `updateTaskStatusAction` |
| `GET /matrix` | `matrixService.fetchPriorityMatrix` | `/kanban/priorities` |
| `POST /one-offs`；`PATCH /one-offs/{id}`（`quadrant`）；`POST /one-offs/{id}/track`、`/complete`、`/undo-complete` | `createMatrixTasks`、`updateAdhocTaskQuadrants`、`matrixService.*` | `createAdhocTaskAction` 和 matrix 的 4 个写 action |
| `GET /dump`（cursor）；`POST /dump` | `db/dumpEntries` | dump 的 2 个 action |
| `GET /projects`；`POST /steps/{id}/schedule`、`/unschedule` | `projectService.*` | Projects 页 |

前缀 `/api/v1` 省略。Plan、template 和 project 编辑的 endpoint 留到 Part D 的第二阶段。

### A2 · 客户端直连 Supabase（PostgREST + RLS）

- **做法**：iOS 用 supabase-swift 直接查表，Postgres 开 RLS（`user_id = auth.uid()`，tracker › Auth › Future 已经有这一条）。
- **优点**：不用写 API 层；Supabase Realtime 能直接订阅变化。
- **缺点**：
  - 业务逻辑都在 TS services 里：plan 的创建和更新事务、step 重新编号、carry-over、matrix 的 complete 和 undo。直连就要把它们改写成 Postgres function，或者在 Swift 里再写一份，变成两份业务规则。
  - 直连读会绕过 `ensureSynced`：今天的 daily task 不会生成，必须先上 cron 和数据库函数。
  - Schema 归 Prisma 管，暴露给 PostgREST 还要管 grants 和 RLS；现在 19 个 migration 里一条 policy 都没有。
- 不推荐。

### A3 · Local-first：A1 再加一个同步引擎（比如 PowerSync）

- **做法**：手机上放一份 SQLite，按 `user_id` 同步这个用户的行。读本地；写先进上传队列，再经 A1 的 endpoint 写回 Postgres。
- **优点**：完全离线，界面零等待；widget 直接读同一个 SQLite（放在 App Group 里）。
- **缺点**：
  - 多一个服务（PowerSync Cloud 或自己部署），Supabase 要开 logical replication。PowerSync 的文档提醒：闲置的小实例上 WAL 会涨，可能把磁盘占满。
  - 客户端不再经过 server 读，`ensureSynced` 不会被触发，daily 生成必须先改成 cron。
  - Board 的 metrics 是 server 算的，本地要么重算一份，要么等同步。
  - Sync rules 和冲突处理都是新东西；PowerSync 的 Swift SDK 文档里还写着 beta。
- **现在不做**：先 A1，加一层只读缓存；真要离线时再上 A3。A1 的写 endpoint 正好就是 A3 的上传路径，不浪费。

### 考虑过、不提议

- 直接拿 `/api/mcp` 当 app API：工具是给 LLM 设计的（粗粒度 patch、英文报错、要 OAuth 的 `client_id`），不适合 UI。
- tRPC：客户端只能是 TS，Swift 用不了。GraphQL：对二十个左右的 endpoint 来说太重。
- Supabase Edge Functions：等于在 Deno 里再写一份 services。

### 对比

| | A1 · `/api/v1` | A2 · 直连 Supabase | A3 · A1 + 同步引擎 |
| --- | --- | --- | --- |
| 业务逻辑 | 一份（TS services） | 两份（TS，加 SQL 或 Swift） | 写一份，本地另有读模型 |
| `ensureSynced` | 照常 | 要先上 cron | 要先上 cron |
| 离线 | 只读缓存 | 只读缓存 | 完整 |
| 新服务 | 无 | 无 | 同步服务、logical replication |
| 对 web 的改动 | 无 | RLS migration | 无 |
| 工作量 | M | L | L 以上 |

## Part B · iOS 客户端用什么写

### B1 · SwiftUI（iPhone 和 iPad 一个 app）✓ 推荐

结构（放在同一个仓库里，见 Q10）：

```text
apple/
├── MarsWorkbench.xcodeproj
├── App/                     # SwiftUI app：Today（board）、Matrix、Dump、Settings
├── Widgets/                 # WidgetKit extension + App Intents
└── MarsCore/                # Swift package，不 import SwiftUI / UIKit，Linux 上也能编译、测试
    ├── API/                 #   swift-openapi-generator 从 openapi.json 生成的 client
    ├── Session/             #   supabase-swift、共享 Keychain、App Group 里的快照
    └── Derive/              #   移植的 view 推导：卡片、habit 周点、step path、日期
```

- **登录**：supabase-swift。Google 用 `signInWithOAuth`，内部走 `ASWebAuthenticationSession` 和 PKCE，回跳到 `marsworkbench://auth-callback`。Prod 和本地栈（`supabase/config.toml`）的 redirect URL 白名单都要加上它；现有的 Google OAuth client 不用改。上 App Store 时再加 Sign in with Apple（`signInWithIdToken(provider: .apple)`）。
- **Session**：`KeychainLocalStorage(accessGroup:)`，app 和 widget 共用一份。
- **数据**：`MarsCore` 里的 API client。每次读完把快照写进 App Group；冷启动和 widget 先显示快照，再刷新（只读缓存，Q8）。
- **View 推导**：移植 `boardCardUtils`、`taskUtils`、`projectUtils`、`dateUtils` 里客户端用到的部分，估计 600 到 800 行 Swift。为了不漂移，仓库里放一份 **golden fixtures**：一个 TS 脚本用真实的函数算出一组输入的输出，写成 JSON；Vitest 和 Swift 的测试读同一份。TS 那边改了推导，Swift 的测试就会红。本次验证跑通了这个机制。
- **主题和文案**：一个脚本从 `globals.css` 读出各 theme 的变量，生成 Swift 的颜色 token（`check:themes` 已经在解析这些变量）；`en.json` 转成 String Catalog（`.xcstrings`），ICU 的复数转成 catalog 的 plural variations。视觉还原到什么程度见 Q6。
- **Widget 第一版**：Today（small 和 medium），列出今天还剩的 habit 和 step；点 ✓ 跑一个 App Intent，调 `PATCH /api/v1/tasks/{id}`，再重载 timeline。Lock Screen 放一个进度环。Timeline 约定在 `KANBAN_TZ` 的午夜之后重载（系统尽量照办），那次请求会顺带触发 server 的 daily sync。
- **App Intents**：「Dump 一条」「加一个 one-off」做成 Shortcuts 和 Siri 的动作，顺带覆盖 tracker › Dump 的「PWA "New entry" shortcut / share-target」。
- **验收**：mockup 仍是 `design/mockup/` 里的 HTML。实现之后，Xcode Previews 加 fixture 充当 native 的 scenario，snapshot test 在 macOS CI 上跑，owner 在 TestFlight 的 build 上验收，对应今天的 Vercel preview。
- **CI**：GitHub Actions 加一个 macOS job，只在 `apple/` 或 `openapi.json` 变了时跑 `xcodebuild build test`；`MarsCore` 另在 Linux job 里跑 `swift test`。上传 TestFlight 用 Xcode Cloud 或 fastlane。

**优点**：

- Widget、App Intents（Siri、Shortcuts、Control Center、Spotlight）、Live Activities、推送和 app 是同一种语言，共用 `MarsCore`；widget 上的按钮能直接写 server。
- 原生控件和手势（Liquid Glass、拖放、触感反馈、无障碍）不经过中间层。
- Mac 版是同一份代码加一个 target（Part C）。
- 没有 JS runtime，也没有框架的定期升级（Expo 大约每季度一个 SDK）。

**缺点**：

- 第二种语言：仓库现在全是 TypeScript。
- 推导逻辑有两份，靠 golden fixtures 守住；文案和主题要靠生成脚本同步。
- 云端 agent 只能编译、测试 `MarsCore`；app 和 widget 的 UI 只有 macOS（CI 或 owner 的 Mac）能编译。编译错误要等 macOS job 跑完才知道，回路比 TS 慢。每个新容器装 Swift toolchain 要下载约 1.1 GB。
- 没有 OTA：每次 UI 改动都要出一个 TestFlight build。
- Design Console 不覆盖 native，实现之后的 source of truth 从 scenario 页换成 Xcode Previews。

### B2 · React Native（Expo）

仓库先改成 workspace：

```text
apps/web/            # 现在的 Next.js，整体搬家
apps/mobile/         # Expo app（Expo Router）+ expo-widgets
packages/core/       # 从 src/ 抽出来：types、schemas、utils 里的推导、en.json
```

- **登录**：supabase-js 跑 OAuth 和 PKCE，用 `expo-web-browser` 打开系统登录弹窗；session 存在 `expo-secure-store`。
- **UI**：React Native 组件加 NativeWind，Tailwind 的 class 能带过去一部分；daisyUI 的组件和 `fx-*` 带不过去，要重做。关键控件可以用 `@expo/ui/swift-ui` 里的真 SwiftUI 控件。
- **看板拖放**：用 `react-native-gesture-handler` 和 `reanimated` 重写，web 的 `@hello-pangea/dnd` 不能用。
- **Widget**：`expo-widgets` 用 React 组件写，数据由 app 推进去。要在 widget 上直接标 done，得写一个 Swift 的 App Intent，放进自定义的 Expo module。
- **构建和发布**：EAS Build 在云端出 iOS 包，不需要 Mac；EAS Update 把纯 JS 的改动直接推到手机上，不过审核；每个 PR 可以出一个 preview update，这是最接近 Vercel preview 的东西。
- **过渡**：`'use dom'` 的 DOM components 能把现有的 web 组件（比如 plan form）先嵌进 app，再逐个换成原生的。

**优点**：

- 一种语言；`packages/core` 里的推导、schema、类型、文案两端直接共用，没有移植，也不需要 golden fixtures。
- 云端 agent 能跑 `tsc`、lint 和单元测试；EAS 在云端构建，owner 不开 Xcode 也能出包；JS 的改动走 OTA。
- Widget 也能用 React 写。

**缺点**：

- UI 照样全部重写（RN 不是 DOM），拖放和主题都要重做。
- 仓库要先改成 workspace：Next.js 搬进 `apps/web`，Vercel 的 root directory、CI、脚本、AGENTS.md 的目录结构都要跟着改。这一步本身就是一个大 PR。
- Widget 写回 server、Siri 和 Shortcuts 的动作还是要写 Swift。中间层多（RN、Expo SDK、native module 的兼容性），SDK 升级是定期成本。
- Mac 上现实的路线只有 Designed for iPad；`react-native-macos` 是另一套东西。
- 依赖 Expo 的云服务；EAS 的免费档每月构建次数有限，具体以 expo.dev 的价格页为准。

### B3 · Expo 同时出 iOS 和 web（react-native-web），取代 Next.js 的 UI

- 一套 UI 跑 iOS 和桌面浏览器，Next.js 只剩 API。
- 但这等于把 web 也重写一遍：三个 theme、Design Console、e2e、SSR 全部推倒；桌面上 hover、键盘和精细拖放都比现在的 DOM 版差。
- 不推荐。

### 考虑过、不提议

- **WebView 壳（Capacitor）加原生 widget**：拿到 widget 最快，但 UI 还是网页，不是 owner 要的「真正 native」。Google 登录要先走系统弹窗，再把 session 注入 WebView 的 cookie；纯壳上 App Store 还有审核指南 4.2（最低功能）的风险。
- **Flutter、Kotlin Multiplatform**：第三种语言，widget 照样要写 Swift。

### 对比

| | B1 · SwiftUI | B2 · Expo | B3 · Expo universal |
| --- | --- | --- | --- |
| 原生程度 | 最高 | 高（原生组件，`@expo/ui` 有 SwiftUI 控件） | iOS 高，web 变差 |
| Widget 直接写回 server | ✓ App Intent | 要另写 Swift | 要另写 Swift |
| Siri、Shortcuts、Live Activities | ✓ 同一套代码 | Live Activities ✓，其余要写 Swift | 同 B2 |
| 和 web 共享的代码 | 只有 API 契约（生成） | types、schemas、推导、文案 | 全部 UI |
| 云端 agent 能做的 | `MarsCore` 的编译和测试；UI 等 macOS CI | TS 全部；构建交给 EAS | 同 B2 |
| 发布 | 每次一个 TestFlight build | JS 改动走 OTA | 同 B2 |
| Mac | 同一份代码加 target | Designed for iPad | 浏览器 |
| 仓库改造 | 加一个 `apple/` 目录 | 改成 workspace | 改成 workspace，重写 web |
| 第一版工作量（Part D 的范围） | L | L，外加 workspace 改造 M | XL |

**推荐 B1，但它取决于 Q1 和 Q2**：owner 最早问的是 widget，这次又说要「真正 native」；desktop 如果以后要做成 Mac app，这三点都是 B1 最强。如果 desktop 只会是 web，而最在意的是开发速度、一种语言、agent 能独立完成大部分工作，B2 是更好的选择。

## Part C · Desktop 指什么

- **C1 · 现在的 web 就是 desktop 版**（推荐先这样）：什么都不用做，任何系统的浏览器都能用，包括不是 Mac 的电脑，也能装成 PWA。它直接调 services，和 iOS 背后是同一份数据。
- **C2 · Mac 原生 app**：
  - **Designed for iPad**：iPad 版直接在 Apple Silicon 的 Mac 上跑，零成本，但没有 Mac 的菜单和窗口习惯。
  - **SwiftUI 的 macOS target**（只有 B1 有）：共用 `MarsCore` 和大部分 view；侧栏用 `NavigationSplitView`，加上菜单、快捷键和一个菜单栏小窗（`MenuBarExtra`，适合 quick dump 和今天的进度）。
  - **Electron 或 Tauri 包一层现在的 web**：几乎零成本，但没有 widget，和 C1 差别不大。
- 不管选哪个，macOS 14 起 Mac 桌面都能放 iPhone 的 widget。
- **两套 UI 的长期成本**：只要 web 和 iOS 都是一等公民，之后每个 feature（包括 Phase 2）都要做两遍：两份 UI，两种验收（Design Console 和 Xcode Previews）。有三种走法：一直保持两端对等；iOS 只做每天执行的部分，规划留在桌面和 Claude；或者 iOS（加 Mac）追平之后，web 降到只修 bug。这由 Q1 和 Q4 决定。

## Part D · 范围和先后

### iOS 第一版做什么

推荐「执行」先行：

| 第一版：执行 | 先留在 web 和 Claude |
| --- | --- |
| Today（board）：Todo · Done、从 backlog 拉上来、habit 周点、step path、进度 | Plan form 和 template 编辑（Phase 2 会整个重做成 Plan week） |
| Priority matrix：Track this week、Done（带 undo）、换象限、加 one-off | Project 的新建、编辑和排序（「排进这周」第一版就有） |
| Dump：快速记录和 feed | Design Console |
| Widget 和 App Intents | — |

理由：

- 规划在手机上已经有一条路：plan、habit、project 都能通过 Claude 的 MCP 写，而在 claude.ai 加的 custom connector，Claude 的 iOS app 里也能用。
- Plan form 是最复杂的页面，Phase 2 又要把它整个重做，现在做原生版等于做两次。

### 和 Quality gate、Phase 2 的先后

相关的事实：

- Quality gate Step 7 要定 mutation layer 和 typed error，app API 的错误形状和它重叠；Step 9 定组件结构，只影响 web。
- Phase 2 会重做 plan（Plan week、habit 自带 cadence），Done 改成按天分组、卡片加 ✓；board 变了，iOS 的 board 也要跟着变。
- Daily rhythm（tracker）要手机通知，原生 app 能用本地通知和 APNs。

三种排法（Q7）：

- **S1 · 现在开始，和 Quality gate 并行**：app API 先上（纯加法，不碰现有页面），iOS 做执行部分；Phase 2 改 board 时两端一起改。
- **S2 · Quality gate 之后、Phase 2 之前**：API 的错误形状直接用 Step 7 的结论；Phase 2 的新页面从一开始就按两端设计。
- **S3 · Phase 2 之后**：UI 最稳定，返工最少，但开始得最晚。

各自的返工：

- **S1**：app API 的错误形状如果先于 Step 7 定，之后可能要改一次；先用一个以后能映射过去的最小形状，可以把这次改动压到 `runRoute` 一个文件。iOS 的 board 在 Phase 2 要跟着改 Done 列和卡片；matrix、dump、widget 和 API 的其余部分基本不受影响。
- **S2**：错误形状不返工；board 的返工和 S1 一样。
- **S3**：几乎不返工。

这是排期的取舍，由 owner 定。

## 推荐路线的实施计划（A1 + B1 + C1，执行先行）

| # | PR | 内容 | 大小 | 依赖 |
| --- | --- | --- | --- | --- |
| 1 | App API：骨架和读 | `src/api/`、session token 验签、`runRoute`、`openapi.json` 和 CI 检查、`/today`、`/board`、`/matrix`、`/dump`、`/projects` | M | 本 spike；错误形状看 Step 7 |
| 2 | App API：写 | task status；matrix 的 add、quadrant、track、complete、undo；dump；step 的 schedule 和 unschedule | M | 1 |
| 3 | iOS 骨架 | `apple/`、`MarsCore`、登录、共享 Keychain、App Group 快照、主题和文案生成脚本、macOS CI、TestFlight 流水线 | M–L | 1 |
| 4 | Today（board） | 推导移植和 golden fixtures；Todo · Done、backlog、卡片、拖动和 ✓ | L | 2、3 |
| 5 | Matrix 和 Dump | 两个页面 | M | 2、3 |
| 6 | Widget 和 App Intents | 可交互的 Today widget、Lock Screen、Dump 和 one-off 的 Shortcuts 动作 | M | 4 |
| — | 之后 | Projects、Plan（Phase 2 之后）、Mac target、推送（WidgetKit push、daily rhythm）、上 App Store 的要求（Q5） | — | — |

PR 1 和 3 可以并行；PR 4 和 5 可以并行。

### PR 1 — App API：骨架和读

- `src/api/middleware/auth.ts`：`verifyAppAccessToken`，和 `verifyMcpAccessToken` 共用验签那一段，只收不带 `client_id` 的 token。本地开发不加 dev identity：`npm run dev:session` 多输出一个 dev user 的 bearer token，给 curl 和手动测试用，生产代码不多一条 dev 分支。
- `src/api/middleware/runRoute.ts`：鉴权，zod parse，调 handler，把错误映射成 `{error: {code, message}}` 和状态码，最后 `NextResponse.json`。
- `src/api/routes/*.ts` 和 `src/app/api/v1/**/route.ts`；`proxy.ts` 的 matcher 排除 `api/v1`。
- 响应的 zod schema；`npm run api:openapi` 用 `target: 'openapi-3.0'` 生成 `openapi.json`，CI 检查生成结果和提交的一致（和 `check:themes` 同一种做法）。
- 测试：integration test 在进程里调 route，和 `/api/mcp` 的测试一样。每个 endpoint 至少有 happy path、401、别人的 id 返回 404，并用响应 schema parse 返回值。
- 文档：`baseline.md` › Architecture Decision 改写「No REST API routes」那一条；`reference.md` 加一张 app API 表，Principles 里「什么时候用 API routes」那句加上自家的原生客户端；AGENTS.md 的 Project Structure 和 Layers 加上 `src/api/`（「MCP tools 和 API routes 一样薄」）；`flows/auth.md` 加 `/api/v1` 的 token 规则。
- **Done when**：带 dev user 的 token 用 curl 能读到 seed 的 board；`openapi.json` 的检查进了 CI。

### PR 2 — App API：写

- 写 endpoint。`status` 设成同一个值是 no-op；新建 one-off 和 dump 第一版不做 `Idempotency-Key`（记在风险里）。
- **Done when**：integration test 覆盖每个写 endpoint；用 curl 走一遍「board 上标 done，matrix 上 complete，再 undo」。

### PR 3 — iOS 骨架

- Xcode 工程，最低系统 iOS 26（Liquid Glass、WidgetKit push、最新的 SwiftUI API；见 Q11）。iPhone 和 iPad 同一个 target，用 `NavigationSplitView` 适配大屏。
- `MarsCore`：`swift-openapi-generator` 的 build plugin 读 `openapi.json` 生成 client；session 和快照存储。
- 登录：Google，回跳 `marsworkbench://auth-callback`；prod 的 Supabase 和 `supabase/config.toml` 都加进 redirect 白名单。
- 主题和文案的生成脚本，放在 `scripts/`，CI 检查生成结果是最新的。
- 本地开发：模拟器和 Mac 共享网络，直接连 `npm run up` 起的 `localhost:3000` 和本地 Supabase；真机连 prod，或者 Mac 的局域网地址。
- CI：Linux job 跑 `MarsCore` 的 `swift test`，生成器的 warning 当成错误；macOS job 只在 `apple/` 变了时跑 `xcodebuild`。TestFlight 上传二选一：Xcode Cloud，或 GitHub Actions 加 fastlane。
- `apple/README.md` 写 Swift 的约定（命名、文件、Previews 就是 native 的 scenario），AGENTS.md › Where the rules live 加一行索引。
- **Done when**：TestFlight 上的空壳能用 Google 登录，读出 `/api/v1/today`。

### PR 4 到 6

- **PR 4 · Today**：`Derive/` 的移植，golden fixtures 放在 `test/fixtures/derive/`，由 Vitest 和 Swift 测试同读。两列 board、backlog sheet、卡片（kind 颜色、habit 周点、step path）、拖动和 ✓（Q4）。
- **PR 5 · Matrix 和 Dump**：matrix 在 iPhone 上沿用 web mobile 版的布局；dump 的 composer 和 feed。
- **PR 6 · Widget 和 App Intents**：timeline 在午夜之后重载；点 ✓ 写回 server，失败时退回快照。
- **Done when**：每个 PR 由 owner 在 TestFlight 上验收。

### 每个 PR 都要做的事

- API 改动和 Swift client 的重新生成放在同一个 PR 里。
- 文档：README Current State 加一个 iOS 小节，写 Update Log，tracker 的子条目做完一个删一个。

## 备选路线的实施计划（Q2 选 B2 时）

| # | PR | 内容 | 大小 |
| --- | --- | --- | --- |
| 1、2 | App API | 同上；TS 客户端可以直接用 zod 推出的类型，`openapi.json` 仍然保留，守版本纪律 | M、M |
| 3 | Workspace 改造 | Next.js 搬进 `apps/web`；`packages/core` 抽出 types、schemas、utils 的推导、`en.json`；Vercel 的 root directory、CI、scripts、AGENTS.md 跟着改；行为不变 | M |
| 4 | Expo 骨架 | `apps/mobile`、Expo Router、Supabase 登录和 secure store、EAS Build 和 Update、CI 的 typecheck 和测试 | M |
| 5 | Today（board） | RN 版 board，`gesture-handler` 和 `reanimated` 做拖动，推导直接 import `packages/core` | L |
| 6 | Matrix 和 Dump | 两个页面 | M |
| 7 | Widget | `expo-widgets` 的 Today widget；写回 server 的 App Intent 放进一个 Swift 的 Expo module | M |

## 本次验证（云端容器，2026-10-23）

在这个 session 的 Linux 容器里（Ubuntu 24.04，没有 Xcode），验证 A1 的契约链路，以及 B1 里云端 agent 能做的那一部分：

1. **zod → JSON Schema**：`src/schemas.ts` 导出的 26 个 schema，用 zod 4 自带的 `z.toJSONSchema()`（`target: 'openapi-3.0'`）转换，input 和 output 两个方向全部成功，不用加第三方库。`.refine()` 这类自定义校验转不过去，只留在 server 端，和现在一样。
2. **OpenAPI → Swift client**：用仓库里真实的 `updateTaskStatusSchema`，加三个原型响应 schema（`Today`、`Task`、`Error`），拼了一份两个 endpoint 的 OpenAPI 文档。Swift 6.4.1 的 Linux toolchain（下载 1.1 GB，签名验证通过）加 `swift-openapi-generator` 1.14.2 的 build plugin，生成了 types 和 client，带 bearer token 的 middleware 也编译通过。首次构建约 70 秒（拉依赖、编译生成器），之后增量约 8 秒。
3. **一个坑**：按 OpenAPI 3.1 生成时，zod 把 `.nullable()` 写成 `anyOf: [..., {type: "null"}]`。生成器不支持这种写法，会**悄悄丢掉整个字段**：`Today.activePlanId` 不见了，只留下一条 warning。改用 `target: 'openapi-3.0'`（`nullable: true`）后，生成的是 `String?`，正确。所以契约用 OpenAPI 3.0.3，CI 里把生成器的 warning 当成错误。
4. **Golden fixture**：TS 脚本用真实的 `getISOWeekKey`，算出 2024-12-20 到 2027-01-10 每一天的 `periodKey`，共 752 条，跨两个年界。Swift 端用 ISO 8601 日历移植同一个函数，`swift test` 逐条比对，全部通过。把 Swift 端故意换成 gregorian 日历，752 条里有 120 条对不上，测试变红；改回后全绿。
5. **没验证的**：iOS 的 UI、widget 和登录都需要 macOS，这个容器里做不了。App API 的 route 还没写；它的鉴权和已上线的 `/api/mcp` 是同一种做法，只是对 `client_id` 的要求反过来。

原型没有提交，只用来验证这几点。

## 待 owner 决定的问题

**Q1 · Desktop 指什么？**

- (a) 现在的 web（推荐先这样）；(b) Mac 原生 app；(c) 两个都要。
- 另外：会不会在非 Apple 的电脑上用（比如 Windows）？会的话，web 必须一直是一等公民。

**Q2 · iOS 用什么写？** B1 SwiftUI（推荐）、B2 Expo、B3 Expo universal（不推荐）。决定性的差别：

- 最看重 widget 能直接操作、Siri 和 Shortcuts、以后的 Mac 版、最原生的手感，能接受第二种语言和「UI 只能在 macOS 上编译」：选 B1。
- 最看重一种语言、和 web 共用推导逻辑、云端 agent 和 EAS 包办构建、JS 改动走 OTA，能接受 widget 写回要另写 Swift、仓库先改成 workspace：选 B2。

**Q3 · Data source**：A1（推荐）；A3 是以后真要离线时的升级；A2 不推荐。

**Q4 · iOS 第一版的范围**：

- (a) 执行先行（推荐）：board、matrix、dump、widget；plan 和 project 的编辑留在 web 和 Claude。
- (b) 和 web 完全对等。
- 另：iOS 的卡片要不要先有 ✓（web 要等 Phase 2）？推荐要：手机上点一下比拖动顺手。

**Q5 · 分发方式**（只列每种的要求，不做推荐）：

- (a) TestFlight 内部测试：要加入 Developer Program；不经过审核，不需要 Sign in with Apple 和删除账号；build 90 天过期，要定期出新包。
- (b) 上 App Store：在 (a) 的基础上，加 Sign in with Apple，加 app 内删除账号（删掉这个用户的所有行，再用 Supabase admin API 删 user；server 要多保管一个 secret key），加隐私政策页，每个版本过一次审核。
- (c) 不加入 Developer Program：免费签名 7 天过期，最多 3 台设备，没有推送和 TestFlight，widget 的 server push 也用不了。

**Q6 · 视觉**：

- (a) 完整还原 Mission Control HUD 的三个 theme（`mars-dark`、`mars-light`、`p5-dark`），颜色 token 从 `globals.css` 生成。`p5-dark` 的几何（半色调、平行四边形、斜切）在 SwiftUI 里要逐个重画，成本最高。
- (b) iOS 原生风格（Liquid Glass、系统控件），用品牌色和 kind 的颜色，第一版只做 `mars-dark` 和 `mars-light`（推荐）。
- (c) 第一版只做一个 theme。
- 另：theme 现在存在 web 的 cookie 里，iOS 自己存一份，两端不同步；要同步就得进 DB。

**Q7 · 先后**：S1、S2、S3 选哪个？各自的返工见 Part D；这是排期的取舍，不做推荐。

**Q8 · 离线**：

- (a) 只读缓存（推荐）：打开 app 和 widget 先显示上次的快照，写要联网。
- (b) 写也能离线（排队）：要上 A3，或者自己做队列和冲突处理。

**Q9 · Widget 第一版做哪些**：可交互的 Today（推荐）、本周进度、DO_FIRST 象限里的 one-off、Lock Screen 的进度环，选哪几个？

**Q10 · 仓库**：

- (a) 同一个仓库加 `apple/`（推荐）：API 契约和 Swift client 在同一个 PR 里改，「一个任务一个 PR」的规矩照旧。
- (b) 单独开一个仓库：两边的 PR 要配对，契约要发版本。

**Q11 · 设备和开发机**：

- 最低系统建议 iOS 26。owner 的 iPhone 和 iPad 都能升到 26 吗？
- iPad 第一版就做大屏布局吗？推荐做：同一个 target 里用 `NavigationSplitView`，成本不高。
- B1 需要在 owner 的 Mac 上装 Xcode，用来做 UI 迭代和真机调试；B2 可以只靠 EAS。

## 风险

- **两套 UI 长期漂移**，每个 feature 做两遍（Part C）。
- **版本差**：已安装的 app 还在调旧字段。靠 `v1` 只做加法和 `openapi.json` 的 diff 守住。
- **Refresh token 竞争**：app 和 widget 同时刷新，超出 10 秒的容忍期，整条 session 会被吊销，只能重新登录。共享 Keychain 让两个进程读到的永远是最新的 token，能把它压到很少见。
- **时区**：设备时区和 `KANBAN_TZ` 不同时，「今天」以 server 为准，出门旅行时会和当地日期差一天（tracker 已有 user-configurable timezone）。
- **午夜**：没人打开 app 时，widget 午夜之后的那次重载会顺带触发 daily sync；Vercel 冷启动可能让这次请求超时，widget 继续显示昨天。Cron 驱动的 sync（tracker 已有）能根治。
- **Hide My Email** 会新建一个空 user（只在 Q5 选 (b) 时出现）：登录页提示选 Share My Email，或者以后在 Settings 里做 identity linking。
- **云端 agent 写的 SwiftUI 在 macOS CI 之前都没编译过**：CI 红的次数会变多；`ci-fixer` 要能读 macOS job 的日志。
- **手机网络会重试**：新建 one-off、dump 这类不幂等的写可能重复，以后加 `Idempotency-Key`。
- **换域名**（tracker 的 Custom domain）：app 里配着 API 的 base URL 和 Supabase 的 redirect，换域名要出新版本。Base URL 放在 build setting 里，至少改起来不用动代码。

## 和 tracker 的关系

- **Dump › PWA "New entry" shortcut / share-target**：iOS 的 App Intents 和 share extension 能覆盖它。
- **Daily rhythm**：原生 app 能用本地通知和 APNs；它的 spike 在 PR #33。
- **Cron-driven sync**：有了 widget（还有以后的 A3），它的价值变大。
- **User-configurable timezone**、**Custom domain**：见风险。
- **Auth › RLS**：只有 A2 需要。

## 拍板之后

1. Decision 一节记下 Q1 到 Q11 的结论，Status 改成 decided。
2. Tracker 的这一条改成每个 PR 一个子条目。
3. 按 AGENTS.md › *One task, one branch, one PR*，这个 session 接着做的实现留在本 PR；之后的 PR 按 tracker 的子条目逐个来。这份 spike 拍板后不再更新，进度记在 tracker 和 Update Log。

## 参考

- App Review Guidelines（4.2、4.8、5.1.1(v)）：<https://developer.apple.com/app-store/review/guidelines/>；删除账号：<https://developer.apple.com/support/offering-account-deletion-in-your-app>
- 会员对比（免费签名的限制）：<https://developer.apple.com/support/compare-memberships/>；Xcode Cloud：<https://developer.apple.com/xcode-cloud/>
- WidgetKit push：<https://developer.apple.com/documentation/widgetkit/updating-widgets-with-widgetkit-push-notifications>
- Supabase sessions（token 有效期、refresh token 的重复使用）：<https://supabase.com/docs/guides/auth/sessions>；Swift 的 `signInWithIdToken`：<https://supabase.com/docs/reference/swift/auth-signinwithidtoken>
- Expo：`expo-widgets` <https://docs.expo.dev/versions/latest/sdk/widgets/>；Expo UI 转 stable <https://expo.dev/blog/expo-ui-stable-sdk-56>；SDK 58 beta <https://expo.dev/changelog/sdk-58-beta>；DOM components <https://docs.expo.dev/guides/dom-components/>
- PowerSync 和 Supabase：<https://docs.powersync.com/integrations/supabase>
- Swift OpenAPI Generator：<https://github.com/apple/swift-openapi-generator>
- Claude 手机 app 用 custom connector：<https://support.claude.com/en/articles/11503834>
