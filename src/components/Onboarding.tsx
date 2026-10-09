import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { rregopPension } from '../engine/presets'
import type { PersonId } from '../engine/types'
import { useLang, useT } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { formatMoney } from '../lib/money'
import { DOCUMENTS_COPY } from '../lib/documentsCopy'
import { ONBOARD_COPY } from '../lib/onboardCopy'
import { addHome, addPension, addSpouse, hasSpouse, isRregopRules, mapPerson, removeHome, removePension, setBirthYear, removeSpouse, setSpending, updateHome, updatePension } from '../lib/profileEdit'
import { profileGaps, type ProfileGap } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'
import { today } from '../lib/today'
import { Chip } from './Chip'
import { Cluster } from './Layout'
import { FieldRow } from './FieldRow'
import { NumberField } from './NumberField'

// THE FIRST VISIT: one question per screen. A blank form is a wall; this asks for what a first answer needs, in the order a person
// thinks of it — who, born when, earns what, saves what, has a pension where, wants to stop when, spends what, owns what — each with
// the one line of why it is asked. Every answer is written straight to the same stored profile the full form edits (nothing here is a
// copy), so a person can leave at any point and find what they typed. The last screen says what is still missing — and takes the
// reader back to that question — or hands over to the answer; and says plainly that these figures are estimates until confirmed.
//
// What a screen asks is a QUESTION, so: the box it reveals takes focus (the « Suivant » tap asked for it), Enter in the last box
// moves on, and a year of birth is typed, never pre-filled — a summary that stated « Né en 1981 » about a default was a lie.

type StepId = 'who' | 'birth' | 'income' | 'savings' | 'pension' | 'spouseBirth' | 'spouseIncome' | 'spouseSavings' | 'spousePension' | 'retire' | 'spending' | 'home' | 'done'

const stepsOf = (couple: boolean): StepId[] => [
  'who',
  'birth',
  'income',
  'savings',
  'pension',
  ...(couple ? (['spouseBirth', 'spouseIncome', 'spouseSavings', 'spousePension'] as const) : []),
  'retire',
  'spending',
  'home',
  'done',
]

/** The question a gap a result needs is answered on. */
const STEP_OF_GAP: Record<ProfileGap, StepId> = { income: 'income', spending: 'spending' }

