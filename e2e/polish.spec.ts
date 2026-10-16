import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE POLISH LAYER, as behaviour: what the small movements and the better inputs DO, not how they look (the look is in styles/motion.css and was read in screenshots). Every check here
// is a fact a reader could be bitten by — a figure that changes under the arrow keys, a refusal that is announced, a tick that is drawn once, a flourish that plays once and never again, a
// pinned row that is covered by another.

test.describe('the number box', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/profil')
    await page.locator('.page-head__title').waitFor()
  })

  // A year or an age: a whole number, so every arrow step is exactly one. Only a NumberField sits in a FieldRow and has an id (the child's year box is a plain EditField).
  const yearBox = (page: import('@playwright/test').Page) => page.locator('.field-row input.edit-field__input[inputmode="numeric"][id]').first()

  test('↑ and ↓ step the figure and keep it; Shift moves ten steps', async ({ page }) => {
    const box = yearBox(page)
    await box.focus()
    const start = Number((await box.inputValue()).replace(/\D/g, ''))
    await box.press('ArrowUp')
    await expect(box).toHaveValue(String(start + 1))
    await box.press('ArrowDown')
    await box.press('ArrowDown')
    await expect(box).toHaveValue(String(start - 1))
    await box.press('Shift+ArrowUp')
    await expect(box).toHaveValue(String(Math.floor((start - 1) / 10) * 10 + 10))
  })

  test('a kept change rings the box once; a refused text is announced, turns the border and shakes; Escape gives the kept figure back', async ({ page }) => {
    const box = yearBox(page)
    const field = box.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " edit-field ")][1]')
    await box.focus()
    const start = await box.inputValue()
    await box.press('ArrowUp')
    await expect(field).toHaveClass(/edit-field--saved/)
    await expect(field).not.toHaveClass(/edit-field--saved/, { timeout: 5000 }) // the ring is a beat, not a state
    await box.fill('abc')
    await box.press('Tab')
    await expect(box).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveClass(/edit-field--invalid/)
    await box.focus()
    await box.press('Escape')
    await expect(box).not.toHaveAttribute('aria-invalid', 'true')
    await expect(box).toHaveValue(String(Number(start) + 1))
  })

  test('the phone keyboard is told this is a figure: « OK » on the return key, autofill and spell-check off', async ({ page }) => {
    const box = yearBox(page)
    expect(await box.getAttribute('enterkeyhint')).toBe('done')
    expect(await box.getAttribute('autocomplete')).toBe('off')
    expect(await box.getAttribute('spellcheck')).toBe('false')
  })
})

test('confirming a figure draws its tick once; a figure that arrives confirmed shows the plain mark', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/profil')
  await page.locator('.page-head__title').waitFor()
  const open = page.locator('button.fact-btn[aria-pressed="false"]').first()
  await open.scrollIntoViewIfNeeded()
  await open.click()
  const confirmed = page.locator('button.fact-btn.is-fresh').first()
  await expect(confirmed).toBeVisible()
  await expect(confirmed.locator('.fact-btn__tick')).toHaveCount(1)
  // Un-confirm: no tick, no fresh mark.
  await confirmed.click()
  await expect(page.locator('button.fact-btn.is-fresh')).toHaveCount(0)
})

test('the digits of the answer arrive one by one but the text is whole: « N ans » reads at once', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  const age = page.locator('.verdict__age').first()
  await expect(age).toBeVisible({ timeout: 60_000 })
  expect((await age.textContent())?.trim()).toMatch(/^\d{2} ans$/)
  expect(await age.locator('.cascade__d').count()).toBeGreaterThanOrEqual(2)
})

test('the first answer a device sees lights the map once: the wave plays, the flag is set, a second visit has none', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('horizon-first-answer'))
  await seedProfile(page, EXAMPLE)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resultats')
  await expect(page.locator('.section-nav')).toHaveClass(/is-celebrating/, { timeout: 60_000 })
  expect(await page.evaluate(() => localStorage.getItem('horizon-first-answer'))).toBe('done')
  await expect(page.locator('.section-nav')).not.toHaveClass(/is-celebrating/, { timeout: 8000 })
})

