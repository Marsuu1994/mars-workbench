# Spike: Quality sweep — 两周一次的 drift 防线

**Status: awaiting owner review** · 2026-10-27 · 回答 tracker 条目 *Milestone — Quality gate before Phase 2 › Step 13 — Quality sweep*（Cross-cutting › High）· 基于 main `96d9c63`（#92）· 相关：`archived/agents-md-simplification.md`（Q7：AGENTS.md 的体量交给 sweep，不做 CI 体量检查）、`archived/subagent-delegation-pilot.md`（委派什么时候划算）、PR #82 的 `code-reviewer-agent.md`（tracker 的 Step 14，每个 diff 一次的 review）、PR #84 的 `public-launch.md`（agent harness 的想法）

> 语言约定：叙述用中文；产品名词、状态、代码标识、ESLint 规则名保留英文（finding / drift / skill / Routine / `no-restricted-syntax` / `reference.md` …），和代码、tracker 一一对应。给 skill 和 subagent 的 prompt 用英文。

## TL;DR

- **问题**：agent 写代码时照着周围的代码学，而不是照着 AGENTS.md 学。一处偏离，下一个 session 就会把它当成惯例抄过去；文档没被 diff 碰到，也就没人去改。CI 只管能机器判定的规则，Step 14 的 code-reviewer 只看一个 PR 的 diff。**积累下来的 drift**，以及**没有 diff 也会发生的 drift**（依赖过期、PR 搁置、文档和代码各走各的），目前没人负责。以后 harness 并行、过夜地跑 PR，这类 drift 只会来得更快。
- **试跑**：在 `96d9c63` 上按 tracker Step 13 的范围试跑了一次 sweep：4 个只读 subagent 并行，每个负责一个维度，我自己跑机械检查。结果是 4 个维度 46 条、机械层 5 条，**去重后 42 条**（附录 A），是 tracker 设想的单次上限（5–10 条）的 4 倍以上；**其中 13 条背后的规则今天就能写成 0 或接近 0 误报的 lint 或脚本**（附录 B 共 17 条候选，11 条可以直接落地）。每个维度用 31–47 次 tool call、4–5.5 分钟，最终 context 122k–130k；main session 每份报告只收到约 2–3k。
- **最值钱的三类 finding**：
  - AGENTS.md 自己和代码打架：DAL 规则写着「nothing else imports Prisma」，可 6 个 service 为了 `$transaction` 都 import 了 `prisma`；
  - 一条规则被系统性地忽略：enum 常量有三个来源，`utils/enums.ts` 整份手抄了 Prisma 的 enum，注释给的理由已经过时；
  - 一个改行为的 PR 没碰到 `baseline.md`：#92 之后 baseline 仍写着 Claude 从不把 one-off 放上 week。
- **推荐方案（B）**：`/quality-sweep` skill；一个确定性的 facts 脚本；一个注册的只读 `sweep-auditor`，按维度 fan-out。每次只深查「上次 sweep 以来改过的东西」，外加轮换一个维度做全量扫描。产出一个 PR：修掉的机械 drift、tracker 条目、新的 CI 规则（连同修好的违规），以及一份 Rule report，回答「要不要加新 rule」。Routine 每月 1 日和 15 日在新 session 里跑。
- **要 owner 回答**：Q1–Q10。

## 起因

Owner 的原话：给未来的 harness 加一道 drift fix 防线，让代码按 AGENTS.md 走；同时出报告，看要不要加新 rule。

tracker 的 Step 13 已经写了范围：一个 `/quality-sweep` skill，加一个每两周跑一次的 Routine，只查 CI 查不了的东西；产出一个 PR，带 tracker 修改和一份最多 5–10 条 finding 的短报告；每条 finding 的结局是 fixed、tracker 条目、新 CI 规则，或者写明理由的 dismissed。这份 spike 回答怎么做：用什么载体、查多大范围、能修什么、新 rule 怎么判断和落地、怎么调度。

### 现在的三层，以及空着的那一层

| 层 | 什么时候 | 看什么 | 管不到什么 |
| --- | --- | --- | --- |
| CI（`ci.yml`） | 每次 push | 能机器判定的：格式、lint、类型、knip、theme 变量、Vitest 覆盖率、Playwright | 任何没写成工具的 prose 规则 |
| code-reviewer（Step 14，PR #82 的 spike，awaiting review） | 每个 PR push 之前 | 这个 diff 是否守 AGENTS.md | diff 之外：旧代码、没被碰的文档、跨 PR 积累的模式 |
| owner | PR 上、Vercel preview 上 | 方向和 UI 验收 | 不可能逐行看 |
| **sweep（本 spike）** | 每两周，以及每个 milestone 结束时 | 整个 repo，和时间本身带来的变化 | — |

sweep 不重复前两层：CI 已经管的不查；code-reviewer 的职责是「这个 diff」，sweep 的职责是「这段时间」。

### 为什么等不了

- **AGENTS.md 精简之后又长回去了**：08bfb7b（10-17，精简落地）是 2769 词，现在是 3707 词，8 天 +36%，约每天 110 词。涨得最多的几节：Commands +184、Layers +161、Version Control +119、UI Workflow +114、Subagents +100。其中 *Page structure*（+161 的大头）只有写页面的任务用得上，而且 `baseline.md` › Architecture Decision 里有全文，按 AGENTS.md › Adding a rule，它应该只留一行加指针。精简 spike 的 Q7 把体量交给 sweep，可现在还没有 sweep。
- **已经有 drift 在被复制**：同一个 `CREATE_PLAN_HREF` 在三个 feature 的 `constants.ts` 里各定义了一次；「constants 放在 component 旁边」这条规则，在没有统一 routes 的情况下，反而催生了重复。
- **harness 会放大它**：PR #84 的想法是让 agent 过夜、并行地跑一队规格清楚的任务。每个 session 都从周围的代码学，偏差的复制速度和 PR 数量成正比。

