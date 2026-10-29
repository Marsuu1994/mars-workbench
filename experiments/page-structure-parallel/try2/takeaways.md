# page-structure-parallel · try2 — takeaways

**2026-10-27 · try2 付出代价学到的事，按发生顺序记；run 的数据和结论在 `report.md`。** 第一件：收数据阶段把账号的五小时用量窗口两次用完，盲审中途暂停。第二件：导出的 patch 把归档 PR 撑到 3.3 万行。后两节是暂停期间 owner 问到的两个问题：中途改协议的边界，暂停对结果的影响。

## 1 · 用量窗口被耗尽

### 发生了什么

| 五小时窗口（UTC） | 里面跑了什么 | 结果 |
| --- | --- | --- |
| 00:50–05:50 | 主 session 的准备（起点分支、prompt、基线检查）；05:14–05:35 十个 run（`claude-opus-5-5`，合计 $78、cache read 约 178M）；05:36 起 21 个 subagent 同时收数据 | 05:46 撞限，离自然重置差 4 分钟 |
| 05:50–10:50 | 05:52–05:58 恢复 16 个 subagent（`claude-fable-5-1`，effort 继承主 session 的 max）；05:54 十个评审 session 同时起（fable，high）；再加导出 PR 描述的 subagent 和主 session 自己 | 05:58–06:05 所有请求被拒，窗口约 9 分钟用完；九个评审 session 中途 failed，清单审计 0/10、transcript 8/10 |

### 为什么

- **一个窗口，所有人分。** 主 session、run、评审 session、subagent 的用量都算进同一个 `five_hour` 窗口（`get_session` › `rate_limit_info.rateLimitType`）。try1 的所有 session 都在 `ccr_promotional` 上，没算进套餐，所以 try1 没遇到。
- **并发 × 模型 × effort。** 27 个 fable 工作单元同时跑。Agent tool 起的 subagent 继承主 session 的 effort（max），每个 context 150–210k、20–40 次请求、每次重读整个 context，并不比主 session 便宜。
- **主 session 的 context。** 46 万 token，每次工具往返重读一遍；20 份 prompt 逐字作为工具参数发出，又是约 10 万 output token。04:54→11:18 主 session 自己 +$95.6、output +78 万、cache read +33.6M。
- **判断失误。** 05:46 刚撞过限，05:52 还是把 16 个 subagent 和 10 个评审一起放出去，理由是"评审是关键路径、subagent 便宜"。

### 各部分的用量

| 部分 | 数量 | 单个 | 合计 |
| --- | --- | --- | --- |
| run（opus） | 10 | $5.9–11.3 | $78、cache read 约 178M；和主 session 一起装满了第一个窗口 |
| 评审 session（fable，high） | 10 | 跑了 4–5 分钟就被拒，已 $2.7–4.2、cache read 1.6–3.4M（try1 一份完整评审 $3.9–4.2、4–8 分钟） | 约 $33、22M cache read |
| transcript subagent（fable，max） | 10 | context 150–210k、cache read 3–8M | 30–80M cache read；清单 subagent 的没拿到数 |
| 主 session | 1 | context 46 万 | 收数据阶段每次往返 0.46M cache read |

### 下次怎么做

1. **按窗口排阶段。** 一个窗口装得下十个 run 加主 session，装不下紧接着的收数据。run 结束后看 `rate_limit_info.resetsAt`，收数据和盲审从下一个窗口开始；要起的东西超过窗口剩余就等，不要边撞边恢复。
2. **评审单独占一个窗口的开头。** 十份完整评审约 $40、25–30M cache read，十个并发本身放得下；同一时间不起 subagent。
3. **收数据串行、机械的部分用脚本。** 一次 2–3 个 subagent；transcript 页是 JSON，usage、timeline、process 用脚本算，只把失败标注交给模型；清单审计可以用更小的模型。subagent 的 effort 写进 instruction（降不降、降到多少由 owner 定），不靠继承。
4. **主 session 瘦身。** 收数据前 compact；prompt 放文件里让 subagent 自己读，不作为工具参数发；状态镜像到分支，断了不怕。
5. **断点都能续。** subagent 用 `SendMessage` 续，评审 session 用 `send_message` 续，context 都还在；被打断不等于重做。

## 2 · 归档 PR 的体积

