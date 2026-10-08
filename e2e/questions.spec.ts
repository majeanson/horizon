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

test('« Quand arrêter » says when no pension has begun yet, and what they cover once every one is in pay', async ({ page }) => {
  await page.goto('/resultats')
  // The golden couple's verdict (59) has the plan pension in pay the year after the last stop; every pension is in pay later.
  await expect(page.locator('#arreter')).toContainText(/vos rentes, après impôt, couvrent \d+\s*% de vos dépenses/)
  await expect(page.locator('#arreter')).toContainText(/Une fois toutes vos rentes commencées, en 20\d\d \(\d\d \/ \d\d ans\), elles couvrent \d+\s*% de vos dépenses, après impôt\./)
})

test('« Et si je dépensais moins ? » recomputes the age for an amount from the address, compares it with the profile’s, and can keep it', async ({ page }) => {
  await page.goto('/resultats')
  // The door on the verdict card leads to the section; at the profile's own amount the answer is the verdict's age.
  await page.getByRole('button', { name: 'Et si je dépensais moins ?' }).first().click()
  await expect(page.locator('#depenser')).toBeInViewport()
  await expect(page.locator('#depenser')).toContainText('À 90 000 $ par année : dès 59 ans.')
  await expect(page.locator('#depenser')).toContainText('C’est le montant de vos hypothèses.')
  // A lower amount from the address: an earlier age, said against the profile's own.
  await page.goto('/resultats?spend=70000')
  await expect(page.locator('#depenser')).toContainText('À 70 000 $ par année : dès 56 ans.', { timeout: 30_000 })
  await expect(page.locator('#depenser')).toContainText('3 ans plus tôt qu’avec les 90 000 $ de vos hypothèses.')
  // The slider's step button is one exact step, kept in the address.
  await page.getByRole('button', { name: 'Moins : Dépenses à la retraite' }).click()
  await expect(page).toHaveURL(/spend=69500/)
  // Keeping the amount writes it to the profile: the verdict follows, the address forgets the what-if.
  await page.getByRole('button', { name: 'Garder ce montant dans mes hypothèses' }).click()
  await expect(page).not.toHaveURL(/spend=/)
  await expect(page.getByText('Vous pouvez prendre votre retraite à 56 ans, tous les deux.')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#depenser')).toContainText('À 69 500 $ par année : dès 56 ans.', { timeout: 30_000 })
  await expect(page.locator('#depenser')).toContainText('C’est le montant de vos hypothèses.', { timeout: 30_000 })
})