## 试跑：在 `96d9c63` 上跑一次

### 怎么跑的

- **机械层**（main session，6 次 Bash 调用）：AGENTS.md 每个 commit 的词数、living docs 里的死链、`eslint-disable` / `it.fails` / `Workaround (` 清单、最大的文件和最近的 churn、`npm audit`、`npm outdated`、open PR 的年龄。
- **判断层**（4 个 general-purpose subagent，只读，并行）：每个拿一份 brief，内容是一个维度的检查清单、预算（约 40 次 tool call）和固定的返回格式。每条 finding 都要回答「能不能机器检查，用什么机制，今天有多少误报」。
- 主 session 抽查了关键结论（`utils/enums.ts` 的重复、`planService.ts:536` 里的 Prisma 查询、导航的硬编码 copy、`en.json` 里的 Title Case），都属实。

### 数字

| 维度 | finding | 能机器检查：yes / partly | tool calls | 耗时 | 最终 context |
| --- | ---: | --- | ---: | ---: | ---: |
| 文档 vs 代码 | 11 | 3 / 4 | 38 | 237 秒 | 124k |
| 架构和数据规则 | 11 | 5 / 4 | 42 | 310 秒 | 130k |
| UI 和组件规则 | 12 | 5 / 4 | 47 | 336 秒 | 122k |
| 规则体系和 hygiene | 12 | 7 / 3 | 31 | 258 秒 | 125k |
| 机械层（main） | 5 | — | 6 | 约 2 分钟 | — |
| **合计** | **51（去重 42）** | **20 / 15** | **164** | **并行约 5.6 分钟** | **约 500k** |

维度之间有重叠：裸 enum 字符串、没断言 `never` 的 `switch`、routes、导航 copy、Prisma 规则、baseline 的 Page structure，各被两个维度报到一次。机械层的 5 条里，tracker 死链和规则维度重复，所以合计按 51 条记、去重后 42 条。

**结论一：第一次是 baseline，之后才是增量**。42 条 finding，远超 5–10 条的上限。这不是 sweep 设计错了，是 repo 从来没扫过。第一次 sweep 需要单独处理（Q9），之后每两周的增量应该小得多。

**结论二：相当一部分应该直接变成工具**。13 条 finding 背后的规则今天就能写成 0 或接近 0 误报的 ESLint 规则或脚本（附录 B 的 ✓）；另有十几条是 partly，需要先改代码或约定格式。按 AGENTS.md › Adding a rule，它们本来就该在工具里，不该留在 prose 里。工具化之后，这些检查也就不再需要 sweep。

**结论三：最有效的检查方式是「这段时间改了什么，哪些文档没跟着改」**。文档维度报告，单次调用最值钱的检查是对每个最近的 PR 跑 `git show --stat`，看提到这个概念的 baseline 和 flows 有没有被碰到；#92 漏改 baseline 就是这样找到的。反过来，README Current State 抽查了 12 条全对，性价比最低。这决定了 sweep 应该按 diff 驱动（Q3）。

**结论四：fan-out 是必要的，不是优化**。4 个维度的最终 context 加起来约 500k。单个 session 串行做完，要么超出 context，要么后面的维度全在 context rot 里做。fan-out 之后，main session 只收 4 份约 2–3k 的报告。这和 delegation pilot 的结论一致：工具输出远大于 brief 和报告时，委派才划算。

### 最值钱的 finding（全表见附录 A）

1. **规则和代码对立**：AGENTS.md › Layers 写着「all Prisma queries — nothing else imports Prisma」，而 Data & State 要求多步写入用 `prisma.$transaction()`，于是 6 个 service 都 import 了 `prisma`。`planService.ts:536` 更进一步，直接在 service 里写了 `tx.planTemplate.deleteMany(...)`。规则需要改写（「service 只为 `$transaction` import `prisma`，查询都走 DAL」），再用 lint 守住。
2. **一条规则被系统性地忽略**：`src/utils/enums.ts` 手抄了全部 7 个 Prisma enum，还有 `SIZE_TO_POINTS`（`sizeUtils.ts` 里也有一份）。client 用这一份（46 处 import），server 用 `@/generated/prisma/client`（18 处）。文件头的理由是「Prisma 生成的 client 不能在 client component 里 import」，但现在的 generator 会生成 `src/generated/prisma/enums.ts`，文件头注明「You can import this file directly」。此外还有约 17 行生产代码用裸 enum 字符串，6 个 enum `switch` 的 `default` 不断言 `never`。
3. **改行为的 PR 漏改文档**：#92 改了 README、flows 和 reference，但 `baseline.md:23,33` 仍写着 one-off 不会被 Claude 放上 week。`baseline.md:281` 仍说「the Board is the pattern」，而 #83 之后 AGENTS.md 和同一节的下一条都说是 Projects。
4. **i18n 规则有一整块没覆盖到**：导航（`AppSidebar`、`BottomTabBar`）和登录页约 21 个硬编码的英文字符串；`en.json` 没有导航的 namespace。
5. **Sentence case 不一致**：同一个动作，Projects 写「Create plan」「Save changes」，Board 和 Plan 写「Create Your First Plan」「Save Changes」，共 8 处。
6. **依赖**：`npm audit` 报 12 high、6 moderate。直接依赖里，zod `<4.6.6` 有一个内存耗尽的 advisory（GHSA-mrhx-c7xc-m3w5），zod 在 runtime 校验 MCP 和 action 的输入；其余大多经 `prisma`（devDependency）的 `@prisma/dev` 链进来（hono、lodash、mysql2、valibot）；`npm audit --omit=dev` 仍报 15 条（10 high），这条链为什么没被当成 dev 依赖排除，没查。`npm outdated` 列出 26 个包，其中 6 个是 major。
7. **搁置的计划**：tracker 两处链接到不在 main 上的 spike（`error-handling.md`、`daily-rhythm-notifications.md`）。其中 PR #32 已经在 10-14 关闭、没有合并，tracker 却仍写着它的 spike「awaiting review」。PR #33 自 09-18 起没有动过，PR #44 自 10-07 起没有动过。

