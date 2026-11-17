# Spike: Spec v2 — 一个页面一份 spec，component test 管 UI

**Status: decided** · 2026-11-16（当天定）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（habit / project / step / one-off / backlog、`toBoardCards`、`updateTaskStatusAction`），和代码、mockup、tracker 一一对应。

取代 `archived/spec-layers-ui-contract.md` 的提案部分。那份 spike 里仍然有效、这里沿用的：数据规则写在每条写入路径都经过的地方（已经进了 AGENTS.md › Layers）；「数据决定的顺序是 rule」；旧东西只减不增的想法（那份 spike 设计成通用的 ratchet，这里简化成 `check:spec` 的检查，见 §6）；以及它的 flow 审查和修复，都已经落地。

## 起因 · Trigger

Backlog stacking 是第一个按旧 spike 的格式写 spec 的功能（tracker › Board）。这个 session 在 `design/flows/board/` 里把格式改了四次：

1. **四节**（Visual / Steps / Rules / Interactions，一个 flow 一个文件）：drag and drop 是交互方式，不是 flow；把 board 拆成 flow，边界怎么划都别扭。
2. **Read / Write 两个文件**：一个页面一份，Read 写它读什么、怎么用，Write 写它写什么。比四节好，但两个文件之间互相引用（「见 Write › Pull」），每一节末尾的「Tested in」也越写越乱。
3. **每句一个 ID，每个 ID 一个 test**：太细，读的人喘不过气，维护起来很重。
4. **合成一份，只给 rule 和 action 写 test，visual 单列**：读起来最顺，但还是回答不了「这一条用什么测」。

根源是**没有 component test**。一条 UI 行为（Done 卡片拖不动、拖到 Done 立刻出现在顶上、失败时卡片回去）只有两个地方能测：e2e 太重，而且需要真实的数据库；Design Console 的 scenario 只能保证页面渲染出来、不报错。所以 doc 里每一条都要先想「它到底能在哪测」，再选措辞去迁就那个 test。描述性的东西（卡片有哪些部分、Done 卡片变暗）干脆就测不了。

## 提案

### 1. 测试分层：规则在哪一层发生，就在哪一层测

| 层 | 管什么 | Board 的例子 | Runner |
| --- | --- | --- | --- |
| **unit** | 纯函数里的衍生值 | Todo 和 Done 的顺序（`sortTasks`、`sortDoneTasks`）、dots 怎么算（`computeHabitWeeks`）、计数封顶在 `8+` | Vitest，node |
| **integration** | server 上的规则，以及 action 在 server 那一半 | 只能往前（`updateTaskStatus` 的 `WHERE`）、recap 怎么算 | Vitest，真实的 Postgres |
| **component**（新增） | 给了正确的数据，组件显示得对：有哪些部分、标记什么、变暗、隐藏；用户动作调对 action、乐观更新、失败回滚；UI 上的限制 | Done 卡片变暗、标题划掉、不是 drag handle；拖到 Done 立刻出现在顶上，失败时回到 Todo | Vitest browser mode，Chromium |
| **e2e** | 每天怎么用这个 app：关键 journey 的 happy path，从头到尾接通 | 打开 backlog → 拉一张卡到 Todo → 拖到 Done → reload 之后还在 | Playwright，本地的 Supabase stack |

- **逻辑在哪，test 就在哪。** 以 Done 的排序为例：它在 `sortDoneTasks`（纯函数，`toBoardCards` 在 client 上调用），所以是 unit test。如果它写在组件里（inline 的 `.sort()`），就是 component test；如果它在 DAL 的 `orderBy` 里，就是 integration test。AGENTS.md 已经要求衍生的逻辑放进 `src/utils/` 的纯函数，所以大部分衍生规则都会落在 unit test 上，component test 不必再测一遍顺序。
- **ID 和 test 是多对多。** 一个 test 可以守几个 ID，一个 ID 也可以被几个 test 守住，只要每个 ID 至少有一个 test。一条的几部分落在不同层，就每层各测一次，用同一个 ID（returning user 的 recap：server 算数是 integration，empty board 显示是 component，都叫 ST-2）。两句不同的话还是两条，哪怕说的是同一件事：UI 不提供这个操作是一条（component），server 拒绝是另一条（integration）。
- **Design Console 留着**，给 owner 浏览和验收用，smoke test 照旧跑。上一轮讨论的「scenario test」不做了。

### 2. Component test 怎么搭

