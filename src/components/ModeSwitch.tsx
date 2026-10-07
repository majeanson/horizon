import { useT } from '../i18n'
import { setMode, useMode } from '../lib/mode'
import { Chip } from './Chip'

// The Simple ↔ Full switch: one toggle in the top bar, on every page. Pressed = Full.
export function ModeSwitch() {
  const t = useT()
  const mode = useMode()
  return (
    <Chip selected={mode === 'full'} onClick={() => setMode(mode === 'full' ? 'simple' : 'full')} title={t.mode.hint} ariaLabel={t.mode.name}>
      {t.mode.full}
    </Chip>
  )
}
