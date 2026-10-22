# Spike: Subagent 分工试点

Status: awaiting owner review

> 语言说明：正文中文；product 名词、状态和代码标识符保留英文（backlog / card / subagent / `inert` / `test-writer`），与代码和 tracker 一一对应。

## TL;DR

问题：`ui-verifier` 已确定保留，`test-writer` 和 `ci-fixer` 值不值得留。做法是三轮 A / B 对比：A 由 main session 自己做，B 委派给 subagent。前两轮的 agent 是模拟的，第 3 轮用注册好的。

| B 相对 A | main context | wall time | 总 token |
| --- | --- | --- | --- |
| 第 1 轮：backlog fix（模拟） | −34% | ×2.0 | ×2.5 |
| 第 2 轮：红 CI（模拟） | 持平 | ×1.9 | ×3.4 |
| 3a：backlog fix + focus handoff（注册） | **−49%** | ×1.35 | **×1.0** |
| 3b：红 CI，7 条 Vitest + 1 条 e2e（注册） | 持平 | ×1.9 | ×1.26 |

- **注册后成本大降**：subagent 的起始 context 从 57k 降到 16k，总 token 从 2.5–3.4 倍降到 1.0–1.3 倍。
- **只在工具输出大的阶段省 main context**：写 test、浏览器检查、读 e2e log 时省得多。CI 是绿的，或者失败只有几行时，委派持平或略亏。
- **质量**：`ui-verifier` 在 CI 之前抓到一个 console error（brief 是在 A 撞到之后写的，要打折扣）；`ci-fixer` 两次 5 / 5 诊断全对，两次都指出了 coverage 缺口；`test-writer` 写得和 A 一样好，但最慢。
- **代价和限制**：wall time 多 35%–90%；每次委派都在后台跑，main 要多等 1–2 轮。`tools` 限制在 API 层生效，但三个 agent 都有 Bash，「只改 test」仍靠 prompt 约束；`ci-fixer` 就用 Bash 临时套用过 proposal。
- **待 owner 决定**：Q7 选 Option 1、Option 2 还是继续测；Q8 fix 提交哪一版（附录 C）；Q9 `ci-fixer` 定义里的两处歧义。

## 触发

tracker › Board › Medium 第一条：collapsed desktop backlog 的 panel 只有 `opacity-0 pointer-events-none`，Tab 和 screen reader 仍能进入看不见的 cards，修法是 `inert`。这一条同时是 subagent 分工的 pilot：在 `ui-verifier` 旁边建 `test-writer` 和 `ci-fixer`，把一个 fix 的重活交给它们，看是否划算。

做了三轮，每轮两条本地 branch，各一个 worktree：**A** 由 main session 自己做，**B** 把活交给 subagent。前两轮的 `test-writer` / `ci-fixer` 是 general-purpose 读定义文件模拟的；owner 选了 Option 3（见「已决定」）之后，第 3 轮在新 session 里用注册好的 agent 重做。三轮的代码都没有提交。

- **第 1 轮**（模拟）：backlog `inert` fix，CI 一次就绿。
- **第 2 轮**（模拟）：故意弄红的 CI，专门补测 `ci-fixer`。
- **第 3 轮**（注册）：3a 重做 backlog fix，这次带 focus handoff；3b 是一份新的红 CI，7 条 Vitest 和 1 条 e2e 一起红。

Owner 看完第 1 轮后的判断：`ui-verifier` 有价值，`test-writer` 和 `ci-fixer` 不确定，是否启用要更多测试。第 3 轮已经跑完，现在要 owner 决定的是：留下还是去掉这两个 agent，以及 fix 提交哪一版（见「开放问题」）。

## 怎么量的

- **Main session**：每个阶段开头跑一条 `PHASE:<name>` 的 Bash 作为标记，事后解析 session transcript。每个 API request 的 `input + cache_read + cache_creation` 就是当时的 context 大小。阶段增量 = 阶段末 − 阶段初；**处理过的 token** = 阶段内每次 request 的 context 之和（每次 request 都重读整个 context）。
- **Subagent**：用 harness 回报的 `subagent_tokens`（≈ 最终 context）、`tool_uses`、`duration_ms`，再从 subagent transcript 取 base context 和处理过的 token。
- **第 3 轮**：方法相同。subagent 是注册的 custom agent，数字取自它们自己的 transcript；transcript 旁边的 `.prefix.json` 记着每个 agent 实际带的 tool 列表。
- **顺序**：每轮都是先做 A、后做 B，好处是 A 不会提前知道答案。第 1 轮 B 的 main session 已经知道修法，所以 B 的账补上了 A 的 investigate 阶段；第 2 轮的错误由另一个 subagent 写成 patch、原样打进两个 worktree，main session 做 A 时也不知道错在哪，事后才对答案。

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

## 第 3 轮：注册后重测

目标是 Q3：注册后 base context 降到多少，`tools` 限制是否生效；同时用同样的方法重测第 1 轮的结论。3b 顺带回答 Q2。

### Q3 的答案

