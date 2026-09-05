---
id: index
title: Architecture Decision Records
sidebar_label: About ADRs
description: Why these records exist, the template they follow, and how to propose a new one.
---

# Architecture Decision Records

An **Architecture Decision Record** captures one architecturally significant
decision: what was decided, what was going on at the time that made the
decision necessary, and what the team now has to live with as a result.

The records here are not aspirational design documents. Each one reconstructs
a decision that is **actually visible in this repository** — in the code or
in `CLAUDE.md`. If you can't point at the consequence in the tree, it isn't
an ADR.

## The template

These follow **Michael Nygard's** lightweight format — one markdown file per
decision, numbered `0001-`, `0002-`, and so on:

| Section | Contains |
|---|---|
| **Title** | A short noun phrase naming the decision |
| **Status** | Proposed / Accepted / Deprecated / Superseded by ADR-NNNN |
| **Context** | The forces at play. Written in value-neutral language: what was true, not what we wanted. |
| **Decision** | The response to those forces, stated actively: *"We will…"* |
| **Consequences** | What becomes easier **and** what becomes harder. Both. |

Records are **immutable once accepted**. A decision that changes gets a new
record that supersedes the old one; the old one stays, with its status
updated.

## The records

| # | Title | Status |
|---|---|---|
| [0001](./0001-shell-owns-cross-cutting-screens-only.md) | The shell owns only cross-cutting screens; every remote owns its own bounded-context UI | Accepted |

For the fleet-wide decision to adopt a micro-frontend console architecture in
the first place, see `warehouse-ops-agent`'s own ADR-0002
("Micro-frontend console architecture") and ADR-0003 ("console-bff report
dashboards") — this repo's own records pick up from there rather than
re-litigating that choice.

## Proposing a new one

1. Copy the most recent record and renumber it. Numbers are never reused,
   even if a record is later withdrawn.
2. Write the **Context** first, and write it neutrally. If the context
   section already argues for the outcome, the decision was not really open.
3. Write **Consequences** honestly, including the ones you dislike.
4. Open it as `Proposed`. Flip it to `Accepted` when it is agreed.
5. Add it to the table above and to `sidebars.ts`.
