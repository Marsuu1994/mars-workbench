# Spike: iOS Dump capture app — 一个输入框的 native app，和它要的 API

**Status: awaiting owner review** · 2026-11-21 · 回答 tracker 条目 *iOS Dump capture app*（Dump › High），是 *Native iOS app*（Cross-cutting › Future）的第一步 · 上游：`design/specs/dump.md`（Quick Capture Flow）、`design/spike/archived/board-desktop-phone-journeys.md` › Native iOS 的影响

> 语言约定：叙述用中文；产品名词、代码标识、Apple 的 API 名保留英文（dump entry、`captureDumpEntry`、`URLSession`、`@FocusState` …），和代码、文档一一对应。
>
> 这份 spike 先写在 mars-workbench 里。iOS app 的 repo 开好以后，把 Part 2 和 Part 4 复制过去当它的第一份设计文档；Part 1 留在这里，跟着 API 的实现 PR 走。

## 一页看完 · Summary

| | 内容 |
| --- | --- |
| 要做什么 | 一个 iOS native app：打开就是一个输入框，键盘已经弹出，写完点一下就记下，然后清空等下一条。不展示历史 |
| 为什么 | PWA 每次打开都要等 Vercel 的 function、Supabase 的 session 检查和 SSR，打开到能打字太慢。Native app 打开时完全不碰网络 |
| 怎么做到「快」 | 打开时只渲染一个 `TextEditor` 并聚焦；提交时先写进本地 outbox（一个文件一条），立刻清空；有网时在后台把 outbox 里的条目批量 POST 给服务端，成功一条删一条 |
| 服务端要加的 | 一个 REST 接口 `POST /api/v1/dump-entries`：一次收多条，带客户端生成的 `id` 和记下的时间 `capturedAt`；用一个固定的 Bearer token 认人，不登录（Part 1） |
| 不做 | 登录、多用户、读取 / 展示历史、编辑和删除（见「不在范围内」） |
| 大小 | mars-workbench 一个 PR（S，API + 测试 + 文档）；iOS repo 一个 PR 起步（App + outbox + 同步） |
| 之后 | 将来的 native Mars Workbench 沿用 Part 1 的 API 层，只把认证换成 Supabase 登录（「以后怎么长」） |

## Trigger · 起因

Owner 想把 Dump 做成 iOS native，原话的要求：

- 打开极快，一个输入框，自动聚焦、键盘弹出，打开就能写。
- 提交先写本地，没网也能记；有网时后台提交 API，成功就删本地缓存。
- 一个字：快，无摩擦。
- 只给自己用：先不做登录，直接 hardcode 自己的 token。
- 以后也想做 native 的 Mars Workbench，这个是第一步。
- iOS app 单独一个 repo。

## 出发点 · What's already there

| 来自 | 已有 | 这次怎么用 |
| --- | --- | --- |
| `prisma/schema.prisma` › `DumpEntry` | `id`（uuid）、`userId`、`content`、`isProcessed`、`createdAt`（`Timestamptz(3)`，毫秒精度） | 不改 schema。`id` 由客户端生成后直接写进去，这是重试不重复的关键（Part 1 › 幂等） |
| `src/lib/db/dumpEntries.ts` | `createDumpEntry`（一条） | 新增批量的 `createDumpEntries`，用 `createMany({skipDuplicates: true})` |
| `src/services/dumpService.ts` | `captureDumpEntry`（一条，只是 insert） | 新增 `captureDumpEntries`：批量、带 `id` 和 `createdAt` |
| `src/schemas.ts` › `createDumpEntrySchema` | `content`：trim 后非空，最多 `DUMP_ENTRY_MAX_LENGTH`（10,000） | 新 schema 复用同一条 `content` 规则，iOS 端也照这条在本地先校验 |
| `src/actions/dumpActions.ts` | server action，只能从网页里调 | 不动。Swift 调不了 server action，所以要一个 route handler |
| `src/app/api/mcp/route.ts` + `src/mcp/` | 唯一的 REST 风格入口；route handler 很薄，交给 `src/mcp/`；`src/mcp/middleware/auth.ts` 验 token、拿 userId | 照这个结构加 `src/api/`（Q1） |
| `src/proxy.ts` | matcher 排除了 `api/mcp`，否则没 cookie 的请求会被重定向到登录页 | 同样排除 `api/v1` |

读代码时确认的几件事：

1. **`createdAt` 的精度是毫秒。** 注释写明了：feed 的 cursor 把 `createdAt` 经过 JS `Date`（毫秒）来回传，存得比毫秒细会在翻页时丢行。所以客户端传来的时间必须截到毫秒（Swift 的 `Date` 比毫秒细，见 Part 4 › 坑）。
2. **网页的 feed 按 `createdAt DESC` 排。** 离线记下、几小时后才上传的条目，如果 `createdAt` 用记下的时间，它会插在 feed 的中间而不是最上面。网页刷新后顺序是对的；已经加载着的 feed 不会自己冒出这条。见 Q3。
3. **`dump.md` 是 legacy spec，不能变长**（`design/specs/legacy.txt`，`check:spec` 管着）。所以 API 的 contract 写进 `design/reference.md` 的新一节，加上 route 的 integration test，不写进 `dump.md`。
4. **`design/baseline.md` › Architecture Decision 写着「No REST API routes」**，AGENTS.md › Layers 写着 route handler 只交给 `src/mcp/` 或 `src/lib/`。这两句要在实现 PR 里改（Q1）。

---

# Part 1 · API 面（mars-workbench）

## 接口

```
POST /api/v1/dump-entries
Authorization: Bearer <NATIVE_API_TOKEN>
Content-Type: application/json

{
  "entries": [
    {"id": "7f1c…-…", "content": "想到的事", "capturedAt": "2026-11-21T08:15:02.123Z"},
    …
  ]
}
```