**工具**：Vitest browser mode，用 `@vitest/browser-playwright` 和 `vitest-browser-react`。vitest 5.1.0 和 vitest-browser-react 2.3.0 都支持 React 19，我已经用 `npm view` 查过。测试跑在真实的 Chromium 里：真实的 CSS、focus、keyboard 和 layout，所以「变暗」「划掉」可以读 computed style 来验证，不用去断言 class name。CI 的 e2e job 本来就装了 Chromium。

- **一个新的 Vitest project `component`**：`src/**/*.test.tsx`，放在组件旁边。现有的 unit test 都是 `.ts`，两者不冲突。
- **渲染的是页面的 container**（`BoardPage`）或它下面的组件，props 的形状和 read action 返回的一样。不渲染路由的 `page.tsx`，它是 async Server Component，那一段由 action 的 integration test 来测。Page structure 的规则（AGENTS.md：container 从 props 拿到 rows）正好让这一层可以测。
- **Server action 是 mock 的边界**：`vi.mock('@/actions/taskActions')`。mock 的是 action 本身，不是 `revalidatePath`。`revalidatePath` 在 server 上运行，组件根本看不到它。**「revalidate 之后的数据」用 `rerender` 传入新的 props 来模拟**，和 production 里 Next 换掉 props 的效果一样。另一个原因是：`'use server'` 的模块会 import Prisma，不 mock 的话进不了浏览器。
- **乐观更新的测法**（`useOptimistic` 的语义）：
  - 成功：action 返回一个还没 resolve 的 promise → 断言卡片已经在 Done → `rerender` 传入 server 的新列表 → resolve → 卡片还在。
  - 失败：resolve `{error}`，不 `rerender` → 卡片回到 Todo，其他卡片不动。
  - 两种情况都断言 action 收到的参数（`taskId, {status: DONE}`）。
- **Providers 放在一个 helper 里**（`test/renderPage.tsx`）：`NextIntlClientProvider`（用 `en.json`）、`BreakpointProvider`，以及 `next/navigation` 的 mock（Projects 页用到 `?project=`）。Mobile 的测试在 test 里切 viewport。
- **Fixture**：Design Console 的 `scenarios/<feature>/fixtures.ts` 已经是「一个合理的一周」，component test 直接用它，不再造一份（Q1）。

示意（API 以 PR 1 第一步跑通的为准）：

```tsx
vi.mock('@/actions/taskActions');

it('CARD-2 a Done card is dimmed and struck through', async () => {
  const screen = await renderPage(<BoardPage {...MID_WEEK_BOARD} />);
  const title = screen.getByRole('heading', {name: BIO_LECTURE_3.title});
  await expect.element(title).toHaveStyle({textDecorationLine: 'line-through'});
});

it('A2 Finish moves the card to the top of Done at once, and back when it fails', async () => {
  const save = deferred<{error: unknown}>();
  vi.mocked(updateTaskStatusAction).mockReturnValue(save.promise);
  const screen = await renderPage(<BoardPage {...MID_WEEK_BOARD} />);

  await dragOneColumnOn(screen, WORKOUT.title);       // keyboard drag
  await expect.element(firstCardIn(screen, 'DONE')).toHaveTextContent(WORKOUT.title);
  expect(updateTaskStatusAction).toHaveBeenCalledWith(WORKOUT.id, {status: 'DONE'});

  save.resolve({error: 'taskNotFound'});
  await expect.element(cardIn(screen, 'TODO', WORKOUT.title)).toBeVisible();
});
```

### 3. Doc 格式：一个页面一个文件

`design/flows/<page>.md`，例如 `flows/board.md`（取代现在这份）。几节固定的内容：

| 节 | 写什么 | 主要由什么测 |
| --- | --- | --- |
| **States** | 页面有哪几种状态，每种读什么数据（data source） | integration（read action），e2e 的 Entry journey |
| **一个区域一节**（Columns、Task cards、Backlog……） | 描述这个区域：有哪些部分、每个部分标记什么；**每个数字说清它数的是什么、从哪来；每个列表说清它的顺序** | 衍生值用 unit，显示用 component |
| **Actions** | 表格：`ID · Action · Where · Server action（纯客户端写 —）· Result` | client 那一半用 component，server action 用 integration |
| **Rules** | 动作的限制，每条只写一个地方（UI，或 server） | component 或 integration |
| **Journeys** | 每天怎么用：由 action ID 串起来，只写 happy path | e2e |

- **不写的**：user-facing 的文案原文、像素、颜色、具体位置。实现前看 mockup，实现后看 Design Console。
- **整节 as is**（board 的 Progress，Phase 2 会重写）：开头标 `> As is.`，不给 ID，不进检查。
- **不写 test 在哪个文件。** 「Tested in」那一行取消。ID 和 test 的对应由 test 的标题负责（§4）。

**ID**：

