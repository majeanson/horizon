import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, savedProfile, seedProfile } from './seed'
import { trackJobs } from './jobs'

// « Mes années 60 à 70 » in a real browser: the strategy view sits on the results page, always visible, computed
// off the page's thread, keeps every choice in the address, and shows each year of the bridge as text beside the
// pictures. The arithmetic is pinned by engine/bridge.test.ts; this pins that a person can SEE and drive it.

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  return problems
}

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

// The cards are closed (their dots say how each holds): open every one to read what is inside.
async function openDetails(page: Page): Promise<void> {
  for (const b of await page.locator('.bridge-card').getByRole('button', { name: /^Détails/ }).all()) await b.click()
}

test('the strategy view sits on the page: each year from 60 to 70, five strategies and three pictures', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/decider?bt=cards')

    // the verdict sentence and the five ways of starting
    // (the age is the one of the person looked at — Camille, the older one — not the plan's horizon for the younger:
    // the sentence says « l’horizon », the verdict's word, and names whose age it prints)
    await expect(page.locator('.bridge__verdict')).toContainText(/dure jusqu’à la fin du plan \(Camille\s: \d\d ans\)/)
    // the golden couple's own plan IS the standard: one card says so instead of two identical ones
    for (const name of ['Tout dès que possible', 'Standard (c’est aussi votre plan)', 'Reporter au maximum', 'Pont jusqu’à 70 ans', 'Les deux à 70 ans']) {
      await expect(page.locator('.bridge-card').getByRole('radio', { name, exact: true })).toBeVisible()
    }
    await expect(page.locator('.bridge-card')).toHaveCount(5)
    await expect(page.getByRole('radiogroup', { name: 'Façons de commencer vos rentes' })).toBeVisible()
    // the year by year and the three pictures are the second view of the same panel
    await page.getByRole('tab', { name: 'Année par année' }).click()
    await expect(page).toHaveURL(/bv=years/)
    // each year of the bridge, as text: ages 60 to 70, with the start of the pensions tagged
    const rows = page.locator('.bridge__table tbody tr')
    await expect(rows).toHaveCount(11)
    await expect(rows.first().locator('th')).toContainText('60')
    await expect(rows.last().locator('th')).toContainText('70')
    await expect(page.locator('.bridge__table .bridge__tag').first()).toBeVisible()
    // three pictures, each named
    const figures = page.locator('.bridge figure.chart')
    await expect(figures).toHaveCount(3)
    await expect(figures.first()).toHaveAttribute('aria-label', /Sources de revenus année par année, de 60 à 70 ans/)
    await expect(figures.nth(1)).toHaveAttribute('aria-label', /Nid en fin d’année/)
    await expect(figures.last()).toHaveAttribute('aria-label', /Rentes garanties par année/)
    await expect(figures.first().locator('.recharts-bar-rectangle').first()).toBeVisible()
    expect(await figures.first().locator('.chart__plot').boundingBox().then((b) => b!.height)).toBeGreaterThan(200)
    expect(problems).toEqual([])
})

test('choosing a way of starting saves the ages in the profile, presses the card, and changes the verdict', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  const card = (name: string) => page.locator('.bridge-card').getByRole('radio', { name, exact: true })
  await card('Reporter au maximum').click()
  // the ages are the PROFILE's: the card writes them there, and nothing about them is in the address
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].rrq.startAge).toBe(72)
  expect((await savedProfile(page)).household.persons[0].oas.startAge).toBe(70)
  await expect(page).not.toHaveURL(/bq=|bo=|br=/)
  await expect(card('Reporter au maximum')).toHaveAttribute('aria-checked', 'true')
  await expect(card('Standard')).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.bridge__verdict')).toContainText('Vous pouvez reporter')
  await expect(page.locator('.bridge')).toContainText('Vos âges : retraite à 60 ans, RRQ à 72 ans, PSV à 70 ans')

  // reloading keeps them: the plan is the profile's
  await page.reload()
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  await expect(page.locator('.bridge-card').getByRole('radio', { name: 'Reporter au maximum', exact: true })).toHaveAttribute('aria-checked', 'true')
})

