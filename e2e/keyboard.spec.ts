import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, blankSeed, savedProfile, seedProfile } from './seed'

// THE WHOLE PROFILE, WITH NO MOUSE.
//
// A planner read by people who may not use a pointer has to be finished with the keyboard alone: reach a field, type,
// commit with Enter, open the « where do I find this » note with Space, open a disclosure, and always see where
// focus is. axe checks the markup; this walks it the way a person would.

// What has focus right now, named the way a screen reader would name it.
async function focused(page: Page): Promise<{ name: string; tag: string; visible: boolean; order: number; wrapped: boolean }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return { name: '', tag: '', visible: false, order: -1, wrapped: true }
    const label =
      el.getAttribute('aria-label') ??
      (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null) ??
      el.textContent ??
      ''
    const css = getComputedStyle(el)
    const ring = css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0
    const box = el.closest('.edit-field__box')
    const boxCss = box ? getComputedStyle(box) : null
    const wrapperRing = boxCss !== null && boxCss.outlineStyle !== 'none' && parseFloat(boxCss.outlineWidth) > 0
    const all = [...document.querySelectorAll('*')]
    // Past the last control, Tab leaves the page (to the browser's own chrome) and comes back to the document itself.
    const wrapped = el === document.body || el === document.documentElement || el.contains(document.querySelector('main'))
    return { name: label.trim().slice(0, 80), tag: el.tagName.toLowerCase(), visible: ring || wrapperRing || css.boxShadow !== 'none', order: all.indexOf(el), wrapped }
  })
}

// Tab until the focused element's name matches, or give up after `max` presses.
async function tabTo(page: Page, name: string | RegExp, max = 80): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const f = await focused(page)
    if (typeof name === 'string' ? f.name === name : name.test(f.name)) return
  }
  throw new Error(`never reached « ${String(name)} » by Tab in ${max} presses`)
}

test.describe('with the keyboard alone', () => {
  test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

  test('a field is reached, typed into, committed with Enter, and explained with Space — and the note opens in place', async ({ page }) => {
    await page.goto('/')
    await page.locator('.page-head__title').waitFor()
    await tabTo(page, 'Revenu de travail annuel actuel')
    await page.keyboard.press('Control+A')
    await page.keyboard.type('85 000')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].salaryToday).toBe(85000)

    // From the field, the next stops are its clear button and then its ⓘ.
    await tabTo(page, /^Où trouver ce chiffre : Revenu de travail annuel actuel$/, 4)
    const info = page.getByRole('button', { name: /^Où trouver ce chiffre : Revenu de travail annuel actuel$/ })
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(info).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#' + (await info.getAttribute('aria-controls')))).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(info).toHaveAttribute('aria-expanded', 'false')
  })

  test('a disclosure opens with Enter, and what is inside it is reachable next', async ({ page }) => {
    await page.goto('/')
    await page.locator('.page-head__title').waitFor()
    await tabTo(page, /Revenus de travail admissibles par année/)
    await expect(page.getByRole('button', { name: 'Revenus de travail admissibles par année', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Revenus de travail admissibles par année', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    expect((await focused(page)).name).toMatch(/Où trouver ce chiffre : Revenus de travail admissibles par année/)
  })

  test('the people tabs are a real tablist: arrow keys move and select, Home and End jump', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ajouter un·e conjoint·e' }).click()
    const tabs = page.getByRole('tablist', { name: 'Personne' })
    await tabs.getByRole('tab', { name: 'Moi' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: 'Conjoint·e', selected: true })).toBeFocused()
    await expect(page).toHaveURL(/person=spouse/)
    await page.keyboard.press('Home')
    await expect(tabs.getByRole('tab', { name: 'Moi', selected: true })).toBeFocused()
  })

  test('a confirmation traps focus, closes on Escape, and gives focus back to the button that opened it', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ajouter un·e conjoint·e' }).click()
    const remove = page.getByRole('button', { name: 'Retirer le·la conjoint·e' })
    await remove.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alertdialog')).toBeVisible()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')), 'focus stays in the dialog').toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(remove).toBeFocused()
    // Cancelling changed nothing: the spouse is still there once the (debounced) save has landed.
    await expect.poll(async () => (await savedProfile(page)).household.persons.length).toBe(2)
  })
})

test.describe('on every page', () => {
  test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

  for (const path of ['/', '/hypotheses', '/resultats', '/donnees']) {
    test(`${path}: focus moves in reading order, always shows where it is, and no tabindex fights the order`, async ({ page }) => {
      await page.goto(path)
      await page.locator('.page-head__title').waitFor()
      // No positive tabindex anywhere: it would pull an element out of the reading order.
      expect(await page.locator('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').count()).toBe(0)

      let previous = -1
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press('Tab')
        const f = await focused(page)
        if (f.wrapped) break // the last control has been passed
        if (f.order < 0) break
        expect(f.order, `Tab stop ${i + 1} (« ${f.name} ») jumped backwards in the document`).toBeGreaterThan(previous)
        expect(f.visible, `« ${f.name} » (${f.tag}) takes focus with nothing to show it`).toBe(true)
        previous = f.order
      }
    })
  }
})
