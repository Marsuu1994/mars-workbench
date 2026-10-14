# Spike: Simplify AGENTS.md

**Status: decided** · 2026-10-14（提出同日，同日按 #65–#67 更新；owner review 见 PR #64）· 回答 tracker 条目 *Milestone — Quality gate before Phase 2 › Step 3*（Cross-cutting › High；review 时是 Cross-cutting › Medium 的 *Spike: simplify AGENTS.md*）· 基于 main `6530079`（#67）· 来源：owner 让 agent 以 AI judge 的身份 review AGENTS.md，共两轮（2026-10-10 基于 `dad1eac`，2026-10-14 基于 `4bbdbd5`）· 相关：tracker 的 *Milestone — Quality gate before Phase 2*（Cross-cutting › High）、`CLAUDE.md`、`.claude/commands/push.md`、`.claude/skills/`、`design/README.md`、`.github/workflows/ci.yml`、`eslint.config.mjs`

> 语言约定：叙述用中文；规则名、文件路径、代码标识、ESLint 规则名保留英文（`One file → one component`、`react/no-multi-comp`、`aiPlanChatStore` …），和 AGENTS.md、代码一一对应。文中 `:N` 指 AGENTS.md 的行号；`tracker.md:N` 在 Decision 一节里指本 PR 改过之后的 tracker，在下文里指 main `6530079` 上的 tracker。#65–#67 只改了 tracker、README 和几份 design 文档，AGENTS.md、`.claude/`、CI 和 `src/` 自 `4bbdbd5` 起没有变，所以行号和违规数在两个 commit 上都成立。

这份 spike 分五部分：起因和现状；和 Quality gate milestone 的关系；问题清单，每条都带证据和建议，编号方便逐条回复；三个方案和推荐；待 owner 决定的问题。附录 A 列出 AGENTS.md 每条规则的去向，附录 B 是精简后的目标大纲。结论在最前面的 Decision 一节。

## Decision · 拍板（2026-10-14）

owner 在 PR #64 上逐条 review，加上三条 note；没有评论的问题按推荐执行。

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1 · 范围 | **C**：文档、CI、代码三部分都做，放进 Quality gate milestone（Q11） | 见下面的实施计划 |
| Q2a · Named exports | 保留；Next 约定文件（`page`、`layout`、`loading`、`not-found`、`error`、`route` 等）例外；交给 `import/no-default-export` | 修 16 个文件 |
| Q2b · const arrow | 保留；Next 约定文件例外，其余全部改成 arrow | 修 18 处 / 17 个文件；交给 `react/function-component-definition` |
| Q2c · One file → one component，以及新 lint 的范围 | 新加的 ESLint 规则**只管生产代码**，Design Console（`src/app/design/**`）不管。现有的 lint 和 tsc 仍然跑全仓：它们今天就是绿的，`next build` 也会检查全仓的类型 | Step 2 之后，只剩 `LoginScreen.tsx` 和 `ReviewChangesModal.tsx` 两个文件要拆 |
| Q2d · 命名 | **选项 2**：单字母交给 `id-length`；业界通行的短名保留。例外清单：`id`、`tx`、`t`（只给 next-intl）、`prev`（setState updater）、`_`（不用的参数）、`i` / `j`（下标循环）、`a` / `b`（sort comparator）、`T` / `K` / `V`（类型参数）。`e` 不在例外里：它可能是 event，也可能是 error，要写全称 | 生产代码在 Step 2 之后约 57 处 / 22 个文件；`templates.map(t => …)` 这类改成全称 |
| Q2e · slice | 删掉这条 | — |
| Q2f · inline styles | 加例外：只允许动态值（CSS 变量、计算出来的尺寸）；不上 lint | — |
| Q2g · 品牌渐变上的白色 | **选项 1**：换成按角色命名的主题变量，每个主题都声明，由 `check:themes` 检查 | 放进代码 PR，或者单独一个 PR |
| Q3 · 枚举 | 映射用 `Record<Enum, T>`；分支逻辑用 `switch`，在 `default` 里做 `never` 检查 | 改写 `:157` |
| Q4 · Server shapes inputs | **拆成两半**。owner 建议先标 pending，因为之后上 React Query，这部分怎么变还不知道。和 state 库无关的两条不变量现在就定：service 返回 inputs（DAL 形状的 rows、聚合、lookup），不返回 UI model；UI 形状由 `src/utils/` 里的纯 adapter 推导，推导出来的数据不进 state。换成 React Query 之后这两条照样成立：query 返回 rows，view 仍由 adapter 推导（可以放在 query 的 `select` 里）。其余部分标 **pending**：container 怎么持有 rows、怎么做 optimistic patch，等 Step 7（mutation layer）定；frames 是否通过 `children` 渲染，等 Step 9（component structure）定。`useMemo` 这一句删掉（React Compiler） | AGENTS.md 留两行不变量，加一句「pending：Step 7、Step 9」；详细版和 Board 现在的做法挪到 `baseline.md` › Architecture Decision；tracker 的 Step 7、Step 9 已注明 |
| Q5 · Screen components vs Production first | 按推荐：合成一条「现状 + 待定」，由 Step 9 裁决；Projects 的 pilot 例外挪到 tracker 的 Step 9 | tracker 已改 |
| Q6 · 文档格式规则 | 挪到各自文档的开头。AGENTS.md 只保留**一层薄的 index**，细节放在各个 README 里，用到时才读（owner） | 「规则在哪」表 |
| Q7 · 防增长 | **选项 1 + 3**：`:143` 换成放置规则；体量和增长交给 Step 6 的 quality sweep；不做 CI 体量检查 | tracker 的 Step 6 加上「AGENTS.md 的体量和增长，以及 index 和它指向的 README 是否一致」 |
| Q8 · `push.md` | 第 4 步按推荐：规则或目录职责变了，才改 AGENTS.md。第 2 步按 owner 的 note：**Update Log 以天为单位**，前几天的不动；同一天先追加，再把当天整节重构成一份 summary。另外，owner 问这个清单能不能成为本地和云端 session 的默认动作：可以。把清单搬进 AGENTS.md › Version Control 的「推送前」一条，Claude Code 和 Codex、本地和云端都会读到；然后删掉 `.claude/commands/push.md` | AGENTS.md 的 `:124` 和 `:334` 合成这一条（R1 只留一处）；C4 不再是冲突，tracker Step 6 里那条「已知 finding」删掉 |
| Q9 · CLAUDE.md | 三个 skill 删掉之后，只留 `@AGENTS.md` | — |
| Q10 · tracker 长条目 | 现有的先不动；规则改成「每项写成简洁的一行，细节拆成子 bullet」（owner），写进 `tracker.md` 开头 | Step 6 的 sweep 可以把长条目报出来 |
| Q11 · 并进 milestone | **选项 2**：新增 Step 3「Simplify AGENTS.md」，排在 Step 2 之后，原 Step 3–9 顺延成 4–10；CI 和两条 0 违规的 ESLint 规则并进 Step 1 | tracker 已改；planner 里对应的 project 要同步，等 owner 确认 |
| 讨论中加的 · skills | `new-flow`、`new-feature`、`design-explore` 三个 skill **全部删掉**（owner：做 design 时没用上）。留下有用的两点：flow 的格式（Trigger / Steps / Rules）进 `design/flows/README.md`；mockup 的命名规则（迭代时叫 `temp-<area>-v2.html`，批准后改名 `mockup-<area>-v2.html`，tracker 链过去，`temp-*` 删掉）进 `design/README.md` | X1–X3 从「修」变成「删」；AGENTS.md `:107` 和 `design/README.md:21` 里的 `/design-explore` 一起删 |

