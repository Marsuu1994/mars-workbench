# Reviews — rules for agents

`README.md` here says what this log is for.

## Rules

1. A session that addresses the owner's review on a PR records it in `reviews/pr-<NNN>.md` (number zero-padded to three digits), on that PR's branch, in the same push as the fixes. A later review round on the same PR appends a round to the same file.
2. Each round and each comment links to its review or comment on GitHub (`#pullrequestreview-<id>`, `#discussion_r<id>`): the Review log check (`scripts/check-review-log.mjs`, on every push and every submitted review) fails while one of the owner's submitted reviews or comments has no entry, and warns for each entry still open.
3. Only the owner's reviews go here — not bot findings, not the session's own notes.
4. Quote each comment verbatim, in its original language. Don't summarize it.
5. Every comment ends with an outcome: fixed (the commit), decided (what, after discussion), won't fix (why), or open (waiting on whom). Update it when that changes.
6. Kind is one of: `bug` (wrong behavior), `rule` (breaks or is missing a written rule), `docs` (a doc is wrong, stale or at the wrong altitude), `design` (the approach itself), `scope` (too much or too little in the PR), `question` (asks why, no change asked).

## Template

```markdown
# PR #<n> — <title>

**Branch** `<branch>`

## Round <k> · <YYYY-MM-DD> at `<head sha>` · <commented | changes requested | approved> · [review](<url>#pullrequestreview-<id>)

> <the review's own body, verbatim; leave the round's outcome out when it has none>

**Outcome:** <…>

### <n> · `<file>:<line>` · <kind> · [comment](<url>#discussion_r<id>)

> <the comment, verbatim>

**Outcome:** <fixed in `<sha>` | decided: … | won't fix: … | open: waiting on …>
```
