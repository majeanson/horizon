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

test('the answer in the bar, the brand and a sigle in a hint can be tapped from 20 px above and below their text', async ({ page }) => {
  await page.goto('/profil?bloc=tout') // every block open: a sigle sits in a hint of the first one that has one
  await page.locator('.shell__answer-link').waitFor()
  for (const selector of ['.shell__answer-link', '.shell__brand', 'main a.gloss:visible']) {
    const link = page.locator(selector)
    await link.first().scrollIntoViewIfNeeded()
    expect(await hitsAt(link, 0, 0), `${selector} centre`).toBe(true)
    expect(await hitsAt(link, 0, 20), `${selector} 20 px below`).toBe(true)
    expect(await hitsAt(link, 0, -20), `${selector} 20 px above`).toBe(true)
  }
})

test('a larger hit area is not a larger look: the link keeps its size', async ({ page }) => {
  await page.goto('/profil?bloc=tout') // every block open: a sigle sits in a hint of the first one that has one
  const gloss = (await page.locator('main a.gloss:visible').first().boundingBox())!
  expect(gloss.height).toBeLessThan(30)
})

test('Résultats on a phone gives the answer the height of its own title: the heading stays for a screen reader and for paper', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 30_000 })
  // Polled, not read once: the card rises into place over the first half-second (styles/motion.css), and at its first frame it sits 0.6 rem lower than it will.
  await expect.poll(async () => (await page.locator('#verdict').boundingBox())?.y ?? Infinity, { message: 'the answer card starts in the top quarter of the screen' }).toBeLessThan(844 * 0.27)
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

test('Profil: the two ways to fill it are ONE switch under the title, on one line, not two stacked pills', async ({ page }) => {
  await page.goto('/profil?bloc=tout') // every block open: a sigle sits in a hint of the first one that has one
  const tabs = page.getByRole('tablist', { name: 'Façon de remplir le profil' }).getByRole('tab')
  await expect(tabs).toHaveText(['Par sujet', 'Par document'])
  const tops = await tabs.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(2)
})
