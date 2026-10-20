import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// WHAT CHANGES LITTLE FOR THIS HOUSEHOLD CLOSES (Décider). The strategies are read one at a time (components/Accordion.tsx): « Fonte du REER » keeps its title and, for a
// household whose own way is already the best, says in one line under it that melting changes little; its machinery mounts only when the block is opened. Nothing is
// removed: `?tout=1` opens every block, and a household built for the habit opens the block as the first thing to look at. The worker takes its time: every assertion
// waits for the SETTLED state.

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

test('the golden couple: « Fonte du REER » is a closed block with its title and one line; a tap opens the whole panel; the section stays in the map', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page)
  await page.goto('/decider')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByText(SAME, { exact: false })).toBeVisible({ timeout: 90_000 })
  await expect(section.getByRole('heading').first()).toBeVisible()
  await expect(section.getByRole('button', { expanded: false })).toHaveCount(1)
  await expect(section.getByRole('tab')).toHaveCount(0) // the machinery is not mounted until the block opens
  await expect(page.getByRole('navigation', { name: 'Sections des résultats' }).locator('.accordion__all')).toBeVisible()
  // the block opens on a tap of its title, and the full panel is there; the address keeps it
  await section.getByRole('button', { expanded: false }).click()
  await expect(page).toHaveURL(/strat=fonte/)
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 30_000 })
  await expect(section.getByText(SAME, { exact: false })).toHaveCount(0) // the line is for the closed block
})

test('« Tout ouvrir » (the icon at the end of the map row) opens every what-if and every strategy, the ones that changed little too; « Tout fermer » puts them away', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page)
  await page.goto('/decider')
  const nav = page.getByRole('navigation', { name: 'Sections des résultats' })
  // the first strategy is open: the icon closes it, then opens everything
  await nav.getByRole('button', { name: 'Tout fermer' }).click({ timeout: 90_000 })
  const all = nav.getByRole('button', { name: 'Tout ouvrir' })
  await expect(all).toBeVisible()
  await all.click()
  await expect(page).toHaveURL(/tout=1/)
  await expect(page).toHaveURL(/essai=all/)
  const section = page.locator('#fonte')
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(page.locator('.try-fold.is-open')).toHaveCount(4)
  await nav.getByRole('button', { name: 'Tout fermer' }).click()
  await expect(page).not.toHaveURL(/tout=/)
  await expect(page).not.toHaveURL(/essai=all/)
  await expect(page.locator('.try-fold.is-open')).toHaveCount(0)
  await expect(page.locator('#fonte')).toHaveClass(/is-closed/)
})

test('?tout=1 opens everything: every strategy open, no verdict line, and the map row offers the way back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page)
  await page.goto('/decider?tout=1')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(section.getByText(SAME, { exact: false })).toHaveCount(0)
  await expect(page.locator('#ordre table')).toBeVisible({ timeout: 90_000 })
  await page.getByRole('navigation', { name: 'Sections des résultats' }).getByRole('button', { name: 'Tout fermer' }).click()
  await expect(page).not.toHaveURL(/tout=/)
  await expect(section.getByText(SAME, { exact: false })).toBeVisible({ timeout: 30_000 })
})

test('a household built for the habit sees the whole panel once the block is open, with no line about it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, melter() as never)
  await page.goto('/decider?strat=fonte')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(section.getByText(SAME, { exact: false })).toHaveCount(0)
})