| 情况 | 回答 |
| --- | --- |
| 成功（包括这些 `id` 之前已经存过） | `200 {"acceptedIds": ["7f1c…", …]}`：这次请求里的每个 `id`，小写 |
| 没带 token、token 不对，或服务端没配 token | `401 {"error": {"code": "unauthorized"}}` |
| body 不合法（不是 JSON、`entries` 为空或超过 `DUMP_BATCH_LIMIT`、某条 `content` 不合规则、`id` 不是 uuid、`capturedAt` 不是时间） | `400 {"error": {"code": "invalid_body", "issues": […]}}`，整批拒绝，一条也不写 |
| 其他（数据库挂了等） | `500 {"error": {"code": "unexpected"}}`，不带细节 |

- **一次多条**：outbox 攒了 20 条时，一个请求送完，不发 20 个请求。上限 `DUMP_BATCH_LIMIT = 50`：50 × 10,000 字符约 500 KB，在 Vercel function 4.5 MB 的请求体上限之内。
- **只写不读**：V1 没有 GET。这个 token 泄漏了，别人能往你的 dump 里写，但读不到你的任何数据。
- **`/v1/`**：装在手机上的旧版本 app 会一直调老的 URL，网页可以随时改，app 不能。以后接口要改不兼容的形状，开 `/v2/`，`/v1/` 留到手机上的 app 更新为止。

## 幂等 · 重试不重复

离线和重试最常见的坑：请求其实到了、写进去了，但回答在路上丢了（地铁里信号断掉）。客户端以为失败，再发一次，同一条就存了两遍。

解法：**`id` 由客户端在记下的那一刻生成**（`UUID()`），服务端直接用它做主键，`createMany({skipDuplicates: true})`。同一条发多少次都只有一行。服务端把这次请求里的所有 `id` 都放进 `acceptedIds`（不管这次是新写的还是早就有的），客户端收到就删掉本地那几个文件。

两个细节：

- **大小写**：Swift 的 `UUID().uuidString` 是大写，Postgres 存成小写。服务端 schema 先 `.toLowerCase()`，回给客户端的也是小写；客户端比较时把字符串转回 `UUID` 再比，不比字符串。
- **别人的 `id`**：`skipDuplicates` 碰到一个已经存在、但属于别的用户的 `id` 时也会静静跳过，回答里仍然算 accepted。只有一个用户、uuid v4 随机碰撞的概率可以忽略，所以 V1 接受；多用户时改成先查这些 `id` 属于谁。

## 时间 · `capturedAt`

服务端写 `createdAt = min(capturedAt, now)`：

- 用记下的时间，不用到达服务端的时间：离线时 8 点写的，10 点才连上网，网页上它应该在 8 点那里（Q3）。
- 不接受未来的时间：手机时钟快了的话截到 `now`，不会让一条永远排在最上面。
- 早于多久都接受（离线一周也是真的）。

## 认证 · 一个固定 token

| 环境变量（Vercel 上配，Production） | 值 |
| --- | --- |
| `NATIVE_API_TOKEN` | 一个随机长串：`openssl rand -base64 32` 生成 |
| `NATIVE_API_USER_ID` | 你在 Supabase Auth 里的 user id（uuid） |

- 请求的 `Authorization: Bearer …` 和 `NATIVE_API_TOKEN` 比较：两边先各做 SHA-256，再用 `crypto.timingSafeEqual` 比，这样比较的耗时不会泄露 token 猜对了几位。
- 对上了，这个请求就是 `NATIVE_API_USER_ID` 这个人；对不上就 401。
- **失败时关闭**：两个变量有一个没配，或 user id 不是 uuid，一律 401。不会因为忘了配而变成谁都能写。
- **换 token**：Vercel 上改 `NATIVE_API_TOKEN` 并 redeploy，手机上重新粘贴一次（Part 2 › token）。
- **本地开发**：`.env.example` 加 `NATIVE_API_TOKEN=local-dev-token` 和 `NATIVE_API_USER_ID=00000000-0000-4000-8000-000000000001`（seed 的 dev user），iOS Simulator 指向 `http://localhost:3000` 就能对着本地 stack 测。
- **为什么不用 Supabase 的 access token**：它一小时过期，refresh token 每用一次就换一个新的，hardcode 进 app 撑不过一天。将来做登录时才用它（「以后怎么长」）。
- **名字是 `NATIVE_API_*` 不是 `DUMP_API_*`**：将来 native Mars Workbench 的其他接口用同一个认证入口，到那时再整个换成登录。

## 代码放在哪 · Q1

**选项 A（推荐）：照 MCP 的样子，加一个 `src/api/` 层。**

```text
src/app/api/v1/dump-entries/route.ts   # 只有 export const POST = …，交给 src/api/
src/api/
├── middleware/
│   ├── auth.ts                        # getNativeApiUserId(request)：token → userId 或 null
│   └── runRoute.ts                    # 认证、解析 JSON、zod 校验、错误 → HTTP 状态码，和 runTool 一个角色
└── routes/
    └── dumpEntries.ts                 # 校验 → dumpService.captureDumpEntries → revalidatePath('/kanban/dump')
```

- 好处：和 `src/mcp/` 对称，route handler 继续「只交给一个层」；将来加接口只是 `routes/` 里多一个文件；认证只有 `auth.ts` 一个地方，换成 Supabase 登录时只改它。
- 代价：多一层目录；AGENTS.md › Project Structure 和 › Layers 各改一句，`design/baseline.md` › Architecture Decision 的「No REST API routes」那句改写。

**选项 B：route handler 直接调 service。**

- 好处：少一层，一个文件就够。
- 代价：AGENTS.md 的 route-handler 规则要改成「也可以调 service」，认证、错误形状这些会在每个 route 里重复，将来接口多了再抽层就是一次重构。