### 干净的部分（这些检查以后可以降频）

`reference.md` 和真实 export 完全一致（`comm` 比对 0 缺 0 多）；scenario 页面覆盖了每个生产页面；`ui/` 没有 import 任何 domain 代码；没有嵌套的 `data-theme`、动态拼接的 Tailwind class，也没有 Tailwind 调色板色；8 个 MCP tool 都很薄；多步写入都在 `$transaction` 里；`it.fails` 和 `eslint-disable` 各只有 1 处，都有理由；Workaround 标记都在；spike 的状态都对。

## 设计要回答的问题

1. **载体**：skill、脚本、agent 各放什么。
2. **范围**：每次查什么，查多深。
3. **修复边界**：sweep 的 PR 能直接改什么，什么只能报告。
4. **新 rule**：怎么判断一条 finding 该变成规则，规则落在哪。
5. **报告**：长什么样，放哪，下一次怎么接上。
6. **调度**：什么时候跑，上一次还没合怎么办。

## 方案

### A · 纯 skill：一份 checklist，一个 session 从头做到尾

`.claude/skills/quality-sweep/SKILL.md` 列出全部检查，被 Routine 叫起来的 session 自己逐项做。

- 优点：最简单，一个文件。
- 缺点：试跑的 4 个维度加起来约 500k context，单 session 做不完，或者后半程在 context rot 里做；机械检查每次由模型重新写 grep，结果不可复现，两次 sweep 之间没法比较趋势。

### B · skill + facts 脚本 + 一个只读 auditor，按维度 fan-out ✓ 推荐

```text
.claude/skills/quality-sweep/
├── SKILL.md            # the procedure: facts → fan-out → triage → fix → PR
├── checks/             # one checklist per dimension, briefs for the auditor
│   ├── docs.md
│   ├── architecture.md
│   ├── ui.md
│   └── rules.md
└── ledger.md           # one line per sweep + the dismissed findings (Q6)
.claude/agents/sweep-auditor.md   # read-only (Bash, Read, Glob, Grep); takes one checks/*.md + the facts
scripts/sweep-facts.mjs           # npm run sweep:facts — deterministic, no network but npm
```

流程：

1. **Facts**（脚本，确定性）：从 `ledger.md` 读上次 sweep 的 base SHA，输出一份 markdown：
   - 两次 sweep 之间合并的 PR，每个 PR 改了哪些 `src/` 区域、没碰哪些文档；
   - AGENTS.md 的总词数，和按节计算的增量；
   - living docs 的死链（README 的 Update Log 不算）；
   - `it.fails` / `eslint-disable` / `Workaround (` 清单，以及缺 upstream 链接的标记；
   - 超过 400 行的文件和行数变化、超过 100 行的 return；
   - `npm audit --omit=dev` 和 `npm audit`、`npm outdated` 的摘要（major 单列）。

   open PR 的年龄由 main session 用 GitHub MCP 补上（容器里没有 `gh`）。
2. **Fan-out**（并行）：每个维度一个 `sweep-auditor`，brief 由 `checks/<dimension>.md`、facts 里和该维度有关的部分、本次范围（Q3）组成。返回格式固定：finding（claim · 证据 `file:line` · 严重度 · 能否机器检查和机制 · 今天的误报数）、checked clean、rule gaps。
3. **Triage**（main）：去重；和 `ledger.md` 的 dismissed 列表比对，不重复报已驳回的；每条 finding 按 Q4 和 Q5 定去向；排序；报告里只展开前 10 条，其余计数。
4. **Fix**（main）：做 Q4 允许的修改，跑 AGENTS.md › Before every push 的检查。
5. **PR**：一个 branch `claude/quality-sweep-<date>`，一个 PR，正文就是报告（Q6）。按 AGENTS.md › Version Control 订阅 PR，跟到合并。

- 优点：
  - 机械部分可复现，可以和上次比较趋势；
  - judgment 部分每个维度都在干净的 context 里做；
  - main 只拿报告；
  - checklist 在 repo 里有版本，改它走 PR；
  - 只注册一个 agent，维度差异放在 `checks/*.md` 里，不用为每个维度注册一个。
- 缺点：
  - 文件最多（skill、4 份 checks、agent、脚本）；
  - fan-out 的总 token 约 4 倍于单 session（最终 context 约 500k；处理过的 token 更多，试跑没量）；
  - auditor 有 Bash，「只读」和 pilot 一样只是 prompt 约束。

### C · B，但每个维度注册一个 agent（`sweep-docs`、`sweep-ui` …）

- 优点：每个 agent 的 system prompt 就是它的 checklist，brief 更短。
- 缺点：每个 session 的 agent 列表多 4 行，而它们两周才用一次；改一个维度要同时改 agent 定义和 skill；和 B 的效果差别只在 brief 的长短。

