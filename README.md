# Horizon — quand la retraite ?

A web app that answers one question for a **Québec** household: *at what age can you retire, and
what does it look like at 60 versus 65?*

You enter, by hand, the numbers the government already holds about you — the Retraite Québec
*relevé de participation*, your CRA / Revenu Québec notices of assessment, an employer pension
statement — set your assumptions, and Horizon projects every year of retirement: RRQ, Old Age
Security and the GIS, defined-benefit pensions, RRSP/RRIF, TFSA, taxes in both jurisdictions,
and pension income splitting between spouses.

- **Every government figure is cited.** Each parameter carries the official page it came from and
  the date it was read (`SOURCES.md`, generated). Worked examples from those pages are tests.
- **Your data never leaves your device.** There is no account and no server-side data; the
  profile lives in your browser, with JSON export and import. The app works offline.
- **French first**, English second.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # the engine, the guards, the helpers
npm run build        # typecheck + production build
```

Deploys as a single Cloudflare Worker that serves static files (`npm run deploy`).

## Where things are

Start with [`STATE.md`](./STATE.md) — what is built, what is next. [`CLAUDE.md`](./CLAUDE.md) is
how code is written here, [`ENGINE.md`](./ENGINE.md) the calculation contract, and
[`COMPONENTS.md`](./COMPONENTS.md) the shared UI (live at `/dev/kit`).

Scaffolded from Babillard, a household command-centre, whose tooling and generic primitives came
over.

*Horizon is an estimate, not financial advice.* It is only as good as the figures you enter and
the assumptions you choose; check anything that matters against your own statements.
