import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « UN AUTRE ORDRE VAUT LE COUP » on the answer. A retiree with a large REER and a non-registered account, who stops at 55 and starts the QPP and the OAS at 70: the default order
// (non-registered first) lets the REER grow untouched for years and pays much more tax later; drawing the REER first costs about a quarter less tax over the plan. The sentence on the answer
// is the one « Dans quel ordre puiser ? » says on « Stratégies » — the same six orders — and the six orders are asked only once it is scrolled into view.

type P = { retirementAge: number; salaryToday: number; rrq: { startAge: number }; oas: { startAge: number; residentSince: number }; accounts: { rrsp: Record<string, number>; tfsa: Record<string, number>; nonReg: Record<string, number> } }
const rrspHeavy = () => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { livesAlone: boolean; children: number[]; persons: P[]; spending: { workingToday: number; retiredToday: number } } }
  const me = p.household.persons[0]
  p.household.persons = [me]
  p.household.livesAlone = true
  p.household.children = []
  Object.assign(me, { retirementAge: 55, salaryToday: 110_000, rrq: { startAge: 70 }, oas: { ...me.oas, startAge: 70 } })
  me.accounts.rrsp = { ...me.accounts.rrsp, balance: 1_500_000, annualContribution: 0 }
  me.accounts.tfsa = { ...me.accounts.tfsa, balance: 0, annualContribution: 0 }
  me.accounts.nonReg = { balance: 500_000, acb: 350_000, annualContribution: 0 }
  p.household.spending = { workingToday: 70_000, retiredToday: 70_000 }
  return p
}

test('the answer says when another order of drawing clearly wins, and says what « Stratégies » says', async ({ page }) => {
  // The nudge rides TWO idle workers (the six orders behind the answer's own searches): its 90 s expects below are honest,
  // but the default 45 s TEST budget cut them off on CI's slow runner (the element was there, still empty at 45.1 s — red 2026-10-14).
  test.slow()
  await seedProfile(page, rrspHeavy() as never)
  await page.goto('/resultats')
  const year = page.locator('#annee')
  await year.scrollIntoViewIfNeeded()
  const nudge = year.locator('.order-nudge')
  await expect(nudge).toContainText(/d’impôt de moins sur tout le plan|plus tôt/, { timeout: 90_000 })
  const said = (await nudge.innerText()).trim()
  expect(said).toContain('REER') // the order it points at, by the account names the page already uses
  // the same sentence, from the same six orders, on the strategies view
  await page.goto('/resultats?v=strategies')
  await expect(page.locator('#ordre .answer__note').first()).toContainText(said, { timeout: 90_000 })
})

test('a household whose own order is already the best hears nothing', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  const year = page.locator('#annee')
  await year.scrollIntoViewIfNeeded()
  await expect(year.getByRole('button', { name: 'Dans quel ordre puiser ?' })).toBeVisible()
  // give the six orders time to come back, then nothing was said
  await page.waitForTimeout(8_000)
  await expect(year.locator('.order-nudge p')).toHaveCount(0)
})

test('the six orders are not asked until the block is scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  const workers: string[] = []
  page.on('worker', (w) => workers.push(w.url()))
  await seedProfile(page, rrspHeavy() as never)
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(4_000)
  expect(workers.some((u) => u.includes('withdrawalOrders')), 'no order search while the block is far below').toBe(false)
  await page.locator('#annee').scrollIntoViewIfNeeded()
  await expect.poll(() => workers.some((u) => u.includes('withdrawalOrders')), { timeout: 20_000 }).toBe(true)
})