- **能按名字调用**：这次定义在 session 开始时就在 `.claude/agents/` 里，Agent tool 的可用列表里有 `test-writer` 和 `ci-fixer`，按 `subagent_type` 一次调通。第 1 轮调不到，只发生在 session 中途新加的文件上。
- **Base context 约 16k**：三个注册 agent 的第一次 request 都是 15.9k–16.6k，模拟时是 57.5k / 57.8k。注册 agent 的 system prompt 只有它的定义 body（3.5–4k 字符），tool schema 也只有它自己的 tools。
- **`tools` 限制在 API 层生效**：每次 request 带的 tool 列表就是定义里的 `tools`，外加 harness 的 `SubagentHandback`：`ui-verifier` 没有 Edit / Write，`ci-fixer` 没有 Write。但三个都有 Bash，所以「只改 test 文件」「不改 repo」仍然只是 prompt 约束。这一轮 `test-writer` 和 `ui-verifier` 都守住了；`ci-fixer` 在 3b 用 Bash 临时改过行为（见「各自错在哪」）。
- **`run_in_background: false` 没生效**：每次委派都转成后台运行，main 要先结束一轮、等通知再接着做。每次委派因此多 1–2 次 main request；等待时 stop hook 还触发过一次（约 0.6k，已剔除）。

### 3a：backlog fix（`inert` + focus handoff）

两个 arm 做同一件事：被淡出的一侧加 `inert`（collapsed 时是 panel，open 时是 collapsed strip）；打开后 focus 落在 "Close backlog"，关闭后回到 "Open backlog"，鼠标和键盘都一样，首次渲染不动 focus；e2e test 放在 `e2e/journeys.spec.ts`，文件头的 "each one changes the week" 一起改。

两个 arm 的 production diff 逐字相同（附录 C）。Focus handoff 的第一版是 `flushSync(() => setIsOpen(next))` 之后再 `focus()`：真实页面上没问题，但 Design Console 的 PlayRunner 在 `useLayoutEffect` 里同步点第一个 play step，`flushSync` 在 lifecycle 里被调用就报 console error，design-console 的 e2e 因此变红。最终版改为：toggle 时设一个 ref 标记，`useEffect` 在 commit 后移 focus；首次渲染时标记为 false，focus 不动。为了让两个 arm 走同一条路，B 的 production edit 也先用 `flushSync` 版。

**Main session（任务可归属部分）**

| 阶段 | A context 增量 | B context 增量 | 差 |
| --- | --- | --- | --- |
| investigate（决定修法） | 4.0k | 4.0k（同 A） | 0 |
| 写 failing test | 11.7k | 5.1k（brief + 报告 + review diff） | **−6.6k** |
| production edit + rerun | 2.5k | 2.5k（按 A 计；B 实际是照 A 重放，1.2k） | 0 |
| browser check | 11.1k（脚本 + 1 张截图；console 吞掉点击，改在 `/kanban` 上测，没发现 `flushSync` 的问题） | 3.8k（brief + 报告；报告就是 FAIL：`flushSync`） | **−7.3k** |
| 修 `flushSync` | 6.8k（从 e2e log 定位、读 PlayRunner、改、全部复跑） | 1.6k（报告已给根因，只需改） | **−5.2k** |
| CI checks（绿的部分） | 1.0k | 2.0k（brief + 报告） | +1.0k |
| **合计** | **37.0k** | **19.0k** | **−18.1k（−49%）** |
| requests / tool calls | 29 / 29 | 17 / 11 | |
| wall time | 8 分 37 秒 | 11 分 39 秒 | ×1.35 |

**Subagent**

| | `test-writer` | `ui-verifier` | `ci-fixer` |
| --- | --- | --- | --- |
| base → 最终 context | 16.6k → 45.0k | 16.1k → 45.9k | 16.0k → 27.1k |
| 第 1 轮（模拟 / 注册 / 模拟） | 57.5k → 99.6k | 16.5k → 50.0k | 57.8k → 72.5k |
| tool calls / 耗时 | 19 / 327 秒 | 17 / 149 秒 | 13 / 150 秒 |
| 处理过的 token | 0.58M | 0.49M | 0.30M |
| 结果 | FAILS AS EXPECTED | FAIL 1 / PASS 4（抓到 `flushSync`） | GREEN |

处理过的 token：A 约 3.85M；B 是 main 约 2.50M 加 subagent 约 1.37M，合计约 3.87M，**约 1.0 倍**（第 1 轮是 2.5 倍）。B 的 main request 是在 A 之后跑的，context 的起点高了约 35k；按同一个起点折算，B 约 3.45M，即 0.9 倍。

### 3b：新的红 CI（7 条 Vitest + 1 条 e2e）

和第 2 轮一样，另一个 subagent 写出错 patch，main 两边都做完才看答案。这次是 `src/utils/projectUtils.ts` 的一次「整理」refactor：加返回类型、解构参数、用查找表代替扫描。里面有 5 处错误：

| # | 错误 | 触发 | 正确修法 | 陷阱（看起来对的错修） |
| --- | --- | --- | --- | --- |
| F1 | `getStepState` 解构时丢了 `activePlanId !== null &&`，没有 active plan 时未排期的 step 变成 THIS_WEEK | 2 条 integration test × 2 时区 | 补回 guard | 让 caller 传 sentinel；改 expectation |
| F2 | `doneOn` 用读本地时区的 `formatISODate` 换掉了 `formatKanbanISODate` | 1 条 unit test，只在 UTC 红 | 改回 KANBAN_TZ 的 formatter | `toLocaleDateString`、`toISOString().slice(0, 10)` |
| F3 | `applyStepPatch` 的位置表只建一次，path 被 splice 后就过时了 | 1 条 unit test × 2 时区 | 回到扫描当前 path | move 之后刷新一次表：现有 test 全绿，连续两个 add 仍然放错 |
| F4 | `summarizeProject` 对没有 step 的 project 读 `nextStep.title` | 只有 e2e：design-console 的 projects scenario 红，4 条 journeys 因依赖没跑 | `nextStep?.title ?? null` | 给 fixture 里的空 project 加一个 step |
| M1 | `toNullableText` 标了 `string \| null`，实际还会返回 `undefined` | typecheck | 返回类型加上 `undefined` | 改成 `text \|\| null`：typecheck 变绿，但之后每次更新都会清空这个字段 |