下文保留 review 时的分析和选项，选中的选项标了 ✓；和结论不一致的地方，以本节为准。下文的 Step 编号和 `tracker.md` 行号都是 review 时的：当时的 Step 5、6、8，现在是 Step 6、7、9。附录 A 已按结论改过，文档 PR 可以直接照着做。

### 实施计划

| milestone 步骤 | 做什么 | 验证 |
| --- | --- | --- |
| Step 1（已有，`tracker.md:65-66`） | CI 加 `lint` 和 `typecheck` 两个 job：`package.json` 加 `"typecheck": "tsc --noEmit"`；`typecheck` 之前先跑 `prisma generate`，给一个假的 `DIRECT_URL`。ESLint 加 `no-console`（allow `error` / `warn`）和 `no-restricted-imports`（限制 server-only 模块；`@/lib/db/*` 只允许 type import） | 两条规则今天都是 0 违规；CI 全绿 |
| Step 2（已有，`tracker.md:67`） | 删掉 in-app AI chat；顺手改 D12 的 6 处 | — |
| Step 3 · 文档 PR（新增，`tracker.md:68-69`） | 按附录 A 重写 AGENTS.md：一层薄 index，加上每条规则的落点。新建 `design/spike/README.md`、`design/flows/README.md`、`src/app/design/README.md`；`tracker.md` 开头、`design-language/README.md`、`baseline.md`、`design/README.md` 接收挪过来的内容。删掉三个 skill 和 `.claude/commands/push.md`；CLAUDE.md 只留 `@AGENTS.md` | 附录 A 每一行都有落点或删除理由；`grep` 确认没有失效链接；`format:check` 通过 |
| Step 3 · 代码 PR（新增，`tracker.md:70`） | 加 4 条只管生产代码的 ESLint 规则：`import/no-default-export`、`react/function-component-definition`、`react/no-multi-comp`、`id-length`（用 Q2d 的例外清单）。修掉违规：16 个文件的 default export、18 处 `function` 组件、2 个多组件文件、约 57 处命名。然后删掉 AGENTS.md 里对应的文字。品牌渐变上的白色换成主题变量（也可以单独做） | lint、tsc、`next build` 都通过；Design Console 逐页截图对比无变化 |
| Step 6（已有，`tracker.md:73`） | sweep 的 checklist 加上 AGENTS.md 的体量和增长，以及 index 和 README 是否一致 | — |

---

## Trigger · 起因

AGENTS.md 是每个 agent session 的固定开销：Claude Code 通过 `CLAUDE.md` 里的 `@AGENTS.md` 全量加载，Codex 直接读取。现在它有 358 行、4754 词。

它只增不减：

| commit | 日期 | 行数 | 词数 |
| --- | --- | ---: | ---: |
| `343559d` | 2026-07-19 | 322 | 2996 |
| `4c986c9` | 2026-10-03 | 330 | 3252 |
| `47df6e3` | 2026-10-08 | 340 | 3719 |
| `2dc4453` | 2026-10-10 | 343 | 4085 |
| `4bbdbd5` | 2026-10-14 | 358 | 4754 |

10-03 到 10-14 的 11 天里，词数涨了 46%。行数涨得少，是因为新规则大多写成一整行的长段落。同一时期，AGENTS.md 被 14 个 commit 改过，合计加了 57 行、删了 21 行；这些 commit 没有一个是为了删减或合并规则。

有两个机制在推着它变长：

- `:143` 要求新规则追加到相关小节的末尾。
- `.claude/commands/push.md` 第 4 步要求每次 push 都更新 AGENTS.md 的 tech stack、structure 和 feature comments。

review 找到的问题有三个后果：

1. **固定的 context 成本**：约三成内容（约 1400 词）只在特定任务里用得上（写 scenario、写 spike、改 tracker），却每个 session 都要加载。
2. **规则和代码对不上**：agent 改代码时会参照周边代码。16 个组件都用 default export 时，"Named exports only" 读起来就不像一条真规则。
3. **同一条规则散在多处**：spike 规则写在三个地方，"Update Log 只追加"也写在三个地方。改了一处，其它几处就成了旧版本。

## 现状 · What's there today

### 体量

| 部分 | 词数 | 占比 |
| --- | ---: | ---: |
| Coding Conventions（其中 JSX & components 858 词） | 1478 | 31% |
| Documentation Style | 694 | 15% |
| UI Workflow（其中 Source of Truth 450 词） | 584 | 12% |
| Layers | 437 | 9% |
| Project Structure | 370 | 8% |
| Version Control | 315 | 7% |
| Workflow（Session Start + Spike first） | 274 | 6% |
| 其余 11 节 | 602 | 13% |

最长的八条规则：

| 行 | 规则 | 词数 |
| --- | --- | ---: |
| `:139` | Server shapes inputs, the client derives the view | 225 |
| `:128` | Flow docs state facts, not UI detail or decisions | 134 |
| `:126` | A multi-PR project is one tracker item with a sub-bullet per step | 119 |
| `:274` | Status marks must not look like controls | 114 |
| `:149` | One file → one component | 104 |
| `:103` | Production first, the console adapts | 99 |
| `:343` | Act on submitted reviews only | 99 |
| `:121` | Write at the doc's altitude, not the work's | 98 |

### 现在靠什么执行

