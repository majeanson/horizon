import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile, showAllSections } from './seed'

// Accessibility, as a gate: axe-core runs over every page in the display states a reader can
// actually be in — day and night, normal and high contrast, and the largest text size. A
// planner read by people who may need large type and strong contrast is judged by exactly these
// states, so a colour pair that passes only in the default theme is a defect here, not an
// edge case.
//
// Rules: WCAG 2.0/2.1 A and AA, which is what « accessible » means in law and in practice.
// Best-practice rules are out of scope on purpose: they are advice, and a gate made of advice
// gets disabled.

// The reader who asked for no motion: the page's entrances (styles/motion.css) are off. They are transform and box-shadow only — never colour or opacity — so ink contrast
// reads the same with or without them, and on CI's 4× slower runner they cost the bank-import page the last 15 s of a 45 s test (2026-10-16).
test.use({ reducedMotion: 'reduce' })

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

interface State {
  name: string
  theme: 'day' | 'night'
  contrast?: 'high'
  scale?: 'x-large'
}

const STATES: State[] = [
  { name: 'day', theme: 'day' },
  { name: 'night', theme: 'night' },
  { name: 'day + high contrast', theme: 'day', contrast: 'high' },
  { name: 'night + high contrast', theme: 'night', contrast: 'high' },
  { name: 'day + largest text', theme: 'day', scale: 'x-large' },
  { name: 'night + largest text', theme: 'night', scale: 'x-large' },
]

async function setState(page: Page, s: State): Promise<void> {
  await page.addInitScript((st) => {
    localStorage.setItem('horizon-theme', st.theme)
    if (st.contrast) localStorage.setItem('horizon-contrast', st.contrast)
    if (st.scale) localStorage.setItem('horizon-text-scale', st.scale)
  }, s)
}

async function violations(page: Page): Promise<string[]> {
  // WHY this waits (a one-off contrast failure on the results page at night that never reproduced in 50 reruns): the
  // test opens every disclosure, which starts the bridge / deferral workers, and the bridge panel used to be DIMMED (opacity .6) while
  // a result was on its way — text at 60 % opacity fails 4.5:1 whenever axe happened to read it before the worker answered. That dimming
  // is gone (a status line replaces it, at full contrast); the two waits below keep the read deterministic: no panel still busy, and
  // no colour mid-transition (neither the day nor the night palette).
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 })
  // Bounded: on CI's slow runner this await once ran the whole 45 s test timeout on the bank-import page (2026-10-16) — the page's own entrances (styles/motion.css) are
  // 0.4 s of transform and box-shadow, never colour or opacity, so a reading taken a few seconds in sees no mid-fade ink; waiting for ever proves nothing more.
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 5000))]))
  // Opening every note scrolls the page to wherever the last button was; the pinned rows (the answer strip, a section map) then sit over whatever is there, and a target-size reading depends on that
  // accident. Read the page from the top, where every pinned row is in its own place.
  await page.evaluate(() => document.getElementById('root')?.scrollTo({ top: 0 }))
  await page.waitForTimeout(150)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`,
  )
}

// Every route, in every display state, with the example household loaded — and with EVERY ⓘ note open,
// because the colours that matter most (a note on its tinted ground, a table row marked short) only
// exist once something is opened. Nothing else hides: the pages show everything by themselves.
const PAGES = [
  ['the front door', '/', '.page-head__title'],
  ['the profile', '/profil', '.page-head__title'],
  ['the assumptions', '/hypotheses', '.page-head__title'],
  ['the results', '/resultats', '.page-head__title'],
  ['the data page', '/donnees', '.page-head__title'],
  ['the glossary', '/glossaire', '.page-head__title'],
  ['the documents to gather', '/documents', '.page-head__title'],
  ['the entry by document', '/saisie?etape=bank', '.page-head__title'],
  ['the component gallery', '/dev/kit', '.devkit'],
  ['the try view of the results', '/decider', '.page-head__title'],
  ['the check view of the results', '/resultats?v=verify', '.page-head__title'],
  ['the detail chart of the results', '/resultats?metric=detail', '.page-head__title'],
  ['the proof view of the results', '/resultats?v=proof', '.page-head__title'],
] as const

for (const s of STATES) {
  for (const [label, path, ready] of PAGES) {
    test(`${label} has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
      await setState(page, s)
      await seedProfile(page, EXAMPLE)
      await page.goto(path)
      await page.locator(ready).waitFor()
      // every ⓘ a reader can reach — one inside a closed fold is not on the page until the fold is opened
      for (const b of await page.locator('.info-btn').all()) if (await b.isVisible()) await b.click()
      // A computed figure's note (Figure) on its tinted ground: open the first one the page holds (only the proof view has any).
      const figure = page.locator('button.figure').first()
      if ((await figure.count()) > 0) await figure.click()
      expect(await violations(page)).toEqual([])
    })
  }
}

