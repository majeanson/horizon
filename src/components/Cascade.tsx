import { Fragment } from 'react'

// A figure ARRIVES: the digits of the numbers in a short text rise into place one after another (styles/motion.css `.cascade__d`). The text is untouched — every digit
// is still there, in order, at once, for a reader, a screen reader and a spec — so the picture is a transform and nothing else; a ticking counter would show wrong
// figures for half a second, and on a retirement age that is a lie told on the way to the truth.
//
// It plays on arrival and again whenever the text it is given changes (the root is keyed on the text); a re-render with the same text does not replay it. A number never breaks across lines
// (its digits are inline blocks, so the group is `nowrap`).
//
//   <p className="answer__big"><Cascade>{q.amount(formatMoney(extra, lang))}</Cascade></p>

// A number as a person writes it: digits with the grouping and decimal marks between them (« 1 507,65 », « 62 », « 5.25 »).
const NUMBER = /(\d(?:[\d\s  .,]*\d)?)/

export function Cascade({ children }: { children: string }) {
  let index = 0
  return (
    <Fragment key={children}>
      {children.split(NUMBER).map((part, i) =>
        i % 2 === 0 ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <span key={i} className="cascade__n">
            {[...part].map((ch, j) =>
              /\d/.test(ch) ? (
                <span key={j} className="cascade__d" style={{ ['--i' as string]: index++ }}>
                  {ch}
                </span>
              ) : (
                ch
              ),
            )}
          </span>
        ),
      )}
    </Fragment>
  )
}
