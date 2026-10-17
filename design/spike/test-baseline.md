# Spike: Test baseline

**Status: draft** · 2026-10-17 · 回答 tracker 条目 *Milestone — Quality gate before Phase 2 › Step 5*（Cross-cutting › High）· 基于 main `09ec7e4`（#72）· 起因：Step 4 的 spike review（PR #74）中，owner 问「用本地 DB 测 service 算不算 e2e」· 相关：`design/spike/archived/dev-environment.md`（Step 4，已实施）、`src/utils/`、`src/services/`、`src/lib/db/`、`src/actions/`、`.github/workflows/ci.yml`

> 语言约定：叙述用中文；工具名、测试术语和代码标识保留英文（Vitest、Playwright、unit / integration / e2e、`toBoardCards`、`services: postgres`），和代码、tracker 一一对应。

草稿：先记下 Step 4 review 时的讨论和 owner 新加的一条探索，Step 5 开工时补全成 awaiting owner review。

## 现状

- 仓库里没有任何测试，CI 只跑 Prettier、ESLint、tsc、knip 和 theme check。
- tracker 的 Step 5 写的是「Vitest 测纯 adapter 和 services，每页一个 Playwright smoke，都进 CI」，但没说 service 测试用 mock 还是连真实 DB。
- tracker 点名的 `toProjectsView` 已经不在了（Projects 页的 view-model 树在 PR #58 去掉了）；现有的纯函数在 `src/utils/`：`toBoardCards`、`applyStepPatch`、`dateUtils`、`planUtils` 等。

## 三种测试

| 测试 | 边界 | 要什么 |
| --- | --- | --- |
| unit | 一个函数；依赖要么没有（纯函数），要么全 mock | 什么都不要 |
| integration | service + DAL + **真实 Postgres**；没有 HTTP、UI 和 Auth | 只要一个 Postgres |
| e2e | 浏览器 → Next → action → service → DB | app + DB + Auth |

用真实 DB 测 service 是 integration test，不是 e2e。e2e 指 Playwright 或 Cypress 从浏览器一路走到 DB。

## 分层 mock 在这个 codebase 里的收益

常见做法是每层 mock 下一层：DAL mock Prisma client，service mock DAL，action mock service。放到这个 codebase 里，三层的收益差别很大：

- **DAL mock Prisma：收益很低。** DAL 函数就是一条 Prisma 查询，对不对全看查询语义：`where`、`select`、排序、唯一约束、事务。mock 掉 Prisma 之后，测试只能断言「调了 `prisma.task.findMany`，参数是 X」，等于把实现抄一遍，查询写错照样测不出来。
- **service mock DAL：能做，但脆。**
  - service 里最值钱的是两样东西：业务规则（carry-over、`updatePlan` 比较新旧 template 后删掉重建、sync 的过期逻辑），以及执行完之后 DB 里是什么状态。
  - mock DAL 的测试断言的是「按什么顺序调了哪些 DAL 函数」。Step 7 重构 mutation layer 时调用方式一变，行为没错测试也会挂。
  - services 用 `prisma.$transaction(async tx => …)` 把 `tx` 传给 DAL，所以连 `$transaction` 也得 mock。
  - integration test 断言的是结果状态（比如 `create_plan` 之后，这个 step 在新 plan 上、状态是 BACKLOG），重构之后照样成立。
- **action mock service：收益最低。** action 很薄：zod → `getCurrentUserId` → service → `revalidatePath`。mock 掉这三样之后，剩下要测的只有 schema，而 schema 可以直接单独测。Step 7 还可能把 action 换成一个共用的 handler，到时测那个 handler 一次就够了。

## 初步建议

1. **纯函数 unit test，数量最多。** 测 `toBoardCards`、`applyStepPatch`、日期和统计计算。不用 mock，最快。service 里能拆出来的纯逻辑，尽量拆出来这样测。
2. **service integration test，挑关键流程测。** 比如 `createPlan` / `updatePlan`、`ensureSynced` 的幂等和过期、project step 的排序和排进本周。连真实 Postgres，每个 test 前清表。
   - 这一层只要 Postgres，不要 Auth。CI 里用 GitHub Actions 的 `services: postgres`：一个官方 Postgres 镜像，约 150 MB，几秒就起来。
   - 本地用 Step 4 那个栈里的 DB。
3. **Playwright e2e smoke，每页一个。** 这一层才需要完整的 Supabase 栈，因为要登录；用 Step 4 的 `dev:session` 生成的 storageState 登录。

mock 只留给难控制的外部边界：Supabase Auth 调用（`oauthConsentService`、MCP 的 token 校验），以及时间（fake timers）。

CI 成本：前两层不碰 Supabase 镜像。只有 e2e job 要拉约 4 GB 镜像；在 GitHub runner 上的冷启动时间还没测过。

## 待探索：agent 自己起 Chrome 验证（owner 加，2026-10-17）

现在 agent 改完 UI，会自己起 `next dev`，再用 Playwright 驱动 Chromium 截图或点一遍来确认。要探索三件事：

1. **有没有必要。** 哪些改动值得 agent 自己看一眼（布局、交互状态），哪些靠 lint、tsc、Design Console 的 scenario 和 e2e smoke 就够了。
2. **大概花多少 token。** 估算方法：一张截图约 宽 × 高 ÷ 750 个 token，比如 1280 × 800 约 1.4k；再加上起 server、写脚本、读日志的上下文。一次验证来回几张到十几张截图，估计在 1 万到几万 token 之间。开工时挑两三个真实任务实测。
3. **能不能用 e2e 加 owner 验收代替 agent 自己验证。** 即 agent 不自己起浏览器看，交给 Playwright 的 e2e smoke（CI 里跑）和 owner 验收。

## 待定问题（开工时补全）

1. 三层的比例和范围，按上面的初步建议？
2. service integration test 怎么隔离：每个 test 清表，还是每个 Vitest worker 一个 schema？
3. e2e smoke 在每个 PR 都跑，还是只在 main 上跑？
4. agent 验证的结论：保留、按改动类型取舍，还是交给 e2e 加 owner 验收？
