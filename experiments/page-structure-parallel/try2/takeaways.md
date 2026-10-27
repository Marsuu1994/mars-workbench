# page-structure-parallel · try2 — takeaways

**2026-10-27 · 收数据阶段把账号的五小时用量窗口两次用完，盲审中途暂停。** 这页只记这一件事：发生了什么、为什么、下次怎么做。run 的数据和结论在 `report.md`。

## 发生了什么

| 五小时窗口（UTC） | 里面跑了什么 | 结果 |
| --- | --- | --- |
| 00:50–05:50 | 主 session 的准备（起点分支、prompt、基线检查）；05:14–05:35 十个 run（`claude-opus-5-5`，合计 $78、cache read 约 178M）；05:36 起 21 个 subagent 同时收数据 | 05:46 撞限，离自然重置差 4 分钟 |
| 05:50–10:50 | 05:52–05:58 恢复 16 个 subagent（`claude-fable-5-1`，effort 继承主 session 的 max）；05:54 十个评审 session 同时起（fable，high）；再加导出 PR 描述的 subagent 和主 session 自己 | 05:58–06:05 所有请求被拒，窗口约 9 分钟用完；九个评审 session 中途 failed，清单审计 0/10、transcript 8/10 |

## 为什么

- **一个窗口，所有人分。** 主 session、run、评审 session、subagent 的用量都算进同一个 `five_hour` 窗口（`get_session` › `rate_limit_info.rateLimitType`）。try1 的所有 session 都在 `ccr_promotional` 上，没算进套餐，所以 try1 没遇到。
- **并发 × 模型 × effort。** 27 个 fable 工作单元同时跑。Agent tool 起的 subagent 继承主 session 的 effort（max），每个 context 150–210k、20–40 次请求、每次重读整个 context，并不比主 session 便宜。
- **主 session 的 context。** 46 万 token，每次工具往返重读一遍；20 份 prompt 逐字作为工具参数发出，又是约 10 万 output token。04:54→11:18 主 session 自己 +$95.6、output +78 万、cache read +33.6M。
- **判断失误。** 05:46 刚撞过限，05:52 还是把 16 个 subagent 和 10 个评审一起放出去，理由是"评审是关键路径、subagent 便宜"。

## 各部分的用量

| 部分 | 数量 | 单个 | 合计 |
| --- | --- | --- | --- |
| run（opus） | 10 | $5.9–11.3 | $78、cache read 约 178M；和主 session 一起装满了第一个窗口 |
| 评审 session（fable，high） | 10 | 跑了 4–5 分钟就被拒，已 $2.7–4.2、cache read 1.6–3.4M（try1 一份完整评审 $3.9–4.2、4–8 分钟） | 约 $33、22M cache read |
| transcript subagent（fable，max） | 10 | context 150–210k、cache read 3–8M | 30–80M cache read；清单 subagent 的没拿到数 |
| 主 session | 1 | context 46 万 | 收数据阶段每次往返 0.46M cache read |

## 下次怎么做

1. **按窗口排阶段。** 一个窗口装得下十个 run 加主 session，装不下紧接着的收数据。run 结束后看 `rate_limit_info.resetsAt`，收数据和盲审从下一个窗口开始；要起的东西超过窗口剩余就等，不要边撞边恢复。
2. **评审单独占一个窗口的开头。** 十份完整评审约 $40、25–30M cache read，十个并发本身放得下；同一时间不起 subagent。
3. **收数据串行、机械的部分用脚本。** 一次 2–3 个 subagent；transcript 页是 JSON，usage、timeline、process 用脚本算，只把失败标注交给模型；清单审计可以用更小的模型。subagent 的 effort 写进 instruction（降不降、降到多少由 owner 定），不靠继承。
4. **主 session 瘦身。** 收数据前 compact；prompt 放文件里让 subagent 自己读，不作为工具参数发；状态镜像到分支，断了不怕。
5. **断点都能续。** subagent 用 `SendMessage` 续，评审 session 用 `send_message` 续，context 都还在；被打断不等于重做。
