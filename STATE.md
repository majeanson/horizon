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
| **Phase** | **9 — every phase is built.** What remains is not code: the unconfirmed figures and statement wordings that need a human with a browser (below), and the GitHub secrets that turn on deploy-on-push. The parameters (96 cited figures for 2026, 17 plan rules) and every engine module are verified against official worked examples, with a committed golden household; the pages drive the engine and keep everything on the device. |
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
| `SOURCES.md` | *generated* (`npm run sources`) — every government parameter, its official page and retrieval date |

**The checkbox convention** (repo-wide): `- [ ]` is **open work**, and lives only in this file ·
`- [x]` done, with what settles it · `- [~]` parked, with the why · `❓` an open question.
A checklist someone is meant to copy gets bullets, not boxes.

## 3. How a phase is closed

A phase is done when its **verification command is green**, every figure it introduced cites an
official page, and any guard it added has been **planted against its own bug** and seen to fail.

## 4. The backlog, in build order

### Phase 0 — scaffold and CI

- [x] Repo, tooling, primitives, i18n contract, guards (`noNetwork`, `intl-rule`, `chip-rule`, `autofocus`, `devkitParity`, `i18nParity`, `docs`), Worker, service worker, `check-bundle`
- [x] CI green on GitHub (`ci.yml`), first deploy to Cloudflare (local `wrangler deploy`), `e2e/smoke.spec.ts`, `a11y.spec.ts` and the service-worker harness green in CI

### Phase 1 — parameters for 2026, with their sources

- [x] `Cited` / `Plain` types, `plain()`, `paramsFor()` and the projection of future years (`params/machinery.test.ts`)
- [x] `params/2026.ts` — every leaf from its official page; the 6,30 % splits 5,3 base + 1,0 first additional (settled)
- [x] `2026.test.ts` (one literal per leaf), `cited.test.ts`, `crosscheck.test.ts`, `lib/enginePurity.test.ts` — each planted red
- [x] `scripts/gen-sources.ts` + `SOURCES.md` + `lib/sourcesMd.test.ts`; `npm run sources:check` verifies every cited URL resolves
- [x] No figure carries a `verify` reason any more: the Québec brackets, the line-361 age rule and the worker-deduction rate (browser screenshot + `docs/TP-1.G(2025-12).pdf`), the four GIS divisors (OAS Benefits Estimator, ≤ 1 $/month apart), the TFSA total (the CRA's limits table + a real room history); ratchet 11 → 0 on 2026-10-06
- [ ] **Needs a human with a browser** (revenuquebec.ca and legisquebec.gouv.qc.ca refuse every automated client): the QPP Act's rounding of the 15 % drop-out (nearest vs up — Retraite Québec's calculation page says only « jusqu'à 15 % »; the leaflet's worked example rounds 84.6 → 85; the 72nd-birthday-month boundary was confirmed on that page on 2026-10-06); the CRA's T5008 « case 20 » caveat page; (the OAS estimator's residence wording was read on 2026-10-06: step 4 asks only « Since the age of 18, have you only lived in Canada? » Yes/No for you and your partner — no number of years; whether answering No then asks for years is unchecked)

### Phase 2 — RRQ

- [x] Contributions; contributory period, 15 % drop-out and the base 25 % — the leaflet's worked example to the cent; a full career yields the published $1 441.25 base maximum
- [x] The two additional components (phase-in 15/30/50/75 %, 480 months) — the published 2026 maximum $1 507.65 reproduced
- [x] Early / late adjustment (the sliding 0,5–0,6 % rule, settled; the 72-year cap)
- [x] RRQ property tests (monotone in earnings, linear below the ceiling, zero career → zero) — `engine/rrq.props.test.ts`

### Phase 3 — OAS and GIS

- [x] Residence proration, deferral (+36 % at 70), the 75-and-over increase — against the « when to start » table
- [x] Recovery tax against the canada.ca example (100 000 $ → 981.90 $); GIS through every published figure of the four 2026 quarters, the statutory slopes cross-checked across them
- [x] The four derived GIS divisors and the employment exemption confirmed against the OAS Benefits Estimator (couple 48 / 96, single 24 / 48; the estimator rounds the reduction to whole dollars, the engine works in cents — ≤ 1 $/month)
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
- [ ] RREGOP, still open: (b) the engine applies the since-2000 indexation rule to the whole pension, where the page splits it by service period (matters only to someone with service before 2000); the deferred pension's two-year minimum and the CRI/FRV transfer option; a RREGOP pension saved before v4 gets no `deferred` rule unless re-added
- [ ] A pension already in pay: ❓ enter the statement's own figure (built — see « rente en cours »)

### Phase 6 — projection, `retireAt`, the golden household

- [x] Year-by-year projection: the cash identity holds to the cent every year; withdrawal order with a gross-up solved against the tax function (`projection.test.ts`, twelve planted bugs red)
- [x] Couple, splitting, RRIF minimum, GIS and OAS recovery wired in; `retireAt`, `compare`, the sensitivity grid
- [x] `golden/` committed (`golden.projection.json`, `golden.retireAt.json`) — reviewed for plausibility: the DB steps down at 65, RRQ/OAS start, the drawdown order is respected
- [ ] The sensitivity grid takes ≈ 4 s for 27 cells: run it on demand (a disclosure), off the main thread if it becomes a first-paint cost
- [ ] Survivor scenarios (one spouse dies) — v2

### Phase 7 — store, profile, assumptions, `FieldInfo`

