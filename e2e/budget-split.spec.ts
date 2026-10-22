import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// THE BUDGET, ENTERED TOGETHER OR SEPARATE: a couple can type one household figure, or the joint account (outside the mortgage) and each person's own spending. The plan
// reads the same two totals either way; the parts are saved, so the card reopens as it was left.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

const how = (page: import('@playwright/test').Page) => page.getByRole('radiogroup', { name: 'Comment entrez-vous vos dépenses ?' })
const box = (card: import('@playwright/test').Locator, group: string, name: string) => card.getByRole('group', { name: group }).getByRole('textbox', { name, exact: true })

test('Ensemble → Séparé: the joint account holds the figure, each person adds their own, and the total is their sum — saved and reopened as left', async ({ page }) => {
  await page.goto('/profil?bloc=tout&form=1')
  const card = page.locator('#budget')
  await expect(how(page).getByRole('radio', { name: 'Ensemble' })).toBeChecked({ timeout: 30_000 })
  const before = (await savedProfile(page)).household.spending
  await how(page).getByRole('radio', { name: 'Séparé' }).click()
  // the total did not move: it all sits on the joint account
  await expect(card.getByText(/Total du ménage/)).toBeVisible()
  expect((await savedProfile(page)).household.spending).toEqual(before)
  const joint = 'Compte conjoint (sans l’hypothèque)'
  await expect(card.getByRole('group', { name: joint })).toBeVisible()
  await box(card, joint, 'Dépenses par année, tant que quelqu’un travaille').fill('30400')
  await box(card, joint, 'Dépenses par année, tant que quelqu’un travaille').press('Enter')
  await box(card, joint, 'Dépenses par année, une fois tout le monde à la retraite').fill('30400')
  await box(card, joint, 'Dépenses par année, une fois tout le monde à la retraite').press('Enter')
  const people = card.getByRole('group', { name: /^Dépenses personnelles de / })
  await expect(people).toHaveCount(2)
  for (const i of [0, 1]) {
    const w = people.nth(i).getByRole('textbox', { name: 'Dépenses par année, tant que quelqu’un travaille', exact: true })
    await w.fill('15000')
    await w.press('Enter')
  }
  await expect.poll(async () => (await savedProfile(page)).household.spending.workingToday).toBe(60_400)
  const saved = await savedProfile(page)
  expect(saved.household.spending.retiredToday).toBe(30_400)
  expect(saved.household.spendingSplit.rows.map((r: { id: string; working: number }) => [r.id, r.working])).toEqual([['joint', 30_400], ['self', 15_000], ['spouse', 15_000]])
  await expect(card.getByText(/60\s?400\s?\$ en emploi, 30\s?400\s?\$ à la retraite/)).toBeVisible()
  // reopened as it was left
  await page.reload()
  await expect(how(page).getByRole('radio', { name: 'Séparé' })).toBeChecked({ timeout: 30_000 })
  await expect(card.getByText(/60\s?400\s?\$ en emploi/)).toBeVisible()
  // back to one figure: the total stays
  await how(page).getByRole('radio', { name: 'Ensemble' }).click()
  await expect(card.getByRole('textbox', { name: 'Dépenses par année, tant que quelqu’un travaille', exact: true })).toHaveValue(/60\s?400/)
  await expect.poll(async () => (await savedProfile(page)).household.spendingSplit).toBeUndefined()
})

test('one person has no such choice: the budget is one figure', async ({ page }) => {
  const alone = JSON.parse(JSON.stringify(EXAMPLE))
  alone.household.persons = alone.household.persons.slice(0, 1)
  alone.household.livesAlone = true
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['horizon-profile', JSON.stringify(alone)] as const)
  await page.goto('/profil?bloc=tout&form=1')
  await expect(page.locator('#budget')).toBeVisible({ timeout: 30_000 })
  await expect(how(page)).toHaveCount(0)
})
