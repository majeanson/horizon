import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile, type SeedProfile } from './seed'

// « Mes plans, côte à côte » — kept plans put through the same calculation as the answer, on the results page.

test('a kept plan shows beside the current one, with how far apart they are; with none kept the block is absent', async ({ page }) => {
  const plan = structuredClone(EXAMPLE) as SeedProfile & { household: { spending: { retiredToday: number } }; plans: unknown[] }
  plan.plans = []
  plan.household.spending.retiredToday = 140000
  const profile = { ...structuredClone(EXAMPLE), plans: [{ name: 'Dépenses plus hautes', profile: plan }] }
  await seedProfile(page, profile)
  await page.goto('/resultats')
  await expect(page.getByText('Mes plans, côte à côte')).toBeVisible({ timeout: 60_000 })
  // The block shows at once; its rows come last (the page queues its heavy searches behind the earlier ones), so on a slow runner they take a while.
  await expect(page.locator('.levers__item strong', { hasText: /^Plan actuel$/ })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Dépenses plus hautes', { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/plus tard que le plan actuel/)).toBeVisible({ timeout: 60_000 })
})

test('no kept plan, no block', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Mes plans, côte à côte')).toHaveCount(0)
})
