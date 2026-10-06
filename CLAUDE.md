# CLAUDE.md

Guidance for Claude Code when working in **Horizon**. This file is the **law**: how to write
code here. [`STATE.md`](./STATE.md) is *what to write next* — read it first when asked « what
should we work on? ». [`ENGINE.md`](./ENGINE.md) is the calculation contract.

> Scaffolded from **Babillard** (`../PlannerOrSomething/`), whose tooling, i18n contract,
> build-guard tests and generic UI primitives came over; everything household-specific stayed.
> When something here is thin, Babillard's own `CLAUDE.md` explains the *why* of the shared
> machinery at length.

---

## What this is

**Horizon** — « Quand pouvez-vous prendre votre retraite ? » A web app for a **Québec**
household (self, spouse, kids' birth years): you enter, **by hand**, the numbers the government
already holds about you (the Retraite Québec *relevé de participation*, the CRA / Revenu Québec
notices of assessment, an employer pension statement), set your assumptions, and see — in a
chart and a per-year table — the earliest retirement age at which the money lasts, and what it
looks like at 60 versus 65.

The calculation is the product. It must be **strong, unit-tested, and traceable to an official
page**, so every figure can be counter-verified by anyone.

Single-page React app + one Cloudflare Worker that serves static assets. **FR-CA first**, EN
second. Mobile-first, then tablet, then desktop.

## The three laws

1. **Engine purity.** `src/engine/` is plain TypeScript: no React, DOM, `Date`, `Math.random`,
   `Intl`, `localStorage`, `fetch`, and no import from outside `src/engine/`. Time is an input.
   *(`engine/purity.test.ts`)*
2. **Every government number is cited.** A figure from an official page lives in
   `src/engine/params/` as a `Cited` value — value, source URL, page title, retrieval date,
   index rule — and the engine reads it through `plain()`. After any params change run
   `npm run sources`. *(`cited.test.ts`, `sourcesMd.test.ts`)*
3. **Local forever.** A household's financial profile never leaves the device: no accounts, no
   server data, no `/api`, no `fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon` anywhere
   in the app, and a CSP of `connect-src 'self'`. A network need is a **product decision** —
   raise it; do not add an exemption. *(`lib/noNetwork.test.ts`)*

## Build by reuse — read before you write

Almost nothing you will be asked for is greenfield. Before implementing a change:

1. **Read how the page already works**, and match its structure, naming and idioms.
2. **Look for the primitive.** [`COMPONENTS.md`](./COMPONENTS.md) is the inventory; `/dev/kit`
   (`src/pages/DevKit.tsx`) renders every shared component live across theme, contrast, text
   size and locale. If one *almost* fits, **extend it** — do not fork a copy.
3. **Reuse the CSS class family** (`.btn`, `.input`, `.chip`, `.edit-field__*`, `.subtabs`,
   `.cluster` / `.rail`, `.disclosure`, …). `@import` order in `styles.css` **is** the cascade:
   append only, never reorder.

### Reach for these before hand-rolling

| Need | Use | Where |
| --- | --- | --- |
| Type / edit text, with clear and submit | **`EditField`** (amounts: **`NumberField`**) | `components/EditField.tsx` |
| A small pill (toggle · action · link · label · expander) | **`Chip`** — shape chosen by props; a test fails a hand-rolled `className="chip"` | `components/Chip.tsx` |
| Segmented « one job at a time » control | **`SubTabs`** | `components/SubTabs.tsx` |
| A horizontal row of buttons / chips | **`Cluster`** (wraps) / **`Rail`** (scrolls one line) — never a bespoke flex row | `components/Layout.tsx` |
| A row that scrolls sideways with a hidden scrollbar | **`useHScroll()`** — maps the wheel, reports `overflowing` | `lib/hscroll.ts` |
| Collapse a secondary group | **`Disclosure`** | `components/Disclosure.tsx` |
| Empty / status / section header | **`EmptyState`** / **`StatusMessage`** / **`SectionHeader`** | same-named files |
| A surface that is loading | **`Skeleton`** if the shape is known (rows, a grid); **`Loading`** for a whole route | `components/Skeleton.tsx`, `Loading.tsx` |
| A dialog | **`Modal`** + `useModal` | `components/Modal.tsx`, `lib/useModal.ts` |
| Confirm a destructive action | **`useConfirm`** — the message says **what is lost**, never a bare « Supprimer ? » | `lib/confirm.tsx` |
| A one-line « done » notice | **`useNotice`** | `lib/toast.tsx` |
| An icon | **`Icon`** / `InlineIcon` (Phosphor, never an emoji) | `components/Icon.tsx` |
| Format a number / money / percent | the **cached** helpers in `lib/format.ts` / `lib/money.ts` | — |
| Explain where a number comes from | **`FieldInfo`** under the field | `components/FieldInfo.tsx` |
| A chart | **`LineChart`** from `components/charts` — the only file that touches the chart library | `components/charts/` |

**When you add a shared component:** register it in `src/pages/DevKit.tsx` and add its row to
`COMPONENTS.md` — `devkitParity.test.ts` fails the build on either half missing.

## Conventions that bite

| Concern | Do | Don't |
| --- | --- | --- |
| Money | a plain `number` of **dollars**, nominal; round at module outputs | integer cents, a decimal library, `===` on money (`toBeCloseTo`) |
| Parsing a typed amount | `parseMoney` / `parsePct` — FR-CA commas are decimals (« 812,82 ») | `Number(text)`, `parseFloat` |
| Number formatting | cached helpers in `lib/format.ts` / `lib/money.ts` | `new Intl.*` inline, `toLocaleString` (`intl-rule.test.ts`) |
| Copy | `useT()`; FR first, then EN — `typeof FR` is the parity contract | a string literal in a component; a French string pasted into EN (`i18nParity.test.ts`) |
| Register of French | Québécois: *courriel*, *REER*, *CELI*, *rente*, *retraite* | France French |
| Local state that must survive a reload | the versioned store in `lib/store.ts` | a bare `localStorage` write; a schema edit without a version bump (`schemaVersion.test.ts`) |
| A text field taking focus | only when the tap that revealed it asked to type | `autoFocus` because a screen or dialog OPENED (`autofocus.test.ts`) |
| A container that holds buttons | a plain `<div onClick>` (mouse convenience) | `role="button"` + `tabIndex` on it — a control inside a control |
| Horizontal overflow | `Cluster` / `Rail` | `overflow-x: hidden` to *mask* a wide row — it hides the bug from the eye and the guard |
| Touch-only actions | give every swipe / long-press a mouse and keyboard mirror | a gesture as the only path |
| Docs | `- [ ]` only in `STATE.md`; copy-me checklists get bullets | an open checkbox anywhere else (`docs.test.ts`) |

**Every UI change must be mobile-friendly, tablet-friendly and desktop-friendly, every time.**
Browser zoom stays enabled (no `user-scalable=no`): this is read by people who may need large
type, and pinch-zoom is the substitute for everything the in-app text-size setting does not
reach.

## Commands

```bash
npm run dev            # Vite on :5173 — frontend only (there is no backend)
npm run build          # tsc -b (typecheck) then vite build → dist/
npm run typecheck      # tsc -b --noEmit
npm test               # vitest run — the engine, the guards, the helpers
npm run test:engine    # vitest run src/engine only
npm run sources        # regenerate SOURCES.md from the params files
npm run check:bundle   # size budgets + the offline precache check (needs dist/)
npm run knip           # dead-code gate (CI only: its parser needs a >4 GiB buffer that a memory-tight Windows box refuses)
npm run e2e            # Playwright against Vite, profile seeded into localStorage
npm run e2e:ci         # …in CI's shape (1 worker, 0 retries) — run THIS before pushing shared machinery
npm run e2e:sw         # the service-worker offline harness on the PROD bundle
npm run deploy         # build + wrangler deploy
```

Run one file or one test: `npx vitest run src/engine/rrq.test.ts` · `npx vitest run -t "drop-out"`.

CI (`.github/workflows/ci.yml`) runs typecheck → test → build → check:bundle → knip on every
push; on `main` it then deploys. E2E (`e2e.yml`) chains off a green CI and never blocks the
deploy. **Node 26.** A local e2e run is *weaker* than CI (4 workers, 1 retry) — a flake fails
the local run, and **which test flaked is the whole signal**; never dismiss one unread.

> **Workflow: push straight to `main`.** No PR branches — commit and `git push origin main`.
> CI is the only gate; a red build is fixed forward. Stage explicit paths and verify `HEAD`
> after committing (concurrent sessions can share this checkout).

## Architecture

- **`src/engine/`** — the calculation (see `ENGINE.md`). `params/` holds one file per tax year.
  `verified/` holds worked examples from official pages; `golden/` the committed household.
- **`src/lib/store.ts`** — the profile: versioned schema, `localStorage`, JSON export / import,
  a migration per version bump. Every old fixture must still migrate.
- **`src/pages/`** — `Profil`, `Hypotheses`, `Resultats`, `Donnees`, `DevKit`; all lazy but the
  first. The chart library rides with `Resultats` and never in the shell (`check-bundle.mjs`).
- **`worker/index.ts`** — serves `dist/` and turns the SPA fallback into a **404 for `/assets/*`**
  (a stale shell asking for a gone chunk must not receive HTML as JavaScript).
- **PWA / offline** — `vite.config.ts` generates `dist/sw.js` with the real hashed asset list, so
  the app reopens offline *with the profile intact*. Bump `SW_POLICY` when the caching rules
  change; keep `ONLINE_ONLY_CHUNKS` ↔ `check-bundle.mjs` in sync. Chrome logs a benign « A preload
  … cross-world service worker resource mismatch » *warning* on a service-worker-controlled
  navigation (the speculative parser preloads before the worker controls the page); it costs two
  redundant cache hits and is not an error — the SW harness asserts on errors only.
- **Dialogs** are portalled to `<body>` and `useModal` makes `#root` `inert` while one is open
  (ref-counted): no Tab, no screen-reader reach, no stray tap behind it. A new overlay must be
  portalled too — inerting an ancestor of the dialog would inert the dialog.
- **Chunking** uses `codeSplitting` groups, **not** `manualChunks` — under Vite 8 / Rolldown
  `manualChunks` is a shim that silently folds groups away.

## The guards (build-gating grep tests)

All import `src/lib/buildGuardScan.ts` — **import it, don't re-walk the tree.** Each has a
canary (the detector is pinned against a fixture), an `ALLOWED` map whose entries must say
*why*, a stale-entry check, and where it counts something, a ratchet that only falls.

`noNetwork` · `intl-rule` · `chip-rule` · `autofocus` · `devkitParity` · `i18nParity` · `docs` ·
and, as they land: `purity` · `cited` · `verifiedHeader` · `sourcesMd` · `schemaVersion` ·
`fieldInfoCopy` · `chartBoundary`.

> **A new guard must be run against the bug it was written for before it is trusted.** A green
> grep test proves nothing on its own — plant the violation (or stash the fix), watch the guard
> fail, restore. **And check the plant actually landed**: a `sed` whose pattern did not match
> « proves » a rule just as convincingly as a real run. Re-apply the mutation through an
> exact-match edit.