## 实现 PR 的内容（mars-workbench，从 `main` 开，选项 A）

1. `src/utils/dump.ts`：`DUMP_BATCH_LIMIT = 50`。
2. `src/schemas.ts`：`captureDumpEntriesSchema`，`entries` 每条是 `{id, content, capturedAt}`；`content` 和 `createDumpEntrySchema` 共用一个定义（DRY）。
3. `src/lib/db/dumpEntries.ts`：`createDumpEntries(userId, entries)`，`createMany` + `skipDuplicates`。
4. `src/services/dumpService.ts`：`captureDumpEntries(userId, entries)`，截 `createdAt` 到 `now`，返回 `acceptedIds`。
5. `src/api/`（上面的三个文件）+ `src/app/api/v1/dump-entries/route.ts`。
6. `src/proxy.ts`：matcher 排除 `api/v1`。
7. 测试：
   - `src/api/middleware/auth.unit.test.ts`：没 header、token 错、token 对、变量没配、user id 不是 uuid。
   - `src/app/api/v1/dump-entries/route.int.test.ts`（照 `api/mcp/route.int.test.ts` 的写法）：401；400 整批不写；200 写进去的行带客户端的 `id` 和 `createdAt`；同一批发两次只有一份；未来时间被截到 `now`；大写 `id` 存成小写。
   - `dumpService.int.test.ts`：`captureDumpEntries` 的截时间和幂等。
8. 文档：`design/reference.md` 加「Native API」一节（接口、状态码、认证）；`design/baseline.md` › Architecture Decision 改「No REST API routes」那句；AGENTS.md 的 Project Structure 加 `src/api/`、Layers 的 route-handler 句加上 `src/api/`；`.env.example` 加两个变量；README › Current State › Dump 加一句「也可以从 iOS app 记」（等 app 能用了再加）。
9. Owner 做的：Vercel 上配 `NATIVE_API_TOKEN` 和 `NATIVE_API_USER_ID`。

---

# Part 2 · iOS app

## 屏幕

只有一屏：

- 一个占满屏幕的 `TextEditor`（多行：dump 的内容可以有换行，网页也保留换行）。
- 键盘上方一条 toolbar，右边一个 **Dump** 按钮；`content` trim 后为空时按钮灰掉（Q5）。
- 点 Dump：轻震一下（haptic），输入框清空，键盘不收，光标还在，可以接着写下一条。
- 什么都不展示。唯一的例外可以是 toolbar 左边一个很小的「3 条待上传」，只在 outbox 不空时出现，token 错了时变成红色的「token 无效」（Q6）。
- 从后台切回来（`scenePhase` 变成 `.active`）时重新聚焦，键盘再弹出来。

## 快 · 打开时做什么、不做什么

- **做**：渲染那一个 `TextEditor`，聚焦。
- **不做**：不等网络、不读 outbox、不初始化任何要花时间的东西。启动后才在后台 `Task` 里读 outbox、开始同步。
- 验证方式：Xcode 的 Instruments › App Launch 模板测冷启动到第一帧的时间；Apple 建议的目标是 400 ms 以内，这么小的 app 应该远低于它。
- 注意：聚焦在 `onAppear` 里设有时太早、键盘不弹，真机上要测。不行的话放到 `.task { }` 里或者等下一帧（Part 4 › 坑）。

## 本地 outbox · 一个文件一条

记下一条 = 在 `Application Support/outbox/` 里写一个 `<id>.json`：

```json
{"id": "7F1C…", "content": "想到的事", "capturedAt": "2026-11-21T08:15:02.123Z"}
```

- 写文件用 `.atomic`：先写临时文件再改名，写到一半 app 被杀也不会留下半个文件。
- 上传成功，按 `acceptedIds` 删对应的文件。outbox 目录就是「还没送到的」，没有别的状态要维护。
- 放 `Application Support`，**不放 `Caches`**：系统空间紧张时会清 `Caches`，没送出去的条目就没了。

**存储选项 · Q9**：

| 选项 | 好处 | 代价 |
| --- | --- | --- |
| A · 一个文件一条（推荐） | 最简单；写一条和删一条互不影响；没有 schema 和 migration；坏一个文件只丢一条 | 条目上万时列目录会慢（outbox 只放没送出去的，不会这么多） |
| B · SwiftData（Apple 的 ORM，底下是 SQLite） | 以后 native Mars Workbench 要本地存很多东西时会用到它，提前学 | 为一个队列引入 model container、schema 版本；启动时要初始化 container |
| C · `UserDefaults` | 一行代码 | 设计上是放设置的小值，不适合当队列；整个值每次重写 |

## 同步 · 什么时候送、失败了怎么办

一个 `Outbox` actor（Swift 里自带串行化的对象，同一时刻只有一个调用在跑，见 Part 4），它的 `flush()`：

1. 正在 flush 就直接返回（不会同时发两个请求）。
2. 读 outbox 里所有文件，按 `capturedAt` 排，每 50 条一批。
3. 一批 POST 出去：
   - `200`：删 `acceptedIds` 对应的文件，继续下一批。
   - 网络错误、`5xx`、`429`：停下，过一会儿再试。等待时间每次翻倍（1 s、2 s、4 s … 最多 5 分钟），加一点随机抖动。
   - `401`：停下，不再自动重试，toolbar 显示「token 无效」，等你重新粘贴 token。
   - `400`：不该发生，因为本地记下前已经用同一条规则校验过；万一发生（比如服务端规则改了），见 Q13。
4. outbox 空了就结束。

**谁来叫 `flush()`：**

