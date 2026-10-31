# Spike: Mockup hosting and the design-phase workflow

**Status: decided** · 2026-10-31（三轮 owner review：PR #100、PR #102） · 回答 tracker 条目 *Mockup hosting and a design-phase workflow*（Cross-cutting › High）· 基于 main `3b0a15c`，起因是 PR #100（backlog stacking 的 mockup）· 相关：`design/README.md` › Mockups、AGENTS.md › UI Workflow 和 Version Control、`test/README.md`、`src/proxy.ts`、`e2e/fixtures.ts`

> 语言约定：叙述用中文；产品名词、工具名、URL、命令和代码标识保留英文（mockup、preview、Deployment Protection、`test.fail`、`src/proxy.ts`），和代码、tracker 一一对应。

这份 spike 分五部分：起因；mockup 怎么 host（四个方案，附本次实测）；Vercel preview URL 能不能事先确定；design phase / implementation phase 的标准化流程；待 owner 决定的问题。

## Decision · 拍板（2026-10-31）

owner 在 PR #100（第 1 轮）和 PR #102（第 2、3 轮）上逐条回复了 Q1–Q10。

| 问题 | 结论 | 带来的变化 |
| --- | --- | --- |
| Q1–Q3 · Hosting | **C**：先用 `raw.githack.com` 看效果；B（app 上的 `/mockups` route）搁置，Q2、Q3 随之不适用 | `design/README.md` › Mockups 写 link 格式 |
| Q4 · 两个 PR | **拆**：design PR（mockup → review → contract，定稿即 merge）+ implementation PR（从 `main` 开，不 stack） | AGENTS.md › UI Workflow 和 *One task, one branch, one PR* 的例外 |
| Q5 · 命名 | **一个名字用到底**：`mockup-<area>.html`，不再 `temp-` → `mockup-` | `design/README.md` › Mockups |
| Q6 · Contract | **(a) `contractTest(title, failsAt, body)`**，放 `e2e/contract/<feature>.spec.ts`，e2e 文档写明那里是还没实现的行为 | `e2e/fixtures.ts`、`test/README.md` › e2e |
| Q7 · 标准化 | **skill + CI check**：PR 改了 mockup 却没在 description 里链接时 check 变红 | `.claude/skills/ui-design/`、Mockup links workflow |
| Q8 · PR #100 | spike 拆到 PR #102；PR #100 只留 mockup，等这份 spike 定下来再回去 | — |
| Q9 · 翻转触发 | **(i) CI 报错带命令**：contract 通过时报 `Run npm run contract:flip <feature>`；owner 加了一条：**`contract` project 每次最先跑，fail fast** | `contract:flip` codemod；Playwright 里其余 project 都依赖 `contract` |
| Q10 · skill 触发 | **自动触发**：不设 `disable-model-invocation`，description 写清何时用 | 同 Q7 |

**第 1 轮 review 之后**（2026-10-31，PR #100 上）：hosting 先用方案 C 看效果，B 暂不做；design PR / implementation PR 拆开；mockup 一个名字用到底（`design/README.md` 已改）。第 2 轮（PR #102 上）：Q6 选 (a)，contract 放 `e2e/contract/`，翻转要做成机械动作（见 *Contract 的翻转*）；Q7 采用 CI check，skill 要能自动触发。还开着 Q9、Q10，见文末。

**最初的推荐**：方案 B，在 production 上加一个 route `/mockups/<branch>/<file>`，它从 GitHub 读该 branch 上的 `design/mockup/<file>` 原样返回。URL 只取决于 branch 名和文件名，push 之后马上能开，不用等 Vercel preview。它也不经过 Deployment Protection 和 app 的登录，agent 开 PR 时就能把 link 写进 description。Vercel preview 的 branch URL 只在 branch 名够短时才能事先算出来：超过 63 字符的 label 会被截断并加 hash，hash 的算法没有公开文档。流程上拆成两个 PR：design PR 合入 mockup 和 `test.fail` contract，implementation PR 翻转 contract 并删掉 mockup。两条现有规则要改：*One task, one branch, one PR* 和 mockup 的 `temp-` 命名。

## 起因

现在看一个 mockup，owner 要 checkout agent 的 branch，再在浏览器里打开 `design/mockup/*.html`。让 agent 把 HTML 贴进对话又浪费 token。目标流程：

