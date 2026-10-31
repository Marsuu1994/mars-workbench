# Reviews — rules for agents

`README.md` here says what this log is for.

## Rules

1. A session that addresses the owner's review on a PR records it in `reviews/pr-<NNN>.md` (number zero-padded to three digits), on that PR's branch, in the same push as the fixes. A later review round on the same PR appends to the same file.
2. Only the owner's reviews go here — not bot findings, not the session's own notes.
3. Quote each comment verbatim, in its original language. Don't summarize it.
4. Every comment ends with an outcome: fixed (the commit), decided (what, after discussion), won't fix (why), or open (waiting on whom). Update it when that changes.
5. Kind is one of: `bug` (wrong behavior), `rule` (breaks or is missing a written rule), `docs` (a doc is wrong, stale or at the wrong altitude), `design` (the approach itself), `scope` (too much or too little in the PR), `question` (asks why, no change asked).

## Template

```markdown
# PR #<n> — <title>

**Branch** `<branch>` · **Reviewed** <YYYY-MM-DD> at `<head sha>` · **Review** <commented | changes requested | approved> · <link to the review>

> <the review's own body, verbatim, if it has one>

## 1 · `<file>:<line>` · <kind>

> <the comment, verbatim>

**Outcome:** <fixed in `<sha>` | decided: … | won't fix: … | open: waiting on …>
```
