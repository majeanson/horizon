# retraite.marcportal.com (Horizon) — stranger review (2026-10-23)

Visited from outside: front door, Résultats, and a share link
(`/partage?age=62&foyer=couple&l=fr`). Phone (375 px) and desktop.

**Caveat:** the browser used already held a saved Horizon profile (English, an example couple
answering « age 44 »), so this is a *returning-stranger* pass. A truly first visit (empty
storage, « Commencer » dialog) was not seen and is worth its own run in a private window.

## First impression

Clear promise in one line (« finds the earliest age at which the money lasts, for a Québec
household ») and the privacy line is reassuring. Then the density hits: Résultats has ten
sections (answer, compare, where the money comes from, this year, how firm, my figures, year by
year, accuracy, parameters…) and three different age ranges on one screen.

## Friction, most important first

1. **The header chip « age 44 » reads as *my* age on phone.** On desktop it is labelled
   « Your answer age 44 »; on phone the label is dropped and the chip sits where an app shows
   the user's own profile. Keep a short label on phone (« → 44 » or « retraite 44 »).
2. **Three overlapping ranges on the answer card:** « Between age 41 and 48, depending on your
   estimated figures », then « Across the three scenarios and the market paths: from 42 to 49 »,
   plus « 8 of 16 confirmed ». A stranger can't tell which one to believe. Show one range with
   one sentence of why, and push the other into « How firm ».
3. **Timeline lines contradict each other at a glance:** « Once all your pensions have started,
   in 2065 (73 / 73)… they cover 100% » is followed by « From 2064 (72 / 72), your pensions
   alone… cover your spending ». Listed out of order and one year apart; reads like a bug even
   if both are true. Sort by year and merge into one line.
4. **Missing punctuation in the « one question » card:** « Spending while working — For the
   household Confirming it could narrow… » — needs a full stop / line break after
   « household ».
5. **The « one question » card shows a skeleton for ~3–5 s** on load (phone), while the rest of
   the page is ready. It's the first thing under the title, so the page feels slow. Consider
   rendering the card text first and filling the « about 2 years » number when it arrives.
6. **Share link language flips.** The link says `l=fr` and the server-rendered title is French
   (« Retraite possible à 62 ans »), then the app re-renders in English because *this* visitor
   chose EN. Defensible, but the sender wrote in French — consider honouring `l=` for the share
   page itself, with a « read in English » switch.
7. **Shared-scenario page doesn't say what Horizon is.** A recipient sees « Retirement works at
   62 » and « Run my own numbers », but not the one-line pitch, the 2-minute effort estimate,
   or that nothing is uploaded until they read the footer. Add the pitch line above the button.
8. **Desktop leaves most of the width empty**: content is a narrow column hugging the sidebar;
   the right half of an 800 px window is blank. Centre the column or use the space for the chart.

## True first visit (clean storage, `horizon.marc-jeanson.workers.dev`)

Second pass on the workers.dev origin, which shares the code but not the storage: empty
localStorage, browser in English. Front door → « Get started » → « Two minutes » → five
questions → answer.

1. **Tapping « Next » right after typing a savings figure is swallowed** (question 4, desktop
   width). The tap blurs the box, the box commits its number, « With no figure, we assume $0 »
   disappears and « Your answer age 64 · 1 year earlier than when you arrived » appears — the
   card reflows and « Next » jumps up ~60 px (y 711 → 651), so the tap lands where it *was*.
   The person sees nothing happen and taps again. Reserve the space (swap the two lines in the
   same slot) or commit on input rather than blur.
2. **A typed figure is lost if « Next » is reached without a blur.** Typing 45 000 in RRSP and
   activating Next programmatically (no blur) went through with « Savings: $0 » in the recap.
   A real tap blurs first, so it's mostly safe — but a keyboard « Next » on some Android IMEs
   and screen-reader activation can skip the blur. Commit on Next as well.
3. **Pre-filled « 0 » plus focus makes « 070000 ».** Question 3 opens with the income box
   focused and holding « 0 »; typing 70000 yields the text « 070000 » (it parsed fine as
   $70,000, but it looks wrong while typing). Select the 0 on focus, or leave the box empty with
   a « 0 » placeholder.
4. **Reading preferences sit above the title.** The first screen is the one-line pitch, then
   an « Easier to read? » panel (language, theme, contrast, text size), then « Get started »,
   and only then « When can you retire? ». Good to have them in view, but the H1 under the
   buttons reads upside down; lead with the H1 and fold the panel to one « Aa » row.
5. **« Between age 59 and possibly no age before 70 »** on the answer card is hard to parse.
   « Somewhere from 59 to after 70 » / « entre 59 ans et après 70 ans ».
6. **« 1 year earlier than when you arrived »** — « arrived » is odd for a 2-minute quiz.
   « 1 year earlier than before this answer ».
7. **Clipboard write during the quiz.** The browser reported that the page wrote to the OS
   clipboard during a scripted click on « Next » (question 1 → 2). Possibly a copy handler on
   something under the pointer, possibly the harness; worth a quick look for any
   `navigator.clipboard.writeText` / `copy` listener reachable from the quiz.

What's already right and was missing from the first pass: « See an example » sits next to
« Get started » with seven example households; the three time budgets (2 / 15 / 30 min) are an
excellent onboarding choice; the recap after question 5 says exactly what was assumed (« We
assumed you stop at 65 — yours to change », « No employer plan and no home are counted ») and
offers « Save a copy ». (A returning visitor never sees this front door, which is why the first pass missed it.)

## Ideas

- **« Explain like I'm new » toggle on Résultats** that collapses to: answer, one range, one
  chart, « what would change it most ». The Proof tabs stay one tap away.
- **Name the confidence in words** (« solid / likely / rough guess ») next to « 8 of 16
  confirmed » — counts mean little to a stranger.
- **Glossary hover on jargon** that a stranger trips on in the first screen: « margin a month »,
  « scenario », « market paths ».

## Worked well

- The privacy promise is everywhere and credible (« The link holds only the age and the
  household type. No income, no account, no name. »).
- « Under these assumptions — an estimate, not financial advice » is the right disclaimer,
  placed right under the answer.
- Bottom tab bar on phone is clean; no horizontal overflow.
