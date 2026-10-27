# Spike: Config-driven modals — 一个 modal 框架 + 按 id 开关

**Status: awaiting owner review** · 2026-10-27 · 回答 tracker 条目 Milestone — Quality gate › Step 10 › *Config-driven modals on the page structure*（含其下的 *Close on React's transition*）· 上游：`component-structure.md`（标准结构，Projects 页为准）、`archived/projects-page-refactor.md` ›「给 config-driven modal spike 的初步发现」、`archived/mutation-layer.md`（`useModalSubmit`、Next 首写 bug 和 16.4.3 的实测）

> 语言约定：叙述用中文；产品名词、状态和代码标识保留英文（project / step / one-off / habit、`OverlayShell`、`useModalSubmit`、`openModal` …），和代码、tracker 一一对应。

---

## Trigger · 起因

- Step 10 的第二件事：在 Phase 2（Habits 页、Plan week）开工之前，定下 modal 的写法。Phase 2 至少会多一个 Edit habit 的表单 modal（mockup `mockup-week-model-phase2.html`），Plan week 也会重做 Review changes。
- 标准结构（AGENTS.md › Layers › *Page structure*，`component-structure.md` 规则 5）留了一处 pending：「container 自己渲染的 overlay 收 callback props，等 config-driven modals 定写法」。
- Owner 的出发点（2026-10-27）：
  1. 现在的 modal 基本是同一个架构——header、description、一些可选项（size、quadrant）、action footer。完全可以做成 **config-driven + 一个通用 modal**：读 config，渲染需要的部分，action 传进去。
  2. 之前公司的做法：**用 hook 按 id 控制 modal 开关**。能不能和 1 融到一起？
  3. 加上我的想法和其他方案；**desktop / mobile 都要 cover**；mobile 上的 drawer 这类 modal-like 的东西不管。
- Owner 判断：其他页面还没改成标准结构，但思路相同，不影响这里的判断。本稿以 Projects 页为准来写，其他页面按「改成标准结构之后」来设计。

## 现状 · 现在有哪些 modal

范围内（drawer 除外）的 modal 一共 5 个，全部用 `OverlayShell variant="responsive"`：

| Modal | 用在 | 类型 | Shell 设置 | 内容 | 打开状态 |
| --- | --- | --- | --- | --- | --- |
| `ProjectModal` › `ProjectFormPanel` | Projects | 表单：create / edit；edit 带 Archive（footer 变 `ConfirmBar`） | 无 backdrop、corners、`max-w-lg p-0` | header · create 时一条 banner · title + goal · footer | `ProjectsPage` 的 `openModal` union（4 种 kind） |
| `StepModal` › `StepFormPanel` | Projects | 表单：add / edit；edit 带 Delete step（`InlineConfirmButton`） | 同上 | header + subtitle（project、步骤号）· title + description + size · footer | 同上 |
| `TaskModal` › `TaskModalPanel` | Plan form（template create / edit）、Priorities（adhoc） | 表单：3 个 mode | 同上 | header · adhoc 时一条 banner · title + description + size（+ adhoc 没有预设象限时的 quadrant）· footer | Plan：`isModalOpen` + `editingTemplate`；Priorities：`addModal` |
| `ReviewChangesModal` › `ReviewChangesPanel` | Plan form | 提交前的只读确认 | 有 backdrop、无 corners、`max-w-lg` + 高度上限 + body 滚动 | header · 分组的改动列表 · 自己手写的 Cancel + Confirm footer | `isReviewModalOpen` |
| `SettingsSheet` › `SettingsPanel` | 全局 | 设置，没有提交 | 有 backdrop、`md:max-w-[430px]` | header · 用户卡片 · theme · sign out（`ConfirmBar`） | `settingsStore`（Zustand） |

范围外：`MobileBacklog`、`MobileMoveToSheet`（mobile 专用的 bottom sheet，`variant="sheet"`）。archived spike 里的 `AiPlanChatModal` 已经不在代码里了。

**完全一样的部分**

- 3 个表单 shell（`ProjectModal`、`StepModal`、`TaskModal`）一字不差：`<OverlayShell variant="responsive" dismissOnBackdrop={false} corners boxClassName="max-w-lg p-0">{isOpen && <Panel …/>}</OverlayShell>`，每个 24–50 行。
- 3 个表单 panel 的骨架一样：`OverlayHeader`（`px-6`）→ `<form className="flex flex-col gap-4 px-6 pt-4 pb-6">` → 可选 `Banner` → fields → `ModalFormFooter`；提交都走 `useModalSubmit({freshData, onClose})`。
- 字段：title（3 处同一段 `<input>`）、description / goal（3 处同一段 `<textarea>`）、size（2 处 `SizePicker`）。
- 每个 mode 的 header 文案、submit 文案和图标：`TaskModalPanel` 已经写成 `MODE_COPY: Record<TaskModalMode, …>`，另外两个是三元表达式。
- `ReviewChangesPanel` 的 footer 是 `ModalFormFooter` 的手写副本（Cancel + Submit 1:2），只是 submit 是 `type="button"`。

