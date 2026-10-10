import { expect, test } from '@playwright/test'
import { blankSeed, EXAMPLE, seedProfile, type SeedProfile } from './seed'

// « Je ne connais pas mes chiffres » — a level (modeste · moyen · aisé) fills every blank figure from what Statistics Canada says households of
// the same age hold and spend; the answer is shown at each level; a figure typed or confirmed is never replaced.

type Seed = { household: { persons: { salaryToday: number; accounts: { rrsp: { balance: number }; tfsa: { balance: number }; nonReg: { balance: number } } }[]; spending: { workingToday: number; retiredToday: number } } }

const blankWithSalary = (): SeedProfile => {
  const p = blankSeed() as unknown as Seed
  p.household.persons[0].salaryToday = 90_000
  return p as unknown as SeedProfile
}
const rrsp = (page: import('@playwright/test').Page) => page.locator('[data-fact="self:rrspBalance"] input')
const tfsa = (page: import('@playwright/test').Page) => page.locator('[data-fact="self:tfsaBalance"] input')

test('a level fills every blank figure at once, says it is an estimate, and one tap takes it back', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  await expect(page.getByRole('heading', { name: 'Je ne connais pas mes chiffres' })).toBeVisible()
  await expect(rrsp(page)).toHaveValue(/^0?$/)
  await page.getByRole('radio', { name: 'Moyen', exact: true }).click()
  await expect(page.getByText(/chiffres remplis avec ce niveau/)).toBeVisible()
  // 45 years old: the 45-to-54 median RRSP (72 600 $) moved by the middle fifth (40 000 / 60 000) = 48 000 $
  await expect(rrsp(page)).toHaveValue(/48.?000/)
  await expect(tfsa(page)).not.toHaveValue(/^0?$/)
  // nothing is confirmed by an estimate
  await expect(page.getByText(/^0 sur \d+ chiffres confirmés/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(rrsp(page)).toHaveValue(/^0?$/)
  // the three levels are ordered
  await page.getByRole('radio', { name: 'Modeste', exact: true }).click()
  const modest = Number((await rrsp(page).inputValue()).replace(/\D/g, ''))
  await page.getByRole('radio', { name: 'Aisé', exact: true }).click()
  const comfortable = Number((await rrsp(page).inputValue()).replace(/\D/g, ''))
  expect(modest).toBeGreaterThan(0)
  expect(comfortable).toBeGreaterThan(modest * 3)
})

test('a later visit says which level the estimated figures stand at', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  await page.getByRole('radio', { name: 'Moyen', exact: true }).click()
  await expect(rrsp(page)).toHaveValue(/48.?000/)
  // the profile is written a beat after the tap: reload only once it is on the device
  await page.waitForFunction(() => (localStorage.getItem('horizon-profile') ?? '').includes('"balance":48000'))
  await page.reload()
  await expect(page.getByText(/correspondent au niveau .+Moyen/)).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Moyen', exact: true })).toBeChecked()
})

test('a figure the person typed is never replaced, and the level can be changed', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  await rrsp(page).fill('61234')
  await rrsp(page).blur()
  await page.getByRole('radio', { name: 'Aisé', exact: true }).click()
  await expect(rrsp(page)).toHaveValue(/61.?234/)
  await expect(tfsa(page)).not.toHaveValue(/^0?$/)
})

test('« Je ne sais pas » under one figure fills that figure only, and goes away once the person types', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  const helper = page.locator('fieldset.account-group').first().locator('.level-helper')
  await helper.getByRole('button', { name: 'Je ne sais pas' }).click()
  await helper.getByRole('radio', { name: /^Modeste · / }).click()
  await expect(rrsp(page)).toHaveValue(/19.?000/)
  await expect(tfsa(page)).toHaveValue(/^0?$/)
  await rrsp(page).fill('50000')
  await rrsp(page).blur()
  await expect(page.locator('[data-fact="self:rrspBalance"]').locator('xpath=following-sibling::*[contains(@class,"level-helper")]')).toHaveCount(0)
})

test('the where-from line names the official tables, in the reader\'s language', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  await page.getByRole('button', { name: 'D’où viennent ces chiffres?' }).click()
  await expect(page.getByRole('link', { name: /Actifs et dettes détenus selon le type de famille économique/ })).toHaveAttribute('href', /statcan\.gc\.ca\/t1\/tbl1\/fr\/tv\.action\?pid=1110001601/)
  await expect(page.getByRole('link', { name: /Dépenses des ménages selon le type de ménage/ })).toBeVisible()
  await expect(page.locator('.levels-table')).toContainText('Modeste')
})

test('the answer is shown at each level while a figure is open — and not at all when every figure is entered', async ({ page }) => {
  const open = structuredClone(EXAMPLE) as unknown as Seed
  // one of the two has no balance at all: that person has not looked yet
  const accounts = open.household.persons[0].accounts
  accounts.rrsp.balance = 0
  accounts.tfsa.balance = 0
  accounts.nonReg.balance = 0
  await seedProfile(page, open as unknown as SeedProfile)
  await page.goto('/resultats')
  await expect(page.getByText('Selon le niveau de vie')).toBeVisible({ timeout: 60_000 })
  for (const name of ['Modeste', 'Moyen', 'Aisé']) await expect(page.locator('.level-range .levers__item strong', { hasText: new RegExp(`^${name}$`) })).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.level-range')).toContainText(/dès \d+ ans|dès maintenant|pas avant/)
})

test('a household with every figure entered sees neither the picker nor the range', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil?form=1')
  await expect(page.getByRole('heading', { name: 'Famille' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Je ne connais pas mes chiffres' })).toHaveCount(0)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Selon le niveau de vie')).toHaveCount(0)
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  await expect(page.getByRole('heading', { name: 'I do not know my numbers' })).toBeVisible()
  await page.getByRole('radio', { name: 'Comfortable', exact: true }).click()
  await expect(page.getByText(/figures filled with this level/)).toBeVisible()
})

test('the retirement budget can be set as observed or cautiously, and the screen says why', async ({ page }) => {
  await seedProfile(page, blankWithSalary())
  await page.goto('/profil?form=1')
  const retired = page.locator('[data-fact="household:spendingRetired"] input')
  const amount = async () => Number((await retired.inputValue()).replace(/\D/g, ''))
  await page.getByRole('radio', { name: 'Moyen', exact: true }).click()
  await expect(retired).not.toHaveValue(/^0?$/)
  const observed = await amount()
  const working = Number((await page.locator('[data-fact="household:spendingWorking"] input').inputValue()).replace(/\D/g, ''))
  expect(observed / working).toBeGreaterThan(0.66)
  expect(observed / working).toBeLessThan(0.7)
  // the cautious choice re-fills what the level filled — to at least 80 % — and leaves the working budget alone
  await page.getByRole('radio', { name: /Prudent : au moins/ }).click()
  await expect.poll(amount).toBeGreaterThan(observed)
  expect((await amount()) / working).toBeGreaterThan(0.79)
  expect(Number((await page.locator('[data-fact="household:spendingWorking"] input').inputValue()).replace(/\D/g, ''))).toBe(working)
  await expect(page.getByText(/Ce seuil est un choix d’Horizon, pas un chiffre officiel/)).toBeVisible()
  // the chosen basis is kept
  await page.waitForFunction(() => localStorage.getItem('horizon-level-basis') === 'cautious')
  await page.reload()
  await expect(page.getByRole('radio', { name: /Prudent : au moins/ })).toBeChecked()
})
