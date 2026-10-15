import { useLang } from '../../i18n'
import { SHARE_COPY } from '../../lib/shareCopy'
import { shareUrl } from '../../lib/shareLink'
import { useNotice } from '../../lib/toast'
import { Chip } from '../Chip'

// « Partager ce scénario » — copies the link of lib/shareLink.ts for the answer on screen. The link carries the age and the household type and
// nothing else, so there is nothing to confirm before sending it; the notice after the copy says what it holds.
export function ShareChip({ age, isCouple }: { age: number; isCouple: boolean }) {
  const { lang } = useLang()
  const notice = useNotice()
  const c = SHARE_COPY[lang]
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(window.location.origin, { age, home: isCouple ? 'couple' : 'seul', lang }))
      notice(c.copied)
    } catch {
      notice(c.copyFailed, 'error')
    }
  }
  return (
    <Chip icon="upload-simple-bold" onClick={copy}>
      {c.button}
    </Chip>
  )
}
