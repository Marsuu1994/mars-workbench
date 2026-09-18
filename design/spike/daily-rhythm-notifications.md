# Spike: Smart reminders & low-friction tracking — 「daily rhythm」

**Status: awaiting owner review** · 2026-09-17 · Mockup: `design/mockup/future-work/mockup-daily-rhythm.html`

> 语言约定：这份 spike 按 owner 的阅读习惯用中英混排写——叙述用中文，产品名词、状态、研究概念保留英文（board / backlog / rollover / nudge / Today sheet …），和代码、mockup、tracker 里的叫法一一对应。后续编辑请保持这个 register。

## Trigger · 起因

Owner 提出的两个痛点（转述）：

1. **「plan 定了，事情一多就忘了去 check 要做什么——app 太多了。」** 加 notification 看起来是显而易见的解法，但提醒来的时候人正忙着，漏掉了就等于没提醒。那 reminder 到底该怎么设计才真的能提醒到人？
2. **「track 这一步没有 motivation。」** 事情做了卡片没挪，board 和现实脱节，stats 也就不再说明什么。已有的想法：给 track 加 feedback、把 update 的操作做得更简单、能在 notification 里直接改状态。

这份 spike 从行为科学和 UX research 两个角度看这两个问题，提出一个产品方向（**daily rhythm**），把真实的备选项和各自的 tradeoff 摆出来，最后给出分阶段的建议和待 owner 拍板的问题。它是产品文档——实现可行性只在最后一小节简短带过。

## Reframe · 先把问题拆开

| 痛点 | 本质上是什么 | 为什么「直接加 push」不够 |
| --- | --- | --- |
| 忘了 plan | 一个 **prospective memory**（记得「要记得」）的问题，发生在一个注意力市场里——planner 要和手机上的每一个 app 抢注意力 | 按时钟触发的 alert 是最弱的记忆线索：它不管你在干什么就响，结果要么被忽略，要么打断人；而每一次被忽略都在训练你忽略下一次 |
| 不 track | 一个 **摩擦 + 回报** 的问题：记录的成本是即时的（打开 app、找到卡、拖过去），回报是抽象且延迟的（stats） | 「记得更新 board」的提醒只是在一件杂事上再加一件杂事。记录必须同时变便宜 *并且* 当场有回报 |

两者共同的要求只有一条：**app 要在一天里挣到一个固定的、很小的位置，而不是去抢随机的时刻。** 下面所有设计都从这一条推出来。

## Principles · 研究发现 → 设计规则

每条先写发现，再写它在这个产品里推出的规则。

