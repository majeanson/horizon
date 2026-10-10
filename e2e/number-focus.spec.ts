import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// A number box is easy to type into: a zero is emptied on focus (so « 5 » is five, never « 05 » or « 50 »), any other figure is selected whole
// (so typing replaces it), and leaving a zeroed box empty puts the 0 back.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('focusing a number box selects its figure, so the first keystroke replaces it', async ({ page }) => {
  await page.goto('/profil?form=1')
  const salary = page.getByRole('textbox', { name: /Revenu de travail par année/ }).first()
  await salary.click()
  await expect.poll(() => salary.evaluate((el: HTMLInputElement) => el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0)).toBe(true)
  await salary.press('Control+a')
  await salary.pressSequentially('72000')
  await salary.press('Enter')
  await expect(salary).toHaveValue(/72[\s  ,]?000/)
})

test('a box holding 0 is selected on focus: the first digit replaces it, never « 05 »', async ({ page }) => {
  await page.goto('/profil?form=1')
  const box = page.getByRole('textbox', { name: /Revenu de travail par année/ }).first()
  await box.click()
  await box.press('Control+a')
  await box.pressSequentially('0')
  await box.press('Enter')
  await expect(box).toHaveValue(/^0(,00)?$/)
  await page.keyboard.press('Tab')
  await box.click()
  await expect.poll(() => box.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBeGreaterThan(0)
  await box.pressSequentially('5')
  await expect(box).toHaveValue('5')
})
