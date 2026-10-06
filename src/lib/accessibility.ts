// Accessibility profile: a high-contrast palette and a larger base text size, for a
// low-vision reader. Orthogonal to the day/night theme and NOT a permission boundary — it
// only changes how the same data is drawn. DOM-attribute driven exactly like theme.ts
// (data-contrast + data-text-scale on <html>), so the cascade in core.css does the work
// globally, and public/theme-bootstrap.js applies both before first paint.
//
// Absence of the attribute means "default", presence means "override" — which is why
// setting 'normal' REMOVES it instead of writing a value no CSS rule defines.
export type Contrast = 'normal' | 'high'
// Three steps, 100 % / 115 % / 130 %. 130 % is not WCAG 1.4.4's 200 %: it is the largest
// step the rem-sized layout takes without the px-sized chrome breaking, and browser zoom
// stays ENABLED here (index.html does not lock the viewport) for everything beyond it.
export type TextScale = 'normal' | 'large' | 'x-large'
export const TEXT_SCALES: readonly TextScale[] = ['normal', 'large', 'x-large'] as const

export const CONTRAST_KEY = 'horizon-contrast'
export const TEXT_SCALE_KEY = 'horizon-text-scale'

export function getContrast(): Contrast {
  return document.documentElement.getAttribute('data-contrast') === 'high' ? 'high' : 'normal'
}

export function setContrast(c: Contrast): void {
  if (c === 'high') document.documentElement.setAttribute('data-contrast', 'high')
  else document.documentElement.removeAttribute('data-contrast')
  try {
    localStorage.setItem(CONTRAST_KEY, c)
  } catch {
    /* storage blocked — the choice just does not persist */
  }
}

export function getTextScale(): TextScale {
  const v = document.documentElement.getAttribute('data-text-scale')
  // Read against the known set rather than testing one value: an unrecognised attribute
  // (a devtools edit) must read as 'normal', never as "not this, therefore that".
  return (TEXT_SCALES as readonly string[]).includes(v ?? '') ? (v as TextScale) : 'normal'
}

export function setTextScale(s: TextScale): void {
  if (s !== 'normal') document.documentElement.setAttribute('data-text-scale', s)
  else document.documentElement.removeAttribute('data-text-scale')
  try {
    localStorage.setItem(TEXT_SCALE_KEY, s)
  } catch {
    /* storage blocked */
  }
}