1. **Prompt 只在动机和能力同时在场的那一刻才会转化（Fogg, B = MAP）。** 打到一个正忙的人身上的 prompt 会失败，而每次失败都会降低下一次的成功率（habituation——notification 版的 banner blindness）。→ 少发、在可预期的过渡时刻发、每一条都能在十秒内回答。凡是不能一 tap 处理的，就不发成 notification。
2. **Event-based cue 好于 time-based cue（prospective memory 研究，Einstein & McDaniel）。** 「做完 X 之后」几乎不用费力就能记住；「下午三点」需要自己持续监控时间。→ 两个 daily ritual 锚定在用户已有的 routine 上（开始工作、睡前收尾），中间的一切都挂在 *状态* 事件上——task 到了它的 slot、rollover 快过期——而不是挂在时钟上。
3. **瞥一眼就必须已经交付价值。** 人一天看到 60 多条 notification，大多数几分钟内就会瞄到，不管有没有去操作（Pielot et al. 2014）。→ 把 plan 本身放进 notification 正文（"3 waiting: A · B · ↩ C"）。看到 *就是* 提醒，点开是可选的。这直接回答了「忙的时候漏掉了就没用」——正文可瞥的通知，即使被忽略也已经起了作用。
4. **在 breakpoint 打断（Iqbal & Bailey 2008；Mehrotra et al. 2015）。** 把 alert 推迟到任务边界，会降低打断代价、提高响应率。→ ritual 落在一天的边界上；错过的 ritual 只在下一个自然边界（午饭）补 *一次*，然后安静到下一个 ritual。
5. **做一个 plan 就能平息未完成任务带来的心痒（Zeigarnik；Masicampo & Baumeister 2011），if-then plan 能提高执行率（implementation intentions——Gollwitzer & Sheeran 2006 meta-analysis，d ≈ .65）。** → 早上的 ritual 是一个真正的 plan：选出今天的几件，可选地给最重要的那件一个 slot（"afternoon"）。晚上的 ritual 给每个未完成 task 一个明确的归宿（done / still on it / not today），不让任何事情在夜里处于模糊的「还开着」状态。
6. **Recognition 好于 recall（Nielsen heuristics）。** 工作中记得去挪卡，是在最糟糕的时刻做回忆任务；晚上对着清单打勾是再认。→ 一天一次的批量 reconciliation 是 tracking 的 *主路径*；随手挪卡变成加分项，不再是义务。
7. **可见的进展是日常最强的 motivator（Amabile & Kramer，progress principle）；接近目标时投入会加速（goal-gradient，Kivetz et al. 2006）；有一点起步优势会更容易完成（endowed progress，Nunes & Drèze 2006）。** → 每次状态变化都必须 *当场* 让进度指示器动起来；这一周展示的是「离目标多近」，而不是「还剩多少」。
8. **结尾决定一段体验被记成什么样（peak-end rule，Kahneman et al. 1993）。** → 一天以一张先说「做成了什么」的总结卡片收尾。晚上的 ritual 才是产品的情绪签名，不是早上那个。
9. **时间地标会重置动机（fresh-start effect，Dai, Milkman & Riis 2014）。** → 早上和周一是要求承诺的时候；晚上和周五只做回顾，绝不提要求。
10. **外在奖励会挤出内在动机，控制性的 feedback 会引发 reactance（Deci, Koestner & Ryan 1999；Brehm）。** → feedback 是 *informational* 的（"2 of 3 · 5 pts · 高于你周二的平均"），措辞是邀请而不是命令；不搞每 tap 一次就撒花，不搞红色的 overdue 计数。streak 奖励的是 *ritual*（关掉这一天），不是结果，而且允许漏一次。
11. **Self-tracking 的中断是常态；把中断变成弃用的，是 guilt（Epstein et al. 2015「lived informatics」；Consolvo et al. 2009——positive、controllable、unobtrusive、glanceable）。** → 隔了几天回来，迎接你的是「welcome back，这是今天」，绝不是一堆欠账。每一类 notification 都有自己的开关。
12. **人会 over-plan（planning fallacy，Buehler et al. 1994）。** → 早上选任务时展示一个从用户 *自己的* 历史算出来的容量提示和一个软上限，让 plan 保持在做得完的范围里，晚上的卡片才能既诚实又正面。

## Proposal · daily rhythm

两个定时 ritual 把一天夹住。中间最多一次由状态触发的 nudge。一个常驻的 surface 兜住 notification 漏掉的一切。

```
07   08   09   10   11   12   13   14   15   16   17   18   19   20   21   22
     ▲ Open the day          ▲ 午间 follow-up            ▲ nudge           ▲ Close the day
       ritual · 正文可瞥       （只在还没 plan 时）         ≤ 1 / 天           ritual · 总结
                                                          由状态触发
```

### 1. Open the day — 早间 ritual

- **Notification**（默认 08:30，仅 plan 日）：标题 "Open the day"；正文列出在等的东西——今天的 daily、剩余的 weekly instance、rollover 过来的、最靠前的 *Do First* priority。锁屏上瞥一眼就能看完。
- **Today sheet**（app 内；当天还没 plan 时启动 app 也会自动弹一次）：候选按 *Rolled over* · *Daily* · *Weekly (n left)* · *From Priorities* 分组。tap 选中，"Start the day" 一次批量把选中的 `BACKLOG → TODO`（rollover 已经在 board 上，原地不动）。带一个来自历史的 **capacity hint**（"你周二平均 ~6 pts · 已选 7"），一颗可选的 **focus** 星标在一个 task 上，可再选一个 slot chip（morning / afternoon / evening）——这就形成了 implementation intention，也给午间 nudge 提供了触发点。
- **Quiet rules**：今天已经拉过 task 就不发；到 12:30 还没 plan 就补一次 follow-up；`NORMAL` mode 的周末不发（`EXTREME` 保持节奏）。

### 2. 午间 nudge — 由状态触发，每天 ≤ 1（V2）

