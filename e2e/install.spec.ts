import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE APP AS AN INSTALLED APP: one quiet offer to install (a card on the front door, once; a permanent line in the settings), and an installed window that
// is dressed as an app (public/theme-bootstrap.js stamps data-standalone; styles/phone.css reads it). Nothing leaves the device either way.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

/** Count the page's view transitions (the browser's own start is still called, so the page really transitions). */
const countViewTransitions = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __vt: number }
    w.__vt = 0
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    const original = doc.startViewTransition?.bind(document)
    if (original) doc.startViewTransition = (cb: () => void) => (w.__vt++, original(cb))
  })

/** The browser's « you could install me » event, as Chrome fires it. */
const offerInstall = (page: Page, outcome: 'accepted' | 'dismissed' = 'accepted') =>
  page.evaluate((o) => {
    const e = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {
        ;(window as unknown as { __prompted: number }).__prompted = ((window as unknown as { __prompted?: number }).__prompted ?? 0) + 1
      },
      userChoice: Promise.resolve({ outcome: o }),
    })
    window.dispatchEvent(e)
  }, outcome)

test('with nothing to install the front door says nothing, and the settings page says where a browser keeps the command', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.install-card')).toHaveCount(0)
  await page.goto('/donnees')
  await expect(page.getByRole('heading', { name: 'Installer l’application' })).toBeVisible()
  await expect(page.getByText('Dans le menu de votre navigateur')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Installer' })).toHaveCount(0)
})

test('when the browser offers it, the front door makes ONE quiet offer: a card, « Plus tard » ends it for good', async ({ page }) => {
  await page.goto('/')
  await offerInstall(page)
  const card = page.locator('.install-card')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Installer Horizon')
  await expect(card).toContainText('sans réseau')
  await card.getByRole('button', { name: 'Plus tard' }).click()
  await expect(card).toHaveCount(0)
  // remembered on this device: it does not come back, even when the browser offers again
  await page.reload()
  await offerInstall(page)
  await expect(page.locator('.install-card')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('horizon-install'))).toBe('later')
  // …and the settings page still has the button for whoever changes their mind
  await page.goto('/donnees')
  await offerInstall(page)
  await expect(page.getByRole('button', { name: 'Installer' })).toBeVisible()
})

test('« Installer » fires the browser’s dialog once and the offer closes', async ({ page }) => {
  await page.goto('/')
  await offerInstall(page)
  await page.locator('.install-card').getByRole('button', { name: 'Installer' }).click()
  await expect(page.locator('.install-card')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted)).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('horizon-install'))).toBe('done')
})

test('in English the offer speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/')
  await offerInstall(page)
  await expect(page.locator('.install-card')).toContainText('Install Horizon')
  await expect(page.locator('.install-card').getByRole('button', { name: 'Later' })).toBeVisible()
})

test.describe('on an iPhone there is no prompt to fire, only the words', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  test('the card says Share ▸ Add to Home Screen and has no install button', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.install-card')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Partager')
    await expect(card.getByRole('button', { name: 'Installer' })).toHaveCount(0)
    await card.getByRole('button', { name: 'Plus tard' }).click()
    await expect(card).toHaveCount(0)
  })
})

test.describe('installed', () => {
  test.beforeEach(async ({ page }) => {
    // iOS says it through navigator.standalone, before any script runs
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }))
  })

  test('the app is stamped as installed, offers nothing, and says so on the settings page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-standalone', '')
    await offerInstall(page)
    await expect(page.locator('.install-card')).toHaveCount(0)
    await page.goto('/donnees')
    await expect(page.getByText('Horizon est installé sur cet appareil.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Installer' })).toHaveCount(0)
  })

  test('the bottom tabs change page with a view transition, and the two bars keep their own layer so they never blink', async ({ page }) => {
    await countViewTransitions(page)
    await page.goto('/profil')
    expect(await page.locator('.shell__bar').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('shell-bar')
    expect(await page.locator('.shell__nav').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('shell-nav')
    await page.locator('.shell__nav').getByRole('link', { name: 'Résultats' }).click()
    await expect(page).toHaveURL(/\/resultats/)
    await expect(page.getByRole('heading', { level: 1, name: 'Résultats' })).toHaveCount(1)
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt), 'the tab asked the browser for a transition').toBeGreaterThanOrEqual(1)
  })

  test('the bars and the controls do not select, the content and the fields still do', async ({ page }) => {
    await page.goto('/profil')
    const select = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).userSelect)
    expect(await select('.shell__bar')).toBe('none')
    expect(await select('.shell__nav')).toBe('none')
    expect(await select('.btn')).toBe('none')
    expect(await select('.page-head__sub')).not.toBe('none')
    expect(await select('input')).not.toBe('none')
  })
})

test('in a tab nothing is stamped and nothing changes: the bars select as they always did', async ({ page }) => {
  await page.goto('/profil')
  await expect(page.locator('html')).not.toHaveAttribute('data-standalone', /.*/)
  expect(await page.locator('.shell__bar').evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none')
})

test('in a tab the bottom tabs just change the page: no transition is asked for, and the bars have no layer of their own', async ({ page }) => {
  await countViewTransitions(page)
  await page.goto('/profil')
  await page.locator('.shell__nav').getByRole('link', { name: 'Résultats' }).click()
  await expect(page).toHaveURL(/\/resultats/)
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(0)
  expect(await page.locator('.shell__bar').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('none')
})
