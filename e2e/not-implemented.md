# e2e tests not written yet

Flows in `design/flows/` that ship today but have no e2e test. When a test for one lands, delete its row. The list follows the flow docs as they stand, and those are due for a review first (tracker › *e2e after isolation*), so the review may add, merge or drop rows.

Which layer tests what: an e2e test proves a journey is wired end to end (the action lands, the page shows it); the value's edge cases belong to integration tests, and how each state looks belongs to the Design Console scenarios (`test/README.md`).

## Not covered yet

| Flow doc | Flow | What's missing |
| --- | --- | --- |
| `board.md` | Progress Tracking Flow | Only the day's count after one drag to Done is asserted (Drag and Drop Flow); the week's progress isn't |
| `board.md` | Backlog Flow | Pulling a card: dragging it onto Todo (desktop), `↑ Todo` in the sheet (mobile) |
| `plan.md` | Create Task Template Flow | All of it |
| `plan.md` | Update Task Template Flow | All of it |
| `plan.md` | Create Plan Flow | All of it |
| `priorities.md` | Reprioritize (Drag and Drop) Flow | All of it |
| `priorities.md` | Complete One-off Flow | Completing, and undo within the window |
| `priorities.md` | Add Priority Task Flow | All of it |
| `projects.md` | Create Project Flow | All of it |
| `projects.md` | Manage Steps Flow | Add, edit, delete and reorder a step |
| `dump.md` | Quick Capture Flow | All of it |
| `auth.md` | Theme Change Flow | All of it |
| `auth.md` | Sign-Out Flow | Signing out itself (only opening the settings sheet is tested) |

## Not for e2e

| Flow | Tested where |
| --- | --- |
| Plan with Claude (MCP), Manage One-offs with Claude (MCP), Draft Steps with Claude (MCP) | Integration: `/api/mcp` in process, and the services it calls |
| Ensure Synced, Daily Sync, End of Period Sync (`shared.md`) | Integration: date logic, since the server's clock can't be frozen from Playwright |
| Login, Sign-Up (Google) and OAuth Consent (claude.ai) | By hand: each needs an outside account |
