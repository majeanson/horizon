import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// Résultats is three views of one plan — Réponse · Décider · Preuve — each ONE level (no switch inside a view), and its map of sections is one line that scrolls (e2e/map-line.spec.ts).

test.beforeEach(async ({ page }) => seedProfile(page))

test('three views; « Décider » holds the levers, then the what-ifs one at a time, and keeps its place in the address', async ({ page }) => {
  await page.goto('/resultats')
  const tabs = page.getByRole('tablist', { name: 'Vues des résultats' })
  await expect(tabs.getByRole('tab')).toHaveText(['Réponse', 'Décider', 'Preuve'])
  await expect(page.locator('#ajuster')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Décider' }).click()
  await expect(page).toHaveURL(/v=decide/)
  await expect(page.getByText('Ce qui change le plus')).toBeVisible()
  // the ranked changes are on the page; the three what-ifs are folds under them, open one at a time, the choice kept in the address
  await expect(page.locator('#ajuster')).toBeVisible()
  for (const id of ['#viser', '#epargner', '#depenser', '#soins']) await expect(page.locator(id)).toBeVisible() // the fold's own row
  await expect(page.locator('#epargner > .fold__body')).toBeEmpty() // closed: nothing mounted, nothing computed
  for (const [id, key] of [['#viser', 'target'], ['#epargner', 'save'], ['#depenser', 'spend'], ['#soins', 'care']] as const) {
    await page.locator(id + ' > summary').click()
    await expect(page.locator(id + ' > .fold__body')).not.toBeEmpty()
    await expect(page).toHaveURL(new RegExp('essai=' + key))
    for (const other of ['#viser', '#epargner', '#depenser', '#soins'].filter((o) => o !== id)) await expect(page.locator(other)).not.toHaveAttribute('open', '')
  }
  await page.locator('#soins > summary').click() // close it: « none » is kept too
  await expect(page).toHaveURL(/essai=none/)
  await expect(page.locator('#solidite')).toHaveCount(0)
  await tabs.getByRole('tab', { name: 'Preuve' }).click()
  await expect(page.locator('#solidite')).toBeVisible() // how firm the answer is is a check, so it lives here
  await tabs.getByRole('tab', { name: 'Réponse' }).click()
  await expect(page).not.toHaveURL(/v=/)
  await expect(page.locator('#solidite')).toHaveCount(0)
})

test('the answer carries no « Comment lire cette page ? » chip: the guide to the whole app is on the home page', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Comment lire cette page ?' })).toHaveCount(0)
})

test('« Décider »: a link to one of its parts opens that part by itself, and an address that carries its own key does too', async ({ page }) => {
  // the door on the answer card (« Et si je dépensais moins ? ») lands on the spending what-if, open
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'Et si je dépensais moins ?' }).first().click()
  await expect(page).toHaveURL(/v=decide/)
  await expect(page).toHaveURL(/essai=spend/)
  await expect(page.locator('#depenser')).toHaveAttribute('open', '')
  await expect(page.locator('#depenser')).toBeInViewport()
  // an address that names a what-if opens it
  await page.goto('/resultats?v=decide&essai=care')
  await expect(page.locator('#soins')).toHaveAttribute('open', '')
  // the old keys of the three what-ifs open their own, with no `essai`
  await page.goto('/resultats?v=decide&spend=70000')
  await expect(page.locator('#depenser')).toHaveAttribute('open', '')
  await page.goto('/resultats?v=decide&age=58')
  await expect(page.locator('#epargner')).toHaveAttribute('open', '')
  await page.goto('/resultats?v=decide&care=45000,88,6')
  await expect(page.locator('#soins')).toHaveAttribute('open', '')
  // the four-view addresses of before land on the view that holds their content
  await page.goto('/resultats?v=adjust')
  await expect(page).toHaveURL(/v=decide/)
  await page.goto('/resultats?v=strategies')
  await expect(page).toHaveURL(/v=decide/)
  await page.goto('/resultats?v=verify')
  await expect(page).toHaveURL(/v=proof/)
  // an unknown what-if is all closed; an unknown view is the answer
  await page.goto('/resultats?v=decide&essai=nope')
  await expect(page.locator('#ajuster')).toBeVisible()
  await expect(page.locator('#epargner')).not.toHaveAttribute('open', '')
  await page.goto('/resultats?v=nope')
  await expect(page).not.toHaveURL(/v=/)
})

test('« Preuve » › « Solidité »: the scenarios and a hard market in brief, the 3 × 3 grids one fold away, and the choice is in the address', async ({ page }) => {
  await page.goto('/resultats?v=proof')
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toBeVisible()
  await expect(page.locator('.sensitivity')).toHaveCount(0)
  await page.locator('#sensibilite > summary').click()
  await expect(page).toHaveURL(/solidite=grids/)
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toBeVisible() // the brief stays: one section, two depths
  // an address that names the grids opens them
  await page.goto('/resultats?v=proof&solidite=grids')
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.locator('#sensibilite')).toHaveAttribute('open', '')
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
