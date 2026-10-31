# Reviews

The owner's code reviews, one file per pull request: which branch and commit was reviewed, every comment left, and what became of it. GitHub keeps the comments too; this log adds what GitHub doesn't — what kind of problem each comment caught and how it ended — and keeps it with the code, where later work can read it.

## Why

- **To see patterns.** A kind of comment that keeps coming back is a rule or a tool missing (AGENTS.md › Adding a rule), the same way the page-structure experiment's ten implementations showed which rules were missing.
- **As a dataset.** Each entry is a real problem that CI let through and a person caught. That is the ground truth a code review agent is measured against (spike `code-reviewer-agent.md`, PR #82), and a candidate case for the evals repository.

## How it is organized

```text
reviews/
├── README.md        # this page
├── AGENTS.md        # the format, and when an agent writes an entry
└── pr-<NNN>.md      # one file per reviewed PR, zero-padded number: pr-097.md
```

One file per PR rather than per day or one long log: a review belongs to one PR, the PR that addresses it writes its file on its own branch (two PRs never edit the same file), and a file is one self-contained case for a dataset.

## Where to start

The newest `pr-*.md` files; or search by kind (`Kind: rule`) across them to see what keeps coming back.
