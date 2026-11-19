# page-structure-parallel · try1 — 同一个三页重构，主 session 串行做和开三个 worktree subagent 并行做，时间、token 和质量差多少

**Status: executed 2026-10-26** · 来源：`design/spike/component-structure.md` 的 Q9（协议原文 `design/spike/component-structure-experiment.md`）· 完整协议、prompt、脚本和数据：lab 仓库 [`archive/try1`](https://github.com/Marsuu1994/mars-workbench-lab-try2/tree/archive/try1/experiments/page-structure-parallel/try1)

> 这一版是 2026-10-31 按现行模板从完整协议浓缩的高层版，只取当时协议里有的内容；当时还没有"预算和角色"这一节。try1 在主仓库里跑，早于 lab 仓库的约定。

## 问题

同一件 well-defined 的工作，主 session 自己一页一页做（A，串行），和主 session 开三个 worktree subagent 各做一页再合并（B，并行），在 wall time、token / 成本和完成质量上差多少。答案决定 Phase 2 的新页面以及以后类似的多块任务默认用哪种流程。没有预注册假设（try2 起才有）。

## 任务

按已决定的 spike（`design/spike/component-structure.md` Part 1：前提、规则 1–7、每页的改动计划、Q1–Q8 的决定）把 Board、Priorities、Dump 三页搬到页面结构；Plan 不动，auth、settings、app shell 不在范围；Projects 页是参考实现。交付物：一个分支，一页一个 commit 加一个文档 commit；Design Console 全部 tab 可渲染；仓库规则要求的文档；push 前检查、e2e、每页点击检查、Board 的 `ui-verifier`；一个 ready-for-review 的 PR，带 "Judgment calls"。

起点：PR #83 合并后的 `main`，commit `1ae70f7f70dfe57a6eeee6e33032db8832e9f5a4`。

## 做法

六份 prompt 逐字相同，只有分支名、PR 标题里的 run 编号和最后一段 workflow 不同。共用部分还规定：没人回答问题、判断写进 "Judgment calls"；不合并、不碰别的分支；PR 开好且 CI 绿即结束；仓库里任何地方不得描述工作怎么组织（保护盲审）。

**A（串行）**

```text
Do the three pages yourself in this session, one after another: Board, then Dump, then Priorities (the spike's serial order). Don't delegate the implementation to subagents; the only subagent you may use is `ui-verifier`, for the Board browser check.
```

**B（并行）**

```text
Follow the spike's parallel procedure (Part 1 › 并行执行 › 如果并行，流程是). Spawn three general-purpose subagents at once, one per page (Board, Priorities, Dump), each with `isolation: "worktree"`. Brief each one with its page's section of the spike, AGENTS.md › Layers › Page structure and the Projects page as the reference. Each subagent: prepares its worktree by hard-linking node_modules and copying .env.local and src/generated from the main checkout; changes only code and the Design Console; runs format, lint, typecheck, knip and test:unit; commits on its own branch; and reports which shared files it touched. Then merge the three branches into your branch, resolve the conflicts, and run npm test, the e2e suite, the click-through checks and the Board `ui-verifier` check yourself. Write the docs and push. Besides these three, the only subagent you may use is `ui-verifier`.
```

## 组数和隔离

- 每组 3 次：A1–A3、B1–B3。每个 run 是主 session 用 `create_session` 起的独立 session，自己的容器、Docker、本地 Supabase；共享的只有 GitHub 仓库、Actions 队列、Vercel preview 和模型服务。
- run 用 `claude-opus-5-5`，CLI 默认 effort（`create_session` 没有 effort 参数）；评审用 `claude-fable-5-1`，默认 effort。
- 六个 run 一次批量创建（A1、B1、A2、B2、A3、B3，4 秒内）；主 session 只观察，不碰任何 run 的分支。

## 测量

| 维度 | 指标 | 来源 |
| --- | --- | --- |
| 时间 | 创建 → 三页 commit 写完 → 第一次 push → PR 开出 → CI 全绿 → session idle；setup 时长、CI 等待单独记 | transcript 时间戳、GitHub |
| Token / 成本 | input、cache write、cache read、output、`cost_usd`；请求次数；context 峰值；B 的每个 subagent 单独列 | `get_session` 的 `usage`；transcript 拆分 main / subagent |
| 过程 | 工具调用、Bash、push、commit、工具错误、合并冲突、stop hook 拦截、`ui-verifier` 判定 | transcript |

## 质量判定

- **CI**：第一次 push 是否全绿，红了几次。
- **清单**：20 条，每个 diff 由一个只读 agent 逐条判定 ✓ / ~ / ✗（Board 5 条、Priorities 7 条、Dump 3 条、整体 5 条，覆盖改名、context、adapter、console、callback prop、一致性、范围和文档）。
- **行为**：三页 16 项点击检查，每个分支串行跑，断言乐观更新和刷新后的状态。
- **盲审**：每个结果一份，6 项 1–5 分（correctness、spec、consistency、conventions、scope、readability）加缺陷列表。评审看的是孤儿两 commit 分支：起点树和 run 的 head 树都 scrub 掉实验痕迹，README 换成起点的；评审不能用 GitHub 工具、不能看别的分支和历史。R 编号到 run 的映射随机，报告写完前不公开。

## 和来源协议的差异

- Run prompt 多一条规则：仓库里任何地方不得描述工作怎么组织。
- 盲审改看 scrub 过的孤儿分支；代价是评审会把"没有 Update Log"当缺陷，六份都有，报告里剔除。
- 检查节奏用一次性检查加每小时心跳（平台最小间隔一小时）；controller 状态镜像到一个分支。