export default function Onboarding({ onSkip }: { onSkip: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const c = ONBOARD_COPY[lang]
  const navigate = useNavigate()
  const confirm = useConfirm()
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
  const personOf = (id: PersonId) => profile.household.persons.find((x) => x.id === id)!
  // Which years of birth were TYPED: the stored profile always holds one (a default), and a default is not an answer.
  const [birthTyped, setBirthTyped] = useState<Partial<Record<PersonId, true>>>({})
  // A box that appears on the tap that asked for it takes focus — never on the landing screen, which has none.
  const focus = at > 0
  const goTo = (i: number) => setAt(Math.max(0, Math.min(last, i)))
  const next = () => goTo(at + 1)
  // Enter in a box commits it (the box's own handler), then moves on — unless the box refused what was typed.
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return
    if (e.currentTarget.querySelector('[role="alert"]')) return
    if (step !== 'done' && canLeave) next()
  }

  // The three account totals of one person: one box each (the form splits room, cost base and contributions).
  const savingsFields = (id: PersonId): ReactNode =>
    (['rrsp', 'tfsa', 'nonReg'] as const).map((kind, i) => {
      const person = personOf(id)
      return (
        <FieldRow key={kind} label={c.savings[kind]} infoId={kind === 'rrsp' ? 'rrspBalance' : kind === 'tfsa' ? 'tfsaBalance' : 'nonRegBalance'}>
          {(w) => <NumberField kind="money" max={1e9} value={person.accounts[kind].balance} onChange={(balance) => edit(id, (x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], balance } } }))} id={w.id} ariaDescribedBy={w.describedBy} autoFocus={focus && i === 0} />}
        </FieldRow>
      )
    })
  const birthField = (id: PersonId): ReactNode => {
    const person = personOf(id)
    return (
      <FieldRow label={c.birth.year}>
        {(w) => (
          <NumberField
            kind="year"
            allowEmpty
            min={1900}
            max={2100}
            placeholder={c.birth.placeholder}
            value={birthTyped[id] ? person.birth.year : null}
            onChange={(year) => {
              if (year === null) return
              setBirthTyped((b) => ({ ...b, [id]: true }))
              edit(id, (x) => setBirthYear(x, year))
            }}
            id={w.id}
            autoFocus={focus}
          />
        )}
      </FieldRow>
    )
  }
  const incomeField = (id: PersonId, label: string): ReactNode => {
    const person = personOf(id)
    return (
      <FieldRow label={label} infoId="salary">
        {(w) => <NumberField kind="money" max={1e8} value={person.salaryToday} onChange={(salaryToday) => edit(id, (x) => ({ ...x, salaryToday }))} id={w.id} autoFocus={focus} />}
      </FieldRow>
    )
  }
  // An employer plan: none, the RREGOP (cited rules, one figure to type), or another one — added later on the form, with its
  // booklet's rules. A blank plan is never added here: it would count as income while paying nothing.
  const [otherPlan, setOtherPlan] = useState<Partial<Record<PersonId, true>>>({})
  const pensionFields = (id: PersonId): ReactNode => {
    const person = personOf(id)
    const rregop = person.pensions.findIndex((p) => isRregopRules(p) && !p.inPay)
    const choice = rregop >= 0 ? 'rregop' : otherPlan[id] ? 'other' : 'none'
    const pick = (next: 'none' | 'rregop' | 'other') => {
      setOtherPlan((o) => ({ ...o, [id]: next === 'other' ? true : undefined }))
      if (next === 'rregop' && rregop < 0) edit(id, (x) => addPension(x, rregopPension({ serviceYearsToDate: 0, startAge: Math.max(55, Math.min(x.retirementAge, 65)) })))
      if (next !== 'rregop' && rregop >= 0) edit(id, (x) => removePension(x, rregop))
    }
    return (
      <>
        <Cluster role="group" aria-label={id === 'self' ? c.pension.q : c.pension.spouseQ}>
          <Chip radio selected={choice === 'none'} onClick={() => pick('none')}>
            {c.pension.none}
          </Chip>
          <Chip radio selected={choice === 'rregop'} onClick={() => pick('rregop')}>
            {c.pension.rregop}
          </Chip>
          <Chip radio selected={choice === 'other'} onClick={() => pick('other')}>
            {c.pension.other}
          </Chip>
        </Cluster>
        {choice === 'rregop' && (
          <FieldRow label={c.pension.service} infoId="dbService">
            {(w) => <NumberField kind="decimal" min={0} max={60} unit={t.fields.years} value={person.pensions[rregop].serviceYearsToDate} onChange={(serviceYearsToDate) => edit(id, (x) => updatePension(x, rregop, (p) => ({ ...p, serviceYearsToDate })))} id={w.id} />}
          </FieldRow>
        )}
        {choice === 'other' && <p className="field-row__hint">{c.pension.otherNote}</p>}
      </>
    )
  }

  const grossIncome = profile.household.persons.reduce((s, p) => s + p.salaryToday, 0)
  const [estimate, setEstimate] = useState<number | null>(null)
  const home = profile.household.home ?? null
  const gaps = profileGaps(profile)
  // A year of birth is the one answer a screen cannot be left without: everything downstream is an age.
  const canLeave = step === 'birth' ? !!birthTyped.self : step === 'spouseBirth' ? !!birthTyped.spouse : true

  let body: ReactNode = null
  let question = ''
  let why = ''
  switch (step) {
    case 'who':
      question = c.who.q
      why = c.who.why
      body = (
        <Cluster role="group" aria-label={c.who.q}>
          <Chip
            radio
            selected={!couple}
            onClick={async () => {
              if (!couple) return
              // Taking the partner away erases what was typed for them: said first, like the form's own « Retirer ».
              const typed = spouse !== undefined && (spouse.salaryToday > 0 || spouse.accounts.rrsp.balance + spouse.accounts.tfsa.balance + spouse.accounts.nonReg.balance > 0 || birthTyped.spouse)
              if (typed && !(await confirm({ message: c.who.dropSpouse, confirmLabel: c.who.dropSpouseLabel }))) return
              setBirthTyped((b) => ({ ...b, spouse: undefined }))
              updateProfile(removeSpouse)
            }}
          >
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
      body = birthField('self')
      break
    case 'spouseBirth':
      question = c.spouseBirth.q
      why = c.spouseBirth.why
      body = birthField('spouse')
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
    case 'pension':
      question = c.pension.q
      why = c.pension.why
      body = pensionFields('self')
      break
    case 'spousePension':
      question = c.pension.spouseQ
      why = c.pension.why
      body = pensionFields('spouse')
      break
    case 'retire':
      question = c.retire.q
      why = c.retire.why
      body = (
        <>
          {[self, ...(spouse ? [spouse] : [])].map((p, i) => (
            <FieldRow key={p.id} label={i === 0 ? c.retire.you : c.retire.spouse}>
              {(w) => <NumberField kind="int" min={18} max={80} unit={t.fields.years} value={p.retirementAge} onChange={(retirementAge) => edit(p.id, (x) => ({ ...x, retirementAge }))} id={w.id} autoFocus={focus && i === 0} />}
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
                autoFocus={focus}
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
      question = gaps.length > 0 ? c.done.qMissing : c.done.q
      why = c.done.why
      const savings = profile.household.persons.reduce((s, p) => s + p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance, 0)
      const plans = profile.household.persons.flatMap((p) => p.pensions.map((d) => d.label || t.plans.unnamed))
      const s = c.done.summary
      body = (
        <>
          <ul className="onboard__summary">
            {birthTyped.self && <li>{s.birth(self.birth.year)}</li>}
            {couple && <li>{s.spouse}</li>}
            <li>{s.income(money(grossIncome))}</li>
            <li>{s.savings(money(savings))}</li>
            {plans.length > 0 && <li>{s.pension(plans.join(', '))}</li>}
            <li>{s.retire(self.retirementAge)}</li>
            <li>{s.spending(money(profile.household.spending.retiredToday))}</li>
            {home && <li>{s.home(money(home.value))}</li>}
          </ul>
          {gaps.length > 0 && (
            <div className="onboard__missing">
              <p className="field-row__label">{c.done.missing}</p>
              <ul className="onboard__gaps">
                {gaps.map((g) => (
                  <li key={g}>
                    {t.results.gaps[g]}{' '}
                    <Chip icon="arrow-left-bold" onClick={() => goTo(steps.indexOf(STEP_OF_GAP[g]))}>
                      {c.done.fix}
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )
      break
    }
  }

  return (
    <section className="onboard surface" aria-labelledby="onboard-q">
      <p className="onboard__lead">
        <strong>{c.promise(last)}</strong> {c.privacy}
      </p>
      {step !== 'done' && (
        <div className="onboard__progress">
          <div className="meter" role="progressbar" aria-valuemin={1} aria-valuemax={last} aria-valuenow={at + 1} aria-label={c.progress(at + 1, last)}>
            <span className="meter__fill" style={{ width: `${Math.round((100 * (at + 1)) / last)}%` }} />
          </div>
          <p className="onboard__step">{c.progress(at + 1, last)}</p>
        </div>
      )}
      <h2 id="onboard-q" className="onboard__question">
        {question}
      </h2>
      <p className="onboard__why">{why}</p>
      <div className="onboard__body" onKeyUp={onKeyUp}>
        {body}
      </div>
      <div className="onboard__nav">
        {at > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => goTo(at - 1)}>
            {c.back}
          </button>
        )}
        {step !== 'done' ? (
          <button type="button" className="btn btn--primary" onClick={next} disabled={!canLeave}>
            {c.next}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/resultats')} disabled={gaps.length > 0}>
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
        <Link className="btn btn--sm btn--ghost" to="/documents">
          {DOCUMENTS_COPY[lang].link}
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
