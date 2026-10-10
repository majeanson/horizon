import { expect, test } from '@playwright/test'
import { blankSeed, savedProfile, seedProfile, showAllSections, type SeedProfile } from './seed'

// Children: past, current and still to come — and what a child costs, from Statistics Canada, as a suggestion that never overrides a typed figure.

type Seed = { household: { persons: { salaryToday: number }[]; children: number[]; childSpending?: unknown } }
const THIS_YEAR = new Date().getFullYear()

const couple = (): SeedProfile => {
  const p = blankSeed() as unknown as Seed & { household: { livesAlone: boolean; persons: Record<string, unknown>[] } }
  p.household.persons[0].salaryToday = 120_000
  const spouse = structuredClone(p.household.persons[0]) as Record<string, unknown>
  spouse.id = 'spouse'
  spouse.salaryToday = 35_000
  p.household.persons.push(spouse)
  p.household.livesAlone = false
  return p as unknown as SeedProfile
}
const box = (page: import('@playwright/test').Page, name: string) => page.getByRole('textbox', { name, exact: true })

test('a planned child is added with one tap, shown as « prévu », and its cost is suggested from Statistics Canada', async ({ page }) => {
  await seedProfile(page, couple())
  await showAllSections(page)
  await page.goto('/?form=1')
  await page.getByRole('button', { name: 'Un enfant prévu' }).click()
  await expect(page.getByText(`${THIS_YEAR + 1} · prévu`)).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).household.children).toEqual([THIS_YEAR + 1])
  // the suggestion: two parents, medium income (155 k$), one child — Table 2's cell moved to today (× 1,259)
  await expect(page.getByText('Ce que coûte un enfant, selon Statistique Canada')).toBeVisible()
  // (the copy keeps a no-break space before the colon and inside the thousands: match the digits, not the spaces)
  await expect(page.getByText(/de 0 à 5 ans.+24\D600/)).toBeVisible()
  await expect(page.getByText(/de 6 à 12 ans.+26\D000/)).toBeVisible()
  await expect(page.getByText(/de 13 à 18 ans.+28\D600/)).toBeVisible()
  await expect(page.getByText(/à 19 ans et plus.+28\D400/)).toBeVisible()
  // nothing is put in the profile until the person asks
  expect((await savedProfile(page)).household.childSpending ?? null).toBeNull()
  await page.getByRole('button', { name: 'Utiliser ces montants pour un enfant prévu' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.childSpending?.byAge).toEqual([24_600, 26_000, 28_600, 28_400])
  await expect(page.getByText(/ajoute son coût par âge à votre budget, jusqu’en/)).toBeVisible()
})

