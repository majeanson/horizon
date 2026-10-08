import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PersonId } from '../engine/types'
import { useLang, useT } from '../i18n'
import { formatMoney } from '../lib/money'
import { ONBOARD_COPY } from '../lib/onboardCopy'
import { addHome, addSpouse, hasSpouse, mapPerson, removeHome, removeSpouse, setSpending, updateHome } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'
import { today } from '../lib/today'
import { Chip } from './Chip'
import { Cluster } from './Layout'
import { FieldRow } from './FieldRow'
import { NumberField } from './NumberField'
import { StatusMessage } from './StatusMessage'

// THE FIRST VISIT: one question per screen. A blank form is a wall; this asks for what a first answer needs, in the order a person
// thinks of it — who, born when, earns what, saves what, wants to stop when, spends what, owns what — each with the one line of why it
// is asked. Every answer is written straight to the same stored profile the full form edits (nothing here is a copy), so a person
// can leave at any point and find what they typed. The last screen says what is still missing, or hands over to the result; and
// says plainly that these figures are estimates until confirmed — the profile's own guide takes it from there, document by document.

type StepId = 'who' | 'birth' | 'income' | 'savings' | 'spouseBirth' | 'spouseIncome' | 'spouseSavings' | 'retire' | 'spending' | 'home' | 'done'

const stepsOf = (couple: boolean): StepId[] => ['who', 'birth', 'income', 'savings', ...(couple ? (['spouseBirth', 'spouseIncome', 'spouseSavings'] as const) : []), 'retire', 'spending', 'home', 'done']

