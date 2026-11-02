# Spike: e2e 的数据隔离 — 每个 test 一个 user，只铺自己要的数据

**Status: decided** · 2026-11-02 · 回答 tracker 条目 *Harness engineering › e2e data isolation* · 相关：PR #104（`ui-feature` skill、tagged `test.fail` contract，等本 spike 落地后再回看）、`design/spike/archived/test-baseline.md`（现在这套 e2e 的决策记录）、`test/README.md` › e2e

> 语言说明：正文中文；代码标识、文件名、Playwright / Prisma / Supabase 的概念保留英文（fixture / worker / storageState / `moduleFormat`），和代码、文档里的叫法一一对应。

## TL;DR

- **问题**：e2e 全部测试共用一个 e2e user 和一份 `seedWeek()` 铺好的周，`workers: 1`，journeys 是 `serial`。后一条依赖前一条留下的状态，断言写死 seed 的内容，加一条新测试就要改 seed、牵动别的断言。PR #104 的 review 里暴露出来：contract 要写数据，而写在共享数据上会让排在后面的测试在 design PR 和 implementation PR 之间表现不一样。
- **已定的方向**：照 Cal.com、Documenso、Formbricks、Epic Stack 的做法——**每个 test 一个新 user**，test 用 `test/factories.ts` 自己铺要读的数据，通过 API 登录；spec 按 flow doc 拆；去掉 `serial`，开 `fullyParallel`；每条测试在 desktop 和 mobile 两个视口各跑一遍。
- **关键阻碍已验证可解**：Prisma generator 加 `moduleFormat = "cjs"`（Cal.com 同款）后，Playwright 里能直接 import factories、services、DAL；typecheck、unit、integration、`next build`、dev 和 `next start` 运行时都通过。每个 test 的准备开销实测 0.1–0.45 秒。
- **本 PR 定标准、迁移现有测试，不补新覆盖**：现有 13 条产品测试（两个视口共 20 次运行）拆进 6 个 feature spec，7 条 Design Console 测试不动（见 *拆分计划*，每条注明来源）；flow doc 里还没覆盖的 journey 记在 `e2e/not-implemented.md`，留给 tracker 的后续条目（先 review flow doc，再补测试）。
- **对 contract 的意义**：contract 自己铺前置数据、写什么都只影响自己的 user、放进它所属 flow 的 spec——PR #104 讨论里的问题 1 和 5 不再存在。

## 起因

PR #104 的 review 讨论（2026-11-01）：

1. contract 的失败点经常在一次写操作之后（例如先把第二个 habit instance 放进 backlog，再断言 `×2`）。放进 smoke，它在 desktop 和 mobile 各写一次；放进 journeys 中间，它在 design PR 里写到一半就失败，到 implementation PR 完整跑完、写得更多，排在后面的 journey 可能因此变红，而不是因为实现有问题。
2. contract 需要的前置状态 seed 里没有时，只能改 `test/seedWeek.ts`，而它同时是 dev user 的数据和现有 smoke、journeys 断言的前提（"2 templates"、"Units 1–3 已在周里"、"两个 project"）。

owner 的判断：根子在 e2e 设计——测试之间、测试和 seed 之间没有隔离。

## 现状与回顾

### 现在怎么跑

| | 做法 |
| --- | --- |
| 数据 | 一个 e2e user（`E2E_USER`，固定 id），每次 run 前 `e2e:session` 删掉它的数据、用 `seedWeek()` 重铺一周，run 中途不再 reset |
| 登录 | 同一个脚本写出 `.auth/e2e-session.json`，所有测试共用 |
| 顺序 | `workers: 1`；smoke-desktop、smoke-mobile、design-console 跑完才跑 journeys（会改数据）；journeys 是 `mode: 'serial'`，一条依赖上一条的结果 |
| 为什么 spec 里不能直接造数据 | `test/README.md`：Playwright 按 CommonJS 加载 TypeScript，生成的 Prisma client 只支持 ESM（`import.meta.url`），所以数据库工作只能放进 tsx 脚本 |
| 耗时 | 27 次运行，本地复用 dev server 2.2 分钟（含首次编译；2026-11-01 云端容器实测） |

