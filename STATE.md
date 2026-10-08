# STATE.md — where Horizon is, and what is left

> **The front door.** Asked « what should we work on? » — read this, not the code. It says what
> is built, which documents hold what, and the whole remaining backlog in the order it will be
> built. It is **kept short on purpose** and `src/lib/docs.test.ts` holds a line budget (a
> ratchet: it may fall, never rise). When a phase lands, update §1 and tick §4 **in the same
> commit as the work**; when the next phase's first item lands, *cut* the finished ones — git
> keeps them.
>
> **A ledger entry is a verdict from a moment, not a fact.** Before building on a claim here,
> grep it in the code. Quote a figure from the code or a command you ran, not from a document.

---

## 1. Snapshot

| | |
| --- | --- |
| **What it is** | A Québec retirement-date planner: manual entry of the government's own numbers → a cited, unit-tested engine → a chart of when the money lasts. Local-only data. |
| **Stack** | Vite 8 · React 19 · TypeScript 7 · React Router 7 · Vitest 4 · Playwright · one Cloudflare Worker (static assets). Charts: Recharts, in its own lazy chunk. |
| **Phase** | **10 — every phase is built** (the app, the three questions, the bridge years). What remains is not code: the unconfirmed figures and statement wordings that need a human with a browser (below), and the GitHub secrets that turn on deploy-on-push. The parameters (100 cited figures for 2026, 17 plan rules) and every engine module are verified against official worked examples, with a committed golden household; the pages drive the engine and keep everything on the device. |
| **Live** | https://retraite.marcportal.com · https://github.com/majeanson/horizon |
| **Health** | `npm run typecheck && npm test && npm run build && npm run check:bundle && npm run knip` |

## 2. The document map

| File | What it is FOR |
| --- | --- |
| `README.md` | what Horizon is, how to run it — the repo's shop window |
| `STATE.md` | this file — current state and the ranked backlog |
| `CLAUDE.md` | the law: how to write code here, the guards, the commands |
| `ENGINE.md` | the calculation contract: conventions, what is official vs simplified, how trust is earned |
| `COMPONENTS.md` | the shared-UI inventory, paired with the `/dev/kit` gallery |
| `EXAMPLES.md` | *generated* (`npm run examples`) — the nine example households printed: inputs, pension calculations, year-by-year table, a witness year for a tax calculator, and how to counter-verify each |
| `SOURCES.md` | *generated* (`npm run sources`) — every government parameter, its official page and retrieval date |
| `SOURCES.en.md` | *generated* (`npm run sources`) — the same table in English, each page linked in its English edition |

**The checkbox convention** (repo-wide): `- [ ]` is **open work**, and lives only in this file ·
`- [x]` done, with what settles it · `- [~]` parked, with the why · `❓` an open question.
A checklist someone is meant to copy gets bullets, not boxes.

## 3. How a phase is closed

A phase is done when its **verification command is green**, every figure it introduced cites an
official page, and any guard it added has been **planted against its own bug** and seen to fail.

## 4. The backlog, in build order

### Phase 0 — scaffold and CI

- [x] CI green on GitHub (`ci.yml`), first deploy to Cloudflare (local `wrangler deploy`), `e2e/smoke.spec.ts`, `a11y.spec.ts` and the service-worker harness green in CI

### Phase 1 — parameters for 2026, with their sources

