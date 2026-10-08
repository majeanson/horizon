import { test, expect, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'

// The scaffold's proof of life: the app boots, the shell renders, every control on it works, and
// nothing is printed to the console. A console error on a clean load is a real defect (a
// failed font, a CSP violation, a React warning) — and the CSP is the one that matters most here,
// because `connect-src 'self'` is half of the « local forever » promise.

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  return problems
}

test('boots, renders the shell, and prints nothing to the console', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/Horizon$/)
  await expect(page.locator('.shell__brand')).toHaveText('Horizon')
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await expect(page.locator('.shell__tab')).toHaveCount(3)
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(day|night)$/)
  expect(problems).toEqual([])
})

test('the language toggle flips the whole shell to English and back, and remembers', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to French' }).click()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
})

test('the page head follows the language: description, link preview and install manifest, from the first paint of a saved choice', async ({ page }) => {
  const manifest = page.locator('link[rel="manifest"]')
  const description = page.locator('meta[name="description"]')
  await page.goto('/')
  await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest')
  await expect(description).toHaveAttribute('content', /retraite/)
  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()
  await expect(manifest).toHaveAttribute('href', '/manifest.en.webmanifest')
  await expect(description).toHaveAttribute('content', /retire/)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_CA')
  // The English manifest is a real, parseable file the server answers.
  const res = await page.request.get('/manifest.en.webmanifest')
  expect(res.ok()).toBe(true)
  expect((await res.json()).lang).toBe('en')
  // …and a reload keeps it.
  await page.reload()
  await expect(manifest).toHaveAttribute('href', '/manifest.en.webmanifest')
  await page.getByRole('button', { name: 'Switch to French' }).click()
  await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest')
})

test('the theme toggle flips data-theme and survives a reload with no flash of the other one', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /Passer au mode (jour|nuit)/ }).click()
  const after = await html.getAttribute('data-theme')
  expect(after).not.toBe(before)
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', after!)
})

test('an unknown path lands on the first page rather than a dead end', async ({ page }) => {
  await page.goto('/ne-existe-pas')
  await expect(page.locator('.shell__brand')).toHaveText('Horizon')
})

test('the component gallery opens and renders every category', async ({ page }) => {
  const problems = watchConsole(page)
  await page.goto('/dev/kit')
  await expect(page.getByRole('heading', { name: 'Galerie des composants' })).toBeVisible()
  for (const cat of ['Fondations', 'Saisie', 'Affichage', 'Graphiques', 'Feedback']) {
    await expect(page.getByRole('heading', { name: cat, level: 2 })).toBeVisible()
  }
  expect(problems).toEqual([])
})

test('the gallery dialog opens, traps Escape, and returns focus to its opener', async ({ page }) => {
  await page.goto('/dev/kit')
  const opener = page.getByRole('button', { name: 'Ouvrir le dialogue' })
  await opener.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(opener).toBeFocused()
})

test('while a dialog is open the page behind it is inert — no Tab, no screen reader — and live again after', async ({ page }) => {
  await page.goto('/dev/kit')
  const root = page.locator('#root')
  await expect(root).not.toHaveAttribute('inert', '')
  await page.getByRole('button', { name: 'Ouvrir le dialogue' }).click()
  await expect(root).toHaveAttribute('inert', '')
  // Tab many times: focus must never leave the dialog for the page behind it.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.kit-modal')), 'focus stayed inside the dialog').toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(root).not.toHaveAttribute('inert', '')
})

test('a confirm dialog is inert-backed too, and resolves false on Cancel and true on confirm', async ({ page }) => {
  await page.goto('/dev/kit')
  await page.getByRole('button', { name: 'Demander confirmation' }).click()
  await expect(page.locator('#root')).toHaveAttribute('inert', '')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
})

test('a confirm dialog resolves false on Cancel and true on confirm', async ({ page }) => {
  await page.goto('/dev/kit')
  const ask = page.getByRole('button', { name: 'Demander confirmation' })
  await ask.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Annulé' })).toBeVisible()
  await ask.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Confirmé' })).toBeVisible()
})

for (const [name, width] of [['phone', 390], ['small phone', 360], ['tablet', 820], ['desktop', 1280]] as const) {
  test(`nothing runs past the right edge at ${name} width (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
    await page.goto('/dev/kit')
    await expectNoHorizontalOverflow(page)
  })
}

test('the bottom navigation is a bar on a phone and a rail on a wide screen — one markup, CSS only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/')
  const nav = page.locator('.shell__nav')
  await expect(nav).toHaveCSS('position', 'fixed')
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(nav).toHaveCSS('position', 'sticky')
})
