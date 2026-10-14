import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « Mes chiffres et leur calcul »: the ages and the economy, each with the calculation behind it. READ-ONLY — results are where the plan is read, and a figure is changed in
// one place (Profil for the person's own, Hypothèses for the guesses), each block linking there. The arithmetic is pinned by engine/ledger.test.ts; this pins what the panel says
// and that nothing on it writes the profile.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('each age shows its calculation and its amount — and no control that edits the profile', async ({ page }) => {
  await page.goto('/resultats?v=proof')
  const panel = page.locator('.ledger')
  await expect(panel).toBeVisible()
  // the QPP line states its start age, its amount in today's dollars and its formula
  await expect(panel.locator('.ledger__fixed').filter({ hasText: 'Début du RRQ' }).first()).toContainText('65 ans')
  await expect(panel.locator('.ledger__result').first()).toContainText('par mois, en dollars d’aujourd’hui')
  // …and its formula lives in the amount's own note (Figure), not beside it: one home per figure
  await expect(panel.locator('.ledger__calc').filter({ hasText: 'ajustement' })).toHaveCount(0)
  await panel.locator('button.figure').first().click()
  await expect(panel.locator('.figure-note__formula').first()).toContainText('ajustement')
  // nothing here is a slider
  await expect(panel.getByRole('slider')).toHaveCount(0)
})

test('the economy and the spending are read here and changed where they live', async ({ page }) => {
  await page.goto('/resultats?v=proof')
  const panel = page.locator('.ledger')
  await expect(panel.locator('.ledger__calc').filter({ hasText: 'Les prix montent' })).toBeVisible()
  await expect(panel.locator('.ledger__fixed').filter({ hasText: 'Dépenses à la retraite' })).toBeVisible()
  // the doors: each person's own figures to Profil, the guesses to Hypothèses, the spending to its field
  await expect(panel.getByRole('link', { name: /Modifier dans le profil : Camille/ })).toHaveAttribute('href', '/profil?person=self')
  await expect(panel.getByRole('link', { name: 'Modifier dans les hypothèses' })).toHaveAttribute('href', '/hypotheses')
  await expect(panel.getByRole('link', { name: 'Modifier les dépenses' })).toHaveAttribute('href', '/profil?fact=household:spendingRetired')
  // looking changes nothing
  const before = await savedProfile(page)
  await page.reload()
  expect(await savedProfile(page)).toEqual(before)
})

test('a spending figure that is still an estimate is marked where it is restated, leads to its field, and the mark goes once it is confirmed', async ({ page }) => {
  await page.goto('/resultats?v=proof')
  const spend = page.locator('.ledger__row').filter({ hasText: 'Dépenses à la retraite' })
  const mark = spend.getByRole('link', { name: 'Estimé — à confirmer' })
  await expect(mark).toHaveAttribute('href', '/profil?fact=household%3AspendingRetired')
  // read-only: it is a link, never a control that writes
  expect((await savedProfile(page)).confirmed).toEqual([])
  await mark.click()
  const row = page.locator('[data-fact="household:spendingRetired"]')
  await row.getByRole('button', { name: /^Estimé/ }).click()
  await expect.poll(async () => (await savedProfile(page)).confirmed).toContain('household:spendingRetired')
  await page.goto('/resultats?v=proof')
  await expect(page.locator('.ledger')).toBeVisible()
  await expect(page.locator('.ledger__row').filter({ hasText: 'Dépenses à la retraite' }).getByRole('link', { name: 'Estimé — à confirmer' })).toHaveCount(0)
  // the other (working) spending is a separate fact: still an estimate
  await expect(page.locator('.ledger__row').filter({ hasText: 'Dépenses pendant le travail' }).getByRole('link', { name: 'Estimé — à confirmer' })).toHaveCount(1)
})

test('the page has no horizontal overflow at phone width with the panel open', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=proof')
  await expect(page.locator('.ledger')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
