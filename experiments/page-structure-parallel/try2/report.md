# page-structure-parallel · try2 — 报告

**执行 2026-10-27（十个 run）、2026-10-31（盲审、清单、报告）** · 协议：`instruction.md` · Lab 仓库：[`mars-workbench-lab-try2`](https://github.com/Marsuu1994/mars-workbench-lab-try2/tree/controller/try2)（`controller/try2` 分支）

> 叙述用中文；run 编号、指标名、代码标识保留英文。

## 结论

1. **串行更快，判定规则落在"这个规模的任务不再测并行"。** 去掉 try1 的两项干扰（setup 压关键路径、自写点击脚本）之后，三页写完 A 7.8 min（7.3–8.5）、B 9.2 min（8.3–10.4），H1 不成立；到 PR 开出 A 13.8 min（12.4–15.2）、B 17.2 min（15.4–19.2），B 是 A 的 1.25 倍，H2（≤ 0.85 倍）不成立。五个 B 全部慢于五个 A（T_pr 的 Mann–Whitney 双侧 p ≈ 0.008）。
2. **并行输在冷启动：一个 agent 只做最大的那页，就和一个 session 做完三页一样久。** Priorities agent 从启动到交回 6.1–8.4 min；A 组从创建到三页写完（含 setup 和读文档）7.3–8.5 min。B 的关键路径 = 派出前 1.4–2.1 min + Priorities agent + 合并 0.1–1.1 min，没有可省的余地。
3. **钱是 1.49 倍（H3 成立）。** A 均值 $6.29（5.93–6.66），B $9.39（8.22–11.26）；B 的模型调用 144–192 次对 A 的 80–97 次，B 的 main 自己 44–53 次。
4. **质量十个都够合并，组间分不出来（H4 成立）。** CI 十个第一次 push 就绿；行为检查十个 16 / 16、0 console error；清单 A 20 / 20 / 20 / 19 / 19，B 19 / 19 / 19 / 19 / 19；盲审 A 均值 28.2、B 27.4（满分 30），consistency A 4.6、B 4.4，没有 blocker。仅有的差别几乎都来自一件事：spike 归不归档（A1–A3 归档，另外七个没有）。
5. **十个实现反复出同样的几个缺陷，根子在规则没写到，不在执行方式。** AGENTS.md 里一个旧组件名十个都漏改，手写 action 返回类型七个，页面数据类型的命名和位置各做各的；这些 CI 抓不到，规则也没说，所以每个实现各自猜一遍。见"分析 › 反复出现的问题"。
6. **建议**：合并 A1（lab PR #1：清单 20 / 20、盲审 29 / 30、缺陷最少），移到主仓库时顺手修掉它身上的三个反复缺陷；反复出现的问题按表里的修法变成规则和工具；page structure 收口，1b 换更大块的任务再测并行。具体步骤见"下一步"。

## 数据

### 每个 run

时间是从 session 创建算起的分钟数；盲审标签在评审完成后揭开。

| Run | T_pages | T_pr | T_green | cost | 调用（main） | context 峰值 | 清单 | 行为 | 盲审（标签） | 盲审分 c / s / k / v / p / r = 总 | 缺陷 major / minor / nit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | 7.8 | 12.4 | 15.4 | $6.66 | 97（83） | 273k | 20 | 16/16 | R2 | 5 / 5 / 5 / 4 / 5 / 5 = 29 | 0 / 1 / 3 |
| A2 | 7.8 | 15.1 | 18.6 | $6.45 | 90（74） | 278k | 20 | 16/16 | R8 | 5 / 5 / 5 / 4 / 5 / 5 = 29 | 0 / 2 / 3 |
| A3 | 8.5 | 15.2 | 18.2 | $5.93 | 80（69） | 271k | 20 | 16/16 | R4 | 5 / 5 / 4 / 5 / 5 / 5 = 29 | 0 / 2 / 3 |
| A4 | 7.3 | 12.4 | 15.3 | $5.95 | 81（66） | 275k | 19 | 16/16 | R7 | 5 / 4 / 4 / 4 / 4 / 5 = 26 | 1 / 2 / 3 |
| A5 | 7.5 | 13.7 | 16.5 | $6.48 | 86（73） | 283k | 19 | 16/16 | R9 | 5 / 4 / 5 / 5 / 4 / 5 = 28 | 0 / 1 / 4 |
| B1 | 8.4 | 17.0 | 20.2 | $8.37 | 150（45） | 208k | 19 | 16/16 | R5 | 5 / 4 / 4 / 5 / 4 / 5 = 27 | 0 / 2 / 3 |
| B2 | 8.3 | 15.4 | 18.5 | $8.22 | 144（53） | 190k | 19 | 16/16 | R1 | 5 / 4 / 5 / 4 / 5 / 5 = 28 | 1 / 1 / 2 |
| B3 | 9.7 | 17.4 | 20.6 | $9.72 | 178（46） | 188k | 19 | 16/16 | R10 | 5 / 5 / 5 / 4 / 4 / 5 = 28 | 0 / 1 / 2 |
| B4 | 9.3 | 16.9 | 20.1 | $11.26 | 192（46） | 209k | 19 | 16/16 | R3 | 5 / 4 / 4 / 4 / 4 / 5 = 26 | 1 / 1 / 4 |
| B5 | 10.4 | 19.2 | 23.5 | $9.39 | 168（44） | 207k | 19 | 16/16 | R6 | 5 / 5 / 4 / 4 / 5 / 5 = 28 | 0 / 1 / 5 |

盲审六项：c correctness、s spec、k consistency、v conventions、p scope、r readability。T_pages：A 是第三页的 commit，B 是第三次 cherry-pick 完成；T_green 只记录，不进判定（十个 PR 同时开，CI 排队是共用噪声）。

### 每组，和 try1 并排

| 指标 | try2 A | try2 B | B / A | try1 A | try1 B |
| --- | --- | --- | --- | --- | --- |
| T_pages 均值（范围） | 7.8（7.3–8.5） | 9.2（8.3–10.4） | 1.18 | 7.9 | 10.1 |
| T_pr 均值（范围） | 13.8（12.4–15.2） | 17.2（15.4–19.2） | 1.25 | 17.3（13.5–21.9） | 31.1（16.7–39.9） |
| T_green 均值 | 16.8 | 20.6 | 1.23 | — | — |
| 成本均值 | $6.29 | $9.39 | 1.49 | $6.66 | $9.07 |
| 模型调用（main） | 87（73） | 166（47） | 1.92 | 89（76） | 150（75） |
| 清单（/20） | 19.6 | 19.0 | | 19.3 | 19.7 |
| 盲审总分（/30） | 28.2 | 27.4 | | 27.0 | 26.7 |
| 盲审 consistency | 4.6 | 4.4 | | 5.0 | 4.3 |

- T_pages 的 Mann–Whitney 双侧 p ≈ 0.03（25 对里 A 快 23 对），T_pr 和成本都是 p ≈ 0.008（五个对五个完全分开）。判定按规则，p 值只作参考。
- try1 的盲审有 README 的 scrub 产物压分（报告里剔除了缺陷，分数没有改），try2 的 prompt 豁免了 README，两轮的分数不直接可比。
- 组内波动比 try1 小得多：T_pr 的范围从 8.4 min（A）和 23.2 min（B）缩到 2.8 和 3.8 min。点击检查脚本化去掉了 try1 最大的噪声源。

### B 的关键路径（分钟，从创建算起）

| Run | `setup --no-db` 结束 | 三个 agent 都已派出 | Board 交回 | Dump 交回 | Priorities 交回 | 三页合完 |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | 0.8 | 2.1 | 4.7 | 5.4 | 8.2 | 8.4 |
| B2 | 0.7 | 1.6 | 4.0 | 4.5 | 8.2 | 8.3 |
| B3 | 0.7 | 1.6 | 4.6 | 5.2 | 8.6 | 9.7 |
| B4 | 0.6 | 1.4 | 5.8 | 6.3 | 9.1 | 9.3 |
| B5 | 0.8 | 1.7 | 4.8 | 5.3 | 10.1 | 10.4 |

五个 B 都按协议在 `--no-db` 后 23–37 s 内一条消息里派出三个 agent，没有等数据库，main 等 agent 时没有自己写页面。agent 自己的用时（启动到交回）：Board 2.3–4.8 min，Dump 2.9–4.9，Priorities 6.1–8.4。Priorities 交回后 0.1–1.1 min 三页合完，中间是它的 cherry-pick 冲突（B3 最长，冲突在三个文件）。

## 分析

**为什么并行这次也赢不了。** 并行能省的上限是"三页之和减最大的一页"。但这里最大的一页不是一个固定的量：同一个 Priorities，串行 session 读过 AGENTS.md、spike 和 Projects 参考实现之后接着写，只要 3–4 min；交给一个冷启动的 agent，它要自己重读这些（50 KB 的 spike 加参考实现），在 worktree 里准备 node_modules 和生成的 client，自己跑一遍 format、lint、typecheck、knip、unit，于是要 6.1–8.4 min——和 A 从零做完三页（7.3–8.5 min）一样长。再加上派出前的 1.4–2.1 min（setup、写三份 brief），B 的三页写完不可能早于 A。try1 归因于 setup 和自写脚本的那部分固定成本这次确实去掉了（B 的 T_pages 从 10.1 降到 9.2，T_pr 从 31.1 降到 17.2），剩下的是并行本身的成本。

**写完之后 B 还多一段。** 三页写完到 PR 开出，A 4.6–7.3 min，B 7.1–8.8 min。B 要先合三个 commit、解共享文件的冲突（五个 B 全部在 `src/app/design/constants.ts` 和 `tabs/DomainTab.tsx` 冲突，和 try1 一样），B4、B5 的 main 还把 agent 放错地方的页面类型挪进 `src/types/` 再 amend，然后才从头跑 npm test、e2e、`check:clicks` 和 `ui-verifier`。

**并行的过程问题。** 按 arXiv 2610.10263 的四类标注，B 组每个 run 都有：shared state & merge（共享 Console 文件的冲突，B4 的三个 worktree 建在 lab 仓库的 `main` 而不是起点上，agent 各自挪回去）；task orchestration（负载不均，Priorities agent 是另两页的 1.6–2.7 倍，main 空等约 3–4 min）；global context（brief 没约定页面类型放哪、叫什么，三个 agent 各自决定；每个 agent 重读同样的文档）；execution governance（worktree 守卫仍拒绝复合命令，B3 2 次、B4 4 次；stop hook 在 B3、B5 各拦一次）。A 组只有零星几条，多是 execution governance（后台 setup 和 db:setup 的先后）。

**质量为什么分不出来。** spike 把每页的改名、context 字段、props 数量都写死了，十个实现在 props 上全部命中（QuadrantCell 9→2、MatrixTaskCard 9→2、MoveToPopover 4→1、MoveToRows 5→2、MobileMoveToSheet 6→2、MobileMoveToPanel 5→1、DumpComposer 2→0、DumpFeed 4→3、MobileBacklogCard 2→1），没有一个碰到 services、actions、DAL、Plan、auth 或 app shell，没有发现行为 bug。盲审 correctness 和 readability 十个都是 5，总分只在 26–29 之间；清单上唯一的分歧是第 19 条（spike 归档）。把归档这一条拿掉，十个实现在清单上一模一样。盲审也一样：归档了的 A1–A3 都是 29 分，没归档的七个是 26–28 分，spec 和 scope 上的 4 分大多就是因为没归档。

**spike 归档为什么是 3 比 7。** spike README 的生命周期说：完成实现的那个 PR 把 spike 移进 `archived/`。但这个 spike 里还挂着 Q9（就是这个实验本身），tracker 还链接着评估文件，于是七个 run 选择"等 Q9 的结果写进去再归档"，在 tracker 里加了一条。B 组五个全选了不归档，A 组两个：B 的 prompt 明说用 subagent，Q9 问的正是 subagent，可能让 B 更倾向于把 Q9 当成还没结束（推测，没有直接证据）。这是把实验问题写进产品 spike 的副作用，不是并行的质量问题；新的 `experiments/` 结构已经把实验问题挪出了 spike。

### 反复出现的问题

十个实现、十份盲审、十份清单里出现两次以上的问题，加上 try1 是否也有。"根因"一栏是为什么每个实现都会各自犯一遍。

| # | 问题 | 出现 | 根因 | 建议的修法 |
| --- | --- | --- | --- | --- |
| 1 | AGENTS.md:115 的 Bad 例子还写着已删掉的 `PriorityMatrixPage` | 10 / 10（try1 也有） | 改名时只 grep 了 `src/`；规则文件里引用的代码名字没有任何检查 | 合并时改掉；加一个检查脚本：AGENTS.md 和它索引的 README 里反引号包着的 PascalCase 名字必须在 `src/` 里存在（AGENTS.md › Adding a rule：能用工具查的规则进工具），或者放进 Step 13 quality sweep 的"docs vs code" |
| 2 | spike 没有归档 | 7 / 10（try1 3 / 6） | spike README 的生命周期和 spike 里挂着的实验问题 Q9 冲突 | 合并时归档 spike 和评估文件，把两轮的结论写进 Q9 的 Decision；spike README 补一句：spike 里和实现无关的未决问题移到 tracker，计划落地就归档（随 Docs split 的 `design/spike/` 一项一起改） |
| 3 | `DumpFeedResult` 手抄 `fetchDumpEntriesAction` 的返回类型 | 7 / 10 盲审（try1 两份） | 规则只说"相同的类型合成一个"，没说跨 action 边界的类型从哪来 | AGENTS.md › General 的 DRY 补一句：action 返回的形状从 action 推导（`Awaited<ReturnType<typeof action>>`）或在 `src/types/` 定义一次，两边共用；合并时改掉 |
| 4 | 页面数据类型的名字和位置各不相同：`*PageProps` 还是 `*PageData`（A4、B2），放 `types/` 还是 `utils/`（B1、B2；B4、B5 的 main 事后挪回），十个都在 `utils/` 从 `services/matrixService` 引用 `MatrixData`，五个的 `PrioritiesPageData` 还 `extends` 它，`types/` 和 `utils/` 反过来依赖 `services/` | 10 / 10 | spike 和 AGENTS.md › Page structure 写了 adapter 和 container，没写页面输入类型叫什么、放哪、从什么建；Projects 的做法（`ProjectsPageData` 在 `types/`，service 引用它）只是隐含的；并行时三个 agent 各自决定 | AGENTS.md › Page structure 补一句："页面的输入类型叫 `<Feature>PageData`，在 `src/types/<feature>.ts`，用 DAL 的行类型建，service 返回它"；合并时把 `MatrixData` 挪进 `src/types/` |
| 5 | 同类写法不一致：adapter 和 handler 有的 `const` 箭头有的 function 声明（5 份），Tailwind class 顺序不同（2 份），`useMemo` 有的留有的去（2 份） | 8 / 10 至少一条 nit | 没有规则，每种写法单看都对 | 机械的进工具：`prettier-plugin-tailwindcss` 排 class 顺序（Prettier 本来就管格式）；函数写法用 ESLint `func-style` 定一种；`useMemo` 在 React Compiler 下不需要，可以写进 Coding Conventions |
| 6 | 并行时共享的 Design Console 文件冲突（`design/constants.ts`、`tabs/DomainTab.tsx`） | B 5 / 5（try1 B 3 / 3） | 三页的 inert context 和 gallery fixture 都要加进同一个文件 | 只在并行时有关：brief 把共享文件划给 main，agent 只报告要加什么；或者把 Console 的 fixture 按 feature 拆文件（`constants.ts` 已经 700 多行） |
| 7 | desktop-only 的 Console tab 在 390 px 下跑 play step 会打开手机的 sheet | 6 个 run 在 PR 里提到，3 个 `ui-verifier` 因此超时重试 | 起点修了"找到两个同名按钮"，没修 tab 本身在窄屏下的行为 | tracker 记一条小 bug：desktop-only 的 tab 在手机宽度下不跑 play step（或不显示） |

1、3、4 是这次最值得做的：每一条都会在下一个"按 spike 改页面"的任务里再出现一次，而一句规则或一个脚本就能让它不再出现。5 是 nit 级，交给工具成本最低。2、6、7 是这个实验或这个任务特有的，合并时一次性处理掉。

## 方法上的教训

- **按窗口排阶段这次奏效。** 十份盲审在窗口重置后单独起，08:53 起、09:02 前全部交卷，合计 $41.19；收数据用 12 个 subagent、一次三个，整个窗口没有撞限。10-27 同样的工作和 21 个 subagent、10 个评审一起放出去，两个窗口在几分钟内耗尽。
- **单位成本，下一轮排预算用**（`cost_usd` 作代理；`rate_limit_info` 只给 status、类型和重置时间，看不到剩多少，所以只能按单位成本算）：Opus high 的 run 串行 $5.9–6.7、三个 worktree agent 的 $8.2–11.3；Fable high 的一份盲审 $3.6–4.7（cache read 2–4M、output 约 15k、约 7 min）；十份清单、两份 transcript 和评审收集一共 13 个 subagent，加 controller 约 $29。一个窗口装了约 $70 没有任何警告（10-31），另一个在 $100–110 左右耗尽（10-27）。下一轮的排法：owner 在满窗口时开始；run 一次全起；run 完 controller 的 context 超过约 200k 就先 compact，并在 `resetsAt` 后两分钟设一次性唤醒；重置后所有评审一次全起（每个候选一个，最多十个）；然后脚本收机械数据，判断类的 subagent 按估算分批，每批前再看一次 `rate_limit_info`。规则写在 lab 仓库的 `protocol/controller-notes.md`，随 `experiment-controller` skill 进主仓库。
- **盲审的分数分辨率不够。** 两轮 16 份评审，correctness 和 readability 全是 5，总分挤在 26–29。分数几乎只反映 spike 归没归档；真正有用的是缺陷清单——上面那张表全部来自它。对 Harness engineering › 3（code review agent）的含义：评审的价值在缺陷，不在打分；同一个缺陷在多个实现里出现，就该变成规则或工具，而不是每次再审一遍。
- **评审自己装依赖、跑全套检查。** 十份都跑了 `npm ci` 或 setup、lint、typecheck、knip、单测（R7 等安装等了 14 min），CI 早就跑过同样的东西；五份还为此建了 `.env.local`。下一轮的评审 prompt 应该写明不装依赖、不跑检查。
- **评审模型和 instruction 写的不同。** instruction 的"预算和角色"写的是 code review agent 或 Opus 评审；10-31 owner 定为沿用原协议的 `claude-fable-5-1`（和 try1 同一个裁判），十个候选同一个模型，组间比较不受影响。
- **subagent 产出的 JSON 结构不统一。** 十份 transcript 汇总是不同的 subagent 在两天里写的，同一个指标的键名各不相同，汇总时得逐个适配。usage、时间线、过程计数这类机械的部分应该用脚本算（`experiment-controller` skill 的脚本），模型只做失败标注。
- **effort 无法从事件里核实。** init 事件和 `get_session` 都没有 effort 字段；按起点的 `.claude/settings.json` 应为 high，未能验证。
- **容器是 Node 22**，`package.json` 要求 24：每个 run 都有 EBADENGINE 警告，没有影响结果。

## 下一步

1. **合并候选 A1。** 把 lab 仓库的 `claude/page-structure-try2-a1` 推到主仓库，合入当前 `main`（README 的 Update Log 已经删了，那条记录改写进 Current State；tracker 和 AGENTS.md 有小冲突），同一个 PR 里修掉反复出现的问题 1、3、4（AGENTS.md:115、`DumpFeedResult`、`MatrixData` 挪进 `src/types/`），归档 spike 和评估文件并写 Q9 的 Decision。备选 A2（lab PR #4）或 A3（#5），三个都是 20 / 20、29 / 30；try1 的 B2（#87）也等价，而且已经在主仓库里。
2. **起点的四个修正。** `check:clicks` 脚本、`.gitignore` 的 worktree 行、PlayRunner 的修正都随 A1 一起进 `main`；`.claude/settings.json` 的 `effortLevel: high` 会改变这个仓库里所有 session 的默认 effort，单独由 owner 决定，默认不带。
3. **反复出现的问题变成规则和工具**：上表 1、3、4 的规则句和检查脚本、5 的 Prettier 插件和 lint 规则、7 的 Console bug，记在 tracker 上，各自一个小 PR。
4. **收尾。** 关掉 try1 没选中的 PR（#85–#90）；归档 try2 的 20 个 run 和评审 session 以及 10-27 作废的评审 session；owner 把 lab 仓库归档。
5. **再往后。** `experiment-controller` skill 的 PR（tracker › Harness engineering › Setup），然后 1b（error framework）——块更大，冷启动的固定成本才有可能摊得开。

## 附录

都在 lab 仓库 `controller/try2` 分支：

| 内容 | 文件 |
| --- | --- |
| 每个 run 的 session、PR、head、成本、T_pr、T_green、CI | `data/sessions.json` |
| T_pages、usage、时间线、过程计数、失败标注 | `data/transcript-<run>.json` |
| 清单（20 条逐条判定和证据，props、范围外文件、类型位置） | `data/checklists/checklist-<run>.md` |
| 盲审原文、JSON、汇总和审计 | `data/reviews/`（`reviews-summary.json` 含审计） |
| 盲审标签到 run 的映射 | `data/blind-map.json` |
| 行为检查 | `experiment.md` › 阶段 4（十个分支 16 / 16，0 console error） |
| controller 日志、事故、决定 | `experiment.md` |
| 协议、prompt 模板、brief、scrub 规则、工具 | `protocol/`、`tools/` |

- Run session：A1 `session_01KCt6pJaBvNn7yvCqBdL9ib`、B1 `session_01KCt6pMxatw9JrN3TasCRUY`、A2 `session_01KCt6pNEEiysMZJhTNDRjPF`、B2 `session_01KCt6pMa91jhjUM2oez842a`、A3 `session_01KCt6pJr7csnx2HnTic3q2U`、B3 `session_01KCt6pLaQcffbbgWyRsYruK`、A4 `session_01KCt6pJKhmnyCUuHCYcfmPq`、B4 `session_01KCt6pJqa8KhamA3TH91m92`、A5 `session_01KCt6pK3LZBUahDFNY2DecX`、B5 `session_01KCt6pLLUiRAHZu45QycSRC`。评审 session 见 `data/reviews.json`（10-27 作废的十个在 `abandoned`）。
- PR（lab 仓库，base `experiment/base-try2` = `83ae5a4`）：A1 #1、A4 #2、A5 #3、A2 #4、A3 #5、B2 #6、B4 #7、B1 #8、B3 #9、B5 #10。盲审分支 `experiment/review-R1`–`R10`（base commit `c9784f40`）。
- 实验本身的花费：十个 run $78.43（A $31.47、B $46.96）；10-31 的十份盲审 $41.19；10-27 被打断的十份盲审约 $33。controller session 和它的 subagent 计在 controller session 自己的用量里，它同时做了 try1、try2 和别的工作，不单独拆分。
