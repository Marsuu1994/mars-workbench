# Spike: Separate dev environment

**Status: decided** · 2026-10-17（提出和拍板同日，owner review 见 PR #74）· 回答 tracker 条目 *Milestone — Quality gate before Phase 2 › Step 4*（Cross-cutting › High）· 基于 main `09ec7e4`（#72）· planner 里对应 project *Mars Workbench — Phase 2 前的代码质量* 第 4 步「独立的 dev 环境：本地 DB + seed，不再连 prod」· 相关：`prisma.config.ts`、`.env.example`、`src/lib/prisma.ts`、`src/lib/supabase/`、`src/mcp/middleware/auth.ts`、`design/flows/auth.md`、`src/app/design/README.md` › Local access

> 语言约定：叙述用中文；产品名词、工具名、env 变量、命令和代码标识保留英文（Supabase CLI、`DIRECT_URL`、`MCP_DEV_USER_ID`、`prisma migrate deploy`、`getClaims()`），和代码、tracker 一一对应。

这份 spike 分五部分：起因和现状；目标；四个方案和对比（方案 A 附本次在云端容器里的验证结果）；推荐方案的实施计划；待 owner 决定的问题，编号方便逐条回复。结论在下面的 Decision 一节。

**结论先行**：推荐方案 A。用 Supabase CLI 在 Docker 里跑一份本地 Supabase，只开 Postgres 和 Auth。Prisma 继续管 migration，seed 脚本直接调 services。`.env.local` 默认指向本地；prod 凭据挪到只有显式命令才会读的 `.env.prod`。方案 A 的关键路径都在云端容器里跑通了：migration、登录、MCP、seed、OAuth server。生产代码不用改。

## Decision · 拍板（2026-10-17）

owner 在对话里逐条回复了 Q1–Q9。

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · 方案 | **A**：Supabase CLI 本地栈 | 按下面的实施计划做，一个 PR |
| Q2 · 本地登录 | **(a) + b1**：脚本用 password dev user（`dev:session`）；owner 在浏览器里本地也用 Google。owner 现在本地就是用 Google 登录，只是 Auth 连的是 prod | `config.toml` 打开 `[auth.external.google]`，client id 和 secret 从不提交的 `supabase/.env` 读。Google Cloud Console 加 redirect URI 由 owner 在 Mac 上验证时做（Step 11） |
| Q3 · Seed | **(a) 合成数据**，按「今天」生成；不拷 prod 数据，上周的 plan 第一版不做 | `prisma/seed.ts` 调 services |
| Q4 · prod 凭据 | **`.env.prod`**：`.env.local` 只放本地值，prod 凭据只由显式命令读取 | owner 只回复了文件拆分；`predev` 防误连检查按推荐一起加，不要的话在实施 PR 里删掉 |
| Q5 · prod migration | **(a) 手动**：merge 之后跑 `npm run db:deploy:prod` | 新 npm script |
| Q6 · 云端 agent session | **(a) 按需**：需要 DB 或要登录看真实页面时才跑 `npm run db:setup` | AGENTS.md 加一行。另外 owner 给 Step 5 加了一条探索：agent 自己起 Chrome 验证到底有没有必要、大概花多少 token、能不能用 e2e 加 owner 验收代替（见 `archived/test-baseline.md`） |
| Q7 · Vercel preview | 继续连 prod，不开 tracker 条目 | — |
| Q8 · Postgres 版本 | prod 是 **PostgreSQL 17.6**（owner 在 Supabase 里跑 `select version()`） | `[db] major_version = 17`；本地镜像 17.11，同一个大版本 |
| Q9 · Mac 上的 Docker | 还没装，owner 现在不在家 | 实施和验证先在云端容器里完成；owner 回家后装 OrbStack 在 Mac 上验证，即 planner 新加的第 11 步（tracker 的 Step 11） |
| review 中提出 · 实施计划第 8 条 | service 测试用 mock 还是连真实 DB，不在这一步定 | 第 8 条改成「Step 4 提供 DB，用法由 Step 5 决定」；mock / integration / e2e 的分析记进 Step 5 的 spike 草稿 `design/spike/archived/test-baseline.md` |

