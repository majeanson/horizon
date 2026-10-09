import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile, type SeedProfile } from './seed'

// Over the year-by-year table, a plan that runs out of money says WHEN, in words — the red rows alone were a wall of colour.

test('a plan that falls short says when the money runs out and what the red rows are', async ({ page }) => {
  const p = structuredClone(EXAMPLE) as SeedProfile & { household: { spending: { retiredToday: number } } }
  p.household.spending.retiredToday = 400_000
  await seedProfile(page, p)
  await page.goto('/resultats?v=verify')
  const line = page.locator('.year-table__short')
  await expect(line).toBeVisible({ timeout: 60_000 })
  await expect(line).toContainText(/L’argent manque dès 20\d\d \(\d\d \/ \d\d ans\)/)
  await expect(line).toContainText('les lignes en rouge sont les années où les dépenses ne sont pas couvertes')
  // the year it names is the first red row
  const year = (await line.textContent())!.match(/dès (20\d\d)/)![1]
  await expect(page.locator('.year-table tr.is-short').first()).toContainText(year)
})

test('a plan that lasts has nothing to explain', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats?v=verify')
  await expect(page.locator('.year-table').first()).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.year-table__short')).toHaveCount(0)
})