### 不选的方向

- **只靠 code-reviewer**：它只看 diff，看不到文档没跟着改、依赖过期、跨 PR 积累的模式。两者互补，不能互相替代。
- **全部写成 CI**：附录 B 的规则应该进 CI，而且越多越好；但「这段话还对不对」「这两条规则是否冲突」「这个模式值不值得立规则」需要判断。sweep 存在的目的之一，就是把自己的检查一条条交给 CI。

## 各维度的细节

### 范围：增量 + 轮换（Q3）

- **每次都做**：facts 全量（便宜、确定性）；4 个维度都只深查**两次 sweep 之间改过的东西**，包括改过的文件、它们的直接 import 方，以及提到被改概念的文档。
- **每次轮换一个维度做全量**，按 docs → architecture → ui → rules 的顺序，每个维度每 8 周全量扫一次。全量维度的 brief 去掉范围限制，预算提高到约 60 次 tool call。
- **降频**：试跑里干净的检查（`reference.md` 比对、`ui/` 的 import、`data-theme`）只在全量轮次做；`reference.md` 的比对一旦写进 CI（附录 B #12），就从 checklist 里删掉。

### 修复边界（Q4）

| 去向 | 条件 | 例子（来自试跑） |
| --- | --- | --- |
| **fixed**：sweep PR 直接修 | 不改行为；diff 小（建议：生产代码 ≤ 15 个文件，不改 schema、不改 action 和 MCP 的签名）；已有的 test 覆盖得到 | `baseline.md` 的 5 处过时描述；tracker 的死链；`pt` / `el` 改名；8 处 sentence case；`text-[11px]` → `text-2xs` |
| **new CI rule**：sweep PR 加规则，连同修好今天的违规 | 0 或接近 0 误报；修违规的部分同样满足上一行 | `revalidatePath` 和 `href` 的字面量路由；`zod` 只在 `schemas.ts`；`id-denylist` |
| **tracker 条目** | 要改结构、改行为、或者需要设计决定 | enum 统一到 `generated/prisma/enums`；统一的 routes 和 nav config；action 错误结果的 helper；board 的 DONE → TODO 要不要在 server 端拦住 |
| **rule proposal**：只写在报告里 | 改 AGENTS.md 或 README 里的 prose 规则 | DAL 规则改写；*Page structure* 缩成一行；Themes 规则移回 design-language README |
| **dismissed** | 写明理由，记进 `ledger.md`，以后不再报 | Update Log 当天多条 bullet 算不算「一份 summary」 |

prose 规则只提案、不直接改，因为规则本身是 owner 的决定；lint 规则可以直接加，因为它只是把已有的 prose 规则落到工具里，PR 上 owner 不同意可以撤掉那个 commit。每个去向一个 commit，方便 owner 只撤其中一类。

### 新 rule 的判断（Q5）

这一节回答「要不要加新 rule」：每份报告都有一个 **Rule report** 小节，每条候选规则按下面的梯子定去向。

1. **已有规则 + 今天就能机器检查（0 或接近 0 误报）** → 写成 ESLint 规则或脚本，修掉违规，把 AGENTS.md 的那段话缩成「（ESLint）」或删掉。这一步让 AGENTS.md 变短。
2. **已有规则 + 代码一直不守** → 二选一，由 owner 定：改代码（tracker 条目），或者改写规则让它说出真实的做法。例子：Prisma import、`schemas.ts` 收全部 zod schema（4 处在外面，全都有理由）。
3. **没有规则 + 同一个模式出现 ≥ 3 处，或者连续两次 sweep 都出现** → 新规则提案。先问能不能机器检查（回到第 1 步）；不能的，按 AGENTS.md › Adding a rule 落位：只有一类文件需要的，进那类文件的 README；每个任务都需要的，才进 AGENTS.md，而且优先改写已有的规则，不新增。例子：routes 没有统一的家（3 份 `CREATE_PLAN_HREF`、17 处 `revalidatePath` 字面量）。
4. **一次性的偏差** → 修掉，不立规则。
5. **反向：规则过时或重复** → 提案删减或合并：同一条规则写在两处的（试跑找到 7 组）、示例和真实代码对不上的（AGENTS.md › Workaround 的 Good 示例引用 vercel/next.js#98303，而 `src/` 的历史里从没出现过这个 issue 号，`git log -S`；真实的 4 个 Workaround 标记都没有 upstream 链接）、lint 已经守住的。

AGENTS.md 的体量也写进 Rule report：总词数和按节的增量；每一段新增是不是「每个任务都需要」的规则（Q10）。

### 报告（Q6）

PR 正文就是报告，用英文（PR 正文的惯例），固定结构：

```markdown
## Quality sweep 2026-11-01 (base 96d9c63 → abc1234, 9 PRs merged)

**Numbers**: 7 findings (3 fixed · 2 tracker · 1 CI rule · 1 dismissed) · 12 more not expanded ·
AGENTS.md 3707 → 3790 words (+83; Layers +61) · npm audit 0 high in prod deps · full scan: docs

### Findings
1. **<claim>** — <evidence `file:line`> → **fixed** in <commit> / **tracker**: <item> / **CI rule**: <rule> / **dismissed**: <why>
…

### Rule report
- **New CI rules in this PR**: <rule> — <hits fixed>, <false positives>
- **Proposed rule changes** (owner's call, not in this PR): <rule> — <why, evidence> — <where it would live>
- **Rules to prune**: <rule> — duplicated in <file> / enforced by <tool>
- **AGENTS.md size**: <words> (<delta>), additions that aren't every-task: <list>

### Not expanded
<count per dimension, one line each>
```

