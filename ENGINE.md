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
| `params/` | ✅ | per-year tables, each value cited to an official page; 90 figures for 2026 (+ 14 plan rules in `params/plans.ts`) | future years projected from the last known year by each figure's index rule, cumulatively (`round(last × (1+i)^n)`); verified to reproduce the officially published 2025 → 2026 indexation to within $1 (federal) and exactly (Québec) |
| `rrq.ts` | ✅ | contributory months, 15 % drop-out, base 25 %, two additional components over 480 months with phase-in, the sliding early-start factor, +0.7 %/month late, the post-2024 « highest of two calculations » | reproduces the leaflet's worked example to the cent and the published 2026 maximum pensions; child-rearing and disability drop-outs ignored; earnings after the pension starts (the retirement-pension supplement) ignored |
| `oas.ts` | ✅ | whole-year residence ÷ 40 (none under 10), deferral +0.6 %/mo to 60 months, the 10 % at 75 multiplying the deferred amount, the 15 % recovery tax capped at the pension | a person's residence is a single « resident since » year; under ten years of it there is no pension at all (and so no GIS); each calendar year uses the LATEST published quarter's level (2026: the October–December maximum, so the current year reads ≈ 1,7 % high); the recovery tax is computed on the SAME year's net income, which is the final liability on the return (only the July withholding uses the prior year) |
| `gis` (in `oas.ts`) | ◐ | the quarterly table's maximum, cut-off and top-up cut-off for each of three categories, through the Act's statutory slopes; employment exemption 5 000 $ + half of the next 10 000 $ | passes through every published figure of all four 2026 quarters; the slopes are DERIVED from the Act (flagged `verify`) and cross-checked across those four quarters; same-year income instead of last year's; the Act's $2 / $4 steps (« for each full two dollars ») are smoothed to their slope, at most ≈ $24 a year off; assumes a full-residence pensioner; the Allowance (a spouse aged 60–64) is not modelled |
| `taxFederal.ts` | ◐ | five brackets at 14 / 20.5 / 26 / 29 / 33 %; basic amount phased down between the 29 % and 33 % thresholds; age amount reduced 15 % above $46 432; pension income amount ≤ $2 000 (65+ for registered income); Canada employment amount; the BASE QPP contribution as a credit, the enhanced part as a deduction; the Québec abatement (16.5 % of basic federal tax, after credits) | reproduces Finance Canada's own 2026 test case ($60 000 → $8 496 / $2 303 / $6 193); the basic-amount phase-down is DERIVED (the 2026 worksheet is unpublished); no donation, medical, tuition or spouse credits; no surtax or minimum tax |
| `taxQuebec.ts` | ◐ | four brackets at 14 / 19 / 24 / 25.75 %; the basic amount; ONE shared credit for age, living alone and retirement income, reduced 18.75 % above $42 955 of FAMILY income and spendable by either spouse | no credit for the base QPP contribution (Québec folds it into the basic amount — read only in the 2020 edition, flagged); the retirement-income age gate for registered income under 65 is unconfirmed; the worked examples are DERIVED from the official parameters, not published answers; no FSS contribution, no RAMQ drug premium |
| `tax.ts` | ◐ | both returns per person; the enhanced QPP deduction; the OAS recovery tax as a repayment deducted from net income; pension income splitting by a 65+ transferor of defined-benefit and registered income (never RRQ or OAS), up to 50 % | every 5 % step in either direction is tried and the cheapest kept, so splitting only ever helps; one split amount serves both returns (Québec's 65+ transferor rule, stricter than the federal one); a split-in amount earns the FEDERAL pension amount only for a recipient of 65 or over, because the pool mixes defined-benefit and registered income and cannot say which share qualifies (an under-65 recipient of a defined-benefit share would qualify at any age: this errs toward more tax, by at most $2 000 × 14 % × 0,835 ≈ $234 a year); the recovery uses the same year's income; no investment-income tax (the non-registered return is a deferred gain) |
| `accounts.ts` | ✅ | the CRA prescribed RRIF factors row by row (1 ÷ (90 − age) below 71), the RRIF starting the year after 71; TFSA room (limit history, withdrawals return next year); RRSP room (18 % of last year's earned income up to the limit, less the pension adjustment); adjusted cost base and the realized gain of a withdrawal | the non-registered return is a deferred gain — no yearly tax on interest or dividends; an RRSP is converted at 71 by the RRIF minimum, not by an explicit conversion step |
| `dbPension.ts` | ◐ | accrual × service (to a maximum) × the best-years average; the permanent early reduction counted in years to the earliest unreduced date; the coordination with the RRQ from the month after the 65th birthday (lesser of salary and MGA, service capped); a bridge; indexation `max(share × CPI, CPI − minus)`; the pension adjustment (9 × benefit − 600). **RREGOP** is a cited preset (`params/plans.ts`) reproducing Retraite Québec's worked examples (Jeanne, Jacques, Lise, Johanne) | the best-years average is the LAST years' salary (the same for a salary that does not fall); one indexation tier applied to the whole pension (the real rule has three, by service period); the first indexation is not pro-rated; a person already retired cannot yet enter a pension in pay (their salary is back-projected); 35 years of service at any age is read as « from the earliest age » (the plan states no minimum, unconfirmed) |
| `projection.ts` | ◐ | — | runs to the year the YOUNGEST person reaches the horizon age; spending is a need, and the savings a person entered are a CEILING, not a promise: in a year whose cash cannot cover both, contributions are cut first (non-registered, then TFSA, then RRSP) rather than funded by taxable withdrawals — then the rest is met from the accounts in the household's order with each withdrawal solved against the tax function (gross-up); the surplus goes to TFSA room, then non-registered; all three accounts use ONE mid-year convention (a balance grows from its January level plus half a year on the net flow), so emptying an account leaves a few cents of residue rather than exactly zero, and under a negative return a withdrawal is capped so no balance, RRIF minimum or withdrawal can go below zero; no survivor scenarios (v2); RRIF minimum from the year after 71; the pension split held fixed while withdrawals are solved |
| `retireAt.ts` | ✅ | — | tries every whole age 50–70 (never one already passed); « works » = no year with a shortfall; by default everyone retires at the tried age |
| `simulate.ts` | ✅ | — | sensitivity grid only, as a generator (`sensitivityCells`) so the page can run it in a web worker and fill the table cell by cell; (returns ±1 pt × inflation ±1 pt × horizon 90/95/100); Monte-Carlo is v2 and deliberately absent: no official source backs a probability |

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
