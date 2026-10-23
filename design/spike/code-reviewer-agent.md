# Spike: code-reviewer subagent — 怎么量 review 的质量

**Status: awaiting owner review** · 2026-10-23 · 回答 tracker 条目 *Code-review subagent*（Cross-cutting › Medium）· 相关：`design/spike/archived/subagent-delegation-pilot.md`（三个 agent 的分工，decided）· 草案：`.claude/agents/code-reviewer.md`

> 语言说明：正文中文；product 名词、状态和代码标识符保留英文（subagent / diff / finding / `ensureSynced` / `code-reviewer`），与代码和 tracker 一一对应。

## TL;DR

- **问题**：加一个 `code-reviewer` subagent，push 前拿 AGENTS.md 和 diff 审一遍。它的目标是质量，不是省 main context：review 本来就不占多少 main context（diff 和文件 main 都读过了），委派之后还要多付 brief 和报告（pilot 量过，每次约 2–5k）。
- **要验证三个假设**：
  - H1：干净 context 的 reviewer 比做了很久的 main session 自查抓得多；
  - H2：它抓到的东西，lint 和 CI 抓不到；
  - H3：误报少到值得读。
- **怎么量**：先做一次性评估——埋 bug 的 case、历史回放、和 main 自查对照、每个 case 跑两次看稳定性；通过之后，再在 3–5 个真实 PR 上试用、记录。门槛先定再量（Q3）。
- **本 PR 带什么**：这份 spike 和定义草案。草案在这个 branch 上已经注册。中途加进来的 agent 文件要过几分钟才能按名字调用：本 session 刚写完就调用，报 not found；几分钟后它出现在了可用列表里（pilot 第 1 轮几分钟后仍然没有）。评估在一个从这个 branch 新开的 session 里跑最稳妥。
- **要 owner 回答**：Q1–Q8。回答之后跑 Round 0 和 Round 1。

## 起因

- **Owner 的观察**：subagent 目前最大的收益是 main context 下降。下一步想加一个 code review agent：context 干净，只按 AGENTS.md 和 diff 判断，避开 context rot，和 `ui-verifier` 配合使用。
- **Pilot 没测这一类**：`archived/subagent-delegation-pilot.md` 把委派的价值分成三处——(a) main context，(b) 质量，(c) 并行。三个 agent 主要靠 (a) 立足；「适合的场景」第 3 条列了干净 context 的 review（generator-verifier），没测过。
- **现在的 review 只有三层**：
  1. CI：`format:check`、`lint`、`typecheck`、`knip`、`check:themes`、Vitest、Playwright；
  2. main session 写完自己看；
  3. owner 在 session 对话和 Vercel preview 上验收。

  GitHub 上没有 review bot，PR 上也没有 review thread（查了 #62、#79：只有 Vercel bot 和 session 自己的说明）。所以 lint 管不到的那部分规则，靠的是 main session 的注意力，和 owner 有没有看到。
- **Context rot 在这里是真的**：pilot 第 3 轮的 main baseline 是 112k–207k。AGENTS.md 在 context 最前面，越往后越被稀释；写代码的 session 也已经认同了自己的写法。

## Reviewer 管什么

AGENTS.md 的规则分两类。

**CI 已经管的，reviewer 不报**：

- Prettier 格式；
- ESLint（`eslint.config.mjs`）：no `any`、no `console.log`、components / hooks / stores 不 import server-only module、named export、`const` arrow component、一个文件一个 component、单字母命名；
- 类型（`tsc`）、没人用的 export 和文件（knip）、每个 theme 声明同一套变量（`check:themes`）、test 是否通过。

**只能读代码判断的，是 reviewer 的范围**：

- Layers：action 和 MCP tool 要薄，逻辑在 service，查询只在 DAL，`ensureSynced` 是唯一的 sync 入口；
- Component 放 `ui/` / `application/` / `domain/` 哪一层（「`ui/` 不 import domain type」没有 lint）；
- *Server shapes inputs*；DRY 和 `Record<Key, string>` 的字面量 class；
- `Record<Enum>`、`default` 断言 `never`、enum 常量不用裸字符串；
- i18n、sentence case、magic literal；
- Heroicons、不用 inline style、semantic token、不嵌套 `data-theme`；
- return 是 outline；命名说清楚它是什么（单字母以外）；LLM-facing error 放 `errorMessages.ts`；
- batch write、`$transaction`、focused `select`；
- *Production first*；
- Before every push 的四项文档；
- `test/README.md` 的规则。

再加两样：changed lines 里的 bug（必须给出具体的失败场景），以及 diff 有没有做到 brief 说的事。

## 草案要点

全文在 `.claude/agents/code-reviewer.md`，形状照 `ui-verifier`：