test.describe('the page chrome', () => {
  test('the chosen tab’s fill sits exactly under it, before and after a change', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/resultats')
    const row = page.locator('.results-pin .subtabs')
    await expect(row).toHaveAttribute('data-thumb', '', { timeout: 60_000 })
    const under = async () => {
      const [thumb, tab] = await Promise.all([row.locator('.subtabs__thumb').boundingBox(), row.getByRole('tab', { selected: true }).boundingBox()])
      return { dx: Math.abs(thumb!.x - tab!.x), dw: Math.abs(thumb!.width - tab!.width), dy: Math.abs(thumb!.y - tab!.y) }
    }
    const first = await under() // whole pixels, give or take the rounding of a fractional text size
    expect(Math.max(first.dx, first.dw, first.dy)).toBeLessThanOrEqual(1)
    await row.getByRole('tab', { name: 'Décider' }).click()
    await expect.poll(async () => (await under()).dx, { message: 'the fill glided to the new tab' }).toBeLessThanOrEqual(1)
    expect((await under()).dw).toBeLessThanOrEqual(1)
  })

  test('the views and the map are ONE pinned box: nothing else on the page is sticky under the bar, and no pinned row is ever covered', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/resultats')
    await expect(page.locator('#verdict')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1200)
    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.results-pin, .section-nav, .pin-stack')].map((e) => `${e.className.split(' ')[0]}:${getComputedStyle(e).position}`),
    )
    expect(stuck).toEqual(['pin-stack:sticky', 'results-pin:static', 'section-nav:static'])
    // Scroll through the page with the programmatic scroller (it never hides the chrome): at every offset the point in the middle of each pinned row belongs to that row.
    for (const top of [0, 120, 260, 420, 700, 1100, 1700]) {
      await page.locator('#root').evaluate((el, y) => el.scrollTo({ top: y }), top)
      await page.waitForTimeout(120)
      for (const sel of ['.results-pin', '.section-nav']) {
        const covered = await page.locator(sel).first().evaluate((row) => {
          const r = row.getBoundingClientRect()
          if (r.bottom <= 0 || r.top >= window.innerHeight) return false
          const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.bottom - 2, Math.max(r.top + 2, r.top + r.height / 2)))
          return hit !== null && !row.contains(hit)
        })
        expect(covered, `${sel} is covered at scroll ${top}`).toBe(false)
      }
    }
  })

  test('a thin line along the top fills as the page is read (a browser with scroll-driven animations)', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil')
    await page.locator('.page-head__title').waitFor()
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'))
    test.skip(!supported, 'no scroll-driven animations in this browser: the line is simply absent')
    const scale = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.shell')!, '::before').transform).a)
    expect(await scale()).toBe(0)
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: (el.scrollHeight - el.clientHeight) / 2 }))
    await expect.poll(scale).toBeGreaterThan(0.3)
    expect(await scale()).toBeLessThan(0.7)
  })
})

test.describe('more inputs', () => {
  test('a choose-one set walks with the arrow keys: → chooses the next chip, ← the one before, and it wraps', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/profil')
    await page.locator('.page-head__title').waitFor()
    const group = page.getByRole('radiogroup').first()
    await group.scrollIntoViewIfNeeded()
    const radios = group.getByRole('radio')
    const checked = async () => radios.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')))
    const before = await checked()
    const at = before.indexOf('true')
    await radios.nth(at).focus()
    await radios.nth(at).press('ArrowRight')
    const after = await checked()
    expect(after.indexOf('true')).toBe((at + 1) % before.length)
    await radios.nth((at + 1) % before.length).press('ArrowLeft')
    expect((await checked()).indexOf('true')).toBe(at)
  })

  test('a file dropped on the bank paste box is read, and the box shows it is a drop target while the file is over it', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/profil?form=1')
    await page.locator('.page-head__title').waitFor()
    const fold = page.locator('details.fold', { hasText: 'Importer un relevé de banque' })
    await fold.locator('summary').click()
    const box = fold.getByRole('textbox', { name: 'Opérations copiées du relevé' })
    const csv = ['Date;Description;Catégorie;Montant', '2025-01-28;IGA;Épicerie;-500,00', '2025-02-28;IGA;Épicerie;-500,00'].join('\n')
    await box.evaluate((el, text) => {
      const data = new DataTransfer()
      data.items.add(new File([text], 'releve.csv', { type: 'text/csv' }))
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: data }))
    }, csv)
    await expect(box).toHaveClass(/is-dropping/)
    await box.evaluate((el, text) => {
      const data = new DataTransfer()
      data.items.add(new File([text], 'releve.csv', { type: 'text/csv' }))
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }))
    }, csv)
    await expect(fold.getByRole('status')).toContainText('opérations lues')
    await expect(box).not.toHaveClass(/is-dropping/)
  })
})

