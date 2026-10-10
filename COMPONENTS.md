# Horizon — component inventory

> The living inventory of the shared UI. Pair it with the **`/dev/kit`** gallery
> (`src/pages/DevKit.tsx`) — a dev-only page that renders every shared primitive live, with
> toggles for theme, language, contrast and text size. Reach it from the foot of **Sauvegarde et
> réglages** (in development only), or go to `/dev/kit`. Keep it open beside a chat to point at « this component, here » without running a
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
| **Slider** | `src/components/Slider.tsx` | A range control for a whole-number choice (an age) whose effect is worth SEEING while it moves: `onPreview` on every step (cheap — show what it would do), `onCommit` once on release / key up / blur (save it, recompute the heavy answers). The value is always printed beside it; pair with a `NumberField` where a typed value matters. |
| **EditField** | `src/components/EditField.tsx` | The ONE text box: input or textarea, clear ✕ inside the box, optional submit / cancel / leading glyph / trailing unit. `NumberField` (profile amounts) wraps it. |
| **NumberField** | `src/components/NumberField.tsx` | The number box: owns the TEXT while it is typed and hands the page a NUMBER only when the text means one (FR-CA comma rules, `lib/money.ts`). Kinds `money` / `percent` / `decimal` / `year` / `int`; committed on Enter or blur; an out-of-range text stays on screen with its reason. `allowEmpty` makes an optional figure a number or `null`. |
| **FieldRow** | `src/components/FieldRow.tsx` | One labelled field: label tied to the box, the box with its ⓘ, a quiet hint read with it. The control is a render function that receives the ids to wire — the caller never invents them. |
| **FieldInfo** | `src/components/FieldInfo.tsx` | The ⓘ « where to find this number »: an inline note (not a popover) with WHERE the figure is, the document's own wording for it, and the official page. Wording lives in `FR.info.<id>`; `fieldInfoCopy.test.ts` holds every id to an entry and every link to an official host. |
| **Chip** · ChipGroup | `src/components/Chip.tsx` | The ONE pill — toggle (`selected`, drawn with a check when on), action (`onClick`), link (`to`), static label, expander (`expanded`, drawn with a caret), the « you are here » of a nav (`current`). A test (`chip-rule.test.ts`) fails the build on a hand-rolled `className="chip"`. |
| **Switch** | `src/components/Switch.tsx` | The ONE on/off setting (`role="switch"`): a knob on a track, the label beside it, an optional hint under. For a lone yes/no (« Placer d’abord le surplus dans le REER »); a choose-one among several is `SubTabs`. |
| **TableChooser** | `src/components/TableChooser.tsx` | The header of a table that could hold several data sets (scenarios, hypotheses, horizons, years): ONE table below, this row picks which set it shows. A label, a SubTabs control, an optional trailing action; renders nothing when there is only one set. |
| **SubTabs** | `src/components/SubTabs.tsx` | The segmented « one job at a time » control; keyboard-complete tablist, wheel-mapped, paging chevrons on a fine pointer. An option may carry `who` (0 / 1) to wear a person's colour dot. |

### Display / content

| Component | File | Purpose |
| --- | --- | --- |
| **SectionHeader** | `src/components/SectionHeader.tsx` | An optional icon, a title (a real `h2`; `h3` under a `SectionLevel` of 3), a subtitle, a trailing action. One anatomy for every section. |
| **PageHead** | `src/components/PageHead.tsx` | The top of a page: its ONE `<h1>` and a quiet line under it. (A `SectionHeader` names a section inside a page.) |
| **ImpactMeter** | `src/components/ImpactMeter.tsx` | « Where does this assumption sit, and what does it do to the plan? » A five-step track with a marker, the level and its lean in words (cautious / central / optimistic), and one « why it matters » sentence. The level comes from `engine/assumptionImpact.ts` (anchored on the three scenarios); the copy is `FR.assumptions.impact`. |
| **EmptyState** | `src/components/EmptyState.tsx` | The calm « nothing here » line (`role="status"`). |
| **Gloss** | `src/components/Gloss.tsx` | A sigle in running text (a hint, an ⓘ note, a section subtitle) made a link to its glossary entry — first occurrence only, and only the sigles `lib/glossIndex.ts` lists. `FieldRow`, `FieldInfo` and `SectionHeader` already pass their text through `glossed()`; never use it inside a button, label or link. |
| **SectionNav** | `src/components/SectionNav.tsx` | The map of a long page: a sticky `Rail` of chips, one per section in reading order — a tap scrolls there, the section in view is marked (IntersectionObserver). Everything stays ON the page; the nav only moves the reader. |
| **LiveAnswer** | `src/components/LiveAnswer.tsx` | « Votre réponse : 59 ans », pinned at the top of Profil and Hypothèses (each page renders it, so it rides in their chunks and not the shell's): the results page's own `useAnswer`, from a profile that has rested, plus how far an edit has moved it since arrival. Silent while the profile has gaps or the household is retired. |
| **NextStep** | `src/components/NextStep.tsx` | The foot of a page: one line on what is missing (or that nothing is) and ONE primary action to the next page — Profil → Résultats, Résultats → Hypothèses. |

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
`src/components/profile/*`; Résultats' state is `lib/useResultsPage.ts`, its five views `src/components/results/views/*` and its panels `src/components/results/*` — `BridgePanel`, `ChartPanel`,
`SensitivityPanel`, `EarliestEachPanel`, `SaveView`, `SpendView`, `FutureView`, `CareView`, `AccuracyNote`, `LedgerPanel`, `OrderPanel`, `YearTables`, `ParamsPanel`) `src/components/install/InstallHint.tsx` (`InstallCard` on the front door, `InstallLine` on the settings page; state in `lib/install.ts`), `src/pages/Fiche.tsx` (the character sheet; its two skins and their pieces are `src/components/sheet/*` — `SheetSerious`, `SheetRpg`, `StatBar`, `ModeSwitch`, all drawing the one view of `lib/sheetView.ts`) and `src/pages/DevKit.tsx` (the gallery itself).

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