// A dated event that is still an ESTIMATE (schema v23): the « estimé » word beside its figure, the way to confirm it, and — opened — what it rests on and its source link.
// Nothing on the page holds one until the household has added one, so the specimen is a household that has added three: a statistic, a rule and a plain starting point.
for (const s of STATES) {
  test(`the profile with its estimated events open has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
    const home = { value: 650000, mortgage: { balance: 266000, rate: 0.05, monthlyPayment: 1761.11 }, sale: null }
    const flow = (id: string, label: string, amount: number) => ({ label, kind: 'expense', amount, fromYear: 2027, toYear: 2060, owner: 'self', taxable: false, estimate: id })
    const profile = structuredClone(EXAMPLE) as typeof EXAMPLE & { household: { home: unknown; flows: unknown[] } }
    profile.household.home = home
    profile.household.flows = [flow('upkeep', 'Entretien et réparations de la maison', 1667), flow('renovation', 'Réserve de rénovations', 4800), flow('project', 'Un projet', 10000)]
    await setState(page, s)
    await seedProfile(page, profile)
    await showAllSections(page)
    await page.goto('/profil?bloc=tout&form=1')
    await page.locator('.page-head__title').waitFor()
    await expect(page.locator('.flow__estimate')).toHaveCount(3)
    for (const fold of await page.locator('.flow__estimate details').all()) await fold.locator('summary').click()
    expect(await violations(page)).toEqual([])
  })
}

// « Importer un relevé de banque » opened with a statement read: the file picker, the paste box, the ticked and unticked category chips and the total.
for (const s of STATES) {
  test(`the bank import, opened with a statement read, has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
    await setState(page, s)
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil?bloc=tout&form=1')
    await page.locator('.page-head__title').waitFor()
    const fold = page.locator('details.fold', { hasText: 'Importer un relevé de banque' })
    await fold.locator('summary').click()
    const csv = ['Date;Description;Catégorie;Montant', '2025-01-28;IGA;Épicerie;-500,00', '2025-01-28;Virement;Transfert;-2 000,00', '2025-02-28;IGA;Épicerie;-500,00'].join('\n')
    await fold.getByRole('textbox', { name: 'Opérations copiées du relevé' }).fill(csv)
    await expect(fold.getByRole('status')).toContainText('opérations lues')
    expect(await violations(page)).toEqual([])
  })
}

// « Vérifier avec mes relevés » opened with a net pay and a deposit typed: the two lines it says and the warning under an account worth far less than it received.
for (const s of STATES) {
  test(`the checks against my statements, opened with figures typed, have no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
    await setState(page, s)
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil?bloc=tout&form=1')
    await page.locator('.page-head__title').waitFor()
    const fold = page.locator('#person-self').locator('details.fold', { hasText: 'Vérifier avec mes relevés' })
    await fold.locator('summary').click()
    for (const [name, value] of [['Paie nette reçue par année', '10000'], ['Total déposé (CELI)', '300000']] as const) {
      const box = fold.getByRole('textbox', { name })
      await box.fill(value)
      await box.press('Enter')
    }
    await expect(fold.getByRole('status').filter({ hasText: 'nettement moins' })).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}

// The household sheet, in every display state: day, night, high contrast and the largest text.
for (const s of STATES) {
  test(`the household sheet has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
    await setState(page, s)
    await seedProfile(page, EXAMPLE)
    await page.goto('/fiche?bloc=tout')
    await page.locator('.sheet--serious').waitFor({ timeout: 30_000 })
    await page.waitForFunction(() => !(document.querySelector('.sheet')?.textContent ?? '').match(/Calcul en cours/), null, { timeout: 30_000 })
    expect(await violations(page)).toEqual([])
  })
}

test('the gallery stays accessible with its dialog open', async ({ page }) => {
  await page.goto('/dev/kit')
  await page.getByRole('button', { name: 'Ouvrir le dialogue' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test('the whole shell is reachable by keyboard, in a sensible order', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil?bloc=tout')
  await page.locator('.shell__answer-link').waitFor({ timeout: 30_000 }) // the answer in the bar lands a moment after the page (a lazy chunk, a worker)
  const order: string[] = []
  for (let i = 0; i < 11; i++) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim().slice(0, 24) ?? ''))
  }
  // The skip link first — the whole point of one — then the top bar (the name, the answer's age, the sheet, the glossary, the settings gear), then the four destinations.
  // (The language and theme buttons left the bar for the settings page; the answer pill took their place, components/BarAnswer.tsx.)
  expect(order.slice(0, 2)).toEqual(['Aller au contenu', 'Horizon'])
  expect(order[2]).toMatch(/^Votre réponseRetraite\d+/) // the label, the short label (hidden on a narrow phone) and the age: spans with no space between their texts (cut at 24 characters)
  expect(order.slice(3, 6)).toEqual(['Fiche', 'Glossaire', 'Réglages'])
  expect(order.slice(6, 10)).toEqual(['Profil', 'Résultats', 'Décider', 'Hypothèses'])
})

// The page's outline is part of its accessibility tree (heading navigation in a screen reader, and the
// text a browsing agent reads): every titled section holds a heading, and the h1 is alone.
for (const [label, path, ready] of PAGES.slice(0, 5)) {
  test(`${label} has an outline: one h1, a heading in every titled section`, async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    await page.locator(ready).waitFor()
    await expect(page.locator('h1')).toHaveCount(1)
    const bare = await page.evaluate(() =>
      [...document.querySelectorAll('main section.profile-section[aria-label]')].filter((s) => !s.querySelector('h2, h3')).map((s) => s.getAttribute('aria-label')),
    )
    expect(bare).toEqual([])
  })
}