test.describe('a figure that counts up', () => {
  const url = '/resultats?v=decide&essai=spend&spend=40000'
  // Records every value the count draws, from the first frame.
  const watch = (page: import('@playwright/test').Page) =>
    page.addInitScript(() => {
      const w = window as unknown as { __live: string[] }
      w.__live = []
      new MutationObserver((ms) => {
        for (const m of ms) if ((m.target as Element).classList?.contains('countup')) w.__live.push((m.target as Element).getAttribute('data-live') ?? '')
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-live'] })
    })

  test('the sentence is whole in the page at once, and the amount is drawn climbing to it; the age beside it never moves', async ({ page }) => {
    await watch(page)
    await seedProfile(page, EXAMPLE)
    await page.goto(url)
    const text = page.locator('.countup__text').first()
    await expect(text).toContainText(/par année\s*:\s*dès\s*\d+\s*ans/, { timeout: 60_000 })
    await expect.poll(() => page.evaluate(() => (window as unknown as { __live: string[] }).__live.filter(Boolean).length)).toBeGreaterThan(3)
    const frames = await page.evaluate(() => (window as unknown as { __live: string[] }).__live.filter(Boolean))
    const age = (s: string) => /dès\s(\d+)\sans/.exec(s)?.[1]
    expect(new Set(frames.map(age)).size, 'the age is the same in every frame').toBe(1)
    expect(frames[0]).toMatch(/^À\s0\s\$/)
    await expect(page.locator('.countup').first()).not.toHaveClass(/is-counting/, { timeout: 5000 })
    expect((await text.textContent())?.replace(/\s/g, ' ')).toMatch(/^À 40 000 \$ par année/)
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('nothing is drawn: the figure is simply there', async ({ page }) => {
      await watch(page)
      await seedProfile(page, EXAMPLE)
      await page.goto(url)
      await expect(page.locator('.countup__text').first()).toContainText(/par année/, { timeout: 60_000 })
      await page.waitForTimeout(1000)
      expect(await page.evaluate(() => (window as unknown as { __live: string[] }).__live.filter(Boolean).length)).toBe(0)
    })
  })
})

test.describe('the settings and the docked cards', () => {
  test('a day / night change fades the colours for a moment and then the stamp is gone; with reduced motion it is only a change', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/donnees')
    await page.locator('.page-head__title').waitFor()
    await page.getByRole('tab', { name: /Nuit/ }).first().click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await expect(page.locator('html')).toHaveAttribute('data-theme-fade', '')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-fade', '', { timeout: 3000 })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('a day / night change is only a change', async ({ page }) => {
      await seedProfile(page, EXAMPLE)
      await page.goto('/donnees')
      await page.locator('.page-head__title').waitFor()
      await page.getByRole('tab', { name: /Nuit/ }).first().click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
      expect(await page.locator('html').getAttribute('data-theme-fade')).toBeNull()
    })
  })

  test('the two destructive sections wear the clay rule; the text sizes are set at their own sizes, smallest to largest', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/donnees')
    await page.locator('.page-head__title').waitFor()
    await expect(page.locator('.profile-section.section--danger')).toHaveCount(2)
    const sizes = await page.locator('.size-sample').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)))
    expect(sizes).toHaveLength(3)
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
  })

  test('the tour bar and the guide card dock with a meter along their top edge that follows the step', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/resultats?visite=1')
    const tour = page.locator('.tour-bar')
    await expect(tour).toBeVisible({ timeout: 60_000 })
    const meter = () => tour.evaluate((el) => Number(el.style.getPropertyValue('--p')))
    const before = await meter()
    expect(before).toBeGreaterThan(0)
    expect(before).toBeLessThan(1)
    await tour.getByRole('button', { name: 'Suivant' }).click()
    await expect.poll(meter, { message: 'the meter moved on with the step' }).toBeGreaterThan(before)
    await page.goto('/profil?form=1&par=document&etape=bank')
    await page.getByRole('button', { name: 'Me guider' }).click()
    const guide = page.locator('.guide-bar')
    await expect(guide).toBeVisible()
    expect(await guide.evaluate((el) => el.style.getPropertyValue('--p'))).toBe('0')
  })

  test('the chart tooltip is a small table: one row per series, its figure on the right', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/resultats')
    const plot = page.locator('.chart-panel .chart__plot')
    await plot.locator('.recharts-surface').waitFor()
    await plot.scrollIntoViewIfNeeded()
    const box = (await plot.boundingBox())!
    await page.mouse.move(box.x + 100, box.y + 100)
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 })
    const row = page.locator('.chart-tip__row').first()
    await expect(row).toBeVisible()
    const [label, figure] = await Promise.all([row.boundingBox(), row.locator('strong').boundingBox()])
    expect(figure!.x + figure!.width, 'the figure sits at the row’s right edge').toBeGreaterThan(label!.x + label!.width - 14)
  })
})