下文保留 review 时的分析和选项；和结论不一致的地方，以本节为准。

## 起因和现状

本地只有一个 env 文件 `.env.local`，里面全是 prod Supabase 的值：`DATABASE_URL` / `DIRECT_URL` 连 prod DB，`NEXT_PUBLIC_SUPABASE_URL` 和 publishable key 连 prod Auth。由此带来六个问题：

1. **本地操作写的是 prod 数据。** `npm run dev` 里拖一张卡、建一个 plan，改的都是 owner 这周真实的看板。
2. **测 MCP write tool 也一样。** `MCP_DEV_USER_ID` 指向 owner 的真实账号，本地用 Inspector 调 `create_plan` / `update_project`，改的是真实的 plan 和 project。
3. **本机的 Prisma 命令都对着 prod。** `prisma.config.ts` 从 `.env.local` 读 `DIRECT_URL`，所以 `prisma migrate dev`、`db push` 都直接打到 prod。Prisma 7 发现是 AI agent 在跑 `migrate reset` 时，会拦下来要求用户确认（本次验证时触发过），但 `migrate dev` 和 `db push` 不拦。
4. **只有一份 Auth 配置。** Site URL 是 prod 域名，OAuth server 的 consent 页地址又是 Site URL 加 `/oauth/consent`，所以 MCP 的 OAuth 流程在本地走不通，只能上 prod 或 preview 测。
5. **云端 agent session 没有 `.env.local`。** 只能打开 Design Console（#72），看不到真实页面，也跑不了 service。之前要验证 DB 改动，都是临时装一个 Postgres 手动搭（Update Log 2026-10-14、10-17 里的 "verified on a fresh Postgres"）。
6. **Step 5（测试基线）在 CI 里需要两样东西**：一个可以随便清空的 DB 跑 service 测试，和一种不经过 Google 的登录方式跑每页的 Playwright smoke。

两条硬约束决定了方案怎么选：

- **Schema 不依赖 Supabase。** app 表只存 `user_id UUID`，没有指向 `auth.users` 的外键，19 个 migration 里也没有 RLS、policy 或 extension，任何 Postgres 都能跑。
- **Auth 依赖 Supabase。** 登录用 Google OAuth（`signInWithOAuth`），session 是 `@supabase/ssr` 的 cookie，`getClaims()` 拿 JWKS 在本地验签，MCP 的 token 来自 Supabase 的 OAuth 2.1 server（consent 页调 `auth.oauth.*`）。没有 Supabase Auth，就进不了任何真实页面，MCP 的 token 路径也测不了。Google 是唯一的登录 UI。

## 目标

1. 本地 `npm run dev`、测试、MCP write tool 测试，默认都不碰 prod 的数据和 Auth 配置。
2. 一条命令就能起一个干净、有数据的环境（migrate + seed）；弄坏了，一条命令重来。
3. 同一套环境能在云端 agent session 和 CI（Step 5）里跑。
4. 对 prod 的操作（migration、one-time script）必须显式、刻意地发起，不能是默认行为。

不在范围内：Vercel preview 部署连哪个库（Q7）。

## 方案

### A · Supabase CLI 本地栈 ✓ 推荐

`supabase start` 在 Docker 里起一份本地 Supabase。这个 app 只用得到 Postgres、Auth（GoTrue）和前面的 API gateway（Kong）；其余服务（Storage、Realtime、PostgREST、Studio …）都关掉。