**不一样的部分（config 要能表达，或者留给 JSX）**

- 破坏性操作有两种：两次点击的 `InlineConfirmButton`（Delete step）和把 footer 换成 `ConfirmBar` 的二次确认（Archive project、Sign out）。
- 条件字段：quadrant 只在 adhoc 且没有预设象限时出现；banner 只在某个 mode 出现。
- 成功之后的动作：Projects 新建后选中它（`pushState`）、archive 后 `replaceState`；Priorities 的 mobile 全局 add 弹一个 toast；其余只关闭。
- 要等哪份 server props（`freshData`）：Projects 等 `projects` 或 `steps`，Plan 等 `templates`，Priorities 等 `tasks`。

**Desktop / mobile 现在怎么分**：全部靠 CSS，同一棵 DOM，没有 JS breakpoint 判断。

| | mobile（< md） | desktop（≥ md） |
| --- | --- | --- |
| Shell | `modal-bottom`：贴底的 bottom sheet，全宽 | `md:modal-middle`：居中，`max-w-lg`，表单带 corners |
| Header（`OverlayHeader`） | 关闭按钮是向下的 chevron（sheet 的语言） | ✕ |
| Footer（`ModalFormFooter`） | Cancel : Submit 占一行，1 : 2；破坏性按钮在下面单独一行 | 按钮按 label 宽度排在右边，破坏性按钮在最左 |
| 高度 | 只有 Review changes 设了 `max-h-[85vh]` + body 滚动；表单没有上限 | Review changes `md:max-h-[calc(100vh-5em)]` |

已知问题（tracker › Plan）：Review changes 列表一长，header 被顶出屏幕。表单 modal 没有统一的「header / footer 固定、body 滚动」约定，Phase 2 的 habit 表单字段更多，mobile 上键盘弹起时会遇到同样的问题。

## 把问题拆成三根轴

Owner 的两个想法其实落在不同的轴上，可以各选各的，最后在 registry 那里合起来：

| 轴 | 问的是 | Owner 的想法 |
| --- | --- | --- |
| **1. 渲染** | 一个 modal 怎么声明：哪些是 config，哪些是 JSX | 想法 1：config + 通用 modal |
| **2. 开关** | open state 放在哪，怎么按 id 打开、拿到数据 | 想法 2：hook 按 id 开关 |
| **3. 提交** | 提交之后什么时候关、怎么等新数据 | （tracker 里已有的 *Close on React's transition*） |

---

## 轴 1 · 渲染：config 到哪一层

### Option 1A · 维持 shell + panel，只抽小件

每个 modal 还是一对 shell + panel，只把重复的字段抽成 `TitleField` / `NotesField`，Review changes 的 footer 改用 `ModalFormFooter`。

- 优点：改动最小，没有新抽象。
- 缺点：没回答 owner 的问题；shell 继续三份；每个新 modal（habit）照抄一份骨架；破坏性确认的 armed state 每个 panel 自己管。

### Option 1B · 框架是 config，body 是 JSX（推荐）

一个通用的 `ModalPanel`（`ui/overlay/`，不碰 domain）：header、banner、body 的滚动容器、footer 全部由一个**有类型的 config（props 对象）**驱动；字段作为 `children` 用 JSX 写。Shell 的设置收成几个 preset。

```tsx
// ui/overlay/constants.ts — shell 的设置收成 preset，一个 Record，新 preset 不处理就编译不过
export const OVERLAY_PRESET: Record<OverlayPreset, OverlayPresetConfig> = {
  form: {variant: 'responsive', dismissOnBackdrop: false, corners: true, boxClassName: 'max-w-lg p-0'},
  review: {variant: 'responsive', dismissOnBackdrop: true, corners: false, boxClassName: 'max-w-lg p-0'},
  settings: {variant: 'responsive', dismissOnBackdrop: true, corners: false, boxClassName: 'p-0 md:max-w-[430px]'},
};

// ui/overlay/ModalPanel.tsx — 一个 modal 的 header / body / footer，没有 <dialog>
interface ModalPanelProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  banner?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** 有它：body 是 <form>，primary 是 submit；没有：primary 是普通按钮 */
  onSubmit?: () => void;
  /** 没有 footer 的 modal（Settings）不传 */
  footer?: ModalFooterConfig;
  isPending?: boolean;
  error?: string | null;
  children: ReactNode; // 字段或内容，JSX
}

interface ModalFooterConfig {
  cancelLabel: ReactNode;
  primary: {label: ReactNode; icon: ReactNode; disabled?: boolean; onClick?: () => void};
  danger?: ModalDangerAction;
}

/** 两种破坏性确认，armed state 由 ModalPanel 自己管 */
type ModalDangerAction =
  | {kind: 'twoClick'; label: ReactNode; confirmLabel: ReactNode; onConfirm: () => Promise<void> | void}
  | {kind: 'confirmBar'; label: ReactNode; icon: ReactNode; prompt: ReactNode; detail?: ReactNode;
     cancelLabel: ReactNode; confirmLabel: ReactNode; onConfirm: () => void};
```

