# Claude Code Addendum

@AGENTS.md

## Import Order

1. `@AGENTS.md` is imported above as the shared base rules.
2. Apply this file only for Claude Code-specific behavior.

If there is a conflict, use `AGENTS.md` for general engineering rules and this file for Claude-only workflow details.

## Claude Skills

Use Claude slash-skills where applicable:

- `/new-flow` for adding a new flow.
  - Example: `/new-flow kanban daily-sync`
  - Reference: `.claude/skills/new-flow/SKILL.md`
- `/new-feature` for adding a new feature scaffold.
  - Example: `/new-feature auth`
  - Reference: `.claude/skills/new-feature/SKILL.md`
- `/design-explore` for future design exploration.
  - Example: `/design-explore kanban board`
  - Reference: `.claude/skills/design-explore/SKILL.md`

## Claude-Specific Notes

- Keep skills usage explicit in prompts when a task matches one of the above domains.
- Keep source-of-truth active mockups in `src/features/[feature]/design/mockup/`.
- Use `mockup-v2/` only for future exploration artifacts.
