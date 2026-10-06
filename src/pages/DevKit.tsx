import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip, ChipGroup } from '../components/Chip'
import { Disclosure } from '../components/Disclosure'
import { EditField } from '../components/EditField'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Loading } from '../components/Loading'
import { Modal } from '../components/Modal'
import { Cluster, Rail } from '../components/Layout'
import { SectionHeader } from '../components/SectionHeader'
import { Skeleton } from '../components/Skeleton'
import { StatusMessage } from '../components/StatusMessage'
import { SubTabs } from '../components/SubTabs'
import { useLang, useT } from '../i18n'
import { getContrast, getTextScale, setContrast, setTextScale, TEXT_SCALES, type TextScale } from '../lib/accessibility'
import { useConfirm } from '../lib/confirm'
import { getTheme, setTheme } from '../lib/theme'
import { useNotice } from '../lib/toast'
import '../styles/devkit.css'

// The living gallery of every shared primitive (/dev/kit, reachable from « Données »). A new
// primitive that is not in this list is invisible to the next session and gets re-invented
// beside the one that exists — so src/lib/devkitParity.test.ts keeps this list and the table
// in COMPONENTS.md in step, in both directions.
//
// A specimen is `{ cat, name, file, kw, render }`: the category it is filed under, the
// component's name, the file it lives in, search keywords, and a function returning the
// live specimen. The header toggles theme, language, contrast and text size so every
// specimen can be judged on every axis — the axes a household actually varies.

interface Entry {
  cat: string
  name: string
  // The component's file, relative to the repo root — the parity test checks it exists and
  // that it really exports `name` (or the names in `exports`).
  file: string
  exports?: string[]
  kw: string
  render: () => ReactNode
}

// A labelled sub-variant inside one specimen.
function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="devkit__demo">
      <span className="devkit__demo-label mono">{label}</span>
      {children}
    </div>
  )
}

function EditFieldSpecimen() {
  const [v, setV] = useState('')
  const [w, setW] = useState('1 507,65')
  return (
    <>
      <Demo label="icône ✓ · Enter valide · effacer">
        <EditField value={v} onChange={setV} onSubmit={setV} placeholder="Écrire…" ariaLabel="Exemple" />
      </Demo>
      <Demo label="bouton étiqueté (passe sous le champ en espace étroit)">
        <EditField value={w} onChange={setW} onSubmit={setW} submitLabel="Ajouter" ariaLabel="Montant" />
      </Demo>
    </>
  )
}

function SubTabsSpecimen() {
  const [k, setK] = useState<'self' | 'spouse'>('self')
  return (
    <SubTabs
      ariaLabel="Exemple"
      value={k}
      onSelect={setK}
      options={[
        { key: 'self', label: 'Moi', icon: 'user-bold' },
        { key: 'spouse', label: 'Conjoint·e', icon: 'users-three-bold' },
      ]}
    />
  )
}

function ChipSpecimen() {
  const [on, setOn] = useState(true)
  return (
    <ChipGroup label="Quatre formes">
      <Chip selected={on} onClick={() => setOn((x) => !x)}>
        bascule
      </Chip>
      <Chip onClick={() => {}}>action</Chip>
      <Chip to="/dev/kit">lien</Chip>
      <Chip>étiquette</Chip>
    </ChipGroup>
  )
}

function DisclosureSpecimen() {
  return (
    <Disclosure label="Détail par année" count={3}>
      <p>Le contenu n’apparaît que sur demande.</p>
    </Disclosure>
  )
}

function ModalSpecimen() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
        Ouvrir le dialogue
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Un dialogue">
        <p>Échap, le fond ou ✕ le ferment ; le focus revient au bouton.</p>
      </Modal>
    </>
  )
}

function ConfirmSpecimen() {
  const confirm = useConfirm()
  const notice = useNotice()
  return (
    <Cluster>
      <button
        type="button"
        className="btn btn--sm btn--danger"
        onClick={async () => {
          const ok = await confirm({ message: 'Effacer tout ? Le profil sera retiré de cet appareil ; sans export, rien ne le ramène.' })
          notice(ok ? 'Confirmé' : 'Annulé')
        }}
      >
        Demander confirmation
      </button>
      <button type="button" className="btn btn--sm" onClick={() => notice('Profil exporté')}>
        Afficher un avis
      </button>
    </Cluster>
  )
}

