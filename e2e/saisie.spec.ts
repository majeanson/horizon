import { expect, test } from '@playwright/test'
import { savedProfile, seedProfile } from './seed'

// « Saisie par document »: the profile typed one document at a time. Same fields, same store — gathered in the order the papers are held.

test.beforeEach(async ({ page }) => seedProfile(page))

test('eight steps, the first about the household, and the step is in the address', async ({ page }) => {
  await page.goto('/saisie')
  await expect(page.getByRole('heading', { name: 'Saisie par document', level: 1 })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Les étapes de la saisie' })
  await expect(nav.getByRole('button')).toHaveCount(8)
  await expect(page.getByText('Étape 1 sur 8')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vous et votre ménage', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  // the documents come most important first: the spending budget, then the tax notice…
  await expect(page).toHaveURL(/etape=budget/)
  await expect(page.getByText('Étape 2 sur 8')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vos dépenses des 12 derniers mois', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Précédent' }).click()
  await expect(page.getByText('Étape 1 sur 8')).toBeVisible()
})

test('walking the steps reaches exactly the figures the full profile asks for — none missed, none twice', async ({ page }) => {
  const factsOnPage = () => page.locator('[data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')!))
  await page.goto('/?form=1')
  await expect(page.locator('[data-fact]').first()).toBeVisible()
  const full = [...new Set(await factsOnPage())].sort()
  expect(full.length).toBeGreaterThan(15)
  const seen: string[] = []
  for (const id of ['you', 'rrq', 'tax', 'bank', 'employer', 'home', 'budget', 'residence']) {
    await page.goto(`/saisie?etape=${id}`)
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
    if (id !== 'you' && id !== 'home') await expect(page.locator('[data-fact]').first()).toBeVisible()
    seen.push(...(await factsOnPage()))
  }
  expect([...new Set(seen)].sort()).toEqual(full)
  // …and each figure is asked in ONE step only
  expect(seen.length).toBe(new Set(seen).size)
})

test('the tax step holds the salary and the rooms; the bank step holds the balances and not the rooms', async ({ page }) => {
  await page.goto('/saisie?etape=tax')
  await expect(page.locator('[data-fact="self:salary"]')).toHaveCount(1)
  await expect(page.locator('[data-fact="self:rrspRoom"]')).toHaveCount(1)
  await expect(page.locator('[data-fact="self:tfsaRoom"]')).toHaveCount(1)
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toHaveCount(0)
  await page.goto('/saisie?etape=bank')
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toHaveCount(1)
  await expect(page.locator('[data-fact="self:rrspRoom"]')).toHaveCount(0)
})

test('what is typed in a step is saved, and one tap confirms every figure of the document', async ({ page }) => {
  await page.goto('/saisie?etape=bank')
  const balance = page.locator('[data-fact="self:rrspBalance"]').getByRole('textbox')
  await balance.fill('123456')
  await balance.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.rrsp.balance).toBe(123456)
  await expect(page.getByText(/\d+ sur \d+ chiffres confirmés pour ce document/)).toBeVisible()
  await page.getByRole('button', { name: 'Tout confirmé pour ce document' }).click()
  await expect.poll(async () => ((await savedProfile(page)).confirmed as string[]).filter((id) => /rrspBalance|tfsaBalance|nonRegBalance/.test(id)).length).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('navigation', { name: 'Les étapes de la saisie' }).getByRole('button', { name: /Relevés de vos comptes ✓/ })).toBeVisible()
  await page.getByRole('button', { name: 'Retirer la confirmation' }).click()
  await expect.poll(async () => ((await savedProfile(page)).confirmed as string[]).filter((id) => /rrspBalance|tfsaBalance|nonRegBalance/.test(id)).length).toBe(0)
})

test('it remembers where the person stopped, and offers to resume', async ({ page }) => {
  await page.goto('/saisie?etape=bank')
  await expect(page.getByRole('heading', { name: 'Relevés de vos comptes', level: 2 })).toBeVisible()
  await page.goto('/saisie')
  await expect(page.getByText('Vous en étiez à : Relevés de vos comptes.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Reprendre' }).click()
  await expect(page).toHaveURL(/etape=bank/)
})

test('a document never ticked in the checklist says so; a ticked one does not', async ({ page }) => {
  await page.goto('/documents')
  await page.locator('.docs-item', { hasText: 'Relevé de participation au RRQ' }).first().getByRole('checkbox').check()
  await page.goto('/saisie?etape=bank')
  await expect(page.getByText('Vous n’avez pas coché ce document dans la liste')).toBeVisible()
  await page.goto('/saisie?etape=rrq')
  await expect(page.getByText('Vous n’avez pas coché ce document dans la liste')).toHaveCount(0)
})

test('the last step leads to the result, and the checklist leads here', async ({ page }) => {
  await page.goto('/saisie?etape=residence')
  await page.getByRole('button', { name: 'Terminer et voir le résultat' }).click()
  await expect(page).toHaveURL(/\/resultats/)
  await page.goto('/documents')
  await page.getByRole('link', { name: 'Saisie par document' }).first().click()
  await expect(page).toHaveURL(/\/saisie/)
})
