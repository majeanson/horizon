import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, savedProfile, seedProfile, showAllSections } from './seed'

// The results page keeps its three views and the map pinned under the top bar while it scrolls, and the chart's
// « Détail » view shows the whole picture (sources, accounts, the three sets of hypotheses), not only the net worth.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the views and the section map stay pinned while the page scrolls', async ({ page }) => {
  await page.goto('/resultats')
  const pin = page.locator('.results-pin')
  await expect(pin).toBeVisible()
  const bar = await page.locator('.shell__bar').boundingBox()
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1200 }))
  await expect.poll(async () => Math.round((await pin.boundingBox())!.y)).toBe(Math.round(bar!.y + bar!.height))
  await expect(pin.getByRole('tab').first()).toBeInViewport()
})

test('« Détail » shows where the money comes from, where it goes and what the accounts hold — and nothing the answer card already says', async ({ page }) => {
  await page.goto('/resultats?metric=detail')
  const chart = page.locator('.chart-panel')
  await expect(chart.getByRole('img')).toHaveCount(3, { timeout: 30_000 })
  await expect(chart.getByRole('heading', { name: 'D’où vient l’argent, année par année' })).toBeVisible()
  await expect(chart.getByRole('heading', { name: 'Où va l’argent, année par année' })).toBeVisible() // e2e/flow.spec.ts holds it
  await expect(chart.getByRole('heading', { name: 'Ce que contiennent les comptes' })).toBeVisible()
  // The three scenarios are said ONCE, on the answer card (and marked on the strategy cards): no third chart of them here.
  await expect(chart.getByRole('heading', { name: /hypothèses/ })).toHaveCount(0)
})

// How much is pinned depends on the room: the views everywhere, the section map only from 860 px up. A tapped section
// must stop BELOW whatever is pinned — measured, not guessed (lib/pinOffset.ts).
for (const [name, width, height, mapPinned] of [['phone', 390, 844, false], ['desktop', 1280, 720, true]] as const) {
  test(`${name}: the views are pinned${mapPinned ? ' with the section map' : ', the map scrolls away'}, and a tapped section stops below them`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/resultats')
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
    const pin = page.locator('.results-pin')
    const nav = page.locator('.section-nav')
    await expect(pin).toBeVisible()
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1500 }))
    const pinBox = (await pin.boundingBox())!
    await expect.poll(async () => ((await nav.boundingBox())!.y >= pinBox.y + pinBox.height - 1)).toBe(mapPinned)
    // Back at the top, tap « Comparer » in the map: the section stops under the pinned chrome, fully clear of it.
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
    await expect.poll(() => page.locator('#root').evaluate((el) => el.scrollTop)).toBe(0) // the page may scroll smoothly: tap only once it is back
    // …and only once the page has stopped growing: a smooth scroll aims at where the section WAS when it began.
    let last = -1
    await expect
      .poll(async () => {
        const h = await page.locator('#root').evaluate((el) => el.scrollHeight)
        const same = h === last
        last = h
        return same
      }, { intervals: [600] })
      .toBe(true)
    await nav.getByRole('button', { name: 'Comparer' }).click()
    const target = page.locator('#comparer')
    // The page settles (a smooth scroll, the worker's answers replacing skeletons) before it is measured: poll the landing
    // spot until it holds, instead of guessing how long that takes.
    await expect
      .poll(
        async () => {
          const navBox = (await nav.boundingBox())!
          const pinNow = (await pin.boundingBox())!
          const clear = mapPinned ? navBox.y + navBox.height : pinNow.y + pinNow.height
          const top = (await target.boundingBox())!.y
          return top >= clear - 2 && top < clear + 120 // clear of the chrome, and close to it: scrolled TO, not left below the fold
        },
        { timeout: 10_000, message: 'landing' },
      )
      .toBe(true)
  })
}

