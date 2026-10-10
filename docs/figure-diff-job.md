# A weekly figure-diff job — design note (not built)

> Status: **a design, no code.** Written for the day the project is bored enough to build it. Nothing
> here is promised, and nothing in the app depends on it.

## The problem

`sources.yml` already opens every cited page once a week and fails when a page is **gone**. It does
not notice when a page is **still there but the number on it moved**: the QPP maximum retirement
pension, the OAS quarterly amount (it changes every quarter), a tax bracket threshold, the CCB
maximum in July, the CHSLD contribution on 1 January. Every January and July the project would rely
on a person remembering to look. A figure that quietly goes stale makes the answer wrong without
any test failing — the tests hold the figures to themselves, not to the pages.

## The job

Once a week (and on demand), for a short **watch list** of figures:

1. Fetch the cited page (the `source.url` already in `engine/params/`).
2. Pull the figure out of it with a per-figure **extractor** — a small function that returns the
   number the page prints now (a regex over the table row, or a CSV column for the Open Government
   tables).
3. Compare it with `plain(<figure>)` for the current tax year.
4. If they differ, open (or update) **one GitHub issue per figure** titled with the figure's id,
   quoting the old value, the new value, the page, the retrieval date, and which file to edit
   (`engine/params/2026.ts`, its literal test, `npm run sources`, the golden snapshots).
5. If the page cannot be fetched or the extractor finds nothing, report it as **unchecked**, never
   as unchanged. A silent extractor is worse than none (the same rule `sources.yml` follows for
   pages that refuse bots).

The job never edits the repository. A moved figure is a human decision: the new value may belong to
next year's `params/<year>.ts`, not this one.

## The watch list (start small)

| Figure | Page | Moves | How to read it |
| --- | --- | --- | --- |
| QPP maximum retirement pension at 65 | Retraite Québec | each January | the table row |
| OAS maximum, and the four GIS quarters | Service Canada tables (Open Government CSVs) | each quarter | CSV column |
| Federal and Québec bracket thresholds | CRA / Revenu Québec | each January | Revenu Québec refuses bots: report « blocked » |
| CCB maximums | CRA | each July | the page's table |
| CHSLD monthly contribution | the health-network fees page | each 1 January | the « Taux valides du … » table |

Start with the three that can be read mechanically (OAS CSV, CCB, CHSLD). Revenu Québec stays on
the human list in `STATE.md`.

## Shape

- `scripts/check-figures.ts`, beside `check-sources.ts`, with the extractors in a table keyed by the
  figure's params path (`'oas.maxMonthly'`), so the watch list is data.
- One new workflow, `figures.yml`, weekly, `permissions: issues: write`. No secrets beyond the
  default token.
- Dry-run mode that prints the diff and opens nothing, so an extractor can be developed against the
  live page.
- A test pins each extractor against a **saved copy of the page's table** (a fixture), so a layout
  change fails a unit test, not the weekly run. Plant the bug: edit the fixture's number and watch the
  comparison report a change.

## What it must not do

- Touch the engine, the params or any figure. Report only.
- Run on a visitor's machine. It is CI-side; the app keeps its no-network law.
- Treat a rounded or monthly/yearly restatement as a change (the CHSLD figure is monthly on the page
  and per-year in the care what-if: compare the monthly figure).

## Open questions for the day it is built

- Whether the extractors are brittle enough to cost more than a yearly human check. A plausible
  answer is to ship the three mechanical ones and keep the rest on the checklist in `ENGINE.md §4`
  (« Adding a tax year »).
- Whether one issue per figure or one weekly digest reads better.