`ledger.md` 每次 sweep 加一行（日期、base SHA、AGENTS.md 词数、各去向的计数），再加上累积的 dismissed 列表（finding 的指纹 + 理由）。下一次 sweep 从这里拿 base SHA 和 dismissed 列表，不依赖 GitHub 搜索。它是 skill 的状态文件，不是 living doc。

### 调度（Q7）

- **Routine**：用 `create_trigger` 建一个 scheduled task，`create_new_session_on_fire: true`，每次在一个新 session 里跑 `/quality-sweep`。cron 没有「每两周」的写法，所以用每月 1 日和 15 日（`CRON_TZ=America/Los_Angeles 46 18 1,15 * *`，即太平洋时间傍晚 18:46，避开整点和太平洋时间早上 6–9 点的拥挤时段）。另一种写法是每周跑一次，skill 自己检查距离上次 sweep 是否不到 13 天，不到就退出；这样间隔更均匀，代价是每周都要起一个空 session。
- **上一次的 sweep PR 还没合**：新的 session 不再开第二个 PR，只发一条 push notification，说明上一个 sweep PR 还开着；PR 不叠在一起。
- **环境**：facts 脚本和 lint 只需要 `npm run setup -- --no-db`；push 前的 `npm test` 要 Postgres，与其他 session 相同（Docker 加本地 stack）。
- **手动**：每个 milestone 结束时手动跑一次 `/quality-sweep`（tracker 原本就这样写）；那次一律做全量。
- **Codex**：skill 放在 `.claude/skills/`，是 Claude Code 的机制。Codex 要跑的话，让它读 `SKILL.md` 这个文件并照做；Routine 本身走 Claude Code on the web。

### sweep 自己的质量

- **dismissed 率**：连续两次 dismissed 超过一半，就收紧 checklist（多半是误报或者太琐碎）。
- **工具化率**：每次 sweep 把多少条检查交给了 CI；checklist 应该越来越短。
- **漏网**：owner 在 PR 上指出的 drift，如果 sweep 本该查到，就补进对应的 `checks/*.md`。
- **成本**：每次记下 4 个 auditor 的 tool calls、耗时和 token，写进 `ledger.md` 那一行。

## 实施计划（按推荐的 B）

全部在本 PR 里做，按 AGENTS.md › Version Control › *One task, one branch, one PR*。

| 步骤 | 做什么 | 验证 |
| --- | --- | --- |
| 1 | `scripts/sweep-facts.mjs` + `npm run sweep:facts`：附录 C 的各项 facts，输出 markdown；第一次运行时没有 ledger，base 取 `96d9c63` | 在本 branch 上跑，输出和本 spike 的机械层数字一致 |
| 2 | `.claude/agents/sweep-auditor.md`：只读，`tools: Bash, Read, Glob, Grep`；body 写返回格式和「不改文件」，具体检查放在 brief 里 | 新 session 里能按名字调用；`tools` 列表里没有 Edit / Write |
| 3 | `.claude/skills/quality-sweep/SKILL.md` + `checks/*.md`：checks 从这次试跑的 4 份 brief 改写，删掉干净且低效的检查，把各 auditor 报告的成本经验（例如 grep `TODO` 会命中 `TaskStatus.TODO`）写进去 | — |
| 4 | 第一次真实 sweep，按 Q9 的决定处理附录 A 的 baseline | sweep PR 本身：CI 绿，报告符合上面的模板 |
| 5 | 用 `create_trigger` 建 Routine（Q7 定的时间） | `list_triggers` 里能看到它，`next_run_at` 正确 |
| 6 | 文档：AGENTS.md › Subagents 加 `sweep-auditor` 一行；tracker 的 Step 13 在完成后删掉；README Update Log；spike 归档 | — |

## 待 owner 决定

| # | 问题 | 选项 | 推荐 |
| --- | --- | --- | --- |
| Q1 | sweep 和 code-reviewer 的分工 | a 按上面的三层表分：sweep 只管「这段时间」，reviewer 管「这个 diff」· b 先不做 reviewer，sweep 兼管 diff | **a**：两者看的东西不重叠；顺序（Step 13 和 14 谁先）由 owner 按 milestone 定 |
| Q2 | 载体 | A 纯 skill · B skill + facts 脚本 + 一个 auditor · C 每个维度一个 agent | **B** |
| Q3 | 范围 | a 每次全量 · b 增量 + 每次轮换一个维度全量 · c 只做增量 | **b**：试跑里最有效的检查就是增量；轮换保证旧代码每 8 周被看一次 |
| Q4 | 修复边界 | 上面的表；其中「直接修」的大小上限 | 按表；上限：生产代码 ≤ 15 个文件，不改 schema 和签名 |
| Q5 | lint 规则能不能在 sweep PR 里直接加 | a 能（连同修违规，每类一个 commit）· b 只提案 | **a**：它只是把已有的 prose 规则落到工具里；prose 规则的改动一律只提案 |
| Q6 | 报告和状态放哪 | a PR 正文 + skill 里的 `ledger.md` · b 每次一份 `design/sweeps/<date>.md` · c GitHub issue | **a**：报告不是 living doc；`ledger.md` 让下次 sweep 不依赖 GitHub 搜索 |
| Q7 | 节奏和时间 | a 每月 1 日、15 日 · b 每周触发、skill 自己跳过不到 13 天的；时间？ | **a**，太平洋时间 18:46；owner 定具体时间 |
| Q8 | 依赖升级 | a 只报告 · b patch 和 minor 在 sweep PR 里升（单独一个 commit），major 和 audit 进 tracker · c 每次单独开一个依赖 PR | **b**；`npm audit` 里生产依赖的 high（今天是 zod）不论 patch 还是 minor 都在 sweep PR 里修 |
| Q9 | 这次试跑的 42 条 finding（附录 A） | a 本 PR 修 0 误报的那批（附录 B 的 ✓），其余进 tracker · b 留给第一次真实 sweep，即实施的第 4 步 · c 全部进 tracker | **b**：第一次 sweep 正好用来验证 skill；它会超过 10 条的上限，那次报告不设上限 |
| Q10 | AGENTS.md 的体量 | a 只报告增量 · b 设一个软上限（例如 3500 词），超过时 Rule report 必须提出删减 | **b**：精简 spike 的 Q7 不做 CI 检查，软上限只进报告，不让 CI 变红 |