export default function Onboarding({ onSkip }: { onSkip: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const c = ONBOARD_COPY[lang]
  const navigate = useNavigate()
  const profile = useProfile()
  const couple = hasSpouse(profile)
  const steps = stepsOf(couple)
  const [at, setAt] = useState(0)
  const step = steps[Math.min(at, steps.length - 1)]
  const last = steps.length - 1
  const money = (n: number) => formatMoney(n, lang)
  const self = profile.household.persons[0]
  const spouse = profile.household.persons[1]
  const edit = (id: PersonId, change: Parameters<typeof mapPerson>[2]) => updateProfile((p) => mapPerson(p, id, change))

  // The three account totals of one person: one box each (the form splits room, cost base and contributions).
  const savingsFields = (id: PersonId): ReactNode =>
    (['rrsp', 'tfsa', 'nonReg'] as const).map((kind) => {
      const person = profile.household.persons.find((x) => x.id === id)!
      return (
        <FieldRow key={kind} label={`${t.profile.accounts[kind]} · ${c.savings.total}`} infoId={kind === 'rrsp' ? 'rrspBalance' : kind === 'tfsa' ? 'tfsaBalance' : 'nonRegBalance'}>
          {(w) => <NumberField kind="money" max={1e9} value={person.accounts[kind].balance} onChange={(balance) => edit(id, (x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], balance } } }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
      )
    })
  const birthFields = (id: PersonId): ReactNode => {
    const person = profile.household.persons.find((x) => x.id === id)!
    return (
      <>
        <FieldRow label={c.birth.year}>
          {(w) => <NumberField kind="year" min={1900} max={2100} value={person.birth.year} onChange={(year) => edit(id, (x) => ({ ...x, birth: { ...x.birth, year } }))} id={w.id} />}
        </FieldRow>
        <FieldRow label={c.birth.month}>
          {(w) => <NumberField kind="int" min={1} max={12} value={person.birth.month} onChange={(month) => edit(id, (x) => ({ ...x, birth: { ...x.birth, month } }))} id={w.id} />}
        </FieldRow>
      </>
    )
  }
  const incomeField = (id: PersonId, label: string): ReactNode => {
    const person = profile.household.persons.find((x) => x.id === id)!
    return (
      <FieldRow label={label} infoId="salary">
        {(w) => <NumberField kind="money" max={1e8} value={person.salaryToday} onChange={(salaryToday) => edit(id, (x) => ({ ...x, salaryToday }))} id={w.id} />}
      </FieldRow>
    )
  }

  const grossIncome = profile.household.persons.reduce((s, p) => s + p.salaryToday, 0)
  const [estimate, setEstimate] = useState<number | null>(null)
  const home = profile.household.home ?? null
  const gaps = profileGaps(profile)

  let body: ReactNode = null
  let question = ''
  let why = ''
  switch (step) {
    case 'who':
      question = c.who.q
      why = c.who.why
      body = (
        <Cluster role="group" aria-label={c.who.q}>
          <Chip radio selected={!couple} onClick={() => updateProfile(removeSpouse)}>
            {c.who.alone}
          </Chip>
          <Chip radio selected={couple} onClick={() => updateProfile((p) => addSpouse(p, today()))}>
            {c.who.couple}
          </Chip>
        </Cluster>
      )
      break
    case 'birth':
      question = c.birth.q
      why = c.birth.why
      body = birthFields('self')
      break
    case 'spouseBirth':
      question = c.spouseBirth.q
      why = c.spouseBirth.why
      body = birthFields('spouse')
      break
    case 'income':
      question = c.income.q
      why = c.income.why
      body = incomeField('self', c.income.label)
      break
    case 'spouseIncome':
      question = c.spouseIncome.q
      why = c.spouseIncome.why
      body = incomeField('spouse', c.income.label)
      break
    case 'savings':
      question = c.savings.q
      why = c.savings.why
      body = savingsFields('self')
      break
    case 'spouseSavings':
      question = c.spouseSavings.q
      why = c.spouseSavings.why
      body = savingsFields('spouse')
      break
    case 'retire':
      question = c.retire.q
      why = c.retire.why
      body = (
        <>
          {[self, ...(spouse ? [spouse] : [])].map((p, i) => (
            <FieldRow key={p.id} label={i === 0 ? c.retire.you : c.retire.spouse}>
              {(w) => <NumberField kind="int" min={18} max={80} unit={t.fields.years} value={p.retirementAge} onChange={(retirementAge) => edit(p.id, (x) => ({ ...x, retirementAge }))} id={w.id} />}
            </FieldRow>
          ))}
        </>
      )
      break
    case 'spending':
      question = c.spending.q
      why = c.spending.why
      body = (
        <>
          <FieldRow label={c.spending.label} infoId="spendingRetired">
            {(w) => (
              <NumberField
                kind="money"
                max={1e8}
                value={profile.household.spending.retiredToday}
                onChange={(v) => {
                  setEstimate(null)
                  updateProfile((p) => setSpending(p, { workingToday: v, retiredToday: v }))
                }}
                id={w.id}
              />
            )}
          </FieldRow>
          {grossIncome > 0 && (
            <>
              <Chip
                onClick={() => {
                  const v = Math.round((grossIncome * 0.6) / 1000) * 1000
                  setEstimate(v)
                  updateProfile((p) => setSpending(p, { workingToday: v, retiredToday: v }))
                }}
              >
                {c.spending.estimate}
              </Chip>
              {estimate !== null && <p className="field-row__hint">{c.spending.estimated(money(estimate))}</p>}
            </>
          )}
        </>
      )
      break
    case 'home':
      question = c.home.q
      why = c.home.why
      body = (
        <>
          <Cluster role="group" aria-label={c.home.q}>
            <Chip radio selected={home === null} onClick={() => updateProfile(removeHome)}>
              {c.home.no}
            </Chip>
            <Chip radio selected={home !== null} onClick={() => updateProfile(addHome)}>
              {c.home.yes}
            </Chip>
          </Cluster>
          {home !== null && (
            <>
              <FieldRow label={c.home.value}>
                {(w) => <NumberField kind="money" max={1e8} value={home.value} onChange={(value) => updateProfile((p) => updateHome(p, (x) => ({ ...x, value })))} id={w.id} />}
              </FieldRow>
              <FieldRow label={c.home.balance}>
                {(w) => <NumberField kind="money" max={1e8} value={home.mortgage.balance} onChange={(balance) => updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, balance } })))} id={w.id} />}
              </FieldRow>
              {home.mortgage.balance > 0 && (
                <FieldRow label={c.home.payment}>
                  {(w) => <NumberField kind="money" max={1e6} value={home.mortgage.monthlyPayment} onChange={(monthlyPayment) => updateProfile((p) => updateHome(p, (x) => ({ ...x, mortgage: { ...x.mortgage, monthlyPayment } })))} id={w.id} />}
                </FieldRow>
              )}
            </>
          )}
        </>
      )
      break
    case 'done': {
      question = c.done.q
      why = c.done.why
      const savings = profile.household.persons.reduce((s, p) => s + p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance, 0)
      const s = c.done.summary
      body = (
        <>
          <ul className="onboard__summary">
            <li>{s.birth(self.birth.year)}</li>
            {couple && <li>{s.spouse}</li>}
            <li>{s.income(money(grossIncome))}</li>
            <li>{s.savings(money(savings))}</li>
            <li>{s.retire(self.retirementAge)}</li>
            <li>{s.spending(money(profile.household.spending.retiredToday))}</li>
            {home && <li>{s.home(money(home.value))}</li>}
          </ul>
          {gaps.length > 0 && (
            <StatusMessage tone="info">
              {c.done.missing} {gaps.map((g) => t.results.gaps[g]).join(' ')}
            </StatusMessage>
          )}
        </>
      )
      break
    }
  }

  return (
    <section className="onboard surface" aria-labelledby="onboard-q">
      <p className="onboard__lead">{c.subtitle}</p>
      {step !== 'done' && (
        <div className="onboard__progress">
          <div className="meter" role="progressbar" aria-valuemin={1} aria-valuemax={last} aria-valuenow={at + 1} aria-label={c.progress(at + 1, last)}>
            <span className="meter__fill" style={{ width: `${Math.round((100 * (at + 1)) / last)}%` }} />
          </div>
          <p className="onboard__step mono">{c.progress(at + 1, last)}</p>
        </div>
      )}
      <h2 id="onboard-q" className="onboard__question">
        {question}
      </h2>
      <p className="onboard__why">{why}</p>
      <div className="onboard__body">{body}</div>
      <div className="onboard__nav">
        {at > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => setAt(at - 1)}>
            {c.back}
          </button>
        )}
        {step !== 'done' ? (
          <button type="button" className="btn" onClick={() => setAt(Math.min(last, at + 1))}>
            {c.next}
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => navigate('/resultats')} disabled={gaps.length > 0}>
              {c.done.see}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              {c.done.refine}
            </button>
          </>
        )}
      </div>
      <Cluster className="onboard__aside">
        <Link className="btn btn--sm btn--ghost" to="/donnees">
          {c.example}
        </Link>
        {step !== 'done' && (
          <button type="button" className="btn btn--sm btn--ghost" onClick={onSkip}>
            {c.skip}
          </button>
        )}
      </Cluster>
    </section>
  )
}