| 检查 | 命令 | 在 CI 里 | main `4bbdbd5` 上的结果 |
| --- | --- | --- | --- |
| Prettier | `npm run format:check` | 是 | 通过 |
| Theme variable contract | `npm run check:themes` | 是 | 通过 |
| ESLint | `npm run lint` | 否 | 0 error、0 warning |
| TypeScript | `npx tsc --noEmit`（没有 npm script） | 否 | 通过 |
| `next build` | `npm run build` | 否 | 本次没跑 |

lint 和 tsc 现在都是绿的，只是没进 CI；Milestone Step 1（`tracker.md:65`）已经计划把它们加进去。现有的 ESLint 配置已经把 `@typescript-eslint/no-explicit-any` 设成 error，所以 `:281`「No `any`」只差进 CI 这一步，就能由工具来执行。

## Quality gate · 和 milestone 的关系

#66 和 #67 在 tracker 里加了 *Milestone — Quality gate before Phase 2*（`tracker.md:64`）。其中四步和这份 spike 有交集：

| Step | milestone 里的内容 | 和这份 spike 的关系 |
| --- | --- | --- |
| Step 1（`tracker.md:65`） | ESLint 和 tsc 加进 CI；删 dead code | 就是 Option C 里 PR 2 的 CI 部分。Step 1 先做的话，PR 2 只剩两条 ESLint 规则 |
| Step 2（`tracker.md:66`） | 删掉 in-app AI chat（`aiPlanChatStore`、`aiChatActions`、`aiChatService`、`prompt/`、`openai`） | D5 的 slice 规则失去对象；D3、D4 的违规数下降；AGENTS.md 有 6 处会过时（D12） |
| Step 5（`tracker.md:69`） | `/quality-sweep` skill，加一个两周一次的 Routine，查规则文件之间的冲突和过期的临时例外；第一条已知 finding 就是 C4 | 这份 spike 相当于一次手工 sweep。它的分类（D、R、C、P、A、X、E）可以直接用作 sweep checklist 里「规则文件」那一节；防增长（Q7）也可以交给 sweep |
| Step 8（`tracker.md:82-83`） | component structure 和 config-driven modals | C2、Q5 等它裁决；Projects 的 pilot 例外挪到它下面 |

Step 6（mutation layer）和 Step 8 都会往 AGENTS.md 写新规则。先把 AGENTS.md 精简好，这些新规则就知道该放在哪里，不会再堆到小节末尾（Q11）。

---

## Findings · 问题清单

编号前缀的含义：

- **D**：规则和代码不符
- **R**：重复
- **C**：冲突或不清
- **P**：放错了位置
- **A**：违反 AGENTS.md 自己的写作规则
- **X**：外围文件的问题
- **E**：只靠文字执行的机械规则

证据都在 main `4bbdbd5` 上核实过。违规数量来自用候选 ESLint 规则试跑（`npx eslint src --rule …`，没有改配置）。

### D · 规则和代码不符

| # | 规则 | 证据 | 建议 |
| --- | --- | --- | --- |
| D1 | `:278` Named exports only（例外：`page.tsx`、`layout.tsx`） | 16 个组件文件用 `export default`：`domain/board/` 8 个、`domain/priorities/` 3 个、`domain/shared/` 3 个、`domain/plan/` 2 个。例外清单漏了 4 个 `loading.tsx`，Next 要求这类文件用 default export | 保留，例外改成「Next 约定文件」，交给 `import/no-default-export`（Q2a） |
| D2 | `:279` Components as `const` arrow functions | 17 个文件里有 18 个组件用 `function`（D1 的 16 个文件，加上 `ReviewChangesModal.tsx` 的 2 个）；用 const arrow 的约有 104 个文件。另有 26 个 Next 约定文件（page、layout、loading）都写成 `export default function`，规则没说它们算不算 | 保留，Next 约定文件豁免，交给 `react/function-component-definition`（Q2b） |
| D3 | `:149` One file → one component | `react/no-multi-comp` 报了 6 个文件：`LoginScreen.tsx`、`ReviewChangesModal.tsx`、`AiPlanChatModal.tsx`、`Avatars.tsx`，以及 Design Console 的 `GalleryParts.tsx`、`tabs/DomainTab.tsx` | 保留，交给 lint（Q2c）。`AiPlanChatModal.tsx` 和 `Avatars.tsx` 会在 Milestone Step 2 删掉，之后剩 4 个文件、8 处 |
| D4 | `:151` 不用缩写和单字母名（例外 `id`、`tx`、`t`） | `id-length`（min 2，例外 `t`、`_`）报 81 处、分布在 33 个文件；另有 `prev` 14 处，属于缩写，`id-length` 抓不到。例外 `t` 还和 `templates.map(t => …)`（`PlanForm.tsx:206`）撞名。其中 12 处在 Step 2 会删掉的文件里（`aiChatService.ts`、`aiPlanChatStore.ts`、`useAiPlanChat.ts`、`draftPlanPrompt.ts`、`AiPlanChatModal.tsx`），之后剩 69 处、28 个文件 | Q2d |
| D5 | `:312` store 超过约 5 个 action 就用 slice | `aiPlanChatStore` 约有 15 个 action，没有拆。Milestone Step 2（`tracker.md:66`）会提前删掉 in-app AI chat，这个 store 跟着删掉 | 删除（Q2e） |
| D6 | `:299-305` API Conventions | 仓库只有两个 route handler：`api/mcp/route.ts` 和 `.well-known/oauth-protected-resource/api/mcp/route.ts`，都交给 `mcp-handler` 处理。没有用 `NextResponse.json`，也不返回 `{error: string}`：MCP 走 JSON-RPC，错误由 `runTool` 包成 `isError` 结果。所以 `:302`、`:303` 没有适用对象，`:304`、`:305` 重复了 Layers | 压成一行：route handler 只做 route → `src/mcp/` 或 action → service |
| D7 | `:330` No inline styles | 4 处 `style=`，都是动态值：`ui/ProgressBar.tsx:26` 的宽度百分比、`ui/Toast.tsx:81` 的 `--fx-countdown-ms`、`auth/AuthBackdrop.tsx:11` 和 `:24` 两处读 CSS 变量的渐变 | 加例外：只允许动态值（Q2f） |
| D8 | `:168` 用 Heroicons，不写 inline SVG | 4 个文件有 `<svg>`：`AppSidebar.tsx`（自绘图形）、`ProgressDashboard.tsx`（进度环，属于图表）、`BrandIcon.tsx`、`LoginScreen.tsx`（品牌标志和 Google 标志） | 限定为「图标」，品牌标志和图表除外 |
| D9 | `:331` 不写死颜色 token | 7 处 `text-white` 或 `stroke-white`：`AppSidebar.tsx` 4 处，`BrandIcon.tsx`、`LoginScreen.tsx`、`SettingsPanel.tsx` 各 1 处，都在品牌渐变上 | Q2g |
| D10 | 事实错误 | `:287` 说用的是 "the `gts` config"，但 `.prettierrc.json` 只是手写的 4 个选项，`gts` 也不在依赖里。树里 `lib/` 写的是 `prisma/`，实际是 `lib/prisma.ts`。树里缺 `src/i18n/`。Tech Stack 缺 next-intl（而 `:212` 的 i18n 规则是最长的规则之一）和 React Compiler（`next.config.ts` 里的 `reactCompiler: true`）。树里列了 `scripts/one-time/`，但目录不存在（`tracker.md:21` 计划写第一个脚本） | 直接改 |
| D11 | `:139` "Every page follows this split" | Plan 页还没迁移（`tracker.md:27`），Projects 页是 pilot 例外 | 改成「目标」，现状交给 tracker（见 C2） |
| D12 | Step 2 之后会过时的 6 处 | Milestone Step 2 删掉 in-app AI chat、`prompt/` 和 `openai` 之后，这 6 处就不对了：`:12`「AI-assisted plan creation」（规划改由 Claude 通过 MCP 完成）、`:21` LLM 一行、`:57` 树里的 `prompt/`、`:201` 例子里的 `ai-chat/constants.ts`、`:212` 「Never translated: `prompt/*.ts`」、`:309` 例子里的 `aiPlanChatStore` | Step 2 的 PR 顺手改；如果 PR 1 先做，就直接按 Step 2 之后的状态写（Q11） |