---

## 后来的想法（2026-10-31，做这个任务时再考虑）

来自 page-structure 实验收尾（`experiments/page-structure-parallel/try2/report.md`、`design/spike/experiment-setup.md`），还没定，不进本 spike 的方案：

- **评估集的重跑频率交给 sweep**：evals 仓库（`mars-workbench-evals`，每个任务一个 case）里的 case 不必每次都跑。case 测的规则、模型或 agent 定义一变就重跑；某类缺陷基本不再出现（约 1 / 100 个实现）之后改成每月一次；一个 case 的缺陷类别都不再出现就归档。sweep 每两周跑一次，正好可以顺带看哪些 case 到期、哪些类别可以降频。

## 附录 A · 试跑的 finding（去重后）

去向是按上面「修复边界」和「新 rule 的判断」给的建议。✓ = 附录 B 里有 0 或接近 0 误报的机制。

**文档 vs 代码**

| # | finding | 证据 | 建议去向 |
| --- | --- | --- | --- |
| D1 | baseline 仍说 one-off 不会被 Claude 放上 week | `baseline.md:23,33` vs `schemas.ts:277,337`（#92） | fixed |
| D2 | baseline 的 Page structure 仍以 Board 为标准 | `baseline.md:281` vs `:287`、AGENTS.md › *Page structure* | fixed |
| D3 | baseline 的 schema 块缺大部分 index 和 `onDelete: Cascade`；「每个用户最多一个 ACTIVE plan」列在 Constraints 下，但数据库里没有这个约束 | `baseline.md:66-228,98` vs `prisma/schema.prisma` | fixed（schema 块标明「fields only」，或者用脚本比对，附录 B #13） |
| D4 | baseline 的 sidebar 只写了 Board/Plan；DumpEntry 仍标「V1 pending」 | `baseline.md:28,62` | fixed |
| D5 | board flow 写着「no backwards movement」，但 server 端不拦 DONE → TODO，只有 UI 拦 | `flows/board.md:41` vs `schemas.ts:89-92`、`tasks.ts:266-273` | tracker（要不要在 server 端拦，是行为决定） |
| D6 | board flow：「two parallel queries」实际是 4 个；链到 baseline 里不存在的一节；Backlog 步骤带 UI 细节 | `flows/board.md:53,151,163-167` | fixed |
| D7 | baseline 说每个 read action 都调 service；dump 的读直接调 DAL | `baseline.md:280` vs `dumpActions.ts:79,92` | fixed（改措辞） |

**架构和数据**

| # | finding | 证据 | 建议去向 |
| --- | --- | --- | --- |
| A1 | enum 常量三个来源，`utils/enums.ts` 整份手抄；`SIZE_TO_POINTS` 两份 | `utils/enums.ts`、`sizeUtils.ts:3-11`、`generated/prisma/enums.ts` | tracker + 规则改写（统一来源） |
| A2 | service 里直接写 Prisma 查询 | `planService.ts:536` | fixed + ✓ |
| A3 | 约 17 行生产代码用裸 enum 字符串；`'MEDIUM' as TaskSize` 用类型断言把字面量藏了起来 | `lib/db/tasks.ts`、`plans.ts`、`PlanForm.tsx:239,250` 等 | fixed + ✓（SQL 里的 14 行另议） |
| A4 | 6 个 enum `switch` 的 default 不断言 `never`，或者没有 default | `TaskCardMiniFace.tsx:44`、`TaskCardFace.tsx:55,72`、`ProjectStep.tsx:78`、`tasks.ts:608`、`planService.ts:128` | fixed + ✓（需要 type-aware lint，见附录 B #4） |
| A5 | action 的错误结果手写了 8 次；`errorResult` helper 只在一个文件里 | `matrixActions.ts` ×4 等；`projectActions.ts:45` | tracker（Step 12 的 shared action handler 正好覆盖） |
| A6 | 路由字面量和重复的路由常量 | 17 处 `revalidatePath('/kanban…')`、9 处 `href="/…"`、3 份 `CREATE_PLAN_HREF`、2 份 `BOARD_PATH` | tracker（统一的 routes 和 nav config）+ ✓ |
| A7 | zod schema 有 4 个在 `schemas.ts` 外面，其中 `uuidSchema` 重复 | `planService.ts:73`、`projectService.ts:55` 等 | fixed + ✓ |
| A8 | 缩写命名 `pt` ×6、`el` ×4、`err` ×1 | `PlanForm.tsx`、`syncService.ts:48`、dump 组件 | fixed + ✓ |
| A9 | 逐行写入：一个已经接受数组的 DAL 被逐个调用 | `planService.ts:542-554` | fixed |
| A10 | 近似重复的 DAL 函数；完成率公式两份；carry-over 的查询不对称 | `projects.ts:203,220`、`tasks.ts:510,621`、`statsUtils.ts:37` | tracker |
| A11 | action 里有业务逻辑（cursor 编解码、分页） | `dumpActions.ts:26-86` | tracker（Dump 换页面结构时一起做） |