改完之后的 `StepFormPanel`（示意）：

```tsx
export const StepFormPanel = ({mode, project, stepNumber, step}: StepFormPanelProps) => {
  const t = useTranslations('Projects.StepModal');
  const {closeModal} = useProjectsPageContext();
  const [title, setTitle] = useState(step?.title ?? '');
  // … description、size
  const {isPending, error, submit} = useModalSubmit({onClose: closeModal});
  const {titleKey, submitKey, SubmitIcon} = STEP_MODE_COPY[mode];

  return (
    <ModalPanel
      title={t(titleKey)}
      subtitle={renderSubtitle()}
      closeLabel={t('cancel')}
      onClose={closeModal}
      onSubmit={handleSubmit}
      footer={{
        cancelLabel: t('cancel'),
        primary: {label: t(submitKey), icon: <SubmitIcon className="size-4" />, disabled: title.trim() === ''},
        danger: step && {kind: 'twoClick', label: t('delete'), confirmLabel: t('deleteConfirm'), onConfirm: handleDelete},
      }}
      isPending={isPending}
      error={error}
    >
      <TitleField label={t('titleLabel')} placeholder={t('titlePlaceholder')} value={title} onChange={setTitle} />
      <NotesField … />
      <FieldRow label={t('sizeLabel')} required>
        <SizePicker value={size} onChange={setSize} splitWarning={t('sizeWarning')} />
      </FieldRow>
    </ModalPanel>
  );
};
```

- **Config 的部分**：shell preset、header（title / subtitle / icon）、banner、footer（cancel、primary、两种 danger）、pending 和 error 的展示。这是 5 个 modal 真正一样的地方，也是 desktop / mobile 差异集中的地方（见「Desktop / mobile」）。
- **JSX 的部分**：字段。字段之间的差异（条件出现的 quadrant、`splitWarning`、Claude 提示、Phase 2 的 cadence）都是普通的 JSX 条件，不需要一套 config 语言。
- **每个 mode 的文案**统一写成 `Record<Mode, {titleKey, submitKey, SubmitIcon}>`（`TaskModalPanel` 的 `MODE_COPY` 已经是这样），这就是每个 modal 自己的那份 config。
- 优点：shell 文件三个都删掉；破坏性确认的 armed state 收进一处（`ProjectFormPanel` 的 `isArchiveArmed` 没了，Settings 的 sign out 也能用）；Review changes 的手写 footer 换成同一个；新 modal（habit）只写字段和 action，shell、header、footer、两个 breakpoint 的行为都是现成的。
- 缺点：`ModalPanel` 的 props 会随需求长（第三种 danger、footer 里多一个按钮）——要守住「只放 5 个 modal 都可能用到的东西」，单个 modal 的特殊需求走 `children`。
- 估算：3 个表单 panel 加 shell 现在 708 行；改完约 330 行 panel + 约 150 行新的 `ModalPanel`、字段组件和 preset。一个新的表单 modal 从约 200 行（panel + shell）降到 80–100 行。

### Option 1C · 字段也做成 config（AutoForm 式）

在 1B 上再进一步：字段也声明成数据，由一个 `ConfigFormModal` 渲染。

```ts
const STEP_FORM: FormModalConfig<typeof stepInputSchema, StepTarget> = {
  namespace: 'Projects.StepModal',
  schema: stepInputSchema, // src/schemas.ts 里 action 用的同一个
  fields: [
    {name: 'title', kind: 'text', required: true},
    {name: 'description', kind: 'textarea'},
    {name: 'size', kind: 'size', warningKey: 'sizeWarning'},
  ],
  defaults: ({step}) => ({title: step?.title ?? '', description: step?.description ?? '', size: step?.size ?? TaskSize.SMALL}),
  submit: (values, {project, step}) => (step ? updateProjectStepAction(step.id, values) : addProjectStepAction(project.id, values)),
  danger: ({step}) => step && {kind: 'twoClick', action: () => deleteProjectStepAction(step.id)},
};
```