### R · 重复

| # | 内容 | 出现位置 | 建议 |
| --- | --- | --- | --- |
| R1 | Update Log 只追加 | `:124`、`:293-295`、`:334` | 只留 `:124` |
| R2 | 推送前跑 `npm run format` | `:291`、`:341` | 合进一行「推送前检查」 |
| R3 | Prisma 只在 DAL 里用 | `:134`、`:305`、`:316` | 只留 Layers 里那条 |
| R4 | 文件名对应组件名 | `:148`、`:149` | 删 `:148` |
| R5 | 优先用 Server Components，按需才加 `'use client'` | `:282`、`:283`，而且这是 Next 的默认做法 | 合成一行，或者删掉 |
| R6 | 不要重复逻辑 | `:147`「Do not duplicate logic」、`:225` DRY JSX、`:252` DRY types | 合成一条 DRY |
| R7 | Spike 规则 | `:79-89` 生命周期；`:125` 文档结构、状态标题、tracker 链接、决定后冻结、归档；`:127` 用中文写。"headed `Status: awaiting owner review` and linked from the tracker item" 在 `:83` 和 `:125` 几乎一字不差；`design/README.md` 的 spike 那一行又写了一遍 | 合成一份，挪到 `design/spike/README.md`（Q6） |
| R8 | 生产组件不为 Design Console 让步 | `:100` No console-only props、`:103` Production first | 合成一条 |
| R9 | 文档要写短 | `:119` 开头段、`:121` altitude、`:122` length、`:123` edit in place，同一个原则讲了四遍 | 合成一段 |
| R10 | 用 render function | `:179` 是通用规则；`:180` 是它在 modal 上的特例，`:245` 是它在 prop 上的特例；`:178`「split large components」又和 `:149`、`:179` 重叠 | 合成一条，配一个例子 |
| R11 | AGENTS.md 和 CLAUDE.md 是什么关系 | AGENTS.md `:5-8` 的 Scope，和 CLAUDE.md 的 Import Order | 两边各留一行 |
| R12 | Projects 页的 pilot 例外 | `:97`、`:139` | 挪到 tracker（C2） |

### C · 冲突或不清

| # | 内容 | 建议 |
| --- | --- | --- |
| C1 | `:157` 要求枚举分支用 `switch/case/default`，`:225` 又推荐用 `Record<Key, string>` 做映射。而且 `default` 会吞掉新加的枚举值 | 映射用 `Record<Enum, T>`，编译期就能发现漏项；分支逻辑用 `switch`，在 `default` 里做 `never` 检查（Q3） |
| C2 | `:97` Screen components 要求每个页面抽出 screen 组件，让 scenario 渲染同一个组件；`:103` Production first 说不要为 console 拆组件。两条方向相反，Projects pilot 就是按后一条去掉了 screen 层。两条都在等 component structure spike，现在是 Milestone Step 8（`tracker.md:82-83`） | 那个 spike 定之前，合成一条「现状 + 待定」，pilot 例外挪到 tracker（Q5） |
| C3 | `:139` 要求 adapter 放在 `useMemo` 里，但 React Compiler 已经打开，编译器会自动 memo（全仓共 9 处 `useMemo` 或 `useCallback`） | 删掉 "inside a `useMemo`"（Q4） |
| C4 | `push.md` 第 2 步：当天已有条目时，"replace them with a consolidated summary"；AGENTS.md `:124` 和 `:334`：只追加，不改过去的条目。当天的条目算不算"过去"，没有说清楚。#67 已经把这条记为 Milestone Step 5 的第一条 finding（`tracker.md:69`） | Q8 |
| C5 | `push.md` 第 4 步要求每次 push 都更新 tech stack、structure、feature comments；new-feature skill 的 Step 4 要把新 feature 登记到树里的 `features/`，而这个目录不存在；AGENTS.md `:28` 却说树只写目录职责、不列清单 | push.md 改成「规则或目录职责变了才更新」；skill 删掉 Step 4（Q8） |
| C6 | `:121` 要求 tracker 每项 1–2 行。#65 清理之后，仍有 11 项超过 300 字符（最长的是 `:69` Step 5，882 字符；`:26` Phase 2，653 字符；`:65` Step 1，617 字符） | 规则不变，收紧 tracker 另开一项（Q10） |
| C7 | `:332` 只禁 `console.log`；代码里有 7 处 `console.error`（乐观更新失败回滚、`runTool`、`PlayRunner`），都是有意为之 | lint 用 `no-console`，并 allow `error` 和 `warn` |

### P · 放错了位置

