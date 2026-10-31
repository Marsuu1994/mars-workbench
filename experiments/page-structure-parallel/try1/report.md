# page-structure-parallel · try1 — 报告

**执行 2026-10-26 05:25–06:52 UTC** · 协议：`instruction.md` · prompt、脚本和原始数据：lab 仓库 [`archive/try1`](https://github.com/Marsuu1994/mars-workbench-lab-try2/tree/archive/try1/experiments/page-structure-parallel/try1)

> try2（每组五个 run，去掉了这一轮的两个干扰因素）复现了结论：并行仍然更慢，成本约 1.5 倍；见 tracker › Harness engineering › 1a。

> 叙述用中文；run 编号、指标名、代码标识保留英文。

## 结论

1. **这个规模的任务用串行。** 并行没有省时间：三页代码写完 A 组均值 7.9 min、B 组 10.1 min；总时长 A 20.9 min（16.9–25.4）、B 34.6 min（20.3–43.2）。并行多花 36% 的钱（$9.07 对 $6.66），一致性略差（盲审 consistency A 5 / 5 / 5，B 4 / 4 / 5），其余质量信号分不出高下。
2. **并行在算术上赢不了这么小的任务。** 三页串行一共 7.5 min，最慢的一页 3.6–4.3 min，并行最多省 3.5–4 min；而并行的固定成本实测 4–9 min：setup 被挤上关键路径 2.2–5.6 min、每个 agent 冷启动和自跑检查多 1.2–2 min、派发 0.8 min、合并 0.2–1.2 min。
3. **主 session 的协调成本和自己实现一样多。** B 组 main session 的模型调用 71–81 次，和 A 组做完全部实现的 70–88 次相同；三个 page agent 的 70 多次调用全是额外的。
4. **真正决定总时长的是验证尾巴，和并行无关。** 写完代码到第一次 push，A 5.4 / 13.8 / 7.5 min，B 27.3 / 7.9 / 25.9 min：差别只在那个 run 有没有陷进自己手写的 Playwright 点击脚本（B1、B3 各约 20 min，B2 没有，B2 和 A 组持平）。仓库里要是有现成的点击脚本，六个 run 大概都落在 15–20 min。
5. **质量六个都够合并。** CI 六个一次绿；行为检查六个 16 / 16；清单 A 19 / 20 / 19，B 19 / 20 / 20；盲审 A 27 / 27 / 27，B 26 / 27 / 27（满分 30），没有 blocker，没有发现行为 bug。
6. **并行会赢的条件**：各块工作之和减最大的那块要明显大于 4–9 min 的固定成本，也就是每块本身 10–15 min 以上或块数远多于三，同时 setup 离开关键路径、验证已脚本化。那时它买到的是 wall time 和更小的主 context，代价仍是约 1.4 倍的 token。
7. **建议合并 B2（PR #87）**，备选 A2（PR #88）；理由见"建议合并"。

## 数据

### 时间（UTC，分钟从 session 创建算起）

| Run | 三页代码写完 | 写完 → 第一次 push | push → CI 绿 | 总时长（→ session idle） |
| --- | --- | --- | --- | --- |
| A1 | 7.4 | 5.4 | 3.6 | 16.9 |
| A2 | 7.5 | 13.8 | 3.5 | 25.4 |
| A3 | 8.7 | 7.5 | 3.6 | 20.4 |
| B1 | 8.8 | 27.3 | 4.0 | 40.4 |
| B2 | 8.2 | 7.9 | 3.6 | 20.3 |
| B3 | 13.2 | 25.9 | 3.4 | 43.2 |

| Run | setup | 三个 page commit（committer time） | 第一次 push | PR 开出 | CI 全绿 | session idle |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | 05:25:50 → 05:27:44（后台） | 05:27:31 Board · 05:29:13 Dump · 05:32:57 Priorities | 05:38:18 | 05:38:59（#85） | 05:41:57 | 05:42:30 |
| A2 | 后台，seed 05:32:57 完成 | 05:27:44 · 05:29:22 · 05:33:04 | 05:46:54 | 05:47:25（#88） | 05:50:25 | 05:51:00 |
| A3 | 05:26:05 → ≈05:27:59（后台） | 05:28:28 · 05:29:59 · 05:34:15 | 05:41:42 | 05:42:13（#86） | 05:45:21 | 05:45:59 |
| B1 | 05:25:56 → 05:28:15（前台，2m19s） | agents 05:28:37 起；Board 05:31:27 · Dump 05:32:09 · Priorities 05:34:09 交回 | 06:01:40 | 06:02:22（#89） | 06:05:31 | 06:06:02 |
| B2 | 05:25:54 → 05:27:47（前台，1m54s） | agents 05:28:10 起；Dump 05:30:54 · Board 05:31:19 · Priorities 05:33:31 交回 | 05:41:41 | 05:42:15（#87） | 05:45:18 | 05:45:52 |
| B3 | 05:25:54 → 05:31:14（后台但等它结束，5m20s） | agents 05:31:39 起；Board 05:34:33 · Dump 05:35:20 · Priorities 05:38:04 交回 | 06:04:40 | 06:05:28（#90） | 06:08:04 | 06:08:54 |

- 组均值：三页写完 A 7.9、B 10.1；到 PR 开出 A 17.3（13.5–21.9）、B 31.1（16.7–39.9）；总时长 A 20.9、B 34.6。
- B 的 page agent 各自用时：Board 2m37s–2m54s，Dump 2m14s–3m12s，Priorities 4m50s–6m09s；三个之和 9.7–12.3 min，并行墙钟 5.4–6.4 min（并行段本身 1.8 倍加速）。A 的同一页：Board 2.0–2.9 min（含读 AGENTS.md 和 spike），Dump 1.5–1.7，Priorities 3.6–4.3。
- CI：六个都是第一次 push 就全绿（8 项），PR 到绿 2.6–4.0 min，e2e job 约 3 min；没有红 CI，没有修复轮。

### Token 和成本

数据来源：`get_session` 的 session 汇总（和 transcript 的 `result` 事件一致）；main / subagent 的拆分来自 transcript（按 `message.id` 去重；assistant 事件上的 `output_tokens` 是流式占位值，不用）。

| Run | cost_usd | cache read | cache write | output | requests（main + subagent） | context 峰值 | subagent 的 cache read |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 6.34 | 14.83M | 271k | 65.7k | 84（71 + 13 ui-verifier） | 281k | ui-verifier 0.38M |
| A2 | 7.16 | 18.23M | 278k | 72.0k | 99（88 + 11） | 287k | ui-verifier 0.33M |
| A3 | 6.47 | 15.33M | 271k | 67.2k | 84（70 + 14） | 290k | ui-verifier 0.42M |
| B1 | 9.16 | 21.69M | 449k | 101.1k | 155（81 + Board 13 · Priorities 30 · Dump 19 · ui-verifier 12） | 239k | Board 0.97M · Priorities 3.30M · Dump 1.63M · ui-verifier 0.31M；main 14.12M |
| B2 | 8.96 | 18.71M | 561k | 94.6k | 139（71 + 16 · 27 · 11 · 14） | 229k | Board 1.28M · Priorities 3.19M · Dump 0.80M · ui-verifier 0.43M；main 12.14M |
| B3 | 9.09 | 20.38M | 448k | 111.4k | 155（74 + 16 · 33 · 22 · 10） | 236k | Board 1.24M · Priorities 3.81M · Dump 1.83M · ui-verifier 0.27M；main 12.43M |

- 成本 A 均值 $6.66（6.34–7.16），B $9.07（8.96–9.16），1.36 倍。拆开：cache read 16.1M 对 20.3M（1.26 倍），cache write 273k 对 486k（1.78 倍，三个 agent 各自从头建 context），output 68k 对 102k（1.50 倍）。
- 模型调用 A 均值 89、B 150；B 的 main 自己 71–81 次，和 A 的 70–88 次一样多。
- B 的 main context 峰值 229–239k，比 A 的 281–290k 低约 50k。
- Page agent 的大小稳定：Board 0.97–1.28M read、Dump 0.80–1.83M、Priorities 3.19–3.81M（M 号的页最贵），ui-verifier 0.27–0.43M。

### 过程

| Run | 工具调用 | Bash | push | commit | 工具错误 | 合并冲突 | 其他 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 87 | 75 | 1 | 4 | 2（无害） | — | 检查和 npm test 放后台，e2e 前台；自己写了点击脚本 |
| A2 | 100 | 88 | 1 | 4 | 3（无害） | — | 点击脚本和 ui-verifier 并行跑；改了 experiment 文件里的链接（judgment call） |
| A3 | 88 | 76 | 1 | 4 | 2（无害） | — | 还跑了 test:coverage |
| B1 | 163（main 74） | 131（main 60） | 1 | 4（3 个 agent commit + docs） | 7（4 个 worktree 守卫拒绝 agent 的复合命令，2 个 `pkill` 144，1 个 `ls`） | 1（`src/app/design/constants.ts`、`DomainTab.tsx`；`tail -5` 把 CONFLICT 吞了） | 先 `git merge --no-ff`，再 reset 改成 cherry-pick 以保住一页一个 commit；stop hook 拦了 3 次，第三次把 `.claude/worktrees` 写进 `.git/info/exclude`；自己的点击脚本调了 19.6 min，拿一份没改的 `main` worktree 做对照 |
| B2 | 141（main 65） | 113（main 50） | 1 | 4（3 个 agent commit + docs） | 7（3 个 worktree 守卫，1 个 cherry-pick 冲突，3 个无害） | 1（同样两个文件，两边都保留） | Dump ff-merge，Board / Priorities cherry-pick；stop hook 拦了 4 次 |
| B3 | 165（main 72） | 135（main 60） | 1 | 4（3 个 agent commit + docs） | 9（5 个 worktree 守卫拒绝 heredoc / python 编辑，agent 改用 Write；自己脚本的 chromium 路径；2 个 `ls`；`pkill` 144） | 1（同样两个文件；修冲突时把 Priorities 的类型挪进 `src/types`） | cherry-pick 合并；stop hook 拦了 1 次；自己的点击脚本调了 22 min；commit message 带 "[B3]" 前缀 |

- 每个 run 都用了一次 `ui-verifier`（Board 布局），也都自己写了一份真实页面的 Playwright 点击脚本。ui-verifier 的判定不稳定：A1 FAIL（7/8）、A2 FAIL（6/7）、A3 FAIL（5/6）、B3 FAIL（1/10），B1、B2 PASS，说的都是同一件事（desktop-only 的 "backlog open" tab 在手机宽度下的 play step 找到两个 "Open backlog" 按钮），六个 run 都判为 pre-existing、不修、写进 PR。
- B 组三次合并都只冲突在 spike 预测的两个共享文件上，两边都是新增，1 min 内解决；三次都没有 merge commit（ff 或 cherry-pick），所以 B 的历史和 A 一样是一页一个 commit。
- 没有一个 run 向不存在的人提问；没有模型回退；六个 run 的容器都在 Node 22 上跑（npm 的 EBADENGINE 警告，无害）。

### 质量

| Run | CI 第一次 push | 清单（/20） | 清单未满足项 | 行为检查（16 项） | 盲审标签 | 盲审分（correctness / spec / consistency / conventions / scope / readability） | 盲审缺陷（blocker / major / minor / nit，已剔除 README 产物） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 绿 | 19 | 19 ~：spike 没归档（故意留着等 Q9 结果，tracker 加了一条） | 16/16（desktop drag 冷服务器失败一次，热重试通过） | R2 | 5 / 4 / 5 / 4 / 4 / 5 = 27 | 0 / 1 / 1 / 3（major = spike 没归档） |
| A2 | 绿 | 20 | — | 16/16 | R5 | 5 / 4 / 5 / 4 / 4 / 5 = 27 | 0 / 0 / 0 / 3（AGENTS.md:115 的 Bad 例子还写着 `PriorityMatrixPage`；adapter 手写类型；零参数的 inert 工厂） |
| A3 | 绿 | 19 | 19 ~：spike 没归档，链接没改 | 16/16 | R1 | 5 / 4 / 5 / 4 / 4 / 5 = 27 | 0 / 0 / 1 / 2（minor = spike 没归档） |
| B1 | 绿 | 19 | 19 ~：spike 故意没归档（tracker 写明等 Q9 报告） | 16/16 | R4 | 5 / 4 / 4 / 4 / 4 / 5 = 26 | 0 / 1 / 2 / 4（major = spike 没归档；minor = Priorities 的页面数据类型放在 utils 而 Dump / Board 的在 types，utils 从 server-only 的 matrixService 做 type import） |
| B2 | 绿 | 20 | — | 16/16 | R3 | 5 / 5 / 4 / 4 / 4 / 5 = 27 | 0 / 0 / 1 / 1（minor = `PrioritiesPageProps` 的命名和位置和 `DumpPageData` / `ProjectsPageData` 不一致；nit = fixture helper 的名字） |
| B3 | 绿 | 20 | — | 16/16 | R6 | 5 / 4 / 5 / 4 / 4 / 5 = 27 | 0 / 0 / 2 / 2（minor = dump 类型重复声明；验证步骤没记录在 commit 里；nit = 内联闭包、单字母 `t`） |

- 六个 diff 的 props 全部落在 spike 的目标上（QuadrantCell 2、MatrixTaskCard 2、MoveToPopover 1、MoveToRows 2、MobileMoveToSheet 2、MobileMoveToPanel 1、DumpComposer 0、DumpFeed 3、MobileBacklogCard 1），feature component 都没有 callback prop，三页 context 的写法和 Projects 一致，没有发现行为 bug。
- 清单上唯一反复出现的分歧是 spike 要不要归档：A2、B2、B3 归档并改了链接，A1、B1 故意留在原地（都说等 Q9 的结果写进去再归档，A1 还在 tracker 加了一条），A3 没归档也没解释。所有 run 都删掉了 tracker 里 Q9 那条 "start here"（A2、A3 连父条目一起删了）；A2、B3 顺手改了 experiment 文件里的链接（没打开读）。
- 盲审：六份都没有 blocker；correctness 和 readability 六个都是 5，conventions 和 scope 六个都是 4；差别只在 spec（只有 B2 拿到 5）和 consistency（A 5 / 5 / 5，B 4 / 4 / 5：B1、B2 被指出 Priorities 的页面数据类型和另两页放得不一样，正是 spike 担心的"并行 agent 各自做隐含决定"，程度很轻）。代码缺陷的类型两组一样：手写而不是从 action 推导的类型、重复的常量、命名。
- 盲审的 README 缺陷（"没有 2026-10-26 的 Update Log"、"Current State 还写着 screen components"）六份都有，是 scrub 的产物（评审看到的 README 是 base 的），上表已剔除；六个 spec / scope 的 4 分里有一部分是这个产物压出来的，组间仍可比。
- 评审 session 的审计：没有一个调用 GitHub 工具或访问别的分支；唯一越界的是六个都先跑了 `git log --oneline -3`，看到了 HEAD~2 的标题（孤儿历史里不存在，无信息）。每份评审 $3.9–4.2，21–29 次工具调用，4–8 min。

## 分析

**并行段为什么没赢（算术）。** 并行能省的上限是"三页之和减最慢一页"：A 组三页串行 7.5 min，最慢的 Priorities 3.6–4.3 min，最多省 3.5–4 min。并行付出的固定成本实测：

- setup 挤上关键路径 2.2–5.6 min：B 的 prompt 要求 agent 从主 checkout 复制 `.env.local` 和生成的 Prisma client，主 session 只能等 setup 跑完再派人；A 组三个都把 setup 扔后台，立刻开始写 Board，写完两页 setup 才结束。
- agent 冷启动 1.2–2 min / 页：每个 agent 重读 AGENTS.md、50 KB 的 spike 和 Projects 参考实现，再各自跑一遍 format、lint、typecheck、knip、unit。同一页 Priorities，A 用 3.6–4.3 min，B 的 agent 用 4.8–6.2 min。
- 派发（写三份 brief）约 0.8 min；合并加解冲突 0.2–1.2 min。

固定成本 4–9 min 大于可省的 3.5–4 min，净亏 1–4 min。这是"任务太小"的定量形式：每页只值 2–4 min 的工作，摊不掉并行的开销。

**Prompt 的责任有两处，都不是"不够细"而是细错了方向。** 对质量，spec 足够精确：六个实现到文件和 props 数量都和 spike 一致。对时间：一是强制等 setup（其实 worktree agent 只跑不碰数据库的检查，`npm install` 一结束就能派，数据库在后台起）；二是 deliverables 列了"每页的点击检查"却没给脚本，六个 run 全都自己手写 Playwright 脚本，顺的 5 min，不顺的 20 min。两条改掉，B 大约省 2–5 min，还是追不上 A。

**协调吃掉了主 session 的能力。** B 的 main session 的模型调用次数和 A 做完全部实现一样多，花在写 brief、等待、被 stop hook 打断、合并、解冲突上；再加每个 run 3–5 次 worktree 守卫拒绝复合命令、1–4 次 stop hook 拦截、一次同样位置的冲突。单项都小，加起来就是上面的固定成本。

**验证尾巴才是时间的大头，两种流程里都是串行的。** 下限固定：npm test 约 1 min、e2e 2 min、ui-verifier 2 min、文档 1–2 min，加 CI 3 min。A 组把检查放后台、ui-verifier 和自己的脚本并行；B1 则是脚本调完才派 ui-verifier。把点击脚本放进仓库是最大的一个杠杆。

## 建议合并

六个 PR 都可以合并。清单 20 / 20 的是 A2（#88）、B2（#87）、B3（#90）；其中盲审最好的是 **B2（PR #87）**：spec 唯一的 5 分，剔除 README 产物后只剩 1 个 minor（`PrioritiesPageProps` 的命名和位置）和 1 个 nit。**A2（PR #88）** 几乎等价：3 个 nit，consistency 5（类型都放在 `src/types/`），但 AGENTS.md:115 的 Bad 例子没跟着改名。更看重三页类型放置的一致性就选 A2。两者都已把 spike 归档。

## 方法上的教训

- transcript 的 assistant 事件里 `output_tokens` 只是 `message_start` 的占位值；真实用量在 `result` 事件和 session 汇总里。
- `create_session` 不带 effort；要控制 effort 得用环境变量 `CLAUDE_CODE_EFFORT_LEVEL` 或仓库的 `.claude/settings.json`。
- 子 session 的 Agent 工具结果只是"已启动"的 ack，subagent 的 `<usage>` 在之后的 task-notification 里（有一个只在 system 类事件里）；其中 `subagent_tokens` 约等于该 agent 最大的一次请求，不是累计。
- 并行的 subagent 共享 scratchpad，会互相覆盖同名脚本；给每个 agent 自己的工作目录。
- 主 session 机器上，由工具调用启动的 dockerd 会随调用退出；行为检查前先探测本地栈。冷启动的 dev server 第一次加载会让 dnd 的键盘拖动检查误报，脚本先预热页面。
- 评审的干净 context 靠 scrub 过的孤儿分支做到；run 自己写的 Update Log、commit message、分支名、PR 评审都碰不到。代价是评审会把 README 的缺失算成缺陷，六份一样，报告里剔除即可。
- 定时任务最小一小时；额度耗尽的恢复靠 `rate_limit_info.resetsAt` 的一次性唤醒。这次六个 run 和六份评审都在 `ccr_promotional` 额度内，没有触发。

## 附录

- Session：A1 `session_012M8H43y3oj7psRRLHhj21U`、B1 `session_01KFYnghdA1N25sHNzYPX42D`、A2 `session_01WGKCxBYSSCFXDxnASUdCK9`、B2 `session_01X9Nswd3S1vzCmEWcahELgF`、A3 `session_01N2yA3imymopPM8JWdiChJE`、B3 `session_01RFFR1nMwZYViRNMpkjJcbo`；评审 R1–R6 的 session 见归档的 `data/controller-log.md`。
- PR：A1 #85、A3 #86、B2 #87、A2 #88、B1 #89、B3 #90；盲审分支 `experiment/review-R1`–`R6`（base commit `6765018`，分支已删，review commit 见归档的 `data/controller-log.md`）。
- 数据文件（都在 [`archive/try1`](https://github.com/Marsuu1994/mars-workbench-lab-try2/tree/archive/try1/experiments/page-structure-parallel/try1)）：`data/transcript-<run>.json`（每个 run 的 usage、timeline、process）、`data/checklist-<run>.md`、`data/review-R<n>.json` / `.md`、`data/reviews-summary.json`（含评审审计）、`data/behavior/`（每个分支的 16 项日志，`baseline-main-*` 是 main 上的基线）、`data/blind-map.json`。
- 实验本身的花费：六个 run $47.18，六份评审 $24.31；主 session 和它的 subagent 不单独计费。
