import { expect, test, type Page } from '@playwright/test'

// EVERY EXAMPLE, THROUGH THE REAL PAGES. The eight example households (src/engine/golden/examples.ts) are loaded the way a person
// loads them — the data page — and each one must read as its own story on the results page: the headline, the cards, the ledger,
// and which panels are offered at all. The arithmetic behind each is printed in EXAMPLES.md and pinned by engine/golden/examples.test.ts.

async function loadExample(page: Page, name: string) {
  await page.goto('/donnees')
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/resultats')
  await expect(page.locator('.verdict__line')).toBeVisible()
}
// The ledger lives on the « Vérifier » view of the results page.
const openLedger = async (page: Page) => {
  await page.goto('/resultats?v=verify')
  await expect(page.locator('.ledger')).toBeVisible()
}

test('the data page offers all eight examples, each with its story', async ({ page }) => {
  await page.goto('/donnees')
  await expect(page.locator('.example-list li')).toHaveCount(8)
  await expect(page.locator('.example-list')).toContainText('Julien, 52 ans')
})

test('average couple: a plain answer, both people', async ({ page }) => {
  await loadExample(page, 'Couple, revenus moyens')
  await expect(page.locator('.verdict__line')).toContainText('tous les deux')
  await expect(page.locator('.scenario').first()).toContainText('Tient jusqu’à l’horizon')
})

test('modest single: one person, no couple widgets, and the GIS is in the year table', async ({ page }) => {
  await loadExample(page, 'Une personne, petit revenu')
  await expect(page.locator('.verdict__line')).toContainText('64 ans.')
  await expect(page.locator('.verdict__line')).not.toContainText('tous les deux')
  await expect(page.getByText('Chacun de son côté')).toHaveCount(0)
  await page.goto('/resultats?v=strategies')
  await expect(page.locator('#rentes')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pour les deux' })).toHaveCount(0)
  await expect(page.locator('.bridge__table')).toContainText('SRG')
})

test('rich couple: early retirement and a large nest left', async ({ page }) => {
  await loadExample(page, 'Couple, hauts revenus')
  await expect(page.locator('.verdict__line')).toContainText('57 ans')
})

test('behind: says so plainly — the plan runs out, and the card names the year', async ({ page }) => {
  await loadExample(page, 'Une personne, en retard')
  await expect(page.locator('.scenario').first()).toContainText('Manque dès 2036')
  await expect(page.locator('.verdict__line')).toContainText('69 ans')
})

test('retired couple: no retirement question, no age to compare, no pension start to choose, and the past is not a slider', async ({ page }) => {
  await loadExample(page, 'Couple à la retraite')
  await expect(page.locator('.verdict__line')).toHaveText('Vous êtes déjà tous les deux à la retraite.')
  await expect(page.locator('.compare')).toHaveCount(0) // no departure ages to try (the plan's own card and chart stay)
  await expect(page.getByText('Chacun de son côté')).toHaveCount(0)
  await page.goto('/resultats?v=strategies')
  await expect(page.locator('#ordre')).toBeVisible()
  await expect(page.locator('#rentes')).toHaveCount(0)
  await openLedger(page)
  const ledger = page.locator('.ledger')
  await expect(ledger.getByRole('slider', { name: 'Âge de la retraite' })).toHaveCount(0)
  await expect(ledger.getByRole('slider', { name: 'Début du RRQ' })).toHaveCount(0)
  await expect(ledger.getByText('déjà passé').first()).toBeVisible()
  // what can still move: spending and the economy
  await expect(ledger.getByRole('slider', { name: 'Dépenses à la retraite' })).toBeVisible()
})

test('newcomer: the OAS is the share her residence earns, and the ledger shows the calculation', async ({ page }) => {
  await loadExample(page, 'Arrivée au Canada à 30 ans')
  await openLedger(page)
  await expect(page.locator('.ledger')).toContainText('résidence 88 %')
})

test('heir: young and rich — « dès maintenant » rather than a first age tried, in the verdict and in the spending answer', async ({ page }) => {
  await loadExample(page, 'Une personne, grand héritage')
  await expect(page.locator('.verdict__line')).toHaveText('Vous pouvez déjà prendre votre retraite.')
  // the spending lever says it too, whatever the amount that still works
  await page.goto('/resultats?spend=60000')
  await expect(page.locator('#depenser')).toContainText('À 60 000 $ par année : dès maintenant.', { timeout: 30_000 })
  // the comparison starts at the age already reached, and nobody is shown an age in the past
  await expect(page.getByRole('group', { name: 'Comparer des âges de départ' }).getByRole('button', { name: /^27 ans/ })).toBeVisible()
})

test('average couple: the home is in the year table (the mortgage paid, the equity) and in the chart’s balances', async ({ page }) => {
  await loadExample(page, 'Couple, revenus moyens')
  await page.goto('/resultats?v=verify')
  const table = page.locator('.year-table table')
  await expect(table.getByRole('columnheader', { name: 'Hypothèque payée' })).toBeVisible({ timeout: 30_000 })
  await expect(table.getByRole('columnheader', { name: 'Maison, valeur nette' })).toBeVisible()
  // the first year pays twelve payments; a year after 2041 pays none
  await expect(table.locator('tbody tr').first()).toContainText('13 800 $')
  await expect(table.locator('tbody tr', { hasText: /^2045/ })).toContainText('—')
  // the chart's « Détail »: the house beside the accounts
  await page.goto('/resultats?metric=detail')
  await expect(page.locator('.chart-detail .chart__legend-item', { hasText: 'Maison (valeur nette)' })).toBeVisible({ timeout: 30_000 })
})
