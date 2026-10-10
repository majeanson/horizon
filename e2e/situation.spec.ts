import { expect, test, type Page } from '@playwright/test'
import { blankSeed, EXAMPLE, seedProfile, type SeedProfile } from './seed'

// « Ma situation » — a few yes / no questions decide what the profile form shows: a household with no employer plan sees no plan section,
// one that has always lived here no residence year, and so on. A yes opens a section; a no over typed figures says what is lost first.

type Seed = { household: { persons: { salaryToday: number; pensions: unknown[]; oas: { residentSince: number }; birth: { year: number } }[]; spending: { workingToday: number; retiredToday: number } } }

const simple = (): SeedProfile => {
  const p = blankSeed() as unknown as Seed
  p.household.persons[0].salaryToday = 80_000
  return p as unknown as SeedProfile
}
// (a section inside a person's column is a level-3 heading; the household's are level 2)
const section = (page: Page, title: string) => page.getByRole('heading', { name: title })
const question = (page: Page, text: string | RegExp) => page.getByRole('radiogroup', { name: text })

test('a simple household sees only what concerns it — and the card says how to open the rest', async ({ page }) => {
  await seedProfile(page, simple())
  await page.goto('/profil?form=1')
  await expect(section(page, 'Ma situation')).toBeVisible()
  // no children, home, employer plan, years abroad or dated events: none of their sections, none of their fields
  await expect(section(page, 'Régimes de retraite de l’employeur')).toHaveCount(0)
  await expect(section(page, 'Résidence principale')).toHaveCount(0)
  await expect(section(page, 'Événements et revenus datés')).toHaveCount(0)
  await expect(page.getByText('Au Canada depuis (année)')).toHaveCount(0)
  await expect(page.getByPlaceholder('Année de naissance de l’enfant')).toHaveCount(0)
  // what every household has stays
  await expect(section(page, 'Budget')).toBeVisible()
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajouter mon ou ma partenaire' })).toBeVisible()
})

test('a yes opens its section; the answer is kept on this device; a no closes it again', async ({ page }) => {
  await seedProfile(page, simple())
  await page.goto('/profil?form=1')
  await question(page, /régime de retraite d’employeur/).getByRole('radio', { name: 'Oui' }).click()
  await expect(section(page, 'Régimes de retraite de l’employeur')).toBeVisible()
  await question(page, /Des années hors du Canada/).getByRole('radio', { name: 'Oui' }).click()
  await expect(page.getByText('Au Canada depuis (année)')).toBeVisible()
  await question(page, /Des enfants à la maison/).getByRole('radio', { name: 'Oui' }).click()
  await expect(page.getByPlaceholder('Année de naissance de l’enfant')).toBeVisible()
  await question(page, /Propriétaire de votre résidence/).getByRole('radio', { name: 'Oui' }).click()
  await expect(section(page, 'Résidence principale')).toBeVisible()
  await page.waitForFunction(() => (localStorage.getItem('horizon-situation') ?? '').includes('pension:self'))
  await page.reload()
  await expect(section(page, 'Régimes de retraite de l’employeur')).toBeVisible()
  await question(page, /régime de retraite d’employeur/).getByRole('radio', { name: 'Non' }).click()
  await expect(section(page, 'Régimes de retraite de l’employeur')).toHaveCount(0)
})