- **仓库里**：提交 `supabase/config.toml`（由 `supabase init` 生成）。Prisma 继续管 `public` schema 的 migration，`prisma/migrations/` 不变，`supabase/migrations/` 留空。
- **连接**：`DATABASE_URL` 和 `DIRECT_URL` 都是 `postgresql://postgres:postgres@127.0.0.1:54322/postgres`（本地没有 pooler，两个一样）；`NEXT_PUBLIC_SUPABASE_URL` 是 `http://127.0.0.1:54321`；publishable key 是 CLI 的固定本地 key（`sb_publishable_ACJW…`），每台机器都一样，不算秘密。
- **cookie 不打架**：session cookie 的名字由 Supabase URL 推出来（本地叫 `sb-127-auth-token`，prod 叫 `sb-<ref>-auth-token`），所以同一个浏览器里 localhost 的本地 session 和 prod session 互不影响。

**本次验证**（在 Claude Code 的云端容器里，Supabase CLI 2.121.0，镜像 `supabase/postgres:17.11`、GoTrue v2.197.0）：

- **Migration**：`prisma migrate deploy` 2 秒跑完 19 个 migration，`migrate status` 显示 up to date；`migrate dev --create-only` 生成的是空 migration，说明 shadow DB 建得起来，schema 和 migration 一致。
- **Reset**：`supabase db reset` 22 秒清空整个本地库（`auth.users` 也清掉），之后 `prisma migrate deploy` 再跑一遍就恢复了。这条路不经过 Prisma 的 AI 确认拦截。
- **登录**：用 secret key 调 admin API 建了一个 password 用户 `dev@mars.local`；在 Node 里用 `@supabase/ssr` 登录，拿到 `sb-127-auth-token` cookie。不带 cookie 访问 `/kanban` 得到 307，跳到 login；带上 cookie 得到 200，页面渲染 "No active plan"（空账号）。**生产代码一行没改。**
- **MCP**：把 `MCP_DEV_USER_ID` 设成这个 dev user，用 MCP Inspector CLI 调 `get_planning_context`，返回的是本地库里的空数据。
- **Seed**：写了一个 tsx 脚本，直接 import `@/services/projectService` 的 `createProject` 往本地库写一个 project，`/kanban/projects` 马上就显示出来了。所以 seed 可以走 services，不用手写 SQL。
- **JWKS**：本地 Auth 默认就发 ES256 JWKS（`/auth/v1/.well-known/jwks.json`），`getClaims()` 和 prod 一样在本地验签。
- **OAuth server**：在 `config.toml` 里设 `[auth.oauth_server] enabled = true` 后，`/auth/v1/.well-known/oauth-authorization-server` 返回 metadata。issuer 是 `http://127.0.0.1:54321/auth/v1`，正好等于 `getAuthorizationServerUrl()` 在本地算出来的值；consent 路径是 `/oauth/consent`，Site URL 是 `http://localhost:3000`。所以 MCP 的 OAuth 全流程可以在本地用 Inspector 的 OAuth 模式走一遍（claude.ai 连不到 localhost，这一步仍要上 preview）。
- **成本**：镜像一共约 4 GB（即使用 `-x` 排除了 storage 和 realtime，CLI 还是会拉它们的镜像），冷启动要几分钟；之后 `supabase stop` / `start` 约 25 秒，数据保留；跑着的 4 个容器（db、auth、kong、mailpit）一共占约 170 MB 内存。
- **云端容器的两个坑**：Docker daemon 默认没起，手动跑 `dockerd` 能起来；CLI 默认从 `public.ecr.aws` 拉镜像，这里返回 "Data limit exceeded"，设 `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` 改从 Docker Hub 拉就好了。

**优点**：

- Auth 也在本地，和 prod 是同一套机制（Google OAuth、cookie session、JWKS、OAuth server），planner 里写的「不碰 prod 的 Auth 配置」真正做得到。
- 每台机器、每个 session 各有一份，互不干扰，随时可以 reset。
- CI 能跑同一套（GitHub 的 runner 自带 Docker）。
- 不花钱。

**缺点**：

- Mac 上要装一个 Docker runtime（Docker Desktop、OrbStack、Colima 任选其一，Q9）。
- 第一次要拉约 4 GB 镜像。
- 多一个 CLI 依赖（建议作为 devDependency 固定版本）。
- 本地 Postgres 的大版本要和 prod 对齐（Q8）。
- 本地想用 Google 登录，要在 Google Cloud Console 给 OAuth client 加一个 redirect URI（Q2）。

