# Spike: Public launch — 从自用工具到给别人用

**Status: draft** · 2026-10-25 · 发布的工作开始时改成 awaiting owner review · 回答 tracker 条目 *Milestone — Public launch*（Cross-cutting › High）· 来源：2026-10-25 和 owner 的讨论· 相关：`design/spike/week-model-phase2-pain-points.md`（draft，时间预算、上限、lifecycle）、PR #33 的 daily rhythm spike、PR #32 的 error-handling spike、`design/mockup/mockup-week-model-phase2.html`

> 语言约定：叙述用中文；产品名词、状态、代码标识保留英文（habit / project / step / one-off / backlog、`KANBAN_TZ` …），和代码、mockup、tracker 一一对应。

## Trigger · 起因

Owner 考虑把 app 公开给别人用：app 已经接近心里的 target state，计划是先做完还缺的部分，再慢慢在各个平台分享。原始的想法（owner 的原话整理）：

1. **App 本身**：Quality gate 停在 component structure 和 error handling，然后做到 target state：
   1. task template 迁移成 habit
   2. Plan 页改版
   3. Board 零摩擦（新想法）：board 就是今天，DnD 太麻烦，直接点卡片完成
   4. Daily rhythm flow（大概带 daily summary）
   5. 重新定义 task size（可能是新的东西）
2. **域名**：`*.vercel.app` 不行，要换。
3. **Branding**：从 Mars Workbench 换成更好的名字，logo 也要重新选或者设计。
4. **推广**：在哪推？ADHD 的 Reddit 社区？Discord？这一块完全不了解，要不要找人咨询？

这份 spike 把讨论归档成一份文档：缺什么、免费非商用能少做什么、怎么提速、怎么拆成 project、按什么顺序、大概多久。它是 **draft**，不排 PR；Quality gate 收尾之后，发布的工作开始时再进 review。

---

## 现状 · 代码里离「给别人用」还差什么

App 现在默认只有 owner 一个用户。2026-10-25 在代码里核对过的：

| 缺口 | 现状 | 影响 |
| --- | --- | --- |
| 时区写死 | `src/utils/dateUtils.ts` 的 `KANBAN_TZ = 'America/Los_Angeles'`，5 个文件里 16 处；`src/lib/db/tasks.ts` 按它算「今天 done 了多少」（`done_at AT TIME ZONE`） | 太平洋时区以外的用户：habit 在错的时间 expire，今天的统计算错，周边界错位。也是 daily rhythm 通知的前提 |
| 没有落地页 | `src/app/page.tsx` 直接 `redirect('/kanban')` | 从外部链接进来只看到一个 Google 登录按钮 |
| 没有隐私政策、条款 | 没有对应的页面 | 见下面「外部约束」 |
| 删号、导出 | 没有入口 | 同上 |
| 出错没人知道 | 没有错误监控、使用统计、反馈入口；Step 14 之前很多写入失败只是静默 rollback | 陌生用户遇到 bug 大多直接走 |
| Claude 接入 | 规划靠用户自己在 Claude 里加 custom connector（`/api/mcp`） | 对不熟 MCP 的人是好几步；没有 Claude 的用户只剩手动的 plan form |
| 品牌写在很多地方 | `en.json`、PWA manifest、`src/mcp/constants.ts`、MCP 的 guide 和 tool descriptions、`AppSidebar`、`BrandIcon`，以及视觉语言（Mission Control HUD、`mars-dark` / `mars-light`、「dawn on Mars」） | 改名是一轮全站的改动；视觉方向变不变决定要不要重画 mockup |
| 域名和 connector 绑在一起 | Connector URL 和 protected-resource 的 `resource` 跟着域名走（tracker *Custom domain*） | 每换一次域名，所有已经连上的用户都要重新添加 connector |

**一个好消息**：app 本身不调用任何 LLM（依赖里没有 Anthropic / OpenAI 的 SDK），Claude 跑在用户自己的账号上。免费提供的边际成本只有 Vercel 和 Supabase。

## 外部约束 · 2026-10-25 查到的事实

以官方页面为准，发布前再核对一遍。

