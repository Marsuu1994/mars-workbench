# Experiments

Controlled comparisons of ways of working on this repository — agent workflows, models and effort, tooling, review — measured on a real task. A spike in `design/spike/` settles a question about the product; an experiment settles which way of working is faster, cheaper or better, with numbers.

## How it is organized

```text
experiments/
├── README.md            # this page
├── AGENTS.md            # rules and templates for the agent that writes or runs a try
└── <question>/          # one folder per question
    └── tryN/            # one execution: a replication, or a variant that changes one thing
        ├── instruction.md   # what was compared and how: question, arms, measures, hypotheses, budget
        └── report.md        # what it found, conclusion first
```

The working material of a try — prompts, controller tools, run and review branches, raw measurements, the controller's log — sits in that try's own lab repository (`mars-workbench-lab-<try>`), kept read-only once the report is written. Both files link to it.

One try, one lab repository, so no try's material is in another's context. What outlives a try is a dataset: when a try's implementations caught real problems, they become a case in `mars-workbench-evals`, the one repository shared across tries, and later experiments (which reviewer model, which implementer model, whether a new rule worked) rerun against it.

## Reading the results

Start with a try's `report.md`: the conclusion and the numbers behind it come first, then the analysis and what the next try changes. When a number needs context, `instruction.md` says what was compared and how it was measured.

| Question | Tries | Status |
| --- | --- | --- |
| [page-structure-parallel](./page-structure-parallel/) — serial vs parallel worktree subagents on an architecture-clear refactor | [try1](./page-structure-parallel/try1/report.md), [try2](./page-structure-parallel/try2/report.md) | closed: serial wins at this size (both tries) |

The series these questions belong to, and what comes next, is on the tracker under Harness engineering.

## Where to start

- To know what an experiment found: its latest `report.md`.
- To plan a new one: `AGENTS.md` here has the instruction template an agent fills in with you.
- To see how a past try was run step by step: its lab repository's controller branch.
