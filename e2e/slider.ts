import type { Locator, Page } from '@playwright/test'

// A bounded figure (an age, a rate, a share) is a slider with a « Saisir le chiffre exact » chip under it
// (components/NumberSlider.tsx). A spec that wants to TYPE the figure asks for its box here: the chip is
// tapped when the box is not already out, and the box carries the field's own label either way.
export async function exactBox(scope: Page | Locator, name: string | RegExp, exact?: boolean): Promise<Locator> {
  const box = scope.getByRole('textbox', { name, exact })
  if ((await box.count()) === 0) {
    // `has` is matched inside each row, so its locator is rooted at the page.
    const page = 'goto' in scope ? scope : scope.page()
    await scope
      .locator('.number-slider')
      .filter({ has: page.getByRole('slider', { name, exact }) })
      .getByRole('button', { name: 'Saisir le chiffre exact' })
      .click()
  }
  return box
}

/** Type a figure into a slider's exact box and commit it (the box keeps what it is given on blur). */
export async function typeExact(scope: Page | Locator, name: string | RegExp, text: string, exact?: boolean): Promise<Locator> {
  const box = await exactBox(scope, name, exact)
  await box.fill(text)
  await box.blur()
  return box
}
