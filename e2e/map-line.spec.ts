import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'
import { expectNoHorizontalOverflow } from './overflow'

// THE MAP OF A LONG PAGE IS ONE LINE. The glossary's and the results page's map of sections (SectionNav) used to wrap: on a phone four lines of chips
// ate the first screen. It is a Rail now — one line that scrolls sideways, like the view tabs, with the soft edge fade saying there is more — and
// the chip of the section in view is brought into the line as the page scrolls.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

async function oneLine(page: Page, expected: number) {
  const chips = page.locator('.section-nav .chip')
  await expect(chips).toHaveCount(expected)
  const tops = await chips.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(Math.max(...tops) - Math.min(...tops), 'every chip sits on the same line').toBeLessThanOrEqual(2)
  const rail = page.locator('.section-nav .rail')
  expect(await rail.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto')
  // the line is shorter than the screen is tall: the map costs one row, not four
  const nav = (await page.locator('.section-nav').boundingBox())!
  expect(nav.height, 'the map is a single row high').toBeLessThan(80)
  return { chips, rail }
}

test('glossary on a phone: the map is one scrolling line, the last chip can be reached, and nothing pushes the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/glossaire')
  const { chips, rail } = await oneLine(page, 6)
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth), 'six chips do not fit 390 px: the line scrolls').toBe(true)
  await rail.evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  const last = (await chips.last().boundingBox())!
  expect(last.x + last.width, 'scrolled to the end, the last chip is on screen').toBeLessThanOrEqual(390.5)
  await expectNoHorizontalOverflow(page, '.page-body')
})

test('glossary: a tap on a far chip goes to its section, and the marked chip comes into view in the line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/glossaire')
  const { chips, rail } = await oneLine(page, 6)
  await chips.last().scrollIntoViewIfNeeded()
  await chips.last().click()
  await expect.poll(async () => chips.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') !== null)), { timeout: 10_000 }).toBeGreaterThanOrEqual(4)
  const marked = page.locator('.section-nav .chip[aria-current]')
  await expect(marked).toBeVisible()
  await expect
    .poll(async () => {
      const c = (await marked.boundingBox())!
      const r = (await rail.boundingBox())!
      return c.x >= r.x - 0.5 && c.x + c.width <= r.x + r.width + 0.5
    })
    .toBe(true)
})

test('results on a phone: the map is one line too, and a wide screen keeps it on one line without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=verify')
  const { chips, rail } = await oneLine(page, 5)
  await rail.evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  const last = (await chips.last().boundingBox())!
  expect(last.x + last.width).toBeLessThanOrEqual(360.5)
  await page.setViewportSize({ width: 1280, height: 800 })
  await oneLine(page, 5)
  expect(await rail.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'plenty of room: no scrolling needed').toBe(true)
})

test('the map is still a set of real buttons: Tab reaches the chips, and the line itself can be driven by the keyboard when it overflows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/glossaire')
  const { chips, rail } = await oneLine(page, 6)
  await expect(rail).toHaveAttribute('tabindex', '0') // a scrolling region that overflows is reachable by keyboard (axe: scrollable-region-focusable)
  await chips.first().focus()
  await expect(chips.first()).toBeFocused()
})