**UI 和组件**

| # | finding | 证据 | 建议去向 |
| --- | --- | --- | --- |
| U1 | 导航和登录页约 21 个硬编码英文；折叠按钮没有 aria-label | `AppSidebar.tsx`、`BottomTabBar.tsx:51-80`、`LoginScreen.tsx:27-57` | fixed + ✓ |
| U2 | 导航模型写了两份，active 判断写了三份 | `AppSidebar.tsx:54-58`、`BottomTabBar.tsx:41-45`、`AppShell.tsx:34-35` | tracker（和 A6 一起） |
| U3 | 8 个按钮文案是 Title Case，同一个动作有两种大小写 | `en.json` 的 `Board.Empty.newCta`、`TaskModal.submit.*` 等 | fixed |
| U4 | `text-[11px]` ×28、`text-[10px]` ×8，与已有的 `text-2xs` / `text-3xs` token 重复 | `globals.css:162` | fixed + ✓ |
| U5 | 4 个 return 超过 100 行 | `PlanForm.tsx:552`（154 行）、`ProgressDashboard.tsx:40`、`TemplateItem.tsx:37`、`AppSidebar.tsx:125` | tracker（PlanForm 等 Plan week 时重写） |
| U6 | 重复的 markup 和逻辑：品牌 SVG、首字母缩写、`FADE_UP` 7 份 | `BrandIcon.tsx:12` / `AppSidebar.tsx:144` 等 | fixed |
| U7 | `style` 里放静态渐变 | `AuthBackdrop.tsx:11,24` | fixed + ✓ |
| U8 | theme 变量以调色板命名（`--login-glow-cyan` …） | `globals.css:1305-1339` | fixed |
| U9 | props 内联类型，没用 `interface` | `BreakpointProvider.tsx:23`、`PlanChrome.tsx:12`、`TaskCard.tsx:10` | fixed + ✓ |
| U10 | `TemplateItem` 的颜色通道和 design-language 的约定不一致（habit 应该是 success） | `TemplateItem.tsx:105-138` | tracker（要看 UI，Plan week 时一起） |
| U11 | Tailwind 写法混用：`flex-shrink-0` / `shrink-0`、`h-N w-N` / `size-N`、`bg-gradient-to` / `bg-linear-to` | 约 57 处 | CI rule 提案（附录 B #10） |
| U12 | `themeColor` 写死 mars-dark 的颜色；两处多余的 `'use client'` | `app/layout.tsx:35`、`TaskCardMiniFace.tsx`、`MoveToPopover.tsx` | tracker（`'use client'` 已在 Uniform page header 条目里） |

**规则体系和 hygiene**

| # | finding | 证据 | 建议去向 |
| --- | --- | --- | --- |
| R1 | DAL 规则和 `$transaction` 规则、和代码对立 | AGENTS.md › Layers vs › Data & State；6 个 service | rule proposal + ✓ |
| R2 | 同一条规则写在两处（7 组）：Themes、Local work、Verification、mockup 生命周期、Production first、subagent 触发条件、test 命令 | AGENTS.md vs `design-language/README.md`、`baseline.md`、`test/README.md`、`design/README.md`、`src/app/design/README.md`、`.claude/agents/*` | rule proposal（删 AGENTS.md 里的副本，留指针） |
| R3 | AGENTS.md +36%，*Page structure* 只有页面任务用得上 | 见「为什么等不了」 | rule proposal |
| R4 | 已 decided 的 spike 计划继续编辑自己 | `component-structure.md:3` vs `spike/README.md` | dismissed 或 rule proposal（实验结果放哪，owner 定） |
| R5 | tracker 链接两个不在 main 上的 spike；PR #32 已关闭 | `tracker.md:83,95` | fixed（改写这两个条目）+ ✓（链接检查） |
| R6 | Next.js 的 Workaround 标记没有 upstream issue，下次升级时没东西可查；AGENTS.md 的 Good 示例引用的 issue 号在代码历史里不存在 | `PlanForm.tsx:40`；AGENTS.md › Workaround | fixed（补 issue，或者注明没有）|
| R7 | AGENTS.md Commands 缺 `db:seed`；gallery tab 名和 console README 不一致；Project Structure 少 `.github/` | AGENTS.md vs `package.json`、`src/app/design/README.md:3` | fixed + ✓ |
| R8 | Update Log 当天多条 bullet，算不算「一份 summary」 | README 10-26、10-22 | dismissed 或改写规则（owner 定） |

**机械层**

| # | finding | 证据 | 建议去向 |
| --- | --- | --- | --- |
| M1 | `npm audit`：12 high、6 moderate；直接的 runtime 依赖里有 zod `<4.6.6` | GHSA-mrhx-c7xc-m3w5 | fixed（升 zod）+ tracker（prisma CLI 链） |
| M2 | 26 个包过期，6 个 major（TypeScript 7、ESLint 10、knip 6、Prisma 8 rc 等） | `npm outdated` | Q8 |
| M3 | open PR 搁置：#33（09-18 起没动）、#44（10-07 起没动，tracker Board › Medium 引用它） | GitHub | 报告给 owner（关还是继续，owner 定） |
| M4 | 热点文件：`PlanForm.tsx` 707 行、`planService.ts` 697、`planningService.ts` 687、`lib/db/tasks.ts` 624（10-13 以来改了 7 次） | `wc -l`、`git log` | 只报告，跟踪趋势 |

