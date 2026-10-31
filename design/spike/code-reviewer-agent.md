# Spike: code-reviewer subagent — 规则遵守和藏得深的 bug

**Status: awaiting owner review** · 2026-10-23 起草，2026-10-31 按 owner 的反馈改写 · 回答 tracker 条目 *Harness engineering › 3 · Code review agent*（Quality gate › Step 14 指向它）· 相关：`design/spike/archived/subagent-delegation-pilot.md`（三个 agent 的分工，decided）、PR #94 的 `quality-sweep.md`（两周一次的 drift sweep）· 给 agent 的定义：`.claude/agents/code-reviewer.md` · 给人看的说明：`.claude/agents/README.md`

> 语言说明：正文中文；product 名词、状态和代码标识符保留英文（subagent / diff / finding / golden set / `ensureSynced` / `code-reviewer`），与代码和 tracker 一一对应。

## TL;DR

- **问题重新定义（owner，2026-10-31）**：CI 和测试已经能抓到绝大部分 bug。review 要抓的是 CI 抓不到的两类：不符合书面规则的代码，和藏得深的 bug。
- **已定**：
  - 每个 PR 第一次 push 之前都跑（per change）；两周一次的 sweep 另议（Step 13）。
  - 审的单位是**被改到的整个函数**，不是 diff 那几行：这来自 owner 的 tech lead 吃过的亏，本地例子是 #60。
- **文档分两份**：`.claude/agents/README.md` 给人看，写为什么、怎么做；`.claude/agents/code-reviewer.md` 给 agent，只放关键规则和例子。
- **对照了公开实践**：Claude Code 官方文档、Anthropic 官方的两份 review 定义、obra/superpowers 的 reviewer。
  - 采用：引用规则原文、报之前逐条验证、只读（连 HEAD 都不动）、不重跑 CI。
  - 有意不同：Anthropic 的 `code-review` 只看 diff、把 pre-existing 当误报；这里看整个被改函数。
- **怎么量**：一个 golden set，即历史里真实漏掉的问题（第一版 10 条，7 条已核实），加上 try2 的十个实现和它们的盲审。先在这上面量 recall 和 precision，再决定进不进 AGENTS.md。埋点和 main 自查对照降为可选（Q4）。
- **待 owner**：Q4–Q10；Q1–Q3 已答。

## 起因

- **最初的想法**：subagent 目前最大的收益是 main context 下降；owner 想加一个 code review agent，context 干净，只按 AGENTS.md 和 diff 判断，避开 context rot。
- **2026-10-31 的重新定义**：通用的 per-PR reviewer 加上一整套评估，对这个规模的 repo 偏重。数据：
  - bug 很少在合并后才被发现：golden set 里只有寥寥几条，而且 unit、integration、e2e 从 #75 起每个 PR 都跑；
  - 规则漂移是真的：quality sweep 在 `main` 上试跑（PR #94）一次就有 42 条，全是代码和规则对不上，没有一条是 bug；
  - 规则改得勤：最近 54 个 PR 里 30 个改了 AGENTS.md，它从精简落地（10-17）的 2769 词涨到 3651 词。
  
  所以 reviewer 的价值在于：拿书面规则核对改动；找 CI 和测试碰不到的 bug；改动让文档或规则里的例子失效时指出来。
- **现在的 review 只有三层**：CI；写代码的 session 自己看；owner 在对话和 Vercel preview 上验收。GitHub 上没有 review bot。lint 管不到的规则，靠的是写代码的 session 的注意力。
- **作者最后才审**：pilot 第 3 轮的 main baseline 是 112k–207k，AGENTS.md 在 context 最前面，越往后越被稀释，写代码的 session 也已经认同了自己的写法。

## 来自 page-structure 实验的证据（2026-10-31）

`experiments/page-structure-parallel/` 的两轮一共有 16 份盲审（Fable，try1 六份、try2 十份），审的是同一个三页重构的 16 个实现。它们不是为这份 spike 做的，但正好说明了 reviewer 该抓什么、该产出什么。

