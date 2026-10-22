# Spike: Subagent 分工试点

Status: draft

> 语言说明：正文中文；product 名词、状态和代码标识符保留英文（backlog / card / subagent / `inert` / `test-writer`），与代码和 tracker 一一对应。

## 触发

tracker › Board › Medium 第一条：collapsed desktop backlog 的 panel 只有 `opacity-0 pointer-events-none`，Tab 和 screen reader 仍能进入看不见的 cards，修法是 `inert`。这一条同时是 subagent 分工的 pilot：在 `ui-verifier` 旁边建 `test-writer` 和 `ci-fixer`，把一个 fix 的重活交给它们，看是否划算。

做了两轮，每轮两条本地 branch，各一个 worktree：**A** 由 main session 自己做，**B** 把活交给 subagent。代码都没有提交：fix 和两个 agent 定义是否落地，等这份 spike 有了决定再说。定义原文在附录 B，fix 和两版 test 的做法在第 1 轮的表里，都可以照着重做。

- **第 1 轮**：backlog `inert` fix，CI 一次就绿。
- **第 2 轮**：故意弄红的 CI，专门补测 `ci-fixer`。

Owner 看完第 1 轮后的判断：`ui-verifier` 有价值，`test-writer` 和 `ci-fixer` 不确定，是否启用要更多测试。所以这份 spike 先停在 draft，等下一轮测试（见「开放问题」）。

## 怎么量的

- **Main session**：每个阶段开头跑一条 `PHASE:<name>` 的 Bash 作为标记，事后解析 session transcript。每个 API request 的 `input + cache_read + cache_creation` 就是当时的 context 大小。阶段增量 = 阶段末 − 阶段初；**处理过的 token** = 阶段内每次 request 的 context 之和（每次 request 都重读整个 context）。
- **Subagent**：用 harness 回报的 `subagent_tokens`（≈ 最终 context）、`tool_uses`、`duration_ms`，再从 subagent transcript 取 base context 和处理过的 token。
- **顺序**：两轮都是先做 A、后做 B，好处是 A 不会提前知道答案。第 1 轮 B 的 main session 已经知道修法，所以 B 的账补上了 A 的 investigate 阶段；第 2 轮的错误由另一个 subagent 写成 patch、原样打进两个 worktree，main session 做 A 时也不知道错在哪，事后才对答案。

## 第 1 轮：backlog `inert` fix（CI 一次就绿）

### 两条 branch

| | Branch A `claude/backlog-inert-solo` | Branch B `claude/backlog-inert-delegated` |
| --- | --- | --- |
| 做法 | main session 自己做全部 | failing test → `test-writer`，browser check → `ui-verifier`，CI → `ci-fixer`；main 只做决定、brief 和 production edit |
| production diff | `DesktopBacklog.tsx` +5 / −1 | 与 A 逐字相同 |
| test | `e2e/smoke.spec.ts` +33 / −1：新 `describe`，mobile project skip | `e2e/journeys.spec.ts` +30 / −1：journeys 的最后一条 |
| 其他 | — | `.claude/agents/test-writer.md`、`ci-fixer.md`；AGENTS.md 目录说明一行 |
| 结果 | test 先红后绿；lint / typecheck / knip 绿；Vitest 380 + 2 expected fail；e2e 26 passed + 1 skipped | 同样先红后绿；`ci-fixer` 报 GREEN（`test:coverage` 380 + 2，coverage floors 达标；e2e 26 passed） |

Fix 本身：被淡出的那一侧加 `inert`，panel 是 `inert={!isOpen}`，collapsed strip 是 `inert={isOpen}`。tracker 只点名了 panel，但 strip 在 open 时也有同样的问题，所以一起修了。

### Main session（任务可归属部分）

| 阶段 | A context 增量 | B context 增量 | 差 |
| --- | --- | --- | --- |
| investigate（决定修法） | 3.8k | 3.8k（同 A） | 0 |
| 写 failing test | 15.1k | 5.5k（brief + 报告 + review diff） | **−9.6k** |
| production edit + rerun | 1.9k | 1.9k（按 A 计） | 0 |
| browser check | 7.3k（脚本 + 3 张截图） | 5.5k（查 tab 名 + brief + 报告） | −1.8k |
| CI checks（绿） | 1.8k（过滤后的输出） | 2.9k（brief + 报告） | **+1.1k** |
| **合计** | **29.9k** | **19.6k** | **−10.3k（−34%）** |
| requests / tool calls | 16 / 20 | 16 / 11 | |
| wall time | 5 分 09 秒 | 10 分 32 秒 | ×2.0 |

