# ENGINE.md — the calculation engine

> `src/engine/` answers one question: **given this household and these assumptions, what does
> each year of retirement look like, and what is the earliest age at which the money lasts?**
> This file is the contract the engine keeps. `CLAUDE.md` says how to write code here;
> `SOURCES.md` (generated) says where every number came from.

## 1. Conventions

These are **laws**, and where a test enforces one it is named.

- **Pure and deterministic.** No React, DOM, `Date`, `Math.random`, `Intl`, `localStorage` or
  `fetch`, and no import that escapes `src/engine/`. "Today" is an *input*
  (`Assumptions.today`), never read from a clock. *(`lib/enginePurity.test.ts`)*
- **Money is a `number`, in dollars, nominal.** Rounded to cents only at module *outputs*; to
  the dollar where the official rule rounds to the dollar (brackets, TFSA room). Doubles carry
  ~15.9 significant digits; the largest magnitude here is under 10⁹ and the longest chain is
  ~50 years × ~30 operations, so the accumulated relative error is ~10⁻¹² — three orders of
  magnitude below a cent on a million dollars. A decimal library would add bundle, a foreign
  type at every boundary, and a solution to a problem this domain does not have (no ledger to
  reconcile; every output is an estimate). **Never compare money with `===`**: tests use
  `toBeCloseTo(x, 2)`.
- **Nominal dollars with explicit inflation.** `Assumptions.inflation` projects CPI-indexed
  parameters past the last known year, inflates the spending need, and indexes pensions in pay.
  Everything in a `YearRow` is in *that year's* dollars; `todayDollars()` exists for the UI only.
- **Years and ages.** Calendar years. `age(year) = year − birth.year` (the age attained that
  year). A pension starts the month *after* the birthday month; the start year is prorated by
  months paid. Everything else is annual.
- **Every parameter is cited.** A number from a government page lives in `engine/params/` as a
  `Cited` value — `{ value, source: { url, title, retrieved, note? }, index, round? }` — and the
  engine reads it only through `plain()`. A bare constant that is really a government figure is
  a bug. *(`engine/params/cited.test.ts`)*
- **Past years are never recomputed.** A year before the last known parameter year comes from
  the person's own statement (the relevé), not from this engine.
- **Official rounding is data.** A parameter's `round` field says how the *projected* value is
  rounded (to the cent, the dollar, the 500 dollars), so projection needs no per-field code.

## 2. What is official and what is simplified in v1

Every simplification is **named here**, so a result is never quietly more precise than it is.
`✅` = implemented as the official rule reads · `◐` = implemented with a documented v1
simplification · `⬜` = not yet built (see `STATE.md` for the phase).

| Module | Status | Official rule | v1 simplification (flagged) |
| --- | --- | --- | --- |
| `params/` | ✅ | per-year tables, each value cited to an official page; 84 figures for 2026 | future years projected from the last known year by each figure's index rule, cumulatively (`round(last × (1+i)^n)`); verified to reproduce the officially published 2025 → 2026 indexation to within $1 (federal) and exactly (Québec) |
| `rrq.ts` | ✅ | contributory months, 15 % drop-out, base 25 %, two additional components over 480 months with phase-in, the sliding early-start factor, +0.7 %/month late, the post-2024 « highest of two calculations » | reproduces the leaflet's worked example to the cent and the published 2026 maximum pensions; child-rearing and disability drop-outs ignored; earnings after the pension starts (the retirement-pension supplement) ignored |
| `oas.ts` | ⬜ | 40-year residence proration, deferral +0.6 %/mo to 60 months, +10 % at 75, 15 % recovery tax | recovery uses same-year net income (the real rule uses the prior year, from July) |
| `gis` (in `oas.ts`) | ⬜ | income-tested table with an employment exemption | formula approximation of the table, tolerance declared in the verified test |
| `taxFederal.ts` | ⬜ | brackets, BPA with high-income phase-down, age and pension-income amounts, QPP credit, Québec abatement | enhancement contributions treated as a credit rather than a deduction |
| `taxQuebec.ts` | ⬜ | brackets, BPA, age / living-alone / retirement-income amounts with their reduction | FSS contribution and the RAMQ drug premium not modelled |
| `tax.ts` | ⬜ | pension income splitting at 65+ | 0 % or 50 % only, whichever lowers the household total |
| `accounts.ts` | ⬜ | RRIF minimum factors, TFSA room, capital-gains inclusion | non-registered return treated entirely as deferred capital gain |
| `dbPension.ts` | ⬜ | accrual × service × best average, coordination with the RRQ, early-retirement reduction, bridge | RREGOP preset verified against the plan's own worked example |
| `projection.ts` | ⬜ | — | runs to the older person's horizon age; survivor scenarios are v2 |
| `retireAt.ts` | ⬜ | — | searches ages 55–70 |
| `simulate.ts` | ⬜ | — | sensitivity grid only; Monte-Carlo is v2 |

## 3. How a number earns trust

1. **Parameter literal tests** — one `it` per leaf, the official URL in the test name, the value
   re-typed from the page. Two independent transcriptions of one figure: a typo in either fails.
2. **Worked examples** — `engine/verified/*.verified.test.ts`, each opening with a header naming
   the page, the title, the retrieval date and the tolerance. *(`verifiedHeader.test.ts`)*
3. **Property tests** — monotonicity and continuity over a deterministic grid (the age at which
   you start a pension never lowers it; one more dollar of income never lowers net income).
4. **A golden household** — a committed snapshot of a whole projection, reviewed in the diff
   whenever it changes.
5. **Plant the bug.** A new guard or test is run against the defect it was written for, and seen
   to fail, before it is trusted.

## 4. Adding a tax year

1. Create `engine/params/<year>.ts` as a `satisfies YearParams` literal — every leaf `Cited`,
   with the official URL and today's `retrieved` date.
2. Add it to `KNOWN` in `engine/params/index.ts`.
3. Add `engine/params/<year>.test.ts` — one literal assertion per leaf, URL in the name.
4. `npm run sources` (regenerates `SOURCES.md`), then update the golden household and review the
   diff — a year's indexation should move numbers in the direction you expect, and by about
   the percentage you expect.