- PR #91 新增 32,694 行，其中 26,628 行（81%）是 `try2/data/patches/`：十个 run × 4 个 commit 的 `git format-patch`。每个 run 的重构改 51 个文件、692 加 540 减，四个 patch 约 2,550 行。其余：try1 的测量数据 4,313 行（transcript 汇总 2,674、评审 1,160、清单 358），try1 的协议、报告、prompt 和脚本 755，try2 的 prompt 483，`_tools/` 209。
- 导出是 instruction 第 6 步要求的（lab 仓库删掉后 run 的分支和 PR 一起消失），但和 experiments README 的 Size 规则冲突：`data/` 只放加工过的测量，不放原始材料。写协议时没算这一步的体积。
- 对 limit 的影响：放在仓库里不花 token，只有被读到才算。patch 共 1.19 MB，约 30–36 万 token；哪个 session 把整个 PR diff 读进来（`git diff main...`、GitHub 工具的 `get_diff` / `get_files`、对 #91 跑 `/code-review`）就一次性进 context，之后每次请求都重读，100 次请求约 30M cache read，相当于一个 run 的用量。全仓库搜索会多出十份副本的命中（这个分支上搜 `PrioritiesPageContext`：`src/` 0 个文件，`experiments/` 35 个）。实验内部碰不到：起点树没有 `experiments/`，评审分支把它 scrub 掉；仓库也没有自动读 diff 的 bot，lint、format、knip 已排除 `experiments/`。
- 可选处理（待 owner 定）：去掉 patch、每个 run 留 52 行 diffstat、lab 仓库归档而不删；去掉 patch、十个 run 分支推到主仓库；只留推荐 run 的四个 patch；保持现状并在仓库根加 `.ignore`（`experiments/*/*/data/patches/`）让 Grep 工具跳过。
- 还会进来的测量数据约 1 万行（十份 transcript 汇总约 6,900、清单约 600、评审约 2,000），不管 patch 怎么处理都有。

## 3 · 中途改协议的边界

- 不能改：问题、任务和起点、两组 prompt 的原文、run 数、测量定义、H1–H4 和判定规则、清单原文、行为检查、评审 prompt 和 scrub 规则。run 和评审已经拿着这些跑过，事后改等于改分析规则。
- 可以改、不影响任何数字的定义：导出方式、lab 仓库删还是归档、收数据怎么执行（脚本、串行、subagent 的模型和 effort）、评审的排期。
- 一致性：清单审计十份用同一个模型和 effort；transcript 的失败标注 8/10 是 fable subagent 做的，B4、B5 用同样的 agent 续。
- 记法：改动写进 instruction 并在 Status 行注明时间和原因，report 的"方法上的教训"再说一遍，下一轮从改过的协议起。

## 4 · 暂停对结果的影响

- 两次撞限都没碰到 run：十个 run session 都 completed，最后活动 05:30–05:38，`rate_limit_info.resetsAt` 都是 05:50（第一个窗口）；B5 的四个 result 事件全是 success。所有 session idle 后重拉的 usage 是最终值：B5 从 $9.16 修正为 $9.39（首检后多了一轮等 CI 的 turn），A 均值 $6.29（5.93–6.66）、B $9.39（8.22–11.26），1.49 倍。
- 不受影响：T_pr、T_green、T_pages（时间戳已记录，transcript 事件在服务端不过期）、成本、行为检查（暂停前 10/10 都 16/16）、B 组流程合规、清单审计（没开始，diff 冻结在分支和 patch 里）。
- 受影响的只有盲审：九个 session 跑了 4–5 分钟被打断，R4 跑完。两种处理，输入（review 分支、prompt）都不变。续跑：`send_message` 接着做，每个约 $1–2；中断对九个对称、盲图随机，不偏向哪一组，但续跑的评审和一口气跑完的可能不一样（容器已回收，重新 clone、重读文件），报告要注明。重跑：新 session 从头，每个约 $4，共 $36–40，一个窗口 5–8 分钟，记录干净。倾向重跑九个、R4 保留。
- 同一时段 owner 自己 05:45 起的一个 session 06:00 也 failed，同一个窗口。
- 决定（10-29）：try2 跑完即收口，不重跑 run；盲审由 code review agent 或 Opus 评审 session 做；page structure 不再开新 try（T_pages 已算出的 8 个 run：A 7.8 对 B 8.8 min，并行仍慢）。