| 约束 | 事实 | 条件 |
| --- | --- | --- |
| **GDPR** | 第 3(2)(a) 条：向欧盟的人提供服务「不论是否要求付费」都适用；Recital 23 直接拿免费 app 举例。「纯个人或家庭活动」的豁免只管个人自己处理数据，不管向公众提供服务 | 是否面向欧盟按个案判断。**不要求**自助的删号或导出按钮：权利请求在一个月内回复处理即可 |
| **CCPA（加州）** | 只管达到门槛的营利企业（年收入约 2500 万美元以上等） | 免费的个人项目不在其中 |
| **Google 登录** | API Services User Data Policy 覆盖 Sign-In，要求有隐私政策；做 brand verification 时，隐私政策要放在首页同一个域名下，并从首页和 consent screen 链接过去 | 只用 openid / email / profile 时，不做 verification 也没有 100 人上限；代价是登录页不显示 app 名和 logo |
| **Vercel Hobby** | 只允许非商业的个人使用；收款、卖东西、放广告都算商用，要升 Pro | 按现行 fair-use 页面，接受捐赠不算商用（旧版页面写的是相反的） |
| **Claude custom connector** | 所有套餐都能用，Free 只能加一个，功能还在 beta | 新用户要有 Claude 账号才能用 AI 规划 |
| **Reddit 的 ADHD 社区** | r/ADHD 有专门的 No Advertising / Self Promotion（Rule 8）；r/AutisticWithADHD 对推广直接永久封号，免费产品和招 beta 测试都算；r/adhd_college 允许自我推广，只要不算广告（产品收费或盈利，并且发帖人和它有利益关系） | 每个版单独读 sidebar；不少版可以先问 mod |
| **Show HN** | 规范是做出来、别人能直接试用的东西，最好没有注册之类的门槛 | Google 登录算一道门槛 |
| **宣传用语** | 面向 ADHD 群体时，医疗效果的说法（「治疗 ADHD」）会带来法规层面的风险 | 定位成效率工具就没有这个问题 |
| **起名** | 要查商标（比如 USPTO）、同名产品、域名能不能注册 | — |