- [x] `Cited` / `Plain` types, `plain()`, `paramsFor()` and the projection of future years (`params/machinery.test.ts`)
- [x] `params/2026.ts` — every leaf from its official page; the 6,30 % splits 5,3 base + 1,0 first additional (settled)
- [x] `2026.test.ts` (one literal per leaf), `cited.test.ts`, `crosscheck.test.ts`, `lib/enginePurity.test.ts` — each planted red
- [x] `scripts/gen-sources.ts` + `SOURCES.md` + `lib/sourcesMd.test.ts`; `npm run sources:check` verifies every cited URL resolves
- [x] No figure carries a `verify` reason any more: the Québec brackets, the line-361 age rule and the worker-deduction rate (browser screenshot + `docs/TP-1.G(2025-12).pdf`), the four GIS divisors (OAS Benefits Estimator, ≤ 1 $/month apart), the TFSA total (the CRA's limits table + a real room history); ratchet 11 → 0 on 2026-10-06
- [ ] **Needs a human with a browser** (revenuquebec.ca refuses every automated client; legisquebec.gouv.qc.ca opens in the in-app Browser pane, which settled the QPP Act's 15 % drop-out on 2026-10-07: rounded UP, s. 116.4 « counting any fraction of a month as a whole month », `verified/rrqDropOut.verified.test.ts`, engine fixed; the 72nd-birthday-month boundary was confirmed on the calculation page on 2026-10-06): (the CRA's T5008 page read 2026-10-07: « The amount in box 20 may or may not reflect your adjusted cost base (ACB) » — what the ⓘ already says); (the OAS estimator's residence wording was read on 2026-10-06: step 4 asks « Since the age of 18, have you only lived in Canada? » Yes/No; answering No asks for the years lived when the pension STARTED (a partner not yet on it: the years so far) — read 2026-10-07, and 35 years gave the engine's 35/40 exactly)

### Phase 2 — RRQ

- [x] Contributions; contributory period, 15 % drop-out and the base 25 % — the leaflet's worked example to the cent; a full career yields the published $1 441.25 base maximum
- [x] The two additional components (phase-in 15/30/50/75 %, 480 months) — the published 2026 maximum $1 507.65 reproduced
- [x] Early / late adjustment (the sliding 0,5–0,6 % rule, settled; the 72-year cap)
- [x] RRQ property tests (monotone in earnings, linear below the ceiling, zero career → zero) — `engine/rrq.props.test.ts`

### Phase 3 — OAS and GIS

- [x] Residence proration, deferral (+36 % at 70), the 75-and-over increase — against the « when to start » table
- [x] Recovery tax against the canada.ca example (100 000 $ → 981.90 $); GIS through every published figure of the four 2026 quarters, the statutory slopes cross-checked across them
- [x] The four derived GIS divisors and the employment exemption confirmed against the OAS Benefits Estimator (couple 48 / 96, single 24 / 48; the estimator rounds the reduction to whole dollars, the engine works in cents — ≤ 1 $/month)
- [x] The OAS estimator read on 2026-10-07 for the « modest » example (single, income 14 588 $ without the OAS): OAS $762.50 and GIS $355.49 a month; the engine gives 355.17 (−0,32 $, inside the known ≤ 1 $), and an 11-month deferral gives $812.83 exactly (`verified/oas.verified.test.ts`). The newcomer (35 years of residence, income 30 784 $) gives $667.19 and no GIS, exactly. The retired couple (56 388 $ combined) gets $762.50 each and no GIS, exactly; the rich couple (one spouse not yet on the OAS, 51 734 $) gets a GIS of $76.49 against the engine's 76.21 and an Allowance of $0 (the Allowance is not modelled). All four examples agree with the estimator. Income tax, StudioTax 2025 (docs/can.pdf, docs/qc.pdf, the « modest » single, 2025 amounts): total income 23 273 $ and federal tax 0 $ agree; Québec income tax 0 $ agrees (the 265,23 $ on line 450 is the prescription-drug premium, not modelled); the credits agree to the dollar once « living alone » is ticked (docs/qc-helene-living-alone.pdf: amounts 9 504 $ = 3 906 + 2 128 + 3 470, credits 3 930,50 $; the engine 3 932 $). The retired couple (docs/*-can-*.pdf, gilles-qc.pdf): incomes agree; Québec 4 424 $ vs the engine's 4 419 $; federal 2 739 $ vs 2 649 $ (−3 %, 2025 vs 2026 indexation) once the federal spouse transfer of unused age/pension amounts (6 618 $, Schedule 2) was added — it was missing. The Allowance is modelled from the official Table 4 (941 rows); read in the estimator for a 66 + 63 couple at 10 000 $: Allowance $774.07 (engine 773.07), pensioner GIS $635.57 (635.24), $427.57 each once both are 65 (427.67). Retraite Québec's RREGOP estimator (Camille, leaving at 55 / 60 / 61 / 65) agrees to the dollar on the formula, the 6 % early reduction and the 0,7 % × MGA coordination (`verified/rregop.verified.test.ts`); it refuses an end of employment before 51 and answers « pas droit à une rente » under 55 with under 35 years, so the DEFERRED pension has no estimator reading (its rule rests on the plan page alone); SimulR (Retraite Québec, constant-dollar view) agrees with the QPP engine within 1 % for Hélène, Marie, a ceiling earner (60–72) and late first jobs (`verified/simulr.verified.test.ts`); it also showed that service must run from 1 January of this year (a statement is dated 31 December), not from today — fixed, +0,8 year of service
- [ ] ❓ GIS whole-dollar rounding NOT modelled (the engine works in cents; the estimator is ≤ 1 $/month away). Flooring each reduction (income ÷ divisor, base starting at 0) reproduces the estimator's couple 0 / 8 000 and single 10 000 exactly, but its figures at single 20 000 (129.49), single 20 000 with 10 000 of work income (442.49) and couple 16 000 / 24 000 (302.57 / 135.57) imply a TOP-UP maximum of 176.41 $ (single) and 49.99 $ (couple) that the published cut-offs (→ 177 / 50) cannot give: a new cited figure per category is needed. Observed 2026-10-06, Oct–Dec 2026 quarter

### Phase 4 — taxes

- [x] Federal brackets, BPA phase-down, abatement; age, pension-income and QPP credits — Finance Canada's test case reproduced
- [x] Québec brackets, BPA, the shared age / living-alone / retirement amount — DERIVED examples (Revenu Québec publishes none readable)
- [x] `householdTax` and pension splitting; the top marginal rate 53.31 % and the lowest 25.69 % reproduced; FSS, RAMQ, prior-year OAS basis flagged in ENGINE.md
- [ ] Re-check against Revenu Québec's TP-1.G guide (now in `docs/`): the base-QPP-contribution treatment and the 14 % conversion rate (the line-361 age gate is confirmed)

### Phase 5 — accounts and defined-benefit pensions

- [x] RRIF minimum factors row by row; TFSA / RRSP room; non-registered ACB and realized gain (`verified/accounts.verified.test.ts`)
- [x] Generic DB pension and the cited RREGOP preset, reproducing Retraite Québec's worked examples; the pension adjustment (`verified/rregop.verified.test.ts`, six planted bugs red)
- [x] RREGOP page read in full on 2026-10-06: the 35-years-at-any-age route to an unreduced pension (stated « dans le respect des règles fiscales »), the three indexation tiers (before 1 July 1982: full TAIR; 1 July 1982–1999: TAIR − 3 %; since 2000: the better of 50 % of TAIR and TAIR − 3 %), the coordination formula, 0.5 %/month early reduction
- [x] RREGOP, built from the page on 2026-10-06: (a) the FIRST indexation is pro-rated by the days the pension was paid (Réjean's examples are verified tests); (c) a DEFERRED pension (left before eligibility) is reduced 0.5 %/month back to the 65th birthday, indexed in full until it starts, coordinated from its first payment, cut by the same percentage (schema v4, `deferred` on the pension)
- [ ] RREGOP, still open: (b) the engine applies the since-2000 indexation rule to the whole pension, where the page splits it by service period (matters only to someone with service before 2000); the deferred pension's two-year minimum and the transfer-OUT of a RREGOP pension into a CRI/FRV (a locked-in part of the REER is modelled: schema v10); a RREGOP pension saved before v4 gets no `deferred` rule until the person accepts the offer on its card (« Appliquer la rente différée » — never applied silently, `applyDeferredRule` in `lib/profileEdit.ts`)
- [x] A pension already in pay: the statement's own figure (« rente en cours »), a figure after 65, and — when it began THIS year — the start month, which pro-rates its first January indexation (schema v5, `inPay.since`)

### Phase 6 — projection, `retireAt`, the golden household

- [x] Year-by-year projection: the cash identity holds to the cent every year; withdrawal order with a gross-up solved against the tax function (`projection.test.ts`, twelve planted bugs red)
- [x] Couple, splitting, RRIF minimum, GIS and OAS recovery wired in; `retireAt`, `compare`, the sensitivity grid
- [x] `golden/` committed (`golden.projection.json`, `golden.retireAt.json`) — reviewed for plausibility: the DB steps down at 65, RRQ/OAS start, the drawdown order is respected
- [x] The sensitivity grid runs by itself, in a worker, idle-priority behind the verdict's first paint; its grids detail the verdict's own range line
- [ ] Survivor scenarios (one spouse dies) — v2

- [x] Retirement means no work income (`engine/retirement.props.test.ts`, planted bug red): after the leaving month no pay, EI/QPIP, QPP contribution or RRSP deduction; the income is only the OAS/GIS, QPP, DB pension and account draws; the years before the OAS/QPP start are paid from the accounts; a couple with one retired; a pension in pay with no work. `lib/fixtureSanity.test.ts` holds the golden couple, the example profile and every fixture to plausibility rules against the cited figures (the old golden history ended 18–28 % under today's salary: fixed, so the golden numbers moved — earliest age still 60, bold scenario 58)
- [x] RREGOP members' own contributions (schema v6, `memberContribution` on a plan pension; `engine/memberContribution.ts`): [(pay − 25 % × MGA × service) × 8,63 %] − 0,0153 × (MGA × service − pay), from Retraite Québec's employer guide (the page's 43 300 $ example, `verified/memberContribution.verified.test.ts`); paid out of pay while working and deducted from taxable income; an old RREGOP pension gets the rule in the v5 → v6 migration. NOT modelled: the stop at 40 years of service, non-pensionable pay

### Phase 7 — store, profile, assumptions, `FieldInfo`

- [x] `lib/schema.ts` (the validator every outside file passes through), `migrations.ts`, `store.ts`, JSON export / import, `schemaVersion.test.ts` — planted: a range edit, a bump without a migration, a missing fixture each turn it red; a comment-only edit stays green
- [x] `FieldInfo`, `NumberField`, `FieldRow`, `fieldInfoCopy.test.ts` — the labels were READ on the official pages (research below); planted: a dead id, a non-official host, a dropped link, a stale excuse each turn it red
- [x] Profil, Hypothèses, Résultats (verdict, comparison chips, per-year table, parameters used), Données; `e2e/profile.spec.ts`, axe on every route in every display state with every ⓘ open
- [x] The RRQ relevé read on 2026-10-06 (a real one): « Estimation des prestations » ▸ « Rente de retraite », rows « 60 ans » / « 65 ans », columns « Montant actuel » / « Montant projeté »; the table prints no unit; the relevé has NO contributory-years line; its estimate counts the first enhancement only
- [ ] ❓ Statement wording still UNCONFIRMED (the ⓘ quotes none rather than guess): whether Revenu Québec itself shows any registered-savings room (the CRA account does: « Savings and pension plans » shows the RRSP deduction limit and the TFSA room « As of January 1 », read 2026-10-06 ; Revenu Québec's own Avis de cotisation (2023, read 2026-10-06) shows only the REER deduction CLAIMED (line 214) and no room — so room comes from the CRA account alone)
- [x] A couple can compare two separate retirement ages (« Chacun son âge » on Résultats: `?ages=…,58-64` = the first person at 58, the second at 64; `lib/resultsModel.ts`, `components/results/SplitPicker.tsx`). The verdict line (« Au plus tôt ») still tries ONE age for everyone; under it, « Chacun de son côté » gives each spouse's OWN earliest age with the other held at the profile's age (`earliestEach` in `engine/retireAt.ts`, computed in `lib/earliestEach.worker.ts`; each line can send its pair to the comparison). The two answers are not a joint plan — both leaving early at once can fail — and the answer for one never gets later when the other works longer (`earliestEach.test.ts`). ❓ The held age is the profile's: choosing it on the page is not built
- [x] A person already retired can enter a pension in pay (`inPay`, schema v3; `engine/dbInPay.test.ts`, `lib/inPaySchema.test.ts`). A pension in pay may carry an optional « after 65 » figure (`inPay.after65`, today's dollars, applied from the month after the 65th birthday, indexed like the first figure; ignored when that month has already passed)

### Phase 8 — chart and results

- [x] `components/charts/*` (Recharts behind an adapter), `chartBoundary.test.ts` (planted: an import from a page → red; in a comment → green; the door's own import removed → red), a DevKit specimen
- [x] Résultats: verdict, comparison chips, scenario cards, the chart (net worth or guaranteed income, in today's or the year's dollars, all in the address), per-year table, « Paramètres utilisés », and the sensitivity grid in a web worker; `e2e/results.spec.ts` (10)
- [x] Bundle caps set from the real build (the chart library is 369 KB raw / 108 KB gzip since the stacked bar chart, lazy, off the door; a lowered cap and a static `Résultats` import each turn `check:bundle` red). ❓ It is the biggest thing in the app: if 108 KB gzip on the first Résultats visit matters, the adapter lets a ~5 KB hand-drawn SVG replace it by editing one folder
- [x] « Quand commencer ma rente ? » (its page, the per-pension « rule » table, retired 2026-10-07: the bridge strategies say the same; `engine/deferral.ts` keeps the verified percentages): the QPP at 60 · 65 · 70 · 72 and the OAS at 65 · 70 per person, with the break-even and the effect on the plan (`engine/deferral.ts`, `components/results/DeferralPanel.tsx`, its words in `lib/deferralCopy.ts` to keep the eager dictionary in budget); the case for and against deferring, and what it leaves out (survivor pension, GIS interplay, health)
- [x] « Mes années 60 à 70 » on Résultats (computed in a worker): each year of the bridge (spending, work, DB / QPP / OAS / GIS, what the nest paid and from which account, tax, the nest, a status), two pictures (a stacked bar of the sources of money and the nest under four ways of starting), the person, the other-person toggle and the window in the address (`bp bb bw`; the ages are the profile's), five strategy cards (six for a couple) with a one-sentence verdict, and a « tient ? » matrix under the prudent / neutral / bold sets (`engine/bridge.ts`, `components/results/BridgePanel.tsx`, words in `lib/bridgeCopy.ts`). The golden couple shows the trade: retiring at 58, starting at 65 runs out at 97 while deferring to 70 lasts to 95; a smaller nest retiring at 56 runs out SOONER when it defers
- [x] « Mes années 60 à 70 »: a couple's sixth strategy « Les deux à 70 ans » and a « Pour les deux » toggle (`bb=1`; `BridgeLevers.both`) start the OTHER person's QPP and OAS at the same ages too; every strategy keeps the profile's retirement age, and no survivor's pension (the engine has no survivor scenarios)

### Phase 9 — offline proof and deploy

- [x] The offline harness (`e2e:sw`, 6 tests): the shell, a deep link, the grey-screen trap, AND a saved profile + the results page with the chart and the worker, reopened with the network off
- [x] axe on every route in six display states with every ⓘ open
- [x] A keyboard-only path (`e2e/keyboard.spec.ts`): reach a field, type, Enter commits, Space opens the ⓘ, the segmented controls are real tablists, a confirmation traps focus and gives it back; on every page focus moves in reading order, always shows where it is, and no positive `tabindex` fights the order — planted: a removed focus ring and a `tabIndex={3}` each turn it red. It also found the field's focus ring was marigold on paper (≈ 1.9:1): now the ink ring
- [x] Every page names the browser tab (`Résultats · Horizon`); a blank profile says where to start
- [x] `.github/workflows/sources.yml`: every cited page — the figures' AND the ⓘ links, in both languages — is opened weekly; a gone or erroring page fails the job; a page that refuses bots (Revenu Québec, legisquebec) is reported as blocked, never fatal
- [x] Deployed to https://horizon.marc-jeanson.workers.dev with `npm run deploy` (local `wrangler login`)
- [x] Language: `SOURCES.md` and `SOURCES.en.md` are both generated (`npm run sources`), the English one linking each page's English edition; `index.html` ships a FR + EN description / link preview and `lib/documentLang.ts` narrows them, `<html lang>` and the install manifest (`manifest.webmanifest` / `manifest.en.webmanifest`, both precached) to the reader's language
- [ ] Language, what is still one-language: a link-preview crawler reads the FR + EN sentence, never one language (it runs no script); the `<link rel=manifest>` swap is read by the browser at install time, so an app installed in one language keeps that language's name until reinstalled; a note in `SOURCES.en.md` is the official page's own wording, so a few are French; 7 cited pages exist in one language only (`twins.ts` says which and why)
- [ ] **Deploy on push**: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets (Settings ▸ Secrets and variables ▸ Actions). Until then CI skips the deploy job cleanly and a deploy is `npm run deploy` from a logged-in machine

### Phase 10 — clarity, questions

- [x] A plain headline on Résultats (« Vous pouvez prendre votre retraite à 60 ans, tous les deux. » + why: the year money runs short one age earlier — `lib/headline.ts`); one `NextStep` at the foot of each page (Profil → Hypothèses → Résultats → Données, with what is missing); the longest hints shortened
- [x] The questions answered: « Quand prendre ma retraite ? » (the verdict and the comparison), « Combien épargner ? » (`engine/savingsNeeded.ts`, in a worker), « Et si je dépensais moins ? » (2026-10-07: a retired-spending slider under the verdict with a door on the card, `?spend=` a what-if until kept — `lib/spendModel.ts`, `components/results/SpendView.tsx`, in a worker; spending moved the golden age 59 → 56 → 55 at 90 → 70 → 60 k$ and narrowed the prudent/bold spread from 7 to 2 years) and « Quand arrêter de travailler ? » (`lib/stopWorking.ts`: says when NO pension has begun in the first full year — a « 0 % » read as a bug — and the share again once every pension is in pay)
- [x] The eager i18n chunk is back under its 33 KB cap (31,2 KB): the results-only copy (the three questions, the headline, « each of us ») lives in `lib/resultsCopy.ts`, fetched with the results page. ❓ Four near-identical off-thread hooks remain (`useEarliestEach`, `useSavingsNeeded`, `useDeferral`, `useSensitivity`); `useBridge` and `usePresetEarliest` share `lib/useOffThread.ts` — porting the rest is mechanical
- [x] « Mes données et leur calcul » on Résultats (`components/results/LedgerPanel.tsx`, `engine/ledger.ts`, words in `lib/ledgerCopy.ts`, the `Slider` primitive): every number that sets the answer as a slider — each person's three ages, the two spending levels, inflation, the three returns — with the calculation it triggers (the QPP components × adjustment, the OAS full × residence × deferral, what inflation does to 1 000 $), the amount in today's dollars against the figure when it opened, and one projection's verdict on the plan live while the thumb moves; a value is saved in the profile on release, so the verdict above follows
- [x] Nine example households (`engine/golden/examples.ts`: golden · average · modest · rich · behind · retired · newcomer · heir · downsizer), loadable one by one from Données, each held to its own story (`engine/golden/examples.test.ts`), to what life allows (`fixtureSanity`), and printed in `EXAMPLES.md` (pension formulas, a year-by-year table, a witness year to hold beside an official calculator); `e2e/examples.spec.ts` drives each through the real pages. Found and fixed by them: the ledger crashed on a pension that began in the past; a retired household was told « vous pouvez prendre votre retraite à 68 ans », offered sliders on ages already behind it and a strategy view for pensions already paid — now « déjà à la retraite », those ages shown as facts, and no strategy view when no start is left to choose
- [x] The ages are set ONCE, in the profile: « Mes années 60 à 70 » no longer has its own age controls (its cards write the profile; `bp`, `bb`, `bw` are all it keeps in the address), « Quand commencer ma rente ? » sits inside it and follows its person tabs. The comparison chips stay what-ifs on purpose (they compare several ages at once)
- [ ] ❓ « Combien épargner ? » moves money out of working-years spending into a non-registered account (ENGINE.md says why); it does not pick the best account, and it ignores a raise or a second income. « Quand arrêter » has no chart of its own

### Phase 11 — nothing hidden, one home per figure

- [x] No disclosures (nothing to open to discover it). Since 2026-10-07 Marc asked for fewer ways of seeing one answer, so Résultats is three VIEWS of one plan, one at a time (`?v=`, `SubTabs`): Réponse · Stratégies · Vérifier. Profil shows BOTH people (a named column each from 860 px, a 3-field quick start in the welcome card); Résultats' views hold, in order — « La réponse » (the verdict wearing its Prudent · Neutre · Audacieux range, comparer, épargner, arrêter), « Vos rentes publiques » (`#rentes`: the strategies and the per-pension rule, two views of ONE decision), « Vérifier et ajuster » — under a sticky `SectionNav`; the heavy workers start by themselves (`useOffThread` `'idle'` keeps the verdict's paint first). Old `?q=` / `?person=` links scroll to their section and drop the key
- [x] One home per figure: the preset ages live on the verdict (the sensitivity grids are their detail; its presets table is gone), the per-person earliest in « Chacun de son côté », and the ledger names itself a view of the SAME stored profile as Profil / Hypothèses (a link-chip per group); « Préciser le calcul » lists the detectable refinements, a link each. One unit per figure (2026-10-07): the year-by-year table and its CSV follow the chart's dollars (today's by default; the table ended on 1,9 M$ under a card saying 678 k$) and print the unit; « tient jusqu’à » on the bridge says « l’horizon » and names whose age it prints (98 for Camille under a verdict saying 95)
- [x] e2e re-anchored to the always-visible layout: 121 tests across 9 files + `e2e:sw` 6. ❓ The worker stagger is a fixed idle-callback / 300 ms — tune only if a slow phone shows contention

## 5. Lessons carried over from Babillard

- **Plant the bug before trusting a guard** — a green grep test proves nothing alone.
- **Look at the CI run after every push.** Three engine commits sat red on `knip` (an unused export, an unused type) because only the local suite was watched; `knip` cannot run on a memory-tight Windows box.
- **A shell heredoc halves backslashes**, so a regex written through one is silently a different regex. Write files with the Write / Edit tools.
- **axe finds what no one looked at**: Babillard's `--warn` and `--success` text tokens were under 4.5:1 on a card; they had never been run through it there.
- **Measure, don't reason**, for layout: screenshot the first screen at 390 px and look.
- **A budget that keeps its old ceiling after a win is a memory of one** — ratchets fall.
- **`manualChunks` is a shim under Vite 8** — use `codeSplitting` groups.
- **A hashed asset that is gone is a 404, never HTML** — or a cache-first worker serves the poison forever.