- 优点：一个新 modal 约 40 行 config；client 端用 action 的同一个 zod schema 判断能不能提交；所有表单的字段长得一定一样。
- 缺点：
  - 字段词汇很小（text、textarea、size、quadrant，Phase 2 加 cadence，以后 one-off 的 due date），但条件很多：quadrant 只在「adhoc 且没有预设象限」出现、banner 和 copy 按 mode 变、subtitle 带图标和 ICU 参数、Claude 提示只在 template 上——config 要长出 `visible(target)`、`copyByMode`、自定义 widget 的插口，等于用 JSON 重写 JSX（inner-platform）。
  - 类型最难：values 的类型要从 zod schema 推，field kind 要和 value 类型对上（`size` 只能指向 `TaskSize` 字段）。
  - 渲染器约 200 行，只服务 4–5 个表单；每加一种 widget 就要改渲染器和它的类型。
  - Review changes、Settings 用不上。
- 什么时候值得：表单多到十几个，或者需要在运行时定义表单（比如由 server / Claude 下发）。现在两条都不满足。

**我的建议：1B。** Owner 说的「header、description、size、quadrant、footer 都一样」里，header、footer 和 shell 确实一样，做成 config 收益最大；字段只是「长得像」，差异恰好都在条件上，JSX 表达条件最便宜。1B 落地后如果表单继续变多，1C 可以在它上面加，不用推倒。

---

## 轴 2 · 开关：open state 放在哪，怎么按 id 打开

Owner 之前公司的写法，一般是这样：一个全局的 modal store 按 id 记谁开着，任何组件 `const {open} = useModal('editProject')` 就能打开，modal 自己注册在一个 host 里。这里有一个前提要先说清楚：

> **Modal 要的数据在哪？** 标准结构里，rows 是 page container 的 server props，写入和导航在 page context 里。一个挂在 app 层的全局 host 拿不到这些——只能把 rows 塞进 open 的 payload（打开期间会过时），或者让 modal 自己去取（要 client cache，Step 7 决定不引入 React Query）。

所以「按 id 开关」能做，关键是 host 挂在哪一层。

### Option 2A · 每页自己的 `useState`（现状）

Projects 已经是一个 discriminated union（`OpenModal`），按 id 打开、渲染时从 live rows 里查（`getStepModalTarget`）；Plan form 是三个 boolean / 对象；Priorities 是 `addModal`。

- 优点：没有新东西。
- 缺点：每页写法不同；Projects 的 context 里有 4 个 `openXxx`；每加一个 modal 就多一个 open 函数、一个 shell、一段 target 解析。

### Option 2B · 页面级的 `useModalState` + `ModalHost`，按 id 打开（推荐）

把 Projects 现在的写法做成通用的：一个 params 类型表（kind → 打开时要的 id）、一个 hook、一个 host。Host 挂在 page container 里，所以 render 函数能直接用页面的 rows 和写入。

```ts
// domain/projects/constants.ts — 这一页有哪些 modal，各自凭什么打开（只放 id，不放 rows）
export interface ProjectsModalParams {
  newProject: Record<string, never>;
  editProject: {projectId: string};
  addStep: {projectId: string};
  editStep: {stepId: string};
}

// ui/overlay/useModalState.ts — 通用，不碰 domain
type OpenModalOf<Params> = {[Kind in keyof Params]: {kind: Kind; params: Params[Kind]}}[keyof Params];
export function useModalState<Params>() {
  const [openModal, setOpenModal] = useState<OpenModalOf<Params> | null>(null);
  const showModal = <Kind extends keyof Params>(kind: Kind, params: Params[Kind]) =>
    setOpenModal({kind, params} as OpenModalOf<Params>);
  const closeModal = () => setOpenModal(null);
  return {openModal, showModal, closeModal};
}

// 每个 kind 一条：用哪个 preset、怎么从 id 解析出 panel；映射类型保证每个 kind 都写了
export type ModalRegistry<Params> = {
  [Kind in keyof Params]: {preset: OverlayPreset; render: (params: Params[Kind]) => ReactNode | null};
};
```

`ProjectsPage` 里：