| 时机 | 怎么做 |
| --- | --- |
| 刚记下一条 | 写完文件立刻叫 |
| App 打开或切回前台 | `scenePhase == .active` |
| 网从没有变成有 | `NWPathMonitor` 报 `.satisfied` |
| 重试的等待到了 | actor 里 `Task.sleep` |
| App 刚切到后台、还有没送的 | `beginBackgroundTask` 向系统多要约 30 秒，把这一次 flush 跑完 |
| App 已经在后台很久 | `BGAppRefreshTask`：请系统找机会唤醒 app 来 flush，时间由系统决定，不保证 |

**后台上传的选项 · Q8：**

| 选项 | 怎么做到 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 上面这张表（推荐） | 前台随时送；切后台时多要 30 秒；之后靠 `BGAppRefreshTask` 碰运气 | 代码都在一个 `async` 函数里，好懂好测；最常见的场景（地铁里记、出站打开 app 或者下一次打开）都覆盖 | App 被划掉、又一直不打开的话，要等系统某次唤醒或你下次打开 |
| B · Background `URLSession` | 每记一条就交给系统一个后台上传任务；系统在有网时送，app 被挂起、甚至被系统杀掉也照送，送完在后台唤醒 app 删文件 | 最接近「交给系统，一定送到」 | 只能从文件上传、走 delegate 回调而不是 `async/await`；HTTP 层的失败（`5xx`）系统不会重试，还是要自己再排；调试难。和 A 的幂等设计兼容，以后可以加 |

## Token · 怎么进 app · Q4

| 选项 | 怎么做 | 好处 | 代价 |
| --- | --- | --- | --- |
| A · 第一次打开时粘贴，存进 Keychain（推荐） | outbox 不空且没有 token 时，toolbar 出现「设置 token」；粘贴一次，存进 Keychain（iOS 的加密存储） | Repo 和 CI 里都没有秘密；换 token 只是再粘贴一次 | 多一个很小的设置界面 |
| B · 编译时写进去 | 一个不进 git 的 `Secrets.xcconfig`，经 `Info.plist` 读出来 | 零界面 | Token 在 app 包里；用 CI 打包时要把 token 放进 CI 的 secrets；换 token 要重新打包安装 |

服务端地址（`https://<你的域名>`）不是秘密，写在 Debug / Release 两个 build configuration 里：Debug 指 `http://localhost:3000`，Release 指 production。

## 工程结构 · Q10、Q11

```text
mars-dump-ios/                 # 新 repo（名字 Q15）
├── project.yml                # XcodeGen 的描述文件（Q10）
├── DumpApp/                   # App target：只有 UI 和 iOS 专属的东西
│   ├── DumpApp.swift          # @main，WindowGroup，backgroundTask
│   ├── ComposerView.swift
│   ├── TokenSheet.swift
│   └── NetworkMonitor.swift   # NWPathMonitor
├── Packages/DumpCore/         # Swift package：outbox、API client、重试，只依赖 Foundation（Q11）
│   ├── Sources/DumpCore/
│   └── Tests/DumpCoreTests/
└── .github/workflows/ci.yml
```

- **Q10 · XcodeGen 还是 Xcode 自己建工程**：Xcode 的工程文件（`.xcodeproj` 里的 `project.pbxproj`）是机器生成的，几千行，两个分支各加一个文件就会冲突，人和 agent 都很难改对。XcodeGen 用一个几十行的 `project.yml` 描述工程，`xcodegen generate` 生成 `.xcodeproj`（`.xcodeproj` 不进 git）。云端的 Claude 会话跑在 Linux 上、没有 Xcode，能可靠地改的只有 `project.yml`。推荐 XcodeGen；代价是 Mac 上要 `brew install xcodegen`，每次拉代码后跑一次 `xcodegen generate`。
- **Q11 · 核心逻辑放进 Swift package**：outbox、编码、重试、API client 只用 Foundation，Linux 上的 Swift 工具链也能编译、跑测试。这样云端会话和 CI 的 Linux runner 都能 `swift test` 验证它，不用 Mac。网络状态（`NWPathMonitor`，Linux 没有）和 Keychain 留在 app target，用 protocol 注入进 package。推荐这样做：将来 native Mars Workbench 的 API client 也放在这个 package 里长。

## 不在范围内

- 登录、多用户。
- 读取或展示历史（PWA 里看）。
- 编辑、删除（tracker › Dump › Future 里本来就有，到时 web 和 app 一起做）。
- Share extension（从别的 app 分享到 Dump）、Widget、锁屏 / 控制中心按钮、Siri / 快捷指令（App Intents）：都是好的下一步，V1 先把一屏做快。
- Android。

## 以后怎么长 · 到 native Mars Workbench

- **认证**：iOS 上用 `supabase-swift` 做 Google 登录（`ASWebAuthenticationSession` 弹系统浏览器），拿到 Supabase 的 access token；服务端 `src/api/middleware/auth.ts` 改成和 MCP 一样用 `getClaims` 验它。接口和 app 的其余部分都不变。固定 token 到那时删掉。
- **读接口**：board、priorities 这些页要 GET；服务端的 service 已经是「返回输入、不返回 UI model」（AGENTS.md › Server shapes inputs），iOS 和 web 拿同一份数据各自渲染。
- **离线**：dump 只写不读，outbox 就够了；有读有写的页要本地缓存加冲突处理，到时另开 spike。

---

# Part 3 · 待拍板的问题

