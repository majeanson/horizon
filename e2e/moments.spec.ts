import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, seedProfile } from './seed'

// THE CHART'S MOMENTS ARE DOORS. Under the projection chart a « Moments » row of chips names the notable years (a pension starting,
// the end of the plan) — each with its year AND its age — and each lands on the section that explains it. The chips are the real,
// focusable controls; a tap on the chart itself is the mouse / touch mirror (lib/chartMoments.ts, components/results/ChartPanel.tsx).
// The landing crosses views (« Réponse » → « Décider », a lazy chunk), so it also pins `goTo` waiting for the anchor to exist.

const RRQ_CHIP = /^RRQ.*, \d{4} \(\d+( \/ \d+)? ans\)$/

async function openAnswer(page: Page) {
  await page.goto('/resultats')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.locator('.chart__plot').first()).toBeVisible({ timeout: 30_000 })
}

// The target sits below the pinned chrome (the section map), not under it.
async function expectLandedBelowChrome(page: Page, id: string) {
  const nav = page.locator('.section-nav')
  await expect(page.locator(id)).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(async () => {
      const box = (await nav.boundingBox())!
      const top = (await page.locator(id).boundingBox())!.y
      return top >= box.y + box.height - 2 && top < box.y + box.height + 160
    }, { timeout: 15_000, message: `${id} should land just under the pinned chrome` })
    .toBe(true)
}

test.describe('golden couple', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('the rail sits under the chart, names a pension start with a year and an age, and the chip lands on « Rentes » below the pinned chrome', async ({ page }) => {
    await openAnswer(page)
    const rail = page.getByRole('group', { name: 'Moments' })
    await expect(rail).toBeVisible()
    const chart = (await page.locator('.chart').first().boundingBox())!
    expect((await rail.boundingBox())!.y).toBeGreaterThan(chart.y + chart.height - 2)
    const chip = rail.getByRole('button', { name: RRQ_CHIP }).first()
    await expect(chip).toBeVisible()
    await expect(rail.getByRole('button', { name: /^Fin du plan, \d{4} \(\d+/ })).toBeVisible()
    await chip.click()
    await expect(page).toHaveURL(/v=decide/)
    await expectLandedBelowChrome(page, '#rentes')
  })

  test('the chip is reached by Tab and opened with Enter', async ({ page }) => {
    await openAnswer(page)
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
    let reached = false
    for (let i = 0; i < 150 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate((src) => {
        const el = document.activeElement
        return !!el && el.tagName === 'BUTTON' && !!el.closest('[role="group"][aria-label="Moments"]') && new RegExp(src).test(el.textContent ?? '')
      }, RRQ_CHIP.source)
    }
    expect(reached, 'the RRQ moment never took focus by Tab').toBe(true)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/v=decide/)
    await expectLandedBelowChrome(page, '#rentes')
  })

  test('on a phone the row wraps inside the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await openAnswer(page)
    const rail = page.getByRole('group', { name: 'Moments' })
    await expect(rail).toBeVisible()
    await expectNoHorizontalOverflow(page, rail)
  })
})

test('a household that has nothing left to start and whose money lasts has no moments at all', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/donnees?autres=examples')
  await page.getByRole('button', { name: 'Couple à la retraite', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await openAnswer(page)
  await expect(page.getByRole('group', { name: 'Moments' })).toHaveCount(0)
})