```tsx
const {openModal, showModal, closeModal} = useModalState<ProjectsModalParams>();

// 渲染时从 live rows 解析；行不见了（Claude 刚把它删了）就返回 null，modal 自己关
const modals: ModalRegistry<ProjectsModalParams> = {
  newProject: {preset: 'form', render: () => <ProjectFormPanel mode="create" />},
  editProject: {preset: 'form', render: ({projectId}) => {
    const project = findProject(projectId);
    return project && <ProjectFormPanel mode="edit" project={project} />;
  }},
  addStep: {preset: 'form', render: ({projectId}) => …},
  editStep: {preset: 'form', render: ({stepId}) => …},
};

const pageContext = {…, showModal, closeModal}; // 4 个 openXxx → 1 个 showModal

<ModalHost openModal={openModal} registry={modals} onClose={closeModal} />
```

组件里打开：`const {showModal} = useProjectsPageContext(); showModal('editStep', {stepId: step.id});`

- **这就是「hook 按 id 开关」**，只是作用域是一页而不是全 app：`showModal(kind, {id})` 有类型（kind 写错、params 漏传都编译不过），modal 只拿 id，内容在渲染时从页面最新的 rows 里取。
- **和轴 1 合在一起**：registry 的每一条就是「preset（shell config）+ render（一个 `ModalPanel` 驱动的 panel）」。Owner 的两个想法在这里是同一个东西：config 决定一个 modal 长什么样，registry 决定按什么 id 打开它。
- 优点：
  - 每页一个写法，一份 shell；`ProjectsPage` 的 `OpenModal`、`renderProjectModal`、`getStepModalTarget` 收成一个 registry。
  - 按 id 而不是按 row 打开：打开期间 Claude 通过 MCP 改了或删了这一行，页面 revalidate 后 modal 看到的是新的行或者自动关掉（Projects 现在已经是这样，其他页面借此拿到同样的行为）。
  - 不需要全局 store、不需要 client cache，完全落在标准结构里（规则 2：container 拥有打开的 modal）。
  - Design Console 不变：scenario 仍然把 panel 内联渲染在 `ModalPanelFrame` 里。
- 缺点：
  - 跨页面打不开——但现在没有这种需求（唯一的全局 modal 是 Settings，见 2C）。
  - 共用的 `TaskModalPanel` 在 Plan 和 Priorities 的 registry 里各登记一次（每处 3–5 行）。
  - 一页同时只有一个 modal。现在没有 modal 叠 modal 的情况；真需要时 `openModal` 改成栈。

### Option 2C · 全局 modal store / host（NiceModal、Mantine `modals`、Kan 式）

`useModalStore`（Zustand）或 `@ebay/nice-modal-react` / Mantine 的 `ModalsProvider`：host 挂在 `AppShell`，任何地方 `NiceModal.show('editStep', {stepId})`，有的还能 `await` 一个结果。

- 优点：哪里都能开；跨页面；promise 风格适合「确认了才继续」的流程（Review changes 可以写成 `if (!(await showModal('reviewChanges', diff))) return;`）。
- 缺点：
  - 上面那个前提：host 拿不到页面的 rows、写入和 `freshData`，payload 只能塞数据，打开期间过时；要按 id 读就得引入 client cache（Step 7 已决定不引入）。
  - 页面跳转时要记得清 store，否则 modal 跟着去了下一页。
  - Design Console 的 scenario 要额外准备 store 状态。
  - 新依赖（NiceModal、Mantine）或一个新的 Zustand store，而换来的「哪里都能开」现在只有 Settings 用得上。
- 结论：不推荐。**Settings 继续用它自己的 `settingsStore`**：它的两个入口（dock tab、sidebar 用户行）是不同 breakpoint 下的兄弟节点，没有共同的父组件，这正是全局 store 该用的地方——它用 2C，其余用 2B，两者共用轴 1 的 `ModalPanel` 和 preset。

### Option 2D · 打开的 modal 放进 URL

`?modal=editStep&stepId=…`（Midday 式，`searchParams`），或者 Next 的 intercepting + parallel routes（`@modal` slot + `(.)` 路由）。

- 优点：刷新后还开着、可以分享链接、浏览器后退能关掉 modal。
- 缺点：
  - 表单刷新后重开，但输入已经丢了——对表单没意义。
  - 后退关 modal 在 mobile 上的主要好处，Android 已经有了：Chromium 的 `<dialog>` 会把系统返回手势当成 cancel（CloseWatcher）；iOS PWA 没有系统返回手势。
  - 和 Projects 的 `?project=` 共用 history，每开一次 modal 多一条记录；提交后关 modal 就是一次 URL 变更，碰上 action 进行中 `pushState` 的上游 bug（vercel/next.js#100489），要等提交完成才能改。
  - Intercepting routes 把每个 modal 变成路由段（slot、`default.tsx`、软 / 硬导航两套行为），而表单要的是页面的 client state（乐观 rows、选中项），放在路由里拿不到。
- 结论：不推荐用于表单。以后要是有「可分享的详情视图」（比如一个 project 的只读详情），再单独考虑。