### Subagent

| | `test-writer` | `ui-verifier` | `ci-fixer` |
| --- | --- | --- | --- |
| 运行方式 | general-purpose 读定义文件模拟 | 已注册的 custom agent | general-purpose 读定义文件模拟 |
| base → 最终 context | 57.5k → 99.6k | 16.5k → 50.0k | 57.8k → 72.5k |
| tool calls / 耗时 | 21 / 207 秒 | 20 / 151 秒 | 16 / 171 秒 |
| A 里对应阶段的 main context | 15.1k | 7.3k | 1.8k |
| 结果 | FAILS AS EXPECTED | PASS 6 / 6 | GREEN |

处理过的 token：A 约 2.07M；B 是 main 约 2.41M 加 subagent 约 2.76M，合计约 5.17M，是 A 的 **2.5 倍**。

## 第 2 轮：故意弄红的 CI（补测 `ci-fixer`）

### 设置

另一个 subagent 在 `src/utils/boardCardUtils.ts`（board 把 task rows 转成 cards 的 adapter）里写了一次看起来很仓促的「小 refactor」。里面有 5 处错误，各自触发一个 check：

| # | 错误 | 触发的 check | 正确修法 | 性质 |
| --- | --- | --- | --- | --- |
| 1 | `toSortedCards` 挤成一行 | `format:check` | `npm run format` | 机械 |
| 2 | `projects.map(p => …)` | `lint`（`id-length`） | 改名 `project` | 机械 |
| 3 | `currentSegment` 给 `null`，类型是 optional | `typecheck` | 改回 `undefined`（扩成 `number \| null` 是错修） | 类型层 |
| 4 | step path 用 `statusByTaskId.get(task.id)` | unit test（两个时区都红） | 改回 `get(step.id)`；要读 test fixture 才看得出 | 行为 |
| 5 | 新增 `isBoardStatus` export，没人用 | `knip` | 删掉（或去掉 `export` 并在循环里用上） | 机械 |

这份 patch 原样打进两个 worktree。main session 做 A 时没看过 patch，也没看答案。

### 结果

| | A：main session 自己修 | B：`ci-fixer` |
| --- | --- | --- |
| 诊断 | 5 / 5 | 5 / 5，根因全对 |
| 修复 | 5 处全修 | 自己修了 1–3，把 4 和 5 作为 proposal 交回（附 patch）；main 决定并 apply，再让它复跑 |
| main context 增量 | 6.4k | 8.4k（其中约 2–3k 是本 session 第一次加载 `SendMessage` 的 tool schema；去掉后约 6k，与 A 持平） |
| main requests / tool calls | 4 / 6 | 5 / 4 |
| wall time | 3 分 09 秒 | 6 分 04 秒 |
| subagent | — | 两轮（报告 → 复跑）：26 tool calls，57.6k → 85.1k，354 秒（281 + 73） |
| 处理过的 token | 约 0.87M | main 约 1.13M + subagent 约 1.85M ≈ 2.98M（**3.4 倍**） |
| 最终 diff | 空，文件回到 main | 空，文件回到 main |

为什么这次 `ci-fixer` 没省 main context：5 处错误每处只有一行报错，过滤后的输出（加上看一次 `git diff`）总共约 5k 字符。这比 brief + 两份报告 + 一次往返还小。

## 为什么总 token 反而更多

1. **每个 subagent 从零开始**：base context 有 16k（注册的 custom agent）到 57k（general-purpose，带全部 tool schema）。main 已经读过的文件，它要再读一遍：`test-writer` 为 30 行 test 用了 21 次 tool call。
2. **每次 request 都重读整个 context**：subagent 的 20 次左右 request，每次 50k–100k，加起来就是 0.6M–1.9M。
3. **委派本身有固定开销**：每次委派，main 要付 brief、报告和等待时的几次 request，约 3–5k context、3–5 次 request。只有当 subagent 的工具输出远大于这笔开销时，main context 才会变少。
4. **Break-even**：省下的 main context 在之后每一次 main request 都少读一次。第 1 轮省了 10.3k，subagent 多花约 2.76M，要再过约 270 次 main request 才能回本（而且得在 compaction 之前）。第 2 轮 main context 没省，永远回不了本。处理过的 token 大部分是 cache read，单价约为普通 input 的 1/10；subagent 的 context 是新建的，要先写 cache，所以按价格算，这个比例不会更有利于 subagent。