原始失败输出：Vitest 约 5.7k 字符，e2e 约 2.7k 字符，typecheck 一行。

| | A：main session 自己修 | B：`ci-fixer` |
| --- | --- | --- |
| 诊断 | 5 / 5 | 5 / 5，根因全对 |
| 修复 | 5 处全修，都是正确修法 | 自己修了 M1（正确修法）；F1–F4 交回 proposal，附 patch；main apply 后让它复跑，FIXED |
| main context 增量 | 9.1k | 9.2k（其中约 2.5k 是本 session 第一次加载 `SendMessage` 的 tool schema；去掉后约 6.7k，−2.4k） |
| main requests / tool calls | 9 / 8 | 6 / 4 |
| wall time | 4 分 18 秒 | 8 分 02 秒（×1.9） |
| subagent | — | 两轮（报告 → 复跑）：31 tool calls，15.9k → 44.1k，475 秒（337 + 138） |
| 处理过的 token | 约 1.75M | main 约 1.22M + subagent 约 0.97M ≈ 2.19M（**1.26 倍**） |
| 最终 diff | 留下 refactor 里无害的部分（返回类型、解构） | 同 A，另外保留了 path 的另一种写法（行为相同） |

为什么 3b 的 `ci-fixer` 仍然没省 main context：A 用 grep 过滤后总共只读了约 9k 字符，其中一半是整份 diff；brief、两份报告加一次往返就和它持平了。Q2 的 break-even 仍然没找到：7 条 test 一起红还不够，可能要到未过滤的 GitHub job log 或 e2e trace 那种上万字符的输出。

### 和前两轮对比

| | 第 1 轮（模拟） | 第 3 轮 3a（注册） | 第 2 轮（模拟） | 第 3 轮 3b（注册） |
| --- | --- | --- | --- | --- |
| main context | −34% | −49% | 持平（去掉 schema） | 持平（去掉 schema 后 −2.4k） |
| wall time | ×2.0 | ×1.35 | ×1.9 | ×1.9 |
| 处理过的 token | ×2.5 | ×1.0 | ×3.4 | ×1.26 |

变化的原因：

1. base context 从 57k 降到 16k，subagent 的每次 request 都便宜约 40k。3a 三个 subagent 合计处理 1.37M，第 1 轮是 2.76M，而这次的活更多。
2. main session 的 baseline 更大（第 3 轮 112k–207k，第 1 轮约 77k），每少一次 main request 省得更多：3a 的 B 比 A 少 12 次 main request。
3. 3a 比第 1 轮重：多了 focus handoff，还有一次 `flushSync` 的红。这一段 A 要自己读 PlayRunner、全部复跑；B 由 `ui-verifier` 的报告和 `ci-fixer` 的一次运行承担。

## Token 账

1. **每个 subagent 从零开始**：注册的 custom agent 约 16k，general-purpose 模拟约 57k（带全部 tool schema）。main 已经读过的文件，它要再读一遍：`test-writer` 为 30 行 test 用了 19–21 次 tool call。
2. **每次 request 都重读整个 context**：subagent 的 20 次左右 request，每次 50k–100k，加起来就是 0.6M–1.9M。
3. **委派本身有固定开销**：每次委派，main 要付 brief、报告和等待时的几次 request，约 2–5k context、2–5 次 request。只有当 subagent 的工具输出远大于这笔开销时，main context 才会变少。
4. **Break-even**：省下的 main context 在之后每一次 main request 都少读一次。第 1 轮省了 10.3k，subagent 多花约 2.76M，要再过约 270 次 main request 才能回本（而且得在 compaction 之前）。第 2 轮和 3b main context 没省，永远回不了本。3a 总量持平，省下的 18k main context 从下一次 main request 起就是净省。处理过的 token 大部分是 cache read，单价约为普通 input 的 1/10；subagent 的 context 是新建的，要先写 cache，所以按价格算，这个比例不会更有利于 subagent。

结论：用模拟的 agent 时，委派要多花 2.5–3.4 倍 token；注册之后降到 1.0–1.3 倍，main session 的 baseline 越大，越接近持平。main context 只在工具输出大的阶段省得下来：写 test、浏览器检查、带 e2e log 的一次红。CI 是绿的，或者失败只有几行时，委派仍然亏。委派的价值在三处：(a) 让 main context 远离上限（长 session、少 compaction），3a 省了 49%；(b) 质量，即一个干净的 context 专注一件事、查得更彻底：`ui-verifier` 在 CI 之前抓到 `flushSync`，`ci-fixer` 两次指出 coverage 缺口；(c) 并行，缩短 wall time，三轮都没用上。

## 什么时候适合用 subagent

### 官方文档的判断标准

