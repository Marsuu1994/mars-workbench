# Spike: e2e 的数据隔离 — 每个 test 一个 user，只铺自己要的数据

**Status: awaiting owner review** · 2026-11-01 · 回答 tracker 条目 *Harness engineering › e2e data isolation* · 相关：PR #104（`ui-feature` skill、tagged `test.fail` contract）、`design/spike/archived/test-baseline.md`（现在这套 e2e 的决策记录）、`test/README.md` › e2e

> 语言说明：正文中文；代码标识、文件名、Playwright / Prisma / Supabase 的概念保留英文（fixture / worker / storageState / `moduleFormat`），和代码、文档里的叫法一一对应。

## TL;DR

- **问题**：e2e 全部测试共用一个 e2e user 和一份 `seedWeek()` 铺好的周，`workers: 1`，journeys 是 `serial`。后一条依赖前一条留下的状态，断言写死 seed 的内容，加一条新测试就要改 seed、牵动别的断言。PR #104 的 review 里暴露出来：contract 要写数据，而写在共享数据上会让排在后面的测试在 design PR 和 implementation PR 之间表现不一样。
- **建议**：照 Cal.com、Documenso、Formbricks、Epic Stack 的做法——**每个 test 一个新 user**，test 用 `test/factories.ts` 自己铺要读的数据，通过 API 登录；spec 按 feature 拆；去掉 `serial`，开 `fullyParallel`。
- **关键阻碍已验证可解**：Prisma generator 加 `moduleFormat = "cjs"`（Cal.com 同款）后，Playwright 里能直接 import factories、services、DAL；typecheck、unit、integration、`next build`、dev 和 `next start` 运行时都通过。每个 test 的准备开销实测 0.1–0.45 秒。
- **对 contract 的意义**：contract 自己铺前置数据、写什么都只影响自己的 user、放进它所属 feature 的 spec——PR #104 讨论里的问题 1 和 5 不再存在。

## 起因

PR #104 的 review 讨论（2026-11-01）：

1. contract 的失败点经常在一次写操作之后（例如先把第二个 habit instance 放进 backlog，再断言 `×2`）。放进 smoke，它在 desktop 和 mobile 各写一次；放进 journeys 中间，它在 design PR 里写到一半就失败，到 implementation PR 完整跑完、写得更多，排在后面的 journey 可能因此变红，而不是因为实现有问题。
2. contract 需要的前置状态 seed 里没有时，只能改 `test/seedWeek.ts`，而它同时是 dev user 的数据和现有 smoke、journeys 断言的前提（"2 templates"、"Units 1–3 已在周里"、"两个 project"）。

owner 的判断：根子在 e2e 设计——测试之间、测试和 seed 之间没有隔离。

## 现状

| | 做法 |
| --- | --- |
| 数据 | 一个 e2e user（`E2E_USER`，固定 id），每次 run 前 `e2e:session` 删掉它的数据、用 `seedWeek()` 重铺一周，run 中途不再 reset |
| 登录 | 同上脚本写出一个 `.auth/e2e-session.json`，所有测试共用 |
| 顺序 | `workers: 1`；smoke-desktop、smoke-mobile、design-console 之后才跑 journeys（会改数据）；journeys 是 `mode: 'serial'`，一条依赖上一条的结果 |
| spec | 按类型分：`smoke.spec.ts`（每页能渲染 seed 的周，两个视口）、`designConsole.spec.ts`、`journeys.spec.ts`（6 条关键路径） |
| 为什么 spec 里不能直接造数据 | `test/README.md`：Playwright 按 CommonJS 加载 TypeScript，生成的 Prisma client 只支持 ESM（`import.meta.url`），所以数据库工作只能放进 tsx 脚本 |
| 耗时 | 27 条测试，本地复用 dev server 2.2 分钟（含首次编译；2026-11-01 云端容器实测） |

这套是 `test-baseline` spike 的 Q11 决定的（"e2e 用独立的 e2e user，只在运行前清"），当时只有几条 smoke 和 4 条 journey，共享一份数据是最省事的。integration 层那时就选了**每个 test 一个新 user**（`newUserId()`，`test/README.md` › Unit and integration）——这次是把同一个做法搬到 e2e。

## 别人怎么做

### Playwright 官方

