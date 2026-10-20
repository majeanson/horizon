import { expect, test, type Page } from '@playwright/test'
import { blankSeed, EXAMPLE, seedProfile, type SeedProfile } from './seed'

// COMPLEXITY, as a ratchet: what a first-time visitor FACES on each route before opening anything — the interactive controls
// they can see and the words they can read, counted with every fold (<details>) closed. A page that grows a control or a
// paragraph the reader did not ask for gets heavier to take in; this spec makes that visible the day it happens.
//
// The budgets only FALL. Lower one in the commit that earns it (a fold added, a duplicate view removed) and keep the history
// in a comment beside the number, the way `engine/params/cited.test.ts` does for its ratchet. Raise one only with a history
// comment that says why the page must carry more. It runs in the e2e workflow: a loud signal there, not a deploy gate.
//
// THIS SPEC NEVER SCROLLS. Some content mounts on scroll-into-view (`useSeen` in YearSection), so a count taken after a scroll
// is not the count of a fresh visit; unscrolled, it is deterministic. Do not add a scroll, a hover or a click to this file.

type Budget = { controls: number; words: number }

// TODO measure: run this spec, read the report, commit real numbers (then they only fall)
// Measured 2026-10-13, the ratchet's first setting (the day ideas 1 · 2 · 4 of the first-visit plan landed).
// Résultats — Réponse raised 43 → 46 controls and 639 → 668 words (2026-10-13): the « Moments » row under the projection chart — a chip per notable year
// (the pension starts, the end of the plan; the golden couple has three), each a door to the section that explains it. A conscious trade: the chart's moments
// were only dashed lines to guess at; the chips are the keyboard / screen-reader path that the taps on the chart mirror.
// Résultats — Réponse raised again 46 → 47 controls and 668 → 670 words (2026-10-13): the « Visite guidée » chip beside the answer card's « Et si je dépensais moins ? » — the one door to the
// four-step walk through the reader's own answer. The tour's bar itself exists only with `?visite=` set, which this route never sets.
// Accueil raised 24 → 34 controls / 294 → 372 words (first visit) and 20 → 30 / 183 → 261 (with a plan) (2026-10-14): the reading card (components/ReadingHelp.tsx) — language, day / night,
// contrast and the size of the letters, in plain words, offered BEFORE anything else and put away with one button. A conscious trade: for a reader who cannot see the page well, nothing
// below it exists until it is readable; it leaves the door for good once put away (the budget is measured on a first visit, which has not put it away).
// Résultats — Réponse raised a third time 670 → 683 words (2026-10-14): the answer's range line under the big age — « Selon les trois scénarios et les parcours de marché : de 57 à 64 ans »
// (lib/answerSpread.ts). A conscious trade: the scenarios and the market paths were three sections down; one sentence now says how far the answer moves.
// Résultats — Preuve, 2026-10-13 (idea 3, the Figure): controls 37 → 43 — the four Figure buttons on the golden couple's two pension rows (QPP and OAS, one each
// per person), the two EstFlag links on the spending rows, and one glossary link another session added to the average-rate sentence. Words 1959 → 1859 (the
// ratchet FALLS): the old calculation lines under the pensions folded into the figures' notes, which are hidden until asked for — one home per figure.
// THE TOP BAR, 2026-10-15 (components/BarAnswer.tsx): the language and theme buttons left the bar for the settings page (−2 controls, −1 word « EN » on every route), and the
// answer's age took their place on every route that HAS an answer (+1 link, +4 words « Votre réponse 60 ans »): first-visit routes fall by 2 controls and a word; routes with a
// plan fall by one control and RISE by three words. The strip that was pinned under the bar on Profil and Hypothèses is gone (Accueil with a plan: −3 controls, −6 words).
// THE FOOT LINE, 2026-10-19: « Vos chiffres ne quittent jamais cet appareil. » joins « Bâti par marc.portal » at the foot of every page — the promise said where it is
// always seen, not only in a closed fold on the front door: +7 words on every route, no control (the brand mark in the bar is a drawing, aria-hidden, no words).
// THE FOURTH TAB, 2026-10-19 (Marc: Profil and Hypothèses have no level above their cards, Résultats had three views): « Décider » is a tab of its own — +1 link and
// +1 word on every route; Résultats and Décider lose the three-view switch they carried (−3 controls each).
const BUDGETS: Record<string, Budget> = {
  // 34 → 28 controls, 372 → 309 words (2026-10-15, the ratchet FALLS): the reading card is a one-time dialog now (closed here), its subtitle is gone, and the demo
  // card's three early-retirement households (+3 chips) cost less than what left. The time question (components/TimeBudget.tsx) is a dialog too, put off here.
  // 28 → 26, 309 → 308 (2026-10-15): the top bar, see above.
  // 26 → 20 controls, 315 → 164 words (2026-10-19, the ratchet FALLS): the front door is a hero now — the question, what Horizon does and its two promises IN VIEW, one
  // « Commencer » and one « Voir un exemple » — and the three doors moved into the dialog « Commencer » opens (closed here); « how it works » and the map are two closed folds.
  // 20 → 21 controls, 164 → 169 words (2026-10-19, Marc: the showcase must show retiring early is reachable): « Couple, retraite avant 50 ans » joins the demo's chips.
  // 21 → 22, 169 → 170 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  // 22 → 31 controls, 170 → 206 words (2026-10-19, Marc: a first visit reads what Horizon is, then how to read it, then the hero): the reading controls left the
  // dialog for the page, above the question, in view — language 2, day / night 2, contrast 2, size 3 (+9), their labels, the card's title and the zoom tip.
  'Accueil (first visit)': { controls: 31, words: 206 },
  // 17 → 15, 78 → 77 (2026-10-15): the top bar.
  // 15 → 16, 84 → 85 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  'Profil (first visit, onboarding)': { controls: 16, words: 85 },
  // 30 → 21 controls, 261 → 186 words (2026-10-15, the ratchet FALLS): the same reading card, gone from the page.
  // 21 → 19, 186 → 184 (2026-10-15): the top bar, and the answer strip the page carried for a ready profile (its « Voir » link and its range line) is gone with it.
  // 19 → 22, 184 → 218 (2026-10-15): not growth — the count now WAITS for the drip question (three buttons, a sentence), which an earlier count read before it landed.
  // 22 → 17, 225 → 90 (2026-10-19, the ratchet FALLS): « Bon à savoir » is gone — its two promises are the hero's and the foot line's, its documents tip the dialog's last door.
  // 17 → 18, 90 → 91 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  'Accueil (with a plan)': { controls: 18, words: 91 },
  // controls 314 → 322, words 1952 → 2018 (2026-10-14): the form's new « Estimation du relevé » pair (two RRQ statement fields with their ⓘ and clear buttons, labels and the « repère de contrôle » hint) — the facsimile's figures got their one home on the form too.
  // controls 322 → 324, words 2018 → 2026 (2026-10-14): « Calculer mes droits d’aujourd’hui » — the TFSA room worksheet's one summary per person (its two boxes and its result sit in a closed fold, so they
  // count only once opened): the CRA's January 1 figure less this year's deposits.
  // controls 324 → 325, words 2026 → 2031 (2026-10-14): « Importer un relevé de banque » — the Budget section's one summary (the file picker, the paste box and the groups sit in a closed fold, so they
  // count only once opened): a bank export counted by category, read on the device.
  // controls 325 → 327, words 2031 → 2039 (2026-10-14): « Vérifier avec mes relevés » — one closed fold per person under the accounts (the year's net pay against what the salary leaves, and the deposits
  // in each account against its balance): two checks the plan never reads, counted only by their summary until opened.
  // controls 327 → 329, words 2039 → 2001 (2026-10-15): one card anatomy (Section `details`) — the Famille card's « enfant prévu » note and the Coussin card's
  // caveat fold under « En savoir plus »: two closed summaries added, ~40 words of prose off the first read.
  // controls 329 → 361, words 2001 → 2093 (2026-10-15): every field has its ⓘ (Marc: « inputs with (i) ») — « À propos de ce champ » on the fifty-odd rows
  // that had none (FieldHelp.tsx; its words load on first open and count only then), the one sentence under every card title, and the map's « 3/7 » counts.
    // controls 361 → 362, words 2093 → 2096 (2026-10-15): the foot line « Bâti par marc.portal » on every page — one link, three words (the same +1 / +3 on each route below).
  // 362 → 360, 2096 → 2094 (2026-10-15): the top bar, and the answer strip pinned over the form is gone (the age is in the bar).
  // 360 → 370, 2094 → 2100 (2026-10-15): the accordion (components/Accordion.tsx) — each block's title is now a button, and a « Suivant » closes every block of the form: a conscious trade for
  // the one-block-at-a-time reading on a phone, whose first paint holds ONE block (the budget here is the wide screen's, where every block is open).
  // 370 → 364, 2100 → 1856 (2026-10-16, the ratchet FALLS): the cash buffer and what the children cost are READ on Ma fiche now (components/sheet), not among the fields; Famille keeps
  // the choices that act on the cost, and the toggles' notes fold under « En savoir plus ».
  // 364 → 365 controls, 1856 → 1845 words (2026-10-16): « Rendre mon profil exact » keeps its bar and « n sur N » in view and folds the legend and the hint under one summary (+1 control, −11 words).
  // 365 → 403 controls, 1845 → 2032 words (2026-10-16, a conscious RISE — Marc: “inputs that could be better on mobile”): the bounded figures (ages, rates, shares) are sliders now
  // (components/NumberSlider.tsx): a thumb, a − and a + each, and a « Saisir le chiffre exact » chip that gives the typed box back. Fewer keyboards on a phone, more stops on a wide screen.
  // words 2039 → 2035 (2026-10-19, the ratchet FALLS): « Ma situation » closed says its answers (shorter than the lead it replaces, now inside), and the dots' legend of
  // « Rendre mon profil exact » is in view — it is needed to read every field's dot (+6 words).
  // 403 → 404, 2035 → 2036 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  // 404 → 406, 2036 → 2058 (2026-10-20, Marc: RREGOP « document, don't build »): the deferred pension's hint says how to enter a transfer to a CRI by hand
  // (one sentence; « CRI » and « REER » are glossary terms, so two buttons). The golden couple's RREGOP is deferred, so this route shows it.
  'Profil (form)': { controls: 406, words: 2058 },
  // Hypothèses words 659 → 680 (2026-10-14): the one line under « Hausse des salaires » that says the figure after inflation and Retraite Québec's (« Après inflation : +0,6 % par année… ») — a typed
  // wage growth is nominal and the pension grows by the real part, which the ⓘ's number alone hid. No control added.
  // controls 66 → 70, words 680 → 603 (2026-10-15): the card anatomy — four long subtitles (scénario, marchés, âge, dépenses) became one sentence each,
  // their explanation folded under « En savoir plus »: four closed summaries added, ~80 words off the first read.
  // 71 → 69, 606 → 609 (2026-10-15): the top bar, and the answer strip pinned over the page is gone (the age is in the bar).
  // 69 → 33, 609 → 159 (2026-10-16, the ratchet FALLS): the page is an accordion (components/Accordion.tsx) — a first visit faces the scenario open and six closed titles, not seven open blocks.
  // 33 → 32 controls, 166 → 159 words (2026-10-19, the ratchet FALLS): measured one control and seven words lighter than its budget (the foot line included) with no change
  // to the page in this commit — lowered so the slack cannot be spent.
  // words 159 → 218 (2026-10-19, a conscious RISE — Marc: « no hidden information »): a closed block is never a bare title any more (components/Accordion.tsx shows its
  // one sentence while closed), so the six closed assumptions each say what they hold.
  // 218 → 202 words (2026-10-19, the ratchet FALLS — Marc: « Ce que vous supposez de l’avenir » is enough): the page head says one short sentence.
  // 32 → 33, 202 → 203 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  'Hypothèses': { controls: 33, words: 203 },
  // 29 → 28, 385 → 388 (2026-10-15): the top bar (−1 control, +3 words on a route with an answer).
  // 28 → 32, 388 → 590 (2026-10-16): the two cards that left Profil — « Coussin de liquidités » and « Ce que coûtent les enfants » (four amounts, what the state pays back, a fold of sources): a conscious
  // trade, the sheet is where the household is READ.
  // 32 → 36 controls, 590 → 637 words (2026-10-16): the same 36 / 637 on 5d1b62d, BEFORE the polish round, so it is the sheet's own content (the two READ cards counted once settled), not the shared chrome;
  // the 32 / 590 above was measured before the cards had all landed. The counted list is in the failure message if it needs a ratchet back down.
  // 36 → 37 controls, 637 → 642 words (2026-10-17, Phase 16 slice 3): « Les dates de votre plan » — ONE closed fold under the plan's line (its list opens only when asked for): the calendar of every date
  // the profile announces, which the line draws only as stretches. One summary, five words; the list itself is not on the first screen.
  // 37 → 38 controls, 642 → 643 words (2026-10-17): « Imprimer… » moved here from the results page (one chip, its list is a closed dialog).
  // 38 → 43 controls, 650 → 667 words (2026-10-19): the sheet has its map, like every long page — a chip per section (Où vous en êtes, Aujourd’hui, À la retraite,
  // Ce que vous détenez, Ce qui préciserait la réponse), by its own title; and its sentence moved into the page head.
  // 43 → 44, 667 → 668 (2026-10-19): the fourth tab, « Décider » (+1 link, +1 word on every route).
  'Fiche': { controls: 44, words: 668 },
  // words 683 → 686 (2026-10-15): « Préciser » shows how much is confirmed — a bar with its « n/N » beside it — and ranks five figures instead of four.
    // 47 → 48 controls, 686 → 692 words (2026-10-15): the foot line (+1 / +3) and « Partager ce scénario » beside the card's other doors (+3 words; the chip is the share link, lib/shareLink.ts).
  // 48 → 47, 692 → 695 (2026-10-15): the top bar.
  // 47 → 43 controls, 695 → 603 words (2026-10-16, the ratchet FALLS): « Préciser le calcul » left the answer for Ma fiche, which already ranked the same figures (the bar, the ranked list and the three « still missing » lines moved there; the answer card keeps its range line and a link to the sheet). The tour is three steps.
  // 43 → 44 controls, 603 → 592 words (2026-10-16): the line saying which year's rates are used folds under « Barèmes utilisés » (one summary, one sentence fewer in view) unless the year is ahead of the rates, when it stays in view as a warning.
  // 44 → 45 controls, 592 → 557 words (2026-10-17): the two cards under the answer are accordion cards with « Tout ouvrir / Tout fermer » at the end of the map row (+1 icon, the card titles became buttons);
  // « Imprimer… » left the page, and the glance's three tiles are text, not controls.
  // words 564 → 577 (2026-10-19): the page's one sentence under its title (« Votre réponse, ce que vous pourriez changer, et la preuve derrière chaque chiffre. »), on a wide
  // screen; a phone keeps the head for screen readers and paper only. The same +13 on Décider and Preuve.
  // words 577 → 581 (2026-10-19): the engine fixes of 2f89409 move the scenario range sentence under the answer (four more words in its figures) — measured, not new copy.
  // words 581 → 583 (2026-10-19): the answer card's own heading, « La réponse », for a screen reader's list of headings (`.sr-only`: the counter reads clipped text, a reader does not see it).
  // 45 → 46 controls, 583 → 586 words (2026-10-19): « D’où vient l’argent » in the map — the bar charts were three taps deep (Comparer ▸ the chart ▸ « Détail »).
  // 46 → 54 controls, 586 → 670 words (2026-10-19): Résultats is the answer AND its proof now — Preuve's heading and sentence under the answer's cards, its five blocks
  // closed (each a title and its one line: +5), « Preuve » in the map (+1), the fourth tab (+1); the three-view switch is gone (−3). Preuve alone was 30 / 213: the two
  // pages that were three views fell from 46 + 52 + 30 controls to 54 + 50.
  // 54 → 55 controls, 670 → 677 words (2026-10-20, Marc chose it): « Quand arrêter » has its chart — ONE closed fold under « En dates » (« Rentes et dépenses,
  // année par année »), the chart mounting only once opened.
  'Résultats — Réponse': { controls: 55, words: 677 },
  // 51 → 50, 1220 → 1223 (2026-10-15): the top bar.
  // 50 → 48, 1223 → 823 (2026-10-16, the ratchet FALLS): the strategies are read one at a time (components/Accordion.tsx): the first is open, the others are closed titles.
  // 48 → 49 controls, 823 → 826 words (2026-10-17, Phase 16 slice 4): « Arrêter à l’âge de mon choix » — ONE more closed what-if beside the other three (the plan asked the other way round: four changes, each
  // in its own unit, and what waiting a year buys). One summary, five words; its body mounts only when opened.
  // 49 → 50 controls, 826 → 830 words (2026-10-17, Phase 16 slice 5): « Qui commence en premier » — ONE closed fold inside « Quand commencer mes rentes ? » (a couple only): the two QPP start ages tried
  // together, 3 × 3, scored by the worst case. Four words; the grid mounts only when opened.
  // 50 → 49 controls, 830 → 871 words (2026-10-17): « Imprimer… » and the « Tout montrer » chip are gone, the same icon as every page replaces the chip (+1); the four what-ifs are cards that say in one line what they hold while closed (+41 words).
  // 49 → 51 controls (2026-10-19): the closed strategies say what they hold (lib/cardsCopy.ts `closed`), and « REER » in two of those lines is a glossary link, as in every subtitle.
  // 51 → 52 controls, 891 → 912 words (2026-10-19): the second step is said on the page — « Choisir comment » and its one sentence over the strategies (« REER » in it a glossary link).
  // 52 → 50 controls (2026-10-19, the ratchet FALLS): a page of its own — the three-view switch gone (−3), the fourth tab (+1).
  // 50 → 51 controls (2026-10-20, Marc: « the first one stayed open »): « Ce qui change le plus » is a card with a title button, so « Tout fermer » reaches it; its
  // words are the same (the title moved into the header).
  'Résultats — Décider': { controls: 51, words: 912 },
  // Décider words 1211 → 1217 (2026-10-14): not new copy — the example's answers moved one year when the Neutre wage growth went from 3,1 % to 2,7 % (Retraite Québec's 2024
  // valuation), and the lever lines and the strategies' sentences it prints carry a few more figures. The controls are the same 50.
  // 43/1859 → 44/1887 (2026-10-14): not growth — the earlier numbers were read BEFORE the idle range landed; the settle now waits
  // for the pending « … » cells, and the final page holds the prudent-gap line with its « Voir la sensibilité » chip.
  // 45 → 44, 1890 → 1893 (2026-10-15): the top bar.
  // 44 → 31, 1893 → 158 (2026-10-16, the ratchet FALLS): the blocks of Preuve are read one at a time; the firm answer is open, the ledger, the table, the accuracy and the parameters are closed titles.
  // 31 → 30 controls, 158 → 153 words (2026-10-17, the ratchet FALLS): « Imprimer… » left the page.
  // words 160 → 200 (2026-10-19, a conscious RISE — « no hidden information »): the four closed blocks of Preuve were bare titles; each says in one line what it holds.
  // Preuve was a view of its own until 2026-10-19; it is counted in Résultats now (above), so it has no budget.
}

