import { expect, test, type Locator } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE PHONE: hit areas a thumb can find, and height not spent twice. (src/styles/phone.css)

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.setViewportSize({ width: 390, height: 844 })
})

/** Is the thing under a point the element (or inside it)? The hit area of a link is what answers, not its look. */
async function hitsAt(link: Locator, dx: number, dy: number): Promise<boolean> {
  const box = (await link.first().boundingBox())!
  return link.first().evaluate(
    (target, p) => {
      const hit = document.elementFromPoint(p.x, p.y)
      return hit !== null && (hit === target || target.contains(hit))
    },
    { x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy },
  )
}

test('the answer bar’s « Voir », the brand and a sigle in a hint can be tapped from 20 px above and below their text', async ({ page }) => {
  await page.goto('/profil')
  await page.locator('.live-answer__see').waitFor()
  // (the answer bar sits right under the sticky top bar, which is on top of the strip above it: « Voir » is checked below and to the sides)
  const bar = page.locator('.live-answer__see')
  expect(await hitsAt(bar, 0, 0), 'Voir centre').toBe(true)
  expect(await hitsAt(bar, 0, 20), 'Voir 20 px below').toBe(true)
  expect(await hitsAt(bar, -22, 0), 'Voir 22 px to the left').toBe(true)
  expect(await hitsAt(bar, 22, 0), 'Voir 22 px to the right').toBe(true)
  for (const selector of ['.shell__brand', 'main a.gloss:visible']) {
    const link = page.locator(selector)
    await link.first().scrollIntoViewIfNeeded()
    expect(await hitsAt(link, 0, 0), `${selector} centre`).toBe(true)
    expect(await hitsAt(link, 0, 20), `${selector} 20 px below`).toBe(true)
    expect(await hitsAt(link, 0, -20), `${selector} 20 px above`).toBe(true)
  }
})

test('a larger hit area is not a larger look: the link keeps its size', async ({ page }) => {
  await page.goto('/profil')
  const see = (await page.locator('.live-answer__see').boundingBox())!
  expect(see.height, '« Voir » still reads as a line of text').toBeLessThan(30)
  const gloss = (await page.locator('main a.gloss:visible').first().boundingBox())!
  expect(gloss.height).toBeLessThan(30)
})

test('Résultats on a phone gives the answer the height of its own title: the heading stays for a screen reader and for paper', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 30_000 })
  const top = (await page.locator('#verdict').boundingBox())!.y
  expect(top, 'the answer card starts in the top quarter of the screen').toBeLessThan(844 * 0.27)
  // still there for assistive technology
  await expect(page.getByRole('heading', { level: 1, name: 'Résultats' })).toHaveCount(1)
  expect((await page.locator('.results-page > .page-head').boundingBox())!.height).toBeLessThanOrEqual(2)
  // on paper the title is back
  await page.emulateMedia({ media: 'print' })
  expect((await page.locator('.results-page > .page-head').boundingBox())!.height).toBeGreaterThan(10)
})

test('a wide screen keeps the title of Résultats where it was', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 30_000 })
  expect((await page.locator('.results-page > .page-head').boundingBox())!.height).toBeGreaterThan(20)
})

test('Profil: the two door links under the title are one line that scrolls, not two stacked pills', async ({ page }) => {
  await page.goto('/profil')
  const chips = page.locator('.rail .chip', { hasText: /Documents à rassembler|Saisie par document/ })
  await expect(chips).toHaveCount(2)
  const tops = await chips.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(2)
})
