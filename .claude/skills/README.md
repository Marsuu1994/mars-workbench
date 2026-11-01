# Skills

Claude Code skills for this repository, one folder each with its `SKILL.md`. A skill triggers on its own when its description matches the task; it needs `disable-model-invocation` only if it must never run unless named.

## Description format

The `description` is what both the owner and an agent read to decide whether a skill applies, so it is three labelled parts, in this order:

- **What:** the workflow at a high level, in a sentence or two — what starts it and what it ends with. No steps or file names; those live in the body.
- **When to use:** the requests or situations that call for it.
- **When not to use:** the near misses that look like it but go elsewhere, and where they go.

Good: `ui-feature/SKILL.md`.
