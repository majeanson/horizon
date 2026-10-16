import { type RefObject } from 'react'
import { PinStack } from './PinStack'
import { SectionNav, type SectionLink } from './SectionNav'

// The map of a LONG PAGE (Profil, Hypothèses): one chip per block, in the order they are on the page, in a `PinStack` under the top bar (the stack measures itself into the page's
// `--map-h`, so a tapped block stops below it — styles/revamp.css). Like everything pinned at the top it rolls up with the bar while the reader scrolls down (lib/useHeadroom.ts).
// On a page that reads its blocks one at a time (components/Accordion.tsx), `onPick` opens the block a chip names before the map scrolls to it.
// (`page` is the page's own element; the stack finds it by itself, the prop stays for callers that already pass it.)
export function PinnedMap({ links, ariaLabel, onPick }: { links: readonly SectionLink[]; ariaLabel: string; page?: RefObject<HTMLElement | null>; onPick?: (id: string) => void }) {
  return (
    <PinStack className="pinned-map">
      <SectionNav links={links} ariaLabel={ariaLabel} onPick={onPick} />
    </PinStack>
  )
}
