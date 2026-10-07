# Horizon — component inventory

> The living inventory of the shared UI. Pair it with the **`/dev/kit`** gallery
> (`src/pages/DevKit.tsx`) — a dev-only page that renders every shared primitive live, with
> toggles for theme, language, contrast and text size. Reach it from **Données**, or go to
> `/dev/kit`. Keep it open beside a chat to point at « this component, here » without running a
> flow.
>
> **Reach for a primitive before you write markup.** The recurring failure mode is building
> something beside an existing thing and refactoring it back later — so read this file, open the
> gallery, and extend the primitive if it only *almost* fits.

## The axes

Every surface renders across these. The gallery toolbar flips each one (they persist to
localStorage — set, look, set back):

| Axis | Values | Read / set | Notes |
| --- | --- | --- | --- |
| **Theme** | day / night | `getTheme` / `setTheme` (`src/lib/theme.ts`) | imperative, sets `data-theme` on the root; bootstrapped pre-mount by `public/theme-bootstrap.js` |
| **Contrast** | normal / high | `getContrast` / `setContrast` (`src/lib/accessibility.ts`) | `data-contrast` on the root |
| **Text size** | 100 % / 115 % / 130 % | `getTextScale` / `setTextScale` (`src/lib/accessibility.ts`) | `data-text-scale` on the root; browser zoom stays enabled for anything beyond |
| **Locale** | fr / en | `useLang()` / `useT()` (`src/i18n.ts`) | Québécois FR first; `typeof FR` is the EN parity contract |

Providers live in `src/main.tsx` (Lang → Toast → Confirm → Router → ErrorBoundary).

## Shared primitives

**This file groups by ROLE; the gallery groups by category.** The mapping is held closed by
`src/lib/devkitParity.test.ts` — a gallery category missing from this table fails the build:

| This file's section | `/dev/kit` categories |
| --- | --- |
| **Foundations** (icons, rows, layout) | `Fondations` |
| **Inputs** | `Saisie` |
| **Display / content** | `Affichage` |
| **Feedback / chrome** | `Feedback` |
| **Charts** | `Graphiques` |

> **Every row here either has a live specimen in `/dev/kit`, or says why not** — the marker
> `*(no specimen: <reason>)*` at the end of its Purpose cell. The parity test fails the build on
> a row that has neither, and on a specimen that has no row.

### Foundations

| Component | File | Purpose |
| --- | --- | --- |
| **Icon** · InlineIcon | `src/components/Icon.tsx` | The Phosphor glyphs. `IconName` is derived from the registry (`src/lib/pipIcons.ts`), so a typo is a compile error, not a blank. Add a glyph = one entry there. |
| **Cluster** | `src/components/Layout.tsx` | A wrap-safe flex row — drops to the next line instead of overflowing. The default for any row of buttons or chips. Never a hand-rolled `display:flex`. |
| **Rail** | `src/components/Layout.tsx` | A one-line row that scrolls sideways (wheel-mapped via `useHScroll`, focusable only while it overflows). For sequences that must stay inline. |

### Inputs

| Component | File | Purpose |
| --- | --- | --- |
| **EditField** | `src/components/EditField.tsx` | The ONE text box: input or textarea, clear ✕ inside the box, optional submit / cancel / leading glyph / trailing unit. `NumberField` (profile amounts) wraps it. |
| **NumberField** | `src/components/NumberField.tsx` | The number box: owns the TEXT while it is typed and hands the page a NUMBER only when the text means one (FR-CA comma rules, `lib/money.ts`). Kinds `money` / `percent` / `decimal` / `year` / `int`; committed on Enter or blur; an out-of-range text stays on screen with its reason. `allowEmpty` makes an optional figure a number or `null`. |
| **FieldRow** | `src/components/FieldRow.tsx` | One labelled field: label tied to the box, the box with its ⓘ, a quiet hint read with it. The control is a render function that receives the ids to wire — the caller never invents them. |
| **FieldInfo** | `src/components/FieldInfo.tsx` | The ⓘ « where to find this number »: an inline note (not a popover) with WHERE the figure is, the document's own wording for it, and the official page. Wording lives in `FR.info.<id>`; `fieldInfoCopy.test.ts` holds every id to an entry and every link to an official host. |
| **Chip** · ChipGroup | `src/components/Chip.tsx` | The ONE pill — toggle (`selected`), action (`onClick`), link (`to`), static label, expander. A test (`chip-rule.test.ts`) fails the build on a hand-rolled `className="chip"`. |
| **SubTabs** | `src/components/SubTabs.tsx` | The segmented « one job at a time » control; keyboard-complete tablist, wheel-mapped, paging chevrons on a fine pointer. |

### Display / content

