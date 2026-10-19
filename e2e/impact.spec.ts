import { expect, test } from '@playwright/test'
import { savedProfile, seedProfile } from './seed'

// « Ce qui préciserait la réponse » (Ma fiche) — the unconfirmed figures ranked by how far the answer moves, each with a
// door to its own field on Profil.

test('Ma fiche ranks the unconfirmed figures, and each one opens its own field, lit, on Profil', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/fiche')
  await expect(page.getByRole('heading', { name: 'Ce qui préciserait la réponse' })).toBeVisible({ timeout: 60_000 })
  const find = page.locator('.sheet__movers').getByRole('link')
  await expect(find.first()).toBeVisible({ timeout: 60_000 })
  expect(await find.count()).toBeGreaterThan(0)
  await expect(page.locator('.sheet__movers').getByText(/jusqu’à \d+ ans?/).first()).toBeVisible()

  await find.first().click()
  await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
  // The link's key is dropped from the address once it has been used, and the figure's field is lit.
  await expect(page).not.toHaveURL(/fact=/)
  await expect(page.locator('.field-row--guided, [data-fact].field-row--guided').first()).toBeVisible({ timeout: 10_000 })
})

// While figures are estimates the verdict carries the computed range (every estimated figure moved at once); once all are confirmed it is the exact-confidence sentence.
const RANGE = /^Entre (\d+) (?:et (\d+) ans|ans et peut-être aucun âge avant \d+),? selon vos chiffres estimés — \d+ sur \d+ confirmés\./

test('the verdict carries a range while figures are estimates', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats')
  const line = page.locator('.verdict .refine__confidence')
  await expect(line).toContainText(/selon vos chiffres estimés/, { timeout: 60_000 })
  const text = ((await line.textContent()) ?? '').trim()
  const m = RANGE.exec(text)
  expect(m, text).not.toBeNull()
  // two ages, the first before the second (the open end has no second age)
  if (m![2] !== undefined) expect(Number(m![1])).toBeLessThan(Number(m![2]))
  await expect(line.getByRole('link', { name: 'Rendre mon profil exact' })).toBeVisible()
})

test('once every figure is confirmed the verdict says so, with no range', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil')
  await page.getByRole('button', { name: 'Tout confirmer pas à pas' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  const confirm = bar.getByRole('button', { name: 'C’est confirmé' })
  for (let i = 0; i < 80 && (await confirm.count()) > 0; i++) await confirm.click()
  await expect(bar).toContainText('Guide terminé')
  await expect.poll(async () => (await savedProfile(page)).confirmed.length).toBeGreaterThan(10)
  await page.goto('/resultats')
  const line = page.locator('.verdict .refine__confidence')
  await expect(line).toContainText('Tous les chiffres de votre profil sont confirmés par vos documents.', { timeout: 60_000 })
  await expect(line).not.toContainText(/Entre \d+/)
})
