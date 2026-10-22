import { expect, test, type Page } from '@playwright/test'
import { blankSeed, EXAMPLE, PROFILE_KEY, seedProfile } from './seed'
import { expectNoHorizontalOverflow } from './overflow'

// « Ma fiche » (/fiche): the household at a glance — the verdict, the plan’s line, today and once retired, what it holds (the money to live on apart from the
// pensions and the home), what would sharpen the answer; every card leads to where its figure changes.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

const settled = (page: Page) =>
  page.waitForFunction(() => {
    const t = document.querySelector('.sheet')?.textContent ?? ''
    return t.length > 0 && !t.includes('Calcul en cours') && !t.includes('Working it out')
  }, null, { timeout: 30_000 })

test('the header leads to the sheet, which shows five stats, each with its figure and a bar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^Ma fiche/ }).click()
  await expect(page).toHaveURL(/\/fiche$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ma fiche')
  await settled(page)
  await expect(page.locator('.sheet--serious')).toBeVisible()
  // on arrival only the first card is open: the verdict's two measures
  await expect(page.locator('.sheet__stat')).toHaveCount(2)
  await page.goto('/fiche?bloc=tout')
  await settled(page)
  await expect(page.locator('.sheet__stat')).toHaveCount(5)
  await expect(page.locator('.sheet-bar[role="meter"]')).toHaveCount(5)
  for (const name of ['Âge le plus tôt', 'Rentes', 'Épargne', 'Ce qui reste', 'Solidité']) await expect(page.locator('.sheet__stat-name', { hasText: name })).toBeVisible()
  // the example's earliest age is the one the answer gives
  await expect(page.locator('.sheet__stat', { hasText: 'Âge le plus tôt' }).locator('.sheet__stat-value')).toHaveText(/60\s*ans/)
  // what a full bar stands for is one tap away, in words
  await page.locator('.fold summary').first().click()
  await expect(page.locator('.sheet__scale').first()).toContainText('Barre pleine')
})

test('the page reads in the order of the questions: verdict, today, once retired, what it holds, what would sharpen the answer', async ({ page }) => {
  await page.goto('/fiche?bloc=tout')
  await settled(page)
  await expect(page.locator('.sheet h2')).toHaveText(['Où vous en êtes', 'Votre plan en une ligne', 'Aujourd’hui', 'À la retraite', 'Ce que vous détenez', 'Coussin de liquidités', 'Ce que coûte un enfant, selon Statistique Canada', 'Ce qui préciserait la réponse'])
  // the verdict holds the earliest age and the plan's sturdiness; the plan's line sits right under it
  await expect(page.locator('.sheet__section').first().locator('.sheet__stat-name')).toHaveText(['Âge le plus tôt', 'Solidité'])
  await expect(page.locator('.sheet__section').first().getByRole('link', { name: 'Voir la réponse' })).toHaveAttribute('href', '/resultats')
  await expect(page.locator('.timeline')).toBeVisible()
})

test('what it holds keeps the money to live on apart: totalled, shared out, and each card leads to its own field', async ({ page }) => {
  await page.goto('/fiche?bloc=fiche-detenu')
  await settled(page)
  const holds = page.locator('.sheet__section', { hasText: 'Ce que vous détenez' })
  await expect(holds).toContainText(/Total\s:/)
  await expect(holds.locator('.sheet__slot', { hasText: 'du total' }).first()).toBeVisible()
  await expect(holds.locator('.sheet__slot-title').first()).toHaveAttribute('href', /^\/profil\?fact=/)
  // the money to live on is its own group, headed apart from the pensions and the home
  await expect(holds.locator('h3').first()).toHaveText('Épargne et placements')
})

test('on a phone the sheet does not run off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/fiche?bloc=tout')
  await expect(page.locator('.sheet--serious')).toBeVisible({ timeout: 30_000 })
  await settled(page)
  await expectNoHorizontalOverflow(page, '.sheet')
})

test('in English the sheet speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/fiche')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My sheet')
  await settled(page)
  await expect(page.locator('.sheet__stat-name', { hasText: 'Earliest age' })).toBeVisible()
})

test('a household already retired has no runway to draw, and a blank profile is asked to start', async ({ page }) => {
  await page.goto('/donnees?autres=examples')
  await page.getByRole('button', { name: 'Couple à la retraite', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/fiche?bloc=tout')
  await settled(page)
  await expect(page.locator('.sheet__stat', { hasText: 'Âge le plus tôt' })).toContainText('Tout le monde est déjà à la retraite')
  await expect(page.locator('.sheet__stat', { hasText: 'Épargne' })).toContainText('Personne ne travaille plus')
})

test('a blank profile gets a way to the profile, and nothing invented', async ({ page }) => {
  // the example was seeded first (beforeEach); this init script runs after it and puts the blank profile where it was
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(blankSeed())])
  await page.goto('/fiche')
  await expect(page.locator('.sheet__empty')).toContainText('Entrez un revenu')
  await expect(page.locator('.sheet__empty').getByRole('link', { name: 'Aller au profil' })).toHaveAttribute('href', '/profil')
  for (const v of await page.locator('.sheet__stat-value').allInnerTexts()) expect(v).toBe('Rien à montrer')
})

