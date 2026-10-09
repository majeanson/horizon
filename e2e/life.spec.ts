import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile, type SeedProfile } from './seed'

// A life beyond the budget (schema v16): what a child costs until they leave, work kept after retirement, dated events and income, and
// spending that slows with age. The unit tests pin the engine; this pins that a PERSON can drive each one and that it reaches the answer.

const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })

test.describe('on Profil', () => {
  test.beforeEach(async ({ page }) => seedProfile(page))

  test('what a child costs: typed, saved, and said in a line', async ({ page }) => {
    await page.goto('/?form=1')
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
    await page.goto('/?form=1')
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
    await page.goto('/?form=1')
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
    await page.goto('/?form=1')
    await page.getByRole('button', { name: 'Ajouter · Un loyer reçu' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0]?.kind).toBe('income')
    const flow = page.locator('.flow').first()
    await flow.getByRole('radio', { name: 'Alex' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0].owner).toBe('spouse')
    await flow.getByRole('button', { name: 'Imposable' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.flows[0].taxable).toBe(false)
  })
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
    await page.goto('/resultats?v=strategies')
    await expect(page.getByText('Travail et autres revenus').first()).toBeVisible({ timeout: 60_000 })
  })
})
