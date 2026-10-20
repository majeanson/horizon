import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { seedProfile } from './seed'

// « QUI DEVRAIT COMMENCER SA RENTE DU RRQ EN PREMIER » — a couple's two start ages tried together, three by three, each scored by its worst case. A fold under « Quand commencer mes rentes ? »,
// mounted only when opened, for a couple only; the grid is words first (a figure, or « ne tient pas »), the best and the household's own choice marked in words.

test.beforeEach(async ({ page }) => seedProfile(page))

const open = async (page: Page) => {
  await page.goto('/decider?strat=rentes')
  const fold = page.locator('.spouse-timing')
  await expect(fold).toBeVisible({ timeout: 60_000 })
  return fold
}

test('closed, it computes nothing; opened, it shows nine combinations with the best and the current choice named in words', async ({ page }) => {
  const fold = await open(page)
  await expect(fold.locator('.heat')).toHaveCount(0) // closed: nothing mounted
  await fold.locator('summary').click()
  const grid = fold.locator('.heat')
  await expect(grid.locator('tbody td')).toHaveCount(9, { timeout: 90_000 })
  await expect(grid.locator('thead th')).toHaveCount(4)
  await expect(grid.locator('tbody th')).toHaveText([/à 60 ans/, /à 65 ans/, /à 70 ans/])
  await expect(grid.getByText('le meilleur').or(grid.getByText('votre choix, le meilleur'))).toHaveCount(1)
  await expect(grid.getByText('votre choix').or(grid.getByText('votre choix, le meilleur'))).toHaveCount(1)
  // every cell says something in words
  for (const t of await grid.locator('tbody td').allTextContents()) expect(t.trim().length).toBeGreaterThan(0)
  // the read of the grid under it
  await expect(fold.getByText(/Le meilleur choix pour vous deux|Votre choix actuel est déjà le meilleur|Aucune de ces neuf/)).toBeVisible()
  await expect(fold.getByText('Seul le début du RRQ change')).toBeVisible()
})

test('a household of one is not offered it', async ({ page }) => {
  await page.goto('/donnees?autres=examples')
  await page.getByRole('button', { name: 'Une personne, petit revenu', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/decider?strat=rentes')
  await expect(page.getByText('Quand commencer mes rentes ?').first()).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.spouse-timing')).toHaveCount(0)
})

test('in English the grid speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/decider?strat=rentes')
  const fold = page.locator('.spouse-timing')
  await expect(fold.locator('summary')).toHaveText('Who starts first')
  await fold.locator('summary').click()
  await expect(fold.locator('.heat tbody td')).toHaveCount(9, { timeout: 90_000 })
  await expect(fold.getByText('Only the QPP start changes')).toBeVisible()
})

test('on a phone the grid scrolls inside its own box and the page does not run off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const fold = await open(page)
  await fold.locator('summary').click()
  await expect(fold.locator('.heat tbody td')).toHaveCount(9, { timeout: 90_000 })
  await expectNoHorizontalOverflow(page)
})