**我的建议：2B，Settings 留在 2C 的 store 上。**

---

## 轴 3 · 提交：什么时候关

现在：`useModalSubmit({freshData, onClose})`——action 成功后，等页面的 server props（`freshData`）换成新的再关，5 s 超时兜底（Step 7 Q3 (c)）。Tracker 里 owner 留了一条：改成在 React 的 transition 里关（`useTransition` 的 pending 一直持续到新页面提交）。

### Option 3A · 保持等 `freshData`

- 优点：已经在线上，实测稳定（16.4.3 上 0/100 首写等满超时）；5 s 超时是安全网。
- 缺点：每个 modal 都要知道「等哪份 props」，registry 的 render 要把 `freshData` 传进 panel，共用的 `TaskModalPanel` 在每个页面都要传；`useWaitForFreshData` 这套「比较 props 引用」的机制只是在模拟 React 本来就有的 transition pending。

### Option 3B · 在 action 的 transition 里关（推荐，但先实测）

```ts
export function useModalSubmit({onClose}: {onClose: () => void}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const afterCommit = useRef<(() => void) | null>(null);

  // URL 变更（新建后选中、archive 后 replaceState）要等页面提交之后：
  // action 进行中 pushState 是上游 bug（vercel/next.js#100489）
  useEffect(() => {
    if (isPending || !afterCommit.current) return;
    afterCommit.current();
    afterCommit.current = null;
  }, [isPending]);

  const submit = <Result extends {error?: object}>(action: () => Promise<Result>, onSuccess?: (result) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.error) return setError(toFormErrorMessage(result.error));
      startTransition(() => onClose()); // await 之后的 setState 要再包一层才算 transition
      afterCommit.current = () => onSuccess?.(result);
    });
  // …
}
```

- 优点：`freshData` 从所有 modal 上消失——registry、`TaskModalPanel` 的调用处、`ModalHost` 都不用知道页面数据；关闭和新数据同一帧（archived spike 实测空档 0）；`ProjectsPage` 的 archive / unarchive 也能改用 transition，`useWaitForFreshData` 整个删掉。
- 缺点：
  - 没有超时安全网：如果首写 bug 回来（#98303 在 16.2.x 上 1/3 卡住），modal 会一直转。可以加一个看门狗（action 返回后 pending 超过 5 s 就直接关），但那又是一段 workaround。
  - React 的一个坑：`await` 之后的 setState 不自动算进 transition，要再包一层 `startTransition`——写错了就回到「先关、旧数据露一下」。
  - 16.4.3 上的数字（0/155）来自 Step 7 的一次测量，还没在 `ModalHost` 这种写法上测过。
- 落地条件：实现时先用 Step 7 的 Playwright 首写探针（生产构建、0 / 400 ms 延迟，template / step add / project edit / matrix add 各 25 次以上）跑一遍；有一次卡住就退回 3A，`ModalPanel` 和 registry 照样落地，只是 panel 多收一个 `freshData`。

---

## 合起来：推荐方案的全貌

```text
ProjectsPage (client) ◆
├ useModalState<ProjectsModalParams>()     openModal · showModal · closeModal
├ <ProjectsPageContext value>              …写入、导航 + showModal / closeModal
│  └ ProjectStep …                         showModal('editStep', {stepId})
└ <ModalHost openModal registry onClose>   一个 OverlayShell，preset 来自 registry
   └ registry[kind].render(params)         从 live rows 解析 id；没了就 null（自动关）
      └ StepFormPanel                      字段（JSX）+ useModalSubmit
         └ <ModalPanel …config>            header · banner · body 滚动 · footer（cancel / primary / danger）
```

- **Page-specific 的 panel 读 page context**（`closeModal`、`showProject` 这类导航），不再收 callback props——取代规则 5 里「overlay 收 callback props，等 config-driven modals 定」那半句。
- **`domain/shared/` 的 panel 收 props**（`TaskModalPanel` 被两页共用，不能读某一页的 context），和规则 5 的前半句一致。
- **Settings**：`settingsStore` 管开关，`SettingsPanel` 改用 `ModalPanel`（header + body，无 footer），preset `settings`。
- **Review changes**：Plan 改成标准结构之前，`PlanForm` 先用 `ModalPanel`（`primary.onClick` 而不是 submit，preset `review`）替掉手写 footer；registry 等 Phase 2 的 Plan week。

## Desktop / mobile

推荐方案不引入 JS breakpoint 判断，仍然是一棵 DOM、CSS 分两种布局（shadcn 那种「mobile 渲染 Drawer、desktop 渲染 Dialog」的 responsive dialog 要 `useMediaQuery`，首屏有 hydration 差异、窗口缩放时整个 modal 重新 mount，不采用）。差异集中在三处，都在 `ui/overlay/` 和 `ui/form/` 里，每个 modal 自动得到：

