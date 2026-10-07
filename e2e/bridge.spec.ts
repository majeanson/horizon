import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, seedProfile } from './seed'

// « Mes années 60 à 70 » in a real browser: the strategy view sits on the results page in BOTH modes, computes only when
// opened (off the page's thread), keeps every choice in the address, and shows each year of the bridge as text beside the
// pictures. The arithmetic is pinned by engine/bridge.test.ts; this pins that a person can SEE and drive it.

const OPEN = /Mes années 60 à 70/

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  return problems
}

const useMode = (page: Page, mode: 'simple' | 'full') =>
  page.addInitScript((m) => {
    if (!sessionStorage.getItem('mode-seeded')) {
      sessionStorage.setItem('mode-seeded', '1')
      localStorage.setItem('horizon-mode', m)
    }
  }, mode)

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

for (const mode of ['simple', 'full'] as const) {
  test(`${mode}: one visible line opens the strategy view; it shows each year from 60 to 70, five strategies and two pictures`, async ({ page }) => {
    const problems = watchConsole(page)
    await useMode(page, mode)
    await page.goto('/resultats')
    const open = page.getByRole('button', { name: OPEN })
    await expect(open).toBeVisible()
    await expect(open).toHaveAttribute('aria-expanded', 'false')
    await open.click()

    // the verdict sentence and the five ways of starting
    // (the age is the one of the person looked at — Camille, the older one — not the plan's horizon for the younger)
    await expect(page.locator('.bridge__verdict')).toContainText(/tient jusqu’à \d\d ans/)
    await expect(page.getByText('Les âges de cette page sont ceux de Camille')).toBeVisible()
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
    await expect(figures.last()).toHaveAttribute('aria-label', /Pécule en fin d’année/)
    await expect(figures.first().locator('.recharts-bar-rectangle').first()).toBeVisible()
    expect(await figures.first().locator('.chart__plot').boundingBox().then((b) => b!.height)).toBeGreaterThan(200)
    expect(problems).toEqual([])
  })
}

