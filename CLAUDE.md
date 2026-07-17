# Claude Code Addendum

@AGENTS.md

## Import Order

1. `@AGENTS.md` is imported above as the shared base rules.
2. Apply this file only for Claude Code-specific behavior.

If there is a conflict, use `AGENTS.md` for general engineering rules and this file for Claude-only workflow details.

## Claude Skills

Use Claude slash-skills where applicable:

- `/new-flow` for adding a new flow.
  - Example: `/new-flow priorities track-this-week`
  - Reference: `.claude/skills/new-flow/SKILL.md`
- `/new-feature` for adding a new feature scaffold.
  - Example: `/new-feature auth`
  - Reference: `.claude/skills/new-feature/SKILL.md`
- `/design-explore` for future design exploration.
  - Example: `/design-explore board drag-drop`
  - Reference: `.claude/skills/design-explore/SKILL.md`

## Claude-Specific Notes

- Keep skills usage explicit in prompts when a task matches one of the above domains.
- Implemented UI is documented by the scenario pages (`src/app/design/scenarios/`); keep exploration mockups for unbuilt designs in `design/mockup/future-work/`.
