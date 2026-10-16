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
