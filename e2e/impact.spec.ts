import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// « Les chiffres qui déplaceraient le plus la réponse » — the unconfirmed figures ranked by how far the answer moves, each with a
// door to its own field on Profil.

test('the results page ranks the unconfirmed figures, and each one opens its own field, lit, on Profil', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats')
  await expect(page.getByText('Les chiffres qui déplaceraient le plus la réponse')).toBeVisible({ timeout: 60_000 })
  const find = page.getByRole('link', { name: 'Le trouver' })
  expect(await find.count()).toBeGreaterThan(0)
  await expect(page.getByText(/jusqu’à \d+ ans?/).first()).toBeVisible()

  await find.first().click()
  await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
  // The link's key is dropped from the address once it has been used, and the figure's field is lit.
  await expect(page).not.toHaveURL(/fact=/)
  await expect(page.locator('.field-row--guided, [data-fact].field-row--guided').first()).toBeVisible({ timeout: 10_000 })
})
