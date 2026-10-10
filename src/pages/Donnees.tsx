import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cluster } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { ModeSwitch } from '../components/sheet/ModeSwitch'
import { PlansSection } from '../components/PlansSection'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { useLang, useT } from '../i18n'
import { getContrast, getTextScale, setContrast, setTextScale, TEXT_SCALES, type Contrast, type TextScale } from '../lib/accessibility'
import { useConfirm } from '../lib/confirm'
import { saveAsFile } from '../lib/download'
import { EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples'
import { exampleProfile } from '../lib/example'
import { EXAMPLE_COPY } from '../lib/exampleCopy'
import { readProfileJson, type ReadResult } from '../lib/migrations'
import type { Profile } from '../lib/schema'
import { clearProfile, exportFileName, exportProfileJson, getProfile, markExported, replaceProfile, unreadableCopies, useStorageIssue } from '../lib/store'
import { MODE_COPY } from '../lib/sheetCopy'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { useNotice } from '../lib/toast'

// Where the figures go — which is nowhere — and the device's own settings. Save a copy to keep, restore one, see an
// example household, set the display, or erase this device's copy. Every action that replaces the profile asks first,
// in words that say what is lost. Behind the gear in the top bar: used a few times a year, not a main destination.
export function Donnees() {
  const t = useT()
  const { lang } = useLang()
  const d = t.data
  const confirm = useConfirm()
  const notice = useNotice()
  // Subscribed for its RE-RENDERS: the store announces a clear, a reload or a new unreadable copy through it, and the
  // rescue section below reads storage afresh each time. (The banner itself lives in the shell, on every page.)
  useStorageIssue()
  const copies = unreadableCopies()
  const fileInput = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState<Extract<ReadResult, { ok: false }> | null>(null)
  // The profile as it was before the last replace or clear, held in memory for this visit: the confirm
  // promises « rétablir tout de suite après », and this is what keeps the promise. Gone on navigation —
  // beyond the visit, the saved copy remains the only way back, as the confirm also says.
  const [previous, setPrevious] = useState<Profile | null>(null)
  const restorePrevious = () => {
    if (previous === null) return
    replaceProfile(previous)
    setPrevious(null)
    notice(d.undo.done)
  }

  const download = () => {
    saveAsFile(exportProfileJson(getProfile()), exportFileName())
    markExported()
    notice(d.export.done)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setFailure(null)
    try {
      let text: string
      try {
        text = await file.text()
      } catch {
        // A file the browser cannot read (removed, or a permission) is a file that is not JSON, as far as this person goes.
        return setFailure({ ok: false, reason: 'json', problems: [] })
      }
      const result = readProfileJson(text)
      if (!result.ok) return setFailure(result)
      if (await confirm({ message: d.import.confirm, confirmLabel: d.import.confirmLabel, tone: 'default' })) {
        setPrevious(getProfile())
        replaceProfile(result.profile)
        notice(d.import.done)
      }
    } finally {
      // Always: an input that keeps its file does not fire `change` when the SAME file is chosen again, so a refused
      // file could never be retried after it was mended.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <section className="page-body">
      <PageHead title={d.title} subtitle={d.privacy} />

      {previous !== null && (
        <Cluster className="data-undo surface">
          <StatusMessage tone="info">{d.undo.offer}</StatusMessage>
          <button type="button" className="btn btn--sm" onClick={restorePrevious}>
            {d.undo.button}
          </button>
        </Cluster>
      )}

      <div className="data-pair">
      {/* The copy is the whole reason this page exists: its button is the one filled button here. */}
      <Section title={d.export.title} subtitle={d.export.hint} icon="download-simple-bold">
        <Cluster>
          <button type="button" className="btn btn--primary" onClick={download}>
            {d.export.button}
          </button>
        </Cluster>
      </Section>

      {copies.length > 0 && (
        <Section title={d.rescue.title} subtitle={d.rescue.hint} icon="download-simple-bold">
          <Cluster>
            {copies.map((text, i) => (
              <button key={i} type="button" className="btn" onClick={() => saveAsFile(text, d.rescue.fileName(i))}>
                {i === 0 ? d.rescue.button : d.rescue.older}
              </button>
            ))}
          </Cluster>
        </Section>
      )}

      <Section title={d.import.title} subtitle={d.import.hint} icon="upload-simple-bold">
        <Cluster>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            {d.import.button}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label={d.import.button}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </Cluster>
        {failure && (
          <div role="alert" className="import-errors">
            <StatusMessage tone="error">{failure.reason === 'json' ? d.import.notJson : failure.reason === 'newer' ? d.import.newer : d.import.problems}</StatusMessage>
            {failure.problems.length > 0 && failure.reason !== 'newer' && (
              <ul className="import-errors__list mono">
                {failure.problems.slice(0, 12).map((p) => (
                  <li key={p.path + p.problem}>
                    {p.path} — {d.import.problem[p.problem]}
                  </li>
                ))}
                {failure.problems.length > 12 && <li>…</li>}
              </ul>
            )}
          </div>
        )}
      </Section>
      </div>

      <PlansSection onReplace={setPrevious} />

      <Section title={d.example.title} subtitle={d.example.hint} icon="user-bold">
        <ul className="example-list">
          {EXAMPLE_IDS.map((id: ExampleId) => (
            <li key={id}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  if (await confirm({ message: d.example.confirm(EXAMPLE_COPY[lang][id].name), confirmLabel: d.example.confirmLabel, tone: 'default' })) {
                    setPrevious(getProfile())
                    replaceProfile(exampleProfile(id))
                    notice(d.example.done)
                  }
                }}
              >
                {EXAMPLE_COPY[lang][id].name}
              </button>
              <span className="field-row__hint">{EXAMPLE_COPY[lang][id].story}</span>
            </li>
          ))}
        </ul>
      </Section>

      <DisplaySection />

      <Section title={d.clear.title} subtitle={d.clear.hint} icon="trash-bold">
        <Cluster>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (await confirm({ message: d.clear.confirm, confirmLabel: d.clear.confirmLabel, tone: 'danger' })) {
                setPrevious(getProfile())
                clearProfile()
                notice(d.clear.done)
              }
            }}
          >
            {d.clear.button}
          </button>
        </Cluster>
      </Section>

      {/* The version, and — while developing only — the door to the component gallery: a reader of the live app has no use for it. */}
      <p className="data-foot">
        {d.build(__BUILD_SHA__)}
        {import.meta.env.DEV && (
          <>
            {' '}
            · <Link to="/dev/kit">{d.kit}</Link>
          </>
        )}
      </p>
    </section>
  )
}

