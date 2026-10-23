import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { seedProfile } from './seed'

// « LE COÛT D'UN DOLLAR DE PLUS, PAR ÂGE » — what the next RRSP dollar costs at every retired age, as one stacked bar per age, under the year-by-year table on « Preuve ». A closed
// fold; opened, two plain sentences, one real case in words, the chart, and the lowest and the highest named.

test.beforeEach(async ({ page }) => seedProfile(page))

test('closed, nothing is drawn; opened, a real case in words, a stacked chart by age, the lowest and the highest named', async ({ page }) => {
  await page.goto('/resultats?v=proof&bloc=tableau')
  const fold = page.locator('.marginal-weather')
  await expect(fold).toBeVisible({ timeout: 60_000 })
  await expect(fold.locator('.chart')).toHaveCount(0)
  await fold.locator('summary').click()
  await expect(fold.getByText('l’État en garde une part')).toBeVisible()
  await expect(fold.getByText(/Un exemple\s: à \d+ ans, retirer/)).toBeVisible()
  await expect(fold.locator('figure.chart')).toBeVisible({ timeout: 60_000 })
  await expect(fold.locator('.chart__legend-item')).toHaveCount(3)
  await expect(fold.getByText(/Le plus bas —|Le coût ne bouge presque pas/)).toBeVisible()
})

test('in English the fold speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?v=proof&bloc=tableau')
  const fold = page.locator('.marginal-weather')
  await expect(fold.locator('summary')).toHaveText('What one more dollar costs, by age', { timeout: 60_000 })
  await fold.locator('summary').click()
  await expect(fold.getByText('the government keeps a share')).toBeVisible()
})

test('on a phone the chart fits the screen and the page does not run off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=proof&bloc=tableau')
  await page.locator('.marginal-weather summary').click()
  await expect(page.locator('.marginal-weather figure.chart')).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page)
})