test('what would sharpen the answer is ranked, and each figure leads to its own field', async ({ page }) => {
  await page.goto('/fiche?bloc=fiche-preciser')
  await settled(page)
  const section = page.locator('.sheet__section', { hasText: 'Ce qui préciserait la réponse' })
  await expect(section.locator('.sheet__mover').first()).toBeVisible({ timeout: 45_000 })
  expect(await section.locator('.sheet__mover').count()).toBeLessThanOrEqual(4)
  await expect(section.locator('.sheet__mover').first().getByRole('link')).toHaveAttribute('href', /^\/profil\?fact=/)
})

test('on the narrowest phones the header leaves the sheet button out, and the settings page still leads there', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/profil')
  await expect(page.locator('.shell__sheet')).toBeHidden()
  await page.goto('/donnees')
  await page.getByRole('link', { name: 'Ouvrir ma fiche' }).click()
  await expect(page).toHaveURL(/\/fiche$/)
  // wide enough for it: the button is there
  await page.setViewportSize({ width: 390, height: 800 })
  await expect(page.locator('.shell__sheet')).toBeVisible()
})

// What the profile SAYS about the household — the cash buffer, what the children cost — is read on the sheet, not among the fields of Profil. The choices that act on the
// children's cost stay on Profil, with a door to the numbers.
test('the cash buffer and what the children cost are read on the sheet, and no longer sit among Profil’s fields', async ({ page }) => {
  await page.goto('/fiche?bloc=tout')
  await settled(page)
  const buffer = page.locator('#coussin')
  await expect(buffer).toContainText('Coussin de liquidités')
  await expect(buffer).toContainText(/Environ .+ mois de dépenses de retraite en liquidités/)
  // the rule of thumb is one tap away
  await expect(buffer.getByText('Cette zone est un repère courant')).toBeHidden()
  await buffer.getByText('Ce que ce repère veut dire').click()
  await expect(buffer.getByText('Cette zone est un repère courant')).toBeVisible()
  // the golden couple has two children at home: their cost is on the sheet too
  const kids = page.locator('#enfants')
  await expect(kids).toContainText('Ce que coûte un enfant, selon Statistique Canada')
  await expect(kids.locator('.kids-cost__bands li')).toHaveCount(4)
  await expect(kids.getByText('D’où viennent ces chiffres?')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  // Profil holds neither readout
  await page.goto('/profil?bloc=tout')
  await expect(page.getByRole('heading', { name: 'Coussin de liquidités' })).toHaveCount(0)
  await expect(page.locator('.kids-cost__bands')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Voir ce que ça coûte sur Ma fiche' })).toBeVisible()
})

test('« Les dates de votre plan » is one tap under the plan’s line, one row a year with the ages, and says what the profile says', async ({ page }) => {
  await page.goto('/fiche?bloc=fiche-ligne')
  await settled(page)
  const fold = page.locator('.plan-calendar-fold')
  await expect(fold).toBeVisible()
  await expect(fold.locator('.plan-calendar')).toBeHidden() // closed until asked for
  await fold.locator('summary').click()
  const rows = fold.locator('.plan-calendar__year')
  expect(await rows.count()).toBeGreaterThan(3)
  // the example couple: both retire at 60 (born 1978 and 1981 → 2038 and 2043 by their own ages), and the year says both ages
  await expect(fold.getByText('Retraite — Camille')).toBeVisible()
  await expect(fold.locator('.plan-calendar__when').first()).toContainText('ans')
  // the years run in order
  const years = (await fold.locator('.plan-calendar__when').allTextContents()).map((t) => Number(t.match(/\d{4}/)![0]))
  expect(years).toEqual([...years].sort((a, b) => a - b))
  await expectNoHorizontalOverflow(page)
})

test('the sheet has its map, like every long page: each chip is a section by its own title, and a chip lands on it', async ({ page }) => {
  await page.goto('/fiche')
  const map = page.getByRole('navigation', { name: 'Sections de la fiche' })
  await expect(map).toBeVisible()
  for (const name of ['Où vous en êtes', 'Ce que vous détenez']) await expect(map.getByRole('button', { name })).toBeVisible()
  await map.getByRole('button', { name: 'Ce que vous détenez' }).click()
  await expect(page.locator('#fiche-detenu')).toBeInViewport()
})

// Every section is a card of the accordion, and on arrival only the FIRST one is open — the rest show their title and one sentence until asked for.
test('every section is a card, and only the first is open on arrival', async ({ page }) => {
  await page.goto('/fiche')
  await settled(page)
  const toggles = page.locator('.sheet .accordion__toggle')
  await expect(toggles).toHaveCount(8)
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.sheet .accordion__toggle[aria-expanded="true"]')).toHaveCount(1)
  // a closed card still says what it is for
  await expect(page.locator('#fiche-detenu .accordion__summary')).toContainText('Les comptes, les rentes et la maison')
  // a tap opens it, and the first one closes: one at a time
  await page.locator('#fiche-detenu .accordion__toggle').click()
  await expect(page.locator('#fiche-detenu .accordion__toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.sheet .accordion__toggle[aria-expanded="true"]')).toHaveCount(1)
})
