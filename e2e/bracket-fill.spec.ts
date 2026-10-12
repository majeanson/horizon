import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « JUSQU’OÙ FONDRE LE REER ? » on Stratégies, and its sentence on the answer. A single retiree of 60 with a large REER, a small CELI and modest spending, whose pensions start at 70: for
// years the only income is what the REER gives, far under the first bracket's top — the case the habit is made for. The three ways are tabs (the choice is in the address), one table sets them
// side by side, and « Choisir cette façon » writes the choice to the profile.

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

test('the three ways are tabs, the table sets them side by side, and one tap makes the choice the profile’s', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, melter() as never)
  await page.goto('/resultats?v=strategies')
  const section = page.locator('#fonte')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('tab')).toHaveCount(3, { timeout: 90_000 })
  await expect(section.locator('tbody tr')).toHaveCount(3, { timeout: 90_000 })
  // the default is the first bracket; a tap on another way puts it in the address
  await expect(section.getByText('jusqu’au haut de la première tranche', { exact: false })).toBeVisible()
  await section.getByRole('tab', { name: /Sous la récupération de la PSV/ }).click()
  await expect(page).toHaveURL(/bf=oas/)
  await expect(section.getByText('seuil à partir duquel la PSV est récupérée', { exact: false })).toBeVisible()
  // adopt it: the profile carries it, and it survives a reload
  await section.getByRole('button', { name: /Choisir cette façon/ }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.bracketFill).toBe('oas')
  await page.reload()
  await expect(page.locator('#fonte tbody tr.is-own th')).toContainText('Sous la récupération de la PSV', { timeout: 90_000 })
  // and the way back: « Sans fonte » is a choice too
  await page.locator('#fonte').getByRole('tab', { name: /Sans fonte/ }).click()
  await page.locator('#fonte').getByRole('button', { name: /Choisir cette façon/ }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.bracketFill).toBe(null)
})

test('on a phone the panel fits the screen: no sideways scroll but the table’s own', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await seedProfile(page, melter() as never)
  await page.goto('/resultats?v=strategies')
  await page.locator('#fonte').scrollIntoViewIfNeeded()
  await expect(page.locator('#fonte tbody tr')).toHaveCount(3, { timeout: 90_000 })
  const overflow = await page.evaluate(() => document.getElementById('root')!.scrollWidth - document.getElementById('root')!.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('the answer says so when melting the REER clearly wins, and not before the block is in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  const workers: string[] = []
  page.on('worker', (w) => workers.push(w.url()))
  await seedProfile(page, melter() as never)
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(3_000)
  expect(workers.some((u) => u.includes('bracketFill')), 'nothing asked while the block is far below').toBe(false)
  await page.locator('#annee').scrollIntoViewIfNeeded()
  await expect(page.locator('#annee .fill-nudge')).toContainText('Fondre le REER', { timeout: 90_000 })
})