test('choosing a way of starting is written in the address, pressed on the chip, and changes the verdict', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  const card = (name: string) => page.locator('.bridge-card').getByRole('radio', { name, exact: true })
  await card('Reporter au maximum').click()
  await expect(page).toHaveURL(/bq=72/)
  await expect(page).toHaveURL(/bo=70/)
  await expect(card('Reporter au maximum')).toHaveAttribute('aria-checked', 'true')
  await expect(card('Standard (c’est aussi votre plan)')).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('.bridge__verdict')).toContainText('Vous pouvez reporter')
  // the levers say the same
  const rrq = page.getByRole('group', { name: /Début du RRQ/ })
  await expect(rrq.getByRole('button', { name: '72', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: /Début de la PSV/ }).getByRole('button', { name: '70', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // a lever on its own leaves the five: the page says so
  await rrq.getByRole('button', { name: '63', exact: true }).click()
  await expect(page).toHaveURL(/bq=63/)
  await expect(page.getByText('Vos choix ne correspondent à aucune de ces façons')).toBeVisible()

  // a link carries the choices: reloading opens the view by itself on the same plan
  await page.reload()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  await expect(page.getByRole('group', { name: /Début du RRQ/ }).getByRole('button', { name: '63', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('« Pour les deux » makes the other person follow: it is in the address, presses « Les deux à 70 ans », and survives a reload', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  const both = page.getByRole('button', { name: 'Pour les deux', exact: true })
  await expect(both).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('group', { name: /Début du RRQ/ }).getByRole('button', { name: '70', exact: true }).click()
  await page.getByRole('group', { name: /Début de la PSV/ }).getByRole('button', { name: '70', exact: true }).click()
  await both.click()
  await expect(page).toHaveURL(/bb=1/)
  await expect(page.locator('.bridge-card').getByRole('radio', { name: 'Les deux à 70 ans', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.bridge-card').getByRole('radio', { name: 'Pont jusqu’à 70 ans', exact: true })).toHaveAttribute('aria-checked', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Pour les deux', exact: true })).toHaveAttribute('aria-pressed', 'true')
  // choosing another strategy turns it off
  await page.locator('.bridge-card').getByRole('radio', { name: 'Reporter au maximum', exact: true }).click()
  await expect(page).not.toHaveURL(/bb=1/)
})

test('two quick taps compose: neither one undoes the other', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  await page.getByRole('group', { name: /Début du RRQ/ }).getByRole('button', { name: '70', exact: true }).click()
  await page.getByRole('group', { name: /Début de la PSV/ }).getByRole('button', { name: '68', exact: true }).click()
  await expect(page).toHaveURL(/bq=70/)
  await expect(page).toHaveURL(/bo=68/)
})

test('a deferral digs into the nest first: the nest at 70 is lower than starting at 65, and the cost is said in dollars', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  const std = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Standard (c’est aussi votre plan)', exact: true }) })
  const max = page.locator('.bridge-card', { has: page.getByRole('radio', { name: 'Reporter au maximum', exact: true }) })
  await expect(max.getByText(/de plus tirés du pécule entre 60 et 69 ans que le standard/)).toBeVisible()
  await expect(std.getByText('La référence des comparaisons')).toBeVisible()
  await expect(max.getByText(/rattrapent le standard à \d\d ans/)).toBeVisible()
})

test('the retirement age is a field; a couple has one tab per person, each with their own start ages', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  const retire = page.getByLabel('Âge de la retraite')
  await expect(retire).toHaveValue('60')
  await retire.fill('58')
  await retire.press('Enter')
  await expect(page).toHaveURL(/br=58/)
  await expect(page.locator('.bridge__table tbody tr').first().locator('th')).toContainText('60')

  const tabs = page.getByRole('tablist', { name: 'Pour' })
  await expect(tabs.getByRole('tab')).toHaveCount(2)
  await tabs.getByRole('tab').nth(1).click()
  await expect(page).toHaveURL(/bp=spouse/)
  // the other person's own plan: their retirement age (62) is back, and the earlier choice is not carried over
  await expect(page.getByLabel('Âge de la retraite')).toHaveValue('62')
  await expect(page).not.toHaveURL(/br=58/)
})

test('« jusqu’à l’horizon » shows every year of the plan, and the bridge shows only 60 to 70', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
  await page.getByRole('tab', { name: 'Jusqu’à l’horizon' }).click()
  await expect(page).toHaveURL(/bw=plan/)
  await expect.poll(() => page.locator('.bridge__table tbody tr').count()).toBeGreaterThan(30)
  await page.getByRole('tab', { name: '60 à 70 ans' }).click()
  await expect(page.locator('.bridge__table tbody tr')).toHaveCount(11)
})

test('the three sets of assumptions: eighteen answers, computed only when that line is opened', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: OPEN }).click()
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sous trois jeux d’hypothèses' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sous trois jeux d’hypothèses' }).click()
  const matrix = page.getByRole('region', { name: 'Sous trois jeux d’hypothèses' })
  await expect(matrix.locator('tbody tr')).toHaveCount(6, { timeout: 30_000 })
  await expect(matrix.locator('tbody td')).toHaveCount(18)
  await expect(matrix.getByRole('columnheader')).toHaveText(['Façon de commencer', 'Prudent', 'Neutre', 'Audacieux'])
  // the neutral set holds for the golden couple; the prudent one does not, and says at what age
  await expect(matrix.locator('tbody tr').first().locator('td').nth(1)).toContainText('Tient')
  await expect(matrix.locator('tbody tr').first().locator('td').nth(0)).toContainText(/Manque à \d\d ans/)
})

test('English: the view speaks English and keeps the same choices', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?bq=70&bo=70')
  await expect(page.locator('.bridge__verdict')).toContainText(/You can defer|Deferring uses up/)
  await expect(page.getByRole('group', { name: /QPP start/ }).getByRole('button', { name: '70', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.bridge__table thead')).toContainText('Nest egg at year end')
})

test('on a phone the view fits the screen: the table scrolls inside its own region, nothing runs off the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/resultats?bq=70&bo=70')
  await expect(page.locator('.bridge__verdict')).toBeVisible()
  await expectNoHorizontalOverflow(page, page.locator('.bridge'))
  await expect(page.locator('.bridge__table')).toHaveAttribute('role', 'region')
})
