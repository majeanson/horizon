import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// A tab closed, an app swiped away or a phone locked in the middle of typing never blurs the box. The figure on screen must still be on the device when the
// reader comes back: NumberField keeps what reads when the page is hidden, and the store writes it at once.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

const stored = (page: import('@playwright/test').Page) => page.evaluate(() => localStorage.getItem('horizon-profile') ?? '')

test('a figure still being typed when the page is hidden is kept, and is there after a reload', async ({ page }) => {
  await page.goto('/profil?bloc=tout&form=1')
  const salary = page.getByRole('textbox', { name: /Revenu de travail par année/ }).first()
  await salary.click()
  await salary.press('Control+a')
  await salary.pressSequentially('73217')
  // No Enter, no blur: the page just goes away.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect.poll(() => stored(page)).toContain('73217')
  await page.reload()
  await expect(page.getByRole('textbox', { name: /Revenu de travail par année/ }).first()).toHaveValue(/73[\s  ,]?217/)
})

test('a figure that does not read is not written when the page is hidden', async ({ page }) => {
  await page.goto('/profil?bloc=tout&form=1')
  const before = await stored(page)
  const salary = page.getByRole('textbox', { name: /Revenu de travail par année/ }).first()
  await salary.click()
  await salary.press('Control+a')
  await salary.pressSequentially('12abc')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  expect(await stored(page)).toBe(before)
})