不按时间表。只有当现有 risk engine 或早上的 plan 给出信号时才发，选最严重的那一个，最近两小时打开过 app 就整个跳过（用户已经看过 board 了）：

- focus task 的 slot 开始 → "Afternoon: *Write report* is up." [Start] [Later]
- rollover 的 daily 到 15:00 还没关（risk engine 的 *danger* 线）→ "*Read 20 pages* rolled over from yesterday and expires tonight." [Done] [Let it go]
- 一个 task 从昨天起一直卡在 *In Progress* → "*Draft outline* — done, or still going?" [Done] [Still going]

一个 task，两个答案。Android 上答案就是 notification 的按钮；iOS 上 tap 打开一个 **quick-update sheet**，同样的两个按钮（见可行性一节）。"Later" 当天不会再响。

### 3. Close the day — 晚间 ritual

- **Notification**（默认 21:00）："Close the day · 2 of 3 done · 5 pts. One left: *Read 20 pages*." 如果全部已经做完，notification 本身 *就是* 奖励——"Day closed · 3 of 3 · 8 pts — best Tuesday in three weeks. Tomorrow: 2 dailies + Weekly #2 waiting."——静音发送，什么都不用打开。
- **Close sheet**：board 上每个未完成 task 三选一——**Done** · **Still on it**（→ In Progress）· **Not today**（明确的推迟；不改状态，是一个选择而不是失败）。rollover 的 task 标 done 时可选 "did this yesterday"，让 `doneAt` 记在正确的那一天。"Close the day" 一次批量提交。
- **Day card**（提交之后）：ring + points，和用户 *自己的* 历史做 informational 的比较（任何完成度下都是正面措辞——"2 of 4，这也是一天；明天还有 2 个 daily 在等"）；**process streak**（"closed 5 days in a row · shield ready"——每周一次免罚；或者更结实的「最近 14 天关了 11 天」比例）；本周进度条（"18 / 34 pts"）；**tomorrow preview**（一种 pre-commitment，让第二天早上更便宜）；以及一个 "anything on your mind? → Dump" 入口（把脑子里还在转的东西倒出来，才能放下这一晚）。

### 4. 到处都更便宜的 update

- 手机卡片上的 **tap-to-advance**：一个常显的尾部控件（*→ In Progress* / *✓ Done*），作为拖拽之外的一 tap 替代。桌面端保留拖拽，同样加上这个常显控件（tracker 里 hidden-pencil 的教训：只在 hover 时出现的 affordance 没人发现得了）。
- 两个 sheet 都是 **batch commit**；每个 nudge 背后都是 **quick-update sheet**；Android 有 **notification actions**。

### 5. 常驻 surface — 兜住漏掉的 notification

- **App badge**：主屏幕图标上显示今天 board 上未完成的数量（或者有 ritual 待处理时显示 `1`）。安静、无声、被划掉的 alert 之后它还在。
- **Re-entry**：board 顶部有一条 pending-ritual strip（"Open the day →" / "Close the day →"），每个 ritual 每天自动弹一次 sheet。不管因为什么打开 app，都能把 loop 补上——这正是让「漏掉一条 push」变得无害的机制。
- 可选、以后再说：早间 **email digest**，以及日历里的 **"Today's plan" event**，给生活在那些 surface 里的人（见 Options A）。

### 6. Weekly bookends — 基本已经有了

下周还没有 plan 时，周日晚 / 周一早发一条 "New week ahead"（fresh start），复用 plan chat 已经算好的上期 recap；空 board 上的 end-of-period recap 继续充当每周的收尾。

## Notification policy · 让它一直被信任的规则

1. **预算**：每天 ≤ 3 条（open · close · ≤ 1 nudge）；没什么可说就是 0 条。
2. **做完了就闭嘴**：已经做完或已经 plan 过的事，绝不再提醒。
3. **不升级**：错过的 ritual 只在下一个 breakpoint 补一次，然后安静到下一个 ritual。
4. **正文可瞥**：notification 里写的是 task 本身，不是「你有任务待办」。
5. **语气**：邀请和信息；先数做完的再数剩下的（"2 done, 1 to go"，绝不是 "1 overdue"）；不命令，不羞辱。
6. **一 tap 答不了的不发**成 notification。
7. **用户控制**：两个时间选择器、一个 nudge 开关、周末跟随 plan mode、每类单独可关；权限在讲清楚两个 ritual 之后、在场景里只问一次。
8. **自适应时间（V3）**：把每个 ritual 的发送时间往用户实际响应的时间挪；从来没有互动过的时段绝不发。