test('« Pour les deux » makes the other person follow: it is in the address, presses « Les deux à 70 ans », and survives a reload', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  const both = page.getByRole('button', { name: 'Pour les deux', exact: true })
  await expect(both).toHaveAttribute('aria-pressed', 'false')
  await page.locator('.bridge-card').getByRole('radio', { name: 'Pont jusqu’à 70 ans', exact: true }).click()
  await both.click()
  await expect(page).toHaveURL(/bb=1/)
  // The pressed card describes what the worker computed FOR these levers, so it follows the address by one recomputation: wait for it like the matrix does.
  await expect(page.locator('.bridge-card').getByRole('radio', { name: 'Les deux à 70 ans', exact: true })).toHaveAttribute('aria-checked', 'true', { timeout: 60_000 })
  await expect(page.locator('.bridge-card').getByRole('radio', { name: 'Pont jusqu’à 70 ans', exact: true })).toHaveAttribute('aria-checked', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Pour les deux', exact: true })).toHaveAttribute('aria-pressed', 'true')
  // choosing another strategy turns it off
  await page.locator('.bridge-card').getByRole('radio', { name: 'Reporter au maximum', exact: true }).click()
  await expect(page).not.toHaveURL(/bb=1/)
})

test('a deferral digs into the nest first: the nest at 70 is lower than starting at 65, and the cost is said in dollars', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  const std = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Standard (c’est aussi votre plan)', exact: true }) })
  const max = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Reporter au maximum', exact: true }) })
  await openDetails(page)
  await expect(max.getByText(/de plus tirés du nid entre 60 et 69 ans que le standard/)).toBeVisible()
  await expect(std.getByText('La référence des comparaisons')).toBeVisible()
  await expect(max.getByText(/dépassent le standard à \d\d ans/)).toBeVisible()
})

test('a couple has one tab per person, each with their own ages from the profile', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  await expect(page.locator('.bridge')).toContainText('retraite à 60 ans')
  const tabs = page.getByRole('tablist', { name: 'Pour' })
  await expect(tabs.getByRole('tab')).toHaveCount(2)
  await tabs.getByRole('tab').nth(1).click()
  await expect(page).toHaveURL(/bp=spouse/)
  await expect(page.locator('.bridge')).toContainText('retraite à 62 ans')
})

test('« jusqu’à l’horizon » shows every year of the plan, and the bridge shows only 60 to 70', async ({ page }) => {
  await page.goto('/decider?bt=cards&bv=years')
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
  await page.getByRole('tab', { name: 'Jusqu’à la fin du plan' }).click()
  await expect(page).toHaveURL(/bw=plan/)
  await expect.poll(() => page.locator('.bridge__table tbody tr').count()).toBeGreaterThan(30)
  await page.getByRole('tab', { name: '60 à 70 ans' }).click()
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
})

test('the three sets of assumptions: eighteen answers, filled in by themselves off the page’s thread', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  // On EACH card: three dots, and — once the card is opened — the same way of starting under the three scenarios, one mark each.
  await expect(page.locator('.bridge-card .dots')).toHaveCount(5)
  await expect(page.locator('.dots__dot.is-pending')).toHaveCount(0, { timeout: 60_000 })
  await openDetails(page)
  const marks = page.locator('.bridge-card__marks')
  await expect(marks).toHaveCount(5)
  await expect(page.locator('.bridge-mark', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  await expect(page.locator('.bridge-mark')).toHaveCount(15)
  // the neutral scenario lasts for the golden couple; the prudent one does not, and says to what age
  const standard = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Standard (c’est aussi votre plan)', exact: true }) })
  await expect(standard.locator('.bridge-mark', { hasText: 'Neutre' })).toContainText('Neutre : dure')
  await expect(standard.locator('.bridge-mark', { hasText: 'Prudent' })).toContainText(/Prudent\s: jusqu’à \d\d ans/)
  await expect(standard.locator('.bridge-mark--short')).toHaveCount(1)
})

test('English: the view speaks English and keeps the same choices', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/decider?bt=cards')
  await page.locator('.bridge-card').getByRole('radio', { name: 'Bridge to 70', exact: true }).click()
  await expect(page.locator('.bridge__verdict')).toContainText(/You can defer|Deferring uses up/)
  await expect(page.locator('.bridge')).toContainText('Your ages: retire at age 60, QPP at age 70, OAS at age 70')
  await expect(page.getByRole('tab', { name: 'Year by year' })).toBeVisible()
  await page.getByRole('tab', { name: 'Year by year' }).click()
  await expect(page.locator('.bridge__table thead')).toContainText('Nest egg at year end')
})