1. **只读**：`Bash, Read, Glob, Grep`，没有 Edit / Write，Bash 用来 `git diff`。和 pilot 一样，「不改文件」对 Bash 仍然只是 prompt 约束。
2. **Brief 只有两样**：一句话说这个改动要做什么，加 base ref。不给设计理由，不说 main 担心哪里，也不让它读 PR description 和 commit message：给了就把 main 的视角带回去了（Q2）。
3. **规则来源固定**：AGENTS.md，加上 *Where the rules live* 表里 diff 涉及的文件类型对应的 README，别的不读。代码只读 hunk 周围、判断需要的部分。
4. **每条 finding**：标 blocking / optional；引用一行规则原文，或者给出失败场景；置信度 high / medium，low 的丢掉；最多 10 条；没有 finding 是合法结果。
5. **两个副产品字段**：
   - `Pre-existing`：diff 没碰的行上的问题，最多 3 条（Q7）；
   - `Rules unclear`：它不得不自己解释的规则。这一项量的是 AGENTS.md 写得清不清楚，不算 reviewer 的对错。
6. **Model**：`inherit`（Q6）。

## 指标

| 指标 | 怎么算 | 回答哪个假设 |
| --- | --- | --- |
| Precision | 真问题 ÷ 报出的 finding；blocking 单独算 | H3 |
| Recall | 抓到的埋点 ÷ 埋点总数，按类别分 | H1、H2 |
| 增量 | reviewer 抓到、而 CI 和对照组都没抓到的问题数 | H1、H2 |
| Severity 校准 | 标 blocking 的 finding 里，裁决后确实该挡的比例 | H3 |
| 稳定性 | 同一 case 跑两次：两次都抓到的埋点 ÷ 至少一次抓到的埋点 | 结果可不可信 |
| 成本 | subagent token、wall time、main 多出的 context（brief + 报告） | 只记录，不是目标 |

一条 finding 要和一个埋点「对上」，须是同一个文件、说的是同一个问题；行号可以差几行。没对上任何埋点的 finding 逐条裁决：是真问题就算 true positive（干净的 diff 上也可能有真问题），不是才算误报。

## Ground truth 从哪来

### 1. 埋 bug 的 case（可控，可以重跑）

照 pilot 第 2 轮的做法：

1. **另开 worktree 埋点**：由一个 general-purpose agent 在一个真实大小的 diff 上埋 3–5 个问题，答案写进 scratchpad 里的文件。main session 只拿到 patch 路径和埋点数量。
2. **埋什么**：从上面「reviewer 的范围」里挑，每个 case 再埋一个正确性 bug。每个埋点都要过 `format:check`、`lint`、`typecheck`、`knip`，不然量的是 lint，不是 reviewer。
3. **case 数量**：4 个埋了问题的 case（E1–E4），加 2 个干净的 diff（C1、C2：已合并、之后没有修过的小 PR，不用 Round 0 用过的那个），专门看误报。
4. **贴近真实错误**：比如漏一条 Update Log、`ui/` 里 import 了 domain type、`switch` 用 `default` 兜底、一个 load 时就固定的列表在 save 时覆盖了别人的改动。埋点的 agent 和 reviewer 是同一个模型，盲点相关；owner 亲手写一两个能补上这一点（Q4）。
5. **防过拟合**：留一个 case 不参与调 prompt，只在最后跑。

### 2. 历史回放（真实，但少）

挑的是当时 main session 和 owner 都漏掉、后来才修的问题，所以会是最难的几个 case。checkout PR 合并时的 head，按 head 上当时的 AGENTS.md 审：

| Case | PR | 当时漏掉的 | 在哪修的 | 类型 |
| --- | --- | --- | --- | --- |
| R1 | #60 auth（`getClaims` + `cache`） | diff 改到了 root layout 里 `getActivePlan(claims.sub)` 这一行。它不走 `ensureSynced`，新一周第一次访问时，Plan 链接打开的还是上周的 plan。当时的 AGENTS.md 已经写明 `ensureSynced` 是唯一的 sync 入口 | #63 | 规则；diff 碰到了这一行，但问题在这之前就有 |
| R2 | #56 Week model PR 4a | Plan form 提交的是 load 时的整份 `projectStepIds`（one-off 也是）：表单打开期间别处加进这一周的东西，save 时会被退回。当时 step 还没有别的入口，one-off 有（matrix） | #63 | 并发 / stale state |
| R3 | #75 test baseline | e2e journey 在 optimistic update 之后马上 reload，把还没返回的 server action 打断；CI 慢的时候就红 | #79 | test |

R1 检验 diff 里碰到的规则问题会不会被注意到；R2、R3 检验 bug 那一部分。Clone 是 shallow 的（50 个 commit），三个 PR 都在里面。

### 3. 真实 PR 上的记录（试用阶段）

每个 PR 的 description 加一小段：reviewer 报了几条，每条的结局是什么。结局分五种：真问题·已修 / 真问题·不修 / 误报 / 规则歧义 / pre-existing。之后由 owner、CI 或后来的 PR 发现、而 reviewer 当时看过却漏掉的问题，记为 escape。

