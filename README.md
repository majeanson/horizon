# Horizon — quand la retraite ?

A web app that answers one question for a **Québec** household: *at what age can you retire, and
what does it look like at 60 versus 65?*

**Try it:** https://horizon.marc-jeanson.workers.dev — « Données ▸ Charger l'exemple » fills in a fictional
couple so you can see a result before typing a single number of your own.

You enter, by hand, the numbers the government already holds about you — the Retraite Québec
*relevé de participation*, your CRA / Revenu Québec notices of assessment, an employer pension
statement — set your assumptions, and Horizon projects every year of retirement: RRQ, Old Age
Security and the GIS, defined-benefit pensions (RREGOP is preset), RRSP/RRIF, TFSA, non-registered
savings, taxes in both jurisdictions, and pension income splitting between spouses. It shows the
earliest age at which the money lasts, a chart of 60 versus 65 (or any ages you pick), the
year-by-year table behind it, and how fragile the answer is to worse returns, higher inflation or a
longer life.

- **Every government figure is cited.** Each parameter carries the official page it came from and
  the date it was read (`SOURCES.md`, generated; the results page lists them too). Worked examples
  from those pages are tests, and a weekly job checks that every cited page still opens.
- **Every number you type has an ⓘ** that says where to find it — the portal, the document, the
  statement's own wording — and links to the official page.
- **Your data never leaves your device.** There is no account and no server-side data; the
  profile lives in your browser, with JSON export and import. The app works offline, and the
  build forbids any network call from the app's own code.
- **French first**, English second. Mobile first, then tablet, then desktop.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # the engine, the guards, the helpers
npm run build        # typecheck + production build
npm run e2e:ci       # the browser suite, in CI's strict shape
```

Deploys as a single Cloudflare Worker that serves static files (`npm run deploy`).

## Where things are

Start with [`STATE.md`](./STATE.md) — what is built, what is next, and the questions still open.
[`CLAUDE.md`](./CLAUDE.md) is how code is written here, [`ENGINE.md`](./ENGINE.md) the calculation
contract (what is official and what is simplified), [`SOURCES.md`](./SOURCES.md) every cited figure,
and [`COMPONENTS.md`](./COMPONENTS.md) the shared UI (live at `/dev/kit`).

Scaffolded from Babillard, a household command-centre, whose tooling and generic primitives came
over.

*Horizon is an estimate, not financial advice.* It is only as good as the figures you enter and
the assumptions you choose; check anything that matters against your own statements. Where the
engine simplifies a rule, `ENGINE.md` says so.