test('on a phone the view fits the screen: the table scrolls inside its own region, nothing runs off the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/decider?bt=cards&bv=years')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  await expectNoHorizontalOverflow(page, page.locator('.bridge'))
  await expect(page.locator('.bridge__table')).toHaveAttribute('role', 'region')
})

test('under « Le nid », a second picture shows what the pensions pay each year: waiting buys a higher step, for life', async ({ page }) => {
  await page.goto('/decider?bt=cards&bv=years')
  await expect(page.getByRole('heading', { name: 'Le nid, selon la façon de commencer' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Ce que paient les rentes, selon la façon de commencer' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Rentes garanties par année selon la façon de commencer/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Nid en fin d’année selon/ })).toBeVisible()
})

test('« Quand commencer mes rentes ? » is one panel with four views — the ways, year by year, a short life, the reasons — the verdict always above, the choice in the address', async ({ page }) => {
  await page.goto('/decider?bt=cards')
  const views = page.getByRole('tablist', { name: 'Quatre façons de regarder vos rentes' })
  await expect(views.getByRole('tab')).toHaveText(['Façons de commencer', 'Année par année', 'Si l’un décède', 'Pourquoi et limites'])
  await expect(views.getByRole('tab', { name: 'Façons de commencer' })).toHaveAttribute('aria-selected', 'true')
  // the verdict stays above whichever view is open
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.bridge-card').first()).toBeVisible()
  await expect(page.locator('.bridge__table')).toHaveCount(0)
  await expect(page.locator('.sweep')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Pourquoi' })).toHaveCount(0)
  for (const [tab, key, shown] of [
    ['Année par année', 'years', '.bridge__table'],
    ['Si l’un décède', 'death', '.sweep'],
    ['Pourquoi et limites', 'why', '.bridge__list'],
  ] as const) {
    await views.getByRole('tab', { name: tab }).click()
    await expect(page).toHaveURL(new RegExp('bv=' + key))
    await expect(page.locator(shown).first()).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('.bridge-card')).toHaveCount(0)
    await expect(page.locator('.bridge__verdict')).toBeVisible()
  }
  // an address that names a view opens it; an unknown one falls back to the ways
  await page.goto('/decider?bv=why')
  await expect(page.getByRole('tab', { name: 'Pourquoi et limites' })).toHaveAttribute('aria-selected', 'true')
  await page.goto('/decider?bv=nope&bt=cards')
  await expect(page.locator('.bridge-card').first()).toBeVisible({ timeout: 60_000 })
})

test('the thirty projections of « Si l’un décède » are not run until that view is opened', async ({ page }) => {
  const jobs = await trackJobs(page)
  await page.goto('/decider?bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.dots__dot.is-pending')).toHaveCount(0, { timeout: 60_000 }) // the cards' scenarios are in: the sweep used to start now
  await page.waitForTimeout(3_000)
  expect(await jobs.asked('deathSweep'), 'no death sweep before its view').toBe(false)
  await page.getByRole('tab', { name: 'Si l’un décède' }).click()
  await expect.poll(() => jobs.asked('deathSweep'), { timeout: 30_000 }).toBe(true)
  await expect(page.locator('.sweep table')).toBeVisible({ timeout: 90_000 })
})
