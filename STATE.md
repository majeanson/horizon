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
| **Phase** | **9 — every phase is built.** What remains is not code: the unconfirmed figures and statement wordings that need a human with a browser (below), and the GitHub secrets that turn on deploy-on-push. The parameters (96 cited figures for 2026, 14 plan rules) and every engine module are verified against official worked examples, with a committed golden household; the pages drive the engine and keep everything on the device. |
| **Live** | https://horizon.marc-jeanson.workers.dev (Phase-0 shell) · https://github.com/majeanson/horizon |
| **Health** | `npm run typecheck && npm test && npm run build && npm run check:bundle && npm run knip` |

## 2. The document map

| File | What it is FOR |
| --- | --- |
| `README.md` | what Horizon is, how to run it — the repo's shop window |
| `STATE.md` | this file — current state and the ranked backlog |
| `CLAUDE.md` | the law: how to write code here, the guards, the commands |
| `ENGINE.md` | the calculation contract: conventions, what is official vs simplified, how trust is earned |
| `COMPONENTS.md` | the shared-UI inventory, paired with the `/dev/kit` gallery |
| `SOURCES.md` | *generated* — every government parameter, its official page and retrieval date *(arrives in Phase 1)* |

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
- [ ] Ten figures carry a `verify` reason (the six GIS knees and divisors derived from the Act — the knees now confirmed there, the divisors still derived; Revenu Québec's bracket rates and line 361 read through an archive; the Québec worker-deduction rate; one derived TFSA total): confirm each on an openable page and lower the ratchet in `cited.test.ts`

### Phase 2 — RRQ

- [x] Contributions; contributory period, 15 % drop-out and the base 25 % — the leaflet's worked example to the cent; a full career yields the published $1 441.25 base maximum
- [x] The two additional components (phase-in 15/30/50/75 %, 480 months) — the published 2026 maximum $1 507.65 reproduced
- [x] Early / late adjustment (the sliding 0,5–0,6 % rule, settled; the 72-year cap)
- [ ] RRQ property tests (monotone in earnings, linear below the ceiling, zero career → zero)

### Phase 3 — OAS and GIS

- [x] Residence proration, deferral (+36 % at 70), the 75-and-over increase — against the « when to start » table
- [x] Recovery tax against the canada.ca example (100 000 $ → 981.90 $); GIS through every published figure of the four 2026 quarters, the statutory slopes cross-checked across them
- [ ] Confirm the four derived GIS divisors against the OAS Benefits Estimator (Service Canada's own calculator) and lower the `verify` ratchet

### Phase 4 — taxes

- [x] Federal brackets, BPA phase-down, abatement; age, pension-income and QPP credits — Finance Canada's test case reproduced
- [x] Québec brackets, BPA, the shared age / living-alone / retirement amount — DERIVED examples (Revenu Québec publishes none readable)
- [x] `householdTax` and pension splitting; the top marginal rate 53.31 % and the lowest 25.69 % reproduced; FSS, RAMQ, prior-year OAS basis flagged in ENGINE.md
- [ ] Re-check against Revenu Québec's TP-1.G guide when readable: the base-QPP-contribution treatment, the 14 % conversion rate, the retirement-income age gate

### Phase 5 — accounts and defined-benefit pensions

- [x] RRIF minimum factors row by row; TFSA / RRSP room; non-registered ACB and realized gain (`verified/accounts.verified.test.ts`)
- [x] Generic DB pension and the cited RREGOP preset, reproducing Retraite Québec's worked examples; the pension adjustment (`verified/rregop.verified.test.ts`, six planted bugs red)
- [ ] RREGOP: the three indexation tiers by service period, the pro-rated first indexation, the 35-years-at-any-age minimum (unconfirmed), and a pension already in pay for a retired person ❓ the statement's own figure

### Phase 6 — projection, `retireAt`, the golden household

- [x] Year-by-year projection: the cash identity holds to the cent every year; withdrawal order with a gross-up solved against the tax function (`projection.test.ts`, twelve planted bugs red)
- [x] Couple, splitting, RRIF minimum, GIS and OAS recovery wired in; `retireAt`, `compare`, the sensitivity grid
- [x] `golden/` committed (`golden.projection.json`, `golden.retireAt.json`) — reviewed for plausibility: the DB steps down at 65, RRQ/OAS start, the drawdown order is respected
- [ ] The sensitivity grid takes ≈ 4 s for 27 cells: run it on demand (a disclosure), off the main thread if it becomes a first-paint cost
- [ ] Survivor scenarios (one spouse dies) — v2

### Phase 7 — store, profile, assumptions, `FieldInfo`

- [x] `lib/schema.ts` (the validator every outside file passes through), `migrations.ts`, `store.ts`, JSON export / import, `schemaVersion.test.ts` — planted: a range edit, a bump without a migration, a missing fixture each turn it red; a comment-only edit stays green
- [x] `FieldInfo`, `NumberField`, `FieldRow`, `fieldInfoCopy.test.ts` — the labels were READ on the official pages (research below); planted: a dead id, a non-official host, a dropped link, a stale excuse each turn it red
- [x] Profil, Hypothèses, Résultats (verdict, comparison chips, per-year table, parameters used), Données; `e2e/profile.spec.ts` (22), axe on every route in every display state with every ⓘ and disclosure open
- [ ] ❓ Statement wording still UNCONFIRMED (the ⓘ quotes none rather than guess): the RRQ relevé's per-age columns for the 60/65 estimate and its contributory-years label; the OAS estimator's residence question (behind a script-driven page); whether Revenu Québec shows any registered-savings room (revenuquebec.ca blocks automated clients — open its « Avis de cotisation » in a browser)
- [ ] A couple retires at ONE age in the comparison (everyone at the tried age). Two separate ages per person is a v2 control
- [ ] A person already retired cannot yet enter a pension in pay (their salary is back-projected): add « rente en cours » figures

### Phase 8 — chart and results

- [x] `components/charts/*` (Recharts behind an adapter), `chartBoundary.test.ts` (planted: an import from a page → red; in a comment → green; the door's own import removed → red), a DevKit specimen
- [x] Résultats: verdict, comparison chips, scenario cards, the chart (net worth or guaranteed income, in today's or the year's dollars, all in the address), per-year table, « Paramètres utilisés », and the sensitivity grid in a web worker; `e2e/results.spec.ts` (7)
- [x] Bundle caps set from the real build (the chart library is 347 KB raw / 103 KB gzip, lazy, off the door; a lowered cap and a static `Résultats` import each turn `check:bundle` red)
- [ ] The chart library is the biggest thing in the app. If 103 KB gzip on the first Résultats visit matters, the adapter lets a ~5 KB hand-drawn SVG replace it by editing one folder

### Phase 9 — offline proof and deploy

- [x] The offline harness (`e2e:sw`, 6 tests): the shell, a deep link, the grey-screen trap, AND a saved profile + the results page with the chart and the worker, reopened with the network off
- [x] axe on every route in five display states with every ⓘ and disclosure open
- [x] A keyboard-only path (`e2e/keyboard.spec.ts`, 8): reach a field, type, Enter commits, Space opens the ⓘ, Enter opens a disclosure, the people tabs are a real tablist, a confirmation traps focus and gives it back; on every page focus moves in reading order, always shows where it is, and no positive `tabindex` fights the order — planted: a removed focus ring and a `tabIndex={3}` each turn it red. It also found the field's focus ring was marigold on paper (≈ 1.9:1): now the ink ring
- [x] Every page names the browser tab (`Résultats · Horizon`); a blank profile says where to start
- [x] `.github/workflows/sources.yml`: every cited page — the figures' AND the ⓘ links, in both languages — is opened weekly; a gone or erroring page fails the job; a page that refuses bots (Revenu Québec, legisquebec) is reported as blocked, never fatal
- [x] Deployed to https://horizon.marc-jeanson.workers.dev with `npm run deploy` (local `wrangler login`)
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
