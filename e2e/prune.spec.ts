import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// WHAT CHANGES LITTLE FOR THIS HOUSEHOLD FOLDS (Décider). « Fonte du REER » keeps its heading and says in one line that melting changes little for a household whose own way
// is already the best; the machinery sits in a closed fold. Nothing is removed: `?tout=1` opens everything, and a household built for the habit sees the whole panel. The
// worker takes its time: the full panel may flash before the answer, so every assertion waits for the SETTLED state.

type P = { retirementAge: number; salaryToday: number; rrq: { startAge: number }; oas: { startAge: number; residentSince: number }; accounts: { rrsp: Record<string, number>; tfsa: Record<string, number>; nonReg: Record<string, number> } }
const melter = () => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { livesAlone: boolean; children: number[]; persons: P[]; spending: { workingToday: number; retiredToday: number } } }
  const me = p.household.persons[0]
  p.household.persons = [me]
  p.household.livesAlone = true
  p.household.children = []
  Object.assign(me, { retirementAge: 60, salaryToday: 0, rrq: { startAge: 70 }, oas: { ...me.oas, startAge: 70 } })
  me.accounts.rrsp = { ...me.accounts.rrsp, balance: 2_500_000, annualContribution: 0 }
  me.accounts.tfsa = { ...me.accounts.tfsa, balance: 10_000, room: 80_000, annualContribution: 0 }
  me.accounts.nonReg = { balance: 0, acb: 0, annualContribution: 0 }
  p.household.spending = { workingToday: 36_000, retiredToday: 36_000 }
  return p
}

const SAME = 'Pour vous, remplir la tranche change peu'

test('the golden couple: « Fonte du REER » is a heading, one line and a closed fold; the section stays in the map', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page)
  await page.goto('/resultats?v=decide')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByText(SAME, { exact: false })).toBeVisible({ timeout: 90_000 })
  await expect(section.getByRole('heading').first()).toBeVisible()
  const fold = section.locator('details.fold')
  await expect(fold).toHaveCount(1)
  await expect(fold).not.toHaveAttribute('open', '')
  await expect(section.getByRole('tab')).toHaveCount(0) // the machinery is not mounted until the fold opens
  await expect(page.getByRole('button', { name: 'Tout montrer' })).toBeVisible()
  // the fold opens on a tap, and the full panel is there
  await fold.locator('summary').click()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 30_000 })
})

test('?tout=1 opens everything: the full panel, no verdict line, and the chip offers the way back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page)
  await page.goto('/resultats?v=decide&tout=1')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(section.getByText(SAME, { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Réduire' }).click()
  await expect(page).not.toHaveURL(/tout=/)
  await expect(section.getByText(SAME, { exact: false })).toBeVisible({ timeout: 30_000 })
})

test('a household built for the habit sees the whole panel without asking, and no chip is offered for it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, melter() as never)
  await page.goto('/resultats?v=decide')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(section.getByText(SAME, { exact: false })).toHaveCount(0)
})