- 格式是 `<区域>-n`（`BL-3`、`CARD-2`、`A4`、`R1`、`J2`）。ID 永远不重新编号，也不重复使用；删掉一条规则时，它的 test 一起删掉。
- 标记：`(pending)` 是已经设计、还没做；`(bug)` 是已知的 bug，对应一个 `it.fails`。
- **粒度**：一个 ID 是一句 test 标题能说清的事。一个区域一般 3 到 8 条。一张卡片的「有哪些部分」是一条，不是每个字段一条。

例子：Backlog 一节，加上 project step pile 那次 design PR 之后的样子：

> **BL-1** Holds the plan's `BACKLOG` tasks: habit instances and the project steps scheduled this week. Never one-offs.
> **BL-2** The count is every staged task, not every group; past 8 it reads `8+`, its accessible name keeps the real number.
> **BL-7** *(pending)* A habit's staged instances are one group, a project's staged steps another: habits first (daily, then weekly), then projects, each by earliest `createdAt`.
> **BL-8** *(pending)* A group shows one card, its next task, on a pile: one thin sheet per task behind it, at most three; **+N more** counts them.
>
> | ID | Action | Where | Server action | Result |
> | --- | --- | --- | --- | --- |
> | A3 | Pull to Todo | drag a backlog card onto Todo (desktop), ↑ Todo (mobile) | `updateTaskStatusAction` → `TODO` | *(pending)* takes the group's next task; the group shows the one behind it |
> | A8 | Expand a project *(pending)* | a project group's **+N more ⌄** | — | its queue, the steps behind the next in step order, replaces the pile |

### 4. TDD：spec 先行，test 跟着实现补上

上一份 spike 的做法是：design PR 就把 e2e 写成 `contractTest`，implementation 只要把 CI 做绿。实际的问题是：在 design 阶段把 test 全部写好太早了，组件还不存在，test 只能对着 mockup 猜 DOM。这一份改成：**spec 先行，test 由 rule 约束**。

1. **Design PR**：mockup，加上 spec 的改动。新增或改动的条目标 `(pending)`。不写 test。
2. **Implementation PR**：对每条 pending 的条目，先写一个会失败的 test，再写代码让它通过，最后删掉 `(pending)`。PR 的范围就是它清掉的那些 pending。
3. **三道保障**：
   - **CI：`check:spec`**，机械地检查，很便宜：
     - 每个不是 pending 的 ID 至少有一个 test，标题以它守的 ID 开头，可以是几个（`it('BL-2 …')`、`it('CARD-2 R4 …')`、`test('J2 …')`、`test.step('A3 …')`）；
     - 每个 `(bug)` 的 ID 有一个 `it.fails`；
     - 没有 test 指向不存在的 ID，或者还是 pending 的 ID；
     - ID 不重复。
   - **Reviewer agent `spec-reviewer`**（新的 subagent），在本地 push 之前跑。对 diff 里每个改动的 ID，回答两个问题：test 断言的是不是描述里说的那件事？它在不在行为实际发生的那一层？每个 ID 给一个 PASS / FAIL。这类语义判断 CI 做不了。
   - **Skill**：implementation 的步骤写成一个 skill（Q2）。它要求 test 写得省：同一层、同一个场景能一起断言的几个 ID 放进一个 test（`it('CARD-2 R4 …')` 守住了 R4，就不再单独写一个 R4 的 test）；只有层不同，或者场景要另搭，才拆开。顺便定下 PR #106 的 Q12–Q13，也就是 ui-design skill 里「After the design is decided」那一节一直空着的部分。
4. **退役 e2e contract**：`contractTest`、`contract:flip`、`scripts/flipContract.ts`、`e2e/contract/`（现在是空的）。pending 的 ID 取代了它们（Q5）。

例子（project step pile）：

- design PR 加了 BL-7、BL-8、A8，并把 A3 和 A4 的 Result 改成 pending。
- implementation PR 补 test：
  - unit：BL-7 的分组顺序。
  - component：BL-8 的 pile 层数和 +N more；A8 的展开；A3 拖一个 group 只拿走 next，后面一张顶上来。
  - e2e：J2 那条 journey 加上 A8。
- 每补一个 test，就删掉对应的 `(pending)`。

### 5. 推广到其他 doc

