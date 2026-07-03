Before committing, perform these documentation updates for each affected feature README (`src/features/board/README.md`, `src/features/plan/README.md`, `src/features/priorities/README.md`, `src/features/auth/README.md`) and/or `AGENTS.md` / `CLAUDE.md`:

1. **Check off / remove completed items in `design/tracker.md`**:
   - The tracker holds open items only — remove items that were finished, don't keep them checked
   - Completed work is recorded in the feature README Update Logs (step 2), not in the tracker

2. **Update the Update Log** (in each affected feature README):
   - Add or update today's date section (format: `### YYYY-MM-DD`)
   - Write a short, concise bullet-point summary of what was accomplished today
   - If there are already entries for today, replace them with a consolidated summary of all work done today
   - Focus on user-facing changes and features, not implementation details

3. **Re-summarize Current State**:
   - Update the Current State section of each affected feature README to reflect the latest state of the feature

4. **Update `AGENTS.md` / `CLAUDE.md`**:
   - Update tech stack, project structure, and feature comments to reflect changes

Then commit all staged and unstaged changes with a descriptive commit message, and push to remote.