- "Each test should be completely isolated from another test"，包括 "data"；"If working with a database then make sure you control the data."（[best practices](https://playwright.dev/docs/best-practices)）
- serial："**Using serial is not recommended.** It is usually better to make your tests isolated, so they can be run independently."（[test-parallel](https://playwright.dev/docs/test-parallel)）
- 并行时隔离数据：用 `workerIndex` / `parallelIndex` "to isolate user data in the database"；登录文档的 *one account per parallel worker*：测试 "modify shared server-side state" 时，每个 worker 一个账号（[auth](https://playwright.dev/docs/auth)）。
- fixture：`test.extend()`，setup 和 teardown 写在一处，按需建立；可以是 test 级或 worker 级（[fixtures](https://playwright.dev/docs/test-fixtures)）。

Playwright 自己只隔离浏览器（每个 test 一个新的 BrowserContext），服务端数据的隔离留给应用。

### 测试数据的经典说法

- **Shared Fixture**：测试一旦修改共享 fixture，就会 "lead to Erratic Tests… because Shared Fixtures violate the principle of Independent Test"；只读的参考数据可以共享，会被修改的对象 "should be built by each test as a Fresh Fixture"。**Mystery Guest**：读测试的人看不到 fixture 和断言之间的因果，因为一部分在测试方法之外（Meszaros, [xUnit Test Patterns](http://xunitpatterns.com/Shared%20Fixture.html)）。现在的 smoke 断言 "两个 project" 就是 Mystery Guest：两个从哪来，要去翻 `seedData.ts`。
- **Object Mother vs Test Data Builder**：一份大而全的样本数据会造成 "heavy coupling in that many tests will depend on the exact data in the mothers"（[Fowler](https://martinfowler.com/bliki/ObjectMother.html)）；builder 带安全的默认值，每个测试只覆盖它关心的字段（[Nat Pryce](http://natpryce.com/articles/000714.html)）。`seedWeek()` 就是一个 Object Mother；`test/factories.ts` 已经是 builder 的样子。
- Cypress：不要用 UI 去造状态，用程序登录和造数据；"Tests should always be able to be run independently from one another and still pass"；**在测试之前清理，而不是之后**（[best practices](https://docs.cypress.io/app/core-concepts/best-practices)）。

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

**规律**：能并行的那几个（Cal.com、Documenso、Formbricks、Epic Stack）做法一致——一个 `test.extend` fixture 每个 test 建一个唯一的 user，在 Playwright 进程里直接用 Prisma 造数据，不经 UI 登录，spec 按 feature 拆。共享账号的那几个（Dub、Twenty、Immich 的真后端部分）都是串行，和我们现在一样。Prisma 在 Playwright 里两种格式都有人用：Cal.com 用 CJS（`moduleFormat = "cjs"`），Epic Stack、Formbricks、Immich 用 ESM（`"type": "module"`），Documenso 用 `--import tsx`。

Supabase 官方的 RLS 测试指南给的造 user 方式和这里一致：`auth.admin.createUser`（secret key，`email_confirm: true`），`signInWithPassword` 登录，id 用 `randomUUID()`（[testing RLS](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)）。我们的 `scripts/localAuth.ts` 已经是这样做的。

## 本地验证（云端容器，2026-11-01）

**1. Playwright 里 import factories（服务、DAL、Prisma）**

| 做法 | 结果 |
| --- | --- |
| 现状（`prisma-client`，默认 ESM） | 失败：`SyntaxError: Cannot use 'import.meta' outside a module` |
| generator 加 `moduleFormat = "cjs"` | 能 import；同时 `typecheck` ✓、`test:unit` 260 ✓、`npm test`（含 integration）446 ✓、`next build` ✓、`next dev` 和 `next start` 下页面读写数据库 ✓ |

没验证的：Vercel 上的 serverless 打包。implementation PR 的 Vercel preview 会顺带验证。

**2. 每个 test 的准备开销**（探针：每个 test 建 user、`createWeek` 铺一个 habit、`signInWithPassword` 写 storageState，然后打开 `/kanban` 断言看到自己的 habit）

| 步骤 | 耗时 |
| --- | --- |
| `auth.admin.createUser` | 85–135 ms |
| `createWeek`（一个 habit） | 30–300 ms（每个 worker 第一次较慢） |
| `signInWithPassword` + cookie | ~90 ms |
| 合计 | **0.1–0.45 s / test** |

8 条探针测试，4 个 worker，`next start`：8.7 秒全过，每个 test 只看到自己的数据。

**3. 顺带发现的两个问题**

- `getLocalSecretKey()`（`scripts/localEnv.ts`）每次调用都起一个 `npx supabase status` 子进程，约 2.5 秒。现在只在 run 开始调一次，无所谓；改成每个 test 建 user 后就会让每个 test 多 2.5 秒。要在 globalSetup 里读一次，经环境变量传给 worker。
- Docker Hub 限流：`npm run db:setup` 拉 `kong:2.8.1` 时 `docker.io` 返回 429；换 `SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws` 一次成功。`scripts/localDb.ts` 现在只用 `docker.io`（之前从 ECR 换过来，因为 ECR 也会限）。两边配额独立，失败时自动换另一个能省掉手动重试（Q7）。

## 选项

### Q1 · 隔离单位

| | 每个 test 一个 user（推荐） | 每个 worker 一个 user | 每个 file 一个 user |
| --- | --- | --- | --- |
| 做法 | test 级 fixture | Playwright 文档的 *one account per parallel worker*，worker 级 fixture | `beforeAll` 建 |
| 隔离 | 完全：任何一条都能单独、重复、任意顺序跑 | worker 内的测试仍共享数据，顺序仍有影响 | file 内仍共享 |
| 开销 | 每条 0.1–0.45 s | 几乎为零 | 几乎为零 |
| 谁这么做 | Cal.com、Documenso、Formbricks、Epic Stack；我们的 integration 层 | Playwright 文档的示例 | Immich（换成清库） |

推荐每个 test：开销对 27 条测试是 3–12 秒，换来的是"一条测试只影响自己"。worker 级只解决了并行，没解决这次的问题。

### Q2 · Playwright 里怎么用 Prisma

| | 做法 | 状态 |
| --- | --- | --- |
| **(a) `moduleFormat = "cjs"`（推荐）** | `prisma/schema.prisma` 的 generator 加一行 | 已验证（上面）；Cal.com 同款 |
| (b) `e2e/package.json` 设 `"type": "module"` | Prisma 官方 Playwright 指南的做法 | 未验证；`@/` 别名和 ESM 的旧 issue 在 1.64 是否还在未知 |
| (c) `NODE_OPTIONS='--import tsx'` | Documenso 的做法 | 未验证 |
| (d) 每个 test 起一个 tsx 子进程造数据 | 不碰生成的 client | 每条多 1–2 秒，数据只能以 JSON 传 |

(a) 改的是 app 本身用的 client 格式。Next.js 打包时 CJS 和 ESM 都能处理，验证里 build 和运行时都正常；剩下的风险是 Vercel 打包，由 preview 兜底。如果 preview 有问题，退到 (b)。

### Q3 · 清理

| | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| **(a) 运行前清扫（推荐）** | globalSetup 删掉所有 `e2e-*@mars.local` 的 Auth user 和它们名下的 app 数据 | 失败测试的数据留到下次 run，可以用 Prisma Studio 或登录那个 user 看现场（`test-baseline` Q11 就是这么定的）；Cypress 的建议 | 本地库里会留一次 run 的数据 |
| (b) 每个 test 结束删 | fixture teardown | 库永远干净 | 失败现场没了；并行下删除要小心死锁（Cal.com 为此放进一个 transaction、只删记下的 id） |
| (c) 不清 | 唯一邮箱避免冲突 | 最简单 | 本地库无限增长 |

app 表对 Auth 没有外键，所以要删两边：`deleteUserData(userId)`（`scripts/e2eSession.ts` 里已有）加上 `auth.admin.deleteUser`。

### Q4 · spec 布局和 mobile 视口

按 feature 拆（上面四个能并行的项目都这样）：`board`、`priorities`、`projects`、`plan`、`dump`、`settings`、`auth`，`designConsole.spec.ts` 保持不变（它不碰数据库）。每个 spec 里，每条测试自己铺它要读的东西，标题照旧是行为。

`test-baseline` 定过每个页面要在两个视口渲染。两种保留方式：

- **(a) tag（推荐）**：每个 feature spec 第一条 "renders" 测试打 `@mobile`，mobile project 用 `grep: /@mobile/` 只跑这些。一个 feature 的东西都在一个文件里。
- (b) 留一个很薄的 `pages.spec.ts`，desktop 和 mobile 两个 project 都跑它，其余 spec 只跑 desktop。

### Q5 · 并行度

`fullyParallel: true`，去掉 `serial` 和 project 之间的 `dependencies`（不再需要"改数据的排在最后"）。worker 数：本地用默认值（CPU 的一半）；CI（`ubuntu-latest`，4 vCPU，同一台机器上还跑着 Next server 和 Supabase）先用 2，实测后再调。Documenso 的经验是 worker 数受数据库连接数限制。

### Q6 · 和 PR #104 的关系

本 spike 的计划假设 contract 已经是 tagged `test.fail`（#104），不再有 `contract` / `features` project。两条路：#104 先 merge，本 PR 在它之上做；或者 #104 关掉，它的内容并进本 PR。#104 里 `check:contracts` 的几处正则问题（PR 上的 review 讨论）和这里无关，可以在 #104 里单独修。

### Q7 · Docker 镜像源回退放不放进这个 PR

implementation 要在云端容器里跑 e2e，就要能起本地 stack。`scripts/localDb.ts` 在 `docker.io` 拉取失败时自动用 `public.ecr.aws` 重试一次，大约十几行。放进本 PR 能让这个 PR 自己的验证跑得起来；按 *One task, one branch, one PR* 也可以单开一个 tracker 条目。

## 实施计划（Q1–Q5 按推荐）

一个 PR，按这个顺序提交：

1. **Prisma 在 Playwright 里可用**：generator 加 `moduleFormat = "cjs"`；删掉 `test/README.md` 里 "Specs can't import Prisma" 那条。
2. **fixture**（`e2e/fixtures.ts`）：
   - `user`：`randomUUID()`，邮箱 `e2e-<id>@mars.local`，`auth.admin.createUser`；
   - `storageState` 覆盖为 `signInAsStorageState(user)`，每个 test 自己的登录态；
   - 数据：测试直接调 `test/factories.ts`（`createWeek`、`createProjectWithSteps`、`createOneOff`、`moveTasks`），缺的组合加进 factories，保持 builder 的样子（默认值 + 覆盖），不再造一个新的 `seedWeek`。
3. **globalSetup**：读一次 secret key 放进环境变量；清扫上一次 run 留下的 `e2e-*` user 和数据。
4. **迁移 27 条测试到按 feature 的 spec**：每条只铺自己读的数据；断言里不再引用 `SEED_*`；journeys 拆开后各自造前置状态（例如 "a step put on this week" 自己建一个 Units 1–3 已在周里的 project）。
5. **配置**：`fullyParallel: true`；desktop project 跑全部，mobile project `grep: /@mobile/`；去掉 `dependencies`。
6. **删掉不再需要的**：`E2E_USER`、`scripts/e2eSession.ts`、`npm run e2e:session`（`dev:session` 和 dev user 的 `seedWeek()` 保留）；knip 会指出剩下的。
7. **文档**：`test/README.md` › e2e（隔离、fixture、清扫、布局、contract 怎么放）、AGENTS.md › Commands、README › Tests；#104 的 skill 第 4 步写明 "contract 自己铺前置数据，放进它所属 feature 的 spec"。
8. **量**：本地和 CI 前后的 e2e 耗时写进 PR 描述。

## 顺带：agent 开发流程，别人是不是 spec 和 test driven

owner 想知道的另一面。结论先说：**公开仓库里大多是 test-verified（测试来验收），真正 test-first、spec-first 的很少，多是可选或停在工具和研究里。**

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

## 待 owner 回答

1. **Q1**：每个 test 一个 user（推荐）、每个 worker、还是每个 file？
2. **Q2**：`moduleFormat = "cjs"`（推荐，已验证）还是 ESM（`e2e/package.json` 的 `"type": "module"`）？
3. **Q3**：运行前清扫（推荐）、每个 test 结束删、还是不清？
4. **Q4**：mobile 视口用 `@mobile` tag（推荐）还是留一个 `pages.spec.ts`？
5. **Q5**：CI 先用 2 个 worker 实测，可以吗？
6. **Q6**：PR #104 先 merge、还是并进本 PR？
7. **Q7**：Docker 镜像源回退放进本 PR，还是单开 tracker 条目？
