import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { savedProfile, seedProfile, showAllSections } from './seed'

// « Par document » (the second way to fill Profil; it was the Saisie page): the profile typed one document at a time. Same fields, same store — gathered in the order the papers are held.

test.beforeEach(async ({ page }) => seedProfile(page))

test('seven steps, the first about the household, and the step is in the address', async ({ page }) => {
  await showAllSections(page) // every « oui » to « Ma situation »: the employer's statement and the proof of residence are steps for those who have them
  await page.goto('/saisie')
  await expect(page.getByRole('tab', { name: 'Par document' })).toHaveAttribute('aria-selected', 'true') // the old /saisie address lands here
  await expect(page).toHaveURL(/par=document/)
  const nav = page.getByRole('navigation', { name: 'Les étapes de la saisie' })
  await expect(nav.getByRole('button')).toHaveCount(8) // « Rassembler » + seven steps (the example owns no home)
  await expect(page.getByText('Étape 1 sur 7')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vous et votre ménage', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  // the documents come most important first: the spending budget, then the tax notice…
  await expect(page).toHaveURL(/etape=budget/)
  await expect(page.getByText('Étape 2 sur 7')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vos dépenses des 12 derniers mois', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Précédent' }).click()
  await expect(page.getByText('Étape 1 sur 7')).toBeVisible()
})

test('walking the steps reaches exactly the figures the full profile asks for — none missed, none twice', async ({ page }) => {
  const factsOnPage = () => page.locator('[data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')!))
  await page.goto('/profil?bloc=tout&form=1')
  await expect(page.locator('[data-fact]').first()).toBeVisible()
  const full = [...new Set(await factsOnPage())].sort()
  expect(full.length).toBeGreaterThan(15)
  const seen: string[] = []
  for (const id of ['you', 'rrq', 'tax', 'bank', 'employer', 'home', 'budget', 'residence']) {
    await page.goto(`/saisie?etape=${id}`)
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
    // (the employer's and the residence's steps hold a figure only for someone with a plan, or years abroad)
    if (!['you', 'home', 'employer', 'residence'].includes(id)) await expect(page.locator('[data-fact]').first()).toBeVisible()
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

test('the last step leads to the result, and the checklist leads to the first step', async ({ page }) => {
  await page.goto('/saisie?etape=residence')
  await page.getByRole('button', { name: 'Terminer et voir le résultat' }).click()
  await expect(page).toHaveURL(/\/resultats/)
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: 'Documents à rassembler', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await expect(page.getByText(/Étape 1 sur/)).toBeVisible()
})

// « Comme sur le document »: the tax and relevé steps can be laid out like the paper in hand. Same fields, same store — only the look changes.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test('only the relevé and the tax steps offer « Comme sur le document »; the other steps keep the form', async ({ page }) => {
  for (const id of ['rrq', 'tax']) {
    await page.goto(`/saisie?etape=${id}`)
    await expect(page.getByRole('tab', { name: 'Comme sur le document' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Formulaire' })).toHaveAttribute('aria-selected', 'true')
  }
  await page.goto('/saisie?etape=bank')
  await expect(page.getByRole('tab', { name: 'Comme sur le document' })).toHaveCount(0)
  await expect(page).not.toHaveURL(/vue|view/) // a way of looking, not an address
})

test('tax step: a figure typed on the CRA screen lands in the form field and confirms the same fact', async ({ page }) => {
  await page.goto('/saisie?etape=tax')
  await page.getByRole('tab', { name: 'Comme sur le document' }).click()
  const screen = page.locator('.facsimile').first()
  // the French app quotes the French CRA screen (its labels as the CRA's help pages name them, lib/facsimileCopy.ts)
  await expect(screen.getByText('Régimes d’épargne et de pension')).toBeVisible()
  await expect(screen.getByText('Maximum déductible au titre des REER')).toBeVisible()
  await expect(page.locator('[data-fact]')).toHaveCount(0) // the facsimile owns no second copy of a fact mark
  expect(((await savedProfile(page)).confirmed as string[]).includes('self:tfsaRoom')).toBe(false)
  const box = screen.getByRole('textbox', { name: 'Droits de cotisation au CELI — En date du 1er janvier' })
  await box.fill('23456')
  await box.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.tfsa.room).toBe(23456)
  await expect.poll(async () => ((await savedProfile(page)).confirmed as string[]).includes('self:tfsaRoom')).toBe(true)
  expect(((await savedProfile(page)).confirmed as string[]).includes('self:rrspRoom')).toBe(false) // only the figure that was typed
  await page.getByRole('tab', { name: 'Formulaire' }).click()
  await expect(page.locator('[data-fact="self:tfsaRoom"]').getByRole('textbox')).toHaveValue(/23\D*456/)
})

test('relevé step: the table has four boxes, the projected pair is not fillable, and « Montant actuel » lands in the form', async ({ page }) => {
  await page.goto('/saisie?etape=rrq')
  await page.getByRole('tab', { name: 'Comme sur le document' }).click()
  const screen = page.locator('.facsimile').first()
  for (const w of ['Estimation des prestations', 'Rente de retraite', 'Montant actuel', 'Montant projeté', '60 ans', '65 ans']) await expect(screen.getByText(w, { exact: true }).first()).toBeVisible()
  await expect(screen.getByRole('textbox')).toHaveCount(4)
  await expect(screen.getByRole('textbox', { name: 'Montant projeté, 60 ans' })).toBeDisabled()
  await expect(screen.getByRole('textbox', { name: 'Montant projeté, 65 ans' })).toBeDisabled()
  await expect(screen.getByText('première bonification', { exact: false })).toBeVisible()
  await expect(screen.getByRole('button', { name: 'Coller mon relevé' })).toBeVisible() // the same door as the form's
  const actual = screen.getByRole('textbox', { name: 'Montant actuel, 65 ans' })
  await expect(actual).toBeEnabled()
  await actual.fill('1450')
  await actual.press('Enter')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].rrq.statementAt65).toBe(1450)
  expect(((await savedProfile(page)).confirmed as string[]).filter((id) => /statement/i.test(id))).toEqual([]) // a check against the engine confirms nothing
  await page.getByRole('tab', { name: 'Formulaire' }).click()
  await expect(page.getByRole('textbox', { name: 'Montant actuel à 65 ans' }).first()).toHaveValue(/1\D*450/)
  await expect(page.getByRole('textbox', { name: 'Montant actuel à 60 ans' }).first()).toHaveValue('')
})

