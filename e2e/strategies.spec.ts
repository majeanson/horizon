import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// The ways of starting the pensions: a table on a wide screen, closed cards on a phone, and the reader's choice (`bt`) wins over the width.
// And « Votre plan en une ligne », the whole plan in one bar per person.

test.beforeEach(async ({ page }) => seedProfile(page))

test('a wide screen shows the comparison as a table: the ways are the columns, the best of a row is marked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resultats?v=strategies')
  const table = page.locator('.strategies__table')
  await expect(table).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Tableau' })).toHaveAttribute('aria-pressed', 'true')
  await expect(table.getByRole('columnheader')).toHaveCount(6) // the row-label column + five ways (a couple)
  await expect(table.getByRole('rowheader', { name: 'Valeur nette à 95 ans' })).toBeVisible()
  await expect(table.locator('td.is-best').first()).toBeVisible()
  await expect(page.locator('.bridge-card')).toHaveCount(0)
})

test('a phone shows closed cards with three dots each; « Détails » opens one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resultats?v=strategies')
  const cards = page.locator('.bridge-card')
  await expect(cards.first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Cartes' })).toHaveAttribute('aria-pressed', 'true')
  await expect(cards.first().locator('.dots__dot')).toHaveCount(3)
  await expect(cards.first().locator('.dots')).toHaveAttribute('aria-label', /Prudent.*Neutre.*Audacieux/s)
  await expect(cards.first().locator('.bridge-card__facts')).toHaveCount(0)
  const more = cards.first().getByRole('button', { name: /^Détails/ })
  await expect(more).toHaveAttribute('aria-expanded', 'false')
  await more.click()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  await expect(cards.first().locator('.bridge-card__facts')).toBeVisible()
})

test('the reader chooses, on either screen, and the choice is in the address', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resultats?v=strategies')
  await expect(page.locator('.bridge-card').first()).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Tableau' }).click()
  await expect(page).toHaveURL(/bt=table/)
  // on a phone the table has the ways as ROWS, two figures each, the dots under the name
  const rows = page.locator('.strategies__table tbody tr')
  await expect(rows).toHaveCount(5)
  await expect(rows.first().locator('.dots')).toBeVisible()
  await expect(page.locator('.bridge-card')).toHaveCount(0)
  // …and a wide screen can ask for cards
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Cartes' }).click()
  await expect(page).toHaveURL(/bt=cards/)
  await expect(page.locator('.bridge-card').first()).toBeVisible()
})

test('the chart comes before the comparison', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resultats?v=strategies')
  const heading = page.getByRole('heading', { name: 'Façons de commencer vos rentes' })
  await expect(heading).toBeVisible({ timeout: 60_000 })
  const chart = (await page.getByRole('heading', { name: 'D’où vient l’argent, année par année' }).boundingBox())!
  expect(chart.y).toBeLessThan((await heading.boundingBox())!.y)
})

test('« Votre plan en une ligne »: one bar per person, with the dates ahead, in text as well as in colour', async ({ page }) => {
  await page.goto('/resultats')
  const strip = page.locator('.timeline')
  await expect(strip).toBeVisible({ timeout: 60_000 })
  await expect(strip.getByText('Votre plan en une ligne')).toBeVisible()
  await expect(strip.locator('.timeline__bar')).toHaveCount(2)
  await expect(strip.locator('.timeline__bar').first()).toHaveAttribute('aria-label', /Camille.*Travail de 48 à 60 ans.*Rentes de 60 à 95 ans/s)
  await expect(strip.getByText('Retraite à 60 ans')).toBeVisible()
  await expect(strip.getByText('RRQ à 65 ans').first()).toBeVisible()
  await expect(strip.getByText('Fin du plan, 95 ans').first()).toBeVisible()
})

test('« Et si Camille décédait plus tôt ? » compares every way of starting at five death ages, and the best of a column is marked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resultats?v=strategies')
  const panel = page.locator('.sweep')
  await expect(panel.getByRole('heading', { name: /Et si Camille décédait plus tôt/ })).toBeVisible({ timeout: 60_000 })
  const table = panel.locator('table')
  await expect(table).toBeVisible({ timeout: 90_000 })
  await expect(table.locator('thead th')).toHaveCount(6) // the row label + five death ages
  await expect(table.locator('thead th').nth(1)).toContainText('70 ans')
  await expect(table.locator('thead th').nth(5)).toContainText('90 ans')
  await expect(table.locator('tbody tr')).toHaveCount(5)
  // the break-even, seen from the other side: dying at 70 the early QPP has paid the most; dying at 90 the deferral has
  const first = table.locator('tbody tr').nth(0)
  await expect(first).toContainText('Tout dès que possible')
  await expect(first.locator('td').nth(0)).toHaveClass(/is-best/)
  await expect(table.locator('tbody tr', { hasText: 'Reporter au maximum' }).locator('td').nth(4)).toHaveClass(/is-best/)
  // the other readings: the nest at the end, and — for a couple — what the survivor was paid
  await panel.getByRole('button', { name: 'Nid à la fin du plan' }).click()
  await expect(panel.getByText('Ce que le ménage possède quand le plan se termine')).toBeVisible()
  await panel.getByRole('button', { name: 'Rente de survivant' }).click()
  await expect(panel.getByText('Ce que la personne qui reste a reçu')).toBeVisible()
})

test('a phone gets the compact table: ages as bare numbers, amounts in k and M', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resultats?v=strategies')
  const panel = page.locator('.sweep')
  await expect(panel.locator('table')).toBeVisible({ timeout: 90_000 })
  await expect(panel.getByText('Colonnes : l’âge au décès.', { exact: false })).toBeVisible()
  await expect(panel.locator('tbody td').first()).toContainText(/\d+ k|\d+ M/)
})