// [label, path, readySelector, seed, completion sentinel (optional)]
type Route = readonly [string, string, string, SeedProfile, string?]

const ROUTES: readonly Route[] = [
  ['Accueil (first visit)', '/', '.page-head__title', blankSeed()],
  ['Profil (first visit, onboarding)', '/profil', '.page-head__title', blankSeed()],
  ['Accueil (with a plan)', '/', '.page-head__title', EXAMPLE],
  ['Profil (form)', '/profil?form=1', '.page-head__title', EXAMPLE],
  ['Hypothèses', '/hypotheses', '.page-head__title', EXAMPLE],
  ['Fiche', '/fiche', '.sheet--serious', EXAMPLE],
  // `#annee` is the last section the answer view adds (lazy).
  ['Résultats — Réponse', '/resultats?v=answer', '#verdict', EXAMPLE, '#annee'],
  ['Résultats — Décider', '/decider', '.results-section', EXAMPLE],
]

interface Counts {
  controls: number
  words: number
  /** Each counted control's accessible name or text — printed when a budget fails, so the failure says WHAT grew. */
  names: string[]
}

/**
 * The counter. Walks the DOM from <body>:
 *  - CONTROLS: `button, a[href], input, select, textarea, [role="tab"], summary`, not `[hidden]`, not inside `[hidden]`
 *    or `[aria-hidden="true"]`, not `input[type=hidden]`, not inside a CLOSED <details> (except that details' own <summary>,
 *    which counts), with a non-zero bounding box.
 *  - WORDS: the text nodes under <body> split on whitespace, skipping script / style / noscript, `[hidden]` and `display:none`
 *    subtrees, `visibility:hidden` text, and the content of a closed <details> (its <summary>'s own text stays). Text under
 *    `aria-hidden` still counts — a sighted reader reads it.
 * The closed-details rule holds for nested details: a closed one is only ever entered through its first <summary>.
 */