- **分数没用，缺陷清单有用。** 16 份的 correctness 全是 5，总分挤在 26–29 / 30；分数几乎只反映 spike 归没归档。真正有信息的是缺陷清单：十个实现里反复出现的问题全部来自它。
- **反复出现的缺陷正是 CI 抓不到、owner 也没揪到的那一类。** CI 十个都第一次就绿，行为检查十个都 16 / 16，但：
  - 改名之后 AGENTS.md 的 Bad 例子还写着旧组件名：10 / 10；
  - 手抄 server action 的返回类型，不从 action 推导：10 份盲审里 7 份；
  - 页面数据类型的名字（`*PageData` / `*PageProps`）、位置（`types/` / `utils/`）和依赖方向（`types/`、`utils/` 引用 `services/` 的类型）各做各的：10 / 10 至少有一种；
  - 同类写法不一致（箭头函数和 function 声明、class 顺序）：8 / 10。
- **这些在 `main` 上本来就有。** 全仓库没有一处从 action 推导返回类型；`MatrixData`、`PlanFormData`、`EmptyBoardState` 都定义在 `src/services/`；`src/utils/` 的导出函数里，function 声明 37 个，`const` 箭头 15 个。实现者照着仓库已有的写法做，已有的不一致就被一份份复制下去。一个 PR 里一个 nit 不显眼，十份评审都指出同一件事才显出它是系统性的。
- **对设计的含义**：
  1. 产出是 finding，不打分。
  2. 同一个 finding 在多个 PR 里出现，就该变成一句规则或一个工具（AGENTS.md › Adding a rule），而不是每次再审一遍。try2 的这几条已经各记成 tracker 的子项（Harness engineering › *Rules the page-structure runs were missing*）。
  3. 照抄已有写法的问题，在 diff 上看是新行，根子在旧代码：所以审的范围是整个被改函数（下一节）。
  4. 不要让 reviewer 装依赖、重跑检查：try2 的十份评审都自己跑了 `npm ci`、lint、typecheck、knip、单测，CI 早就跑过；其中一份为此等了 14 min。一份完整评审 $3.6–4.7、约 7 min（Fable high）。

## 审什么，审到哪

### 四类 finding

| 类型 | 抓什么 | 例子 |
| --- | --- | --- |
| rule | 被改代码违反了书面规则，主要是 lint 管不到的那些 | layers、component 放在哪一层、*Page structure*、DRY、enum、i18n 和大小写、magic literal、styling 和 theme、命名、workaround 标记、数据规则、*Production first* |
| bug | CI 和测试碰不到的错：stale 或并发状态、漏掉的情况、绕过 revalidate 或 sync 的写入、被吞掉的错误 | G1、G2 |
| docs | 改动让 living doc 失效（baseline、flow、`reference.md`、tracker、README Current State），或让 AGENTS.md 的例子指向已经不存在的东西 | G4、try2 的 Bad 例子 |
| brief | 意图那一句话承诺了、diff 却没做到的 | — |

CI 已经管的不报：Prettier；ESLint（no `any`、no `console.log`、server-only import 边界、page 和 layout 只经 action 读数据、named export、`const` arrow component、一个文件一个 component、单字母命名）；`tsc`；knip；`check:themes`；测试。

### 范围：被改到的整个函数

Owner 的 tech lead 吃过一次亏：diff 里的新代码没问题，旁边一行旧的 inline `axios.delete` 绕过了会 invalidate cache 的 hook，只看 diff 的 reviewer 看不到。规则据此分两层：

1. **hunk 在哪个函数、component 或 hook 里，整个都在范围内**：按改完之后的样子，从头读到尾，旧行也算。
2. **改动改变了这个函数对外的承诺时，再读它的调用方**：承诺指参数、返回的结构，以及 revalidate、sync 这类副作用。

再往外的「整体影响」交给测试，review 不写 test。

本地例子用 #60，而不是 axios 那个。这个 repo 没有 axios 和 cache hook，用这里的规则名和函数名，读者能拿 commit 对照：

