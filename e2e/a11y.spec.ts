import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// Accessibility, as a gate: axe-core runs over every page in the display states a reader can
// actually be in — day and night, normal and high contrast, and the largest text size. A
// planner read by people who may need large type and strong contrast is judged by exactly these
// states, so a colour pair that passes only in the default theme is a defect here, not an
// edge case.
//
// Rules: WCAG 2.0/2.1 A and AA, which is what « accessible » means in law and in practice.
// Best-practice rules are out of scope on purpose: they are advice, and a gate made of advice
// gets disabled.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

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
  await page.evaluate(() => Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))))
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`,
  )
}

// Every route, in every display state, with the example household loaded — and with EVERY ⓘ note and EVERY
// disclosure open, because the colours that matter most (a note on its tinted ground, a table row marked short)
// only exist once something is opened.
const PAGES = [
  ['the profile (me)', '/', '.page-head__title'],
  ['the profile (spouse)', '/?person=spouse', '.page-head__title'],
  ['the assumptions', '/hypotheses', '.page-head__title'],
  ['the results', '/resultats', '.page-head__title'],
  ['the data page', '/donnees', '.page-head__title'],
  ['the component gallery', '/dev/kit', '.devkit'],
] as const

for (const s of STATES) {
  for (const [label, path, ready] of PAGES) {
    test(`${label} has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
      await setState(page, s)
      await seedProfile(page, EXAMPLE)
      await page.goto(path)
      await page.locator(ready).waitFor()
      for (const b of await page.locator('.info-btn').all()) await b.click()
      for (const d of await page.locator('.disclosure__summary').all()) await d.click()
      expect(await violations(page)).toEqual([])
    })
  }
}

test('the gallery stays accessible with its dialog open', async ({ page }) => {
  await page.goto('/dev/kit')
  await page.getByRole('button', { name: 'Ouvrir le dialogue' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test('the whole shell is reachable by keyboard, in a sensible order', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  const order: string[] = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    order.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim().slice(0, 24) ?? ''))
  }
  // The top bar first (name, language, theme), then the four destinations.
  expect(order.slice(0, 3)).toEqual(['Horizon', 'EN', ''])
  expect(order.slice(3, 7)).toEqual(['Profil', 'Hypothèses', 'Résultats', 'Données'])
})
