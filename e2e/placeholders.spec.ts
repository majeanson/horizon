import { readdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// A WAIT IS THE SIZE OF WHAT IT WAITS FOR, AND NEVER PASSES FOR IT (Marc, 2026-10-20: « I don't like when the layout changes after a loading »).
//
// Two things are held here, on every page and every card a reader opens, at a phone's width and a desktop's, on a CPU slowed like CI's runner:
//   1. THE LAYOUT DOES NOT JUMP. The layout shift (the browser's own measure, CLS: what moved, by how much of the screen, not counting the half second after a
//      tap) stays within the scenario's budget below. A placeholder three bars tall for an answer a screen tall scored 0.55 on Résultats; shaped ones, 0.02.
//   2. A PLACEHOLDER NEVER POSES AS CONTENT. Every class an e2e spec selects on is something a reader of the page looks for. An element wearing one must not be a
//      placeholder (inside a `[data-placeholder]`) nor hold nothing but placeholders: specs read the ghost for the answer three times on the day these waits
//      were shaped (« retraite à » with no age, five ghost rows counted as five real ones, a ghost card's inert « Détails » clicked). A placeholder takes a
//      `skeleton__*` class of its own and SHARES THE RULE (the real rule gains its selector), never the class.
//
// House rules for a guard: the extractor has a canary; ALLOWED says why for every entry; an entry no scenario hit is stale.

const SPEC_DIR = 'e2e'
const SELF = 'placeholders.spec.ts'

/** The classes a selector string names: `.verdict__age`, `#verdict .verdict__line`, `.bridge-card:not(.drip)` — not a sentence's full stop, not a file's extension. */
function classesIn(source: string): Set<string> {
  const found = new Set<string>()
  for (const [, str] of source.matchAll(/['"`]([^'"`\n]{1,200})['"`]/g)) {
    // a path or an address is not a selector (« profile.v25.json », « /resultats?x=1 »)
    if (/^[\w./?=&-]+$/.test(str) && str.includes('/')) continue
    // a class starts the selector, follows a combinator or a closing bracket, or follows a tag (`button.chip`) — not a word (« marc.portal »)
    for (const [, cls] of str.matchAll(/(?:^|[\s>+~,(:)\]]|\b(?:a|button|div|p|span|li|ul|ol|section|details|summary|h[1-6]|input|label|nav|table|tr|td|th|svg|output|strong|figure|dl|dd|dt))\.([a-zA-Z][\w-]*)/g)) found.add(cls)
  }
  return found
}

/** Every class the e2e specs select on (this file's own selectors excepted). */
function huntedClasses(): string[] {
  const all = new Set<string>()
  for (const f of readdirSync(SPEC_DIR).filter((n) => n.endsWith('.ts') && n !== SELF)) for (const c of classesIn(readFileSync(`${SPEC_DIR}/${f}`, 'utf8'))) all.add(c)
  // the placeholders' own classes are what a spec waits on to know the answer is NOT in yet (`.skeleton--verdict`): looking for them is the point
  return [...all].filter((c) => !c.startsWith('skeleton'))
}

// Where a hunted class may sit in a placeholder, and why. Keyed by class; an entry no scenario meets fails as stale.
const ALLOWED: Record<string, string> = {
  'sr-only':
    'the one « Chargement… » a wait says to assistive technology (SkeletonStatus) rides inside it; a spec that reads an .sr-only element reads a hidden heading or label, which a wait never has',
  '@ghost':
    'Rentes waits as its own components drawn inert (BridgePanel, SkeletonGhost) — the exact size of a surface too intricate to sketch. An inert, aria-hidden subtree has no roles: specs reach the real cards, tabs and « Détails » by role and name (bridge.spec, results-on-screen.spec), never by a class alone',
}

/** The budgets: the layout shift each scenario may cause, measured on 2026-10-20 (4× slowed CPU). They only fall. */
const BUDGET: Record<string, number> = {}
const DEFAULT_BUDGET = 0.05

type Scenario = { name: string; path: string; open?: string; move?: boolean }
const PAGES: Scenario[] = [
  { name: 'Accueil', path: '/' },
  { name: 'Profil', path: '/profil' },
  { name: 'Hypothèses', path: '/hypotheses' },
  { name: 'Résultats', path: '/resultats' },
  { name: 'Résultats — Détail', path: '/resultats?metric=detail' },
  { name: 'Résultats — Preuve', path: '/resultats?bloc=tout' },
  { name: 'Décider', path: '/decider' },
  { name: 'Ma fiche', path: '/fiche' },
  { name: 'Glossaire', path: '/glossaire' },
]
// The cards a reader opens, each from a page where every card is shut: what their wait does once the tap has landed.
const CARDS: Scenario[] = [
  ...['viser', 'epargner', 'depenser', 'soins', 'rentes', 'ordre', 'fonte', 'equilibre'].map((id) => ({ name: `Décider › ${id}`, path: '/decider?essai=none&strat=none&leviers=none', open: id })),
  ...['verdict', 'comparer', 'annee', 'solidite', 'donnees-calcul', 'tableau', 'precision', 'parametres'].map((id) => ({ name: `Résultats › ${id}`, path: '/resultats?cartes=none&bloc=none', open: id })),
  // …and a figure moved in one: the card's first slider, two steps — the answer is asked again while the last one stays on screen
  ...['viser', 'epargner', 'depenser', 'soins'].map((id) => ({ name: `Décider › ${id} › slider moved`, path: '/decider?essai=none&strat=none&leviers=none', open: id, move: true })),
]

/** Watches the page from its first byte: the layout shifts, and every moment a hunted class wears a placeholder. */
async function watch(page: Page, hunted: string[]): Promise<void> {
  await page.addInitScript((classes: string[]) => {
    const w = window as unknown as { __cls: number; __hits: Record<string, string>; __moved: string[] }
    w.__cls = 0
    w.__moved = []
    w.__hits = {}
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources: { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }[]) {
        if (e.hadRecentInput) continue
        w.__cls += e.value
        // what moved, for a failure to name (the largest few)
        if (e.value >= 0.005)
          for (const src of e.sources.slice(0, 2)) {
            const el = src.node instanceof Element ? src.node : (src.node?.parentElement ?? null)
            const at = el?.closest('[id]')
            w.__moved.push(`${e.value.toFixed(3)} ${at ? '#' + at.id + ' ' : ''}${el?.tagName.toLowerCase() ?? '?'}.${typeof el?.className === 'string' ? el.className.split(' ')[0] : ''} dy=${Math.round(src.currentRect.y - src.previousRect.y)} dh=${Math.round(src.currentRect.height - src.previousRect.height)}`)
          }
      }
    }).observe({ type: 'layout-shift', buffered: true })
    const selector = classes.map((c) => '.' + CSS.escape(c)).join(',')
    const where = (el: Element) => {
      const card = el.closest('[id]')
      return card ? '#' + card.id : el.tagName.toLowerCase()
    }
    // the words of an element that are not a placeholder's (ghost words are drawn by CSS and have no text at all)
    const ownText = (el: Element): string => {
      let s = ''
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) if (!n.parentElement?.closest('[data-placeholder]') && !n.parentElement?.closest('.sr-only')) s += n.nodeValue ?? ''
      return s.trim()
    }
    let queued = false
    const scan = () => {
      queued = false
      if (!document.querySelector('[data-placeholder]')) return
      for (const el of document.querySelectorAll(selector)) {
        // a ghost of real components (SkeletonGhost) wears their classes by design: one entry for all of it
        if (el.closest('.skeleton__ghost-tree')) {
          w.__hits['@ghost'] ??= `a ghost of real components (${where(el)})`
          continue
        }
        const inside = el.closest('[data-placeholder]') !== null
        const onlyPlaceholders = !inside && el.querySelector('[data-placeholder]') !== null && ownText(el) === ''
        if (!inside && !onlyPlaceholders) continue
        for (const c of el.classList) if (classes.includes(c)) w.__hits[c] ??= `${inside ? 'inside a placeholder' : 'holding only placeholders'} (${where(el)})`
      }
    }
    const later = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(scan)
    }
    const start = () => new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    if (document.documentElement) start()
    else document.addEventListener('DOMContentLoaded', start)
  }, hunted)
}

/** Until no placeholder has been on the page for a moment (or a long while has passed): the page has landed. */
async function settled(page: Page): Promise<void> {
  const start = Date.now()
  let quietSince = 0
  while (Date.now() - start < 25_000) {
    const waiting = await page.evaluate(() => document.querySelector('[data-placeholder], .loading, [aria-busy="true"]') !== null)
    if (waiting) quietSince = 0
    else if (quietSince === 0) quietSince = Date.now()
    else if (Date.now() - quietSince > 1500) return
    await page.waitForTimeout(150)
  }
}

test('the class extractor finds what a selector names, and nothing in a sentence (canary)', () => {
  const fixture = `
    page.locator('.verdict__age').first()
    page.locator('#verdict .verdict__line')
    page.locator('.install-card:not(.drip)')
    page.locator(\`.bridge-card\`, { has: page.getByRole('radio') })
    page.locator('button.chip')
    expect(page.getByText('Rentes et dépenses.')).toBeVisible()
    expect(page.getByText('Bâti par marc.portal')).toBeVisible()
    await page.goto('/resultats?metric=detail')
    readFileSync('src/lib/fixtures/profile.v25.json')
  `
  expect([...classesIn(fixture)].sort()).toEqual(['bridge-card', 'chip', 'drip', 'install-card', 'verdict__age', 'verdict__line'])
})

for (const size of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]) {
  test(`${size.name}: no page or card jumps past its budget once it has loaded, and no placeholder wears a class a spec looks for`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const hunted = huntedClasses()
    expect(hunted.length, 'the specs name classes (an empty walk proves nothing)').toBeGreaterThan(100)
    const scenarios = size.name === 'phone' ? [...PAGES, ...CARDS] : PAGES
    const over: string[] = []
    const hits = new Map<string, string>()
    for (const s of scenarios) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: size.width, height: size.height }, locale: 'fr-CA', timezoneId: 'America/Toronto', storageState: { cookies: [], origins: [{ origin: 'http://127.0.0.1:5173', localStorage: [{ name: 'horizon-first-answer', value: 'done' }] }] } })
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      // 4× by default (a phone, here); PLACEHOLDER_THROTTLE=16 is CI's runner, itself about 4× slower than a dev machine, slowed 4× again
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.PLACEHOLDER_THROTTLE) || 4 })
      await watch(page, hunted)
      await seedProfile(page, EXAMPLE)
      await page.goto(s.path)
      await settled(page)
      if (s.open) {
        // The shift that counts is what the card's WAIT does once it is open — not the opening itself: on a 4× slowed CPU still busy with the page's own searches, the
        // tap's re-render can land after the half second the browser excuses, and the page below the card moving down as it opens is the opening, not a jump.
        await page.locator(`#${s.open} .accordion__toggle`).first().click()
        await expect(page.locator(`#${s.open}`)).toHaveClass(/is-open/, { timeout: 15_000 })
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
        await page.evaluate(() => void ((window as unknown as { __cls: number; __moved: string[] }).__cls = 0, ((window as unknown as { __moved: string[] }).__moved = [])))
        await page.waitForTimeout(600)
        await settled(page)
      }
      if (s.move) {
        await page.evaluate(() => void ((window as unknown as { __cls: number; __moved: string[] }).__cls = 0, ((window as unknown as { __moved: string[] }).__moved = [])))
        const slider = page.locator(`#${s.open}`).getByRole('slider').first()
        await slider.focus()
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(600)
        await settled(page)
      }
      const { cls, found, moved } = await page.evaluate(() => {
        const w = window as unknown as { __cls: number; __hits: Record<string, string>; __moved: string[] }
        return { cls: w.__cls, found: w.__hits, moved: w.__moved.slice(0, 6) }
      })
      const key = `${size.name} · ${s.name}`
      const budget = BUDGET[key] ?? DEFAULT_BUDGET
      console.log(`${key}: layout shift ${cls.toFixed(4)} (budget ${budget})`)
      if (cls > budget) over.push(`${key}: ${cls.toFixed(4)} > ${budget} — moved: ${moved.join(' | ')}`)
      for (const [c, why] of Object.entries(found)) if (!hits.has(c)) hits.set(c, `${key} — ${why}`)
      await context.close()
    }
    const wrong = [...hits].filter(([c]) => ALLOWED[c] === undefined).map(([c, at]) => `.${c} — ${at}`)
    expect(wrong, 'a placeholder wears a class a spec looks for: give it a skeleton__ class of its own and add that to the real rule (or say in ALLOWED why it may)').toEqual([])
    expect(over, 'the layout jumped past its budget after loading').toEqual([])
    if (size.name === 'phone') {
      const stale = Object.keys(ALLOWED).filter((c) => !hits.has(c))
      expect(stale, 'ALLOWED names a class no scenario met: remove it').toEqual([])
    }
  })
}