- #60 是 auth 改动，在 `RootLayout` 里只把 `getActivePlan(user.id)` 改成了 `getActivePlan(claims.sub)`。只看 diff 的 reviewer 会确认 `claims.sub` 是对的。
- 把整个 `RootLayout` 读下来，就会发现这一行读 active plan 不走 `ensureSynced`，而当时的 AGENTS.md 已经写明它是唯一的 sync 入口。#63 修了它。
- 它和 tech lead 的例子不完全一样：#60 改的就是出问题的那一行，只是只改了参数。教训相同：「这个改动对不对」和「这个函数守不守规则」是两个问题。

被改函数以外的问题，报告里单列，最多三条。

## 文档怎么分

| 文件 | 读者 | 写什么 |
| --- | --- | --- |
| `.claude/agents/README.md` | 人 | 每个 agent 为什么存在；reviewer 要解决的痛点和整体做法；借鉴了谁、哪里有意不同 |
| `.claude/agents/code-reviewer.md` | agent | 关键规则加一个 Bad / Good 例子：brief、范围、四类 finding、报之前验证、报告格式。不写理由，不写 SOP |
| 这份 spike | 拍板之前的 owner | 证据、选项、怎么量；拍板后冻结、归档 |

README 放在 `.claude/agents/`，理由有三：
- 它挨着它解释的那几个定义；
- Claude Code 递归扫描这个目录，但没有 `name` 的文件「当作放在 agent 旁边的文档」直接跳过（官方 sub-agents 文档），所以它不会被当成 agent；
- 和 README › *How docs are split* 的目标状态一致：README 给人，定义文件相当于这个目录给 agent 的那一份。

## 对照公开实践