test('the year-by-year table is ONE table; the scenario is chosen in its header and the export follows', async ({ page }) => {
  await page.goto('/resultats?v=verify&ages=plan,60,65')
  const block = page.locator('.year-table')
  await expect(block.locator('table')).toHaveCount(1, { timeout: 30_000 })
  const tabs = block.locator('.table-chooser').getByRole('tab')
  await expect(tabs).toHaveCount(3)
  const title = block.locator('.year-table__title')
  const first = await title.textContent()
  await tabs.nth(1).click()
  await expect(title).not.toHaveText(first!)
  await expect(block.locator('table')).toHaveCount(1)
  const download = page.waitForEvent('download')
  await block.getByRole('button', { name: /CSV|tableur/i }).click()
  expect((await download).suggestedFilename()).toMatch(/[a-z]/i) // a readable name, not a row of dashes
})

test('what a table shows lives in the address: a link opens on the same set, the default writes nothing', async ({ page }) => {
  // The retirement age of the year-by-year table.
  await page.goto('/resultats?v=verify&ages=plan,60,65&table=65')
  const title = page.locator('.year-table .year-table__title')
  await expect(title).toContainText('65 ans', { timeout: 30_000 })
  await page.locator('.year-table .table-chooser').getByRole('tab', { name: '60 ans', exact: true }).click()
  await expect(page).toHaveURL(/table=60/)
  await expect(title).toContainText('60 ans')
});

test('« Mon plan » always says its age', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByRole('button', { name: /^Mon plan \(\d+( \/ \d+)? ans\)$/ })).toBeVisible()
  await page.goto('/resultats?v=strategies&bt=cards')
  // (the card for it is folded into « Standard » when the plan's pension ages ARE the standard, and says so)
  await expect(page.locator('.bridge-card').getByRole('radio', { name: /^Mon plan \(\d+ ans\)$|^Standard \(c’est aussi votre plan\)$/ })).toBeVisible({ timeout: 60_000 })
})

// Two people, one format: the same sections begin on the same line in both columns, each card wears its person's colour down
// the left edge, and no amount is ever cut off by a box that is too narrow.
test('two people on the Profil: sections start at the same height, the colour follows down, every input shows in full', async ({ page }) => {
  await showAllSections(page) // every section a person can have, so the two columns have the same five
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/profil')
  const columns = page.locator('.persons--aligned > .person')
  await expect(columns).toHaveCount(2)
  const tops = async (col: number) => columns.nth(col).locator(':scope > .profile-section').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top + (document.getElementById('root')?.scrollTop ?? 0))))
  expect(await tops(0)).toEqual(await tops(1))
  expect((await tops(0)).length).toBe(5)
  // The colour is the rounded left edge of every card, and the two people's differ.
  const edge = (col: number) => columns.nth(col).locator(':scope > .profile-section').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderLeftColor))
  const first = await edge(0)
  const second = await edge(1)
  expect(new Set(first).size).toBe(1)
  expect(new Set(second).size).toBe(1)
  expect(first[0]).not.toBe(second[0])
  // No input clips its text (a box too narrow for « 1 000 000 » showed « 30 ( »).
  const clipped = await page.locator('.persons--aligned input').evaluateAll((els) => els.filter((e) => (e as HTMLInputElement).scrollWidth > (e as HTMLInputElement).clientWidth + 1).map((e) => e.id))
  expect(clipped).toEqual([])
})

test('« Depuis la naissance » sets the year of residence to the year of birth, and reads as chosen', async ({ page }) => {
  await showAllSections(page) // the residence year is asked of someone who said « oui » to years abroad
  await page.goto('/profil')
  const person = (await savedProfile(page)).household.persons[0]
  const chip = page.getByRole('button', { name: 'Depuis la naissance' }).first()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await chip.click()
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].oas.residentSince).toBe(person.birth.year)
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
})