1. owner 提一个 UI 需求。
2. agent 做 mockup，push 后 mockup 有一个可访问的 URL。
3. agent 把 link 写进 PR description（最好不用等 preview deploy，少一次 LLM 调用）。owner 点开就能看，不用登录。
4. owner 在 PR 里留言或贴截图，agent 改，直到 design 定稿。
5. design 定稿后，agent 写 e2e contract（`test.fail`），CI 通过。

1–5 是 design phase，结束就 merge。之后是 implementation phase：照现在的 dev flow 做，把 `test.fail` 翻成 `test` 并确保 e2e 通过，同时删掉 mockup。

## 现状和实测（2026-10-31）

| 事实 | 实测 |
| --- | --- |
| 仓库 `Marsuu1994/mars-workbench` 是 **public** | `list_repos` 返回 `visibility: public` |
| Production `https://mars-workbench.vercel.app` 不受 Deployment Protection | `GET /auth/login` → 200 |
| Preview（含 `*-marsuu1994s-projects.vercel.app` 这类 generated URL）受 **Vercel Authentication** 保护 | PR #100 的 preview `GET /design` → 302 到 `vercel.com/sso-api`。浏览器里登录了 Vercel 的人能进，其他人不行 |
| app 自己的登录（`src/proxy.ts`）挡住除 matcher 例外以外的所有 path；Design Console 只在 `next dev` 下免登录 | 读 `src/proxy.ts` |
| `raw.githubusercontent.com` 能按 branch 取文件，但返回 `text/plain`、`nosniff`、`sandbox` CSP，浏览器不会渲染成页面；CDN `max-age=300` | `curl -I` PR #100 的 mockup |
| 第三方 `raw.githack.com` 对 public 仓库按 branch 返回 `text/html` | `curl` → 200 `text/html` |

## 一、Mockup 怎么 host

### 方案 A：Preview 上的静态文件

mockup 放到（或 build 时拷到）`public/mockups/`，preview deploy 后访问 `<preview>/mockups/<file>.html`。`src/proxy.ts` 的 matcher 加上 `mockups` 例外。

- 优点：标准 Next.js 静态文件，零运行时代码；看到的就是这次 deploy 的内容。
- 缺点：
  - 要等 preview deploy（1–3 分钟）才能看到。
  - Preview 受 Vercel Authentication 保护。owner 登录了 Vercel 能看，但不是"不需要 auth"。要真正公开，就得关掉 preview protection，或者每个 preview 加 Deployment Protection Exception（逐域名加）。Shareable Link 是另一种办法，也要逐 branch 生成。
  - URL 不一定能事先算出来，见下一节。
  - mockup 会进 production build（`public/` 全部打包）。design PR merge 之后、implementation PR 删掉之前，production 上也会公开有这些文件。
- 实施：`public/mockups/`（或 `prebuild` 从 `design/mockup/` 拷贝），改 matcher。link 要么等 Vercel bot 评论出现后再写，要么用 GitHub Action 在 `deployment_status` 成功时把 link 写进 PR body（见第二节）。

### 方案 B（推荐）：Production 上的 mockup route，按 branch 从 GitHub 读

`GET https://mars-workbench.vercel.app/mockups/<branch>/<file>.html` 去取 `https://raw.githubusercontent.com/Marsuu1994/mars-workbench/<branch>/design/mockup/<file>.html`。拿到后用 `text/html` 原样返回，并带 `Content-Security-Policy: sandbox allow-scripts`。

- 优点：
  - URL 完全确定：`/mockups/claude/board-backlog-stacking-contract/temp-board-backlog-stacking.html`。agent 开 PR 时就能把 link 写进 description，不用等任何 deploy。
  - Production 不受 Deployment Protection，route 也在 `proxy.ts` 例外里，点开就能看。
  - 一个 route 服务所有 branch，以及 merge 之后的 `main`。mockup 不进 build。
  - 仓库本身就是 public，没有暴露新内容；不需要 GitHub token。