### 每个文件测什么

| 文件 | 测试 | 对应的 flow（`design/flows/`） | 读 / 改 seed 的什么 | 加进来的 PR |
| --- | --- | --- | --- | --- |
| `smoke.spec.ts`（desktop、mobile 各一遍） | S1 the board shows the week | board › Landing | 读 flashcards habit、course 的 Unit 2 | #75 |
| | S2 the priority matrix lists the open one-offs | priorities › Landing | 读 `SEED_ONE_OFFS` 第 3 条起 | #75 |
| | S3 projects list both projects | projects › Landing | 读两个 seed project | #75 |
| | S4 the plan form opens on this week's plan | plan › Update Plan（入口） | 读 review habit | #75 |
| | S5 the dump shows its entries and the composer | dump › Landing | 读第一条 dump entry | #75 |
| | S6 settings open from the navigation | auth › Theme Change / Sign-Out（入口） | — | #75 |
| | S7 a protected page sends you to sign in（未登录） | auth › Route Protection | — | #75 |
| `designConsole.spec.ts`（desktop） | 6 个 feature 的 scenarios render and play + gallery | 不对应 flow：Design Console 自己的冒烟 | 不碰数据库 | #75 |
| `journeys.spec.ts`（desktop，serial） | J1 a card dragged to Done stays done | board › Drag and Drop | 改：flashcards Todo → Done | #75 |
| | J2 a one-off tracked from the matrix lands on the board | priorities › Track This Week | 改：第 3 条 one-off 进本周 | #75 |
| | J3 a step put on this week lands in the board's backlog | projects › Schedule Step | 改：Unit 4 进本周；依赖 "Units 1–3 已在周里" | #75 |
| | J4 a habit removed from the plan leaves the board | plan › Update Plan | 改：删掉 review habit；断言 "2 templates" | #75 |
| | J5 the backlog takes focus only while it is open | board › Backlog（desktop 的 focus 规则） | 读：Unit 3 在 backlog | #78 |
| | J6 archived projects sit in a collapsed accordion | projects › Edit Project（archive）、Landing | 改：两个 project 先 archive 再 unarchive | #103 |

7 条 smoke × 2 个视口 + 7 条 Design Console + 6 条 journey = 27 次运行。

### 当时为什么这样分

- **按"怎么跑"分，不按 feature 分**（`test-baseline` spike Q5，PR #75，2026-10-21）。按成本分了三类：每页 smoke（只读、两个视口）、Design Console 冒烟（替掉 agent 每次自己写的检查脚本）、4 条关键路径（改数据、串行）。当时一共只有 20 来条，按"读 / 写"分最容易保证顺序：只读的先跑，改数据的放最后。
- **一个 e2e user、只在运行前清**（Q11）。本地跑 e2e 要复用正在跑的 `npm run dev`，它连的是 dev 的库，所以 e2e 必须换一个 user，不能动 owner 的 dev 数据。一个 user 对 20 来条测试够用；跑完不清，是为了失败后能登录那个 user 看现场。
- **数据在 Playwright 进程外准备**：因为 Prisma client 是 ESM，spec 里 import 不了，只能 globalSetup 起一个 tsx 脚本一次铺好。这条技术限制直接导致了"一份 seed 给所有人用"。

### 后来哪里开始别扭

- **journeys 变成了"所有改数据的测试"的去处**：#78（backlog focus）和 #103（archived accordion）都只能追加到 `journeys.spec.ts`，因为只有那里能改数据。一个文件横跨 board、priorities、projects、plan 四个 flow，顺序互相依赖。
- **设计和实现有偏差**：`test-baseline` 里 J1 写的是"进度数字跟着变，刷新后还在"，实际测试只断言了卡片在 Done，**没断言进度**；J2、J3 计划"在测试里新建一个 one-off / step"，实际用的是 seed 里现成的，于是和 seed 绑在一起。
- **断言依赖 seed 的细节（Mystery Guest）**："两个 project"、"2 templates"、"Units 1–3 已在周里"都要去 `seedData.ts` / `seedWeek.ts` 里找原因。
- **CI 竞态**：#79 加了 `waitForServerAction`，因为 CI 上导航会打断还没落库的 server action。这条做法要保留。
- **一直好用、要保留的**：按 role 和可见文字定位、`openPage()` 等 hydration、console error 让测试失败、`waitForServerAction`。

