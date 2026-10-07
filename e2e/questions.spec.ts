import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The three questions, one page: the verdict answers « Quand prendre ma retraite ? », and « Combien épargner ? » and
// « Quand arrêter de travailler ? » are always-visible sections below it. An old `?q=` link scrolls to its section
// and the key is dropped from the address.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the three answers share the page: the verdict first, then saving and stopping as sections', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible()
  await expect(page.locator('#epargner')).toContainText('Combien épargner ?')
  await expect(page.locator('#arreter')).toContainText('Quand arrêter de travailler ?')
  await expect(page.getByText(/Camille : en 20\d\d/)).toBeVisible()
})

test('an old « ?q= » link lands on its section and the key leaves the address', async ({ page }) => {
  await page.goto('/resultats?q=stop')
  await expect(page).not.toHaveURL(/q=stop/)
  await expect(page.locator('#arreter')).toBeInViewport()
  await page.goto('/resultats?q=save&age=58')
  await expect(page).not.toHaveURL(/q=save/)
  await expect(page).toHaveURL(/age=58/)
  await expect(page.locator('#epargner')).toBeInViewport()
})

test('« Quand arrêter de travailler ? » gives each person a year, and says what the pensions cover', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByText(/Camille : en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/Alex : en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/vos rentes, après impôt, couvrent \d+\s*% de vos dépenses/)).toBeVisible()
})

test('« Combien épargner ? » says nothing more at an age that already works, an amount before it, and « ne tient pas » far too early', async ({ page }) => {
  await page.goto('/resultats?age=59')
  await expect(page.getByText('Rien de plus : à 59 ans, le plan tient déjà.')).toBeVisible({ timeout: 30_000 })
  await page.goto('/resultats?age=58')
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Soit environ .* par mois/)).toBeVisible()
  await page.goto('/resultats?age=50')
  await expect(page.getByText('À 50 ans, le plan ne tient pas.')).toBeVisible({ timeout: 30_000 })
})

test('typing an age in « Combien épargner ? » recomputes the answer and keeps it in the address', async ({ page }) => {
  await page.goto('/resultats?age=59')
  await expect(page.getByText('Rien de plus : à 59 ans, le plan tient déjà.')).toBeVisible({ timeout: 30_000 })
  const box = page.getByRole('textbox', { name: 'Partir à (âge)' })
  await box.fill('58')
  await box.press('Enter')
  await expect(page).toHaveURL(/age=58/)
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
})