- 缺点：
  - raw CDN `max-age=300`：push 之后，同一 URL 最多 5 分钟还是旧版本。缓解：agent 改版后给带 commit SHA 的 link（`/mockups/<sha>/<file>`，同一个 route 也接受 SHA）。也可以升级成 GitHub contents API 加只读 token，没有 CDN 延迟，但要在 Vercel 上配 secret。
  - 运行时依赖 GitHub 可用。
  - production 上多了一条 route，第一次要随一个 PR 部署上 production。
- 安全：mockup 是 agent 写的 HTML，和 app 同 origin。`sandbox allow-scripts`（不带 `allow-same-origin`）让页面变成 opaque origin，读不到 app 的 cookie 和 localStorage。只接受 `design/mockup/*.html`，`<branch>` 只允许 `[A-Za-z0-9._/-]` 且不含 `..`，只取本仓库。另加 `X-Robots-Tag: noindex`。
- 实施（一个小 PR）：
  1. `src/lib/mockups/fetchMockup.ts`：校验 ref 和文件名，fetch raw，返回 `{html} | null`（按 AGENTS.md › Layers，route handler 只做转交）。
  2. `src/app/mockups/[...path]/route.ts`：拆出 ref 和 file，调 `fetchMockup`，404 或返回 HTML 加上述 header。路径格式是 `[...path]`，因为 branch 名里有 `/`，文件名取最后一段。
  3. `src/proxy.ts` matcher 加 `mockups` 例外。
  4. 单元测试覆盖 ref 和文件名校验。
  5. `design/README.md` › Mockups 写 URL 格式。

### 方案 C：第三方渲染（`raw.githack.com`）

`https://raw.githack.com/Marsuu1994/mars-workbench/<branch>/design/mockup/<file>.html`，零代码，今天就能用（实测 200 `text/html`）。

- 优点：不写代码，URL 确定，不用登录。
- 缺点：依赖一个第三方免费服务（可用性、缓存行为都不归我们管）；也不在 Next.js app 上，和 owner 的需求不符。适合方案 B 落地前的过渡。

### 方案 D：Claude Artifact

agent 把 mockup 发布成 claude.ai 的私有 artifact，link 写进 PR。

- 优点：不用部署，渲染好的页面直接看。
- 缺点：内容不在仓库里，和 `design/mockup/` 两份要同步；PR 里 owner 的截图评论对不上版本；artifact 只有 owner 自己能打开。

### 对比

| | URL 事先确定 | 不用等 deploy | 不用登录 | 改代码 | 外部依赖 |
| --- | --- | --- | --- | --- | --- |
| A preview 静态文件 | 仅短 branch 名 | ✗ | ✗（Vercel 登录） | 小 | — |
| **B production route** | ✓ | ✓ | ✓ | 小 | GitHub raw |
| C githack | ✓ | ✓ | ✓ | 无 | 第三方 |
| D Artifact | ✓ | ✓ | owner 自己 | 无 | claude.ai |

## 二、Vercel preview URL 能不能事先确定

Vercel 文档（Generated URLs，2026-09-08 版）给出的 branch URL 格式是固定的：

```text
<project-name>-git-<branch-name>-<scope-slug>.vercel.app
```

本项目是 `mars-workbench-git-<branch-slug>-marsuu1994s-projects.vercel.app`，`/` 换成 `-`。但 DNS label 上限 63 字符，超过就截断：

- 截断的规则文档只说 "Vercel truncates it"。PR #100 的 branch `claude/board-backlog-stacking-contract` 拼出来 78 字符，实际 URL 是 `mars-workbench-git-claude-board-bac-c8deff-marsuu1994s-projects.vercel.app`：branch 只留前缀，再加一个 6 位 hash。
- 这个 hash 我用 branch 名、全 label、project id 等组合试了 `hashlib` 的全部算法，都没对上。算法没有公开，不能当成可推算的规则。
- 不截断的条件：`19 + slug + 21 ≤ 63`，即 branch slug 最多 **23** 字符，去掉 `claude-` 只剩 16 个。这和 AGENTS.md 要求的描述性 branch 名冲突。

所以：短 branch 名时可以事先确定；一般情况不行。替代办法有两个：

- **GitHub Action**（不需要 LLM）：监听 `deployment_status`（Vercel 会把 deployment 回报给 GitHub，带 `environment_url`），成功时把 `<preview>/mockups/...` 写进 PR body 的一个标记块。
- **Preview Deployment Suffix**（Pro / Enterprise）：把 `vercel.app` 换成自己的域名，但截断规则照样适用。

