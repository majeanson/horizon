import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The content Phase 16 added only exists once something is OPENED — a fold, a dialog — so the page-level axe run (a11y.spec.ts) never saw it. Here each is opened and read in the six display
// states a reader can be in. The heat grids carry the weight: a wash under a figure, a hatch for a cell that fails, a mark under the best — every pair of colours must hold 4.5 : 1.

test.use({ reducedMotion: 'reduce' })

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const STATES = [
  { name: 'day', theme: 'day' },
  { name: 'night', theme: 'night' },
  { name: 'day + high contrast', theme: 'day', contrast: 'high' },
  { name: 'night + high contrast', theme: 'night', contrast: 'high' },
  { name: 'day + largest text', theme: 'day', scale: 'x-large' },
  { name: 'night + largest text', theme: 'night', scale: 'x-large' },
] as const

const read = async (page: Page): Promise<string[]> => {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 })
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 5000))]))
  await page.evaluate(() => document.getElementById('root')?.scrollTo({ top: 0 }))
  await page.waitForTimeout(150)
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`)
}

const OPENED: [string, string, (page: Page) => Promise<void>][] = [
  [
    'stop at an age, and who starts first',
    '/resultats?v=decide&essai=target&age=55&strat=rentes',
    async (page) => {
      await expect(page.locator('#viser .reverse__levers').first().locator('li')).toHaveCount(5, { timeout: 90_000 })
      await expect(page.locator('#viser .reverse__wait li').first()).toBeVisible({ timeout: 90_000 })
      await page.locator('.spouse-timing summary').click()
      await expect(page.locator('.spouse-timing .heat tbody td')).toHaveCount(9, { timeout: 90_000 })
    },
  ],
  [
    'the weather of a dollar',
    '/resultats?v=proof&bloc=tableau',
    async (page) => {
      await page.locator('.marginal-weather summary').click()
      await expect(page.locator('.marginal-weather .heat')).toBeVisible({ timeout: 60_000 })
    },
  ],
  [
    'the markets year by year',
    '/resultats?v=proof&bloc=solidite',
    async (page) => {
      await page.locator('.market-fan summary').click()
      await expect(page.locator('.market-fan tbody tr')).toHaveCount(5, { timeout: 90_000 })
    },
  ],
  [
    'the dates of the plan',
    '/fiche',
    async (page) => {
      await page.locator('.plan-calendar-fold summary').click()
      await expect(page.locator('.plan-calendar__year').first()).toBeVisible({ timeout: 60_000 })
    },
  ],
  [
    'the print dialog',
    '/fiche',
    async (page) => {
      await page.getByRole('button', { name: /Imprimer…/ }).click()
      await expect(page.getByRole('dialog', { name: 'Imprimer' })).toBeVisible()
    },
  ],
]

for (const s of STATES) {
  for (const [label, path, open] of OPENED) {
    test(`${label} has no WCAG A/AA violations — ${s.name}`, async ({ page }) => {
      await page.addInitScript((st) => {
        localStorage.setItem('horizon-theme', st.theme)
        if ('contrast' in st) localStorage.setItem('horizon-contrast', st.contrast as string)
        if ('scale' in st) localStorage.setItem('horizon-text-scale', st.scale as string)
      }, s)
      await seedProfile(page, EXAMPLE)
      await page.goto(path)
      await open(page)
      expect(await read(page)).toEqual([])
    })
  }
}