| Component | File | Purpose |
| --- | --- | --- |
| **SectionHeader** | `src/components/SectionHeader.tsx` | An optional icon, a title, a subtitle, a trailing action. One anatomy for every section. |
| **PageHead** | `src/components/PageHead.tsx` | The top of a page: its ONE `<h1>` and a quiet line under it. (A `SectionHeader` names a section inside a page.) |
| **ImpactMeter** | `src/components/ImpactMeter.tsx` | « Where does this assumption sit, and what does it do to the plan? » A five-step track with a marker, the level and its lean in words (cautious / central / optimistic), and one « why it matters » sentence. The level comes from `engine/assumptionImpact.ts` (anchored on the three scenarios); the copy is `FR.assumptions.impact`. |
| **EmptyState** | `src/components/EmptyState.tsx` | The calm « nothing here » line (`role="status"`). |
| **Disclosure** | `src/components/Disclosure.tsx` | A collapsed-by-default expander (caret + label + optional count) for secondary, space-hungry groups: the per-year table, the parameters behind a figure. |
| **Advanced** | `src/components/Advanced.tsx` | What Simple mode folds away: in Full its children are drawn as they are; in Simple they sit behind one collapsed « Voir les détails » (a `Disclosure`). Wrap an OPTIONAL or EXPERT group in it — never a field the plan cannot do without. The mode is `lib/mode.ts`. |
| **NextStep** | `src/components/NextStep.tsx` | The foot of a page: one line on what is missing (or that nothing is) and ONE primary action to the next page — Profil → Hypothèses → Résultats → Données. |
| **ModeSwitch** | `src/components/ModeSwitch.tsx` | The Simple ↔ Full toggle in the top bar (a `Chip`, pressed = Full). Remembered on the device, never in the profile; a new device starts Simple, a device that already holds a profile starts Full. |

### Charts

| Component | File | Purpose |
| --- | --- | --- |
| **StackedBarChart** | `src/components/charts/StackedBarChart.tsx` | The second chart: one segment per source of money per year, plus an optional dashed line across the bars (what has to be covered). Same rules as the line chart — plain data in, the app's colour tokens out (`SeriesColour`, with a neutral `ink`), its own lazy chunk, `role="img"` with a name and the year table beside it as its text. Used by « Mes années 60 à 70 ». |
| **LineChart** | `src/components/charts/LineChart.tsx` | The ONE chart: plain `ChartSeries` in, a line chart out, in the app's own colour tokens. A thin adapter — only `components/charts/*` may import the chart library (`chartBoundary.test.ts`), and it rides in its own lazy chunk. A picture: `role="img"` with a name, the per-year table beside it is its text. |

### Feedback / chrome

| Component | File | Purpose |
| --- | --- | --- |
| **StatusMessage** | `src/components/StatusMessage.tsx` | The inline status line under a form: error (`role="alert"`), success, info. |
| **Skeleton** · Loading | `src/components/Skeleton.tsx` | A quiet placeholder for a surface whose SHAPE is known (rows, a grid); `Loading` (`src/components/Loading.tsx`) is the honest line when it is not. No shimmer — a screen may not ask for attention it has not earned. |
| **Modal** | `src/components/Modal.tsx` | A centred dialog on the shared modal behaviour (`useModal`: Escape, scroll lock, focus trap, focus returned to the opener). |
| **useConfirm** · useNotice | `src/lib/confirm.tsx` | The in-app confirm dialog (promise-based; the message must say WHAT IS LOST) and the one-line notice (`src/lib/toast.tsx`). |
| **ErrorBoundary** | `src/components/ErrorBoundary.tsx` | *(no specimen: it replaces the whole app when a render throws — it is exercised by throwing, not by looking)* |
| **AppShell** | `src/components/AppShell.tsx` | *(no specimen: page chrome — the gallery sits outside it on purpose, with its own header)* |

## Page orchestrators — intentionally NOT in the gallery

Pages compose the primitives above and own data and routing; a specimen of a page is a
screenshot, and the e2e suite takes those. They are listed so nobody looks for them here:
`src/pages/Profil.tsx`, `Hypotheses.tsx`, `Resultats.tsx`, `Donnees.tsx` (the four destinations; their sections are
`src/components/profile/*`; Résultats' panels are `src/components/results/*` — `BridgePanel`, `DeferralPanel`, `ChartPanel`,
`SensitivityPanel`, `EarliestEachPanel`, `SaveView`, `StopView`, `SplitPicker`, `YearTables`, `ParamsPanel`) and `src/pages/DevKit.tsx` (the gallery itself).

## CSS design system (condensed)

`src/styles.css` is the `@import` list — **its order IS the cascade; never reorder, append only.**

| File | Holds |
| --- | --- |
| `styles/fonts.css` | self-hosted `@font-face` (WOFF2, latin subset) — first, because an `@import` after any other rule is ignored |
| `styles/core.css` | the design tokens (« Pip »: warm paper, riso inks), day/night themes, high-contrast and text-scale profiles, reset, `.btn` family, `.input`, tags, skeleton, `Cluster` / `Rail`, sub-tabs, focus rings |
| `styles/fields.css` | the `.edit-field*` family |
| `styles/kit.css` | the shared primitives: empty state, status message, chip, section header, modal, disclosure, confirm dialog, error boundary |
| `styles/horizon.css` | the app shell, the toast line, page rhythm |
| `styles/devkit.css` | the gallery — imported by `DevKit.tsx` only, so it never rides the shell |

New CSS uses BEM (`.block`, `.block__element`, `.block--modifier`); state flips are `.is-on` /
`.is-active`. Tokens, never literals: a colour or a radius that is not a `var(--…)` is a bug
waiting for night mode.

## How to extend the gallery

1. Add the component under `src/components/` (or a hook under `src/lib/`).
2. Add an `Entry` to `ENTRIES()` in `src/pages/DevKit.tsx` — `{ cat, name, file, kw, render }`
   (`exports: [...]` when one file exports several).
3. Add its row to the table above — or end the row with `*(no specimen: <reason>)*`.
4. `npm test` — `devkitParity.test.ts` checks both directions, that the file exists, and that
   the file really exports the name the gallery promises.