另外不管 URL 能不能算，preview 都要过 Vercel Authentication（上表实测）。方案 B 两个问题都绕开了。

## 三、Design phase / implementation phase 的标准化

### 流程

**Design PR**（branch `claude/<feature>-design`）

1. owner 提 UI 需求 → agent 读相关 flow、scenario 和现有组件，写 mockup `design/mockup/mockup-<area>.html`。
2. push，开 PR。description 顶部固定一节 **Mockups**，每个文件一条 link（现在是方案 C 的 githack 格式，push 时就确定）。tracker 条目指向这个 mockup。
3. owner 在 PR 留言或贴截图 → agent 改 mockup，push。循环到 owner 说定稿。
4. 定稿后写 e2e contract：每条行为一个 `test.fail`，名字对应 tracker 条目。需要的 seed 改动一起做。CI 绿。
5. merge。tracker 条目写明"design merged，contract 在 `e2e/<spec>`"。

**Implementation PR**（新 branch，从 merge 后的 `main` 开）

1. 照现在的 dev flow 做；把 contract 的 `test.fail` 翻成 `test`，e2e 全绿。
2. 同步 Design Console 的 scenario 和 gallery，删掉 mockup（AGENTS.md › UI Workflow 已有这条）。
3. tracker 条目删除。

### 标准化需要改的规则

| 位置 | 现在 | 改成 |
| --- | --- | --- |
| AGENTS.md › Version Control › *One task, one branch, one PR* | 一个 task 一个 PR；Bad 例子就是 "a spike PR plus a stacked implementation PR" | 加一个例外：UI 任务拆成 design PR 和 implementation PR，后者在前者 merge 之后从 `main` 开，不 stack |
| AGENTS.md › UI Workflow › *New UI starts as a mockup* | "get the owner's approval before code changes" | approval = design PR merge；指向 `design/README.md` 的流程 |
| `design/README.md` › Mockups | iterating 时 `temp-<area>.html`，approved 后改名 `mockup-<area>.html` | 去掉改名：一个名字从头到尾，URL 不变，owner 的评论 link 不失效。加 URL 格式和 design / implementation 两步 |
| `test/README.md` | "A known bug is an `it.fails`" | e2e 一节加：`e2e/contract/` 放 design 已定、**还没实现**的行为，每条是 `contractTest`，名字对应 tracker 条目；implementation PR 用 `npm run contract:flip` 翻转 |

### 让 contract 只在"对的原因"上失败

PR #100 暴露了一个缺陷：Playwright 的 `test.fail` 只要测试失败就算通过，不管失败在哪。如果 contract 里一个 helper 自己就坏了（比如展开 backlog 的那一步），它也会"按预期失败"。这个问题要到 implementation PR 翻转时才暴露。可选的补法：

- **(a) `contractTest` helper**（`e2e/fixtures.ts`）：`contractTest(title, failsAt: RegExp, body)`，`body` 和以后的 `test` 一字不差，多出来的只有 `failsAt`。它在 `test` 里跑 body、捕获错误：body 通过了 → 报错 "contract now passes, flip it"；错误信息不匹配 `failsAt` → 报错（失败在了不该失败的地方）。implementation PR 的翻转和 `test.fail` → `test` 一样是一行改动：`contractTest('…', /×2/, async …)` 改成 `test('…', async …)`，body 不动，所以 contract 本身不变，`failsAt` 只是 design 阶段的一个"失败位置"的注记。代价是多一个 helper，以及超时类的失败捕获不到（仍算普通失败）。
- **(b) 约定**：每条 contract 第一段只做今天就成立的事（打开页面、展开面板），并把这段抽成一条普通 `test` 先跑。
- **(c) 维持现状**：靠 implementation PR 发现。

### Contract 的翻转（第 2 轮加）

owner 的两个要求：contract 放 `e2e/contract/` 下，e2e 的文档写明那里是还没实现的行为；翻转要是机械动作，agent 不用花心思。

**Design 阶段**：一个 feature 一个文件，`e2e/contract/<feature>.spec.ts`，里面每条都是 `contractTest(title, failsAt, body)`。Playwright 加一个 `contract` project 只跑这个目录。