1. **Q1 · 服务端代码放哪**：A 加 `src/api/` 层（推荐），还是 B route handler 直接调 service？
2. **Q2 · URL**：`POST /api/v1/dump-entries`（推荐），还是别的名字、不带版本号？
3. **Q3 · 条目的时间**：用手机上记下的时间 `capturedAt`（推荐，离线的条目排在它真正发生的时候），还是服务端收到的时间（永远排在最上面，但离线写的时间就丢了）？
4. **Q4 · token 怎么进 app**：A 第一次打开时粘贴进 Keychain（推荐），还是 B 编译时写进去？
5. **Q5 · 怎么提交**：键盘上方的 Dump 按钮、回车是换行（推荐，内容可以多行）；还是回车就提交、不能换行？
6. **Q6 · 要不要「N 条待上传」**：只在 outbox 不空或 token 错时显示一个很小的提示（推荐，否则 token 错了你不会知道）；还是完全不显示？
7. **Q7 · 草稿**：写到一半切走或 app 被杀，回来时还在吗？推荐保留（每次输入后存进 `UserDefaults`，提交后清掉）。
8. **Q8 · 后台上传**：A 前台 + 切后台 30 秒 + `BGAppRefreshTask`（推荐），还是 B background `URLSession`？
9. **Q9 · 本地存储**：A 一个文件一条（推荐）、B SwiftData，还是 C `UserDefaults`？
10. **Q10 · 工程文件**：XcodeGen（推荐），还是在 Xcode 里手建、`.xcodeproj` 进 git？
11. **Q11 · 核心逻辑放 Swift package、Linux 上能测**：做（推荐）还是全放 app target？
12. **Q12 · 最低 iOS 版本**：只有你用，不超过你手机上的版本就行。推荐设 iOS 17：Part 4 用到的 API 那时都有了（`.backgroundTask` 从 iOS 16，`@Observable` 和 `.sensoryFeedback` 从 iOS 17）。你的手机现在是哪个版本？
13. **Q13 · 服务端回 400 时**：推荐把这批条目从 outbox 移到 `outbox/rejected/`，不再重试、不删，toolbar 提示一下，以后改了规则可以手动重发；还是一直留在 outbox 里重试？
14. **Q14 · 怎么装到手机、要不要 CI/CD**：见 Part 4 › 装到手机 和 › CI/CD，选项、代价和费用都列在那里。
15. **Q15 · 新 repo 的名字**：比如 `mars-dump-ios`；如果以后它就长成 native Mars Workbench，可以一开始就叫 `mars-workbench-ios`。

## 实施计划

1. **这个 PR**：spike，往返到每个问题都有答案，然后 `Status: decided`。
2. **mars-workbench 的 API PR**（从 `main` 开）：Part 1 › 实现 PR 的内容。合并后 owner 在 Vercel 上配两个环境变量，用 `curl` 试一次：

   ```bash
   curl -X POST https://<你的域名>/api/v1/dump-entries -H "Authorization: Bearer $NATIVE_API_TOKEN" -H "Content-Type: application/json" -d '{"entries":[{"id":"6f0c7f8e-1d2b-4c3a-9e8f-0a1b2c3d4e5f","content":"hello from curl","capturedAt":"2026-11-21T08:00:00.000Z"}]}'
   ```

3. **iOS repo 的第一个 PR**：owner 建好 repo，把这份 spike 的 Part 2 和 Part 4 复制进去（比如 `docs/spike-v1.md`）；Claude 写 `project.yml`、`DumpCore` package 和它的测试、App target、CI。云端会话能跑 `swift test` 验证 `DumpCore`，App target 要 owner 在 Mac 上 `xcodegen generate` 后用 Xcode 编译、装到手机上。
4. API PR 和 iOS 第一个 PR 都 merge、真机用起来以后，这份 spike 移到 `archived/`。

---

# Part 4 · iOS app dev 101

写给熟悉 Next.js / React / TypeScript、没写过 iOS 的人。每一节先给 web 里对应的东西，再讲 iOS 的做法。

## 对照表

| Web（你现在的 stack） | iOS |
| --- | --- |
| VS Code + `npm run dev` + 浏览器 | Xcode + ⌘R + Simulator 或真机 |
| TypeScript | Swift |
| React 组件（函数返回 JSX） | SwiftUI `View`（struct 的 `body` 返回 view） |
| `className="p-4 text-lg"` | modifier 链：`.padding().font(.title3)` |
| `useState` | `@State` |
| 把 state 和 setter 传给子组件 | `@Binding`（`$text`） |
| Zustand store | `@Observable` class |
| `useRef(...).focus()` | `@FocusState` |
| `useEffect(() => …, [])` | `.onAppear { }` / `.task { }` |
| `fetch` | `URLSession` |
| zod 的 `parse` / TS 类型 | `Codable`（`JSONDecoder` 解出来就是有类型的 struct） |
| `localStorage` | `UserDefaults` / `@AppStorage` |
| IndexedDB / 文件 | `FileManager`（app 自己的沙盒目录）、SwiftData |
| 存 secret 的地方（服务端 env） | Keychain |
| `navigator.onLine` / `online` 事件 | `NWPathMonitor` |
| Service worker 的 background sync | `BGTaskScheduler`、background `URLSession` |
| npm / `package.json` | Swift Package Manager / `Package.swift` |
| Vitest | Swift Testing（`@Test`、`#expect`）、XCTest |
| Vercel 部署 | 签名 + 装到手机 / TestFlight / App Store |

## Xcode 是什么、怎么用

Xcode 是 Apple 唯一官方的 iOS IDE，只在 macOS 上有，从 Mac App Store 免费装（下载很大，十几 GB 起，装好后还要下载 iOS 的 Simulator runtime）。它包含：编辑器、编译器（Swift 工具链）、Simulator（在 Mac 上模拟 iPhone）、签名和装机、调试器、Instruments（性能分析）、上传 App Store / TestFlight 的工具。

**窗口的几块**：

- 左边 Navigator：文件树，以及搜索、编译错误、断点。
- 中间 Editor：写代码。SwiftUI 文件右边可以开 Canvas，用 `#Preview { ComposerView() }` 实时预览界面，像 Storybook。
- 右边 Inspector：选中东西的属性。
- 顶部工具栏：**scheme**（跑哪个 target，比如 DumpApp）和 **destination**（跑在哪：某个 Simulator 型号，或者你插着的 iPhone），旁边的 ▶ 就是 Run。
- 底部 Debug area：`print` 的输出和调试器。