- [x] `lib/schema.ts` (the validator every outside file passes through), `migrations.ts`, `store.ts`, JSON export / import, `schemaVersion.test.ts` — planted: a range edit, a bump without a migration, a missing fixture each turn it red; a comment-only edit stays green
- [x] `FieldInfo`, `NumberField`, `FieldRow`, `fieldInfoCopy.test.ts` — the labels were READ on the official pages (research below); planted: a dead id, a non-official host, a dropped link, a stale excuse each turn it red
- [x] Profil, Hypothèses, Résultats (verdict, comparison chips, per-year table, parameters used), Données; `e2e/profile.spec.ts` (31), axe on every route in every display state with every ⓘ and disclosure open
- [x] The RRQ relevé read on 2026-10-06 (a real one): « Estimation des prestations » ▸ « Rente de retraite », rows « 60 ans » / « 65 ans », columns « Montant actuel » / « Montant projeté »; the table prints no unit; the relevé has NO contributory-years line; its estimate counts the first enhancement only
- [ ] ❓ Statement wording still UNCONFIRMED (the ⓘ quotes none rather than guess): whether Revenu Québec itself shows any registered-savings room (the CRA account does: « Savings and pension plans » shows the RRSP deduction limit and the TFSA room « As of January 1 », read 2026-10-06 ; Revenu Québec's own Avis de cotisation (2023, read 2026-10-06) shows only the REER deduction CLAIMED (line 214) and no room — so room comes from the CRA account alone)
- [x] A couple can compare two separate retirement ages (« Chacun son âge » on Résultats: `?ages=…,58-64` = the first person at 58, the second at 64; `lib/resultsModel.ts`, `components/results/SplitPicker.tsx`). The verdict line (« Au plus tôt ») still tries ONE age for everyone — a per-person earliest-age search is a v2 question
- [x] A person already retired can enter a pension in pay (`inPay`, schema v3; `engine/dbInPay.test.ts`, `lib/inPaySchema.test.ts`). A pension in pay may carry an optional « after 65 » figure (`inPay.after65`, today's dollars, applied from the month after the 65th birthday, indexed like the first figure; ignored when that month has already passed)

### Phase 8 — chart and results

- [x] `components/charts/*` (Recharts behind an adapter), `chartBoundary.test.ts` (planted: an import from a page → red; in a comment → green; the door's own import removed → red), a DevKit specimen
- [x] Résultats: verdict, comparison chips, scenario cards, the chart (net worth or guaranteed income, in today's or the year's dollars, all in the address), per-year table, « Paramètres utilisés », and the sensitivity grid in a web worker; `e2e/results.spec.ts` (9)
- [x] Bundle caps set from the real build (the chart library is 347 KB raw / 103 KB gzip, lazy, off the door; a lowered cap and a static `Résultats` import each turn `check:bundle` red)
- [ ] The chart library is the biggest thing in the app. If 103 KB gzip on the first Résultats visit matters, the adapter lets a ~5 KB hand-drawn SVG replace it by editing one folder

### Phase 9 — offline proof and deploy

- [x] The offline harness (`e2e:sw`, 6 tests): the shell, a deep link, the grey-screen trap, AND a saved profile + the results page with the chart and the worker, reopened with the network off
- [x] axe on every route in five display states with every ⓘ and disclosure open
- [x] A keyboard-only path (`e2e/keyboard.spec.ts`, 8): reach a field, type, Enter commits, Space opens the ⓘ, Enter opens a disclosure, the people tabs are a real tablist, a confirmation traps focus and gives it back; on every page focus moves in reading order, always shows where it is, and no positive `tabindex` fights the order — planted: a removed focus ring and a `tabIndex={3}` each turn it red. It also found the field's focus ring was marigold on paper (≈ 1.9:1): now the ink ring
- [x] Every page names the browser tab (`Résultats · Horizon`); a blank profile says where to start
- [x] `.github/workflows/sources.yml`: every cited page — the figures' AND the ⓘ links, in both languages — is opened weekly; a gone or erroring page fails the job; a page that refuses bots (Revenu Québec, legisquebec) is reported as blocked, never fatal
- [x] Deployed to https://horizon.marc-jeanson.workers.dev with `npm run deploy` (local `wrangler login`)
- [ ] Language, what is still one-language: `SOURCES.md` is French (it lists both editions of each page); `index.html`'s description / Open Graph tags and the install manifest are French (a static file cannot follow the reader); 7 cited pages exist in one language only (`twins.ts` says which and why)
- [ ] **Deploy on push**: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets (Settings ▸ Secrets and variables ▸ Actions). Until then CI skips the deploy job cleanly and a deploy is `npm run deploy` from a logged-in machine

## 5. Lessons carried over from Babillard

- **Plant the bug before trusting a guard** — a green grep test proves nothing alone.
- **Look at the CI run after every push.** Three engine commits sat red on `knip` (an unused export, an unused type) because only the local suite was watched; `knip` cannot run on a memory-tight Windows box.
- **A shell heredoc halves backslashes**, so a regex written through one is silently a different regex. Write files with the Write / Edit tools.
- **axe finds what no one looked at**: Babillard's `--warn` and `--success` text tokens were under 4.5:1 on a card; they had never been run through it there.
- **Measure, don't reason**, for layout: screenshot the first screen at 390 px and look.
- **A budget that keeps its old ceiling after a win is a memory of one** — ratchets fall.
- **`manualChunks` is a shim under Vite 8** — use `codeSplitting` groups.
- **A hashed asset that is gone is a 404, never HTML** — or a cache-first worker serves the poison forever.
