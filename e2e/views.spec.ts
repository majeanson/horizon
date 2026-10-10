import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// Résultats is five views of one plan — Réponse · Ajuster · Stratégies · Avenir · Vérifier — and its map of sections shows every chip whole.

test.beforeEach(async ({ page }) => seedProfile(page))

test('five views; « Ajuster » holds the levers, the saving and the spending, and keeps its place in the address', async ({ page }) => {
  await page.goto('/resultats')
  const tabs = page.getByRole('tablist', { name: 'Vues des résultats' })
  await expect(tabs.getByRole('tab')).toHaveText(['Réponse', 'Ajuster', 'Stratégies', 'Avenir', 'Vérifier'])
  await expect(page.locator('#ajuster')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Ajuster' }).click()
  await expect(page).toHaveURL(/v=adjust/)
  await expect(page.getByText('Ce qui change le plus')).toBeVisible()
  await expect(page.locator('#epargner')).toBeVisible()
  await expect(page.locator('#depenser')).toBeVisible()
  await tabs.getByRole('tab', { name: 'Réponse' }).click()
  await expect(page).not.toHaveURL(/v=/)
})

test('on the answer, the comparison and its chart come before « Préciser le calcul »', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.locator('#preciser')).toBeVisible({ timeout: 30_000 })
  const compare = (await page.locator('#comparer').boundingBox())!
  const refine = (await page.locator('#preciser').boundingBox())!
  expect(compare.y).toBeLessThan(refine.y)
})

test('« Comment lire cette page ? » is closed until it is asked for, then says what each part is for', async ({ page }) => {
  await page.goto('/resultats')
  const open = page.getByRole('button', { name: 'Comment lire cette page ?' })
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toHaveCount(0)
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toBeVisible()
  await expect(page.getByText('ce que vous avez dans vos REER, CELI et comptes non enregistrés')).toBeVisible()
  await open.click()
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toHaveCount(0)
})

test('on a phone the map of sections wraps: every chip is whole and inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=verify')
  const chips = page.locator('.section-nav .chip')
  await expect(chips).toHaveCount(5)
  for (let i = 0; i < 5; i++) {
    const box = (await chips.nth(i).boundingBox())!
    expect(box.x, `chip ${i} left`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `chip ${i} right`).toBeLessThanOrEqual(360)
    // not clipped: the text is not wider than the chip that holds it
    expect(await chips.nth(i).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `chip ${i} text fits`).toBe(true)
  }
})
