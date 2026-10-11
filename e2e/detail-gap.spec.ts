import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// A person's « D'où vient l'argent » bars can be EMPTY for years — Alex retires first and starts the QPP and the OAS at 70 while the household is paid from
// Camille's accounts. That is the plan, not missing data: a line under the chart says who pays then (chartData.idleStretch).

test('a stretch of years with nothing from one person is explained under their bars', async ({ page }) => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { persons: Record<string, any>[] } }
  const [camille, alex] = p.household.persons
  alex.retirementAge = 55
  alex.rrq = { startAge: 72 }
  alex.oas = { ...alex.oas, startAge: 70 }
  alex.accounts.rrsp.balance = 0
  alex.accounts.tfsa.balance = 0
  alex.accounts.nonReg = { balance: 0, acb: 0, annualContribution: 0 }
  camille.accounts.nonReg = { balance: 1_500_000, acb: 1_000_000, annualContribution: 0 }
  await seedProfile(page, p as never)
  await page.goto('/resultats?metric=detail')
  await page.locator('.chart-panel').getByRole('tab', { name: 'Alex' }).click()
  await expect(page.locator('.chart-panel').getByText(/rien ne vient de Alex/)).toBeVisible({ timeout: 30_000 })
  await page.locator('.chart-panel').getByRole('tab', { name: 'Camille' }).click()
  await expect(page.locator('.chart-panel').getByText(/rien ne vient de/)).toHaveCount(0)
})
