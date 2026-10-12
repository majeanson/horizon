import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, blankSeed, seedProfile } from './seed'

// THE PRINTED PLAN: one short page (two at most), the same whichever view is open — the answer, its dates, what it can spend, the assumptions, the plan in one line, the ages compared and how firm
// it is. Not the year-by-year table, not the 140 cited figures, not the other views: they stay on the screen. It replaces the page while the browser prints (`beforeprint`) and gives it back
// on `afterprint`, so the screen never pays for it.

const beforePrint = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
const afterPrint = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
// The number of pages of a PDF: its page objects (the pages TREE is « /Type /Pages »).
const pagesOf = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length

for (const [name, query] of [['the answer', ''], ['Essayer', '?v=adjust'], ['Stratégies', '?v=strategies'], ['Vérifier', '?v=verify']] as const) {
  test(`printing from « ${name} » gives the same short plan, then gives the page back`, async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/resultats' + query)
    await expect(page.getByRole('tab', { name: 'Réponse' })).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.print-plan')).toHaveCount(0)

    await beforePrint(page)
    const plan = page.locator('.print-plan')
    await expect(plan).toBeVisible()
    await expect(plan.getByText('Horizon — mon plan de retraite')).toBeVisible()
    await expect(plan.getByText(/Imprimé en \w+ \d{4}/)).toBeVisible()
    await expect(plan.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible()
    await expect(plan.getByText('Hypothèses retenues')).toBeVisible()
    await expect(plan.locator('.timeline')).toBeVisible()
    await expect(plan.getByText('Une estimation selon vos hypothèses, pas un conseil financier.', { exact: false })).toBeVisible()
    // what stays on the screen: the year by year, the cited figures, the views and their tabs
    await expect(page.locator('.year-table')).toHaveCount(0)
    await expect(page.locator('.params')).toHaveCount(0)
    await expect(page.locator('.results-pin')).toHaveCount(0)

    await afterPrint(page)
    await expect(page.locator('.print-plan')).toHaveCount(0)
    await expect(page.getByRole('tab', { name: 'Réponse' })).toBeVisible()
  })
}

for (const [name, seed, query] of [
  ['the example couple', EXAMPLE, ''],
  ['the example couple with every age compared', EXAMPLE, '?ages=55,60,65,70,plan,58-64'],
  ['a first-time single person who typed a little', blankSeed(), ''],
] as const) {
  test(`the PDF of ${name} is one or two pages, never more`, async ({ page }) => {
    await seedProfile(page, seed)
    await page.goto('/resultats' + query)
    // the page has answered, or says what is missing
    await expect(page.getByText(/Vous pouvez prendre votre retraite|Vous pouvez déjà|Il manque des chiffres/).first()).toBeVisible({ timeout: 60_000 })
    await page.emulateMedia({ media: 'print' })
    await beforePrint(page)
    await expect(page.locator('main')).toBeVisible()
    const pdf = await page.pdf({ format: 'Letter', printBackground: true })
    const pages = pagesOf(pdf)
    expect(pages, `${name}: ${pages} pages`).toBeGreaterThanOrEqual(1)
    expect(pages, `${name}: ${pages} pages`).toBeLessThanOrEqual(2)
  })
}

test('English: the printed plan speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await expect(page.getByRole('tab', { name: 'Answer' })).toBeVisible({ timeout: 60_000 })
  await beforePrint(page)
  const plan = page.locator('.print-plan')
  await expect(plan.getByText('Horizon — my retirement plan')).toBeVisible()
  await expect(plan.getByText('Assumptions used')).toBeVisible()
  await expect(plan.getByText('An estimate based on your assumptions, not financial advice.', { exact: false })).toBeVisible()
})