**常用快捷键**：⌘R 编译并运行；⌘U 跑测试；⌘B 只编译；⌘. 停止；⇧⌘O 按名字打开文件；⌘⇧K 清理编译缓存（遇到怪问题时的第一招）。

**工程里的几个概念**：

- **Target**：一个产物，比如 app 本身、它的测试。
- **Bundle Identifier**：app 的全局唯一 id，反向域名格式，比如 `com.<你>.dump`。
- **Signing & Capabilities**（选中 target 后的一个 tab）：选签名的 Team（免费的 Apple ID 就是 Personal Team）；加能力，比如 Background Modes。
- **Info.plist**：app 的配置清单，像 `manifest.json`：后台任务的 id、网络安全例外都写在这里。用 XcodeGen 的话，这些写在 `project.yml` 里，由它生成。
- **Build configuration**：Debug 和 Release，像 `NODE_ENV`。

## Swift 基础

```swift
let name = "dump"            // 常量，像 const
var count = 0                // 变量，像 let
count += 1

// 可选值：String? 是「可能是 nil 的 String」，像 string | undefined
var token: String? = nil
if let token { print("有 token: \(token)") }      // 解包：有值才进来
let value = token ?? "none"                        // 像 ??
guard let token else { return }                    // 没有就提前返回，像 if (!token) return

// struct 是值类型（赋值时复制），默认用它；class 是引用类型
struct PendingEntry: Codable, Identifiable {
    let id: UUID
    let content: String
    let capturedAt: Date
}

// enum 可以带数据，switch 必须处理每一种（像 AGENTS.md 里 default 断言 never 的效果，编译器自己就管）
enum SyncResult {
    case accepted([UUID])
    case retryLater
    case unauthorized
}

func describe(_ result: SyncResult) -> String {
    switch result {
    case .accepted(let ids): return "送出 \(ids.count) 条"
    case .retryLater: return "稍后重试"
    case .unauthorized: return "token 无效"
    }
}

// 闭包，像箭头函数；最后一个参数是闭包时可以写在括号外
let lengths = ["a", "bb"].map { $0.count }

// 错误：throws / try / do-catch，像 throw / try-catch，但必须在签名上声明
func load() throws -> Data { try Data(contentsOf: someURL) }

// async/await 和 JS 几乎一样
func send() async throws -> SyncResult { … }
Task { let result = try await send() }   // 在同步代码里开一个异步任务，像不 await 的 Promise

// actor：自带锁的 class，里面的状态同一时刻只有一个调用能碰，调用要 await
actor Outbox {
    private var isFlushing = false
    func flush() async {
        guard !isFlushing else { return }
        isFlushing = true
        defer { isFlushing = false }    // 函数结束时执行，像 finally
        …
    }
}

// protocol 像 TS 的 interface；用来把 NWPathMonitor、Keychain 这些 iOS 专属的东西注入进可测的代码
protocol TokenStore {
    func read() -> String?
}
```

**Swift 6 的并发检查**：编译器会在编译时检查跨线程共享的可变状态（data race），报错时通常的修法是把状态放进 actor，或者把 UI 相关的类型标成 `@MainActor`（只在主线程跑，UI 必须在主线程更新）。刚开始会觉得它很烦，它挡掉的就是 JS 单线程里不存在的那类 bug。

## SwiftUI 怎么做 UI

View 是一个 struct，`body` 描述界面；state 一变，SwiftUI 重新算 `body` 并更新屏幕，和 React 的思路一样。

```swift
import SwiftUI

@main
struct DumpApp: App {
    var body: some Scene {
        WindowGroup {
            ComposerView()
        }
    }
}

struct ComposerView: View {
    @State private var text = ""
    @FocusState private var isFocused: Bool
    @Environment(\.scenePhase) private var scenePhase

    private var canSubmit: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            TextEditor(text: $text)              // $text 是 Binding：子 view 能改父 view 的 state
                .focused($isFocused)
                .padding()
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {   // 键盘上方的那一条
                        Spacer()
                        Button("Dump", action: submit)
                            .disabled(!canSubmit)
                    }
                }
        }
        .onAppear { isFocused = true }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { isFocused = true }       // 切回前台时重新弹键盘
        }
        .sensoryFeedback(.success, trigger: submitCount)  // 提交时轻震
    }

    @State private var submitCount = 0

    private func submit() {
        let content = text.trimmingCharacters(in: .whitespacesAndNewlines)
        text = ""
        submitCount += 1
        Task { await Outbox.shared.enqueue(content) }
    }
}

#Preview { ComposerView() }
```

- **布局**：`VStack`（竖排）、`HStack`（横排）、`ZStack`（叠放）、`Spacer()`（撑开），像 flex column / row。
- **modifier 的顺序有意义**：`.padding().background(.red)` 和 `.background(.red).padding()` 不一样，每个 modifier 包住前面的整个 view。
- **跨 view 共享的状态**：`@Observable class SyncStatus { var pendingCount = 0 }`，在 App 里建一个，用 `.environment(status)` 放下去，子 view 用 `@Environment(SyncStatus.self)` 取，像 React 的 Context + store。
- **颜色和字体**：用系统语义的（`.primary`、`.secondary`、`.body`），深色模式、动态字体大小自动适配，像 daisyUI 的语义 token。

## 手机上的存储

每个 app 有自己的沙盒，看不到别的 app 的文件。几个目录：

| 目录 | 放什么 | 会被系统清吗 |
| --- | --- | --- |
| `Documents` | 用户的文件（可以在「文件」app 里露出来） | 不会，会进 iCloud 备份 |
| `Library/Application Support` | app 自己的数据，outbox 放这里 | 不会，会进备份 |
| `Library/Caches` | 能重新下载的东西 | 空间紧张时会 |
| `tmp` | 临时文件 | 随时 |

