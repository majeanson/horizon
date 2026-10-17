import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { seedProfile } from './seed'

// « LES MARCHÉS, ANNÉE PAR ANNÉE » — the plan drawn under five ways the returns could go, in the firmness block of « Preuve ». A closed fold; opened, a chart of five lines and a table that
// says the same in text: whether the money lasts, the lowest point, where it ends.

test.beforeEach(async ({ page }) => seedProfile(page))

test('closed, nothing runs; opened, five lines drawn and a table of the same five', async ({ page }) => {
  await page.goto('/resultats?v=proof&bloc=solidite')
  const fold = page.locator('.market-fan')
  await expect(fold).toBeVisible({ timeout: 60_000 })
  await expect(fold.locator('table')).toHaveCount(0)
  await fold.locator('summary').click()
  await expect(fold.locator('tbody tr')).toHaveCount(5, { timeout: 60_000 })
  await expect(fold.locator('figure.chart')).toBeVisible()
  await expect(fold.locator('tbody th').first()).toContainText('Rendements moyens')
  // every row says whether the money lasts, and where it ends in dollars
  for (const row of await fold.locator('tbody tr').all()) {
    await expect(row.locator('td').first()).toHaveText(/^(Oui|Non, il manque dès \d{4})$/)
    await expect(row.locator('td').nth(2)).toContainText('$')
  }
  await expect(fold.getByText('aucune ne porte de probabilité')).toBeVisible()
})

test('in English the fold speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?v=proof&bloc=solidite')
  const fold = page.locator('.market-fan')
  await expect(fold.locator('summary')).toHaveText('The markets, year by year', { timeout: 60_000 })
  await fold.locator('summary').click()
  await expect(fold.locator('tbody th').first()).toContainText('Average returns', { timeout: 60_000 })
  await expect(fold.locator('thead th').first()).toHaveText('Scenario')
})

test('on a phone the page does not run off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=proof&bloc=solidite')
  await page.locator('.market-fan summary').click()
  await expect(page.locator('.market-fan tbody tr')).toHaveCount(5, { timeout: 60_000 })
  await expectNoHorizontalOverflow(page)
})
