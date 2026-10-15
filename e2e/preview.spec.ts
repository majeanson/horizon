import { expect, test } from '@playwright/test'
import { seedProfile, blankSeed } from './seed'

// THE PORTFOLIO PREVIEW — `?apercu` (marcportal.com frames `/resultats?apercu`): an invented household's answer, said to be one, from memory only.

test('a preview opens on an invented household’s answer, says so, and writes nothing to the device', async ({ page }) => {
  await page.goto('/resultats?apercu')
  await expect(page.getByText('Aperçu : un ménage inventé', { exact: false })).toBeVisible()
  await expect(page.locator('.verdict, .headline').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ouvrir Horizon' })).toHaveAttribute('target', '_top')
  // moving inside the preview keeps it a preview
  await page.getByRole('link', { name: 'Profil' }).first().click()
  await expect(page.getByText('Aperçu : un ménage inventé', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('horizon-profile'))).toBeNull()
})

test('a preview never shows nor touches the profile already on the device', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/profil')
  await expect(page.locator('.page-head__title')).toBeVisible()
  const before = await page.evaluate(() => localStorage.getItem('horizon-profile'))
  await page.goto('/resultats?apercu')
  await expect(page.getByText('Aperçu : un ménage inventé', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('horizon-profile'))).toBe(before)
})

test('every field has its ⓘ: a chosen age explains itself in place', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil')
  const about = page.getByRole('button', { name: /À propos de ce champ : Âge de retraite visé/ }).first()
  await about.click()
  await expect(page.getByText('Ce que ça change', { exact: false }).first()).toBeVisible()
})
