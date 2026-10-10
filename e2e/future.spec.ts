import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, seedProfile } from './seed'

// « Préparer l'avenir » (`?v=future`): a late-life care cost tried on the plan, and what the plan points at for this year. The care is a
// what-if kept in the address (`?care=amount,age,years`) until the person adds it to the dated events.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the fifth view holds the care what-if and « À faire cette année », and the tab stays in the address', async ({ page }) => {
  await page.goto('/resultats?v=future')
  await expect(page.getByRole('tab', { name: 'Avenir' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#soins')).toContainText('Et si les dernières années coûtaient plus cher ?')
  await expect(page.locator('#annee')).toContainText('À faire cette année')
  // The answer to the starting care arrives off the page's thread.
  await expect(page.locator('#soins .answer__big')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#soins')).toContainText('Le coût commencerait en')
  // The decisions with their own home are links, not copies.
  await page.locator('#annee').getByRole('button', { name: 'Dans quel ordre puiser ?' }).click()
  await expect(page).toHaveURL(/v=strategies/)
  await expect(page.locator('#ordre')).toBeVisible()
})

test('a heavier care is read from the address and costs the plan something', async ({ page }) => {
  await page.goto('/resultats?v=future&care=5000,95,1')
  await expect(page.locator('#soins .answer__big')).toBeVisible({ timeout: 30_000 })
  const light = await page.locator('#soins .answer__big').innerText()
  await page.goto('/resultats?v=future&care=150000,65,25')
  await expect(page.locator('#soins .answer__big')).not.toHaveText(light, { timeout: 30_000 })
  await expect(page.locator('#soins')).toContainText(/ne dure à aucun âge|plus tard/)
})

test('an unreadable care in the address falls back to the starting figures', async ({ page }) => {
  await page.goto('/resultats?v=future&care=abc')
  await expect(page.locator('#soins .answer__big')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#soins')).toContainText('Le coût commencerait en')
})

test('« L’ajouter à mes événements » writes the care as a dated expense and clears the what-if', async ({ page }) => {
  await page.goto('/resultats?v=future&care=45000,88,6')
  await expect(page.locator('#soins .answer__big')).toBeVisible({ timeout: 30_000 })
  await page.locator('#soins').getByRole('button', { name: 'L’ajouter à mes événements' }).click()
  await expect(page).not.toHaveURL(/care=/)
  await page.waitForFunction(
    (key) => {
      const raw = localStorage.getItem(key)
      return raw !== null && raw.includes('"kind":"expense"') && raw.includes('45000')
    },
    PROFILE_KEY,
  )
  const flows = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).household.flows as { kind: string; amount: number; fromYear: number; toYear: number }[], PROFILE_KEY)
  const care = flows.find((f) => f.amount === 45_000)!
  expect(care.kind).toBe('expense')
  expect(care.toYear - care.fromYear).toBe(5)
  // It is among the dated events now, and the what-if says so.
  await expect(page.locator('#soins')).toContainText('déjà dans vos événements')
})

test('« À faire cette année » names the change that gains most and the figure to confirm first, once the searches are in', async ({ page }) => {
  await page.goto('/resultats?v=future')
  const year = page.locator('#annee')
  await expect(year).not.toContainText('Calcul en cours', { timeout: 60_000 })
  await expect(year.getByText('Le changement qui avance le plus', { exact: true })).toBeVisible()
  await expect(year.getByText('Le chiffre à confirmer d’abord', { exact: true })).toBeVisible()
})
