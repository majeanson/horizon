import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile, showAllSections, type SeedProfile } from './seed'

// A life beyond the budget (schema v16): what a child costs until they leave, work kept after retirement, dated events and income, and
// spending that slows with age. The unit tests pin the engine; this pins that a PERSON can drive each one and that it reaches the answer.

const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })

test.describe('on Profil', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page)
    await showAllSections(page) // « Ma situation »: these tests drive sections that are shown once the question is answered « oui »
  })

  test('what a child costs: typed, saved, and said in a line', async ({ page }) => {
    await page.goto('/profil?form=1')
    const cost = box(page, 'Ce que coûte chaque enfant, par année')
    await cost.fill('6000')
    await cost.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.childSpending).toEqual({ perChild: 6000, untilAge: 23 })
    await expect(page.getByText(/quittent la maison à partir de 2035/)).toBeVisible()
    // Back to nothing: the cost is not counted.
    await cost.fill('0')
    await cost.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.childSpending).toBeNull()
  })

  test('work kept after retirement: off by default, on with two figures, saved per person', async ({ page }) => {
    await page.goto('/profil?form=1')
    const first = page.locator('#person-self')
    await expect(first.getByRole('radio', { name: 'Je m’arrête complètement' })).toBeChecked()
    await first.getByRole('radio', { name: 'Je continue de travailler' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].partTime).toEqual({ share: 0.4, untilAge: 63 })
    const until = first.getByRole('textbox', { name: 'Jusqu’à (âge)' })
    await until.fill('65')
    await until.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].partTime?.untilAge).toBe(65)
    await expect(first.getByText(/De 60 à 65 ans/)).toBeVisible()
    await first.getByRole('radio', { name: 'Je m’arrête complètement' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].partTime).toBeNull()
  })

  test('a dated event: added from a starting point, edited, saved, and removed with a confirmation that says what is lost', async ({ page }) => {
    await page.goto('/profil?form=1')
    await page.getByRole('button', { name: 'Ajouter · Un héritage' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows.length).toBe(1)
    const amount = box(page, 'Montant')
    await amount.fill('250000')
    await amount.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.flows[0].amount).toBe(250000)
    await expect(page.getByText(/250\s000\s\$\sreçus en 20\d\d/)).toBeVisible()
    await page.getByRole('button', { name: /Retirer « Un héritage »/ }).click()
    await expect(page.getByRole('alertdialog')).toContainText('il sort du calcul')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows.length).toBe(0)
  })

  test('an income can be taxed or not, and is the first person’s or the partner’s', async ({ page }) => {
    await page.goto('/profil?form=1')
    await page.getByRole('button', { name: 'Ajouter · Un loyer reçu' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0]?.kind).toBe('income')
    const flow = page.locator('.flow').first()
    await flow.getByRole('radio', { name: 'Alex' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0].owner).toBe('spouse')
    await flow.getByRole('button', { name: 'Imposable' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0].taxable).toBe(false)
  })
})