| # | 内容 | 去处 |
| --- | --- | --- |
| P1 | `:274` Status marks must not look like controls 是视觉设计原则。它被放进 Coding Conventions › JSX & components，只是因为 `:143` 要求新规则追加到小节末尾 | `design/design-language/README.md` |
| P2 | 只在编辑对应文档时才用得上的规则：spike 相关的 `:79-89`、`:125`、`:127`，tracker 子项的 `:126`，flow 文档的 `:128` | 分别去 `design/spike/README.md`（新建）、`design/tracker.md` 开头、`design/flows/README.md`（新建） |
| P3 | 只在写 scenario 时才用得上的规则：`:98` frame modes、`:99` InteractionShield、`:100` 里 play steps 和 `data-time="frozen"` 的细节、`:101` modals render inline、`:102` one tab one state | `src/app/design/README.md`（新建）；AGENTS.md 只留两条硬规则 |
| P4 | `:139` 有 225 词，内容是一项架构决策 | `design/baseline.md` 的 Architecture Decision；AGENTS.md 留两行；`tracker.md:27` 里的链接跟着改 |
| P5 | `:320-324` One-Time Scripts | 第一个脚本落地时（`tracker.md:21`）写进 `scripts/one-time/README.md`；在那之前，AGENTS.md 留一行 |
| P6 | `:162`、`:163`、`:318` 是通用工程常识（先粗查再在内存里过滤；热点用定向查询；按 `EXPLAIN ANALYZE` 加索引） | 删掉。保留项目特有的三条：`:161` 批量写、`:164` `$transaction` 配合 `tx?`、`:317` 用 `select` 选字段 |

### A · 违反 AGENTS.md 自己的写作规则

| # | 内容 | 建议 |
| --- | --- | --- |
| A1 | `:22` 的 MCP 那一行写进了 JWKS、protected-resource metadata 和 `MCP_DEV_USER_ID`；`:20` 的 Auth 那一行写进了 consent page 的路径。这些是实现细节，按 `:121` 应该写在代码和 `reference.md` 里。实际上 `reference.md:65` 和 `design/flows/auth.md:97` 已经写过了 | Tech Stack 改成一行一个技术，重复的细节直接删 |
| A2 | 树里 `app/` 的注释（`:45-47`）扩成了三行路由清单，而 `:28` 说树不是清单 | 缩成一行：`app/ # App Router routes, api/, Design Console` |

### X · 外围文件

| # | 文件 | 问题 | 建议 |
| --- | --- | --- | --- |
| X1 | `CLAUDE.md` | 列了三个 skill，还要求模型 "Use Claude slash-skills where applicable"。但三个 skill 都设了 `disable-model-invocation: true`，模型调不了，只有用户输入 `/` 才能触发。"Claude-Specific Notes" 第二条重复了 UI Workflow；Import Order 重复了 AGENTS.md 的 Scope | 只留 `@AGENTS.md` 和 skill 列表（给人看），删掉对模型的指令和重复内容 |
| X2 | `.claude/skills/new-feature/SKILL.md` | Step 2 写 `components/$0/`，实际应该是 `components/domain/$0/`；Step 4 要把 feature 登记到树里的 `features/`，这个目录不存在，也和 `:28` 冲突；Step 5 写 `src/app/$0/page.tsx`，实际页面都在 `src/app/kanban/` 下 | 改路径，删掉 Step 4 |
| X3 | `.claude/skills/new-flow/SKILL.md` | feature 列表只有 `auth`、`board`、`plan`、`priorities`，漏了 `projects` 和 `dump`（`design/flows/` 里都有） | 补上，或者改成「`design/flows/` 下的任一 feature」 |
| X4 | `design/README.md` | 开头写 `components/<page>/`，现在实际是 `ui/`、`application/`、`domain/` 三层；tracker 那一行写 "closed work moves to feature Update Logs"，现在只有根 README 有 Update Log；"UI Design Workflow" 一节重复了 AGENTS.md 的 UI Workflow | 改正事实，UI 那部分换成链接 |
| X5 | `.claude/commands/push.md` | 见 C4、C5 | Q8 |

### E · 只靠文字执行的机械规则

在 main `4bbdbd5` 上试跑（`npx eslint src --rule …`）的结果：

| AGENTS.md 规则 | 候选 ESLint 规则 | 现有违规 |
| --- | --- | --- |
| `:278` Named exports only | `import/no-default-export`，对 Next 约定文件 override | 16 个文件 |
| `:279` const arrow | `react/function-component-definition`（arrow），对 Next 约定文件 override | 18 处 / 17 个文件，只有 2 处能自动修 |
| `:149` One file → one component | `react/no-multi-comp`（`ignoreStateless: false`） | 10 处 / 6 个文件 |
| `:151` 不用单字母名 | `id-length`（min 2，例外 `t`、`_`，`properties: never`） | 81 处 / 33 个文件 |
| `:332` 不留 `console.log` | `no-console`（allow `error`、`warn`） | 0 |
| `:330` No inline styles | `react/forbid-dom-props`（forbid `style`） | 4 处，都是合理用法，得逐行 disable，不建议上 lint |
| `:281` No `any` | `@typescript-eslint/no-explicit-any` | 已经是 error，0 处，只是 lint 没进 CI |
| `:136`、`:137` server-only 边界 | `@typescript-eslint/no-restricted-imports`：`src/components/**`、`src/hooks/`、`src/store/` 禁止 import `@/services/*`、`@/lib/prisma`、`@/generated/prisma`；`@/lib/db/*` 只允许 type import（`allowTypeImports`），因为 domain 组件 import DAL row 类型是合法的 | 用 grep 核对是 0 处（组件只用 `import type` 引用 `@/lib/db/*`） |

规则一旦交给 lint 执行，AGENTS.md 里对应的文字就可以缩成一行「ESLint 负责：…」。

---

## Options · 方案

### Option A — 只修文字

**做什么**：
- 改正事实错误（D10、X2–X4）。
- 删掉重复（R1–R6、R9–R11）。
- 在文字里解决冲突（C1、C3–C5、C7）。
- 删掉没有适用对象的规则（D5、D6）。
- 给规则补上例外（D1 的例外清单、D2、D7、D8）。

不挪文件，不加 lint，不改代码。

**好处**：一个只改文档的 PR，没有代码风险。

**代价**：
- 只能从 358 行降到 300 行左右，大头（JSX、Documentation Style、Design Console）都还在。
- D1–D4 的违规还在，机械规则仍然只靠文字。
- 增长的两个来源只解决了 `push.md` 那一个。

**实施**：一个 PR。

### Option B — A，再加按需加载

