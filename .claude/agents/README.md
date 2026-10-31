# Subagents

Claude Code subagents for this repository. Each one runs in its own context with its own tools and hands back a short report. This page is for people: why each agent exists and how it works. The agent files beside it are for the agents: the instructions each one follows. Claude Code skips this page because it has no frontmatter.

## When a subagent pays off

Two reasons, measured in `design/spike/archived/subagent-delegation-pilot.md`. The first is keeping large, throwaway output out of the main session: screenshots, job logs, test runs. The second is judging from a clean context. Each delegation starts cold and adds wall time, so small jobs stay in the main session (AGENTS.md › Workflow › Subagents).

| Agent | Job | Called when | Why |
| --- | --- | --- | --- |
| `ui-verifier` | Checks a UI change in the Design Console against a brief | A layout change, a new scenario tab, or the owner asks | Screenshots and scripts stay out of the main context; in the pilot it caught a console error before CI did |
| `test-writer` | Writes the failing test a fix starts with | An e2e test, or a layer the session hasn't read | It reads `test/README.md` and the nearby specs so the main session doesn't |
| `ci-fixer` | Takes a red GitHub CI job, fixes what's mechanical, proposes the rest | CI is red on GitHub | The job log stays out of the main context |
| `code-reviewer` | Reviews a change against the written rules before it's pushed | Before the first push of every PR (pilot) | Below |

## code-reviewer

### The problem it solves

- **CI and the tests catch most bugs.** Only a handful of problems in this repository's history surfaced after merge (the spike's golden set lists them), and the unit, integration and e2e suites have run in CI since #75.
- **What slips through is rule drift.** Agents copy the code around them rather than AGENTS.md. The quality-sweep pilot found 42 places where `main` disagrees with its rules; ten blind reviews of the page-structure experiment flagged the same lint-clean problems again and again. Nobody reviews a change for this today: CI can't, and the owner can't read every line.
- **The author reviews last.** By the time a session pushes, it is deep in a long context and has already agreed with its own choices, while AGENTS.md sits at the top of that context.

### The approach

- **A clean context** that holds only the rules, the diff and the code the diff touches. Its brief is one sentence of intent and the base ref, so the author's reasoning doesn't come along.
- **The touched function, not the hunk.** A change is judged by what the whole function looks like after it, old lines included, because that is where drift hides: an untouched line next to the change can still skip the path the rules require. When the change alters what a function promises, its callers are read too. Anything wider is for tests.
- **Verified findings, not scores.** Each finding quotes the rule it breaks or gives the failing scenario, and is re-checked before it's reported. In the experiment the scores barely separated the candidates; the defect lists carried the signal.
- **What it doesn't do**: re-run CI, review style no rule states, edit files, or post to GitHub. Findings go back to the main session.

Public practice it borrows from:
- Anthropic's review agents: quote the exact rule, drop what a linter catches, verify each finding.
- obra/superpowers: read-only, HEAD included.

It differs from Anthropic's `code-review` plugin on purpose. That plugin reviews only the diff and counts pre-existing issues as false positives; here the whole touched function is in scope.

### Status

A pilot. `design/spike/code-reviewer-agent.md` measures it on a golden set of real misses from this repository's history before it becomes a rule in AGENTS.md.
