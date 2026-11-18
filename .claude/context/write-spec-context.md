# Write spec context

What the `write-spec` skill and the `write-spec-reviewer` agent both read: the skill to write a page's spec change from a decided design, the agent to check it. This file points to where each rule lives (AGENTS.md › Adding a rule) and says how to read the inputs; what the skill and the agent each do is in their own files.

## The standard

- `design/specs/README.md`, in full. A spec change from a design is written and checked against its Spec v2 sections, Items and IDs, Writing items from a design, and What a spec doesn't say.
- AGENTS.md › Documentation Style, for how the items read.

## The inputs

- **The page's spec**, `design/specs/<page>.md`, and `npm run check:spec -- --list <page>`, which prints each item with where it stands and the tests holding it.
- **The decided mockup**, `design/mockup/mockup-<area>.html`; what counts as decided is `design/README.md` › Mockups. Read its text and its script:
  - the text: strip the tags with a short script rather than reading the whole HTML;
  - the script: its state and its handlers are the mockup's behaviour model, saying what a click changes, what a count counts and what happens to the last one. Read its functions directly.
- **The design PR's review log**, `reviews/pr-<NNN>.md`, and the feature's item in `design/tracker.md`: what the owner decided in words that the drawing doesn't show.
- **The owner's answers in the session** that the review log doesn't hold yet, and **the questions still open for the owner**.
- **The change**: `git diff <base> -- design/specs/<page>.md`, where the base is usually `main`.