function ENTRIES(): Entry[] {
  return [
    {
      cat: 'Fondations',
      name: 'Icon',
      file: 'src/components/Icon.tsx',
      exports: ['Icon', 'InlineIcon'],
      kw: 'icône phosphor glyphe',
      render: () => (
        <Cluster>
          <Icon name="user-bold" size={28} />
          <Icon name="chart-line-up-bold" size={28} />
          <Icon name="info-bold" size={28} />
          <Icon name="download-simple-bold" size={28} />
        </Cluster>
      ),
    },
    {
      cat: 'Fondations',
      name: 'Cluster',
      file: 'src/components/Layout.tsx',
      exports: ['Cluster'],
      kw: 'rangée flex wrap boutons',
      render: () => (
        <Cluster fill>
          <button type="button" className="btn btn--sm">Un</button>
          <button type="button" className="btn btn--sm">Deux</button>
          <button type="button" className="btn btn--sm">Trois</button>
        </Cluster>
      ),
    },
    {
      cat: 'Fondations',
      name: 'Rail',
      file: 'src/components/Layout.tsx',
      exports: ['Rail'],
      kw: 'rangée défile hscroll',
      render: () => (
        <Rail>
          {Array.from({ length: 14 }, (_, i) => (
            <Chip key={i}>{`${55 + i} ans`}</Chip>
          ))}
        </Rail>
      ),
    },
    { cat: 'Saisie', name: 'EditField', file: 'src/components/EditField.tsx', kw: 'champ texte saisie input', render: () => <EditFieldSpecimen /> },
    { cat: 'Saisie', name: 'Chip', file: 'src/components/Chip.tsx', exports: ['Chip', 'ChipGroup'], kw: 'pastille filtre bascule', render: () => <ChipSpecimen /> },
    { cat: 'Saisie', name: 'SubTabs', file: 'src/components/SubTabs.tsx', kw: 'onglets segmenté', render: () => <SubTabsSpecimen /> },
    {
      cat: 'Affichage',
      name: 'SectionHeader',
      file: 'src/components/SectionHeader.tsx',
      kw: 'titre section en-tête',
      render: () => <SectionHeader title="Régime de rentes du Québec" subtitle="Retraite Québec" icon="info-bold" />,
    },
    { cat: 'Affichage', name: 'EmptyState', file: 'src/components/EmptyState.tsx', kw: 'vide rien', render: () => <EmptyState tone="calm">Rien à montrer pour l’instant.</EmptyState> },
    { cat: 'Affichage', name: 'Disclosure', file: 'src/components/Disclosure.tsx', kw: 'pli replier détail', render: () => <DisclosureSpecimen /> },
    {
      cat: 'Feedback',
      name: 'StatusMessage',
      file: 'src/components/StatusMessage.tsx',
      kw: 'message statut erreur',
      render: () => (
        <>
          <StatusMessage tone="info">Information</StatusMessage>
          <StatusMessage tone="success">Enregistré</StatusMessage>
          <StatusMessage tone="error">Montant invalide</StatusMessage>
        </>
      ),
    },
    {
      cat: 'Feedback',
      name: 'Skeleton',
      file: 'src/components/Skeleton.tsx',
      kw: 'chargement forme réserve',
      render: () => (
        <>
          <Skeleton count={2} />
          <Loading />
        </>
      ),
    },
    { cat: 'Feedback', name: 'Modal', file: 'src/components/Modal.tsx', kw: 'dialogue fenêtre', render: () => <ModalSpecimen /> },
    { cat: 'Feedback', name: 'useConfirm', file: 'src/lib/confirm.tsx', exports: ['ConfirmProvider', 'useConfirm'], kw: 'confirmer destructif toast avis', render: () => <ConfirmSpecimen /> },
  ]
}

export function DevKit() {
  const t = useT()
  const { lang, setLang } = useLang()
  const [theme, setThemeState] = useState(getTheme)
  const [contrast, setContrastState] = useState(getContrast)
  const [scale, setScale] = useState<TextScale>(getTextScale)
  const [q, setQ] = useState('')

  const entries = useMemo(ENTRIES, [])
  const needle = q.trim().toLowerCase()
  const shown = entries.filter((e) => !needle || (e.name + ' ' + e.kw + ' ' + e.cat).toLowerCase().includes(needle))
  const cats = [...new Set(shown.map((e) => e.cat))]

  return (
    <div className="devkit">
      <header className="devkit__head">
        <Link to="/" className="devkit__back">
          ← {t.appName}
        </Link>
        <h1>Galerie des composants</h1>
        <Cluster>
          <Chip selected={theme === 'night'} onClick={() => { const n = theme === 'night' ? 'day' : 'night'; setTheme(n); setThemeState(n) }}>
            nuit
          </Chip>
          <Chip selected={contrast === 'high'} onClick={() => { const n = contrast === 'high' ? 'normal' : 'high'; setContrast(n); setContrastState(n) }}>
            contraste élevé
          </Chip>
          <Chip selected={lang === 'en'} onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}>
            English
          </Chip>
          {TEXT_SCALES.map((s) => (
            <Chip key={s} selected={scale === s} onClick={() => { setTextScale(s); setScale(s) }}>
              {s === 'normal' ? 'texte 100 %' : s === 'large' ? 'texte 115 %' : 'texte 130 %'}
            </Chip>
          ))}
        </Cluster>
        <EditField value={q} onChange={setQ} placeholder="Chercher un composant…" ariaLabel="Chercher" submitIcon={null} />
      </header>
      {cats.map((cat) => (
        <section key={cat} className="devkit__cat">
          <h2>{cat}</h2>
          {shown
            .filter((e) => e.cat === cat)
            .map((e) => (
              <article key={e.name} className="devkit__entry surface" id={`kit-${e.name}`}>
                <header className="devkit__entry-head">
                  <h3>{e.name}</h3>
                  <code className="mono">{e.file.replace('src/', '')}</code>
                </header>
                {e.render()}
              </article>
            ))}
        </section>
      ))}
    </div>
  )
}