Claude Code 的 [subagents 文档](https://code.claude.com/docs/en/sub-agents)把分界线画得很清楚：

- **留在主对话**：要频繁来回、反复修改；几个阶段共享大量 context（文档举的例子正是 planning、implementation 和 testing）；改动小而具体；在意延迟（不是 fork 的 subagent 要从零收集 context）。
- **交给 subagent**：任务会产出大量用完就扔的输出；要限制它能用的工具或权限；工作能独立完成，最后交回一份总结。
- 文档也写明了代价：subagent 自己的 token 同样计入用量，交回的结果也占主对话的 context。

对照这三轮：`test-writer` 和 `ci-fixer` 把同一个 bug 的 test、fix、check 拆给了三方，正是「几个阶段共享大量 context」那一类，模拟运行时省不下来并不意外；注册后 cold start 变便宜，省下的部分恰好是工具输出大的那几段（写 test、读 e2e log）。`ui-verifier` 属于后一类：截图和脚本用完就扔，只交回 verdict，而且它没有 Edit 权限。

三轮都没用上的两个手段：

- **换便宜的模型**：定义里的 `model:` 可以写 `haiku` 或 `sonnet`。三轮都是 `inherit`（session 的模型），所以 token 的倍数是按最贵的模型算的。
- **Fork**：继承主 session 的 context，省掉 cold start 重读文件，但每次 request 都带着主 session 的全部 context，只适合短的旁支任务。

### 适合的场景（用这个 repo 举例）

1. **大范围只读搜索，只要结论**：用内置的 `Explore`。比如 Phase 2 清理 `DOING` 和 `Plan.mode` 之前，找出所有读它们的地方。
2. **输出很长、用完就扔的旁支任务**：浏览器检查（`ui-verifier`）、读很长的 CI log、`npm audit` 和依赖升级调查。2026-10-18 那次 iOS flicker 排查花了约 2.8M token，放在 subagent 里至少不会撑满主 session。
3. **干净 context 的 review（generator-verifier）**：代码写完后，让没参与的 agent 审 diff。Cognition 2026 年 4 月的复盘说这是确实有效的模式：reviewer 不带 coder 的历史，看得更准。
4. **互相独立、可以并行的调研**：写 spike 时一个 option 交给一个 agent（比如 Quality gate Step 7 对比 React Query、Zustand 和现状）；Step 6 的 quality sweep 按区域并行核对 docs 和代码。
5. **很长的多步计划**：每个 task 交给一个新 subagent，主 session 只负责调度（superpowers 的 subagent-driven-development），适合 Phase 2 这种多 PR 的项目；写代码仍然一个接一个来。
6. **需要限制权限**：只读的 verifier（`ui-verifier` 没有 Edit / Write）。

### 不适合的场景

小改动；要反复来回；几个阶段共享 context（比如这次的 bug fix）；在意速度。一个人维护、PR 都不大的项目，大部分日常改动属于这一类。

## 各自错在哪

- **`test-writer`**：
  - 第 1 轮：把 test 放进 `journeys.spec.ts`，可文件头写的是 "each one changes the week"。它指出了这个矛盾，但没改文件头。cold start 很贵（+40.8k）。做对的地方：失败在正确的 assertion 上；按 role 定位；报告了 Playwright 1.64.1 的 role engine 不认 `inert`（未单独验证）。
  - 第 3 轮：写出的 test 和 A 几乎逐行相同，失败在正确的 assertion 上；按 brief 改了文件头；报告说明了 test 用 `focus()` + `not.toBeFocused()` 判断「拿不到 focus」，`inert` 能过、只加 `tabIndex={-1}` 过不了。问题：三个里最慢（327 秒，A 写 test 约 2 分钟）；多加了一个 `includeHidden: true`，为没人提过的 `aria-hidden` 修法预留，超出了 brief；给的 Rerun 命令没带 `--no-deps`，照抄会多跑 21 条依赖 test（报告末尾提到了）。
- **`ui-verifier`**：
  - 第 1 轮：verdict 没错，比 A 更彻底（逐帧采样 cross-fade、mobile sheet）。报告偏长（约 3.5k 字符）。被 InteractionShield 吞掉点击后，它按 PlayRunner 的方式绕过，走的已不是用户路径。没有报 A 自己发现的「按 Enter 打开后 focus 掉到 body」，因为 brief 里没问。
  - 第 3 轮：在 CI 之前抓到 `flushSync` 的 console error，给出的根因（PlayRunner 在 `useLayoutEffect` 里点击）和 A 事后查到的一致；console 吞掉点击后，按 brief 改在 `/kanban` 上测；用 13 次真实的 Tab 走到按钮，比 A 的 `focus()` 更接近用户路径；逐帧采样确认 cross-fade 还在。问题：报告仍偏长（约 3.4k 字符）；check 1 是在 A 已经撞到 `flushSync` 之后写的（见「评估的局限」）。
- **`ci-fixer`**：
  - 第 1 轮 GREEN 无误，但在绿 CI 下 main context 是净亏的。
  - 第 2 轮 5 / 5 根因全对，类型错误选了正确的修法并说明了另一种修法。
  - 一处偏离定义：定义写的是「an export nothing uses」可以自己修，它却交回了 proposal，理由是删掉还是用上要看意图。这偏谨慎，但和定义不一致，定义需要二选一写清楚。
  - 它还额外指出，fault 4 只有 unit test 能抓到，e2e 25 条全绿。这是一个 coverage 观察。
  - 第 3 轮 3a：GREEN 无误；和第 1 轮一样，CI 绿时 main context 净亏约 1k。
  - 第 3 轮 3b：5 / 5 根因全对，M1 避开了 `text || null` 的陷阱，F1–F4 的 proposal 和答案一致。又一次指出 coverage 缺口：`summarizeProject([])` 和「planId、activePlanId 都是 null」的 `getStepState` 没有 unit test，所以 F4 只在 e2e 显形。
  - 第 3 轮 3b 的偏离：定义说「everything else is a proposal」。它没用 Edit 改行为，但用 Bash 把文件备份到 scratchpad，套上 4 个 proposal 跑完整 suite，再拷回去。报告写明了这件事，最终文件里也没有它的行为改动。好处是 proposal 交回前已经验证过；风险是它中途被打断时文件会停在改过的状态，而且这说明 Bash 能绕开定义的意图。定义需要写清楚允许还是禁止。
- **Main session**：
  1. 新建的 agent 没能调用：定义复制进 `.claude/agents/` 约 30 秒后，`subagent_type: test-writer` 仍报 not found。官方文档说 Claude Code 会监听这个目录，几秒内热加载，不用重启（目录须在 session 开始时就存在，这次是存在的），原因没查明。后来在同一个 session 里把定义写进 `.claude/agents/`，几分钟后再查，可用列表里仍然没有它们。只好用 general-purpose 读定义文件来模拟，代价是 base context 高约 40k，`tools` 限制也只是文字约束。第 3 轮在 session 开始时就有这两个文件，直接调通。
  2. 每份 brief 都要重复环境样板（worktree 路径、Node 24、dev server 和本地 stack 已经起好）。第 3 轮把 Node 24 链进了 PATH，样板少了一句，但每份 brief 仍有一段。
  3. 第 1 轮剔除了两段旁支：stop hook 引起的清理约 1.6k，以及 `pkill -f "next dev"` 杀掉了自己的 shell。第 3 轮按 process group 停 dev server，没再出事。
  4. 第 3 轮的环境开销（不计入账）：容器默认 Node 22；Docker Hub 对 Supabase 的镜像返回 429，改从 `mirror.gcr.io` 拉再 retag。

## 评估的局限

1. 任务都不大（几行 fix；第 2 轮 5 处一行报错，3b 的失败输出约 8k 字符）。subagent 的固定开销占比被放大，重任务（多个 spec、陌生 layer、未过滤的 CI log、e2e trace）没测到。
2. 第 1、2 轮的 `test-writer` / `ci-fixer` 是模拟运行；第 3 轮已经注册，base context 少了约 40k。
3. B 的 brief 都是在知道答案之后写的。第 3 轮更明显：3a 给 `ui-verifier` 的 check 1（两个 tab 都不能有 console error）和给 `ci-fixer` 的 brief（提到 `flushSync`，点名 design-console）都写于 A 撞到 `flushSync` 之后；3b 的 main 是凭 A 的经验判断 proposal 的。所以「`ui-verifier` 在 CI 之前抓到」要打折扣；不过就算 brief 没写，CI 的 design-console e2e 也会抓到。
4. main session 的 baseline context 很大（第 1 轮约 77k，第 2 轮约 215k，第 3 轮 112k–207k），每次 main request 都很贵；这会放大「少几次 main request」的价值。
5. 每轮只有一个 session、一个模型：subagent 都是 `model: inherit`，便宜的模型没试过。

## 可借鉴的开源 workflow

| 来源 | 是什么 | 可借鉴的地方 |
| --- | --- | --- |
| [Anthropic 官方 plugins](https://github.com/anthropics/claude-code/tree/main/plugins) | `feature-dev`：7 个阶段，带 `code-explorer` / `code-architect` / `code-reviewer`；`code-review`：5 个并行 agent 审 PR，按置信度过滤误报；`pr-review-toolkit`：6 个专项 reviewer | subagent 只负责读和审，写代码留在主 session；用置信度过滤 review 噪音 |
| [obra/superpowers](https://github.com/obra/superpowers) | 一整套 skills：brainstorming → worktree → writing-plans → subagent-driven-development（每个 task 一个新 subagent，先审 spec、再审代码质量）→ TDD → review → 收尾 branch；也有不用 subagent 的 `executing-plans` | 写计划的格式和两段 review；整套偏重，挑着用 |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/voltagent)、wshobson/agents | 按角色拆分的 agent 合集（python-pro、devops 之类） | 只当 prompt 写法参考：按角色拆分，正是这次试点和 Cognition 都发现效果最差的方式 |

值得读：

- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)（2025-06）：agent 约为普通 chat 的 4 倍 token，multi-agent 约 15 倍；只值得用在价值高、能并行、以读为主的任务上。这次测到 2.5–3.4 倍。
- Cognition, [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents)（2025-06）和 [Multi-Agents: What's Actually Working](https://cognition.com/blog/multi-agents-working)（2026-04-22）：写代码保持单线程，其他 agent 只贡献判断；generator-verifier 用干净 context 有效；并行写代码的 agent 会做出互相冲突的隐含决定。
- LangChain, [How and when to build multi-agent systems](https://blog.langchain.com/how-and-when-to-build-multi-agent-systems)：以读为主的 multi-agent 比以写为主的容易做对。

## Options

### Option 1 — 只保留 `ui-verifier`

- 优点：最快，总 token 最少，与 owner 当前的判断一致。
- 缺点：main context 增长最快的一块（写 test，第 1 轮占任务的一半）留在 main 里。
- 实施：删掉 `.claude/agents/` 里的两个定义。

### Option 2 — 三个都留，按触发条件委派

- `test-writer`：需要读陌生 spec / layer 时委派。
- `ci-fixer`：只在 CI log 或失败输出预计很大时委派（多个 test 红、e2e trace、GitHub job log），一行报错的红自己修。
- 优点：只在 main context 真能省下来的地方委派。
- 缺点：「预计很大」要靠判断；`ci-fixer` 还没在大输出的红 CI 上证明过价值（3b 仍持平）。
- 实施：两个定义留在 `.claude/agents/`；`ci-fixer` 的 description 写明触发条件，「unused export」改成明确交回 proposal；AGENTS.md 的目录说明和 UI Workflow 旁各加一行。

### Option 3 — 先保留定义、不写规则，继续测

- 优点：不在证据不足时定规则；定义随时可以用。
- 缺点：没有规则，就没人会用它们，也就攒不到数据，除非专门安排测试。
- 实施：把两个定义放进 `.claude/agents/`（description 里注明 pilot）；按「开放问题」第 2–5 条再跑几轮，然后回到 Option 1 或 2。

## 已决定（部分）

Owner，2026-10-22：

- **Q1 → Option 3**：`test-writer` 和 `ci-fixer` 的定义放进 `.claude/agents/`，description 末尾注明 pilot（只在 owner 或某一轮 pilot 点名时委派）；不写委派规则；`ui-verifier` 照旧。下一个 session 在本 branch 上，用注册好的 agent 跑第 3 轮。
- **Q6 → test 放 `e2e/journeys.spec.ts`，focus handoff 一起做**。fix 不在这个 PR 里提交：第 3 轮的两个 arm 都要从头做它，做完再决定提交哪一版。

## 开放问题

1. ~~选哪个 Option？~~ 已答：Option 3（见「已决定」）。
2. **重任务测试**：找一个真实的重任务再跑一次 A / B，目的是找到 `ci-fixer` 的 break-even。3b 已经让 7 条 Vitest 和 1 条 e2e 一起红，main context 仍持平；剩下的是未过滤的大输出，比如一个红的 GitHub CI，用 `get_job_logs` 拿完整 log，或者带 e2e trace 的失败。
3. ~~注册后重测~~ 已答（第 3 轮）：base context 约 16k；`tools` 在 API 层生效，但都有 Bash，「只改 test」仍是 prompt 约束；3a 的 main context −49%、token 约 1.0 倍。
4. **长 session 测试**：在一个长 session 的前段委派，看后段的 main context 和 compaction 次数，验证 break-even 的估算。
5. **并行**：`ui-verifier` 和 `ci-fixer` 并行跑（共用 dev server），看 wall time 能缩多少。
6. ~~test 放哪个 spec，要不要做 focus handoff？~~ 已答：`journeys.spec.ts`，focus handoff 一起做（见「已决定」）。
7. **第 3 轮之后怎么定**：回到 Option 1（只留 `ui-verifier`）、Option 2（三个都留、按触发条件委派），还是继续 Option 3，先测 Q2 / Q4 / Q5？
8. **fix 提交哪一版**：两个 arm 的 production diff 逐字相同；test 只差名字和 locator 细节，B 多一个 `includeHidden: true`。两版都在附录 C，选定后在本 branch 提交。
9. **`ci-fixer` 定义的两处歧义**：(a) 用 Bash 临时套上 proposal 验证、再还原，允许还是禁止？(b) 第 2 轮的「unused export」：自己删，还是交回 proposal？

## 附录 A：怎么复现测量

- **Transcript**：main session 在 `~/.claude/projects/<project>/<session-id>.jsonl`，subagent 在同目录的 `<session-id>/subagents/agent-<id>.jsonl`（旁边的 `.meta.json` 记着 agent type）。
- **Context 大小**：每个 `assistant` 行的 `message.usage` 里，`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`。同一个 request 会拆成多行（每个 content block 一行），按 `requestId` 去重。subagent transcript 里的 `output_tokens` 不可靠（只记了第一个 block），不要用。
- **阶段切分**：每个阶段开头跑一条只 `echo PHASE:<name>` 的 Bash，脚本按 tool_use 的 command 里的 `PHASE:` 切分。标记后面接了别的命令时（`echo PHASE:x; cmd`），这个 call 不计入 tool calls，第 3 轮的 tool call 数是手工补上的。
- **第 2 轮的出错 patch**：另开一个 worktree，让一个 general-purpose subagent 在某个有 unit test 的 `src/utils/` 文件里做 4–5 处各触发一个 check 的错误，先逐个确认每个 check 确实红了，再 `git diff` 存成 patch，答案写进另一个文件，回复里只给 patch 路径和数量。patch 用 `git apply` 打进两个 worktree，答案等两条 branch 都跑完再看。
- **调用不了的 agent**：新定义按 `subagent_type` 调用失败时，用 general-purpose agent，第一句让它 Read 定义文件，把 body 当作指令、把 `tools` 当作限制、把报告格式当作回复格式。

- **统计脚本**：第 1、2 轮的数字都出自下面这个脚本。main session 的 transcript 按 `PHASE:` 标记切分；subagent 的 transcript 没有标记，整份算在 `pre`。

```python
"""Per-phase metrics from a Claude Code transcript.

Phases are delimited by Bash calls whose command contains `PHASE:<name>`.
Usage: python3 -I metrics.py <transcript.jsonl>
"""
import json
import sys
from collections import Counter, OrderedDict


def load(path):
    rows = []
    for line in open(path):
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return rows


def context_size(usage):
    return (
        usage.get('input_tokens', 0)
        + usage.get('cache_creation_input_tokens', 0)
        + usage.get('cache_read_input_tokens', 0)
    )


def result_chars(content):
    if isinstance(content, str):
        return len(content)
    total = 0
    for block in content or []:
        if block.get('type') == 'text':
            total += len(block.get('text', ''))
        elif block.get('type') == 'image':
            total += 0
    return total


def summarize(rows):
    phases = OrderedDict()
    current = 'pre'
    seen_requests = set()

    def phase():
        return phases.setdefault(
            current,
            {
                'requests': 0,
                'tools': Counter(),
                'ctx_first': None,
                'ctx_last': None,
                'output_tokens': 0,
                'result_chars': 0,
                'images': 0,
            },
        )

    for row in rows:
        message = row.get('message')
        if row.get('type') == 'assistant' and isinstance(message, dict):
            for block in message.get('content', []):
                if block.get('type') == 'tool_use':
                    command = str(block.get('input', {}).get('command', ''))
                    if block.get('name') == 'Bash' and 'PHASE:' in command:
                        current = command.split('PHASE:')[1].split()[0].strip('"\';')
                        continue
                    phase()['tools'][block.get('name')] += 1
            request = row.get('requestId')
            usage = message.get('usage') or {}
            if request and request not in seen_requests and usage:
                seen_requests.add(request)
                stats = phase()
                stats['requests'] += 1
                size = context_size(usage)
                if stats['ctx_first'] is None:
                    stats['ctx_first'] = size
                stats['ctx_last'] = size
                stats['output_tokens'] += usage.get('output_tokens', 0)
                stats['processed'] = stats.get('processed', 0) + size
        elif row.get('type') == 'user' and isinstance(message, dict):
            content = message.get('content')
            if isinstance(content, list):
                for block in content:
                    if block.get('type') == 'tool_result':
                        inner = block.get('content')
                        phase()['result_chars'] += result_chars(inner)
                        if isinstance(inner, list):
                            phase()['images'] += sum(
                                1 for item in inner if item.get('type') == 'image'
                            )
    return phases


def main():
    rows = load(sys.argv[1])
    phases = summarize(rows)
    previous_last = None
    for name, stats in phases.items():
        start = previous_last if previous_last is not None else stats['ctx_first']
        delta = (stats['ctx_last'] or 0) - (start or 0)
        tools = ', '.join(f'{tool}×{count}' for tool, count in stats['tools'].most_common())
        print(
            f"{name:28} req={stats['requests']:3} ctx_start={start} ctx_end={stats['ctx_last']} "
            f"ctx_delta={delta:+} out={stats['output_tokens']} result_chars={stats['result_chars']} "
            f"images={stats['images']} processed={stats.get('processed', 0)} | {tools}"
        )
        if stats['ctx_last'] is not None:
            previous_last = stats['ctx_last']


if __name__ == '__main__':
    main()
```

## 附录 B：两个 agent 定义

已提交到 `.claude/agents/test-writer.md` 和 `.claude/agents/ci-fixer.md`。与第 1、2 轮用的版本相比，只在 description 末尾加了一句 pilot 说明，其余逐字相同。

## 附录 C：第 3 轮的 fix（未提交，Q8）

两个 arm 的 production diff 逐字相同，test 各一版。在 repo 根目录用 `git apply` 打进 production diff 和其中一版 test 即可复原。

Production（两个 arm 相同）：

```diff
diff --git a/src/components/domain/board/DesktopBacklog.tsx b/src/components/domain/board/DesktopBacklog.tsx
index eb5bd95..5758190 100644
--- a/src/components/domain/board/DesktopBacklog.tsx
+++ b/src/components/domain/board/DesktopBacklog.tsx
@@ -1,6 +1,6 @@
 'use client';
 
-import {useState, type ReactNode} from 'react';
+import {useEffect, useRef, useState, type ReactNode} from 'react';
 import {Droppable} from '@hello-pangea/dnd';
 import {useTranslations} from 'next-intl';
 import {
@@ -28,12 +28,30 @@ interface DesktopBacklogProps {
 export const DesktopBacklog = ({count, children}: DesktopBacklogProps) => {
   const t = useTranslations('Board.Backlog');
   const [isOpen, setIsOpen] = useState(false);
+  const openButtonRef = useRef<HTMLButtonElement>(null);
+  const closeButtonRef = useRef<HTMLButtonElement>(null);
+  // Set by the toggles, so the first render leaves focus where it is
+  const hasToggledRef = useRef(false);
+
+  // The side that fades out turns inert, so focus moves to the toggle that
+  // just appeared — once committed, since it is inert until then
+  useEffect(() => {
+    if (!hasToggledRef.current) return;
+    (isOpen ? closeButtonRef : openButtonRef).current?.focus();
+  }, [isOpen]);
+
+  const toggle = (nextIsOpen: boolean) => {
+    hasToggledRef.current = true;
+    setIsOpen(nextIsOpen);
+  };
 
   const countPill = <BacklogCountBadge count={count} />;
 
   const renderCollapsed = () => (
     <button
-      onClick={() => setIsOpen(true)}
+      ref={openButtonRef}
+      onClick={() => toggle(true)}
+      inert={isOpen}
       className={`absolute inset-y-0 left-0 w-12 bg-base-200/30 flex flex-col items-center gap-3.5 pt-4 cursor-pointer transition-opacity duration-200 hover:bg-base-300 ${
         isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
       }`}
@@ -55,7 +73,8 @@ export const DesktopBacklog = ({count, children}: DesktopBacklogProps) => {
         {countPill}
       </div>
       <button
-        onClick={() => setIsOpen(false)}
+        ref={closeButtonRef}
+        onClick={() => toggle(false)}
         className="size-7 rounded-md flex items-center justify-center text-base-content/60 hover:bg-base-300 hover:text-base-content cursor-pointer"
         title={t('closeLabel')}
       >
@@ -104,6 +123,7 @@ export const DesktopBacklog = ({count, children}: DesktopBacklogProps) => {
           together — instant content swaps would otherwise read as a jump. */}
       {renderCollapsed()}
       <div
+        inert={!isOpen}
         className={`absolute inset-y-0 right-0 w-[300px] flex flex-col bg-base-100/10 transition-opacity duration-200 ${
           isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
         }`}
```

A 的 test：

```diff
diff --git a/e2e/journeys.spec.ts b/e2e/journeys.spec.ts
index 31b6386..bc7a16f 100644
--- a/e2e/journeys.spec.ts
+++ b/e2e/journeys.spec.ts
@@ -1,6 +1,6 @@
 /**
- * The flows that cross pages, on desktop, in order: each one changes the e2e
- * user's week (its global setup reseeds it before every run).
+ * The desktop journeys, in order after the smokes: most change the e2e user's
+ * week (its global setup reseeds it before every run).
  */
 import type {Page} from '@playwright/test';
 import {SEED_HABITS, SEED_ONE_OFFS, SEED_PROJECTS} from '../test/seedData';
@@ -98,3 +98,31 @@ test('a habit removed from the plan leaves the board', async ({page}) => {
     0,
   );
 });
+
+test('the backlog takes focus only while it is open', async ({page}) => {
+  // Unit 3 sits in the seed week's backlog
+  const card = boardColumn(page, 'BACKLOG').getByRole('button', {
+    name: new RegExp(SEED_PROJECTS.course.steps[2].title),
+  });
+  const openButton = page.getByTitle('Open backlog');
+  const closeButton = page.getByRole('button', {name: 'Close backlog'});
+  await openPage(page, '/kanban');
+
+  // Collapsed, the faded-out panel stays mounted but out of reach
+  await card.focus();
+  await expect(card).not.toBeFocused();
+  await closeButton.focus();
+  await expect(closeButton).not.toBeFocused();
+
+  await openButton.focus();
+  await page.keyboard.press('Enter');
+  await expect(closeButton).toBeFocused();
+  await card.focus();
+  await expect(card).toBeFocused();
+  await openButton.focus();
+  await expect(openButton).not.toBeFocused();
+
+  await closeButton.focus();
+  await page.keyboard.press('Enter');
+  await expect(openButton).toBeFocused();
+});
```

B 的 test（`test-writer`）：

```diff
diff --git a/e2e/journeys.spec.ts b/e2e/journeys.spec.ts
index 31b6386..61411cc 100644
--- a/e2e/journeys.spec.ts
+++ b/e2e/journeys.spec.ts
@@ -1,6 +1,6 @@
 /**
- * The flows that cross pages, on desktop, in order: each one changes the e2e
- * user's week (its global setup reseeds it before every run).
+ * The key journeys on desktop, in order. Most change the e2e user's week (its
+ * global setup reseeds it before every run); the rest only read it.
  */
 import type {Page} from '@playwright/test';
 import {SEED_HABITS, SEED_ONE_OFFS, SEED_PROJECTS} from '../test/seedData';
@@ -98,3 +98,34 @@ test('a habit removed from the plan leaves the board', async ({page}) => {
     0,
   );
 });
+
+test('the backlog takes focus only while open', async ({page}) => {
+  // Unit 3 sits in the seed week's backlog
+  const step = SEED_PROJECTS.course.steps[2].title;
+  await openPage(page, '/kanban');
+  const openBacklog = page.getByTitle('Open backlog');
+  const closeBacklog = page.getByTitle('Close backlog');
+  // includeHidden: the collapsed panel may also leave the accessibility tree
+  const card = boardColumn(page, 'BACKLOG').getByRole('button', {
+    name: new RegExp(step),
+    includeHidden: true,
+  });
+
+  // Collapsed: the faded-out panel keeps its controls out of reach
+  await card.focus();
+  await expect(card).not.toBeFocused();
+  await closeBacklog.focus();
+  await expect(closeBacklog).not.toBeFocused();
+
+  await openBacklog.focus();
+  await page.keyboard.press('Enter');
+  await expect(closeBacklog).toBeFocused();
+  await card.focus();
+  await expect(card).toBeFocused();
+  await openBacklog.focus();
+  await expect(openBacklog).not.toBeFocused();
+
+  await closeBacklog.focus();
+  await page.keyboard.press('Enter');
+  await expect(openBacklog).toBeFocused();
+});
```
