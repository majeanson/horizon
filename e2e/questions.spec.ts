import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « Ma question » on the results page: the same household, three questions, each answered with the one to three numbers
// that answer it. The picker lives in the address (`?q=`), so a view can be bookmarked.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the picker opens on « Quand prendre ma retraite ? » and moves between the three questions', async ({ page }) => {
  await page.goto('/resultats')
  const tabs = page.getByRole('tablist', { name: 'Ma question' })
  await expect(tabs.getByRole('tab', { name: 'Quand prendre ma retraite ?', selected: true })).toBeVisible()
  await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible()

  await tabs.getByRole('tab', { name: 'Quand arrêter de travailler ?' }).click()
  await expect(page).toHaveURL(/q=stop/)
  await expect(page.getByText('Dès 59 ans, tous les deux.')).toBeVisible()

  await tabs.getByRole('tab', { name: 'Combien épargner ?' }).click()
  await expect(page).toHaveURL(/q=save/)
  await tabs.getByRole('tab', { name: 'Quand prendre ma retraite ?' }).click()
  await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible()
})

test('« Quand arrêter de travailler ? » gives each person a year, and says what the pensions cover', async ({ page }) => {
  await page.goto('/resultats?q=stop')
  await expect(page.getByText(/Camille : en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/Alex : en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/vos rentes, après impôt, couvrent \d+\s*% de vos dépenses/)).toBeVisible()
})

test('« Combien épargner ? » says nothing more at an age that already works, an amount before it, and « ne tient pas » far too early', async ({ page }) => {
  await page.goto('/resultats?q=save&age=59')
  await expect(page.getByText('Rien de plus : à 59 ans, le plan tient déjà.')).toBeVisible({ timeout: 30_000 })
  await page.goto('/resultats?q=save&age=58')
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Soit environ .* par mois/)).toBeVisible()
  await page.goto('/resultats?q=save&age=50')
  await expect(page.getByText('À 50 ans, le plan ne tient pas.')).toBeVisible({ timeout: 30_000 })
})

test('typing an age in « Combien épargner ? » recomputes the answer and keeps it in the address', async ({ page }) => {
  await page.goto('/resultats?q=save&age=59')
  await expect(page.getByText('Rien de plus : à 59 ans, le plan tient déjà.')).toBeVisible({ timeout: 30_000 })
  const box = page.getByRole('textbox', { name: 'Partir à (âge)' })
  await box.fill('58')
  await box.press('Enter')
  await expect(page).toHaveURL(/age=58/)
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
})

for (const q of ['stop', 'save']) {
  test(`« ${q} » has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(`/resultats?q=${q}&age=58`)
    await expect(page.getByRole('tablist', { name: 'Ma question' })).toBeVisible()
    await page.getByText(/de plus par année|Dès 59 ans/).first().waitFor({ timeout: 30_000 })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
}
