import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile, type SeedProfile } from './seed'

// The mortgage's terms: the payment typed in the unit the statement uses, a renewal said in words, and the reminder about what owning costs.

const withHome = (): SeedProfile => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { home: unknown } }
  p.household.home = { value: 650_000, mortgage: { balance: 266_000, rate: 0.0389, monthlyPayment: 1_500, frequency: 'monthly', renewal: null }, sale: null }
  return p as unknown as SeedProfile
}
const box = (page: import('@playwright/test').Page, name: string) => page.getByRole('textbox', { name, exact: true })

test('a payment every two weeks is typed as the statement says it, and kept as its monthly equivalent', async ({ page }) => {
  await seedProfile(page, withHome())
  await page.goto('/profil?form=1')
  const section = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: 'Résidence principale' }) })
  await section.getByRole('radio', { name: 'Aux 2 semaines' }).click()
  await expect(section.getByRole('radio', { name: 'Aux 2 semaines' })).toBeChecked()
  const payment = box(page, 'Paiement aux 2 semaines')
  await payment.fill('812,82')
  await payment.blur()
  await expect.poll(async () => (await savedProfile(page)).household.home.mortgage.monthlyPayment).toBeCloseTo(1761.11, 2)
  expect((await savedProfile(page)).household.home.mortgage.frequency).toBe('biweekly')
  await expect(section.getByText(/Soit environ 1.761,11.\$ par mois/)).toBeVisible()
  // the payoff is the one the monthly figure gives, counted the plan's way (a year is whole: this year already holds twelve payments): 207 months from January 2026 end in 2043
  await expect(section.getByText(/Hypothèque payée en 2043/)).toBeVisible()
  // back to monthly: the same payment, shown as it is kept
  await section.getByRole('radio', { name: 'Chaque mois' }).click()
  await expect(box(page, 'Paiement mensuel')).toHaveValue(/1.761,11/)
})

test('a renewal is said in words: the payment that keeps the date, or the date that keeps the payment', async ({ page }) => {
  await seedProfile(page, withHome())
  await page.goto('/profil?form=1')
  const section = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: 'Résidence principale' }) })
  await section.getByRole('button', { name: 'Le taux sera renégocié à l’échéance du terme' }).click()
  await box(page, 'Nouveau taux (annuel)').fill('5,5')
  await box(page, 'Nouveau taux (annuel)').blur()
  await expect(section.getByText(/Votre paiement passerait à environ .* par mois dès \d{4}/)).toBeVisible()
  await section.getByRole('radio', { name: 'Garder mon paiement (la date de fin bouge)' }).click()
  await expect(section.getByText(/Le prêt serait payé en \d{4}, au lieu de \d{4} sans renouvellement/)).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).household.home.mortgage.renewal).toMatchObject({ rate: 0.055, keep: 'payment' })
  // a payment that cannot cover the new rate says so, plainly
  await section.getByRole('radio', { name: 'Aux 2 semaines' }).click()
  await box(page, 'Paiement aux 2 semaines').fill('100')
  await box(page, 'Paiement aux 2 semaines').blur()
  await expect(section.getByText(/ne se rembourse jamais/).first()).toBeVisible()
  // taking the renewal off puts the rate back for good
  await section.getByRole('button', { name: 'Le taux sera renégocié à l’échéance du terme' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.home.mortgage.renewal).toBeNull()
})

test('the card reminds what owning costs and where to put it', async ({ page }) => {
  await seedProfile(page, withHome())
  await page.goto('/profil?form=1')
  await expect(page.getByText('Les taxes foncières, l’assurance habitation et l’entretien ne sont pas comptés ici', { exact: false })).toBeVisible()
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, withHome())
  await page.goto('/profil?form=1')
  await page.getByRole('radio', { name: 'Every 2 weeks' }).click()
  await expect(box(page, 'Payment every 2 weeks')).toBeVisible()
  await expect(page.getByRole('button', { name: 'The rate will be renegotiated when the term ends' })).toBeVisible()
})