## 附录 B · 候选 CI 规则（回答「要不要加新 rule」）

「今天的命中」是试跑报告的数字，没有在 CI 上验证。✓ = 0 或接近 0 误报，可以随第一次 sweep 落地。

| # | 规则 | 机制 | 今天的命中 / 误报 | 守的是 |
| --- | --- | --- | --- | --- |
| 1 ✓ | service 里不直接写 Prisma 查询 | `no-restricted-syntax`，限 `src/services/**`：`CallExpression[callee.object.object.name=/^(tx\|prisma)$/]` | 1 / 0 | Layers › DAL |
| 2 ✓ | `prisma` 只在 DAL 和 service 里 import（service 仅为 `$transaction`） | `no-restricted-imports` `@/lib/prisma`，排除 `src/lib/db/**`、`src/services/**` | 0 / 0（随 R1 的规则改写） | Layers |
| 3 ✓ | 生产代码不用裸 enum 字符串 | `no-restricted-syntax` `Literal[value=/^(BACKLOG\|TODO\|…)$/]`，排除 `utils/enums.ts`、generated、console 和 `Property > Literal` | 约 17 / 约 3 | Enums |
| 4 | enum `switch` 必须穷尽 | `@typescript-eslint/switch-exhaustiveness-check`（`considerDefaultExhaustiveForUnions: false`） | 6 / 约 1；**需要打开 type-aware lint**（`parserOptions.projectService`），今天没开，lint 时间会变长，没量 | Enums |
| 5 ✓ | `revalidatePath` 和 `href` 不写字面量路由 | `no-restricted-syntax`：`CallExpression[callee.name='revalidatePath'] > Literal`、`JSXAttribute[name.name='href'] > Literal[value=/^\//]` | 26 / 0（要先有 routes 模块，A6） | No magic literals |
| 6 ✓ | zod 只在 `src/schemas.ts` 里 import | `no-restricted-imports` `zod` | 4 / 0（其中 2 处有理由，可加 eslint-disable 注释，或者规则改写） | Project Structure |
| 7 ✓ | 禁用常见缩写 | `id-denylist`：`el`、`pt`、`err`、`ctx`、`fn`、`cb`、`idx`、`res`、`req` | 11 / 0 | Name things plainly |
| 8 ✓ | JSX 里的文字走 next-intl | `react/jsx-no-literals`，限生产组件，`allowedStrings` 放装饰性字符 | 约 21 / 10–15（要先调好 `allowedStrings`） | i18n |
| 9 ✓ | 不用与 token 重复的任意值 | `no-restricted-syntax`：字符串匹配 `/\btext-\[1[01]px\]/` | 36 / 0 | No magic literals（style tokens） |
| 10 | Tailwind class 用规范写法 | `eslint-plugin-better-tailwindcss`（`enforce-shorthand-classes` 等），新依赖 | 约 57 / 没量 | 新规则提案 |
| 11 ✓ | `style` 只放动态值 | `no-restricted-syntax`：`style` 对象里没有 identifier 或插值 | 2 / 0 | Styling |
| 12 ✓ | `reference.md` 和真实 export 一致 | 脚本（约 15 行 `awk` + `comm`），进 CI | 0 / 0 | reference.md |
| 13 | baseline 的 schema 块和 `schema.prisma` 一致 | 脚本解析两边的 `model` / `enum` 块，比较字段、`@@index`、`onDelete` | 多处（D3）；需要先约定 schema 块是 full 还是 fields only | baseline.md |
| 14 ✓ | living docs 没有死链 | 脚本（README Update Log 除外） | 2 / 0 | 文档 |
| 15 ✓ | AGENTS.md 的 Commands 和 `package.json` 的 scripts 一致 | 脚本 | 1 / 0 | AGENTS.md 的索引 |
| 16 | props 用 `interface` | `@typescript-eslint/consistent-type-definitions` + `no-restricted-syntax` | 3 / 0，Next 约定文件另有 5 处 | Code Style |
| 17 | 组件文件夹用 kebab-case | `eslint-plugin-check-file`，新依赖 | 没量 | General |

1、2、3、5、6、7、9、11、12、14、15 落地之后，AGENTS.md 里对应的 prose 可以缩成「（ESLint）」或「（CI）」。

## 附录 C · facts 脚本的输出项

| 项 | 怎么算 | 试跑时的值 |
| --- | --- | --- |
| 两次 sweep 之间的 PR | `git log <base>..HEAD --merges` 或者 squash commit 的 `(#N)`；每个 PR 的 `--stat` 按 `src/` 区域和 `design/` 文档归类 | — |
| AGENTS.md | 总词数；按 `##` / `###` 节和 base 比较增量 | 3707（10-17 以来 +987） |
| 死链 | living docs（`design/**` 除 `spike/archived/`、`AGENTS.md`、各 README）里的 `design/…` 路径 | 2 |
| 临时例外 | `it.fails`、`eslint-disable`、`Workaround (`；缺 upstream 链接的标记 | 1 / 1 / 4（4 处都没有链接；WebKit 和 iOS 的可能本来就没有 issue） |
| 热点 | 超过 400 行的生产文件（不算测试和 console）和行数变化；超过 100 行的 return | 7 个文件（含 `globals.css`）/ 4 个 return |
| 依赖 | `npm audit --omit=dev` 和全量的计数；`npm outdated`，major 单列 | 全量 12 high · 6 moderate，`--omit=dev` 10 high · 5 moderate；26 个过期，6 个 major |
