# Experiments

Controlled comparisons of ways of working on this repository — agent workflows, models and effort, tooling, review — measured on a real task with numbers. A design question about the product goes to `design/spike/`; an experiment answers "which way of working is faster, cheaper or better".

## How it is organized

```text
experiments/
├── README.md            # this page: what experiments are and how to read them
├── AGENTS.md            # the rules, templates and controller notes for whoever runs one
└── <question>/          # one folder per question, kebab-case
    └── tryN/            # one execution: a replication, or a variant that changes one thing
        ├── instruction.md   # the approved protocol: question, arms, measures, hypotheses, budget
        └── report.md        # what it found, conclusion first
```

Each try's working material — the exact prompts, controller tools, run and review branches, raw measurements and the controller's log — lives in a lab repository of its own (`mars-workbench-lab-<try>`), which is archived rather than deleted once the report lands. The instruction and the report link to it.

## Reading the results

Open a try's `report.md`: the conclusion and the numbers behind it come first, then the analysis and what the next try should change. `instruction.md` says what was compared and how, if a number needs context.

| Question | Tries | Status |
| --- | --- | --- |
| [page-structure-parallel](./page-structure-parallel/) — serial vs parallel worktree subagents on an architecture-clear refactor | [try1](./page-structure-parallel/try1/report.md), [try2](./page-structure-parallel/try2/instruction.md) | try1 reported; try2 ran its runs, review and report pending |

The series these questions belong to is on the tracker (`design/tracker.md` › Harness engineering).

## Running one

Write the try's instruction from the template in `AGENTS.md`, get the owner's approval, then run it as `AGENTS.md` describes. Agents read `AGENTS.md`; this page is for people.
