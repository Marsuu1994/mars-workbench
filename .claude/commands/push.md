Before committing, perform these documentation updates for each affected feature (`features/chat/README.md`, `features/kanban/README.md`, etc.):

1. **Move finished Backlog items to Done**:
   - Find all items marked with `[x]` in the Backlog section
   - Move them to the Done section
   - Keep items in the Done section marked with `[x]`

2. **Update the Update Log**:
   - Add or update today's date section (format: `### YYYY-MM-DD`)
   - Write a short, concise bullet-point summary of what was accomplished today
   - If there are already entries for today, replace them with a consolidated summary of all work done today
   - Focus on user-facing changes and features, not implementation details

3. **Re-summarize Current State**:
   - Update the Current State section to reflect the latest state of the feature

Then commit all staged and unstaged changes with a descriptive commit message, and push to remote.