test('the estimate shows the pay as it was — about the salary last year — and says how much of each year the QPP counts', async ({ page }) => {
  // A history with nothing typed and a 120 000 $ salary: every past year is an estimate.
  const seed = structuredClone(EXAMPLE) as { household: { persons: { salaryToday: number; earningsHistory: Record<string, number> }[] } }
  seed.household.persons[0].salaryToday = 120_000
  seed.household.persons[0].earningsHistory = {}
  // (beforeEach already seeded the example, and a second seed is ignored — once per tab: replace what is stored, then reload.)
  await page.goto('/profil')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(seed)])
  await page.reload()
  const section = page.locator('.persons .profile-section', { hasText: 'Revenus de travail admissibles par année' }).first()
  await expect(section.locator('.earnings__row', { hasText: '2025' }).locator('input')).toHaveValue('') // really empty before the estimate
  await section.getByRole('button', { name: /Estimer les années vides/ }).click()
  // 2025: close to the 120 000 $ salary (deflated by one year of wage growth), NOT cut at the QPP's ceiling…
  const last = section.locator('.earnings__row', { hasText: '2025' })
  await expect(last.locator('input')).toHaveValue(/11\d\s?\d{3}/)
  // …and the row says what the QPP counts of it: the additional ceiling, 81 200 $.
  await expect(last).toContainText(/compte jusqu’à 81\s?200/)
  // 2023, before the additional ceiling existed: the plain maximum, 66 600 $.
  await expect(section.locator('.earnings__row', { hasText: '2023' })).toContainText(/compte jusqu’à 66\s?600/)
})

test('the home: owning one, its mortgage says when the payment stops, and it is saved with the profile', async ({ page }) => {
  await page.goto('/profil')
  // « Ma situation »: the home's section opens on a « oui » to owning one
  await page.getByRole('radiogroup', { name: /Propriétaire de votre résidence/ }).getByRole('radio', { name: 'Oui' }).click()
  const section = page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: 'Résidence principale' }) })
  await section.getByRole('textbox', { name: 'Valeur de la maison aujourd’hui' }).fill('520000')
  await section.getByRole('textbox', { name: 'Solde de l’hypothèque' }).fill('150000')
  await section.getByRole('textbox', { name: 'Solde de l’hypothèque' }).blur() // a box commits when left: the rate and payment fields appear once there is a balance
  await section.getByRole('textbox', { name: 'Taux de l’hypothèque (annuel)' }).fill('4,9')
  await section.getByRole('textbox', { name: 'Taux de l’hypothèque (annuel)' }).blur()
  await section.getByRole('textbox', { name: 'Paiement mensuel' }).fill('1150')
  await section.getByRole('textbox', { name: 'Paiement mensuel' }).blur()
  // The payment stops on a stated date — the same year the plan's table stops charging it.
  await expect(section).toContainText(/Hypothèque payée en \d{4}, dans \d+ ans\s: ce paiement cesse alors\./)
  await expect.poll(async () => (await savedProfile(page)).household.home).toMatchObject({ value: 520_000, mortgage: { balance: 150_000, rate: 0.049, monthlyPayment: 1_150 }, sale: null })
  // A payment that does not cover the interest says so, plainly.
  await section.getByRole('textbox', { name: 'Paiement mensuel' }).fill('300')
  await section.getByRole('textbox', { name: 'Paiement mensuel' }).blur()
  await expect(section).toContainText('ne se rembourse jamais')
  // A sale can be planned.
  await section.getByRole('button', { name: 'Vendre ou réduire à un certain âge' }).click()
  await section.getByRole('textbox', { name: 'Âge de la vente (première personne)' }).fill('78')
  await section.getByRole('textbox', { name: 'Âge de la vente (première personne)' }).blur()
  await expect.poll(async () => (await savedProfile(page)).household.home.sale).toEqual({ age: 78, replacementCost: 0 })
  // Taking the home away asks what is lost, and erases it.
  await section.getByRole('button', { name: 'Retirer la résidence' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.home).toBeNull()
  // … and the section goes with it: no home, no section (the question says « non » again)
  await expect(section).toHaveCount(0)
  await expect(page.getByRole('radiogroup', { name: /Propriétaire de votre résidence/ }).getByRole('radio', { name: 'Non' })).toBeChecked()
})