## Options · 备选项与 tradeoff

### A. Reminder 住在哪（渠道）

| 选项 | Pros | Cons |
| --- | --- | --- |
| **A1 Web Push（PWA）** | 原生感、及时；deep-link 直达 sheet；Android quick actions；app badge | iOS 需要 16.4+ 且 app 加到主屏幕（已经是了）；iOS 没有 action button；权限问得不是时候几乎无法挽回；需要 scheduler + subscription 存储 |
| **A2 Email digest** | 不用问权限；能触达生活在邮箱里的人；实现极简单；带签名的一键 "done" 链接在所有平台都能用 | 存在感低；对晚间 ritual 没用；又多一封邮件——「app 太多」这个理由两边都说得通 |
| **A3 日历 event（"Today's plan"）** | 很多人整天都在看的地方；常驻 | 需要 Calendar OAuth scope + refresh-token 的 plumbing；实际上只读；晚上用不上 |
| **A4 原生壳（widgets / Live Activities）** | 唯一能做到真正「一直可见」的路 | 多维护一个平台，远离当前 stack；现在不推荐 |

**建议**：A1 作为 prompt 渠道，app 内的 ritual 作为 *没有任何渠道* 也能工作的 surface；A2 以后做成 opt-in；A3/A4 搁置。

### B. 早上的 ritual 问什么

| 选项 | Pros | Cons |
| --- | --- | --- |
| **B1 选今天的 task（从 backlog 拉），软上限约 3 个 focus** | 真正的承诺 + implementation intention；和现有 backlog 模型完全对应；capacity hint 抑制 over-planning | 每天早上要点几下；需要一个绝不 nag 的 "skip today" |
| **B2 自动全部拉上来，只展示** | 零摩擦 | 没有承诺效应；board 被塞满；rollover/expire 的噪音更大 |
| **B3 只问「你的 focus task 打算什么时候做？」** | 文献里最强的那一个问题 | 单独用它，board 上什么都不会有 |

**建议**：B1，B3 作为 focus task 上的可选 slot chip。

### C. Tracking 怎么变便宜

| 选项 | Pros | Cons |
| --- | --- | --- |
| **C1 晚间批量 reconciliation（Close sheet）** | recognition 而不是 recall；一个可预期的时刻；每个 task 都有明确归宿 | 不 retro-date 的话 `doneAt` 会变粗（都在晚上）；白天从不 tap 的人，Today ring 要到晚上才会填满 |
| **C2 卡片上的 tap-to-advance** | 手机上一 tap 代替拖拽；随时可用 | 解决不了 *记得* 去更新这件事 |
| **C3 在 notification 里 update** | 零导航 | 按钮只有 Android 有；iOS 变成 tap → quick sheet；永远只覆盖 nudge 里的那一个 task |
| **C4 自动推断（日历、计时器）** | 不用记录 | 猜错了会损耗信任；需要集成；对个人 planner 来说过重 |

**建议**：C1 + C2 作为基础，C3 叠在 nudge 上；C4 不做。

### D. Feedback 长什么样

| 选项 | Pros | Cons |
| --- | --- | --- |
| **D1 Informational 的进度（ring / points / 和自己历史比）+ day card** | 符合 progress principle 和 self-determination theory；已经建了一半（dashboard、recap stats） | 含蓄——想要「爽感」的人可能觉得太安静 |
| **D2 Process streak（关掉的天数），可免罚** | 奖励的是我们真正需要的那个 ritual；免罚避免了断链悬崖（Duolingo 卖 streak freeze 的原因） | streak 仍可能变成目的本身；shield / 比例的设计必须保持诚实 |
| **D3 结果导向的 gamification（badge、confetti、等级）** | 即时的刺激 | 很快就 habituate；挤出内在动机；把没做到变成失败 |
| **D4 LLM 写的激励文案**（tracker 里已有的 item） | 变化对抗 habituation | 不基于数据就很空洞；每条 notification 都有延迟和成本；以后加在 day card 上很便宜 |

**建议**：D1 + D2；D3 不做；D4 以后可能加，只放在 day card 上。

## How we'd know · n = 1 产品的验证方案