结论：委派省的从来不是 token。它的价值只可能在三处：(a) 让 main context 远离上限（长 session、少 compaction）；(b) 质量，即一个干净的 context 专注一件事，查得更彻底；(c) 并行，缩短 wall time。这两轮里，(a) 只在写 test 时明显，(b) 在 `ui-verifier` 上明显，(c) 没用上。

## 各自错在哪

- **`test-writer`**（第 1 轮）：
  - 把 test 放进 `journeys.spec.ts`，可文件头写的是 "each one changes the week"。它指出了这个矛盾，但没改文件头。
  - cold start 很贵（+40.8k）。
  - 做对的地方：失败在正确的 assertion 上；按 role 定位；报告了 Playwright 1.64.1 的 role engine 不认 `inert`（未单独验证）。
- **`ui-verifier`**（第 1 轮）：
  - verdict 没错，比 A 更彻底（逐帧采样 cross-fade、mobile sheet）。
  - 报告偏长（约 3.5k 字符）。
  - 被 InteractionShield 吞掉点击后，它按 PlayRunner 的方式绕过，走的已不是用户路径。
  - 没有报 A 自己发现的「按 Enter 打开后 focus 掉到 body」，因为 brief 里没问。
- **`ci-fixer`**：
  - 第 1 轮 GREEN 无误，但在绿 CI 下 main context 是净亏的。
  - 第 2 轮 5 / 5 根因全对，类型错误选了正确的修法并说明了另一种修法。
  - 一处偏离定义：定义写的是「an export nothing uses」可以自己修，它却交回了 proposal，理由是删掉还是用上要看意图。这偏谨慎，但和定义不一致，定义需要二选一写清楚。
  - 它还额外指出，fault 4 只有 unit test 能抓到，e2e 25 条全绿。这是一个 coverage 观察。
- **Main session**：
  1. 同一个 session 里新建的 agent 用不了（Claude Code 只在 session 启动时加载 `.claude/agents/`），只能用 general-purpose 读定义文件来模拟，代价是 base context 高约 40k，`tools` 限制也只是文字约束。
  2. 每份 brief 都要重复环境样板（worktree 路径、Node 24）。
  3. 第 1 轮剔除了两段旁支：stop hook 引起的清理约 1.6k，以及 `pkill -f "next dev"` 杀掉了自己的 shell。

## 评估的局限

1. 两轮都很小（2 行 fix、5 处一行报错）。subagent 的固定开销占比被放大，重任务（多个 spec、陌生 layer、大段 CI log、e2e trace）没测到。
2. `test-writer` / `ci-fixer` 都是模拟运行，真注册后 base context 会少约 40k。
3. 第 1 轮 B 的 brief 是在已经知道答案之后写的。
4. main session 的 baseline context 很大（第 1 轮约 77k，到第 2 轮已约 215k），每次 main request 都很贵；这会放大「少几次 main request」的价值。

## Options

### Option 1 — 只保留 `ui-verifier`

- 优点：最快，总 token 最少，与 owner 当前的判断一致。
- 缺点：main context 增长最快的一块（写 test，第 1 轮占任务的一半）留在 main 里。
- 实施：不用改仓库；两个定义只留在附录 B。

### Option 2 — 三个都留，按触发条件委派

- `test-writer`：需要读陌生 spec / layer 时委派。
- `ci-fixer`：只在 CI log 或失败输出预计很大时委派（多个 test 红、e2e trace、GitHub job log），一行报错的红自己修。
- 优点：只在 main context 真能省下来的地方委派。
- 缺点：「预计很大」要靠判断；两个定义还没在重任务上证明过价值。
- 实施：把附录 B 的两个定义放进 `.claude/agents/`；`ci-fixer` 的 description 写明触发条件，「unused export」改成明确交回 proposal；AGENTS.md 的目录说明和 UI Workflow 旁各加一行。

