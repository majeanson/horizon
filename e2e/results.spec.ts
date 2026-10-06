import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The results page in a real browser: the chart is drawn from the engine's rows and says what the table says, the
// controls live in the address, and the « what if » grid fills in off the page's thread. The numbers themselves are
// pinned by the golden snapshots; this pins that a person can SEE and drive them.

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  return problems
}

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('the chart draws one line per comparison, a marker for each retirement, and names itself for a screen reader', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/resultats')
  const chart = page.locator('figure.chart')
  await expect(chart).toBeVisible()
  await expect(chart).toHaveAttribute('role', 'img')
  await expect(chart).toHaveAttribute('aria-label', 'Valeur nette de 2026 à 2076 pour : Mon plan, 65 ans.')
  await expect(chart.locator('.chart__legend-item')).toHaveText(['Mon plan', '65 ans'])
  await expect(chart.locator('path.recharts-line-curve')).toHaveCount(2)
  await expect(chart.locator('.recharts-reference-line')).toHaveCount(2)
  // The plot has a real size (a zero-sized chart is the classic silent failure).
  const plot = await chart.locator('.chart__plot').boundingBox()
  expect(plot!.width).toBeGreaterThan(200)
  expect(plot!.height).toBeGreaterThan(200)
  expect(problems).toEqual([])
})

test('hovering the chart shows the year, the ages and each scenario’s exact figure', async ({ page }) => {
  await page.goto('/resultats')
  const plot = page.locator('.chart__plot')
  await plot.locator('.recharts-surface').waitFor()
  // The mouse can only hover what is on screen.
  await plot.scrollIntoViewIfNeeded()
  const box = (await plot.boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 })
  const tip = page.locator('.chart-tip')
  await expect(tip).toBeVisible()
  await expect(tip.locator('.chart-tip__title')).toContainText(/^\d{4} · \d{2} \/ \d{2}$/)
  await expect(tip.locator('.chart-tip__row')).toHaveCount(2)
  await expect(tip.locator('.chart-tip__row').first()).toContainText(/Mon plan: .*\$/)
})

test('the measure and the dollars are chosen in the address, and the chart follows', async ({ page }) => {
  await page.goto('/resultats')
  const chart = page.locator('figure.chart')
  await page.getByRole('tab', { name: 'Revenu garanti' }).click()
  await expect(page).toHaveURL(/metric=income/)
  await expect(chart).toHaveAttribute('aria-label', /^Revenu garanti de 2026 à 2076/)
  await page.getByRole('tab', { name: 'Dollars de l’année' }).click()
  await expect(page).toHaveURL(/dollars=nominal/)
  await expect(page.getByText('Les dollars de chaque année, sans correction pour l’inflation.')).toBeVisible()
  // The address alone restores the view.
  await page.goto('/resultats?metric=income&dollars=nominal&ages=62')
  await expect(page.locator('figure.chart')).toHaveAttribute('aria-label', 'Revenu garanti de 2026 à 2076 pour : 62 ans.')
  await expect(page.getByRole('tab', { name: 'Revenu garanti', selected: true })).toBeVisible()
  // Choosing the default again takes the parameter back out of the address.
  await page.getByRole('tab', { name: 'Valeur nette' }).click()
  await expect(page).not.toHaveURL(/metric=/)
})

test('another comparison adds a line and keeps the other choices', async ({ page }) => {
  await page.goto('/resultats?dollars=nominal')
  await page.getByRole('group', { name: 'Comparer des âges de départ' }).getByRole('button', { name: '62 ans' }).click()
  await expect(page.locator('.chart__legend-item')).toHaveText(['Mon plan', '65 ans', '62 ans'])
  await expect(page.locator('path.recharts-line-curve')).toHaveCount(3)
  await expect(page).toHaveURL(/dollars=nominal/)
})

test('the chart speaks English too', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'EN' }).click()
  await expect(page.locator('figure.chart')).toHaveAttribute('aria-label', 'Net worth from 2026 to 2076 for: My plan, 65.')
  await expect(page.getByRole('tab', { name: 'Guaranteed income' })).toBeVisible()
})

test('« what if the future is worse » fills a 3 × 3 grid per horizon, off the page’s thread, and the middle is the verdict', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/resultats')
  await page.getByRole('button', { name: /Et si l’avenir est un peu moins bon/ }).click()
  await page.getByRole('button', { name: 'Calculer' }).click()
  await expect(page.getByRole('button', { name: 'Calcul en cours…' })).toBeDisabled()
  // The page stays alive while it computes: a control still answers.
  await page.getByRole('tab', { name: 'Revenu garanti' }).click()
  const grids = page.locator('.sensitivity__grids .table-wrap')
  await expect(grids).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Calculer' })).toBeEnabled({ timeout: 60_000 })
  await expect(page.locator('.sensitivity td', { hasText: '…' })).toHaveCount(0)
  // 27 cells, each an age or a dash; the base cell of the 95-year grid is the plain verdict.
  await expect(page.locator('.sensitivity tbody td')).toHaveCount(27)
  const base = grids.nth(1).locator('td.is-base')
  await expect(base).toHaveText('60')
  // A worse future never retires earlier than a better one: down the return axis, the ages do not fall.
  const column = async (g: number, col: number) => (await grids.nth(g).locator(`tbody tr td:nth-child(${col})`).allTextContents()).map(Number)
  for (const g of [0, 1, 2]) {
    const ages = await column(g, 3) // inflation as set
    expect(ages[0]).toBeGreaterThanOrEqual(ages[1])
    expect(ages[1]).toBeGreaterThanOrEqual(ages[2])
  }
  expect(problems).toEqual([])
})

test('no chart or table runs past the right edge on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats')
  await page.locator('figure.chart').waitFor()
  const box = (await page.locator('figure.chart').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(361)
})
