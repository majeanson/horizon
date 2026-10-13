import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, seedProfile, showAllSections } from './seed'

// THE ORDER OF THE PAGES is a promise: what the person is asked comes in the order they would answer it — who, what applies, the people (income, then the age
// it stops; what they hold, then what they will be paid), then what the household spends — and a page's map lists its sections in the order they stand.
// A section moved on the page without its chip (or the other way round) fails here.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('Profil: the household, what applies, the people, then the household’s spending, home and events — and the backup line near the end', async ({ page }) => {
  const family = JSON.parse(JSON.stringify(EXAMPLE))
  family.household.children = [2022]
  family.household.childSpending = { perChild: 6_000, untilAge: 23 }
  family.household.home = { value: 400_000, mortgage: { balance: 100_000, rate: 0.05, monthlyPayment: 1_200, frequency: 'monthly', renewal: null }, sale: null }
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(family)] as const)
  await showAllSections(page)
  await page.goto('/profil?form=1')
  await expect(page.locator('#budget')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#exact')).toBeVisible() // the lazy card at the end
  // the order of the cards in the DOM: the household, the situation, the people, then the household's costs
  const order = await page.evaluate(() => {
    const at = (sel: string) => {
      const el = document.querySelector(sel)
      return el ? [...document.querySelectorAll('*')].indexOf(el) : -1
    }
    return { situation: at('#situation'), self: at('#person-self'), budget: at('#budget'), backup: at('.backup-line'), exact: at('#exact') }
  })
  expect(order.situation).toBeGreaterThan(0)
  expect(order.self).toBeGreaterThan(order.situation)
  expect(order.budget).toBeGreaterThan(order.self)
  expect(order.backup).toBeGreaterThan(order.budget) // the backup line closes the form
  expect(order.exact).toBeGreaterThan(order.backup)
  // inside a person: what they hold, then what they will be paid
  const sections = await page.locator('#person-self .profile-section').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(sections).toEqual(['À propos', 'Comptes', 'Régimes de retraite de l’employeur', 'Régime de rentes du Québec (RRQ)', 'Pension de la Sécurité de la vieillesse (PSV)'])
  // …and in the first card: the income before the age it stops
  const about = await page.locator('#person-self .profile-section').first().locator('.field-row__label').allInnerTexts()
  expect(about.findIndex((l) => /^Revenu de travail/.test(l.trim()))).toBeGreaterThan(-1)
  expect(about.findIndex((l) => /^Revenu de travail/.test(l.trim()))).toBeLessThan(about.findIndex((l) => /^Âge de retraite/.test(l.trim())))
  // the children’s cost rides inside the Budget card, after the two budgets
  await expect(page.locator('#budget').getByRole('radiogroup', { name: 'Où sont les enfants dans vos dépenses ?' })).toBeVisible()
})

test('Résultats: the map of Preuve and of Décider lists the sections in the order they stand', async ({ page }) => {
  for (const [view, ids] of [
    ['proof', ['solidite', 'donnees-calcul', 'tableau', 'precision', 'parametres']],
    ['decide', ['essayer', 'rentes', 'ordre', 'fonte']],
    ['answer', ['verdict', 'comparer', 'preciser', 'annee']],
  ] as const) {
    await page.goto(`/resultats?v=${view}`)
    await page.locator('.results-section, #verdict').first().waitFor({ timeout: 30_000 })
    const present = await page.evaluate((all) => all.filter((id) => document.getElementById(id)), [...ids])
    const positions = await page.evaluate((all) => all.map((id) => [...document.querySelectorAll('*')].indexOf(document.getElementById(id)!)), present)
    for (let i = 1; i < positions.length; i++) expect(positions[i], `${view}: « ${present[i]} » stands after « ${present[i - 1]} »`).toBeGreaterThan(positions[i - 1])
    // the chips follow the same order
    const chips = await page.locator('.section-nav a, .section-nav button, [aria-label] .rail a').evaluateAll((els) => els.map((e) => (e.getAttribute('href') ?? '').replace(/^.*#/, '')))
    const inNav = chips.filter((c) => (ids as readonly string[]).includes(c))
    if (inNav.length > 1) expect(inNav, `${view}: the map follows the page`).toEqual(present.filter((p) => inNav.includes(p)))
  }
})

test('Hypothèses: the market path stands right under the returns it shapes', async ({ page }) => {
  await page.goto('/hypotheses')
  await page.locator('.profile-section').first().waitFor({ timeout: 30_000 })
  const titles = await page.locator('.profile-section').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(titles.indexOf('Le parcours des marchés')).toBe(titles.indexOf('Ce que rapportent vos placements') + 1)
})
