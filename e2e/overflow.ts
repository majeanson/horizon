import { expect, type Locator, type Page } from '@playwright/test'

// The horizontal-overflow guard — a PER-CHILD bounds check, never `scrollWidth`.
//
// New UI that bleeds off the right edge on a narrow phone is a recurring bug, and the reason it
// ships unnoticed is that the app shell clips horizontal overflow (`#root` is `overflow-x:
// hidden`): a too-wide row is CLIPPED, not fixed, and a `scrollWidth` check reads it as 0. So
// this measures each visible descendant's right edge against the viewport, which sees straight
// through the clip.
//
// Elements inside a deliberately scrolling region (`.rail`, `.subtabs`, `.table-wrap` — a focusable, scrollable
// table region) are exempt: they are
// SUPPOSED to extend past the edge, and `useHScroll` makes them reachable.
export async function expectNoHorizontalOverflow(page: Page, root: Locator | string = 'body'): Promise<void> {
  const target = typeof root === 'string' ? page.locator(root) : root
  const offenders = await target.evaluate((el) => {
    const limit = document.documentElement.clientWidth + 0.5
    const out: string[] = []
    for (const node of el.querySelectorAll<HTMLElement>('*')) {
      const r = node.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const style = getComputedStyle(node)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      if (node.closest('.rail, .subtabs, .table-wrap, .sr-only, svg')) continue
      if (r.right > limit) {
        const cls = typeof node.className === 'string' && node.className ? '.' + node.className.trim().split(/\s+/).join('.') : ''
        out.push(`${node.tagName.toLowerCase()}${cls} right=${Math.round(r.right)} > ${Math.round(limit)}`)
      }
    }
    return out.slice(0, 8)
  })
  expect(offenders, 'these elements run past the right edge of the viewport').toEqual([])
}
