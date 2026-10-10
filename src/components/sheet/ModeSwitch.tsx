import { useLang } from '../../i18n'
import { DISPLAY_MODES, setMode, useMode, type DisplayMode } from '../../lib/displayMode'
import { MODE_COPY } from '../../lib/sheetCopy'
import { SubTabs } from '../SubTabs'

// « Sérieux / Aventure » — the display mode, as a segmented control. The same control sits on the sheet and on the settings page; both read and write the
// one stored setting (lib/displayMode.ts), so they never disagree. A mode only changes how a page that asks for it is drawn: the figures are the same.
export function ModeSwitch({ size = 'mini' }: { size?: 'mini' }) {
  const { lang } = useLang()
  const c = MODE_COPY[lang]
  const mode = useMode()
  return (
    <SubTabs
      size={size}
      ariaLabel={c.label}
      value={mode}
      onSelect={(m: DisplayMode) => setMode(m)}
      options={DISPLAY_MODES.map((m) => ({ key: m, label: c[m] }))}
    />
  )
}