### Option 3 — 先保留定义、不写规则，继续测

- 优点：不在证据不足时定规则；定义随时可以用。
- 缺点：没有规则，就没人会用它们，也就攒不到数据，除非专门安排测试。
- 实施：把附录 B 的两个定义放进 `.claude/agents/`（description 里注明 pilot）；按「开放问题」第 2–5 条再跑几轮，然后回到 Option 1 或 2。

## 开放问题

1. 选哪个 Option？owner 当前倾向是 `ui-verifier` 保留、另外两个待定，对应 Option 3。
2. **重任务测试**：找一个真实的重任务再跑一次 A / B。比如一个红的 GitHub CI，用 `get_job_logs` 拿完整 log；或者一次改动弄红多个 test、带 e2e trace。目的是找到 `ci-fixer` 的 break-even。
3. **注册后重测**：把附录 B 的定义放进 `.claude/agents/`，再开一个新 session，用真正注册的 `test-writer` / `ci-fixer` 重测 base context 和 tool 限制。
4. **长 session 测试**：在一个长 session 的前段委派，看后段的 main context 和 compaction 次数，验证 break-even 的估算。
5. **并行**：`ui-verifier` 和 `ci-fixer` 并行跑（共用 dev server），看 wall time 能缩多少。
6. 第 1 轮的 fix 还没提交，重做时：test 放 `smoke.spec.ts`（A）还是 `journeys.spec.ts`（B）？要不要顺带做 focus handoff（按 Enter 打开后，focus 从变成 `inert` 的按钮掉到 body）？

## 附录 A：怎么复现测量

- **Transcript**：main session 在 `~/.claude/projects/<project>/<session-id>.jsonl`，subagent 在同目录的 `<session-id>/subagents/agent-<id>.jsonl`（旁边的 `.meta.json` 记着 agent type）。
- **Context 大小**：每个 `assistant` 行的 `message.usage` 里，`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`。同一个 request 会拆成多行（每个 content block 一行），按 `requestId` 去重。subagent transcript 里的 `output_tokens` 不可靠（只记了第一个 block），不要用。
- **阶段切分**：每个阶段开头跑一条只 `echo PHASE:<name>` 的 Bash，脚本按 tool_use 的 command 里的 `PHASE:` 切分。
- **第 2 轮的出错 patch**：另开一个 worktree，让一个 general-purpose subagent 在某个有 unit test 的 `src/utils/` 文件里做 4–5 处各触发一个 check 的错误，先逐个确认每个 check 确实红了，再 `git diff` 存成 patch，答案写进另一个文件，回复里只给 patch 路径和数量。patch 用 `git apply` 打进两个 worktree，答案等两条 branch 都跑完再看。
- **没注册的 agent**：同一个 session 里新建的定义用不了。用 general-purpose agent，第一句让它 Read 定义文件，把 body 当作指令、把 `tools` 当作限制、把报告格式当作回复格式。

## 附录 B：两个 agent 定义（原文）

`.claude/agents/test-writer.md`：

````markdown
---
name: test-writer
description: Writes the test a change starts with — the failing test that reproduces a bug, or the test a new behaviour needs — at the lowest layer that reproduces it, runs it, and returns where it lives, how to rerun it and how it fails, so the main session never holds test/README, the specs and the run logs. Give it the behaviour (what should happen, what happens now), where it shows (page, viewport, component or service), and whether the test must fail today (a bug) or pass (behaviour that already exists). It edits test files only, never production code.
tools: Bash, Read, Edit, Write, Glob, Grep
model: inherit
---

You write one test for this repository and report back. The main session decides the fix and makes the production edit; you never touch production code.

## The brief

The main session sends the behaviour (what should happen and what happens now), where it shows, and the expected outcome: **fails today** (a bug fix starts with it) or **passes today**. Write exactly that test. Don't widen it to neighbouring behaviour, and don't fix the bug.

## Writing it