| 层 | mobile（< md） | desktop（≥ md） | 归谁 |
| --- | --- | --- | --- |
| Shell（preset） | bottom sheet，全宽 | 居中；`form` preset 带 corners；宽度按 preset | `OVERLAY_PRESET` |
| Header | chevron 关闭 | ✕ 关闭 | `OverlayHeader`（不变） |
| Body | 统一约定：header、footer 固定，body 在中间滚动，盒子高度有上限 | 同左，上限不同 | `ModalPanel`（新） |
| Footer | Cancel : Primary 1 : 2；danger 单独一行在下；`confirmBar` 的按钮换行 | 按 label 宽度靠右；danger 在左 | `ModalFormFooter` / `ConfirmBar`（不变，由 `ModalPanel` 调用） |

**两个要 owner 确认的 mobile 细节**

- **高度和滚动**：body 滚动的约定放进 `ModalPanel`，所有 modal 一起修——包括 tracker › Plan 里 Review changes header 被顶出屏幕那条。上限建议用 `dvh`（iOS 键盘弹起、地址栏伸缩时 `vh` 不准）。这条 tracker 要不要并进本 PR，见 Q6。
- **iPhone 底部安全区**：bottom sheet 的 footer 底边只有 `pb-6`（24 px），代码里没有 `env(safe-area-inset-bottom)`；PWA 全屏时 home indicator 可能压到按钮。我在 headless Chromium 里看不出来，需要 owner 在 iPhone 上截一张表单 sheet 的图确认（AGENTS.md › UI Workflow：只在设备上出现的问题先要截图）。确认有问题，就在 `form` / `review` preset 里加上。

## Design Console

- Scenario 不变：modal 的 tab 继续把 panel 内联渲染在 `ModalPanelFrame` 里（真的 `<dialog>` 会跳出 frame）；archive armed、delete armed 两个 tab 的 play step 点的是同一个按钮，不用改。
- Page-specific 的 panel 改读 page context 之后，scenario 把它包在已有的 `inertProjectsPageContext` 里（和 `ProjectStep` 的 specimen 一样）。
- `ModalPanelFrame` 现在手写了一份 `max-w-lg` 和 corners；改成读 `OVERLAY_PRESET.form`，console 跟着 production 走。
- Gallery 的 UI tab 加一个 `ModalPanel` specimen（无 danger / `twoClick` / `confirmBar` armed 三个状态）。

## 其他方案，看过但不推荐

| 方案 | 是什么 | 为什么不 |
| --- | --- | --- |
| `@ebay/nice-modal-react` | 全局注册，`NiceModal.show(id, props)` 返回 promise，modal 里 `useModal()` 拿 `visible / hide / resolve` | 就是 2C；拿不到页面数据，多一个依赖 |
| Mantine `modals` | `ModalsProvider` 注册 context modals，`openConfirmModal({title, labels, onConfirm})` 纯 config 的确认框 | 2C + 一整套 UI 库；我们的 shell、主题和 `fx-*` 都是自己的 |
| Radix / shadcn Dialog | headless 的 dialog primitive | 原生 `<dialog>` + `useDialogSync` 已经有 focus trap、Esc、top layer，换掉没有收益 |
| react-hook-form + zod（AutoForm） | 表单状态和字段渲染交给库 | 就是 1C 的库版本；字段 2–4 个，`useState` 足够 |
| React 19 `useActionState` / `<form action>` | 表单原生走 action，pending 来自 React | 和 3B 是一回事，但我们的 action 签名是 `(id, input)` 而不是 `FormData`，用 `useTransition` 包现有 action 更直接 |
| Promise 风格确认（`await confirm(…)`） | 打开确认框，等用户的答案 | Review changes 确认之后 modal 要保持打开、显示提交中，promise 在确认时就 resolve 了，还得另管 pending；收益不够 |

---

## 实现计划（按推荐：1B + 2B + 3B，范围按 Q7 的建议）

本 PR 继续用来实现（spike、Decision、代码在一个 PR 里）。一步一个 commit：

