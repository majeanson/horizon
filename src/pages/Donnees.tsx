import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cluster } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { useLang, useT } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples'
import { exampleProfile } from '../lib/example'
import { EXAMPLE_COPY } from '../lib/exampleCopy'
import { readProfileJson, type ReadResult } from '../lib/migrations'
import { clearProfile, exportFileName, exportProfileJson, getProfile, replaceProfile, unreadableCopies, useStorageIssue } from '../lib/store'
import { useNotice } from '../lib/toast'

/** Hand a text to the browser as a file. */
function saveAsFile(text: string, name: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

// Where the data goes — which is nowhere. Export a file to keep, import one back, load the fictional example,
// or erase this device's copy. Every action that replaces the profile asks first, in words that say what is lost.
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

  const download = () => {
    saveAsFile(exportProfileJson(getProfile()), exportFileName())
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

      <Section title={d.export.title} subtitle={d.export.hint} icon="download-simple-bold">
        <Cluster>
          <button type="button" className="btn" onClick={download}>
            {d.export.button}
          </button>
        </Cluster>
      </Section>

      {copies.length > 0 && (
        <Section title={d.rescue.title} subtitle={d.rescue.hint} icon="download-simple-bold">
          <Cluster>
            {copies.map((text, i) => (
              <button key={i} type="button" className="btn" onClick={() => saveAsFile(text, `horizon-illisible${i === 0 ? '' : '-precedent'}.json`)}>
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

      <Section title={d.example.title} subtitle={d.example.hint} icon="user-bold">
        <ul className="example-list">
          {EXAMPLE_IDS.map((id: ExampleId) => (
            <li key={id}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  if (await confirm({ message: d.example.confirm(EXAMPLE_COPY[lang][id].name), confirmLabel: d.example.confirmLabel, tone: 'default' })) {
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

      <Section title={d.clear.title} subtitle={d.clear.hint} icon="trash-bold">
        <Cluster>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (await confirm({ message: d.clear.confirm, confirmLabel: d.clear.confirmLabel, tone: 'danger' })) {
                clearProfile()
                notice(d.clear.done)
              }
            }}
          >
            {d.clear.button}
          </button>
        </Cluster>
      </Section>

      <p className="data-foot mono">
        {d.build(__BUILD_SHA__)} · <Link to="/dev/kit">{d.kit}</Link>
      </p>
    </section>
  )
}
