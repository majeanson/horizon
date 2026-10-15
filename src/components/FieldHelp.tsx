import { useId, useState } from 'react'
import { useLang, useT } from '../i18n'
import type { HelpId } from '../lib/fieldHelpCopy'
import { glossed } from './Gloss'
import { Icon } from './Icon'

// « À propos de ce champ » — the ⓘ of a field that is NOT a figure printed on a document: an age the person chooses, a rule of their pension plan, an
// amount they estimate. FieldInfo (« Où trouver ce chiffre ») answers WHERE a figure is; this one answers WHAT the field is and WHAT it changes in the
// plan. Same button, same inline note, same place on the label line — a person sees one ⓘ per field and never has to know there are two kinds.
//
// Its words are not in the eager dictionary (that one is at its cap and holds what the first screen needs): `lib/fieldHelpCopy.ts` is fetched the first
// time any of these notes is opened, then kept for the visit. The service worker precaches it like every chunk, so it opens offline too.

type Module = typeof import('../lib/fieldHelpCopy')
let loaded: Module | null = null
const load = (): Promise<Module> => import('../lib/fieldHelpCopy').then((m) => (loaded = m))

export function FieldHelp({ id, label }: { id: HelpId; label?: string }) {
  const t = useT()
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [mod, setMod] = useState<Module | null>(loaded)
  const panelId = useId()
  const name = label ? `${t.common.aboutField} : ${label}` : t.common.aboutField
  const entry = mod?.FIELD_HELP[lang][id]
  const words = mod?.FIELD_HELP_WORDS[lang]
  return (
    <>
      <button
        type="button"
        className={'info-btn' + (open ? ' is-on' : '')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={name}
        title={t.common.aboutField}
        onClick={() => {
          setOpen((o) => !o)
          if (!mod) void load().then(setMod)
        }}
      >
        <Icon name="info-bold" size={18} />
      </button>
      <div id={panelId} className="info-note" role="note" hidden={!open} aria-busy={open && !entry}>
        {entry && words && (
          <>
            <p>
              <strong>{words.what}</strong> {glossed(entry.what)}
            </p>
            {entry.effect && (
              <p>
                <strong>{words.effect}</strong> {glossed(entry.effect)}
              </p>
            )}
            {entry.where && (
              <p>
                <strong>{words.where}</strong> {glossed(entry.where)}
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