// « Dépenses à prévoir » (schema v23): the starting points that rest on a Statistics Canada average or a stated rule. An event added from one is an ESTIMATE — marked,
// with what it rests on and where it was read — until the person types another amount or confirms it.
test.describe('expenses to plan for', () => {
  /** The golden couple, owners with a 266 000 $ mortgage on a 650 000 $ home: the house's two starting points exist, and the tenure is « avec hypothèque ». */
  const owners = (): SeedProfile => {
    const p = structuredClone(EXAMPLE) as SeedProfile & { household: { home: unknown } }
    p.household.home = { value: 650000, mortgage: { balance: 266000, rate: 0.05, monthlyPayment: 1761.11 }, sale: null }
    return p
  }
  const flowsOf = async (page: Page) => (await savedProfile(page)).household.flows as { label: string; amount: number; estimate?: string; fromYear: number; toYear: number }[]

  test.beforeEach(async ({ page }) => {
    await seedProfile(page, owners())
    await showAllSections(page)
    await page.goto('/profil?form=1')
  })

  test('the house\'s upkeep: offered apart, added as an estimate with its Statistics Canada average, its source in the reader\'s language', async ({ page }) => {
    await expect(page.getByText('Dépenses à prévoir', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Ajouter · Entretien et réparations de la maison' }).click()
    await expect.poll(async () => (await flowsOf(page)).length).toBe(1)
    const [flow] = await flowsOf(page)
    expect(flow).toMatchObject({ estimate: 'upkeep', amount: 1667 }) // owners WITH a mortgage: Survey of Household Spending 2023
    expect(flow.toYear).toBeGreaterThan(flow.fromYear)
    // It says it is an estimate, and under a fold what it rests on and where it was read.
    const card = page.locator('.flow').first()
    await expect(card.locator('.est')).toHaveText('estimé')
    await card.getByText(/D’où vient ce montant/).click()
    await expect(card.getByText(/Moyenne annuelle des propriétaires avec hypothèque au Canada \(2023\)/)).toBeVisible()
    const link = card.getByRole('link', { name: /Statistique Canada, tableau 11-10-0225-01/ })
    await expect(link).toHaveAttribute('href', 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1110022501')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('the renovation reserve is the 1 % rule less the upkeep, and says it is a rule — with no link, because no official page has it', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter · Réserve de rénovations' }).click()
    await expect.poll(async () => (await flowsOf(page)).length).toBe(1)
    expect((await flowsOf(page))[0]).toMatchObject({ estimate: 'renovation', amount: 4800 }) // 6 500 − 1 667, to the hundred
    const card = page.locator('.flow').first()
    await card.getByText(/D’où vient ce montant/).click()
    await expect(card.getByText(/Règle courante, pas un chiffre officiel/)).toBeVisible()
    await expect(card.getByText(/moins les .*1.667.* déjà comptés à l’entretien/)).toBeVisible()
  })

  test('typing another amount makes the figure the person\'s own: the mark goes, and the starting point is not offered again beside it', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter · Remplacement des voitures' }).click()
    await expect.poll(async () => (await flowsOf(page))[0]?.estimate).toBe('vehicle')
    const amount = box(page, 'Montant par année')
    await amount.fill('4000')
    await amount.press('Enter')
    await expect.poll(async () => (await flowsOf(page))[0].amount).toBe(4000)
    expect((await flowsOf(page))[0]).not.toHaveProperty('estimate')
    await expect(page.locator('.flow .est')).toHaveCount(0)
    // Still under its own name: another one would count the cars twice.
    await expect(page.getByRole('button', { name: 'Ajouter · Remplacement des voitures' })).toHaveCount(0)
  })

  test('« Confirmer ce montant » keeps the figure and drops only the mark', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter · Entretien et réparations de la maison' }).click()
    await expect.poll(async () => (await flowsOf(page))[0]?.estimate).toBe('upkeep')
    await page.locator('.flow').first().getByRole('button', { name: 'Confirmer ce montant' }).click()
    await expect.poll(async () => (await flowsOf(page))[0]).not.toHaveProperty('estimate')
    expect((await flowsOf(page))[0].amount).toBe(1667)
    await expect(page.locator('.flow .est')).toHaveCount(0)
  })

  test('removing it offers it again', async ({ page }) => {
    const chip = page.getByRole('button', { name: 'Ajouter · Entretien et réparations de la maison' })
    await chip.click()
    await expect(chip).toHaveCount(0)
    await page.getByRole('button', { name: /Retirer « Entretien et réparations de la maison »/ }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
    await expect(chip).toBeVisible()
  })

  test('a plain starting point is an estimate too, and says no statistic backs it', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter · Un projet' }).click()
    await expect.poll(async () => (await flowsOf(page))[0]?.estimate).toBe('project')
    const card = page.locator('.flow').first()
    await card.getByText(/D’où vient ce montant/).click()
    await expect(card.getByText(/Un point de départ, pas une statistique/)).toBeVisible()
    await expect(card.getByRole('link')).toHaveCount(0)
    // The name is the person's own words.
    const name = box(page, 'Nom')
    await name.fill('Un voyage en famille')
    await name.press('Enter')
    await expect.poll(async () => (await flowsOf(page))[0].label).toBe('Un voyage en famille')
    expect((await flowsOf(page))[0].estimate).toBe('project') // the name does not move the amount it rests on
  })
})

test('a household with no home is offered the cars only, with the renters’ average', async ({ page }) => {
  await seedProfile(page) // the golden couple: no home entered
  await showAllSections(page)
  await page.goto('/profil?form=1')
  await expect(page.getByText('Dépenses à prévoir', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajouter · Entretien et réparations de la maison' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ajouter · Réserve de rénovations' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ajouter · Remplacement des voitures' }).click()
  await expect.poll(async () => ((await savedProfile(page)).household.flows[0] ?? {}).amount).toBe(2839)
  await page.locator('.flow').first().getByText(/D’où vient ce montant/).click()
  await expect(page.getByText(/Moyenne annuelle des locataires au Canada \(2023\)/)).toBeVisible()
})

test('on Hypothèses: spending that slows with age is a choice of pace, saved', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/hypotheses')
  await page.getByRole('radio', { name: '1 % de moins par année' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.retiredSpendingDrift).toBe(-0.01)
  await page.getByRole('radio', { name: 'Au même niveau' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.retiredSpendingDrift).toBe(0)
})

test.describe('it reaches the answer', () => {
  const withFlows = (flows: unknown[]): SeedProfile => {
    const p = structuredClone(EXAMPLE) as SeedProfile & { household: { flows: unknown[] } }
    p.household.flows = flows
    return p
  }

  test('a large dated expense moves the answer later; the answer on arrival says so on Profil', async ({ page }) => {
    await seedProfile(page, withFlows([{ label: 'Toit', kind: 'expense', amount: 90000, fromYear: 2030, toYear: 2055, owner: 'self', taxable: false }]))
    await page.goto('/resultats')
    // 90 000 $ a year more than the budget, for twenty-five years: no age works any more (the example answers 59 without it).
    await expect(page.getByText(/l’argent ne suffit pas encore/)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('59 ans', { exact: true })).toHaveCount(0)
  })

  test('the printed year-by-year and the charts name the dated income in the work bar', async ({ page }) => {
    await seedProfile(page, withFlows([{ label: 'Loyer', kind: 'income', amount: 15000, fromYear: 2040, toYear: 2060, owner: 'self', taxable: true }]))
    await page.goto('/resultats?v=strategies&bv=years')
    await expect(page.getByText('Travail et autres revenus').first()).toBeVisible({ timeout: 60_000 })
  })
})