1. Read `test/README.md` first: it decides the layer (unit, integration or e2e — the lowest one that reproduces the behaviour; components have no unit layer), the helpers (`test/factories.ts`, `test/time.ts`, `e2e/fixtures.ts`) and the rules (locate by role and visible text, `openPage()` before interacting, no dates in e2e, `it.fails` for a known bug).
2. Read the specs or tests next to where yours goes and match them: their helpers, naming, comment density and style. Put the test in the existing file and Playwright project whose scope fits; create a file or project only when none fits, and say why in the report.
3. You may edit `*.test.ts`, `*.int.test.ts`, `e2e/` and `test/`. If the test needs something production code doesn't offer (a role, a label, a test id), don't add it: write the test with what exists if you can, and list the need in the report.
4. Run only your test: `npx vitest run <file> -t "<name>"`, or `npx playwright test --project=<project> -g "<name>"` (it reuses a running `npm run dev`, otherwise starts one; the e2e user is reseeded first).
5. Check the outcome against the brief. A test that must fail has to fail **on the assertion that names the behaviour** — not on a locator that never resolves, a console error, a timeout in setup or a typo. If it fails for another reason, fix the test and rerun; stop after three runs. A test that must pass has to pass, and you confirm it would catch a regression by reading the assertion, not by breaking production code.
6. Run `npx prettier --write` and `npx eslint` on the files you touched.

## The report

Reply with this, and nothing else:

```
RESULT: FAILS AS EXPECTED | PASSES AS EXPECTED | WRONG OUTCOME | BLOCKED
Layer: unit | integration | e2e (<project>) — <one line: why this layer and file>
Test: <file>:<line> › <full test name>
Rerun: <the exact command>
Failure: none | <the assertion's message, at most 6 lines>
Diff: <each file touched: +added / −removed lines>
Needs: none | <what production code would need, or a question for the main session>
```

WRONG OUTCOME means the test fails for a reason other than the behaviour, or passes when it should fail, after three runs; BLOCKED means it couldn't run (say why in Failure).
````

`.claude/agents/ci-fixer.md`：

````markdown
---
name: ci-fixer
description: Runs the CI checks on a change locally (or starts from a failing CI job's log), fixes what is red when the fix is mechanical and inside the change's own diff, and returns one line per check, so the main session never holds lint, typecheck and test output. Give it the change in a sentence, which checks to run (default — everything CI runs), and the failing job's name and log when CI is already red. It never changes behaviour: a red that needs a decision comes back as a proposal, not an edit.
tools: Bash, Read, Edit, Glob, Grep
model: inherit
---

You get one change's CI green, or say exactly why it isn't. The main session owns the change: you fix only what is mechanical, and hand back everything that needs a decision.

## The brief

The main session sends what the change does, the checks to run, and — when CI is already red — the failing job and its log. Start from the log when there is one: reproduce that failure locally before touching anything.

## The checks

In CI's order (`.github/workflows/`): `npm run format:check`, `lint`, `typecheck`, `knip`, `check:themes` (only when the diff changes CSS custom properties), `npm test` (CI runs `npm run test:coverage`: the same suite with coverage floors), `npm run test:e2e`. Run them one at a time and read only each one's summary and failures (`tail`, `grep`), not its full output. Look at `git diff` first so you know which files are the change's.

## What you may fix

- Formatting: `npm run format`.
- A lint error, type error or knip finding in a line the diff added or changed, when the fix doesn't change behaviour: an unused import, a missing type, a name the linter rejects, an export nothing uses.
- Rerun a failing test once to rule out a flake; a second failure is real.

Everything else is a proposal: a failing test, a red in code the diff doesn't touch, anything that changes what the app does. Never skip, disable or quarantine a test, lower a coverage floor, add `eslint-disable`, `@ts-ignore` or `any`, or commit and push.

After your last fix, rerun every check that was red, plus `format:check` and `lint`.

## The report

Reply with this, and nothing else:

```
RESULT: GREEN | FIXED | RED
1. format:check — PASS | FIXED | FAIL | SKIPPED — <one line>
2. lint — …
3. typecheck — …
4. knip — …
5. check:themes — …
6. test — … <passed / expected-fail counts>
7. test:e2e — … <passed / skipped counts>
Fixes: none | <file — what changed, one line each>
Proposals: none | <each red left: the check, the root cause, a proposed patch of at most 15 lines>
```

GREEN means every check passed untouched, FIXED that every check passes after your fixes, RED that at least one is still red.
````
