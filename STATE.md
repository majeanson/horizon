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
| **Phase** | **2 — RRQ done**; OAS/GIS next. The shell, primitives, guards and pipeline exist and are deployed; the parameters (84 cited figures for 2026) and the RRQ engine are verified against Retraite Québec's own worked example. No page uses the engine yet. |
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
- [ ] Seven figures carry a `verify` reason (Revenu Québec pages read through an archive, one derived total): confirm each on an openable page and lower the ratchet in `cited.test.ts`

### Phase 2 — RRQ

- [x] Contributions; contributory period, 15 % drop-out and the base 25 % — the leaflet's worked example to the cent; a full career yields the published $1 441.25 base maximum
- [x] The two additional components (phase-in 15/30/50/75 %, 480 months) — the published 2026 maximum $1 507.65 reproduced
- [x] Early / late adjustment (the sliding 0,5–0,6 % rule, settled; the 72-year cap)
- [ ] RRQ property tests (monotone in earnings, linear below the ceiling, zero career → zero)

### Phase 3 — OAS and GIS

- [ ] Residence proration, deferral (+36 % at 70), the 75-and-over increase
- [ ] Recovery tax against the canada.ca example; GIS against three table rows with a declared tolerance

### Phase 4 — taxes

- [ ] Federal brackets, BPA phase-down, abatement; age, pension-income and QPP credits
- [ ] Québec brackets, BPA, the combined age / living-alone / retirement amount
- [ ] `householdTax` and 50 % pension splitting; flag FSS, RAMQ, prior-year OAS basis

### Phase 5 — accounts and defined-benefit pensions

- [ ] RRIF minimum factors row by row; TFSA room; non-registered ACB and realized gain
- [ ] Generic DB pension and the RREGOP preset ❓ reduction %, the 35-year rule, indexation

### Phase 6 — projection, `retireAt`, the golden household

- [ ] Year-by-year projection (row identity to the cent), withdrawal order with gross-up
- [ ] Couple, splitting, RRIF-minimum surplus → TFSA; `retireAt`, `compare`, the sensitivity grid
- [ ] `golden/` committed and reviewed

### Phase 7 — store, profile, assumptions, `FieldInfo`

- [ ] `lib/schema.ts`, `migrations.ts`, `store.ts`, JSON export / import, `schemaVersion.test.ts`
- [ ] `FieldInfo`, `NumberField`, `FieldRow`, `fieldInfoCopy.test.ts` ❓ the exact statement labels, from Marc's own statements
- [ ] Profil, Hypothèses, Données pages; `e2e/profile.spec.ts`

### Phase 8 — chart and results

- [ ] `components/charts/*` (Recharts behind an adapter), `chartBoundary.test.ts`, a DevKit specimen
- [ ] Résultats: scenario chips, chart, verdict line, per-year table, « Paramètres utilisés »; bundle caps set from the real build; `e2e/results.spec.ts`

### Phase 9 — offline proof and deploy

- [ ] `e2e/sw.config.ts` + `offline.spec.ts`; axe on every route; keyboard path through the profile
- [ ] Cloudflare Worker, GitHub secrets, deploy on push; this file's snapshot updated in the same commit

## 5. Lessons carried over from Babillard

- **Plant the bug before trusting a guard** — a green grep test proves nothing alone.
- **Measure, don't reason**, for layout: screenshot the first screen at 390 px and look.
- **A budget that keeps its old ceiling after a win is a memory of one** — ratchets fall.
- **`manualChunks` is a shim under Vite 8** — use `codeSplitting` groups.
- **A hashed asset that is gone is a 404, never HTML** — or a cache-first worker serves the poison forever.