test('relevé step: a typed « Montant actuel » is set beside the calculation\'s — the same figure, or the gap and where to look', async ({ page }) => {
  await page.goto('/saisie?etape=rrq')
  await page.getByRole('tab', { name: 'Comme sur le document' }).click()
  const screen = page.locator('.facsimile').first()
  const check = page.locator('.statement-check').first()
  await expect(check).toHaveCount(0) // nothing typed, nothing to check
  const actual = screen.getByRole('textbox', { name: 'Montant actuel, 65 ans' })
  // The golden couple's first person, from the earnings on the page: the calculation gives 988,12 $ at 65.
  await actual.fill('988')
  await actual.press('Enter')
  await expect(check).toContainText(/65\s*—\s*Le calcul donne le même montant\s*:\s*988\s*\$ par mois/)
  await expect(check).toContainText('Ce n’est pas la rente de votre plan')
  await expect(check).not.toContainText('Un écart vient')
  await actual.fill('1100')
  await actual.press('Enter')
  await expect(check).toContainText(/Le calcul donne 988\s*\$ par mois, soit 112\s*\$ \(10\s*%\) de moins que votre relevé/)
  await expect(check).toContainText('Un écart vient presque toujours des revenus saisis plus bas')
  // The same check under the form's own field; a figure for the other age is checked on its own.
  await page.getByRole('tab', { name: 'Formulaire' }).click()
  await expect(page.locator('.statement-check').first()).toContainText('de moins que votre relevé')
  expect(((await savedProfile(page)).confirmed as string[]).filter((id) => /statement/i.test(id))).toEqual([]) // a check confirms nothing
})

for (const [step, label] of [['tax', 'CRA screen'], ['rrq', 'relevé table']] as const) {
  test(`no accessibility violation on the ${label} (both looks of the step)`, async ({ page }) => {
    await page.goto(`/saisie?etape=${step}`)
    await expect(page.locator('.field-row').first()).toBeVisible()
    const form = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
    expect(form.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), 'form look').toEqual([])
    await page.getByRole('tab', { name: 'Comme sur le document' }).click()
    await expect(page.locator('.facsimile').first()).toBeVisible()
    await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((x) => x.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 5000))]))
    const doc = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
    expect(doc.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), 'facsimile look').toEqual([])
  })
}