### B · 只换 DB：本地纯 Postgres，Auth 继续用 prod

`DATABASE_URL` / `DIRECT_URL` 指向本地 Postgres（Homebrew 装的，或 Docker 的 `postgres:17`），Supabase 相关变量仍然是 prod 的。

- **优点**：最轻。Mac 上 `brew install postgresql` 就够；云端容器自带 Postgres 16，几秒就起来。
- **缺点**：Auth 还是 prod 的。本地登录拿到的是 prod 的真实 user id；本地的 session、MCP 注册的 OAuth client 都写进 prod Auth；Site URL 的问题也没解决，本地仍然走不了 MCP OAuth。云端 agent 和 CI 没法登录（Google 登录没法自动化），要么只测 DB 这一层，要么在生产代码里加一条 dev-only 的 auth bypass，在 `getSessionClaims` 或 proxy 里按 env 伪造身份。这正是 AGENTS.md › *Production first* 不想要的分支；而且 bypass 的判断一旦写错，就是 prod 的认证漏洞。
- planner 第 4 步说的「不碰 prod 的 Auth 配置」，这个方案做不到。

### C · 再开一个 hosted Supabase project 当 dev

在 Supabase 上再建一个免费 project，`.env.local` 指向它。

- **优点**：不用 Docker；和 prod 完全同构（同样的托管服务、pooler、JWKS、OAuth server）；Vercel preview 也可以指向它（顺带解决 Q7）。
- **缺点**：
  - 只有一份共享的 DB：owner、同时在跑的几个云端 agent session、CI 互相踩数据，测试不能随便 reset。
  - 免费 project 闲置一周会被 pause，要手动恢复。
  - 云端 session 和 CI 都要拿到它的连接串和 key：要配环境 secret，还要在网络策略里放行 `*.supabase.co`。
  - 又多一个要同步 migration 的远端环境。
  - Google OAuth 也要给它加一个 redirect URI。
- **免费额度**：免费 plan 最多 2 个 active project，prod 已经占了一个。

### D · Supabase Branching（不推荐，列出来备查）

要 Pro plan（$25/月），每个 branch 另按小时计 compute。branch 只会自动跑 `supabase/migrations/` 里的 migration，和 Prisma 的 `prisma/migrations/` 对不上，还得另写一个 GitHub Action 去跑 Prisma。对一个单人 app 太重了。

### 对比

| | A · 本地 Supabase | B · 本地 PG + prod Auth | C · hosted dev project |
| --- | --- | --- | --- |
| 数据不碰 prod | ✓ | ✓ | ✓ |
| Auth 不碰 prod | ✓ | ✗ | ✓ |
| 本地能走 MCP OAuth | ✓ | ✗ | ✓（Site URL 设成 localhost） |
| 云端 agent 能登录看真实页面 | ✓（password dev user） | 要加 auth bypass | ✓（但和别人共享数据） |
| CI（Step 5） | ✓ 每个 job 一份干净的 | DB ✓，登录 ✗ | 共享，难隔离 |
| Mac 上要装的 | Docker runtime | Postgres | 无 |
| 费用 | 0 | 0 | 0（占掉第 2 个免费名额） |

## 推荐方案 A 的实施计划

一个 PR，和 planner 里的 SMALL 对得上。CI 的部分留给 Step 5。

1. **Supabase CLI**：
   - `supabase` 作为 devDependency，固定版本。
   - 提交 `supabase/config.toml`，改这几处：
     - `site_url = "http://localhost:3000"`，`additional_redirect_urls` 加上 `http://localhost:3000/auth/callback`；
     - `[auth.oauth_server] enabled = true`，consent 路径 `/oauth/consent`，动态注册和 prod 保持一致；
     - `[db] major_version` 跟 prod 一致（Q8）；
     - Google 按 Q2 的结论配；
     - app 用不到的服务（Studio、Storage、Realtime、Edge Runtime、Analytics …）设 `enabled = false`。