```swift
// 写一条进 outbox
let base = try FileManager.default.url(
    for: .applicationSupportDirectory, in: .userDomainMask,
    appropriateFor: nil, create: true)
let outbox = base.appending(path: "outbox", directoryHint: .isDirectory)
try FileManager.default.createDirectory(at: outbox, withIntermediateDirectories: true)

let data = try encoder.encode(entry)
try data.write(to: outbox.appending(path: "\(entry.id).json"), options: .atomic)

// 列出、读回、删掉
let files = try FileManager.default.contentsOfDirectory(at: outbox, includingPropertiesForKeys: nil)
let entry = try decoder.decode(PendingEntry.self, from: Data(contentsOf: files[0]))
try FileManager.default.removeItem(at: files[0])
```

- **`UserDefaults` / `@AppStorage("draft") var draft = ""`**：小的设置和草稿，像 `localStorage`。
- **Keychain**：密码、token。API 是 C 风格的（`SecItemAdd`、`SecItemCopyMatching`），一般包一个二三十行的小 helper，或者用 KeychainAccess 这类库。
- **SwiftData**：`@Model class` 声明表，`@Query` 在 view 里查，像一个和 SwiftUI 绑在一起的 Prisma。这个 app 用不到，native Mars Workbench 可能会用。

## 调外部 API

```swift
struct CaptureRequest: Encodable { let entries: [PendingEntry] }
struct CaptureResponse: Decodable { let acceptedIds: [String] }

func post(_ batch: [PendingEntry], token: String) async throws -> SyncResult {
    var request = URLRequest(url: baseURL.appending(path: "api/v1/dump-entries"))
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try encoder.encode(CaptureRequest(entries: batch))

    let (data, response) = try await URLSession.shared.data(for: request)  // 断网时这里 throw
    guard let http = response as? HTTPURLResponse else { return .retryLater }

    switch http.statusCode {
    case 200:
        let body = try JSONDecoder().decode(CaptureResponse.self, from: data)
        return .accepted(body.acceptedIds.compactMap(UUID.init(uuidString:)))
    case 401: return .unauthorized
    default: return .retryLater                 // 400 的处理看 Q13
    }
}
```

- **`Codable`**：`Encodable` 把 struct 变成 JSON，`Decodable` 反过来；字段名和 JSON 的 key 一样就不用写映射。解码失败会 throw，效果像 zod 的 `parse`。
- **日期**：`JSONEncoder` 默认把 `Date` 编成一个数字，要设 `dateEncodingStrategy`。内置的 `.iso8601` 不带毫秒，服务端要毫秒，所以用 `.custom`，里面用 `Date.ISO8601FormatStyle(includingFractionalSeconds: true)` 格式化（见下面的坑）。
- **App Transport Security（ATS）**：iOS 默认只允许 HTTPS。Vercel 是 HTTPS，没问题；Debug 时连 `http://localhost:3000` 要在 Info.plist 的 Debug 配置里加 `NSAllowsLocalNetworking`。
- **Simulator 和真机连本地 dev server**：Simulator 和 Mac 共享网络，`localhost` 就是 Mac；真机要用 Mac 的局域网 IP，而且 `next dev` 要监听 `0.0.0.0`。
- **Vercel 的 preview 部署默认有 Deployment Protection**（要登录 Vercel 才能访问），app 调 preview URL 会被挡；V1 只调 production。

## 断网、恢复、自动重试

三件事合起来：**知道网回来了**、**失败了过一会儿再试**、**app 不在前台时也有机会送**。

```swift
import Network

// 1. 知道网回来了
final class NetworkMonitor {
    private let monitor = NWPathMonitor()
    func start(onOnline: @escaping @Sendable () -> Void) {
        monitor.pathUpdateHandler = { path in
            if path.status == .satisfied { onOnline() }
        }
        monitor.start(queue: DispatchQueue(label: "network-monitor"))
    }
}
// 在 App 里：monitor.start { Task { await Outbox.shared.flush() } }

// 2. 失败了过一会儿再试（在 Outbox actor 里）
private var retryDelay: Duration = .seconds(1)

private func scheduleRetry() {
    let delay = retryDelay
    retryDelay = min(retryDelay * 2, .seconds(300))
    Task {
        try? await Task.sleep(for: delay + .milliseconds(Int.random(in: 0...500)))
        await flush()
    }
}
// flush 成功后把 retryDelay 重置成 1 秒

// 3a. 切到后台时，向系统多要约 30 秒把这次送完
let taskId = UIApplication.shared.beginBackgroundTask()
await Outbox.shared.flush()
UIApplication.shared.endBackgroundTask(taskId)

// 3b. 后台很久以后，请系统找机会唤醒
WindowGroup { ComposerView() }
    .backgroundTask(.appRefresh("dump.flush")) {
        await Outbox.shared.flush()
    }
// 切后台且 outbox 不空时提交请求：
try? BGTaskScheduler.shared.submit(BGAppRefreshTaskRequest(identifier: "dump.flush"))
// Info.plist：BGTaskSchedulerPermittedIdentifiers 列出 "dump.flush"；Background Modes 勾上 Background fetch
```

- **iOS 的后台很严**：app 切到后台几秒后就被挂起，代码不再跑。`beginBackgroundTask` 只是延长一小会儿；`BGAppRefreshTask` 什么时候跑由系统按你用 app 的习惯、电量、网络决定，可能几十分钟，也可能不跑；被用户从多任务里划掉的 app，系统不会再给它后台刷新，直到下次打开。所以「下次打开时送」是兜底，而它对这个 app 足够：你会经常打开它。
- **幂等是重试的前提**：每条带着自己的 `id`，所以任何一次重试都不会多出一条（Part 1 › 幂等）。
- **测 `BGAppRefreshTask`**：Xcode 调试时可以在暂停的调试器里执行一条命令让系统立刻触发它，不用真等；具体命令以 Apple 文档为准。