Sources：[GDPR Article 3](https://gdpr-text.com/read/article-3/) · [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) · [Google verification requirements](https://support.google.com/cloud/answer/13464321) · [Google OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview) · [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) · [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) · [Claude: About custom connectors](https://support.claude.com/en/articles/11175166-about-custom-connectors) · r/ADHD、r/AutisticWithADHD、r/adhd_college 的规则页

## 免费、非商用能少做什么

前提：owner 托管、不收费、不放广告。

| 要求 | 免费之后 | 最低做法 |
| --- | --- | --- |
| 隐私政策 | **还要**（GDPR、Google） | 一页：收集什么（Google 的 email 和名字、用户的任务）、存在哪（Supabase、Vercel）、谁能看、怎么删（发邮件） |
| 删号、导出 | 不需要按钮 | 联系邮箱，加一个 `scripts/one-time/` 的手动脚本 |
| 服务条款 | 本来就不是法律要求 | 可以不做；作用是写明「按现状提供、不担保、可以随时停服」 |
| CCPA | 不适用 | — |
| Vercel | Hobby 就够 | — |
| Google brand verification | 可选 | 不做的话，登录页显示 Supabase 的项目域名 |
| 域名、品牌 | 可选 | `*.vercel.app` 能用；越晚换，要重新加 connector 的用户越多 |
| 监控、RLS、落地页 | 可选 | — |

**跟收不收费无关、跟别人能不能正常用有关的**：按用户时区算「今天」（3–5 天），connector 设置说明（1–2 天）。

**另一种结构：开源、用户自己部署。** 数据在用户自己的 Vercel 和 Supabase 上，owner 不是数据控制者，上面大部分要求转到部署的人身上。代价是每个用户都要配 Supabase、Google OAuth client 和 MCP，技术门槛很高（Q3）。

按「免费、owner 托管、最低限度」算，多用户就绪从 12–18 天降到 **5–10 天**：时区、隐私政策页、connector 说明，加一个可选的简单落地页。

---

## Target state 的 5 项：依赖关系

| # | 项目 | 已有的设计 | 依赖 |
| --- | --- | --- | --- |
| 1 | Template → habit | Pain-points spike 的痛点 3（lifecycle）、Phase 2 mockup 的 Habits 页 | 数据模型，最先 |
| 5 | Size 重新定义 | Pain-points spike 的痛点 1（每周时间预算，points → 小时）、痛点 2（上限） | 和 1 共用 `user_preferences`，一起做 |
| 2 | Plan 页改版 | Phase 2 mockup 的三步 Plan week（预算 → habits → projects） | 建在 1 和 5 上；1 去掉 Plan Mode 以后旧 plan form 就得改，所以紧跟着做 |
| 3 | Board = 今天 | 新想法，没有 spike 和 mockup | 会动 backlog 和周进度、Phase 2 的「Done 改成按天的日志」、habit 实例堆叠 |
| 4 | Daily rhythm | PR #33 的 spike，写在 Phase 1 之前，已经过时 | 和 3 是同一个「今天」的概念，合成一个 spike；通知要按用户时区 |

## 拆成 project：1 个 milestone = 现有的 Quality gate + 6 个新 project

按 app 自己的规则拆：每个 project 不超过 10 步，每步大约一个 PR 或一个 session，最大 XL（约 8 小时）。

### P0 · Quality gate 收尾（现有的 planner project）

Owner 定的顺序（2026-10-25）：component structure 已经开始做，排第一；quality sweep 留在 Quality gate 里，放在最后。编号跟 planner project 走。Shared server-action handler 移到上线之后。

1. Step 10 · component structure 和 config-driven modals（两个 PR，PR #83 已经在做）
2. Step 11 · error-handling plumbing（PR #32 的 spike）
3. Step 12 · code review agent（PR #82 的 spike）：harness 在 owner review 之前先跑它
4. Step 13 · agent harness（见下面「提速」）
5. Step 14 · 错误呈现：7 个子项每个都是一个规格清楚的 PR，适合拿来试 harness
6. Step 15 · 收尾
7. Step 16 · quality sweep：`/quality-sweep` skill 加两周一次的 Routine，只查 CI 查不了的

### P1 · Habits 和时间预算（target 1 + 5）

1. 定稿 pain-points spike（Q1–Q8）
2. 更新 Phase 2 mockup：Habits 页、lifecycle、预算条
3. 迁移：`status`（`ACTIVE` / `PAUSED` / `COMPLETED`）替换 `isArchived`
4. Habit 自带 cadence（每天 / 每周 N 次），去掉 Plan Mode
5. Template 改名为 habit（代码、copy、MCP）
6. Size 换成小时：LLM 给默认值，选择器可选，board 指标用小时
7. `user_preferences`：每周时间、focus 上限（service 层检查）
8. MCP 跟着改（status、capacity、limits、guide）
9. Habits · Projects 共用一个入口页
10. 收尾（docs、scenarios）

### P2 · Plan week（target 2）

1. 三步 Plan week 的 spike，定稿 mockup
2. Plan 页的数据拆分（loader 返回 inputs，container 加 adapter）
3. 第一步：预算
4. 第二步：habits
5. 第三步：projects 和 steps（包括上周没做完的 carry-over）
6. 重做 Review changes modal
7. 删掉旧 plan form（tracker 里「Edit Plan 会覆盖 Claude 改动」的 bug 一起消失）
8. 收尾

### P3 · Today（target 3 + 4）

1. Spike：board = 今天、点卡完成、DnD 留不留、backlog 和 Done 的新含义；PR #33 的 daily rhythm spike 合并进来改写
2. Mockup
3. 按用户时区算「今天」
4. Board 只显示今天，点卡完成
5. Backlog 和本周视图跟着调整（包括 habit 实例堆叠）
6. Open the day
7. Close the day 和 daily summary
8. Web push 订阅（service worker、VAPID）
9. 按用户时区定时发送
10. 收尾

### P4 · 品牌和域名

1. 想候选名字
2. 查商标、同名产品、域名
3. Logo 和视觉方向的 mockup
4. 买域名：接 Vercel，改 Supabase 的 Site URL 和 Redirect URLs，改 Google OAuth 的域名
5. 全站改名（`en.json`、manifest、图标、MCP server 名字和 guide）
6. 重新添加 connector，验证 MCP
7. （可选）Google brand verification

### P5 · 上线准备（免费、最低限度）

1. 隐私政策页和联系邮箱
2. 删号和导出的手动脚本
3. Connector 设置说明页
4. 用全新账号走一遍首次使用（空状态、建第一个 plan）
5. （可选）简单落地页
6. 小范围 beta，3–5 个人
7. 按 beta 反馈修一轮

### P6 · 发布

1. 列渠道清单，逐个读规则，需要的话先问 mod
2. 截图、demo GIF 或视频
3. 每个渠道写一版帖子草稿
4. 发布
5. 把反馈分拣进 tracker

## 顺序

**P0 → P1 → P2 → P3 → P5 → P6，P4 从一开始就并行。**

- **P0 先做**：Step 10 决定新页面怎么写，P1–P3 都是新页面。
- **P1 → P2 紧挨着**：P1 去掉 Plan Mode、改 habit cadence 以后，旧 plan form 就得改；紧接着做 P2，旧 form 直接删掉，省一次补丁。
- **P3 在 P2 后面**：技术上只依赖 P1，可以和 P2 对调（Q2）；但两个都是要 owner 拍板的设计类 project，同时做 review 负担翻倍。
- **P4 的 1–3 步现在就能开始**：主要是 owner 自己想，几乎不占开发时间。视觉方向变不变要在 P2、P3 画 mockup 之前定（Q1）；换域名要在 beta 之前，不然 beta 用户要重新加 connector。
- **P5 在 P3 后面**：时区在 P3 里；说明页和落地页的文案要用 P4 的新名字。
- **P6 的第 1 步随时可以做**：只是读规则。
- **Focus 上限**：app 的规则是 4 个 active project 已经很满。这几个加上 owner 其他在跟的 project 一起算，同时开着的开发类 project 大约 2 个：P0 + P4，然后 P1 + P4，依此类推。
- **上 planner 的时机**：P1–P6 要做的时候再一个个建到 planner 上，不提前建。

## 估时

依据仓库的节奏：Phase 1（新实体 + 卡片改版 + 新页面 + MCP）从 spike 到收尾大约两周，spike 改了 5 轮，代码 6 天、5 个 PR；Quality gate 每步 2–5 天，常常比预期大（Step 7 最后包括了测量和一次 Next 升级）。下面按「每天 4 小时、agent 写代码、owner 定方向和验收」估，没有 owner 过去时间分配的实测数据。

| 部分 | 第一版估计（天） | 免费最低限度 + harness（天） |
| --- | --- | --- |
| 规格清楚的：P0、多用户就绪、P4 的实现 | 25–38（P0 10–15、就绪 12–18、P4 3–5） | 9–15（就绪降到 5–10；并行加过夜跑，owner 只 review） |
| 设计类：P1、P2、P3 | 37–55（P1 12–18、P2 10–15、P3 15–22） | 30–45（草稿出得快，拍板的轮数不变） |
| P6 的素材 | 4–6 | 4–6 |
| **合计** | **66–99**（每周 7 天约 2.5–3.5 个月，每周 5 天约 3–4.5 个月） | **43–66**（每周 7 天约 1.5–2.5 个月，每周 5 天约 2–3 个月） |

不含想名字的时间，也不含后来加回 P0 的 quality sweep（Step 16）。最大的不确定性：P3（没有 spike 和 mockup）、起名、owner review 并行 PR 的真实速度。

## 提速 · Agent harness

想法：Claude 在无人看守的情况下做一队规格清楚的任务（并行、过夜），owner 每天的时间变成在 Vercel preview 上 review 和验收。具体形状记在 tracker 的 Quality gate Step 13，owner 还在想。

- **上限在拍板，不在写代码**：提交历史里最慢的是要 owner 决定的环节（spike 的多轮 review、mockup 审批、需要测量的调查）。Harness 能加速规格清楚的任务；设计类任务只能更快地拿到 spike 和 mockup 选项。
- **吞吐等于 owner 的 review 速度**：同时开着的 PR 不超过 2–3 个，不然队列越积越多。
- **基础已经有了**：CI 有 format、lint、typecheck、knip、覆盖率门槛和 Playwright e2e，可以当自动判官；云端 session 能自己 push、开 PR、修到 CI 变绿；三个 subagent 已经在用。
- **并行之前要先解决的仓库摩擦**：每个 PR 都要重写 README Update Log 当天的那一节、改 tracker，同一天的 PR 必然冲突；spike-first 只留给设计类任务；每个新 session 都要启动 Docker 和本地 Supabase，可以用 SessionStart hook 或环境的 setup script 预热。

## 推广

- **渠道**（各有规则）：ADHD 相关的 subreddit（多数限制推广，见「外部约束」）、r/ClaudeAI 和 MCP 相关社区（Claude 规划是和别的 kanban 不一样的地方）、r/ADHD_Programmers、r/productivity、r/SideProject、Product Hunt、Hacker News 的 Show HN、ADHD 和 AI 开发相关的 Discord。
- **Show HN 的门槛**：Design Console 本来就能用 fixture 数据渲染真实组件，可以改成公开的只读 demo；或者一个 demo 账号（Q6）。
- **要不要找人咨询**：需要的知识分三块：社区规范（潜水、读规则、看别人的发布复盘，Indie Hackers 和 r/SideProject 上很多）、定位和文案（做过 indie launch 的人）、法律文本（开始收费以后和免费阶段不一样）。

## 上线之后再做

Shared server-action handler、RLS、服务条款、UI 组件测试、per-kind risk rules、Settings 里撤销 OAuth 授权、Dump 的编辑和搜索。

---

## 待拍板 · Open questions（发布的工作开始时再定）

| # | 问题 | 选项 | 倾向 |
| --- | --- | --- | --- |
| Q1 | 新品牌会不会改视觉方向 | a 只改名字和 logo · b 连视觉方向一起改 | — owner 定；选 b 的话，要在 P2、P3 的 mockup 之前定下来 |
| Q2 | P2 和 P3 的先后 | P2 先 · P3 先 | **P2 先**：P1 之后旧 plan form 要么打补丁要么删掉 |
| Q3 | 托管方式 | a owner 托管 · b 开源、用户自己部署 · c 两个都提供 | — owner 定；成本和合规的差别见「免费、非商用能少做什么」 |
| Q4 | 没有 Claude 的用户 | a 手动排计划还是一条正式路径（Plan week 改版保留手动流程）· b 只支持 Claude 规划 | — owner 定；a 让 P2 多一套手动的 UI |
| Q5 | 是否面向欧盟用户 | 面向 · 不刻意面向 | — owner 定；影响隐私政策的写法，事实见「外部约束」 |
| Q6 | 公开 demo | a 不做 · b Design Console 做只读 demo · c demo 账号 | **b**：组件和 fixture 已经有了，不用新建数据 |
| Q7 | 落地页 | a 不做 · b 一页（是什么、截图、登录、connector 说明） | **b**：从外部链接进来的人，现在只看到一个登录按钮 |
| Q8 | Beta 的规模和来源 | 人数、找谁 | — owner 定 |
| Q9 | Agent harness 的形状 | 见 tracker 的 Quality gate Step 13 | — owner 在想；spike 在开工时写 |
| Q10 | Step 14（错误呈现）的范围 | a 7 个子项全做 · b 最低版（`error.tsx`、`not-found.tsx`、静默 rollback 的提示） | **a**，如果 harness 先上：每项都是规格清楚的小 PR |

## 拍板之后

1. Status 从 draft 改成 awaiting owner review，走 `design/spike/README.md` 的流程。
2. Tracker：*Milestone — Public launch* 按 project 加子项；并进去改写的条目有 *Week model Phase 2*、*Daily rhythm*、*Custom domain*、*User-configurable timezone*、*Redesign the point system and metric tracking*、*One entry for habits and projects together*。
3. Planner：P1–P6 要做的时候再一个个建。
4. Pain-points spike 的定稿是 P1 的第一步，daily rhythm spike 的改写是 P3 的第一步。
