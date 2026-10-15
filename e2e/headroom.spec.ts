import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// HEADROOM. Scroll down: nothing pinned at the top (the bar, the answer strip, the views' tabs, the sections' map). Scroll up: all of it comes back. The page's own scrolling — a tap on a
// chip, a guide, a deep link — never hides what the reader just used; only a hand (a drag, the wheel, a scroll key) does.

const away = (page: Page) => page.locator('.shell').getAttribute('data-away')
// a pinned box is « gone » when it lies wholly above the window, « there » when it is inside it
const rect = async (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height } })
const gone = async (page: Page, sel: string) => (await rect(page, sel)).bottom <= 1
const there = async (page: Page, sel: string) => { const r = await rect(page, sel); return r.height > 0 && r.top >= -1 && r.bottom > 1 }

for (const [name, size, path, pinned] of [
  ['phone', { width: 390, height: 844 }, '/profil', ['.shell__bar', '.live-answer', '.pinned-map .section-nav']],
  ['phone', { width: 390, height: 844 }, '/resultats', ['.shell__bar', '.results-pin']],
  ['desktop', { width: 1280, height: 800 }, '/resultats', ['.shell__bar', '.results-pin', '.results-page .section-nav']],
  ['desktop', { width: 1280, height: 800 }, '/profil', ['.shell__bar', '.live-answer', '.pinned-map .section-nav']],
  ['phone', { width: 390, height: 844 }, '/hypotheses', ['.shell__bar', '.live-answer', '.pinned-map .section-nav']],
] as const) {
  test(`${name} ${path}: scrolling down clears every pinned row, scrolling up brings them all back`, async ({ page }) => {
    await page.setViewportSize(size)
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    await expect(page.locator('.page-head__title, #verdict').first()).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    for (const sel of pinned) expect(await there(page, sel), `${sel} is shown at the top`).toBe(true)
    await page.mouse.move(size.width / 2, size.height / 2)
    // down: a hand on the wheel
    await page.mouse.wheel(0, 900)
    await expect(page.locator('.shell')).toHaveAttribute('data-away', '')
    for (const sel of pinned) await expect.poll(() => gone(page, sel), { message: `${sel} slid away` }).toBe(true)
    // the bottom navigation stays: it is where the thumb is
    if (size.width < 860) expect(await there(page, '.shell__nav')).toBe(true)
    // up: the first move brings everything back
    await page.mouse.wheel(0, -120)
    await expect.poll(() => away(page), { message: 'the first move up clears the flag' }).toBeNull()
    for (const sel of pinned) await expect.poll(() => there(page, sel), { message: `${sel} came back` }).toBe(true)
  })
}

test('the page’s own scrolling never hides the chrome: a programmatic scroll, and a tap on a chip that scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1400 }))
  await page.waitForTimeout(400)
  expect(await away(page)).toBeNull()
  await page.locator('.results-page .section-nav').getByRole('button', { name: 'Préciser' }).click()
  await page.waitForTimeout(1500)
  expect(await away(page)).toBeNull()
  expect(await there(page, '.results-pin')).toBe(true)
})

test('a click on a tab or a chip leaves its focus there, and scrolling down still clears the row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.getByRole('tab', { name: 'Décider' }).click()
  await expect(page.locator('#essayer')).toBeVisible({ timeout: 30_000 })
  await page.locator('.results-page .section-nav').getByRole('button', { name: 'Ordre de retrait' }).click()
  await page.waitForTimeout(1200)
  await page.mouse.move(640, 400)
  await page.mouse.wheel(0, 900)
  await expect(page.locator('.shell')).toHaveAttribute('data-away', '')
  for (const sel of ['.results-pin', '.results-page .section-nav']) await expect.poll(() => gone(page, sel), { message: `${sel} slid away after a click` }).toBe(true)
  // …while the KEYBOARD still reaches it: a key focus inside a pinned row brings it back
  // A single wheel tick can land while the page is still settling from the 900 px scroll and be swallowed (CI's slow runner, once): the gesture is repeated until it takes.
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, -120)
      return away(page)
    })
    .toBeNull()
})

test('a finger dragging (and its momentum) hides the chrome; once it has stopped, a page scroll of its own does not change it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil')
  await expect(page.locator('.page-head__title')).toBeVisible()
  await page.waitForTimeout(1500)
  // a drag: touchmove, then the page moves under the finger
  await page.locator('#root').evaluate((el) => {
    el.dispatchEvent(new Event('touchmove', { bubbles: true }))
    el.scrollTo({ top: 600 })
  })
  await expect(page.locator('.shell')).toHaveAttribute('data-away', '')
  // a drag back up
  await page.locator('#root').evaluate((el) => {
    el.dispatchEvent(new Event('touchmove', { bubbles: true }))
    el.scrollTo({ top: 300 })
  })
  await expect(page.locator('.shell')).not.toHaveAttribute('data-away', '')
  // far longer than momentum lasts: a scroll the page does by itself is nobody's gesture
  await page.waitForTimeout(1200)
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1500 }))
  await page.waitForTimeout(400)
  expect(await away(page)).toBeNull()
})

test('the keyboard can still reach what slid away: focusing inside it brings it back; at the top it is always there', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.mouse.move(200, 400)
  await page.mouse.wheel(0, 900)
  await expect(page.locator('.shell')).toHaveAttribute('data-away', '')
  await page.locator('.results-pin').getByRole('tab').first().focus()
  await expect.poll(() => there(page, '.results-pin')).toBe(true)
  // back to the very top: shown, whatever the last direction was
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
  await expect.poll(() => away(page)).toBeNull()
})