**翻转**：`npm run contract:flip <feature>`，一个纯文本的 codemod，有自己的单元测试：
1. 每个 `contractTest('…', /…/, async …)` 改成 `test('…', async …)`：换函数名、删掉第二个参数，body 不动；
2. import 从 `contractTest` 换成 `test`；
3. `git mv e2e/contract/<feature>.spec.ts e2e/features/<feature>.spec.ts`。`features` project 跑 `e2e/features/`，和 journeys 一样在 smoke 之后。

**谁来触发**，四个位置：

| 位置 | 怎么做 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **(i) CI 报错带命令（推荐）** | 一条 `contractTest` 通过时，它自己报错：`contract passes — run npm run contract:flip <feature>`。agent 看到红 CI，照着跑一行命令、commit | 确定性；agent 不用判断"该不该翻"，CI 告诉它翻哪个；不需要额外权限 | 多一轮 CI：实现完先红一次，翻转后再绿 |
| (ii) CI 自动 commit | contract job 发现一个文件全部通过，就跑 flip 并 push 到 PR branch | 完全不用 agent | 用 `GITHUB_TOKEN` push 的 commit 不会再触发 CI，要配 PAT 或 GitHub App；CI 往 branch 写东西，和 agent 的 push 互相冲突；一个文件部分通过时怎么办要另定 |
| (iii) Claude Code hook | `Stop` 或 push 前的 hook 跑 contract、通过就翻 | 在 session 里自动 | 每次都要起本地 stack 跑 Playwright，几分钟；只在 Claude session 里生效 |
| (iv) git pre-push hook | push 前跑 | 不依赖 Claude | 同 (iii)，更慢，而且每次 push 都跑 |

推荐 (i)：判断"实现完了没有"本来就是 CI 跑 contract 得出的，CI 顺手说出要跑的那一行命令，翻转就是机械的。(ii) 省掉最后一行命令，代价是一套写权限。如果 (i) 用下来嫌多一轮 CI，再升级到 (ii)。

一个文件里只有部分 contract 通过时，说明实现还没做完，CI 保持红，报错列出已通过的条目。多个 PR 做一个 feature 时，每个 PR 一个 contract 文件。

### 自动化的程度

- **最小**：只改文档。agent 开 PR 时手写 Mockups 一节（方案 B 下 URL 可以直接拼出来）。
- **中等**：加 `.claude/skills/ui-design/SKILL.md`，把上面的流程、PR description 模板、contract 写法打包。Claude Code 的 skill 默认就会自动触发：模型看到 skill 的 description 和当前任务对得上就自己加载，只有设了 `disable-model-invocation` 才必须手动 `/ui-design`。所以写一个 description 说清什么时候用（"owner asks for new or changed UI"），agent 收到 UI 需求就会自己用。
- **加一个 CI check**：PR 改了 `design/mockup/*.html`，description 里却没有对应 link 时，check 变红。确定性的，不需要 LLM。

## 待 owner 决定的问题

1. ~~**Hosting 方案**~~ → **C 先用着**，owner 看效果再定是否做 B。
2. ~~**方案 B 的 CDN 延迟**~~ → 用 C，暂不适用。
3. ~~**Production 上的 mockup route**~~ → 用 C，暂不适用。
4. ~~**两个 PR 的拆分**~~ → **同意拆**：design PR 和 implementation PR。规则改动随 Decision 一起落（AGENTS.md › Version Control、UI Workflow）。
5. ~~**Mockup 命名**~~ → **一个名字用到底**（`mockup-<area>.html`），`design/README.md` › Mockups 已改，并写了方案 C 的 link 格式。
6. ~~**Contract 的失败原因**~~ → **(a) `contractTest`**，放 `e2e/contract/`，翻转做成机械动作（见 *Contract 的翻转*）。
7. ~~**标准化程度**~~ → **CI check 采用**；skill 要自动触发（默认就是，见 *自动化的程度*）。
8. ~~**PR #100 怎么办**~~ → spike 拆到自己的 PR；PR #100 先去掉 e2e contract，按新流程 mockup 定稿后再写，等这份 spike 定下来再回去。
9. ~~**翻转由谁触发**~~ → **(i) CI 报错带命令**，`contract` project 最先跑、fail fast。
10. ~~**`ui-design` skill 自动触发**~~ → 可以。
