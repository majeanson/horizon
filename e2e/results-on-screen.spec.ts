import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, seedProfile } from './seed'
import { trackJobs } from './jobs'

// RESULTS ON SCREEN (the review of 2026-10-19): a nudge says nothing before the answer is in, and a link inside the proof never closes the blocks the reader opened.

test('the spouses’ balance nudge is not asked before the answer is in — even with its block in view from the start', async ({ page }) => {
  test.slow()
  // The answer held back on purpose (its request reaches the worker 6 s late): on a phone or CI's runner it is slow anyway, and the year section — open by
  // default, its block « seen » the moment it scrolls into view — is on screen long before it. Deterministic, not a race on this machine's speed.
  const jobs = await trackJobs(page, { answer: 6_000 })
  await seedProfile(page, EXAMPLE) // a couple: the nudge applies
  await page.goto('/resultats?cartes=all')
  const year = page.locator('#annee')
  await year.waitFor({ state: 'attached', timeout: 60_000 })
  await year.scrollIntoViewIfNeeded()
  const pending = page.locator('.skeleton--verdict')
  await expect(pending.first()).toBeAttached() // the answer is not in: the case this test is about
  // the whole time the answer is pending, no balance search may start (it would compute for the plan's own age, then change its sentence)
  let askedWhilePending = false
  while ((await pending.count()) > 0) {
    if (await jobs.asked('spouseBalance')) askedWhilePending = true
    await page.waitForTimeout(100)
  }
  expect(askedWhilePending, 'the balance search started before the answer was in').toBe(false)
  // once the answer is in, it is asked
  await year.scrollIntoViewIfNeeded()
  await expect.poll(() => jobs.asked('spouseBalance'), { timeout: 120_000 }).toBe(true)
})

test('« Voir les pages officielles » inside « Précision » keeps every block the reader opened, and lands on the parameters', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?bloc=tout#precision')
  const link = page.getByRole('button', { name: 'Voir les pages officielles (Paramètres utilisés)' })
  await expect(link).toBeVisible({ timeout: 60_000 })
  await link.click()
  await expect(page).toHaveURL(/bloc=tout/) // « Tout ouvrir » stays: no block closes under the reader
  await expect(page.locator('#parametres')).toBeInViewport({ timeout: 10_000 })
})

test('after a way of starting is picked, the three-scenario marks are pending until worked out again — never the previous ages’ dots shown as final', async ({ page }) => {
  test.slow()
  await seedProfile(page, EXAMPLE)
  await page.goto('/decider?bt=cards')
  // the marks are inside each card's « Détails »: open them all, as bridge.spec does
  // the cards wait as an inert ghost of themselves (BridgePanel): the real ones are those with a « Détails » a reader can press
  await expect(page.locator('.bridge-card').getByRole('button', { name: /^Détails/ }).first()).toBeVisible({ timeout: 60_000 })
  for (const b of await page.locator('.bridge-card').getByRole('button', { name: /^Détails/ }).all()) await b.click()
  const marks = page.locator('.bridge-mark')
  await expect(marks.first()).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.bridge-mark', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 }) // the first ones are in
  await page.locator('.bridge-card').getByRole('radio', { name: 'Reporter au maximum', exact: true }).click()
  // the cards change at once (one projection set); the fifteen marks behind them are being worked out again: said so
  await expect(page.locator('.bridge-mark', { hasText: '…' }).first()).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('.bridge-mark', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
})

// THE CLOUD REVIEW OF THE SAME SCOPE (2026-10-20): a way of starting no longer open writes nothing, « both » is stored for both, and « Garder » on a full list replaces.

type Person = { birth: { year: number; month: number }; retirementAge: number; rrq: { startAge: number }; oas: { startAge: number } }
const saved = async (page: import('@playwright/test').Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), PROFILE_KEY)

test('a way of starting already behind the person (a pension paid since 65, now 68) cannot be tapped into the profile', async ({ page }) => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { persons: Person[] } }
  Object.assign(p.household.persons[0], { birth: { year: 1958, month: 3 }, retirementAge: 60 })
  await seedProfile(page, p as never)
  await page.goto('/decider?bt=cards')
  const card = (name: string) => page.locator('.bridge-card').getByRole('radio', { name, exact: true })
  await expect(card('Pont jusqu’à 70 ans')).toBeVisible({ timeout: 60_000 })
  await expect(card('Pont jusqu’à 70 ans')).toBeDisabled() // its note says it: shown to compare, not to choose
  await expect(card('Reporter au maximum')).toBeDisabled()
  // the ages already being paid stay open (their card is named « Standard » with « Mon plan » beside it: the person's own ages ARE the standard)
  await expect(page.locator('.bridge-card').getByRole('radio', { name: /^Standard/ })).toBeEnabled()
  expect((await saved(page)).household.persons[0].rrq.startAge).toBe(65)
})

test('« Les deux à 70 ans » stores BOTH people’s ages — the rest of the app reads the profile, not the address — and undo puts both back', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/decider?bt=cards')
  const card = (name: string) => page.locator('.bridge-card').getByRole('radio', { name, exact: true })
  await card('Les deux à 70 ans').click()
  await expect.poll(async () => (await saved(page)).household.persons.map((x: Person) => [x.rrq.startAge, x.oas.startAge])).toEqual([
    [70, 70],
    [70, 70],
  ])
  await page.locator('.bridge__applied').getByRole('button', { name: 'Annuler ce changement' }).click()
  await expect.poll(async () => (await saved(page)).household.persons.map((x: Person) => [x.rrq.startAge, x.oas.startAge])).toEqual([
    [65, 65],
    [65, 65],
  ])
})

test('a full list of events that holds the care keeps « Garder »: it REPLACES the care, adds nothing', async ({ page }) => {
  const p = structuredClone(EXAMPLE) as unknown as { household: { flows: unknown[] } }
  const roof = (i: number) => ({ label: `Toit ${i}`, kind: 'expense', amount: 1_000, fromYear: 2030 + i, toYear: 2030 + i, owner: 'self', taxable: false })
  p.household.flows = [...Array.from({ length: 19 }, (_, i) => roof(i)), { label: 'Des soins plus tard', kind: 'expense', amount: 30_000, fromYear: 2063, toYear: 2072, owner: 'self', taxable: false }]
  await seedProfile(page, p as never)
  await page.goto('/decider?care=45000,88,6')
  await expect(page.locator('#soins .answer__big')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#soins')).toContainText('cet essai le remplace')
  await page.locator('#soins').getByRole('button', { name: 'L’ajouter à mes événements' }).click()
  await expect.poll(async () => (await saved(page)).household.flows.filter((f: { amount: number }) => f.amount === 45_000).length).toBe(1)
  const flows = (await saved(page)).household.flows as { label: string; amount: number }[]
  expect(flows).toHaveLength(20)
  expect(flows.filter((f) => f.label === 'Des soins plus tard')).toHaveLength(1)
})
