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
// Résultats — Preuve, 2026-10-13 (idea 3, the Figure): controls 37 → 43 — the four Figure buttons on the golden couple's two pension rows (QPP and OAS, one each
// per person), the two EstFlag links on the spending rows, and one glossary link another session added to the average-rate sentence. Words 1959 → 1859 (the
// ratchet FALLS): the old calculation lines under the pensions folded into the figures' notes, which are hidden until asked for — one home per figure.
const BUDGETS: Record<string, Budget> = {
  'Accueil (first visit)': { controls: 24, words: 294 },
  'Profil (first visit, onboarding)': { controls: 16, words: 75 },
  'Accueil (with a plan)': { controls: 20, words: 183 },
  // controls 314 → 322, words 1952 → 2018 (2026-10-14): the form's new « Estimation du relevé » pair (two RRQ statement fields with their ⓘ and clear buttons, labels and the « repère de contrôle » hint) — the facsimile's figures got their one home on the form too.
  'Profil (form)': { controls: 322, words: 2018 },
  'Hypothèses': { controls: 66, words: 659 },
  'Fiche': { controls: 28, words: 382 },
  'Résultats — Réponse': { controls: 47, words: 670 },
  'Résultats — Décider': { controls: 50, words: 1211 },
  // 43/1859 → 44/1887 (2026-10-14): not growth — the earlier numbers were read BEFORE the idle range landed; the settle now waits
  // for the pending « … » cells, and the final page holds the prudent-gap line with its « Voir la sensibilité » chip.
  'Résultats — Preuve': { controls: 44, words: 1887 },
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
  // `#preciser` appears once the factImpact movers have landed: the last section the answer view adds.
  ['Résultats — Réponse', '/resultats?v=answer', '#verdict', EXAMPLE, '#preciser'],
  ['Résultats — Décider', '/resultats?v=decide', '.results-section, #verdict', EXAMPLE],
  ['Résultats — Preuve', '/resultats?v=proof', '.results-section, #verdict', EXAMPLE],
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
      // « … » is the house's pending cell (a worker's answer not yet landed — Solidité's ranges): counting before it clears
      // reads a page that is still changing shape (caught at 4× throttle: the prudent-gap chip only exists once the range is in).
      await expect(page.locator('.mono', { hasText: '…' })).toHaveCount(0, { timeout: 30_000 })
      await page.evaluate(() => Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))))
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