**做什么**：A 的全部，再把 P1–P5、A1、A2、R7、R12 的内容挪到它们所管的文档里。AGENTS.md 加一张「规则在哪」的表，每行一句：编辑 X 之前，先读 X 开头的 Conventions。

| 内容 | 去处 |
| --- | --- |
| spike 的生命周期、文档结构、语言 | `design/spike/README.md`（新建） |
| tracker 格式（每项 1–2 行、多 PR 用子项） | `design/tracker.md` 开头 |
| flow 文档写法 | `design/flows/README.md`（新建） |
| Status marks | `design/design-language/README.md` |
| Server shapes inputs 的详细版 | `design/baseline.md` › Architecture Decision |
| Design Console 机制 | `src/app/design/README.md`（新建） |
| Projects pilot 例外 | tracker 的 Milestone Step 8（component structure）下面 |
| MCP 鉴权细节 | 已在 `reference.md` 和 `flows/auth.md` 里，直接删 |
| one-time 脚本规范 | 暂时在 AGENTS.md 留一行，第一个脚本落地时挪到 `scripts/one-time/README.md` |

**好处**：
- AGENTS.md 降到约 200 行，常驻内容只剩每个任务都用得上的规则。
- 规则挨着它管的东西：owner 打开 tracker 或 spike 时，也能看到对应的格式规则。
- 改某种文档的格式，只需要改一个地方。

**代价**：
- agent 可能不读文档开头就直接改。缓解办法：AGENTS.md 里放「规则在哪」表，Session Start 里写明「编辑前先读开头」。
- 规则分散在 7 个文件里，想看全貌时要多打开几个文件。
- 指向「AGENTS.md › …」的链接要更新（`tracker.md:27`、`design/README.md`）。已归档的 spike 是冻结的，不改。

**变体 B′**：用子目录里的 `CLAUDE.md` 让规则自动出现（Claude Code 读到某个子目录的文件时，会加载那里的 `CLAUDE.md`）。缺点是只对 Claude Code 有效，Codex 不一定这样加载；而且会多出一套和 README 并行的文件。不推荐；如果要做，实施前先在两种 agent 上都验证一遍。

**实施**：一个 PR，只改文档。

### Option C — B，再交给工具（推荐）✓

**做什么**：B 的全部，再加上：

1. CI 加 `lint` 和 `typecheck` 两个 job。两者在 main 上现在都是绿的；这一项就是 Milestone Step 1 的 CI 部分。
2. ESLint 加上 E 表里的规则（`react/forbid-dom-props` 除外），并修掉现有违规。
3. 已经由 lint 执行的规则，AGENTS.md 里只留一行。
4. 把 `:143` 换成一条防止增长的规则：新规则放到它所属的地方；能用 lint 或脚本执行的，交给工具；和现有规则重叠时，改现有规则，而不是另加一条（Q7）。

**好处**：
- 规则和代码一致。agent 违规时 lint 立刻报错，不再依赖它有没有读到规则。
- AGENTS.md 再降到约 180 行。
- 增长的两个来源（`:143`、`push.md` 第 4 步）都堵上了。

**代价**：
- 代码改动量大：default export 改成 named export，要连带改所有调用方的 import（16 个文件，加上调用方）；`function` 改 const arrow 有 18 处，只有 2 处能自动修；要拆 4 个多组件文件；81 处单字母名要手工改。这些都是不改变行为的机械改动，但 diff 大，review 要花时间。
- 可能和进行中的工作冲突。不过 Phase 2 要等 Quality gate milestone 做完才开始，这件事放在 milestone 里做，冲突最少（Q11）。如果 Step 2 先做，修代码的量还会少一些（命名 69 处，多组件 4 个文件）。

**实施**：分三个 PR。

| PR | 内容 | 验证 |
| --- | --- | --- |
| PR 1 · 文档 | Option B 的全部：重写 AGENTS.md；修正 CLAUDE.md、`push.md`、两个 skill 和 `design/README.md`；新建 `design/spike/README.md`、`design/flows/README.md`、`src/app/design/README.md`；`baseline.md`、`tracker.md` 开头、`design-language/README.md` 接收挪过来的内容 | 附录 A 的每一行都有落点或删除理由；`grep` 确认没有失效链接；`npm run format:check` |
| PR 2 · CI（= Milestone Step 1 的 CI 部分） | `package.json` 加 `"typecheck": "tsc --noEmit"`；`ci.yml` 加 `lint` 和 `typecheck` 两个 job。`typecheck` 前要先跑 `prisma generate`，因为 CI 用 `npm ci --ignore-scripts`，而 `prisma.config.ts` 读 `DIRECT_URL`，所以要给一个假值。ESLint 同时加上 `no-console`（allow `error` 和 `warn`）和 `no-restricted-imports`，这两条现在都是 0 违规 | 本地跑一遍，CI 全绿 |
| PR 3 · 代码 | 按 Q2 的答案加 `import/no-default-export`、`react/function-component-definition`、`react/no-multi-comp`、`id-length`，修掉现有违规，再删掉 AGENTS.md 里对应的文字 | `npm run lint`、`tsc`、`next build` 都通过；Design Console 逐页截图对比无变化（这是纯重构） |

PR 3 可以按规则再拆，比如命名单独一个 PR，看 diff 大小决定。如果 Step 1 先做了 CI，PR 2 就只剩两条 ESLint 规则，可以并进 PR 3。

---

## Open questions · 待拍板（已拍板，结论见 Decision）

**Q1 · 范围选 A、B 还是 C？** 推荐 C，分三个 PR。如果只想先止血，B 是单个 PR 能做到的上限。

**Q2 · 代码已经违反的规则，改代码还是放宽规则？**

- **Q2a · Named exports**（16 个文件）：推荐保留规则、加 lint、修代码。例外改成「Next 约定文件」：`page`、`layout`、`loading`、`not-found`、`error`、`route` 等。
- **Q2b · const arrow**（18 处）：推荐保留，Next 约定文件豁免。另一个选项是删掉这条，`function` 和 arrow 都允许；不过项目里是约 104 个文件对 17 个，统一成 arrow 的成本最低。
- **Q2c · One file → one component**（6 个文件）：推荐 lint 只管 `src/components/**`，Design Console 的 `GalleryParts.tsx` 和 `DomainTab.tsx` 豁免，它们是 console 自己的脚手架，不是生产组件。另一个选项是全仓都管，一起拆。
- **Q2d · 命名**（81 处单字母，14 处 `prev`）：有三个选项。
  1. 完全严格：上 `id-length`，改掉 81 处，`prev` 也改成全称。
  2. ✓ 单字母交给 `id-length` 并修掉；`prev` 是 React setState 的惯用写法，加进例外（例外变成 `id`、`tx`、`t`、`prev`）。
  3. 只管新代码，lint 设成 warn。warn 通常没人看，不推荐。

  推荐选项 2。另外，`t` 只留给 next-intl，`templates.map(t => …)` 这类写法改成全称。
