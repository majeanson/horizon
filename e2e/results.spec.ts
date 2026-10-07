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

test('the measure and the dollars are chosen in the address, and the chart follows', async ({ page }) => {
  await page.goto('/resultats')
  const chart = page.locator('.chart-panel figure.chart')
  await page.getByRole('tab', { name: 'Revenu garanti' }).click()
  await expect(page).toHaveURL(/metric=income/)
  await expect(chart).toHaveAttribute('aria-label', /^Revenu garanti de 2026 à 2076/)
  await page.getByRole('tab', { name: 'Dollars de l’année' }).click()
  await expect(page).toHaveURL(/dollars=nominal/)
  await expect(page.getByText('Les dollars de chaque année, sans correction pour l’inflation.')).toBeVisible()
  // The address alone restores the view.
  await page.goto('/resultats?metric=income&dollars=nominal&ages=62')
  await expect(page.locator('.chart-panel figure.chart')).toHaveAttribute('aria-label', 'Revenu garanti de 2026 à 2076 pour : 62 ans.')
  await expect(page.getByRole('tab', { name: 'Revenu garanti', selected: true })).toBeVisible()
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
  const grids = page.locator('.sensitivity__grids .table-wrap')
  await expect(grids).toHaveCount(3, { timeout: 60_000 })
  await expect(page.locator('.sensitivity td', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  // 27 cells, each an age or a dash; the base cell of the 95-year grid is the plain verdict.
  await expect(page.locator('.sensitivity__grids tbody td')).toHaveCount(27)
  // …and the verdict's own range line reads prudent ≥ neutre ≥ audacieux (a more prudent future never retires earlier)
  // — the ONE place the three scenarios' ages are written; the grids detail it.
  const range = page.locator('.verdict__range')
  await expect(range).toContainText('Selon le scénario')
  for (const name of ['Prudent', 'Neutre', 'Audacieux']) await expect(range.locator('dt', { hasText: name })).toBeVisible()
  // The three boxes are on the card from the first paint and FILL (no late paragraph growing the card).
  await expect(range.locator('dd', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  const scenarios = (await range.locator('dd').allTextContents()).map((x) => Number(x.match(/\d+/)![0]))
  expect(scenarios[0]).toBeGreaterThanOrEqual(scenarios[1])
  expect(scenarios[1]).toBeGreaterThanOrEqual(scenarios[2])
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
  await page.goto('/resultats')
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

test('a couple can compare two different retirement ages and the card says who retires when', async ({ page }) => {
  await page.goto('/resultats?ages=plan')
  const [first, second] = [page.getByRole('textbox', { name: /Âge de départ de/ }).nth(0), page.getByRole('textbox', { name: /Âge de départ de/ }).nth(1)]
  await first.fill('58')
  await second.fill('64')
  await page.getByRole('button', { name: 'Ajouter cette comparaison' }).click()
  await expect(page).toHaveURL(/ages=plan(%2C|,)58-64/)
  await expect(page.getByRole('button', { name: /58 ans · .* 64 ans/, pressed: true })).toBeVisible()
  await expect(page.getByText(/Départ : .*58 ans · .*64 ans/).first()).toBeVisible()
  // The chip is a toggle like any other: pressing it takes the card away.
  await page.getByRole('button', { name: /58 ans · .* 64 ans/ }).click()
  await expect(page).not.toHaveURL(/58-64/)
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

// « Quand commencer ma rente ? » sits on the page and works out, off the page's thread, what starting the QPP
// pension and the OAS at each age does. The numbers are pinned by unit tests (src/engine/deferral.test.ts); this pins that a
// person can see the rule's own percentages beside the plan, tell which row is theirs, and switch person.
test('« when should I start my pension » compares the start ages, flags the plan\'s own row and switches person', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/resultats')
  const rrq = page.getByRole('region', { name: /Régime de rentes du Québec \(RRQ\)/ })
  const oas = page.getByRole('region', { name: /Sécurité de la vieillesse \(PSV\)/ })
  await expect(rrq).toBeVisible({ timeout: 60_000 })
  await expect(rrq.locator('tbody tr')).toHaveCount(4)
  await expect(oas.locator('tbody tr')).toHaveCount(2)
  // The rule's own adjustments, in the reader's number format: +42,0 % at 70, +58,8 % at 72 (QPP); +36,0 % at 70 (OAS).
  await expect(rrq.getByRole('row', { name: /^70 ans/ })).toContainText('+42,0 %')
  await expect(rrq.getByRole('row', { name: /^72 ans/ })).toContainText('+58,8 %')
  await expect(oas.getByRole('row', { name: /^70 ans/ })).toContainText('+36,0 %')
  // The row of the profile's own start age (65) is named, and only that one.
  await expect(rrq.getByText('votre plan actuel')).toHaveCount(1)
  await expect(rrq.getByRole('row', { name: /^65 ans/ })).toContainText('votre plan actuel')
  // The second person has their own comparison.
  const before = await rrq.locator('tbody tr').first().innerText()
  await page.getByRole('tablist', { name: 'Pour' }).getByRole('tab', { name: 'Alex' }).click()
  await expect(page.getByRole('heading', { name: 'Pour Alex' })).toBeVisible()
  await expect(rrq.locator('tbody tr').first()).not.toHaveText(before)
  // It says what it leaves out.
  await expect(page.getByText(/rente de conjoint survivant n’est pas modélisée/)).toBeVisible()
  expect(problems).toEqual([])
})