| 来源 | 做法 | 这里 |
| --- | --- | --- |
| [Claude Code 官方 sub-agents 文档](https://code.claude.com/docs/en/sub-agents) | description 要短，写清什么时候委派，细节放进 body；用 `tools` 限制权限；定义 check 进 repo；`.claude/agents/` 递归扫描，没有 `name` 的文件当文档跳过；custom subagent 会加载 `CLAUDE.md`（`omitClaudeMd` 可关）；frontmatter 有 `model`、`effort` 等字段 | description 只写职责、触发时机和 brief；README 放同目录；AGENTS.md 经 `CLAUDE.md` 已在 context 里，不必再读 |
| Anthropic `claude-plugins-official` › `pr-review-toolkit/agents/code-reviewer.md` | 按 CLAUDE.md 审，加 bug 和质量；每条打 0–100 的置信度，只报 ≥ 80；引用具体规则；`model: opus` | 采用：引用规则原文、只报站得住的。不用数字置信度，改成「报之前逐条回读验证」 |
| 同仓库 › `code-review/commands/code-review.md` | 四个 agent 并行：两个查 CLAUDE.md 遵守（只用和文件同路径的 CLAUDE.md），两个查 bug（只看 diff）；每条 finding 再由另一个 agent 验证；pre-existing、linter 能抓的、吹毛求疵都算误报；不跑 linter 去验证 | 采用：规则按文件类型取、linter 能抓的不报、不跑检查、要有验证一步。**有意不同**：它只看 diff、把 pre-existing 当误报来保 precision；这里把整个被改函数纳入范围，因为这里漏掉的规则问题恰恰在 diff 旁边的旧行里（G1、try2） |
| `obra/superpowers` › `skills/requesting-code-review/code-reviewer.md` | brief 是「做了什么 + 计划 + base / head SHA」；只读，连 HEAD 都不动，要看别的版本就开 worktree；reviewer 不再派 subagent；列出考虑过但没判的；按严重度分级并给出 merge 结论 | 采用：不动 HEAD、用 worktree；`Rules unclear` 字段相当于它的「没判的」。不采用：先列优点、Ready to merge 结论（这里合并是 owner 的事） |

## Golden set（第一版）

挑的是合并时 CI 和 owner 都没拦下、后来才发现的问题。回放时 checkout 引入它的 PR 的 head，按那时 head 上的 AGENTS.md 审；reviewer 报出同一处的同一个问题才算命中。

| # | 回放哪个 diff | 漏掉的问题 | 怎么发现、在哪修 | 类型 | 核实 |
| --- | --- | --- | --- | --- | --- |
| G1 | #60 auth（`c03bf6a`） | `RootLayout` 读 active plan 不走 `ensureSynced`；diff 只改了这一行的参数 | #63 修 | rule · 被改函数 | ✓ |
| G2 | #56 Week model PR 4a（`8be3870`） | plan form 提交 load 时的整份 `projectStepIds`：表单开着时别处加进这一周的，save 时会被退回（one-off 早有同样写法） | #63 修 | bug · stale state | ✓ |
| G3 | #75 test baseline（`7812efc`） | e2e journey 在 optimistic update 后马上 reload，打断还没返回的 server action | #79 上 CI 变红，#79 修 | bug · test | ✓ |
| G4 | #92（`96d9c63`） | Claude 能把 one-off 放上 week 了，`baseline.md` 仍写 one-off 只在用户 track 时才上 board | sweep 试跑发现，未修 | docs | ✓ |
| G5 | #58 Projects page（`bc30305`） | 第三份 `CREATE_PLAN_HREF`（board 和 priorities 已各有一份） | sweep 试跑发现，未修；也是两条规则互相拉扯：constants 放在 component 旁边 vs DRY | rule · 规则质量 | ✓ |
| G6 | #41 MCP 3/5（`9e16bfd`） | service 为了 `$transaction` 直接 import `prisma`；当时的规则是 DAL 放「all Prisma queries」，现在 6 个 service 都这样 | sweep 试跑发现，未修；更像规则和代码打架 | 规则质量 | ✓ 引入 commit |
| G7 | try2 R1–R10（lab 仓库的评审分支） | 手抄 action 返回类型；改名后 AGENTS.md 的 Bad 例子还是旧名；页面数据类型的名字和位置各做各的 | 十份盲审 | rule · docs | 参照盲审清单 |
| G8 | 待查（2026-03 以前） | `getISOWeekKey()` 用 UTC、`getTodayDate()` 用本地时间，周界附近误触发 end-of-period sync | `a90dddf` 修 | bug · 时区 | 引入 PR 待查 |
| G9 | 待查（#62 之前） | 通过 Claude 建下周的 plan 时，上周没做完的 step 被退回 project | #62 内修 | bug | 引入 PR 待查 |
| G10 | 待查（priority matrix 时期） | mobile matrix 卡片出现两个 size chip：`SizeChip` 自带 `display` class，传进来的 `hidden` / `md:*` 谁赢看样式表顺序 | 当时的 PR 内修 | bug · UI | 引入 PR 待查 |

- G1、G2、G3 是最难的：当时写代码的 session 和 owner 都漏了。
- G4–G6 是 sweep 在 `main` 上找到的漂移，per-PR 回放要回到引入它的那个 PR。其中 G6 主要检验 reviewer 会不会在 `Rules unclear` 里指出规则和代码打架，不算 rule 命中。
- G8–G10 早于现在的大部分规则和测试，回放时用当时的规则。
- Owner 之后遇到的漏网问题，随时补进来（Q5）。

## 怎么量

| 指标 | 怎么算 |
| --- | --- |
| Recall | 命中的 golden case ÷ golden case 总数，按类型分；try2 那部分，以「十份盲审里出现两次以上的缺陷」为准 |
| Precision | 逐条裁决每一条 finding：真问题 ÷ 报出的总数，blocking 单独算。main 判成误报的，由 owner 复核 |
| 范围 | `Read` 字段里列的函数，是否覆盖了每个 hunk 所在的函数 |
| 成本 | 每次的 wall time 和花费；只记录，不是目标 |

可选（Q4）：埋点 case（可以反复跑，但埋点的 agent 和 reviewer 是同一个模型）；和 main 自查对照（检验「干净 context」本身值多少）；内置 `/code-review` 作为第二组。门槛先定再量（Q4）。

试用阶段，每个 PR 的 description 记一小段：reviewer 报了几条，每条的结局（真问题·已修 / 真问题·不修 / 误报 / 规则歧义）。之后由 owner、CI 或 sweep 发现、而 reviewer 当时看过却漏掉的，补进 golden set。

## Options

| Option | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| 1 · 自定义 `code-reviewer`，每个 PR 跑（现在的方向） | 本 spike 的定义 | 按这个 repo 的规则审；context 干净；只读；范围是被改函数 | 每次多几分钟 wall time 和一份花费；要维护一份定义；它的上限是 AGENTS.md 本身的质量 |
| 2 · 内置 `/code-review` | Claude Code 自带的 skill | 不用维护 | 不一定按 AGENTS.md 审；范围和报告格式不归我们管 |
| 3 · main 自查加 checklist | push 前 main 按清单过一遍 | 最便宜 | 正好落在 context rot 和作者锚定那一边 |
| 4 · 合并闸门（owner 的 tech lead 的做法） | reviewer 是 cron 上的 bot，它没在当前 head SHA 上 APPROVED 就不能 merge，merge 留给人按 | 不依赖 session 自觉，有记录 | 每次 push 都要重审，成本按 push 计；finding 变成 PR thread。等 1 证明有用之后再说 |

## 实施计划

1. **AGENTS.md 过一遍**（owner，下一次）：定下新规则的标准（不重复、简洁、分层、带例子）。reviewer 拿 AGENTS.md 当尺子，尺子的质量就是它的上限。
2. **Round 0 · smoke**：在一个从这个 branch 开的 session 里，拿 G1 跑一次，确认它拿得到 diff、读的是整个 `RootLayout`、报告格式对。
3. **Round 1 · golden set**：G1–G6、G8–G10（核实完引入 PR 的那些）和 try2 的十个实现，各跑一次；逐条裁决，算 recall 和 precision，写进这份 spike；owner 拍板。
4. **通过之后**：
   - 定义的 description 去掉 pilot；
   - AGENTS.md › Subagents 加一行：每个 PR 第一次 push 前跑；
   - 本 PR 合并，spike 写 Decision 并归档；
   - 试用期的记录按上一节的方式写进各 PR 的 description。
5. **不通过**：按结果收窄（比如只查 rule 和 docs），或者改用 Option 3。

和 `ui-verifier` 的配合：两个都只读。改动小的时候并行跑；reviewer 可能引出 UI 改动时，先 review、修完，再跑 `ui-verifier`。

## 开放问题

1. ✓ **Scope**（owner，2026-10-31）：规则遵守和藏得深的 bug，外加改动让文档失效的；不做通用 bug hunt。
2. ✓ **什么时候跑**（owner，2026-10-31）：每个 PR 第一次 push 前都跑。两周一次的 sweep 另议（Step 13）。
3. ✓ **范围单位**（owner，2026-10-31）：被改到的整个函数；改了函数的承诺时，再看调用方。
4. **评估**：只用 golden set 加 try2 够不够？要不要再加埋点、main 自查对照或内置 `/code-review`？门槛定多少？（owner 在想）
5. **Golden set**：第一版这 10 条行不行？G8–G10 要不要我把引入 PR 查出来？
6. **Brief**：只给意图一句话和 base ref，不给 PR description（现在的定义）。行不行？
7. **Model 和 effort**：`inherit`，还是在 frontmatter 里固定 `effort`？这和 Harness engineering › 2（每个阶段用什么 model 和 effort）是同一个问题。
8. **README 位置**：`.claude/agents/README.md`，行不行？
9. **合并闸门**（Option 4）：现在不做，等 Round 1 之后再看？
10. **规则标准**：明天过 AGENTS.md 时定下来；定下之后，rule-change 的 review（新规则是否重复、简洁、分层、带例子）也交给这个 reviewer，还是单独一个检查？