test('the amounts by age can be typed over, and taken away; a typed figure is never replaced by the suggestion', async ({ page }) => {
  await seedProfile(page, couple())
  await showAllSections(page)
  await page.goto('/?form=1')
  await page.getByRole('button', { name: 'Un enfant prévu' }).click()
  await page.getByRole('button', { name: 'Utiliser ces montants pour un enfant prévu' }).click()
  const first = box(page, 'de 0 à 5 ans')
  await first.fill('18000')
  await first.blur()
  await expect.poll(async () => (await savedProfile(page)).household.childSpending?.byAge).toEqual([18_000, 26_000, 28_600, 28_400])
  // the suggestion is not offered again over amounts already there
  await expect(page.getByRole('button', { name: 'Utiliser ces montants pour un enfant prévu' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retirer les montants par âge' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.childSpending ?? null).toBeNull()
})

test('past, current and planned children sit in one list, each with where it stands', async ({ page }) => {
  const p = couple() as unknown as Seed
  p.household.children = [THIS_YEAR - 30, THIS_YEAR - 4]
  await seedProfile(page, p as unknown as SeedProfile)
  await showAllSections(page)
  await page.goto('/?form=1')
  await expect(page.getByText(`${THIS_YEAR - 30} · parti`)).toBeVisible()
  await expect(page.getByText(`${THIS_YEAR - 4} · à la maison`)).toBeVisible()
  await box(page, 'Année de naissance de l’enfant').fill(String(THIS_YEAR + 2))
  await page.getByRole('button', { name: 'Ajouter un enfant' }).click()
  await expect(page.getByText(`${THIS_YEAR + 2} · prévu`)).toBeVisible()
  // for the child at home the suggestion is read at their age today (a 4-year-old: the 0–5 band)
  await expect(page.getByText(/Un enfant à la maison à son âge d’aujourd’hui.+environ/)).toBeVisible()
})

test('a planned child makes the answer later: its cost is added to the budget', async ({ page, context }) => {
  const without = couple() as unknown as Seed & { household: { spending: { workingToday: number; retiredToday: number } } }
  without.household.spending = { workingToday: 60_000, retiredToday: 60_000 }
  const withChild = structuredClone(without)
  withChild.household.children = [THIS_YEAR + 1]
  withChild.household.childSpending = { perChild: 0, untilAge: 23, byAge: [24_600, 26_000, 28_600, 28_400] }
  const answer = async (profile: unknown, tab: import('@playwright/test').Page) => {
    await seedProfile(tab, profile as SeedProfile)
    await tab.goto('/resultats')
    await expect(tab.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
    // the age is on its own line under the sentence: read it from the page's text
    return Number(/retraite à\s+(\d+)/.exec(await tab.locator('body').innerText())![1])
  }
  const a = await answer(without, page)
  const b = await answer(withChild, await context.newPage())
  expect(b).toBeGreaterThan(a)
})

test('what the state pays is said beside what a child costs; adding a child counts it in the plan, and a switch takes it out', async ({ page }) => {
  await seedProfile(page, couple())
  await showAllSections(page)
  await page.goto('/?form=1')
  await page.getByRole('button', { name: 'Un enfant prévu' }).click()
  // a first child counts the benefits (a visible switch), and the card says what they come to at this income
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects).toEqual({ benefits: true, qppExclusion: false, leave: null })
  await expect(page.getByText('Ce que l’État verse pour eux')).toBeVisible()
  await expect(page.getByText(/Un enfant prévu en \d{4}.+environ .+ sa première année, moins .+ d’allocations, soit .+ net/)).toBeVisible()
  const toggle = page.getByRole('button', { name: 'Tenir compte des allocations dans le plan (estimation)' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects ?? null).toBeNull()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  // a household that already chose keeps its choice when it adds another child
  await box(page, 'Année de naissance de l’enfant').fill(String(THIS_YEAR + 3))
  await page.getByRole('button', { name: 'Ajouter un enfant' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.children).toEqual([THIS_YEAR + 1, THIS_YEAR + 3])
})

test('a parental leave for a child to come: who gives birth, the weeks each takes, and what it does to the pay', async ({ page }) => {
  await seedProfile(page, couple())
  await showAllSections(page)
  await page.goto('/?form=1')
  await page.getByRole('button', { name: 'Un enfant prévu' }).click()
  await page.getByRole('button', { name: 'Tenir compte d’un congé parental (RQAP)' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects?.leave).toEqual({ birthParent: 'self', birthParentWeeks: 32, otherParentWeeks: 0 })
  // the birth parent has 18 + 32 = 50 weeks, the other 5 of paternity
  await expect(page.getByText(/50 semaines de congé/)).toBeVisible()
  await expect(page.getByText(/5 semaines de congé/)).toBeVisible()
  // shared weeks can be split; together they never pass 32
  const other = box(page, 'Semaines parentales à partager prises par Partenaire')
  await other.fill('12')
  await other.blur()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects?.leave).toMatchObject({ birthParentWeeks: 32, otherParentWeeks: 0 })
  const mine = box(page, 'Semaines parentales à partager prises par Moi')
  await mine.fill('20')
  await mine.blur()
  await other.fill('12')
  await other.blur()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects?.leave).toMatchObject({ birthParentWeeks: 20, otherParentWeeks: 12 })
  await expect(page.getByText(/17 semaines de congé/)).toBeVisible() // 5 of paternity + 12 shared
  // the other parent can be the one who gives birth
  await page.getByRole('radio', { name: /Qui accouche.+Partenaire/ }).click()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects?.leave?.birthParent).toBe('spouse')
  await page.getByRole('button', { name: 'Tenir compte d’un congé parental (RQAP)' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.kidsEffects?.leave ?? null).toBeNull()
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, couple())
  await showAllSections(page)
  await page.goto('/?form=1')
  await page.getByRole('button', { name: 'A planned child' }).click()
  await expect(page.getByText(`${THIS_YEAR + 1} · planned`)).toBeVisible()
  await expect(page.getByText('What a child costs, according to Statistics Canada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use these amounts for a planned child' })).toBeVisible()
})
