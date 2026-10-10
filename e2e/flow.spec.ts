import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, seedProfile } from './seed'

// « OÙ VIENT L'ARGENT » AND « OÙ VA-T-IL », by the year and by the month: the Détail view draws the sources, then where the money goes, and reads ONE year in words under both
// (a bar is hard to read where there is no hover). What comes in and what goes out are the same figure, to the cent; a month is a twelfth of a year.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

const open = async (page: Page, search = '') => {
  await page.goto('/resultats?metric=detail' + search)
  await expect(page.locator('.chart-detail')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.flow-readout')).toBeVisible({ timeout: 30_000 })
}
const amount = (text: string): number => Number(text.replace(/[^\d,]/g, '').replace(',', '.'))
const totals = async (page: Page) => (await page.locator('.flow-readout__total').allInnerTexts()).map(amount)

test('the Détail view draws where the money goes, and reads a year in words: what comes in and what goes out are the same figure', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Où va l’argent, année par année' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Une année en détail' })).toBeVisible()
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui entre"]')).toBeVisible()
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui sort"]')).toBeVisible()
  const [comesIn, goesOut] = await totals(page)
  expect(comesIn).toBeGreaterThan(0)
  expect(comesIn, 'every dollar that comes in goes somewhere').toBeCloseTo(goesOut, 0)
  // the lines under each total add up to it
  const sumOf = async (label: string) => (await page.locator(`.flow-readout__col[aria-label="${label}"] .flow-readout__row dd`).allInnerTexts()).map(amount).reduce((s, n) => s + n, 0)
  expect(await sumOf('Ce qui entre')).toBeCloseTo(comesIn, -1)
  expect(await sumOf('Ce qui sort')).toBeCloseTo(goesOut, -1)
})

test('by the month: the same year, a twelfth of the figures, and the words say « par mois »', async ({ page }) => {
  await open(page)
  const [yearIn] = await totals(page)
  await expect(page.locator('.flow-readout__total').first()).toContainText('par année')
  await page.getByRole('tab', { name: 'Par mois' }).click()
  await expect(page.locator('.flow-readout__total').first()).toContainText('par mois')
  const [monthIn] = await totals(page)
  expect(monthIn * 12).toBeCloseTo(yearIn, -1) // a twelfth, to the rounding of a dollar
  await expect(page.getByText('Par mois : les mêmes montants, divisés par douze.')).toBeVisible()
  // back to a year
  await page.getByRole('tab', { name: 'Par année' }).click()
  await expect(page.locator('.flow-readout__total').first()).toContainText('par année')
})

test('the year is picked with the slider (and the keyboard): the readout follows, with the age beside the year', async ({ page }) => {
  await open(page)
  const slider = page.getByRole('slider', { name: 'Année' })
  await slider.focus()
  await slider.press('Home')
  await expect(page.locator('.flow-readout .slider__value')).toContainText('2026')
  await expect(page.locator('.flow-readout .slider__value')).toContainText('ans')
  const [first] = await totals(page)
  await slider.press('End')
  await expect(page.locator('.flow-readout .slider__value')).not.toContainText('2026')
  const [last] = await totals(page)
  expect(last, 'a retired year does not read like a working one').not.toBeCloseTo(first, -2)
})

test('with one person picked the sources are theirs and the spending stays the household’s: the second chart says so and the « goes out » column steps aside', async ({ page }) => {
  await open(page)
  await page.locator('.chart-detail').getByRole('tab', { name: 'Camille' }).click()
  await expect(page.getByText('Les dépenses sont celles du ménage')).toBeVisible()
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui sort"]')).toHaveCount(0)
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui entre"]')).toBeVisible()
  await page.locator('.chart-detail').getByRole('tab', { name: 'Les deux' }).click()
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui sort"]')).toBeVisible()
})

test('a plan that runs out says what is missing, in the year it is missing', async ({ page }) => {
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Une personne, en retard', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await open(page)
  const slider = page.getByRole('slider', { name: 'Année' })
  await slider.focus()
  await slider.press('End')
  await expect(page.locator('.flow-readout__unmet')).toContainText('Les dépenses ne sont pas toutes couvertes')
  await expect(page.locator('.chart-detail .chart__legend-item', { hasText: 'Non couvert' })).toBeVisible()
  // …and in the first year, where it holds, nothing is missing
  await slider.press('Home')
  await expect(page.locator('.flow-readout__unmet')).toHaveCount(0)
})

test('in English the section and its figures speak English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await open(page)
  await expect(page.getByRole('heading', { name: 'Where the money goes, year by year' })).toBeVisible()
  await page.getByRole('tab', { name: 'Per month' }).click()
  await expect(page.locator('.flow-readout__total').first()).toContainText('a month')
  await expect(page.locator('.flow-readout__col[aria-label="What comes in"]')).toBeVisible()
})

test('on a phone the two columns stack and nothing runs off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await open(page)
  const cols = page.locator('.flow-readout__col')
  await expect(cols).toHaveCount(2)
  const [a, b] = await cols.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  expect(b.top, 'stacked: the second column starts below the first').toBeGreaterThan(a.bottom - 1)
  for (const r of [a, b]) expect(r.right, 'inside the screen').toBeLessThanOrEqual(360.5)
})

test('the children and the care a plan states are drawn apart in « Où va l’argent » — and read in the year in words', async ({ page }) => {
  const family = JSON.parse(JSON.stringify(EXAMPLE))
  family.household.children = [2022, 2024]
  family.household.childSpending = { perChild: 19_300, untilAge: 23 }
  family.household.spending = { workingToday: 70_000, retiredToday: 55_000 }
  family.household.flows = [{ label: 'Des soins plus tard', kind: 'expense', amount: 26_906, fromYear: 2040, toYear: 2045, owner: 'self', taxable: false }]
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(family)] as const) // after the file's own seed: the last write wins
  await page.goto('/resultats?metric=detail')
  const legend = page.locator('.chart-detail .chart__legend')
  await expect(legend.getByText('Enfants', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(legend.getByText('Soins et événements', { exact: true })).toBeVisible()
  await expect(page.locator('.flow-readout__col[aria-label="Ce qui sort"]')).toBeVisible()
})