## 测试

```swift
import Testing
@testable import DumpCore

@Test func acceptedEntriesAreRemovedFromTheOutbox() async throws {
    let outbox = Outbox(directory: .temporaryDirectory, client: FakeClient(result: .accepted([…])))
    await outbox.enqueue("hello")
    await outbox.flush()
    #expect(try await outbox.pendingCount() == 0)
}
```

- Swift Testing（`import Testing`、`@Test`、`#expect`）是新的测试框架，写法像 Vitest；老的 XCTest（`XCTAssertEqual`）还能用，UI 测试还要用它。
- 网络用一个假的 client（实现同一个 protocol），像 Vitest 里注入一个假的 fetch；本地目录用临时目录。
- Package 里的测试在 Mac 上 ⌘U，在 Linux 上 `swift test`。

## 一些坑

- **聚焦和键盘**：`@FocusState` 在 view 刚出现时设 `true`，偶尔因为 view 还没进窗口而不生效。真机上不弹的话改在 `.task { }` 里设，或者推到下一个 run loop。
- **毫秒**：`Date()` 比毫秒细。服务端的 `createdAt` 是毫秒精度，客户端要先把 `capturedAt` 截到毫秒再存进 outbox：`Date(timeIntervalSince1970: (date.timeIntervalSince1970 * 1000).rounded(.down) / 1000)`。
- **UUID 的大小写**：Swift 生成大写，服务端回小写，比较时都转成 `UUID`。
- **主线程**：更新 UI 的 state 必须在主线程。`@Observable` 的 status 标 `@MainActor`，从 actor 里更新它时 `await MainActor.run { … }`。
- **`.xcodeproj` 冲突**：用 XcodeGen 就没有这个问题（Q10）。

## 装到手机上

**每台 Mac 只做一次**：

1. 装 Xcode，打开一次，让它装完组件和 iOS Simulator。
2. Xcode › Settings › Accounts，登录你的 Apple ID。

**每部手机只做一次**：

1. 用数据线连上 Mac，手机上点「信任这台电脑」。
2. 打开 Developer Mode：手机「设置 › 隐私与安全性 › 开发者模式」打开，手机会重启。这个开关要等 Xcode 至少连过一次这部手机后才会出现。
3. 第一次连上后，Xcode 可以通过同一个 Wi-Fi 无线装机（Xcode › Window › Devices and Simulators 里看到手机即可），以后不用插线。

**每次装**：在 Xcode 顶部的 destination 选你的 iPhone，⌘R。免费账号第一次装好后，手机上要到「设置 › 通用 › VPN 与设备管理」里信任你的开发者证书，app 才能打开。

**两种账号的区别**（价格是写这份 spike 时的，以 Apple 官网为准）：

| | 免费 Apple ID（Personal Team） | Apple Developer Program（$99 / 年） |
| --- | --- | --- |
| 装到自己手机 | 可以，用 Xcode | 可以，用 Xcode |
| 签名的有效期 | **7 天**，到期 app 打不开，要用 Xcode 重新装一次（数据保留） | 1 年 |
| 同时装的 app 数 | 每部设备最多 3 个 | 不限 |
| 部分能力 | 有些 capability 不能用（比如 push notification）；后台刷新可以 | 全部 |
| TestFlight | 不能 | 可以：传上去以后手机上的 TestFlight app 一点就装，不用连 Mac；每个 build 有效 90 天；内部测试（自己团队里的人，最多 100 个）不用审核 |
| Xcode Cloud | 不能 | 每月含 25 小时编译时间 |
| 上 App Store | 不能 | 可以（这个 app 不需要） |

## CI/CD

**CI（每个 PR 自动检查）**：

| 做什么 | 跑在哪 | 说明 |
| --- | --- | --- |
| `DumpCore` 的 `swift test`、格式检查（`swift-format` 或 SwiftLint） | GitHub Actions 的 Linux runner | 和 mars-workbench 的 CI 一样便宜（Q11 的好处） |
| 编译 app、跑 app target 的测试：`xcodebuild test -scheme DumpApp -destination 'platform=iOS Simulator,name=<机型>'` | GitHub Actions 的 macOS runner | macOS runner 在 private repo 里按 Linux 的 10 倍计分钟数（public repo 免费）；以 GitHub 当前的定价页为准 |

**CD（自动装到手机）**，三种做法：

| 做法 | 需要 | 流程 | 说明 |
| --- | --- | --- | --- |
| 1 · 不做 CD | 免费账号即可 | merge 后在 Mac 上 `git pull` → `xcodegen generate` → ⌘R | 免费账号每 7 天要重装一次 |
| 2 · Xcode Cloud → TestFlight | Developer Program | 在 App Store Connect 里连上 GitHub repo，设一个 workflow：push 到 `main` 就编译、签名、传 TestFlight；手机上 TestFlight 自动更新 | Apple 自己管签名证书，配置最少；用 XcodeGen 的话，workflow 里要加一个脚本先跑 `xcodegen generate` |
| 3 · GitHub Actions + fastlane → TestFlight | Developer Program、一个 App Store Connect API key（放 GitHub secrets）、签名证书 | fastlane `match` 管证书，`gym` 编译，`pilot` 上传 TestFlight | 最灵活，和 CI 在一个地方；配置和维护最多，macOS runner 的分钟数按上面算 |

签名的概念（做 2 或 3 时会碰到）：**证书**（certificate）证明「是你签的」；**provisioning profile** 把证书、app 的 bundle id 和允许装的设备绑在一起。免费账号和 Xcode 的「Automatically manage signing」会替你处理这两个；CI 上没有你的 Mac，所以要么交给 Xcode Cloud，要么用 fastlane `match` 把它们加密存进一个 repo。
