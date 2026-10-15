import { useRef, useState } from 'react'
import { SubTabs } from './SubTabs'
import { useT } from '../i18n'
import { getContrast, getTextScale, setContrast, setTextScale, TEXT_SCALES, type Contrast, type TextScale } from '../lib/accessibility'
import { getTheme, setTheme, type Theme } from '../lib/theme'

// DisplayControls — the three ways to make the page easier to read: day / night, contrast and text size. The setters write the DOM attribute (the cascade does the
// rest) and persist to this device; local state only mirrors them so each control shows what is in force. The settings page and the front door's reading card share it.
// `sizeLabels` lets a surface say the sizes in words (« Grand ») where the settings page says them in percent.
// A new text size re-flows everything: whatever the reader was looking at moves, usually out of sight. So the page — and the dialog, when this sits in one — goes back
// to its top, where the reader can start again at the new size.
function scrollBackUp(from: HTMLElement | null): void {
  for (let el = from; el; el = el.parentElement) if (el.scrollTop > 0) el.scrollTo({ top: 0 })
  document.getElementById('root')?.scrollTo({ top: 0 })
}

export function DisplayControls({ sizeLabels }: { sizeLabels?: Record<TextScale, string> }) {
  const d = useT().data.display
  const [theme, setThemeShown] = useState<Theme>(getTheme)
  const [contrast, setContrastShown] = useState<Contrast>(getContrast)
  const [scale, setScaleShown] = useState<TextScale>(getTextScale)
  const sizeRow = useRef<HTMLDivElement>(null)
  return (
    <>
      <div className="field-row">
        <p className="field-row__label">{d.theme}</p>
        <SubTabs
          size="mini"
          ariaLabel={d.theme}
          value={theme}
          onSelect={(v: Theme) => {
            setTheme(v)
            setThemeShown(v)
          }}
          options={[
            { key: 'day', label: d.themeDay, icon: 'sun-bold' },
            { key: 'night', label: d.themeNight, icon: 'moon-stars-bold' },
          ]}
        />
      </div>
      <div className="field-row">
        <p className="field-row__label">{d.contrast}</p>
        <SubTabs
          size="mini"
          ariaLabel={d.contrast}
          value={contrast}
          onSelect={(c: Contrast) => {
            setContrast(c)
            setContrastShown(c)
          }}
          options={[
            { key: 'normal', label: d.contrastNormal },
            { key: 'high', label: d.contrastHigh },
          ]}
        />
      </div>
      <div className="field-row" ref={sizeRow}>
        <p className="field-row__label">{d.textSize}</p>
        <SubTabs
          size="mini"
          ariaLabel={d.textSize}
          value={scale}
          onSelect={(s: TextScale) => {
            setTextScale(s)
            setScaleShown(s)
            scrollBackUp(sizeRow.current)
          }}
          options={TEXT_SCALES.map((s) => ({ key: s, label: (sizeLabels ?? d.textSizes)[s] }))}
        />
      </div>
    </>
  )
}
