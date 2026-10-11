import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE PROFIL FORM HAS A MAP. A couple's profile is about twenty screens on a phone: a one-line map of its blocks (ProfileMap → SectionNav) is pinned
// under « Votre réponse », a tap lands the block BELOW both pinned rows, and the chip of the block reached is the one marked.

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test(`the map stays pinned and a tap lands clear of it — ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil')
    const map = page.getByRole('navigation', { name: 'Sections du profil' })
    await expect(map.getByRole('button')).toHaveCount(6) // Famille · Situation · two people · Budget · Précision
    await map.getByRole('button', { name: 'Budget' }).click()
    await expect(map.getByRole('button', { name: 'Budget' })).toHaveAttribute('aria-current', 'true')
    await expect(map).toBeInViewport() // still pinned after a long scroll
    const mapBottom = (await map.boundingBox())!.y + (await map.boundingBox())!.height
    await expect.poll(async () => Math.round((await page.locator('#budget').boundingBox())!.y)).toBeGreaterThanOrEqual(Math.floor(mapBottom))
  })
}

test('the map slides away while the reader scrolls down, comes back on the first move up, and a tap on a chip never hides it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil')
  const nav = page.locator('.profile-map .section-nav')
  await expect(nav).toBeVisible()
  await expect(nav).not.toHaveAttribute('data-away', '')
  // a tap on a chip scrolls the page by itself: the map stays
  await nav.getByRole('button', { name: 'Budget' }).click()
  await page.waitForTimeout(600)
  await expect(nav).not.toHaveAttribute('data-away', '')
  // a hand on the page: down hides it, up brings it back
  await page.mouse.move(200, 500)
  await page.mouse.wheel(0, 700)
  await expect(nav).toHaveAttribute('data-away', '')
  await page.mouse.wheel(0, -150)
  await expect(nav).not.toHaveAttribute('data-away', '')
  // back at the top it is always there
  await page.mouse.wheel(0, 700)
  await expect(nav).toHaveAttribute('data-away', '')
  await page.evaluate(() => document.getElementById('root')!.scrollTo({ top: 0 }))
  await page.mouse.wheel(0, -20)
  await expect(nav).not.toHaveAttribute('data-away', '')
})