先行指标，全部可以从一张小的 `notification_event` 日志表 + 现有表算出来：

- Ritual 完成率：plan 日中早上做了 pick 的比例；plan 日中关掉了这一天的比例。
- Notification → 打开的延迟；没打开就划掉的比例（habituation 信号）。
- 有 ≥ 1 次状态变化的天数占比，按路径拆分（close sheet / tap-advance / drag / notification action）。
- Rollover 和 expire 的比例（应该下降）；每个 plan 的完成率（AI recap 已经在算）。

护栏：任何一类 notification 被关掉；距上次打开的天数；"Not now" 的原因——午间 follow-up 上放三个 chip（*busy* / *not relevant* / *already done*）——这是最便宜的 diary study。

方法：先跑两周只有 ritual（Phase 0），再跑两周加上 push，比较同一组指标。个人产品可以做个人的 ABA。

## Feasibility notes · 简短的可行性备注

- **Push 的 plumbing**：`web-push` + VAPID key、一张 `PushSubscription` 表、一个真正的 service worker（现在的是 no-op）处理 `push` 和 `notificationclick`（deep-link 到 `/kanban?ritual=open|close`），以及一个 scheduler。这和 tracker 里已经想做的 daily sync cron 是同一个 job：先 sync，再决定发什么。Vercel Hobby 的 cron 只有按天粒度（请核实当前套餐限制）；按用户定时需要 Pro，或者 Supabase `pg_cron` / Edge Functions，或者 QStash 一类的队列。
- **iOS**：Web Push 和 Badging API 需要 iOS 16.4+ 且 app 加到主屏幕；Safari 会忽略 notification 的 `actions`，所以 quick action 只有 Android 有，quick-update sheet 是正式路径。
- **权限**：只在 "Daily rhythm" 设置卡片里、由用户手势触发、在价值展示清楚之后才请求；浏览器里被拒绝过的权限几乎无法挽回。
- **时间设置**：新的 `UserSettings` 行上两个 `TIME` 列 + 一个 nudge 开关——这也是 tracker 里 user-timezone item 天然的家。
- **Sheets**：Today sheet 是一批 `BACKLOG → TODO`；Close sheet 是一批状态更新加一个可选的 `doneAt` 覆盖——都是现有 action 的小扩展。
- **Capacity hint**：最近几个 plan 里按星期几聚合的平均完成 points——在 `Task.doneAt` 上做一个 aggregate。
- **自适应时间 / 指标**：需要 `notification_event` 日志；V3。
- **PWA 做不到的**：主屏幕 widget、Live Activities、iOS 上不可划掉的常驻 notification。

## Recommendation · 建议与分期

- **Phase 0 — 没有 notification 的 ritual**（性价比最高，也是任何渠道都需要的地基）：Today sheet + Close sheet + day card + tap-to-advance + app badge + pending-ritual strip。这已经完整解决了 tracking 的痛点，和一半的「忘了」（「打开 app 它就告诉我接下来做什么」）。
- **Phase 1 — 两个 ritual 的 push**：open / close notification 加 quiet rules、午间 follow-up、设置卡片、权限流程、cron（兼做 sync cron）。
- **Phase 2 — 聪明的中间**：由状态触发的 nudge（≤ 1 / 天）、Android actions + iOS quick sheet、带 shield 的 process streak、每周的 "New week ahead"。
- **Phase 3 — 自适应与可选渠道**：按响应时间挪发送时间、email digest opt-in、还想要的话在 day card 上加 LLM 文案。

## Open questions · 待 owner 拍板

1. Focus 上限：「最多 3 个 focus pick」、按 capacity hint 的点数上限，还是不设上限只提示？
2. 默认时间：`KANBAN_TZ` 下 08:30 / 21:00？还是晚上跟 risk engine 的 20:00 daily cutoff 对齐？
3. Streak 形式：每周一次 shield 的宽容连续链，还是「最近 14 天里 n 天」的比例（没有链可断）？
4. daily task 上的 "Not today" 是一个真实状态（立刻 expire，一个新的、仍然只向前的状态转换），还是保持 no-op、让 rollover 走完？
5. 一 tap 的 notification action 先做 Android、iOS 走 quick sheet，能接受吗？
6. 早间 email digest 到底要不要——「app 太多」这个理由两边都说得通。
