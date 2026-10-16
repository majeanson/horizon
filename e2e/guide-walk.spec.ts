import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « TOUT CONFIRMER PAS À PAS » ON THE FORM ITSELF. The form is an accordion (components/Accordion.tsx): on a phone one block is open at a time, and on a wide
// screen a finished block is folded. The guide walks every unconfirmed figure across all of them, so each step must OPEN the block the figure lives in and land
// on the figure — below what is pinned, above the guide's card — whichever block the previous step left open.

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`the guide opens each figure's block and lands on it, step after step — ${name}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(size)
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil?form=1')
    await page.getByRole('button', { name: 'Tout confirmer pas à pas' }).click()
    const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
    await expect(bar).toBeVisible()
    const blocks = new Set<string>()
    // enough steps to cross the people, the budget and the home: « Plus tard » skips without confirming, so the list does not shrink under the walk
    for (let step = 0; step < 24; step++) {
      if ((await bar.textContent())!.includes('Guide terminé')) break
      // a figure is a field row, the earnings list or the employer plan's line: each carries its own « --guided » class
      const field = page.locator('[data-fact][class*="--guided"]')
      await expect(field, `step ${step + 1}: the figure is lit`).toHaveCount(1, { timeout: 10_000 })
      const block = field.locator('xpath=ancestor::section[contains(@class,"accordion__item")][1]')
      await expect(block, `step ${step + 1}: its block is open`).toHaveClass(/is-open/)
      blocks.add((await block.getAttribute('id')) ?? '')
      await expect
        .poll(
          async () => {
            const f = (await field.boundingBox())!
            const bb = (await bar.boundingBox())!
            const pinned = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('.shell__bar, .pin-stack')].filter((e) => getComputedStyle(e).position === 'sticky' || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect().bottom)))
            return f.y >= pinned - 1 && f.y + Math.min(f.height, 60) <= bb.y
          },
          { timeout: 8_000, message: `step ${step + 1}: the figure sits in the free band` },
        )
        .toBe(true)
      await bar.getByRole('button', { name: 'Plus tard' }).click()
    }
    // the walk crossed more than one block
    expect(blocks.size, `blocks visited: ${[...blocks].join(', ')}`).toBeGreaterThan(1)
  })
}

const LIT = '[data-fact][class*="--guided"]'

// On a wide screen every block is open, so a block the reader folded by hand is the one that can hide a figure: the guide opens it again.
test('a block folded by hand is opened again when the guide reaches one of its figures — desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil?form=1')
  const self = page.locator('#person-self')
  await expect(self).toHaveClass(/is-open/)
  await self.getByRole('button', { expanded: true }).first().click()
  await expect(self).toHaveClass(/is-closed/)
  await page.getByRole('button', { name: 'Tout confirmer pas à pas' }).click()
  await expect(self).toHaveClass(/is-open/)
  await expect(page.locator(LIT)).toHaveCount(1)
  await expect(page.locator(LIT)).toBeInViewport()
})

// A link that names ONE figure (`?fact=`: the front door's question, the ranking on Ma fiche) opens the block it lives in, on a phone too, and lands on it.
for (const [fact, block] of [
  ['self:rrspBalance', 'person-self'],
  ['spouse:tfsaBalance', 'person-spouse'],
  ['household:spendingWorking', 'budget'],
] as const) {
  test(`a link to ${fact} opens ${block} and lands on the figure — phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedProfile(page, EXAMPLE)
    await page.goto(`/profil?form=1&fact=${encodeURIComponent(fact)}`)
    await expect(page.locator(`#${block}`)).toHaveClass(/is-open/, { timeout: 10_000 })
    const field = page.locator(`[data-fact="${fact}"]`)
    await expect(field).toBeVisible()
    await expect(field).toBeInViewport({ timeout: 8_000 })
  })
}

test('the front door’s question leads to its figure, in its open block — phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Une question pour préciser votre réponse' })
  await expect(card).toBeVisible({ timeout: 60_000 })
  await card.getByRole('link', { name: 'Confirmer ce chiffre' }).click()
  await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
  const field = page.locator('[data-fact]').first()
  await expect(page.locator('.accordion__item.is-open')).toHaveCount(1, { timeout: 10_000 })
  await expect(field).toBeVisible()
})

test('« Voir tout ce qui reste estimé » reaches the panel and the guide it starts walks from there — phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil?form=1#exact')
  await expect(page.locator('#exact')).toBeInViewport({ timeout: 8_000 })
  await page.getByRole('button', { name: 'Tout confirmer pas à pas' }).click()
  await expect(page.locator(LIT)).toHaveCount(1)
  await expect(page.locator(LIT)).toBeInViewport()
})

// « Par document »: the same guide, on the page that is NOT the accordion — each step with figures to confirm lights its field and brings it on screen.
for (const etape of ['budget', 'tax', 'bank', 'rrq', 'employer'] as const) {
  test(`« Par document » › ${etape}: « Me guider » lights the first figure and brings it on screen — phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedProfile(page, EXAMPLE)
    await page.goto(`/profil?form=1&par=document&etape=${etape}`)
    const guide = page.getByRole('button', { name: 'Me guider' })
    await expect(guide).toBeVisible({ timeout: 15_000 })
    await guide.click()
    await expect(page.locator(LIT)).toHaveCount(1)
    await expect(page.locator(LIT)).toBeInViewport({ timeout: 8_000 })
  })
}