2. **npm scripts**：
   - `db:start` / `db:stop`：起停本地栈。
   - `db:reset`：`supabase db reset` → `prisma migrate deploy` → seed，一条命令回到干净状态。不用 `prisma migrate reset`，因为 Prisma 7 发现是 AI agent 在跑时会拦下来等用户确认，agent 自己跑不了。
   - `db:seed`：跑 `prisma/seed.ts`；同时配进 `prisma.config.ts` 的 `migrations.seed`。
   - `dev:session`：给 agent 和 Playwright 生成 dev user 的 cookie（Playwright 的 storageState 格式），见 Q2。
   - 运行时用到的本地 key 从 `supabase status -o env` 读，不写进仓库。secret key 虽然是本地固定值，但长得像秘密，提交上去可能触发 secret scanning。
3. **Seed**（内容见 Q3）：
   - 先用 admin API 建 dev user，id 固定（admin API 允许指定 `id`），这样 `.env.example` 里的 `MCP_DEV_USER_ID` 可以直接写死。
   - 再调 services 按「今天」生成数据，跑多少次结果都一样。
4. **Env 文件**（Q4）：
   - `.env.example` 写本地的真实值（都是 CLI 的公开固定值），新机器 `cp .env.example .env.local` 就能用。
   - prod 凭据从 `.env.local` 挪到 `.env.prod`：它已被 `.env*` 规则 gitignore，Next 和 `prisma.config.ts` 都不会自动读。需要碰 prod 的命令显式带上它，比如 `npm run db:deploy:prod`，one-time script 同理。
   - 防误连检查按 Q4 的结论做。
5. **Prod migration** 按 Q5 的结论改流程。
6. **云端 agent session** 按 Q6 的结论接入。
7. **文档**：
   - README 的 Getting Started 改成本地环境的步骤，Current State 不变；
   - AGENTS.md › Commands 加上 `db:*`；
   - `design/flows/auth.md` 和 `reference.md` 写明本地的 `MCP_DEV_USER_ID` 就是 seed 建的 dev user；
   - `src/app/design/README.md` 的占位变量换成本地真实值；
   - tracker 删掉 Step 4，写 Update Log；
   - spike 归档。
8. **和 Step 5 的边界**：Step 4 只提供一个可以随时清空的 DB 和一种不经过 Google 的登录方式（`dev:session`）。service 测试用 mock 还是连真实 DB、CI 里起什么，由 Step 5 决定（spike 草稿 `design/spike/archived/test-baseline.md`）。

## 待 owner 决定的问题

**Q1 · 方案。** A、B、C 选哪个？推荐 **A**。D 不考虑。

**Q2 · 本地怎么登录。** 分两种人：

- **(a) 脚本（agent、Playwright）**：seed 建一个 password 用户 `dev@mars.local`，`npm run dev:session` 生成它的 cookie / storageState。生产代码不用改，本次已验证。推荐：**必做**。
- **(b) owner 在浏览器里**，三选一：
  - **b1 · 本地也用 Google**（推荐）：`config.toml` 打开 `[auth.external.google]`，client id 和 secret 用 prod 那个 Google OAuth client 的，放在本地不提交的 `supabase/.env` 里，由 `env()` 读取；再在 Google Cloud Console 给这个 client 加一个 redirect URI `http://127.0.0.1:54321/auth/v1/callback`。只配一次，之后的登录流程和 prod 一模一样。
  - **b2 · dev-only 登录入口**：加一个只在 `NODE_ENV=development` 下才生效的 route（比如 `/auth/dev-login`），直接以 dev user 身份登录。不用配 Google，但生产代码会多一条 dev-only 分支。
  - **b3 · 不在浏览器里登录**：owner 本地只看 Design Console，真实页面交给 agent 去看。
