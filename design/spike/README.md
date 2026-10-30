# Spikes

Point-in-time proposals for open questions. A complex task — several PRs, a data-model change, a new tool surface, or a choice with real tradeoffs — or a design or tooling question with no owner decision yet starts here, not with code, a chat log or a premature refactor. Spikes are not living docs: once decided they are frozen, and once implemented they move to [archived/](./archived/).

## Lifecycle

1. **Spike** — write a self-contained doc here, headed `Status: awaiting owner review` and linked from the tracker item it answers. An exploration parked until its work is picked up is headed `Status: draft` instead; it moves to awaiting owner review when that work starts.
2. **Review** — go back and forth with the owner on the spike's PR, editing the spike in place each round.
3. **Decided** — once every open question is answered, record the answers in a Decision section and mark `Status: decided`. From here the spike is frozen; later decisions land in the tracker and the PRs that make them.
4. **Implement** — build what it decided, and update the living docs (`baseline.md`, `flows/`, `reference.md`, scenarios) so they stand on their own without the spike. A session that writes the spike and builds it keeps both in one PR (AGENTS.md › Version Control › *One task, one branch, one PR*).
5. **Archive** — in the PR that finishes step 4, `git mv` the spike to `archived/` and fix every link to it.

Bad: a decided spike whose last PR landed still sitting here next to open ones. Good: `archived/board-prop-drilling.md`, moved once PR #53 shipped Option C3 — its leftover follow-ups live on as tracker items.

## Shape

- **Self-contained**: the trigger (what prompted it), options with honest pros and cons, and a concrete implementation plan per option. Number the open questions so the owner can answer them one by one.
- **Written in Chinese with English terms.** The narrative is Chinese; product nouns, states and code identifiers stay in English (habit / project / step / one-off / backlog, `instanceIndex`, `create_plan`), so every term matches the code, the mockups and the tracker one-to-one. Say so in a one-line language note under the header. Reference: `archived/week-model-restructure.md`. Bad: "项目步骤的生命周期和临时任务一样" (translated terms) or an all-English spike. Good: "Project step 的生命周期和 one-off（`AD_HOC`）一样".
