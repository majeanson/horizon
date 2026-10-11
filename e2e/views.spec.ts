import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// Résultats is four views of one plan — Réponse · Essayer · Stratégies · Vérifier — and its map of sections is one line that scrolls (e2e/map-line.spec.ts).

test.beforeEach(async ({ page }) => seedProfile(page))

test('four views; « Essayer » holds the levers, the saving, the spending and the care, and keeps its place in the address', async ({ page }) => {
  await page.goto('/resultats')
  const tabs = page.getByRole('tablist', { name: 'Vues des résultats' })
  await expect(tabs.getByRole('tab')).toHaveText(['Réponse', 'Essayer', 'Stratégies', 'Vérifier'])
  await expect(page.locator('#ajuster')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Essayer' }).click()
  await expect(page).toHaveURL(/v=adjust/)
  await expect(page.getByText('Ce qui change le plus')).toBeVisible()
  // one of the four at a time, behind a switch, and the choice is kept in the address
  const essais = page.getByRole('tablist', { name: 'Un essai à la fois' })
  await expect(essais.getByRole('tab')).toHaveText(['Ce qui change', 'Épargner', 'Dépenser', 'Soins'])
  await expect(page.locator('#epargner, #depenser, #soins')).toHaveCount(0)
  for (const [tab, id, key] of [['Épargner', '#epargner', 'save'], ['Dépenser', '#depenser', 'spend'], ['Soins', '#soins', 'care']] as const) {
    await essais.getByRole('tab', { name: tab }).click()
    await expect(page.locator(id)).toBeVisible()
    await expect(page.locator('#ajuster')).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp('essai=' + key))
  }
  await expect(page.locator('#solidite')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Vérifier' }).click()
  await expect(page.locator('#solidite')).toBeVisible() // how firm the answer is is a check, so it lives here
  await tabs.getByRole('tab', { name: 'Réponse' }).click()
  await expect(page).not.toHaveURL(/v=/)
  await expect(page.locator('#solidite')).toHaveCount(0)
})

test('on the answer, the comparison and its chart come before « Préciser le calcul »', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.locator('#preciser')).toBeVisible({ timeout: 30_000 })
  const compare = (await page.locator('#comparer').boundingBox())!
  const refine = (await page.locator('#preciser').boundingBox())!
  expect(compare.y).toBeLessThan(refine.y)
})

test('« Comment lire cette page ? » is closed until it is asked for, then says what each part is for', async ({ page }) => {
  await page.goto('/resultats')
  const open = page.getByRole('button', { name: 'Comment lire cette page ?' })
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toHaveCount(0)
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toBeVisible()
  await expect(page.getByText('ce que vous avez dans vos REER, CELI et comptes non enregistrés')).toBeVisible()
  await open.click()
  await expect(page.getByText('le plus tôt où l’argent dure jusqu’à la fin du plan')).toHaveCount(0)
})


test('« Essayer »: a link to one of its parts opens that part by itself, and an address that carries its own key does too', async ({ page }) => {
  // the door on the answer card (« Et si je dépensais moins ? ») lands on the spending view, not on a page that has no such section
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'Et si je dépensais moins ?' }).first().click()
  await expect(page).toHaveURL(/v=adjust/)
  await expect(page).toHaveURL(/essai=spend/)
  await expect(page.locator('#depenser')).toBeInViewport()
  // from inside « Essayer », a link to another of its parts (the plan's « this year » doors) switches the view in place
  await page.goto('/resultats?v=adjust&essai=care')
  await expect(page.locator('#soins')).toBeVisible()
  // the old keys of the three what-ifs open their own view with no `essai`
  await page.goto('/resultats?v=adjust&spend=70000')
  await expect(page.locator('#depenser')).toBeVisible()
  await page.goto('/resultats?v=adjust&age=58')
  await expect(page.locator('#epargner')).toBeVisible()
  await page.goto('/resultats?v=adjust&care=45000,88,6')
  await expect(page.locator('#soins')).toBeVisible()
  // an unknown view falls back to the first
  await page.goto('/resultats?v=adjust&essai=nope')
  await expect(page.locator('#ajuster')).toBeVisible()
})

test('« Vérifier » › « Solidité »: the scenarios and a hard market in brief, the 3 × 3 grids one switch away, and the choice is in the address', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const depths = page.getByRole('tablist', { name: 'Deux façons de voir la solidité' })
  await expect(depths.getByRole('tab')).toHaveText(['En bref', 'Si l’avenir est moins bon'])
  await expect(depths.getByRole('tab', { name: 'En bref' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toBeVisible()
  await expect(page.locator('.sensitivity')).toHaveCount(0)
  await depths.getByRole('tab', { name: 'Si l’avenir est moins bon' }).click()
  await expect(page).toHaveURL(/solidite=grids/)
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toHaveCount(0)
  // one section, not two: the old second section is gone from the map and the page
  await expect(page.locator('#sensibilite')).toHaveCount(0)
  // an address that names the grids opens them
  await page.goto('/resultats?v=verify&solidite=grids')
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Si l’avenir est moins bon' })).toHaveAttribute('aria-selected', 'true')
})

test('« Comparer »: the departure ages are the first way, and a way that the household does not have is not offered', async ({ page }) => {
  // the golden couple has no kept plan: two ways, the ages and each of us
  await page.goto('/resultats')
  const ways = page.getByRole('tablist', { name: 'Façons de comparer' })
  await expect(ways.getByRole('tab')).toHaveText(['Âges de départ', 'Chacun de son côté'])
  await expect(page.locator('.scenarios')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.verdict__each')).toHaveCount(0)
  await ways.getByRole('tab', { name: 'Chacun de son côté' }).click()
  await expect(page.locator('.verdict__each')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.scenarios')).toHaveCount(0)
  await expect(page.locator('.chart-panel')).toHaveCount(0)
  // an address that names a way opens it
  await page.goto('/resultats?cv=each')
  await expect(page.locator('.verdict__each')).toBeVisible({ timeout: 60_000 })
})