- **Q2e · slice**：推荐删掉这条。`aiPlanChatStore` 会在 Milestone Step 2 和 AI chat 一起删掉，现在拆 slice 是白做。
- **Q2f · inline styles**：推荐加例外「只允许动态值：CSS 变量、计算出来的尺寸」，不上 lint。
- **Q2g · 品牌渐变上的 `text-white`**（7 处）：有两个选项。
  1. ✓ 换成语义 token：在主题里声明一个按角色命名的变量，每个主题都要声明，由 `check:themes` 检查。
  2. 在规则里写明「品牌渐变上可以用白色」。

  推荐选项 1。但它要改主题文件，建议放到 PR 3 或者单独做。

**Q3 · 枚举分支怎么写？** 推荐：映射用 `Record<Enum, T>`；分支逻辑用 `switch`，在 `default` 里做 `never` 检查，这样新增的枚举值没处理就编译不过。

**Q4 · Server shapes inputs 怎么处理？** 推荐把详细版挪到 `baseline.md`，AGENTS.md 留两行；删掉 "inside a `useMemo`"，因为 React Compiler 已经打开。现有的 `useMemo` 不用动。

**Q5 · Screen components 和 Production first 怎么协调？** 推荐在 component structure spike（Milestone Step 8）定下来之前，先合成一条：「现状：每个页面有 screen 层，Projects 是例外；新页面怎么拆，由那个 spike 决定」。pilot 例外的细节挪到 tracker 那一项下面。spike 定了之后，只留结论。

**Q6 · 文档格式规则要不要挪到各自文档的开头？**（spike、tracker、flow、status marks）推荐挪，AGENTS.md 留一张「规则在哪」表。

**Q7 · 怎么防止再长回去？** 有三个选项，可以组合：

1. ✓ 把 `:143` 换成放置规则：新规则放到所属的地方；能用工具执行的交给工具；和现有规则重叠时，改现有规则。
2. CI 加一个体量检查，比如 `scripts/check-agents-size.mjs`，超过 N 词就失败。好处是硬约束；代价是加规则时会被卡住，得先删掉或合并别的规则。

3. ✓ 交给 Milestone Step 5 的 quality sweep：sweep checklist 加一项「AGENTS.md 的体量和增长」，超出预算就作为一条 finding 报出来，而不是让 CI 失败。

推荐选项 1 加选项 3。选项 2 由你决定；如果要做，预算建议定为 PR 1 之后的词数再加 10%。

**Q8 · `push.md` 怎么改？** 推荐：

- 第 2 步：去掉 "replace them with a consolidated summary"，改成当天的条目只追加 bullet；AGENTS.md 写明「不改前几天的条目」。
- 第 4 步：只有规则或目录职责变了，才更新 AGENTS.md 或 CLAUDE.md。

第 2 步的问题已经记为 Milestone Step 5 的第一条 finding；PR 1 直接改掉的话，Step 5 就少一条。

**Q9 · CLAUDE.md 留什么？** 推荐只留 `@AGENTS.md` 和 skill 列表，并注明这些 skill 只能由你用 `/` 触发；删掉对模型的指令和重复内容。

**Q10 · tracker 里的长条目怎么办？**（#65 清理之后，仍有 11 项超过 300 字符）这些不在本 spike 的 PR 里改，因为改写条目内容需要你确认。推荐交给 Milestone Step 5 的第一次 sweep，它本来就要查 tracker 和代码是否一致。

**Q11 · 这件事要不要并进 Quality gate milestone？** 有两个选项：

1. 保持独立：留在 tracker 的 Cross-cutting › Medium，什么时候做都行。
2. ✓ 并进 milestone：PR 2 并进 Step 1；PR 1（文档）和 PR 3（代码）合成新的一步，排在 Step 2 之后、Step 5 之前。

推荐选项 2，理由有三条：

- 放在 Step 2 之后，D12 的 6 处不用改两遍，命名也少改 12 处。
- 放在 Step 5 之前，sweep 的「规则文件」checklist 可以直接基于精简后的结构和这份 spike 的分类来写。
- 放在 Step 6、Step 8 之前，这两步写新规则时，已经有「规则在哪」表可以参照。

milestone 同时也是 planner 里的一个 project，加一步要同步改 project 的 steps，这由你来定。

---

## 附录 A · 每条规则的去向

去向的写法：**保留**、**改写**、**合并 →**、**挪到 →**、**lint**、**删除**。

