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
    await expect(map.locator('.rail').getByRole('button')).toHaveCount(5) // Famille · two people · Budget · Rendre exact (« Ma situation » is a fold right under Famille)
    await map.getByRole('button', { name: 'Budget' }).click()
    await expect(map.getByRole('button', { name: 'Budget' })).toHaveAttribute('aria-current', 'true')
    await expect(map).toBeInViewport() // still pinned after a long scroll
    const mapBottom = (await map.boundingBox())!.y + (await map.boundingBox())!.height
    await expect.poll(async () => Math.round((await page.locator('#budget').boundingBox())!.y)).toBeGreaterThanOrEqual(Math.floor(mapBottom))
  })
}
