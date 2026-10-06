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
| **Phase** | **0 — scaffold** (this commit). The shell, the primitives, the guards and the pipeline exist; the engine and the pages do not. |
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
- [ ] CI green on GitHub (`ci.yml`), first deploy to Cloudflare, `e2e/smoke.spec.ts` green

### Phase 1 — parameters for 2026, with their sources

- [ ] `Cited` / `Plain` types, `plain()`, `paramsFor()` and the projection of future years
- [ ] `params/2026.ts` — every leaf from its official page, with today's `retrieved` date ❓ base-rate split (6,30 %?), federal age-amount figures, Québec combined amounts
- [ ] `2026.test.ts` (one literal per leaf), `cited.test.ts`, `purity.test.ts` — each planted red
- [ ] `scripts/gen-sources.ts` + `SOURCES.md` + `sourcesMd.test.ts`

### Phase 2 — RRQ

- [ ] Contributions; contributory period, 15 % drop-out and the base 25 % — verified: a full career at or above the MGA yields the published maximum ❓ MGA window
- [ ] The two enhancement tiers ❓ phase-in weights and the 480-month rule
- [ ] Early / late adjustment ❓ the sliding 0,5–0,6 % rule; the 72-year cap; property tests

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
