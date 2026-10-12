import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// A tapped section KEEPS its place while the page settles (lib/motion.ts `scrollToSection`). The page scrolls inside #root, and a worker's answer replacing a
// placeholder above the target moves it: the hold must watch the root's content (it once watched <body>, whose size never changes, and re-anchored nothing),
// and must not let go early on a slow machine. The shift here is injected 2.5 s after the tap, later than any fixed short hold.
//
// Planted (2026-10-12): with `observer.observe(document.body)` the target lands at y≈813 under chrome that ends at y≈174, and this goes red.
test('a section tapped in the map stays under the pinned chrome when content above it grows a few seconds later', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resultats')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  const nav = page.locator('.section-nav')
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
  await nav.getByRole('button', { name: 'Comparer' }).click()
  await page.waitForTimeout(2500)
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '300px'
    document.getElementById('verdict')!.after(spacer)
  })
  await page.waitForTimeout(1200)
  const box = (await nav.boundingBox())!
  const clear = box.y + box.height
  const top = (await page.locator('#comparer').boundingBox())!.y
  expect(top, `landed at ${top}, the chrome ends at ${clear}`).toBeLessThan(clear + 120)
  expect(top).toBeGreaterThanOrEqual(clear - 2)
})
