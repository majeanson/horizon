import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { seedProfile } from './seed'

// « LE COÛT D'UN DOLLAR DE PLUS, PAR ÂGE » — what the next RRSP dollar costs at every retired age, as a calendar of ages ten to a row, under the year-by-year table on « Preuve ». A closed
// fold; opened, a grid whose cells say a percentage in words, with the lowest and the highest named.

test.beforeEach(async ({ page }) => seedProfile(page))

test('closed, nothing is drawn; opened, a calendar of ages with the lowest and the highest named in words', async ({ page }) => {
  await page.goto('/resultats?v=proof&bloc=tableau')
  const fold = page.locator('.marginal-weather')
  await expect(fold).toBeVisible({ timeout: 60_000 })
  await expect(fold.locator('.heat')).toHaveCount(0)
  await fold.locator('summary').click()
  const grid = fold.locator('.heat')
  await expect(grid).toBeVisible()
  await expect(grid.locator('thead th')).toHaveCount(11)
  await expect(grid.locator('tbody th').first()).toHaveText(/\d0 à \d9 ans/)
  const filled = (await grid.locator('tbody td').allTextContents()).filter((t) => /\d\s*%/.test(t))
  expect(filled.length).toBeGreaterThan(10)
  await expect(fold.getByText('Le taux additionne l’impôt')).toBeVisible()
  await expect(fold.getByText(/Le plus bas —|Le taux ne bouge presque pas/)).toBeVisible()
})

test('in English the fold speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?v=proof&bloc=tableau')
  const fold = page.locator('.marginal-weather')
  await expect(fold.locator('summary')).toHaveText('What one more dollar costs, by age', { timeout: 60_000 })
  await fold.locator('summary').click()
  await expect(fold.getByText('The rate adds income tax')).toBeVisible()
})

test('on a phone the calendar of ages scrolls inside its own box and the page does not run off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=proof&bloc=tableau')
  await page.locator('.marginal-weather summary').click()
  await expect(page.locator('.marginal-weather .heat')).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page)
})
