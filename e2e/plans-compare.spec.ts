import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, seedProfile, type SeedProfile } from './seed'

// « Mes plans, côte à côte » — kept plans put through the same calculation as the answer, on the results page.

test('a kept plan shows beside the current one, with how far apart they are; with none kept the block is absent', async ({ page }) => {
  const plan = structuredClone(EXAMPLE) as SeedProfile & { household: { spending: { retiredToday: number } }; plans: unknown[] }
  plan.plans = []
  plan.household.spending.retiredToday = 140000
  const profile = { ...structuredClone(EXAMPLE), plans: [{ name: 'Dépenses plus hautes', profile: plan }] }
  await seedProfile(page, profile)
  await page.goto('/resultats?cartes=all')
  // a kept plan makes « Mes plans » a way of comparing, one tab beside the departure ages
  await page.getByRole('tab', { name: 'Mes plans' }).click()
  await expect(page).toHaveURL(/cv=plans/)
  await expect(page.getByText('Mes plans, côte à côte')).toBeVisible({ timeout: 60_000 })
  // The block shows at once; its rows come last (the page queues its heavy searches behind the earlier ones), so on a slow runner they take a while.
  await expect(page.locator('.levers__item strong', { hasText: /^Plan actuel$/ })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Dépenses plus hautes', { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/plus tard que le plan actuel/)).toBeVisible({ timeout: 60_000 })
})

test('no kept plan, no block', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats?cartes=all')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Mes plans, côte à côte')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Mes plans' })).toHaveCount(0)
  // an address that names a way of comparing the household does not have falls back to the departure ages
  await page.goto('/resultats?cartes=all&cv=plans')
  await expect(page.locator('.scenarios')).toBeVisible({ timeout: 60_000 })
})

test('on a phone, three ways of comparing (ages, each of us, my plans) fit the screen: the tab row scrolls inside its own box', async ({ page }) => {
  const plan = structuredClone(EXAMPLE) as SeedProfile & { plans: unknown[] }
  plan.plans = []
  await seedProfile(page, { ...structuredClone(EXAMPLE), plans: [{ name: 'Un autre plan', profile: plan }] })
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?cartes=all')
  const ways = page.getByRole('tablist', { name: 'Façons de comparer' })
  await expect(ways.getByRole('tab')).toHaveText(['Âges de départ', 'Chacun de son côté', 'Mes plans'])
  await expectNoHorizontalOverflow(page, page.locator('.results-page'))
})