| 行 | 规则 | 去向 |
| --- | --- | --- |
| `:5-8` | Scope | 改写：一行 |
| `:12` | Project Overview | 保留 |
| `:16-24` | Tech Stack | 改写：一行一个技术；补上 next-intl 和 React Compiler；删掉 `:20`、`:22` 里重复的细节（A1） |
| `:26-66` | Project Structure | 改写：改成 `lib/prisma.ts`，补上 `src/i18n/`，`app/` 的注释缩回一行（A2、D10） |
| `:72-77` | Session Start | 保留，加上「规则在哪」表 |
| `:79-89` | Spike first | 挪到 → `design/spike/README.md`；AGENTS.md 留一句触发条件和链接 |
| `:95` | Design Console 简介 | 保留 |
| `:97` | Screen components | 改写：和 `:103` 合成「现状 + 待定」；pilot 例外挪到 tracker（C2） |
| `:98` | Frame modes | 挪到 → `src/app/design/README.md` |
| `:99` | InteractionShield | 挪到 → `src/app/design/README.md` |
| `:100` | No console-only props | 保留一句硬规则，并入 `:103`（R8）；play steps 和 `data-time` 的细节挪到 `src/app/design/README.md` |
| `:101` | Modals render inline | 挪到 → `src/app/design/README.md` |
| `:102` | One tab, one state | 挪到 → `src/app/design/README.md` |
| `:103` | Production first | 合并 → `:100` |
| `:107` | Designing New UI | 改写：删掉 `/design-explore`；mockup 命名规则挪到 `design/README.md` |
| `:111` | Implementing UI | 保留，并入 `:115`，写成两句 |
| `:115` | Keeping Scenarios in Sync | 合并 → `:111` |
| `:119-123` | 文档要写短（开头段、altitude、length、in place） | 合成一段（R9）；各文档自己的 altitude 挪到各文档开头 |
| `:124` | Update Log | 改写：以天为单位，前几天的不动，同一天先追加、再重构成一份 summary（Q8）；R1 只留这一处 |
| `:125` | Spike 文档结构 | 挪到 → `design/spike/README.md`（R7） |
| `:126` | tracker 多 PR 用子项 | 挪到 → `design/tracker.md` 开头 |
| `:127` | Spike 用中文写 | 挪到 → `design/spike/README.md` |
| `:128` | Flow 文档写法 | 挪到 → `design/flows/README.md` |
| `:132-135` | actions、services、DAL | 保留；补上 `src/mcp/`，和 actions 同级 |
| `:136` | server-only 模块 | 保留，并加 lint（`no-restricted-imports`） |
| `:137` | 组件可以直接调 server action | 保留，删掉例子 |
| `:138` | Component placement | 保留 |
| `:139` | Server shapes inputs | 拆两半：两条不变量留在 AGENTS.md，其余标 pending（Step 7、Step 9）；详细版挪到 → `baseline.md`；删掉 `useMemo`（Q4） |
| `:143` | 新规则追加到小节末尾 | 删除，换成放置规则（Q7） |
| `:147` | domain helpers 放 `utils/`；不要重复逻辑 | 前半句保留；后半句合并 → DRY |
| `:148` | 改名时文件名对应组件名 | 删除（`:149` 已经包含） |
| `:149` | One file → one component | 保留，并加 lint（只管生产代码） |
| `:150` | Destructure | 保留 |
| `:151` | Name things plainly | 保留，例外改成 Q2d 的清单，并加 `id-length` |
| `:152` | LLM-facing error messages | 保留 |
| `:156` | 用枚举常量 | 保留 |
| `:157` | `switch/case/default` | 改写（C1、Q3） |
| `:161` | 批量写 | 保留 |
| `:162-163` | 粗查后内存过滤；热点用定向查询 | 删除（P6） |
| `:164` | `$transaction` 配合 `tx?` | 保留 |
| `:168` | Heroicons | 改写：限定为图标（D8） |
| `:169` | 星星和积分图标用 `text-warning` | 删除，颜色交给积分组件自己管 |
| `:173-174` | Themes | 保留 |
| `:178` | 拆分过大的组件 | 删除（`:149` 和 `:179` 已经覆盖） |
| `:179` | render functions | 保留，并入 `:180` 和 `:245` |
| `:180` | modal 按区域拆分 | 合并 → `:179`，保留 modal 的例子 |
| `:198` | constants.ts | 保留，缩短例子 |
| `:212` | i18n | 保留，缩短例子 |
| `:225` | DRY JSX | 保留，并入 `:252`，合成一条 DRY |
| `:245` | 不内联长 render prop | 合并 → `:179` |
| `:252` | DRY types | 合并 → `:225` |
| `:273` | Sentence case | 保留 |
| `:274` | Status marks | 挪到 → `design/design-language/README.md`（P1） |
| `:278` | Named exports | lint，文字缩成一行（D1） |
| `:279` | const arrow | lint，Next 约定文件例外，其余改成 arrow（D2） |
| `:280` | props 显式类型，优先用 interface | 保留 |
| `:281` | No `any` | lint（已经开启），删掉文字 |
| `:282-283` | Server Components、`'use client'` | 合成一行（R5） |
| `:287-297` | Formatting | 改写成一行：格式由 Prettier 负责，推送前跑 format、lint、typecheck；删掉 gts（D10）和只追加那句（R1） |
| `:301-305` | API Conventions | 改写成一行（D6） |
| `:309-311` | Zustand | 保留 |
| `:312` | slice | 删除（D5） |
| `:316` | Prisma 只在 DAL | 删除（R3，Layers 里已有） |
| `:317` | 用 `select` 选字段 | 保留 |
| `:318` | `EXPLAIN ANALYZE` | 删除（P6） |
| `:322-324` | One-Time Scripts | 缩成一行；第一个脚本落地时挪到 `scripts/one-time/README.md` |
| `:330` | No inline styles | 改写：加上动态值的例外（D7） |
| `:331` | 不写死颜色 | 保留（Q2g） |
| `:332` | 不留 `console.log` | lint（`no-console`），删掉文字 |
| `:333` | 不加重复的 action 或 route | 保留 |
| `:334` | Update Log 只追加 | 删除（R1，`:124` 已有） |
| `:338-340` | 本地 session、远程 session、不推 main | 保留，缩短；加一条「推送前」清单（原 `.claude/commands/push.md`，Q8） |
| `:341` | 推送前跑 format | 合并 → 推送前检查 |
| `:342` | Branch names | 保留，缩短 |
| `:343` | Act on submitted reviews only | 保留，缩成两句 |
| `:345` 起 | Commands | 保留；加上 `npm run typecheck`（PR 2） |

## 附录 B · 目标大纲（Option C 完成后）

| 节 | 内容 | 大约行数 |
| --- | --- | ---: |
| Scope · Overview | 读者是谁、和 CLAUDE.md 的关系、一句话介绍产品 | 5 |
| Tech Stack | 一行一个技术 | 10 |
| Project Structure | 只写目录职责 | 35 |
| Workflow | Session Start；「规则在哪」表；Spike first 一句话加链接 | 18 |
| UI Workflow | Design Console 是事实来源（加链接）；不为 console 改生产组件；mockup → 实现 → 同步 scenario | 10 |
| Documentation Style | 一段原则，加上 Update Log | 6 |
| Layers | actions、services、DAL、mcp；server-only；component placement；server shapes 两行 | 14 |
| Coding Conventions | General（一个文件一个组件、解构、命名、错误信息、DRY）· Enums · Themes · JSX（render function、constants、i18n、sentence case） | 50 |
| Tooling | ESLint 和 Prettier 各管什么；推送前跑 `format`、`lint`、`typecheck` | 5 |
| Data · State | DAL、`$transaction`、批量写、`select`；Zustand 三条 | 8 |
| Version Control | 本地和远程 session、不推 main、推送前清单（原 `push.md`）、分支名、只处理已提交的 review | 12 |
| Commands | | 13 |
| 合计 | | 约 185 |

CLAUDE.md 只剩 `@AGENTS.md`；`.claude/skills/` 和 `.claude/commands/` 都删掉。
