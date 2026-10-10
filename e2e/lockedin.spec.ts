import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// THE LOCKED-IN PART OF THE REER (an RVER's employer share, a CRI, a FRV). Most people have none, so it is ONE folded line under the
// REER group: nothing is asked until it is opened; it opens by itself when a value is there; folding never clears a value.

const TOGGLE = /^Une partie est immobilisée/

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

const reer = (page: Page) => page.locator('#person-self .account-group', { hasText: 'REER' }).first()
const box = (page: Page, name: string) => page.locator('#person-self').getByRole('textbox', { name, exact: true })

test('for someone with nothing locked the form is as it was: three boxes and one folded line, no extra field', async ({ page }) => {
  await page.goto('/profil')
  const group = reer(page)
  await expect(group.getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-expanded', 'false')
  await expect(box(page, 'Dont immobilisé')).toHaveCount(0)
  await expect(box(page, 'Cotisation de l’employeur par année')).toHaveCount(0)
  // the three REER boxes are there, untouched
  await expect(group.getByRole('textbox')).toHaveCount(3)
})

test('opening it asks two things; both are saved; folding keeps them and says so; a value above the balance is refused', async ({ page }) => {
  await page.goto('/profil')
  const group = reer(page)
  await group.getByRole('button', { name: TOGGLE }).click()
  await expect(group.getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-expanded', 'true')
  const locked = box(page, 'Dont immobilisé')
  await locked.fill('10000')
  await locked.press('Enter')
  const employer = box(page, 'Cotisation de l’employeur par année')
  await employer.fill('2000')
  await employer.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.rrsp).toMatchObject({ lockedIn: 10_000, employerContribution: 2_000 })
  // folded, the line carries the amount — nothing is hidden and forgotten — and the value stays saved
  await group.getByRole('button', { name: TOGGLE }).click()
  await expect(group.getByRole('button', { name: TOGGLE })).toContainText('10 000')
  await expect(box(page, 'Dont immobilisé')).toHaveCount(0)
  expect((await savedProfile(page)).household.persons[0].accounts.rrsp.lockedIn).toBe(10_000)
  // more locked than there is in the account: the box says so, and nothing is saved
  await group.getByRole('button', { name: TOGGLE }).click()
  await locked.fill('99999999')
  await locked.press('Enter')
  await expect(page.locator('#person-self').getByRole('alert').filter({ hasText: 'Entre 0 et' })).toBeVisible()
  expect((await savedProfile(page)).household.persons[0].accounts.rrsp.lockedIn).toBe(10_000)
})

test('lowering the REER balance lowers the locked part with it', async ({ page }) => {
  await page.goto('/profil')
  const group = reer(page)
  await group.getByRole('button', { name: TOGGLE }).click()
  const locked = box(page, 'Dont immobilisé')
  await locked.fill('30000')
  await locked.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.rrsp.lockedIn).toBe(30_000)
  const balance = group.getByRole('textbox').first()
  await balance.fill('20000')
  await balance.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.rrsp).toMatchObject({ balance: 20_000, lockedIn: 20_000 })
})

test('« où trouver ce chiffre »: the statement’s « immobilisé » part, with the official page', async ({ page }) => {
  await page.goto('/profil')
  await reer(page).getByRole('button', { name: TOGGLE }).click()
  const row = page.locator('#person-self [data-fact="self:rrspLocked"]')
  await row.getByRole('button', { name: /Où trouver ce chiffre/ }).click()
  const note = row.getByRole('note')
  await expect(note).toContainText('immobilisé')
  await expect(note).toContainText('55 ans')
  // The note also carries glossary links (RVER, CRI, FRV): the OFFICIAL page is the one that leaves the app.
  await expect(note.locator('a.info-note__link')).toHaveAttribute('href', /^https:\/\/www\.retraitequebec\.gouv\.qc\.ca\/fr\//)
})

test('the example with an RVER shows it opened, and the results carry the locked part in the table and the chart', async ({ page }) => {
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Couple, revenus moyens', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/profil?form=1')
  // Luc (the second person) has an RVER: his line is already open, with its values
  const luc = page.locator('#person-spouse')
  await expect(luc.getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-expanded', 'true')
  await expect(luc.getByRole('textbox', { name: 'Dont immobilisé', exact: true })).toHaveValue(/25\D000/)
  // Marie (the first) has none: folded
  await expect(page.locator('#person-self').getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-expanded', 'false')
  await page.goto('/resultats?v=verify')
  await expect(page.locator('.year-table table').getByRole('columnheader', { name: 'REER immobilisé' })).toBeVisible({ timeout: 30_000 })
  await page.goto('/resultats?metric=detail')
  await expect(page.locator('.chart-detail .chart__legend-item', { hasText: 'REER immobilisé' })).toBeVisible({ timeout: 30_000 })
})

test('someone without a locked part sees neither the column nor the chart segment', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  await expect(page.locator('.year-table table')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('columnheader', { name: 'REER immobilisé' })).toHaveCount(0)
  await page.goto('/resultats?metric=detail')
  await expect(page.locator('.chart-detail .chart__legend-item').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.chart-detail .chart__legend-item', { hasText: 'REER immobilisé' })).toHaveCount(0)
})
