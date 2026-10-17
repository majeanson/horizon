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

// « IMPRIMER… »: one chip, a short list of the pages that can go on paper. A choice prints that page and only that one; the browser's own Ctrl+P (a bare `beforeprint`) still prints the plan,
// and a print that has ended gives the screen back. The test stands in for the print dialog: `window.print()` fires `beforeprint`, as a browser does just before it takes its snapshot.
test('« Imprimer… » prints the page that was chosen, then the plan again by Ctrl+P', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      window.dispatchEvent(new Event('beforeprint'))
    }
  })
  await seedProfile(page, EXAMPLE)
  // The chip lives on Ma fiche and in the settings: a choice goes to the results page, which prints once its numbers are in.
  const slow = expect.configure({ timeout: 60_000 })

  const open = async () => {
    await page.goto('/fiche')
    await page.getByRole('button', { name: /Imprimer…/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Imprimer' })
    await expect(dialog).toBeVisible()
    return dialog
  }

  // the year by year: a table, under its own heading, and none of the one-page plan
  let dialog = await open()
  await expect(dialog.locator('.print-menu button')).toHaveCount(6)
  await dialog.getByRole('button', { name: /Année par année/ }).click()
  await slow(page.locator('.print-kind--years')).toBeVisible()
  await slow(page.locator('.print-kind--years').getByText('Horizon — année par année')).toBeVisible()
  await slow(page.locator('.print-kind--years .year-table table')).toBeVisible()
  await slow(page.locator('.print-plan .timeline')).toHaveCount(0)
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await slow(page.locator('.print-plan')).toHaveCount(0)
  await slow(page.getByRole('tab', { name: 'Réponse' })).toBeVisible()

  // the calendar and the leaflet: the plan's dates, one row a year; the leaflet adds the answer and the assumptions in three panels
  dialog = await open()
  await dialog.getByRole('button', { name: /Le calendrier/ }).click()
  await slow(page.locator('.print-kind--calendar').getByText('Horizon — le calendrier du plan')).toBeVisible()
  expect(await page.locator('.print-kind--calendar .plan-calendar__year').count()).toBeGreaterThan(3)
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  dialog = await open()
  await dialog.getByRole('button', { name: /Le dépliant/ }).click()
  await slow(page.locator('.print-leaflet__panel')).toHaveCount(3)
  await slow(page.locator('.print-leaflet').getByText(/Vous pouvez prendre votre retraite/)).toBeVisible()
  await slow(page.locator('.print-leaflet .plan-calendar__year').first()).toBeVisible()
  // the share link as a code a phone can scan: a drawn square with its words, and no figure of the profile in what it says
  await slow(page.locator('.print-leaflet__qr svg[role="img"]')).toBeVisible()
  await slow(page.locator('.print-leaflet__qr figcaption')).toContainText('Scannez pour ouvrir ce scénario')
  expect(await page.locator('.print-leaflet__qr path').getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/)
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))

  // the proof file: the profile's figures, each pension's calculation with its official page written out
  dialog = await open()
  await dialog.getByRole('button', { name: /Le dossier de preuve/ }).click()
  const dossier = page.locator('.print-kind--dossier')
  await slow(dossier.getByText('Horizon — le dossier de preuve')).toBeVisible()
  await slow(dossier.locator('.print-figures tbody tr').first()).toBeVisible()
  expect(await dossier.locator('.print-dossier__figure').count()).toBeGreaterThanOrEqual(4) // the RRQ and the PSV of two people
  await slow(dossier.locator('.print-dossier__figure').first()).toContainText('https://')
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))

  // the sources: every cited figure, each with its official page
  dialog = await open()
  await dialog.getByRole('button', { name: /Les sources/ }).click()
  await slow(page.locator('.print-kind--sources').getByText('Horizon — les sources des chiffres')).toBeVisible()
  expect(await page.locator('.print-sources tbody tr').count()).toBeGreaterThan(100)
  // the address is written out: a link is nothing on paper
  expect(await page.locator('.print-sources__url').first().textContent()).toMatch(/^https:\/\//)
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))

  // the plan, chosen from the list
  dialog = await open()
  await dialog.getByRole('button', { name: /Le plan en une page/ }).click()
  await slow(page.locator('.print-plan .timeline')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))

  // after a choice, a bare Ctrl+P is the plan again — the choice was for one print
  dialog = await open()
  await dialog.getByRole('button', { name: /Les sources/ }).click()
  await slow(page.locator('.print-kind--sources')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await beforePrint(page)
  await slow(page.locator('.print-plan .timeline')).toBeVisible()
  await slow(page.locator('.print-kind')).toHaveCount(0)
})

test('« Print… » speaks English, and its pages carry English headings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('horizon-lang', 'en')
    window.print = () => {
      window.dispatchEvent(new Event('beforeprint'))
    }
  })
  await seedProfile(page, EXAMPLE)
  await page.goto('/fiche')
  await page.getByRole('button', { name: /Print…/ }).click()
  await page.getByRole('dialog', { name: 'Print' }).getByRole('button', { name: /The sources/ }).click()
  await expect(page.locator('.print-kind--sources').getByText('Horizon — where the figures come from')).toBeVisible({ timeout: 60_000 })
})

// The PDFs of the other pages. The year by year is a LANDSCAPE page (a named `@page`), and neither runs away: a table is a few pages, the sources a few more.
const mediaBox = (pdf: Buffer): number[] => {
  const m = pdf.toString('latin1').match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/)
  return m ? m.slice(1).map(Number) : []
}
for (const [kind, button, heading, orientation, maxPages] of [
  ['calendar', /Le calendrier/, 'Horizon — le calendrier du plan', 'portrait', 2],
  ['leaflet', /Le dépliant/, 'Horizon — mon plan en un dépliant', 'landscape', 1],
  ['dossier', /Le dossier de preuve/, 'Horizon — le dossier de preuve', 'portrait', 3],
  ['years', /Année par année/, 'Horizon — année par année', 'landscape', 5],
  ['sources', /Les sources/, 'Horizon — les sources des chiffres', 'portrait', 14],
] as const) {
  test(`the PDF of the « ${kind} » page is ${orientation} and at most ${maxPages} pages`, async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {
        window.dispatchEvent(new Event('beforeprint'))
      }
    })
    await seedProfile(page, EXAMPLE)
    await page.goto('/fiche')
    await page.getByRole('button', { name: /Imprimer…/ }).click()
    await page.getByRole('dialog', { name: 'Imprimer' }).getByRole('button', { name: button }).click()
    await expect(page.locator(`.print-kind--${kind}`).getByText(heading)).toBeVisible({ timeout: 60_000 })
    await page.emulateMedia({ media: 'print' })
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true })
    const pages = pagesOf(pdf)
    expect(pages, `${kind}: ${pages} pages`).toBeGreaterThanOrEqual(1)
    expect(pages, `${kind}: ${pages} pages`).toBeLessThanOrEqual(maxPages)
    const box = mediaBox(pdf)
    expect(box.length, 'the PDF names its page size').toBe(4)
    const [w, h] = [box[2] - box[0], box[3] - box[1]]
    expect(w > h, `${kind}: ${w} × ${h}`).toBe(orientation === 'landscape')
  })
}