// The reading settings in ONE place: the theme (the bar's moon is a shortcut to the same choice), the contrast and the
// text size — the same machinery the dev gallery flips, but ON a page of the app. The setters write the DOM attribute
// (the cascade does the rest) and persist to this device; local state only mirrors them so the control shows what is in force.
function DisplaySection() {
  const t = useT()
  const { lang } = useLang()
  const d = t.data.display
  const [theme, setThemeShown] = useState<Theme>(getTheme)
  const [contrast, setContrastShown] = useState<Contrast>(getContrast)
  const [scale, setScaleShown] = useState<TextScale>(getTextScale)
  return (
    <Section title={d.title} subtitle={d.hint} icon="sliders-horizontal-bold">
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
      <div className="field-row">
        <p className="field-row__label">{d.textSize}</p>
        <SubTabs
          size="mini"
          ariaLabel={d.textSize}
          value={scale}
          onSelect={(s: TextScale) => {
            setTextScale(s)
            setScaleShown(s)
          }}
          options={TEXT_SCALES.map((s) => ({ key: s, label: d.textSizes[s] }))}
        />
      </div>
      <div className="field-row">
        <p className="field-row__label">{MODE_COPY[lang].label}</p>
        <ModeSwitch />
        <p className="field-row__hint">{MODE_COPY[lang].hint}</p>
      </div>
    </Section>
  )
}
