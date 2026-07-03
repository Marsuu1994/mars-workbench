# Plan

Plan creation and editing for the weekly period planner (`/kanban/plans/*`): the shared plan form, task templates, and AI-assisted plan creation. See [design/baseline.md](../../../design/baseline.md) for the app-wide design baseline and [design/flows/plan.md](../../../design/flows/plan.md) for flow docs.

## Current State

- **Plan management**: create/edit plans (`/kanban/plans/new`, `/kanban/plans/[id]`) with inline type/frequency config per template, Plan Mode toggle (NORMAL/EXTREME), and a `ReviewChangesModal` diff before committing edits
- **Templates**: reusable task templates managed inline from the plan form (`templateActions`), preselected from the previous plan; template instances generate as `BACKLOG` for the board's "Queued" drawer
- **AI-assisted plan creation**: complete (backend + UI), backed by the shared `Chat`/`Message` tables. Server actions verified end-to-end: `getTemplateStatsAction` (per-template stats), `createAiChatAction` (static no-LLM welcome + suggestion chips, snapshots last-period stats into `Chat.metadata`), `generateDraftPlanAction` (OpenAI `gpt-5-nano` structured draft — reuses templates, calibrates from stats, replays prior drafts as history), and `approveDraftPlanAction` (atomically creates the plan, completes the prior `PENDING_UPDATE` plan, carries over ad-hoc tasks). `Chat.metadata` holds the stats snapshot + a `latestDraft` approval clipboard
- **AI chat UI**: Zustand-backed modal (`store/aiPlanChatStore` state + `hooks/useAiPlanChat` action bridge) opened from the plan form's AI assistant banner (create mode only), with suggestion chips, draft-plan cards, a refine→approve flow, and a success banner (`components/ai-chat/`)
- **Durable chat**: the DB chat row is the source of truth — on open it resumes the user's most recent unapproved chat (`getActiveAiChatAction` → rehydrate) across modal close, reload, and restart, and auto-resumes a generation interrupted mid-run (`resumeDraftPlanAction`); approval sets `Chat.planId`, so the next open starts fresh

Open items: see [design/tracker.md](../../../design/tracker.md).

## Update Log

### 2026-07-03
- Split from the kanban feature; prior history lives in [board/README.md](../board/README.md).