async function count(page: Page): Promise<Counts> {
  return page.evaluate(() => {
    const CONTROL = 'button, a[href], input, select, textarea, [role="tab"], summary'
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
    let controls = 0
    let words = 0
    const names: string[] = []

    const walk = (el: Element, ariaHidden: boolean): void => {
      if (SKIP.has(el.tagName)) return
      if (el.hasAttribute('hidden')) return
      const cs = getComputedStyle(el)
      if (cs.display === 'none') return
      const hiddenFromAt = ariaHidden || el.getAttribute('aria-hidden') === 'true'

      if (!hiddenFromAt && el.matches(CONTROL) && !(el instanceof HTMLInputElement && el.type === 'hidden')) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          controls++
          // Each counted control's name, so a budget failure says WHAT grew, not only by how much.
          names.push((el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().replace(/\s+/g, ' ').slice(0, 48))
        }
      }

      // A closed <details> is entered through its first <summary> only; nothing else of it is on show.
      const closedDetails = el instanceof HTMLDetailsElement && !el.open
      let summarySeen = false
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (closedDetails || cs.visibility === 'hidden') continue
          for (const w of (node.textContent ?? '').split(/\s+/)) if (w) words++
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const child = node as Element
          if (closedDetails) {
            if (child.tagName !== 'SUMMARY' || summarySeen) continue
            summarySeen = true
          }
          walk(child, hiddenFromAt)
        }
      }
    }

    walk(document.body, false)
    return { controls, words, names }
  })
}

