import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, PROFILE_KEY, savedProfile, seedProfile } from './seed'

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

test('the strategy view sits on the page: each year from 60 to 70, five strategies and two pictures', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/resultats?v=strategies&bt=cards')

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
    // each year of the bridge, as text: ages 60 to 70, with the start of the pensions tagged
    const rows = page.locator('.bridge__table tbody tr')
    await expect(rows).toHaveCount(11)
    await expect(rows.first().locator('th')).toContainText('60')
    await expect(rows.last().locator('th')).toContainText('70')
    await expect(page.locator('.bridge__table .bridge__tag').first()).toBeVisible()
    // two pictures, each named
    const figures = page.locator('.bridge figure.chart')
    await expect(figures).toHaveCount(2)
    await expect(figures.first()).toHaveAttribute('aria-label', /Sources de revenus année par année, de 60 à 70 ans/)
    await expect(figures.last()).toHaveAttribute('aria-label', /Nid en fin d’année/)
    await expect(figures.first().locator('.recharts-bar-rectangle').first()).toBeVisible()
    expect(await figures.first().locator('.chart__plot').boundingBox().then((b) => b!.height)).toBeGreaterThan(200)
    expect(problems).toEqual([])
})

test('choosing a way of starting saves the ages in the profile, presses the card, and changes the verdict', async ({ page }) => {
  await page.goto('/resultats?v=strategies&bt=cards')
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
  await page.goto('/resultats?v=strategies&bt=cards')
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
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  const std = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Standard (c’est aussi votre plan)', exact: true }) })
  const max = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Reporter au maximum', exact: true }) })
  await openDetails(page)
  await expect(max.getByText(/de plus tirés du nid entre 60 et 69 ans que le standard/)).toBeVisible()
  await expect(std.getByText('La référence des comparaisons')).toBeVisible()
  await expect(max.getByText(/rattrapent le standard à \d\d ans/)).toBeVisible()
})

test('a couple has one tab per person, each with their own ages from the profile', async ({ page }) => {
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  await expect(page.locator('.bridge')).toContainText('retraite à 60 ans')
  const tabs = page.getByRole('tablist', { name: 'Pour' })
  await expect(tabs.getByRole('tab')).toHaveCount(2)
  await tabs.getByRole('tab').nth(1).click()
  await expect(page).toHaveURL(/bp=spouse/)
  await expect(page.locator('.bridge')).toContainText('retraite à 62 ans')
})

test('« jusqu’à l’horizon » shows every year of the plan, and the bridge shows only 60 to 70', async ({ page }) => {
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
  await page.getByRole('tab', { name: 'Jusqu’à la fin du plan' }).click()
  await expect(page).toHaveURL(/bw=plan/)
  await expect.poll(() => page.locator('.bridge__table tbody tr').count()).toBeGreaterThan(30)
  await page.getByRole('tab', { name: '60 à 70 ans' }).click()
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
})

test('the three sets of assumptions: eighteen answers, filled in by themselves off the page’s thread', async ({ page }) => {
  await page.goto('/resultats?v=strategies&bt=cards')
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
  await page.goto('/resultats?v=strategies&bt=cards')
  await page.locator('.bridge-card').getByRole('radio', { name: 'Bridge to 70', exact: true }).click()
  await expect(page.locator('.bridge__verdict')).toContainText(/You can defer|Deferring uses up/)
  await expect(page.locator('.bridge')).toContainText('Your ages: retire at age 60, QPP at age 70, OAS at age 70')
  await expect(page.locator('.bridge__table thead')).toContainText('Nest egg at year end')
})

test('on a phone the view fits the screen: the table scrolls inside its own region, nothing runs off the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.locator('.bridge__verdict')).toBeVisible({ timeout: 30_000 }) // worked out in a worker: slow under a loaded machine
  await expectNoHorizontalOverflow(page, page.locator('.bridge'))
  await expect(page.locator('.bridge__table')).toHaveAttribute('role', 'region')
})

test('« Le nid » has a net-value twin when there is a home: the nest alone says how the accounts hold, the net value what the household owns', async ({ page }) => {
  const owner = JSON.parse(JSON.stringify(EXAMPLE))
  owner.household.home = { value: 520_000, mortgage: { balance: 150_000, rate: 0.049, monthlyPayment: 1_150 }, sale: null }
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(owner)] as const) // after the file's own seed: the last write wins
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.getByRole('heading', { name: 'Le nid, selon la façon de commencer' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'La valeur nette, selon la façon de commencer' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Valeur nette \(nid plus avoir foncier\)/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Nid en fin d’année selon/ })).toBeVisible()
})

test('…and without a home there is one picture: the net value would be the same lines', async ({ page }) => {
  // (the seeded example owns no home)
  await page.goto('/resultats?v=strategies&bt=cards')
  await expect(page.getByRole('heading', { name: 'Le nid, selon la façon de commencer' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'La valeur nette, selon la façon de commencer' })).toHaveCount(0)
})
