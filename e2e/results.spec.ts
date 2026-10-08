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
  const chart = page.locator('.chart-panel figure.chart')
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
  const plot = page.locator('.chart-panel .chart__plot')
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

test('the measure is chosen in the address, and the chart follows; today’s dollars have no switch, an old link still opens the year’s dollars', async ({ page }) => {
  await page.goto('/resultats')
  const chart = page.locator('.chart-panel figure.chart')
  await page.getByRole('tab', { name: 'Revenu garanti' }).click()
  await expect(page).toHaveURL(/metric=income/)
  await expect(chart).toHaveAttribute('aria-label', /^Revenu garanti de 2026 à 2076/)
  await expect(page.getByRole('tab', { name: 'Dollars de l’année' })).toHaveCount(0)
  // The address alone restores the view — an old link with the year's dollars included.
  await page.goto('/resultats?metric=income&dollars=nominal&ages=62')
  await expect(page.locator('.chart-panel figure.chart')).toHaveAttribute('aria-label', 'Revenu garanti de 2026 à 2076 pour : 62 ans.')
  await expect(page.getByRole('tab', { name: 'Revenu garanti', selected: true })).toBeVisible()
  await expect(page.getByText('Les dollars de chaque année, sans correction pour l’inflation.')).toBeVisible()
  // Choosing the default again takes the parameter back out of the address.
  await page.getByRole('tab', { name: 'Valeur nette' }).click()
  await expect(page).not.toHaveURL(/metric=/)
})

test('another comparison adds a line and keeps the other choices', async ({ page }) => {
  await page.goto('/resultats?dollars=nominal')
  await page.getByRole('group', { name: 'Comparer des âges de départ' }).getByRole('button', { name: '62 ans' }).click()
  await expect(page.locator('.chart-panel .chart__legend-item')).toHaveText(['Mon plan', '65 ans', '62 ans'])
  await expect(page.locator('.chart-panel path.recharts-line-curve')).toHaveCount(3)
  await expect(page).toHaveURL(/dollars=nominal/)
})

test('the year-by-year table says which dollars it holds, and its last net worth is the card’s figure', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const tables = page.locator('#tableau')
  await expect(tables.locator('.year-table__unit')).toContainText('Dollars d’aujourd’hui.')
  // The « Mon plan » table's last row ends on the same number the scenario card prints (today's dollars, both).
  const last = tables.locator('.year-table').first().locator('tbody tr').last().locator('td').last()
  const worth = (await last.textContent())!.trim()
  await page.goto('/resultats')
  await expect(page.locator('.scenario').first()).toContainText(`Valeur nette à l’horizon : ${worth} (Dollars d’aujourd’hui)`)
  // An old link with the year's dollars still opens them, and says so.
  await page.goto('/resultats?v=verify&dollars=nominal')
  await expect(tables.locator('.year-table__unit')).toContainText('Dollars de l’année.')
})

test('the chart speaks English too', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()
  await expect(page.locator('.chart-panel figure.chart')).toHaveAttribute('aria-label', 'Net worth from 2026 to 2076 for: My plan, 65.')
  await expect(page.getByRole('tab', { name: 'Guaranteed income' })).toBeVisible()
})