/** Count until two consecutive reads agree for ~1 s (idle workers add sections late, with nothing aria-busy meanwhile). */
async function settledCount(page: Page, label: string): Promise<Counts> {
  const STEP = 250
  const STABLE_FOR = 1_000
  const CAP = 20_000
  const start = Date.now()
  let last = await count(page)
  let stableSince = Date.now()
  while (Date.now() - stableSince < STABLE_FOR) {
    if (Date.now() - start > CAP) {
      throw new Error(`« ${label} » never settled: still ${last.controls} controls / ${last.words} words and moving after ${CAP / 1000} s`)
    }
    await page.waitForTimeout(STEP)
    const now = await count(page)
    if (now.controls !== last.controls || now.words !== last.words) {
      last = now
      stableSince = Date.now()
    }
  }
  return last
}

test.describe('complexity ratchet', () => {
  test('the counter counts what a first-time visitor faces — and nothing inside a closed fold', async ({ page }) => {
    await page.setContent(`<!doctype html><html><body>
      <h1>Title here</h1>
      <button>Go</button>
      <a href="#x">Link</a>
      <a href="#y" aria-hidden="true">Ghost link</a>
      <input type="hidden" value="x">
      <input type="text" aria-label="n">
      <div hidden><button>Nope</button> secret words</div>
      <details><summary>Closed sum</summary><p>inner words here</p><button>inner</button></details>
      <details><summary>Outer</summary>
        <details open><summary>Inner open</summary>deep text <button>deep</button></details>
      </details>
      <details open><summary>Open sum</summary><p>shown text</p>
        <details><summary>Nested closed</summary>hidden stuff<button>x</button></details>
      </details>
      <script>var ignored = "not words at all"</script>
    </body></html>`)
    // controls: Go, Link, the text input, "Closed sum", "Outer", "Open sum", "Nested closed" = 7 (the ghost link, hidden input,
    // [hidden] button, and every button inside a closed fold, nested or not, are out)
    // words: Title here 2 · Go 1 · Link 1 · Ghost link 2 (read by the eye, so counted) · Closed sum 2 · Outer 1 · Open sum 2 ·
    // shown text 2 · Nested closed 2 = 15
    const got = await count(page)
    expect({ controls: got.controls, words: got.words }).toEqual({ controls: 7, words: 15 })
    expect(got.names).toContain('Go') // the names ride along for the failure message
    expect(got.names).not.toContain('Nope')
  })

  for (const [label, path, ready, seed, sentinel] of ROUTES) {
    test(`${label} stays within its complexity budget`, async ({ page }, testInfo) => {
      test.setTimeout(90_000)
      await seedProfile(page, seed)
      await page.goto(path)
      await page.locator(ready).first().waitFor({ timeout: 30_000 })
      if (sentinel) await page.locator(sentinel).first().waitFor({ state: 'attached', timeout: 30_000 })
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 })
      // The answer in the top bar (components/BarAnswer.tsx) is a lazy chunk and a worker's answer: on a route with a plan it lands a moment after the page, and a
      // count taken before it would read one control and four words fewer than a visit sees (it did, once: the same route measured 18 and 19 in two runs).
      if (seed === EXAMPLE) await page.locator('.shell__answer-link').waitFor({ timeout: 30_000 })
      // The front door's one question (components/DripQuestion.tsx) lands after an IDLE search of every unconfirmed figure: on CI's slower runner it was in the count, locally it
      // was not (19 here, 22 there, 2026-10-15). A visit sees it; the count waits for it.
      if (label === 'Accueil (with a plan)') await page.locator('.drip').waitFor({ timeout: 60_000 })
      // The two routes whose LAST block arrives from an idle search, long after the page is up (counted a beat early, the same route read 32 / 590 and 36 / 637, 603 and 604 words):
      // the sheet's ranked figures (the example has some), and « À faire cette année » once its levers are in. A visit sees them; the count waits for them.
      if (label === 'Fiche') await page.locator('.sheet__movers li').first().waitFor({ timeout: 60_000 })
      if (label === 'Résultats — Réponse') await expect(page.locator('#annee')).not.toContainText('Calcul en cours', { timeout: 60_000 })
      // « … » is the house's pending cell (a worker's answer not yet landed — Solidité's ranges): counting before it clears
      // reads a page that is still changing shape (caught at 4× throttle: the prudent-gap chip only exists once the range is in).
      await expect(page.locator('.mono', { hasText: '…' })).toHaveCount(0, { timeout: 30_000 })
      await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 5000))]))
      await page.evaluate(() => document.getElementById('root')?.scrollTo({ top: 0 }))

      const measured = await settledCount(page, label)
      const line = `complexity ${label}: controls=${measured.controls} words=${measured.words}`
      testInfo.annotations.push({ type: 'complexity', description: `controls=${measured.controls} words=${measured.words}` })
      console.log(line)
      if (process.env.COMPLEXITY_NAMES) console.log(`  counted: ${measured.names.join(' · ')}`)

      const budget = BUDGETS[label]
      const why = `${line} — lower the budget only in the commit that earns it; raise it only with a history comment`
      expect(measured.controls, `controls: ${why}\n  counted: ${measured.names.join(' · ')}`).toBeLessThanOrEqual(budget.controls)
      expect(measured.words, `words: ${why}`).toBeLessThanOrEqual(budget.words)
    })
  }
})