1. **`ui/overlay/` 的通用件**：`OVERLAY_PRESET`、`ModalPanel`（header / banner / body 滚动 / footer，armed state 在里面）、`useModalState`、`ModalHost`；`ui/form/` 加 `TitleField`、`NotesField`。Gallery 加 `ModalPanel` specimen。
2. **`useModalSubmit` 改成 transition 版**（3B），先跑首写探针；不过关就保留 `freshData`（3A），后面几步照做。
3. **Projects**：`ProjectFormPanel`、`StepFormPanel` 改用 `ModalPanel`，读 page context；删 `ProjectModal`、`StepModal`；`ProjectsPage` 用 registry + `ModalHost`，context 的 4 个 `openXxx` 换成 `showModal` / `closeModal`；archive / unarchive 改用 transition，删 `useWaitForFreshData`（3B 时）。Scenario 包 inert context。
4. **共用和其他 modal 的框架**：`TaskModalPanel` 改用 `ModalPanel`，删 `TaskModal` shell 和那段「template 变了就重置表单」的 render 期 reset（每次打开都是新 mount，用不上）；Plan form 和 Priorities 暂时各自用一个 `OverlayShell {...OVERLAY_PRESET.form}` 包它（几行），等它们改成标准结构时再接 registry。`ReviewChangesPanel`、`SettingsPanel` 改用 `ModalPanel`。
5. **文档**：AGENTS.md › *Page structure* 一句话写 modal（页面 container 用 `useModalState` + registry 按 id 打开；page-specific panel 读 context，shared panel 收 props；新 modal 用 `ModalPanel`）；`baseline.md` › Architecture Decision 写完整规则；`reference.md`（如果涉及）；tracker 删掉本条和它的 *Close on transition* 子条目；README Current State 和 Update Log；spike 移到 `archived/`。

**验证**：format、lint、typecheck、knip、`npm test`；e2e（每个 modal 的提交、archive、delete step、settings sign out 都在 journey 里）；首写探针的数字写进 PR。改了 modal 的高度和滚动、scenario 的 frame，按 UI Workflow 交给 `ui-verifier` 在 mobile 和 desktop 各看一遍 Projects、Plan、Priorities、Settings 的 modal tab。

## 风险

- **和 Board / Priorities / Dump 的 page-structure PR 冲突**（Q9 实验还没跑）：第 4 步只动 Priorities 里 `TaskModal` 的那几行；registry 留给它改成标准结构那一刻。
- **`ModalPanel` 变成万能组件**：只收 5 个 modal 共有的东西；一个 modal 的特殊需求放 `children`，review 时按这条把关。
- **3B 的卡住风险**：见轴 3；探针是闸门，看门狗是备选。
- **一页一个 shell**：几个 kind 共用一个 `<dialog>`，关闭时内容先卸载（和现在 `{isOpen && <Panel/>}` 一样，不是新问题）；preset 不同的两个 modal 之间切换要在 `ModalHost` 里记住上一个 preset，避免关闭瞬间盒子变宽。

---

## 待拍板 · Open questions

| # | 问题 | 选项 | 推荐 |
| --- | --- | --- | --- |
| Q1 | 渲染：config 到哪一层 | **1A** 维持 shell + panel，抽小件 · **1B** 框架（shell preset、header、banner、footer、danger）是 config，字段是 JSX · **1C** 字段也是 config | **1B**；表单多到十几个或要运行时定义表单时，再在上面加 1C |
| Q2 | 开关：open state 放在哪 | **2A** 每页 `useState`（现状）· **2B** 页面级 `useModalState` + registry + `ModalHost`，按 id 打开 · **2C** 全局 store / NiceModal · **2D** URL | **2B**；Settings 留在它自己的 store（2C 的唯一合理场景） |
| Q3 | Modal panel 怎么拿 close 和导航 | page-specific 读 page context、shared 收 props · 全部收 props（现状） | **按 page-specific / shared 分**，取代规则 5 的 pending 半句 |
| Q4 | 提交后什么时候关（tracker 的 *Close on transition*） | **3A** 继续等 `freshData` · **3B** 在 transition 里关，URL 变更等提交后 | **3B**，以首写探针为闸门；不过关退回 3A |
| Q5 | 非表单的 modal 算不算在内 | Review changes、Settings 也用 `ModalPanel` · 只管表单 | **都用 `ModalPanel`**；开关上 Settings 留 store，Review changes 的 registry 等 Plan week |
| Q6 | Body 滚动 / 高度约定 | 进 `ModalPanel`，并掉 tracker › Plan 的 Review changes 高度条目 · 只给表单加，Review changes 那条照旧 | **进 `ModalPanel`，一起修**；iPhone 安全区等 owner 的截图再定 |
| Q7 | 范围和顺序 | 本 PR：通用件 + Projects 全套 + 所有 modal 换框架，Priorities / Plan 的 registry 跟着它们的标准结构走 · 本 PR 只做通用件和 Projects · 等 page-structure PR 合并后一次做完所有页面 | **第一种**：框架一次换完，registry 跟页面结构走，不和 Q9 的 PR 抢同一批文件 |
