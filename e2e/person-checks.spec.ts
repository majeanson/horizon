import { expect, test, type Locator, type Page } from '@playwright/test'
import { savedProfile, seedProfile } from './seed'

// « Vérifier avec mes relevés »: the year's net pay against what the salary leaves, and what was put into an account against what it is worth. Checks only — the plan never reads them.

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil?form=1')
})

const fold = (page: Page): Locator => page.locator('#person-self').locator('details.fold', { hasText: 'Vérifier avec mes relevés' })

async function type(sheet: Locator, name: string | RegExp, value: string) {
  const box = sheet.getByRole('textbox', { name })
  await box.fill(value)
  await box.press('Enter')
}

test('a net pay far under what the salary leaves says what is withheld at the source, and the same figure says « the same »', async ({ page }) => {
  const f = fold(page)
  await f.locator('summary').click()
  await expect(f.getByRole('status')).toHaveCount(0) // nothing typed, nothing said
  await type(f, 'Paie nette reçue par année', '10000')
  const said = f.getByRole('status').first()
  await expect(said).toContainText(/Le calcul donne .+ par année après impôt et cotisations, soit .+ de plus que votre paie nette/)
  await expect(said).toContainText('retenu en plus à la source')
  // Typed back, the calculation's own figure is the same figure.
  const expected = ((await said.innerText()).match(/donne ([\d\s  ]+)\s*\$/) ?? [])[1].replace(/\D/g, '')
  await type(f, 'Paie nette reçue par année', expected)
  await expect(f.getByRole('status').first()).toContainText(/la même chose, à peu de chose près/)
})

test('a net pay above the calculation says so', async ({ page }) => {
  const f = fold(page)
  await f.locator('summary').click()
  await type(f, 'Paie nette reçue par année', '5000000')
  await expect(f.getByRole('status').first()).toContainText(/Votre paie nette dépasse de .+ ce que le calcul donne/)
})

test('the net pay is kept in the profile, cleared when emptied, and never confirms anything', async ({ page }) => {
  const f = fold(page)
  await f.locator('summary').click()
  await type(f, 'Paie nette reçue par année', '73773')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].netPayYearly).toBe(73_773)
  expect(((await savedProfile(page)).confirmed as string[]).filter((id) => /netPay/i.test(id))).toEqual([])
  await type(f, 'Paie nette reçue par année', '')
  await expect.poll(async () => 'netPayYearly' in (await savedProfile(page)).household.persons[0]).toBe(false)
})

test('an account worth far less than what it received says so, with the return the plan assumes for it', async ({ page }) => {
  const balance: number = (await savedProfile(page)).household.persons[0].accounts.tfsa.balance
  const f = fold(page)
  await f.locator('summary').click()
  await type(f, 'Total déposé (CELI)', String(balance * 3))
  const said = f.getByRole('status').filter({ hasText: 'Vous y avez mis' })
  await expect(said).toContainText(/le compte vaut .+ \(.67\s%\)/)
  await expect(said).toContainText('Le compte vaut nettement moins que ce qu’il a reçu')
  await expect(said).toContainText(/Le plan suppose 4,5\s% par année/)
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.tfsa.deposited).toBe(balance * 3)
})

test('an account that gained is said without a warning', async ({ page }) => {
  const balance: number = (await savedProfile(page)).household.persons[0].accounts.rrsp.balance
  const f = fold(page)
  await f.locator('summary').click()
  await type(f, 'Total déposé (REER)', String(Math.round(balance / 2)))
  const said = f.getByRole('status').filter({ hasText: 'Vous y avez mis' })
  await expect(said).toContainText(/\(\+100\s%\)/)
  await expect(said).not.toContainText('nettement moins')
})

test('the fold is closed until asked for, one per person', async ({ page }) => {
  await expect(page.locator('details.fold', { hasText: 'Vérifier avec mes relevés' })).toHaveCount(2)
  await expect(fold(page)).not.toHaveAttribute('open', '')
})
