import { expect, test } from '@playwright/test'
import { seedProfile, switchLanguage } from './seed'

// The answer as a range, over the two blocks of « Solidité »: the lowest and highest age across the three scenarios and the market paths, once both searches are in.
// (It left the answer's card, which keeps ONE range — the one that depends on the estimated figures.)

test('the golden couple\'s answer is a range once the searches are in, and the range holds the answer', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats')
  await expect(page.locator('.verdict__age').first()).toBeVisible({ timeout: 90_000 })
  const answer = Number((await page.locator('.verdict__age').first().innerText()).match(/\d+/)![0])
  // the card that says the answer no longer carries the range
  await expect(page.locator('#verdict').getByText(/Selon les trois scénarios et les parcours de marché/)).toHaveCount(0)
  await page.goto('/resultats?v=proof&bloc=solidite')
  const line = page.locator('#solidite').getByText(/Selon les trois scénarios et les parcours de marché/)
  await expect(line).toBeVisible({ timeout: 90_000 })
  const [, low, high] = (await line.innerText()).match(/de (\d+) à (\d+) ans/)!
  expect(Number(low)).toBeLessThanOrEqual(answer)
  expect(Number(high)).toBeGreaterThanOrEqual(answer)
  expect(Number(high)).toBeGreaterThan(Number(low)) // a range of one age says nothing: the line would not be there
})

test('it is the same in English', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats?v=proof&bloc=solidite')
  await switchLanguage(page, 'en')
  await expect(page.locator('#solidite').getByText(/Across the three scenarios and the market paths: from \d+ to (\d+|over \d+)/)).toBeVisible({ timeout: 90_000 })
})

test('a household that has already stopped working has no such line: it has no age to move', async ({ page }) => {
  await seedProfile(page, (await import('./seed')).blankSeed())
  await page.goto('/resultats')
  await expect(page.getByText(/Selon les trois scénarios et les parcours de marché/)).toHaveCount(0)
})