## 别人怎么做

### Playwright 官方

- "Each test should be completely isolated from another test"，包括 "data"；"If working with a database then make sure you control the data."（[best practices](https://playwright.dev/docs/best-practices)）
- serial："**Using serial is not recommended.** It is usually better to make your tests isolated, so they can be run independently."（[test-parallel](https://playwright.dev/docs/test-parallel)）
- 并行时隔离数据：用 `workerIndex` / `parallelIndex` "to isolate user data in the database"；登录文档的 *one account per parallel worker*：测试 "modify shared server-side state" 时，每个 worker 一个账号（[auth](https://playwright.dev/docs/auth)）。
- fixture：`test.extend()`，setup 和 teardown 写在一处，按需建立；可以是 test 级或 worker 级（[fixtures](https://playwright.dev/docs/test-fixtures)）。

Playwright 自己只隔离浏览器（每个 test 一个新的 BrowserContext），服务端数据的隔离留给应用。

### 测试数据的经典说法

- **Shared Fixture**：测试一旦修改共享 fixture，就会 "lead to Erratic Tests… because Shared Fixtures violate the principle of Independent Test"；只读的参考数据可以共享，会被修改的对象 "should be built by each test as a Fresh Fixture"。**Mystery Guest**：读测试的人看不到 fixture 和断言之间的因果，因为一部分在测试方法之外（Meszaros, [xUnit Test Patterns](http://xunitpatterns.com/Shared%20Fixture.html)）。
- **Object Mother vs Test Data Builder**：一份大而全的样本数据会造成 "heavy coupling in that many tests will depend on the exact data in the mothers"（[Fowler](https://martinfowler.com/bliki/ObjectMother.html)）；builder 带安全的默认值，每个测试只覆盖它关心的字段（[Nat Pryce](http://natpryce.com/articles/000714.html)）。`seedWeek()` 就是一个 Object Mother；`test/factories.ts` 已经是 builder 的样子。
- Cypress：不要用 UI 去造状态，用程序登录和造数据；"Tests should always be able to be run independently from one another and still pass"（[best practices](https://docs.cypress.io/app/core-concepts/best-practices)）。

### 开源项目（2026-11-01 读的各仓库默认分支）

| 项目 | 隔离单位 | 怎么造数据 | 登录 | 清理 | 并行 | spec 布局 |
| --- | --- | --- | --- | --- | --- | --- |
| **Cal.com** | 每个 test（`users.create()`） | Playwright 进程里直接用 Prisma；generator 是 `prisma-client` + **`moduleFormat = "cjs"`** | POST 真实的 credentials 登录接口 | 每个 spec `afterEach(users.deleteAll())`，只删本测试记下的 id | `fullyParallel`，CI 8 shard × 4 worker | 按 feature |
| **Documenso** | 每个 test（`seedUser()`） | spec 直接 import Prisma 包里的 seed 模块；`NODE_OPTIONS='--import tsx'` | POST 登录接口 | 基本不清，唯一的邮箱避免冲突 | `fullyParallel`，按 project 定 worker 数 | 按 feature |
| **Formbricks** | 每个 test | 直接 Prisma | POST 登录接口 | 不清（CI 库用完即丢） | `fullyParallel`，CI `100%` | 按 feature |
| **Epic Stack** | 每个 test（`login()` fixture） | 直接 Prisma（`"type": "module"`） | 直接写 session 行、签 cookie | fixture teardown 删 user | `fullyParallel`（SQLite 时 CI 1 worker） | 按 feature |
| Dub | 共享账号 | globalSetup 里用 Prisma | UI 注册一次 | 生产上的 cron 删老数据 | 大部分串行 | — |
| Twenty | 共享的 seed workspace | GraphQL | UI 登录一次 | fixture 删自己建的 | `workers: 1`（"tests can't be parallelized"） | — |
| Immich | 每个 file `TRUNCATE` | SDK / API | 注 cookie | 每个 file 开头清库 | 真后端 `workers: 1`；UI 测试改成 mock 网络才并行 | — |

**规律**：能并行的那几个（Cal.com、Documenso、Formbricks、Epic Stack）做法一致——一个 `test.extend` fixture 每个 test 建一个唯一的 user，在 Playwright 进程里直接用 Prisma 造数据，不经 UI 登录，spec 按 feature 拆。共享账号的那几个（Dub、Twenty、Immich 的真后端部分）都是串行，和我们现在一样。

Supabase 官方的 RLS 测试指南给的造 user 方式和这里一致：`auth.admin.createUser`（secret key，`email_confirm: true`），`signInWithPassword` 登录，id 用 `randomUUID()`（[testing RLS](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)）。我们的 `scripts/localAuth.ts` 已经是这样做的。

## 本地验证（云端容器，2026-11-01）

**1. Playwright 里 import factories（服务、DAL、Prisma）**

| 做法 | 结果 |
| --- | --- |
| 现状（`prisma-client`，默认 ESM） | 失败：`SyntaxError: Cannot use 'import.meta' outside a module` |
| generator 加 `moduleFormat = "cjs"` | 能 import；同时 `typecheck` ✓、`test:unit` 260 ✓、`npm test`（含 integration）446 ✓、`next build` ✓、`next dev` 和 `next start` 下页面读写数据库 ✓ |

没验证的：Vercel 上的 serverless 打包。implementation 的 Vercel preview 会顺带验证。

**2. 每个 test 的准备开销**（探针：每个 test 建 user、`createWeek` 铺一个 habit、`signInWithPassword` 写 storageState，然后打开 `/kanban` 断言看到自己的 habit）

| 步骤 | 耗时 |
| --- | --- |
| `auth.admin.createUser` | 85–135 ms |
| `createWeek`（一个 habit） | 30–300 ms（每个 worker 第一次较慢） |
| `signInWithPassword` + cookie | ~90 ms |
| 合计 | **0.1–0.45 s / test** |

8 条探针测试，4 个 worker，`next start`：8.7 秒全过，每个 test 只看到自己的数据。

**3. 顺带发现的两个问题**

- `getLocalSecretKey()`（`scripts/localEnv.ts`）每次调用都起一个 `npx supabase status` 子进程，约 2.5 秒。改成每个 test 建 user 后会让每个 test 多 2.5 秒，所以要在 globalSetup 里读一次，经环境变量传给 worker。
- Docker Hub 限流：`npm run db:setup` 拉 `kong:2.8.1` 时 `docker.io` 返回 429；换 `SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws` 一次成功。两边配额独立，失败时自动换另一个（Q7）。

## Decision · 拍板（2026-11-01 / 02，PR #105 第 1 轮 review 和会话里的讨论）

| 问题 | 决定 |
| --- | --- |
| Q1 · 隔离单位 | **每个 test 一个 user** |
| Q2 · Playwright 里怎么用 Prisma | **`moduleFormat = "cjs"`** |
| Q3 · 清理 | **不清**：CI 每次是新 runner；在本地跑 e2e 的是云端 session 的 agent，容器也是一次性的；dev user 看不到 `e2e-*` user 的数据，测试只读自己的 user |
| Q4 · 视口 | **每条测试 desktop 和 mobile 各跑一遍**，不用 `@mobile` tag 挑（后果见 *拆分计划 › 两个视口*） |
| Q5 · 并行度 | `fullyParallel`；CI 先用 2 个 worker，实测后再调 |
| Q6 · PR #104 | 先放着，e2e 落地后再回看 |
| Q7 · Docker 镜像源回退 | 放进本 PR |
| 范围 | 本 PR 定标准、迁移现有测试；没覆盖到的 journey 只列出来，不在本 PR 补 |
| 分层 | 按下面 *分层* 一节；component testing 这一层先不加 |
| Q8 · 选择性跑 e2e | 先量：implementation PR 报出全量和每个 spec 的耗时，再决定要不要"每个 PR 只跑改到的 feature + 定期全量" |
| Q9 · Design Console | 只跑 desktop |
| 拆分计划 | 按下面的表迁移；owner 认为问题主要在 flow doc 本身，flow doc 的 review 和据此补 / 改 e2e 是 tracker 的后续条目 |

## 拆分计划

### 文件和分组

- **一个 flow doc 一个 spec**：`board`、`plan`、`priorities`、`projects`、`dump`、`auth`。`shared.md` 的三个 flow（Ensure Synced、Daily Sync、End of Period Sync）都是日期逻辑，留在 integration 层（`test/README.md`：dates stay out of e2e）。
- **spec 里一个 flow 一个 `test.describe`**，名字就是 flow doc 的 `##` 标题（`'Drag and Drop Flow'`），这样测试报告和 flow doc 一一对应，以后核对覆盖面只要对标题。
- **每条测试独立**：自己的 user、自己铺数据、任意顺序都能跑。不再有 `serial`、project 之间的 `dependencies`。
- **`designConsole.spec.ts` 不动**，不碰数据库。

### 每条测试

"铺什么"一栏只写这条测试读到的东西，全部用 `test/factories.ts`（缺的 builder 加进去，保持默认值 + 覆盖的写法）。

**`board.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Landing Flow | the board shows the week | `smoke.spec.ts` S1 | 一周：一个 habit 在 Todo、一个 project step 在 Todo | 断言换成自己铺的标题，不再引用 `SEED_*` |
| Drag and Drop Flow | a card dragged to Done stays done, and the day's progress counts it | `journeys.spec.ts` J1 | 一周：一个 habit 在 Todo | **补上进度断言**（`test-baseline` 原本计划要测，实现时漏了）：拖动后今天的进度跟着加一，刷新后还在（具体断言的文字以 `ProgressDashboard` 实际显示的为准） |
| Backlog Flow | the backlog takes focus only while it is open | `journeys.spec.ts` J5 | 一周：一个 project step 在 backlog | 这条是 desktop 面板的规则（flow doc 写明），mobile 上 `test.skip` 并写明原因 |

**`plan.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Update Plan Flow | the plan form opens on this week's plan | `smoke.spec.ts` S4 | 一周：一个 habit | — |
| Update Plan Flow | a habit removed from the plan leaves the board | `journeys.spec.ts` J4 | 一周：两个 habit | 断言从 "2 templates"（三删一）改成 "1 template"（二删一） |

**`priorities.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Priorities Landing Flow | the priority matrix lists the open one-offs | `smoke.spec.ts` S2 | 两个不同象限的 one-off | — |
| Track This Week Flow | a one-off tracked from the matrix lands on the board | `journeys.spec.ts` J2 | 一周（空的也行）、一个 one-off | 在测试里新建 one-off（`test-baseline` 原计划如此）；desktop 用 hover → "Move task"，mobile 用点卡片 → bottom sheet |

**`projects.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Projects Landing Flow | projects list the active projects | `smoke.spec.ts` S3（原名 projects list both projects） | 两个 project | 标题不再写死"两个" |
| Schedule Step Flow | a step put on this week lands in the board's backlog | `journeys.spec.ts` J3 | 一周、一个两步的 project（都没上周） | 不再依赖 "Units 1–3 已在周里"；看 backlog 时 desktop 展开面板，mobile 打开 sheet |
| Edit Project Flow | archived projects sit in a collapsed accordion | `journeys.spec.ts` J6 | 两个 project | — |

**`dump.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Dump Landing Flow (View) | the dump shows its entries and the composer | `smoke.spec.ts` S5 | 一条 dump entry | — |

**`auth.spec.ts`**

| describe | 测试 | 来源 | 铺什么 | 改动 |
| --- | --- | --- | --- | --- |
| Route Protection Flow | a protected page sends you to sign in | `smoke.spec.ts` S7 | 不建 user（未登录） | — |
| Sign-Out Flow | settings open from the navigation | `smoke.spec.ts` S6 | 一个空 user | 只是归位；它测的是 settings sheet 能打开，Sign-Out 本身没测 |

合计：13 条产品测试 × 2 个视口 = 26 次运行（减去 J5 在 mobile 上 skip 的 1 次），加 Design Console 7 次，共 32 次；现在是 27 次。

### 两个视口

每条测试都跑两遍，带来两件要处理的事：

- **同一件事两个视口的操作不同**：backlog（desktop 面板拖动 / mobile sheet 点 `↑ Todo`）、Track This Week（desktop hover → 按钮 / mobile 点卡片 → sheet）。做法是把这类操作写成 `e2e/actions/` 下的小函数（`openBacklog(page)`、`trackThisWeek(page, title)`），函数里按 `isMobile` 分支，测试本身只写一遍。这和 Cal.com、Twenty 用的 page object 是一个思路，只是更薄。
- **只属于一个视口的规则**：flow doc 里明确只对一个视口成立的（J5 的 focus 规则只写了 desktop），在另一个视口 `test.skip(isMobile, '<flow doc 里的原话>')`。这是"这个视口不适用"，不是为了让 CI 变绿而跳过。
- **未验证**：J1 用的 `@hello-pangea/dnd` 键盘拖动在 390 宽的 mobile 布局下能不能用，迁移时第一个实测；不能用的话，mobile 上换成 flow doc 里 mobile 的操作方式。

Design Console 不跟着跑 mobile：它是开发工具，scenario 本身就在 frame 里画出手机宽度；tracker 里还有一个已知问题（desktop-only tab 在手机宽度下跑 play step 会打开 mobile sheet），在 mobile 视口跑它只会撞上这个问题（Q9）。

### 还没覆盖的 journey（本 PR 不补）

按 flow doc 对照，上表覆盖了 13 个 flow；其余的记在 `e2e/not-implemented.md`（每个 flow doc 一节，以及哪些 flow 本来就不进 e2e、在哪一层测）。一条测试落地时删掉对应的行。flow doc 本身也要先 review 一遍，才知道这份清单准不准：tracker 的后续条目。

### 公共的准备放在哪

数据隔离之后，"公共的 setup"分三层，只有第一层是全局的：

| 层 | 跑几次 | 放什么 | 不放什么 |
| --- | --- | --- | --- |
| `e2e/globalSetup.ts` | 每次 run 一次 | 读一次 secret key，放进环境变量给 worker | 任何数据：它不再铺 seed |
| `e2e/fixtures.ts` 里的 fixture | 每个 test 一次，自动 | `user`（建一个新 user）、`storageState`（让这个 test 以它登录）、`seed`（绑定了当前 user 的 factories） | 业务数据：fixture 只给工具，不替测试决定铺什么 |
| 测试自己 | — | 调 `seed.*` 铺它读的东西；一个 spec 里反复出现的形状，写成 spec 里的一个小函数显式调用 | `beforeEach` 铺一大份共享的世界（那又是一个 `seedWeek`） |

每个 spec 都从 `./fixtures` import `test`，所以拿 `page` 的测试自动有自己的 user，不用写 `beforeEach`：

```ts
// e2e/fixtures.ts（草图）
export const test = base.extend<{user: E2eUser; seed: Seed}>({
  user: async ({}, use) => use(await createE2eUser()),        // randomUUID + auth.admin.createUser
  storageState: async ({user}, use) => use(await signInAsStorageState(user)),
  seed: async ({user}, use) => use(bindFactories(user.id)),   // test/factories.ts，userId 已填好
});

// e2e/board.spec.ts
test.describe('Drag and Drop Flow', () => {
  test('a card dragged to Done stays done, and the day\'s progress counts it', async ({page, seed}) => {
    await seed.week({habits: [newHabit('Flashcards', TaskType.DAILY)], todo: ['Flashcards']});
    await openPage(page, '/kanban');
    // …
  });
});
```

未登录的测试照旧用 `test.use({storageState: {cookies: [], origins: []}})` 覆盖掉登录态，它不碰 `user`，也就不会建 user。

## 分层：一个行为该放哪一层

以"habit 拖到 Done，进度要对"为例，拆成三件事，各放一层：

| 要验证的 | 放哪 | 例子 |
| --- | --- | --- |
| 值算得对不对，含各种边界情况 | integration（服务 + 真数据库） | `boardService.int.test.ts` 的 "counts today's and the week's progress"：各种 status、size、日期组合下进度是多少 |
| UI 能不能把一个状态画对 | Design Console scenario（e2e 会把每个 tab 跑一遍） | 进度为 0、一半、满、超额时进度条的样子 |
| 整条链路接起来没有 | e2e，一条 journey 断言一次看得见的结果 | 拖动 → server action → revalidate → 页面上今天的进度跟着加一，刷新后还在 |

规则：**e2e 证明接通，不穷举组合**。一个组合要不要单独测，看它在哪一层出错：算错放 integration，画错放 scenario，只有"接错了"才需要 e2e 再多一条。component testing（React Testing Library 或 Playwright CT）适合复杂的客户端交互逻辑（optimistic update 回滚、拖动规则），仓库现在没有这一层，先不加。

## 选择性跑 e2e（owner 提的后续）

owner 的想法：每个 PR 只跑它改动到的 feature 的 e2e，全量回归放到两周一次的 quality sweep（tracker 里 Quality gate 的 Step 13）。先把这次拆完后的耗时量出来再定。

**先量什么**：implementation PR 在描述里写出全量 e2e 的耗时，和每个 spec（= 每个 feature）各自的耗时，两个视口分开。Playwright 的 JSON reporter 有每条测试的 duration，按文件加起来即可。

**选择性跑的两个难点**（供量完之后定）：

- **"改动到哪个 feature"不好判断**。e2e 测的是整个 app，一个 PR 改的往往是 service、DAL、schema 或 `domain/shared/` 这类多个 feature 共用的文件；`planningService` 一处改动会影响 board、plan、projects。常见做法是一张 feature → 路径的映射表，改到共用路径时退回全量跑。Playwright 1.46 起有 `--only-changed`，但它只顺着 spec 文件的 import 图找，app 代码的改动它看不到，帮不上这里。
- **回归晚发现的代价**：两周一次的全量跑出问题时，这两周的 PR 都是嫌疑，要二分查找。折中做法是每次 merge 到 `main` 后跑一次全量（或每晚一次），问题最多晚一天、只涉及几个 PR。

拆完以后如果全量本身就只要一两分钟，选择性跑省下的时间可能抵不过映射表的维护；量完再定（Q8）。

## 实施计划

一个 PR，按这个顺序提交：

1. **Prisma 在 Playwright 里可用**：generator 加 `moduleFormat = "cjs"`；删掉 `test/README.md` 里 "Specs can't import Prisma" 那条。
2. **Docker 镜像源回退**：`scripts/localDb.ts` 在 `docker.io` 拉取失败时用 `public.ecr.aws` 重试一次。
3. **fixture**（`e2e/fixtures.ts`）：
   - `user`：`randomUUID()`，邮箱 `e2e-<id>@mars.local`，`auth.admin.createUser`；
   - `storageState` 覆盖为 `signInAsStorageState(user)`，每个 test 自己的登录态；
   - globalSetup 读一次 secret key 放进环境变量；不做清理。
4. **视口操作**：`e2e/actions/` 下按 `isMobile` 分支的小函数（backlog、Track This Week），先实测 J1 的键盘拖动在 mobile 上能不能用。
5. **迁移 13 条产品测试到 6 个 spec**，按上面的表：每条只铺自己读的数据，断言不再引用 `SEED_*`，J1 补上进度断言。
6. **配置**：`fullyParallel: true`；`desktop` 和 `mobile` 两个 project 都跑全部产品 spec，`design-console` 只跑 desktop；去掉 `dependencies`；CI `workers: 2`。
7. **删掉不再需要的**：`E2E_USER`、`scripts/e2eSession.ts`、`npm run e2e:session`、`smoke.spec.ts`、`journeys.spec.ts`（`dev:session` 和 dev user 的 `seedWeek()` 保留）；knip 会指出剩下的。
8. **文档**：`test/README.md` › e2e（隔离、fixture 的三层、按 flow 分 spec 和 describe、两个视口、分层规则、contract 自己铺数据、`e2e/not-implemented.md` 怎么维护）、AGENTS.md › Commands、README › Tests。
9. **量**：本地和 CI 的全量耗时、每个 spec 的耗时，前后对比写进 PR 描述（Q8 的输入）。

## 顺带：agent 开发流程，别人是不是 spec 和 test driven

结论先说：**公开仓库里大多是 test-verified（测试来验收），真正 test-first、spec-first 的很少，多是可选或停在工具和研究里。**

- **工具**：GitHub spec-kit（specify → plan → tasks → implement，不要求先写测试）、AWS Kiro（requirements / design / tasks 三份文档，另有给小改动用的 Quick Spec）。Thoughtworks 的 Birgitta Böckeler 试用后的评价：Kiro 把一个小 bug 修复变成 4 个 user story、16 条验收标准，"like using a sledgehammer to crack a nut"；"I'd rather review code than all these markdown files"；而且 agent "ultimately not follow all the instructions"（[martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)）。
- **Anthropic 现在的文档**：核心是给 agent "something it can run that comes back pass or fail"——测试文件、和 mockup 并排的截图；"done" 是 "a failing test it has to turn green"（[best practices](https://code.claude.com/docs/en/best-practices)）。
- **真实仓库的 AGENTS.md / CLAUDE.md**：
  - Cal.com 有 spec-driven 流程，但写明 "Opt-In… when explicitly requested"，`specs/` 里实际只有一份；跑完整 e2e 要先问。
  - Documenso 最偏 e2e："Never mock. If a test would need a mock, write a Playwright E2E test… against the real database"；"Every assertion must be able to fail"。
  - Next.js 只规定怎么建测试、怎么在本地复现 CI。Supabase 把 `apps/design-system` 当 Studio UI 的 source of truth，和我们的 Design Console 一个思路。Twenty、Excalidraw、Zed 是约定和命令，没有流程。
- **e2e 当验收测试、交给 agent**：
  - Shipyard 的做法和我们最像：行为描述 → Playwright 测试 → 确认失败 → 实现到绿。
  - Playwright 1.56 起的 Test Agents（planner / generator / healer），但计划来自探索**已经在跑的 app**，healer 会改测试，和"固定的 contract"相反。
  - Slack Engineering（2026-06）：agent 生成的确定性 Playwright 测试，简单流程约 8% 失败、复杂流程约 48%，常在走到 70–80% 时断掉；他们的分工是 "Tests enforce journeys. Agents verify goals."（[slack.engineering](https://slack.engineering/agentic-testing-where-agents-fit-in-the-e2e-testing-stack/)）。
  - Kent Beck 的提示词强制一次一条测试的 red-green-refactor，并点名要防的信号："the genie was cheating, for example by disabling or deleting tests"（[newsletter](https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes)）。
- **"mockup → e2e contract（`test.fail`）→ 单独的实现 PR"**：没找到公开的完整先例，各个部分都有人做。

和我们相关的几点：

- 公认最常见的失败是 **agent 改弱、跳过或删掉测试来变绿**。我们已有的规则（不许改断言，改了就回到 owner）正好针对它。
- 第二常见的是**复杂流程的 e2e 不稳定**。每条 contract 小而独立、自己铺数据，正是降低这个风险的做法——这也是本 spike 的隔离对 contract 流程的意义。
- 第三是**小改动上的流程负担**。`ui-feature` 已经把文案、颜色、间距和 bug 排除在外。
- tracker 的 *Harness engineering › 6 · Test first as the workflow* 打算在 integration 层做 test-first 的对照实验；e2e 隔离之后，同样的实验在 e2e 层也能做。