- **b1 的一个细节**：owner 用 Google 登录本地时，GoTrue 会新建一个本地 user，seed 的数据却在 dev user 名下。想让 Google 登录后直接看到 seed 数据，可以让 seed 接受一个 `SEED_EMAIL`（不提交），用 owner 的 Gmail 建 dev user：GoTrue 默认会按已验证的 email 把 Google identity 关联到同一个 user。这一点实施时再验证。

**Q3 · Seed 的内容。**

- **(a) 合成数据**（推荐）：脚本调 services，按「今天」生成：
  - 3 个 habit（DAILY 和 WEEKLY 都有）和本周的 ACTIVE plan；
  - board 上 Todo、Done、Expired 各有几张；
  - 2 个 project：一个有步骤排在本周，另一个所有步骤都 done、等着 archive；
  - 四个象限里都有 one-off；
  - 几条 dump。

  可以反复跑、可以提交，Playwright 也有确定的数据可测。上周已完成的 plan（用来看 recap 和 `lastPlan`）第一版不做：services 只会按「现在」建 plan，造上周的数据得直接写 DAL 或者伪造时间。Step 5 需要时再加。
- **(b) 拷一份 prod 数据**：写个脚本，用 `pg_dump` 导出 owner 名下的数据，再导入本地。数据真实，但内容不固定、会过时，还含个人信息，脚本和导出文件都不能进 git。
- 也可以先做 (a)，以后需要再补 (b)。

**Q4 · prod 凭据放哪，要不要防误连。**

- 推荐：`.env.local` 只放本地的值，prod 凭据挪到 `.env.prod`；再加一个 `predev` 检查：`DATABASE_URL` 不是本地地址时，`npm run dev` 直接报错退出（设 `ALLOW_REMOTE_DB=1` 可以绕过）。
- 也可以不加检查，只靠文件约定。

**Q5 · prod 的 migration 以后怎么上？** 先请确认：今天是不是在本机对着 `.env.local`（也就是 prod）手动跑的？

- **(a) 手动**（推荐）：merge 以后跑 `npm run db:deploy:prod`（读 `.env.prod`）。改动最小，每次都是显式操作。
- **(b) 放进 Vercel 的 production build**：build 时先跑 `prisma migrate deploy`。全自动，但部署和 migration 绑在一起，build 要拿到 `DIRECT_URL`，而且 preview 的 build 不能跑这一步。
- **(c) GitHub Action**：push 到 main 时跑 `migrate deploy`，`DIRECT_URL` 放进 GitHub secret。

**Q6 · 云端 agent session 怎么拿到这个环境。**

- **(a) 按需起**（推荐）：AGENTS.md 加一行，写「需要 DB、或者要登录看真实页面时，先跑 `npm run db:setup`」。这个脚本负责：Docker daemon 没起就先起，镜像从 Docker Hub 拉，然后 start、migrate、seed。
- **(b) SessionStart hook**：每个 session 一开始自动起。省一步，但每个新容器都要拉 4 GB、多等几分钟，而大部分任务（文档、样式）根本用不到。
- **(c) 放进云端环境的 Setup script**：owner 在 claude.ai 的环境设置里配，不进仓库，每个新 session 都会跑；代价和 (b) 一样。

**Q7 · Vercel preview 连哪个库？** preview 部署很可能也连着 prod：PR 5 让 preview 也接受 token，而 token 是按 `NEXT_PUBLIC_SUPABASE_URL` 验的。推荐这一步不动它，preview 继续用 prod 数据；以后真要隔离，就是方案 C 那个 hosted dev project，到时单开一条 tracker。

**Q8 · Postgres 版本。** 本地镜像默认是 17。prod project 是哪个大版本？可以在 Dashboard → Project Settings → Infrastructure 看到。`config.toml` 的 `[db] major_version` 跟着 prod 设。

**Q9 · Mac 上的 Docker runtime。** 已经装了 Docker Desktop 或 OrbStack 吗？如果都没有，推荐 OrbStack：更轻、启动快，Supabase CLI 也支持。
