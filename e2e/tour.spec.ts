import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « VISITE GUIDÉE ». A chip on the answer card opens a three-step walk through the reader's OWN answer (`?visite=1..3`): a bar docked at the foot of Résultats
// says what each section means with their numbers, and each step scrolls to its section — below the pinned chrome, not under it. The address keeps the step
// (reload resumes it), « Fermer » drops the key, the buttons are real and reached by Tab, and a household that has already stopped working is not offered it.
// (lib/useResultsPage.ts holds the state, components/results/TourBar.tsx the bar, lib/tourCopy.ts the words.)

async function openAnswer(page: Page, path = '/resultats') {
  await page.goto(path)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  // `#annee` is the last section of the answer view (lazy).
  await expect(page.locator('#annee')).toBeAttached({ timeout: 30_000 })
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

const bar = (page: Page) => page.getByRole('region', { name: 'Visite guidée de votre réponse' })

test.describe('golden couple', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('the chip opens the tour on the verdict, and each « Suivant » lands its section below the pinned chrome with the step in the address', async ({ page }) => {
    await openAnswer(page)
    await expect(bar(page)).toHaveCount(0)
    const age = (await page.locator('.verdict__age').first().textContent())!.trim()

    await page.getByRole('button', { name: 'Visite guidée', exact: true }).click()
    await expect(page).toHaveURL(/visite=1/)
    await expect(bar(page)).toBeVisible()
    await expect(bar(page)).toContainText(`Votre réponse : ${age}`)
    await expect(bar(page)).toContainText('1 de 3')
    await expectLandedBelowChrome(page, '#verdict')

    const next = bar(page).getByRole('button', { name: 'Suivant' })
    await next.click()
    await expect(page).toHaveURL(/visite=2/)
    await expect(bar(page)).toContainText('La ligne de votre plan')
    await expect(bar(page)).toContainText('2 de 3')
    await expectLandedBelowChrome(page, '#ligne')

    await next.click()
    await expect(page).toHaveURL(/visite=3/)
    await expect(bar(page)).toContainText('Comparer')
    await expectLandedBelowChrome(page, '#comparer')

    // the last step finishes
    await expect(bar(page).getByRole('button', { name: 'Terminer' })).toBeVisible()
  })

  test('the sentence is announced politely, and the bar docks at the foot of the window, clear of the pinned chrome', async ({ page }) => {
    await openAnswer(page, '/resultats?visite=1')
    await expect(bar(page)).toBeVisible()
    await expect(bar(page).locator('[aria-live="polite"]')).toContainText('Votre réponse')
    const box = (await bar(page).boundingBox())!
    const chrome = (await page.locator('.section-nav').boundingBox())!
    expect(box.y).toBeGreaterThan(chrome.y + chrome.height)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
  })

  test('« Fermer » drops the key and the bar', async ({ page }) => {
    await openAnswer(page, '/resultats?visite=2')
    await expect(bar(page)).toBeVisible()
    await bar(page).getByRole('button', { name: 'Fermer' }).click()
    await expect(bar(page)).toHaveCount(0)
    expect(new URL(page.url()).searchParams.has('visite')).toBe(false)
  })

  test('a reload of ?visite=3 resumes at step 3, on its section', async ({ page }) => {
    await openAnswer(page, '/resultats?visite=3')
    await expect(bar(page)).toContainText('3 de 3')
    await expectLandedBelowChrome(page, '#comparer')
  })

  test('an unreadable step is no tour, and the key leaves the address', async ({ page }) => {
    await openAnswer(page, '/resultats?visite=0')
    await expect(bar(page)).toHaveCount(0)
    await expect.poll(() => new URL(page.url()).searchParams.has('visite')).toBe(false)
    await page.goto('/resultats?visite=9')
    await expect(bar(page)).toHaveCount(0)
    await expect.poll(() => new URL(page.url()).searchParams.has('visite')).toBe(false)
  })

  test('« Suivant » and « Fermer » are reached by Tab', async ({ page }) => {
    await openAnswer(page, '/resultats?visite=1')
    await expect(bar(page)).toBeVisible()
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
    const seen = new Set<string>()
    for (let i = 0; i < 200 && seen.size < 2; i++) {
      await page.keyboard.press('Tab')
      const name = await page.evaluate(() => {
        const el = document.activeElement
        return el && el.closest('.tour-bar') ? (el.textContent ?? '').trim() : ''
      })
      if (name === 'Fermer' || name === 'Suivant') seen.add(name)
    }
    expect([...seen].sort()).toEqual(['Fermer', 'Suivant'])
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/visite=2/)
  })

  test('on a phone the bar stays inside the screen, above the tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await openAnswer(page, '/resultats?visite=1')
    const box = (await bar(page).boundingBox())!
    const tabs = (await page.locator('.shell__nav').boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    expect(box.y + box.height).toBeLessThanOrEqual(tabs.y + 1)
  })
})

test('a household that has already stopped working is not offered the tour', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/donnees?autres=examples')
  await page.getByRole('button', { name: 'Couple à la retraite', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/resultats')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Visite guidée', exact: true })).toHaveCount(0)
  // …and a shared link to a tour does not open one for them.
  await page.goto('/resultats?visite=2')
  await expect(page.locator('#verdict')).toBeVisible({ timeout: 30_000 })
  await expect(bar(page)).toHaveCount(0)
})