| Doc | 合适吗 | 限制 |
| --- | --- | --- |
| board、projects、priorities、dump | 合适：都已经用 page structure（container 从 props 拿 rows） | 无 |
| plan | 暂时不合适：它还没用 page structure，表单的 state 很大，还有多步 review | 等 Phase 2 的 Plan week 改造；之前留在 baseline 里 |
| auth & settings | 部分合适：登录和 consent 是 server route 和 redirect | Actions 大多是 route，用 integration 和 e2e 测；component 只覆盖 settings sheet |
| shared（sync） | 没有页面 | 只有 Rules 一节，用 integration 测 |
| mcp | 没有页面 | Actions 一行一个 tool（`ID · Tool · Service · Result`），用 `/api/mcp` 的 in-process integration test；Rules 只放 server 强制的规则，模型的行为看 guide（顺便定下旧 spike 的 Q8） |

**Component test 本身的限制**（它做不了的，留给 e2e 或别的层）：

- async Server Component 和路由；
- 需要真实 server 的东西（revalidation 的真实时机、redirect、cookie）；
- 用鼠标拖动（dnd 用 keyboard 可以，和 e2e 一样）；
- 时区：浏览器的时区不跟 `TZ` 走，日期逻辑本来就在 utils 里，由两个时区的 unit test 覆盖。

### 6. 新旧 doc 共存

旧 spike 设计的是一个通用的 ratchet（四个比较加 `ratchet:prune`）。现在只有这一条迁移，所以简化成 `check:spec` 里的几条检查（owner，2026-11-17）。等出现第二条迁移，再按两个真实的例子抽成通用的。

- **清单**：`design/flows/legacy.txt`，列出还是旧格式的 doc：auth、dump、mcp、plan、priorities、projects、shared。`check:spec` 跳过这些 doc 的 ID。
- **规则一句话**：旧 doc 可以改错，不能加东西；要加东西，就先把整个 doc 迁到 v2。不混写：一个 doc 要么全是 v2，要么全是旧格式。
- **`check:spec` 检查**（和 branch 从 main 分出来的那个点比）：
  - 不在清单上的 doc 必须有 ID；
  - 清单上的 doc 有了 ID，或者已经不存在，就要从清单里删掉；
  - 清单只能变短；
  - 清单上的 doc，heading 和列表项不能比 main 上多。只改文字不报错，也不 warn。
- **Test 那边不需要清单**：`check:spec` 只检查 v2 doc 里的 ID。没有 ID 的旧 test 不受影响，等它的 doc 迁移时再加上 ID。旧 e2e spec 的「一个 flow 一个 `describe`」也跟着它的 doc 一起走。`e2e/not-implemented.md` 在 PR 2 里删掉了：旧 doc 迁移时写 journey，就补上了 e2e（owner，2026-11-17）。
- **`flows/README.md`**：v2 成为正式格式，旧格式降级为「Legacy」一节，清单清空时删掉。

## 实施计划

四个 PR（owner，2026-11-16）。前两个迁移 board，后两个做 project step pile。

1. **PR 1 · spike 和 board spec**（这个 PR）：
   - 这份 spike 定稿，旧的归档；
   - `flows/board.md` 按 v2 重写，只写现在的 board，不写 pile；
   - `flows/README.md` 写 v2 的格式，旧格式降级为 Legacy。
   - 不写 test，不加工具。ID 先写在 doc 里，PR 2 让 test 的标题对上它们。
2. **PR 2 · test 框架、补 test、旧 doc 的清单**：
   - component test 跑通（先写两个 test，验证 CSS、`next/navigation` 的 mock、keyboard dnd、CI 时间；有一个跑不通就回来改 spike）；
   - board 现有的 test 加上 ID，补上 component test，让 board.md 的每个 ID 都有 test；
   - `check:spec`，以及旧 doc 的清单和检查（§6）；
   - 退役 e2e contract；`test/README.md`、AGENTS.md 跟着改。
3. **PR 3 · pile 的 design 和 spec**：
   - 把 mockup 完善好；
   - 往 board.md 里加 pile 相关的 pending 条目；
   - 写出 `implement-spec` skill 和 `spec-reviewer` agent 的初稿。
4. **PR 4 · pile 的实现**：
   - 按新流程清掉 pending；
   - 写完 `implement-spec` skill。

## Decision

2026-11-16，owner：

1. Fixture：component test 直接 import Design Console 的 `scenarios/<feature>/fixtures.ts`，不搬家。
2. Implementation 的步骤写成一个新的 `implement-spec` skill，`ui-design` 只管 design。
3. 旧 doc 新增 `##` 或新规则时，CI fail；只修改已有的文字时放行。原定的 warn 去掉了，ratchet 也简化成 `check:spec` 里的检查（2026-11-17，见 §6）。
4. 拆成四个 PR，见实施计划。这是 owner 要求的拆分，不受「one task, one branch, one PR」限制。
5. 退役 e2e contract（`contractTest`、`contract:flip`、`e2e/contract/`），在 PR 2 里做。
6. Component test 先不设 coverage floor。
