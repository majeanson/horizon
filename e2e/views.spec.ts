import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// Two pages, ONE level of cards each (2026-10-19): Résultats is the answer, then its proof under a heading; « Décider » is a tab of its own — the what-ifs and the strategies.
// No view tabs anywhere: the four destinations are the main navigation's. The map of sections is one line that scrolls (e2e/map-line.spec.ts).

test.beforeEach(async ({ page }) => seedProfile(page))

test('two pages, one level each: Résultats is the answer then its proof; « Décider » holds the levers, then the what-ifs one at a time, kept in the address', async ({ page }) => {
  await page.goto('/resultats?cartes=all')
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link')).toHaveText(['Profil', 'Résultats', 'Décider', 'Hypothèses'])
  await expect(page.getByRole('tablist', { name: 'Vues des résultats' })).toHaveCount(0)
  await expect(page.locator('#ajuster')).toHaveCount(0)
  // the proof is on this page, under its own heading, its blocks closed and each saying what it holds
  await expect(page.locator('#preuve').getByRole('heading', { name: 'Preuve' })).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('#solidite')).toHaveClass(/is-closed/)
  await expect(page.locator('#solidite .accordion__summary')).toBeVisible()
  await nav.getByRole('link', { name: 'Décider' }).click()
  await expect(page).toHaveURL(/\/decider/)
  await expect(page.getByText('Ce qui change le plus')).toBeVisible()
  // the ranked changes are on the page; the what-ifs are folds under them, open one at a time, the choice kept in the address
  await expect(page.locator('#ajuster')).toBeVisible()
  for (const id of ['#viser', '#epargner', '#depenser', '#soins']) await expect(page.locator(id)).toBeVisible() // the fold's own row
  await expect(page.locator('#epargner-body')).toHaveCount(0) // closed: nothing mounted, nothing computed
  for (const [id, key] of [['#viser', 'target'], ['#epargner', 'save'], ['#depenser', 'spend'], ['#soins', 'care']] as const) {
    await page.locator(id + ' .accordion__toggle').click()
    await expect(page.locator(id + '-body')).toHaveCount(1)
    await expect(page).toHaveURL(new RegExp('essai=' + key))
    for (const other of ['#viser', '#epargner', '#depenser', '#soins'].filter((o) => o !== id)) await expect(page.locator(other)).toHaveClass(/is-closed/)
  }
  await page.locator('#soins .accordion__toggle').click() // close it: « none » is kept too
  await expect(page).toHaveURL(/essai=none/)
  // how firm the answer is, is a check: it lives with the answer, not here
  await expect(page.locator('#solidite')).toHaveCount(0)
})

test('the answer carries no « Comment lire cette page ? » chip: the guide to the whole app is on the home page', async ({ page }) => {
  await page.goto('/resultats?cartes=all')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Comment lire cette page ?' })).toHaveCount(0)
})

test('« Décider »: a link to one of its parts opens that part by itself, and an address that carries its own key does too; old addresses land where their content lives', async ({ page }) => {
  // the door on the answer card (« Et si je dépensais moins ? ») goes to Décider, on the spending what-if, open
  await page.goto('/resultats?cartes=all')
  await page.getByRole('button', { name: 'Et si je dépensais moins ?' }).first().click()
  await expect(page).toHaveURL(/\/decider\?/)
  await expect(page).toHaveURL(/essai=spend/)
  await expect(page.locator('#depenser')).toHaveClass(/is-open/)
  await expect(page.locator('#depenser')).toBeInViewport()
  // an address that names a what-if opens it
  await page.goto('/decider?essai=care')
  await expect(page.locator('#soins')).toHaveClass(/is-open/)
  // the old keys of the three what-ifs open their own, with no `essai`
  await page.goto('/decider?spend=70000')
  await expect(page.locator('#depenser')).toHaveClass(/is-open/)
  await page.goto('/decider?age=58')
  await expect(page.locator('#epargner')).toHaveClass(/is-open/)
  await page.goto('/decider?care=45000,88,6')
  await expect(page.locator('#soins')).toHaveClass(/is-open/)
  // the addresses of the three views, and of the four before them, land where their content lives now — and the address follows
  await page.goto('/resultats?v=decide&essai=care')
  await expect(page).toHaveURL(/\/decider\?essai=care$/)
  await expect(page.locator('#soins')).toHaveClass(/is-open/)
  await page.goto('/resultats?v=adjust')
  await expect(page).toHaveURL(/\/decider$/)
  await page.goto('/resultats?v=strategies')
  await expect(page).toHaveURL(/\/decider$/)
  await page.goto('/resultats?v=verify')
  await expect(page).toHaveURL(/\/resultats$/)
  await expect(page.locator('#solidite')).toBeInViewport({ timeout: 10_000 })
  // an unknown what-if is all closed; an unknown view is Résultats, the key dropped
  await page.goto('/decider?essai=nope')
  await expect(page.locator('#ajuster')).toBeVisible()
  await expect(page.locator('#epargner')).toHaveClass(/is-closed/)
  await page.goto('/resultats?v=nope')
  await expect(page).not.toHaveURL(/v=/)
})

test('« Preuve » › « Solidité »: the scenarios and a hard market in brief, the 3 × 3 grids one fold away, and the choice is in the address', async ({ page }) => {
  // Solidité opens from its block's address (the proof's blocks are closed when Résultats opens)
  await page.goto('/resultats?bloc=solidite')
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toBeVisible()
  await expect(page.locator('.sensitivity')).toHaveCount(0)
  await page.locator('#sensibilite > summary').click()
  await expect(page).toHaveURL(/solidite=grids/)
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.locator('#solidite').getByText('Selon le scénario')).toBeVisible() // the brief stays: one section, two depths
  // an address that names the grids opens them
  await page.goto('/resultats?bloc=solidite&solidite=grids')
  await expect(page.locator('.sensitivity')).toBeVisible()
  await expect(page.locator('#sensibilite')).toHaveAttribute('open', '')
})

test('« Comparer »: the departure ages are the first way, and a way that the household does not have is not offered', async ({ page }) => {
  // the golden couple has no kept plan: two ways, the ages and each of us
  await page.goto('/resultats?cartes=all')
  const ways = page.getByRole('tablist', { name: 'Façons de comparer' })
  await expect(ways.getByRole('tab')).toHaveText(['Âges de départ', 'Chacun de son côté'])
  await expect(page.locator('.scenarios')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.verdict__each')).toHaveCount(0)
  await ways.getByRole('tab', { name: 'Chacun de son côté' }).click()
  await expect(page.locator('.verdict__each')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.scenarios')).toHaveCount(0)
  await expect(page.locator('.chart-panel')).toHaveCount(0)
  // an address that names a way opens it
  await page.goto('/resultats?cartes=all&cv=each')
  await expect(page.locator('.verdict__each')).toBeVisible({ timeout: 60_000 })
})