test('« what if the future is worse » fills a 3 × 3 grid per horizon, off the page’s thread, and the middle is the verdict', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/resultats')
  // It runs by itself, last in line behind the verdict and the chart; the page stays alive while it computes.
  await page.getByRole('tab', { name: 'Revenu garanti' }).click()
  await page.getByRole('tab', { name: 'Vérifier' }).click()
  const grids = page.locator('.sensitivity__grids .table-wrap')
  await expect(grids).toHaveCount(3, { timeout: 60_000 })
  await expect(page.locator('.sensitivity td', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  // 27 cells, each an age or a dash; the base cell of the 95-year grid is the plain verdict.
  await expect(page.locator('.sensitivity__grids tbody td')).toHaveCount(27)
  // …and the verdict's own range line reads prudent ≥ neutre ≥ audacieux (a more prudent future never retires earlier)
  // — the ONE place the three scenarios' ages are written; the grids detail it.
  await page.getByRole('tab', { name: 'Réponse' }).click()
  const range = page.locator('.verdict__range')
  await expect(range).toContainText('Selon le scénario')
  for (const name of ['Prudent', 'Neutre', 'Audacieux']) await expect(range.locator('dt', { hasText: name })).toBeVisible()
  // The three boxes are on the card from the first paint and FILL (no late paragraph growing the card).
  await expect(range.locator('dd', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  const scenarios = (await range.locator('dd').allTextContents()).map((x) => Number(x.match(/\d+/)![0]))
  expect(scenarios[0]).toBeGreaterThanOrEqual(scenarios[1])
  expect(scenarios[1]).toBeGreaterThanOrEqual(scenarios[2])
  await page.getByRole('tab', { name: 'Vérifier' }).click()
  // The panel mounts afresh with the view and computes again: wait for all of it.
  await expect(page.locator('.sensitivity__grids tbody td')).toHaveCount(27, { timeout: 60_000 })
  await expect(page.locator('.sensitivity td', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  const base = grids.nth(1).locator('td.is-base')
  await expect(base).toHaveText('59')
  // A worse future never retires earlier than a better one: down the return axis, the ages do not fall.
  const column = async (g: number, col: number) => (await grids.nth(g).locator(`tbody tr td:nth-child(${col})`).allTextContents()).map(Number)
  for (const g of [0, 1, 2]) {
    const ages = await column(g, 3) // inflation as set
    expect(ages[0]).toBeGreaterThanOrEqual(ages[1])
    expect(ages[1]).toBeGreaterThanOrEqual(ages[2])
  }
  expect(problems).toEqual([])
})

// « Paramètres utilisés » is where a stranger checks the engine against the government: it must send a French reader to the
// French page and an English reader to the English one, write numbers the way each language does, and say plainly when the
// agency publishes a page in one language only.
test('« Paramètres utilisés » follows the reader\'s language: the page, the number, and an honest label when there is no edition', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const row = (name: RegExp) => page.getByRole('row', { name })

  // French reader: the French edition, « 1 507,65 », and a French-only page needs no label.
  await expect(row(/rrq\.maxPension65/)).toContainText(/1\s507,65/)
  await expect(row(/rrq\.maxPension65/).getByRole('link')).toHaveAttribute('href', /retraitequebec\.gouv\.qc\.ca\/fr\//)
  await expect(row(/quebec\.creditRate/)).not.toContainText('page en anglais seulement')
  await expect(row(/quebec\.bpa/).getByRole('link')).toHaveAttribute('href', /AUTFR_/)

  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()

  // English reader: the English edition, « 1,507.65 », the English parameters PDF, and an honest label on the fiche that
  // exists in French only.
  await expect(row(/rrq\.maxPension65/)).toContainText('1,507.65')
  await expect(row(/rrq\.maxPension65/).getByRole('link')).toHaveAttribute('href', /retraitequebec\.gouv\.qc\.ca\/en\//)
  await expect(row(/quebec\.bpa/).getByRole('link')).toHaveAttribute('href', /AUTEN_/)
  await expect(row(/quebec\.creditRate/)).toContainText('French-language page only')
  await expect(row(/quebec\.creditRate/).getByRole('link')).toHaveAttribute('lang', 'fr')
})

test('no chart or table runs past the right edge on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats')
  await page.locator('.chart-panel figure.chart').waitFor()
  const box = (await page.locator('.chart-panel figure.chart').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(361)
})

test('a couple gets each person\'s own earliest age, worked out off the page\'s thread, and can send the pair to the comparison', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/resultats')
  const panel = page.getByRole('heading', { name: 'Chacun de son côté' })
  await expect(panel).toBeVisible()
  // One line per person, each naming who the other is held at; then the placeholder is gone.
  const lines = page.locator('.verdict__each-row, .verdict__each-list li')
  await expect(lines).toHaveCount(2)
  await expect(lines.first()).toContainText(/dès \d+ ans, si .* part à \d+ ans|aucun âge/)
  const compare = lines.first().getByRole('button', { name: /^Comparer .* à \d+ ans et .* à \d+ ans$/ })
  await compare.click()
  await expect(page).toHaveURL(/ages=plan(%2C|,)65(%2C|,)\d+-\d+/)
  expect(problems).toEqual([])
})