## 对照组

H1 要和不委派的做法比，不然分不清功劳是「做了一次 review」的，还是「context 干净」的。

- **A（main 自查）**：Round 1 的 main session 用同一份规则清单、同一种报告格式，自己审这个 diff。每个 case 都是 A 先做，而且在看到 B 的报告之前写完。到后面几个 case 时，main context 已经装满了前面的 diff 和报告，接近长 session；审的时候记下 context 大小。
- **B（`code-reviewer`）**：每个 case 跑两次（稳定性）。
- **B′（内置 `/code-review`，可选）**：同样的 case 各跑一次。如果它和 B 一样好，就不需要自定义 agent（Q5）。

Round 1 里的 A 只能测到「context 长」这一半：这些代码不是它写的，没有「作者认同自己写法」的锚定。那一半只能在真实 PR 上测：试用时，main 先把自查的结果写进 PR description，再委派，最后把两份结果放在一起比。

## 门槛（先定再量，Q3）

建议的起点：

- Precision ≥ 70%，blocking 的 ≥ 80%。
- 埋点 recall ≥ 60%，而且 B 比 A 至少高 20 个百分点。差不到 20 个点，说明 H1 不成立，改用 main 自查加 checklist（Option 3）。
- 稳定性 ≥ 70%。
- 试用的 3–5 个 PR 里，至少有一次抓到 CI 和 main 自查都漏掉的 blocking 问题。

## Options

| Option | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| 1 · 自定义 `code-reviewer` | 本 spike 的草案 | 按这个 repo 的规则审；context 干净；只读 | 冷启动 16k 起，再加上读 AGENTS.md 和 diff；每次多几分钟 wall time；要维护一份定义 |
| 2 · 内置 `/code-review` | Claude Code 自带的 skill | 不用维护；偏通用的正确性检查 | 不一定按 AGENTS.md 的规则审；报告格式不归我们管 |
| 3 · main 自查加 checklist | push 前，main 按一份清单自己过一遍 | 最便宜，不多花 wall time | 正好落在 context rot 和作者锚定那一边 |
| 4 · GitHub 上 review（CI job 或 review app） | 每次 push 之后在 PR 上审 | 有记录，不依赖 session 自觉 | 每次 push 都要付钱；finding 变成 PR thread，session 都得回复；和 1 一样要先证明质量。本 spike 不评估 |

Round 1 同时给 1、2、3 打分；4 等 1 证明有效之后再说。

## 实施计划

1. **Owner 回答 Q1–Q8**，按回答改草案和这份 spike。
2. **Round 0 · smoke**：从这个 branch 开一个新 session，`code-reviewer` 一开始就注册好了。拿一个小的真实 diff（比如 #76）跑一次，确认它拿得到 diff、读对了规则文件、报告格式对，跟着改定义。
3. **Round 1 · 评估**，在同一个 session 里：
   1. 埋点 agent 做 E1–E4（其中一个留作最后验证），答案封存；选出 C1、C2；准备 R1–R3 的 worktree。
   2. 每个 case 依次跑 A → B 第 1 次 → B 第 2 次 →（B′）。
   3. 全部跑完才打开答案，逐条裁决。main 判成误报的 finding 由 owner 复核：main 天然倾向于把 finding 判成误报。
   4. 算指标，写进 spike；owner 拍板，结果写进 Decision。
4. **通过之后试用**：本 PR 合并，定义随之进 main；description 去掉 pilot，写上触发条件；AGENTS.md › Subagents 加一行；tracker 加一条「3–5 个 PR 之后按门槛定去留」，像 `ci-fixer` 的复测条目那样。
5. **不通过**：删掉定义，或者按结果收窄范围（比如只查四项文档），或者改用 Option 3。

试用时的流程（Q8）：本地 checks 全绿之后、第一次 push 之前跑一次；修 finding 的改动很大时再跑一次。改动小的时候，它和 `ui-verifier` 并行（两个都只读）；reviewer 可能引出 UI 改动时，先 review、修完，再跑 `ui-verifier`。

## 开放问题

1. **Scope**：以 AGENTS.md 规则为主、changed lines 里的 bug 为辅（草案）；还是只查规则；还是也做通用的 bug hunt？
2. **Brief**：只给意图一句话和 base ref（草案），还是也告诉它 main 担心哪里？后者能把它引向风险点，代价是带回锚定。
3. **门槛**：上面那组数字行不行？
4. **埋点**：owner 要不要亲手写一两个 case 或埋点？
5. **B′**：Round 1 要不要把内置 `/code-review` 也作为一组来跑？每个 case 多一次运行。
6. **Model**：`inherit`（草案，质量是目标），还是用 `sonnet` 省钱？
7. **Pre-existing**：diff 没碰的行上的问题，单独列、最多 3 条（草案），还是完全不报？
8. **试用时的触发和去向**：第一次 push 前跑一次，finding 只回给 main、不发到 GitHub（草案），行不行？