test('a no over typed figures asks first, says what is lost, and keeps everything on a refusal', async ({ page }) => {
  const withHome = structuredClone(EXAMPLE) as unknown as { household: { home: { value: number; mortgage: { balance: number; rate: number; monthlyPayment: number }; sale: null } | null } }
  withHome.household.home = { value: 450_000, mortgage: { balance: 120_000, rate: 0.05, monthlyPayment: 1_000 }, sale: null }
  await seedProfile(page, withHome as unknown as SeedProfile)
  await page.goto('/profil?form=1')
  // this household has a home: it shows without any answer, and the question reads « oui »
  await expect(section(page, 'Résidence principale')).toBeVisible()
  const home = question(page, /Propriétaire de votre résidence/)
  await expect(home.getByRole('radio', { name: 'Oui' })).toBeChecked()
  await home.getByRole('radio', { name: 'Non' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('La maison, son hypothèque et sa vente éventuelle seront effacées.')
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(section(page, 'Résidence principale')).toBeVisible()
  await home.getByRole('radio', { name: 'Non' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Effacer' }).click()
  await expect(section(page, 'Résidence principale')).toHaveCount(0)
})

test('a couple is asked once per person, by name', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil?form=1')
  for (const name of ['Camille', 'Alex']) await expect(page.getByRole('group', { name })).toContainText('Un régime de retraite d’employeur')
})

test('the documents list and the entry by document keep only what the household has use for', async ({ page }) => {
  await seedProfile(page, simple())
  await page.goto('/documents')
  // the budget, then the tax notice, the account statements and the QPP statement: no home papers, employer statement or proof of residence
  await expect(page.locator('.docs-item')).toHaveCount(4)
  await expect(page.getByText('Relevé de votre régime de retraite')).toHaveCount(0)
  await expect(page.getByText('Preuve de vos années au Canada')).toHaveCount(0)
  await page.goto('/saisie')
  await expect(page.getByText(/Étape 1 sur 5/)).toBeVisible()
  // answering yes brings the documents back
  await page.goto('/profil?form=1')
  await question(page, /régime de retraite d’employeur/).getByRole('radio', { name: 'Oui' }).click()
  await page.goto('/documents')
  await expect(page.locator('.docs-item')).toHaveCount(5)
  await expect(page.getByText('Relevé de votre régime de retraite')).toBeVisible()
})

test('the proof of residence is asked only of someone who lived abroad', async ({ page }) => {
  await seedProfile(page, simple())
  await page.goto('/profil?form=1')
  await expect(page.locator('[data-fact="self:residence"]')).toHaveCount(0)
  await page.getByText(/chiffres confirmés/).first().waitFor()
  const abroad = structuredClone(simple()) as unknown as Seed
  abroad.household.persons[0].oas.residentSince = abroad.household.persons[0].birth.year + 27
  await page.evaluate((p) => localStorage.setItem('horizon-profile', JSON.stringify(p)), abroad)
  await page.reload()
  await expect(page.locator('[data-fact="self:residence"]')).toBeVisible()
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, simple())
  await page.goto('/profil?form=1')
  await expect(section(page, 'My situation')).toBeVisible()
  await page.getByRole('radiogroup', { name: /Part-time work after you retire/ }).getByRole('radio', { name: 'Yes' }).click()
  await expect(page.getByRole('radiogroup', { name: /Part-time work after you retire/ }).getByRole('radio', { name: 'Yes' })).toBeChecked()
})

test('« Ma situation » is one of the first things on the page: right after who is in the household, before the housekeeping and before every section it decides', async ({ page }) => {
  await seedProfile(page, simple())
  await page.goto('/profil?form=1')
  await expect(section(page, 'Ma situation')).toBeVisible()
  // document order of the page's landmarks: who → what applies → the housekeeping (backup, doors, accuracy) → the sections the answers decide
  const order = await page.evaluate(() => {
    const at = (el: Element | null) => (el === null ? -1 : [...document.querySelectorAll('*')].indexOf(el))
    const heading = (text: string) => [...document.querySelectorAll('h2, h3')].find((h) => h.textContent?.trim() === text) ?? null
    return {
      family: at(heading('Famille')),
      situation: at(document.getElementById('situation')),
      doors: at(document.querySelector('.rail')),
      accuracy: at(document.querySelector('.accuracy-line')),
      budget: at(heading('Budget')),
      person: at(document.getElementById('person-self')),
    }
  })
  for (const [name, v] of Object.entries(order)) expect(v, name).toBeGreaterThan(-1)
  expect(order.family).toBeLessThan(order.situation)
  expect(order.situation).toBeLessThan(order.doors)
  expect(order.situation).toBeLessThan(order.accuracy)
  expect(order.situation).toBeLessThan(order.budget)
  expect(order.situation).toBeLessThan(order.person)
  // …and on a phone it is on the first screen's neighbour, not three screens down
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#situation').scrollIntoViewIfNeeded()
  const top = await page.locator('#situation').evaluate((el) => el.getBoundingClientRect().top + (document.getElementById('root')?.scrollTop ?? 0))
  expect(top, 'the card starts within the first two screens').toBeLessThan(844 * 2)
})
