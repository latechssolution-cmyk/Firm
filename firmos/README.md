# FirmOS — Legal Practice Management for Pakistani Law Firms

End-to-end implementation of the [PRD](../PRD.md) (LaTech Solutions). Next.js 14 + TypeScript + Tailwind, designed for the **Vercel + Supabase** stack; runs immediately with a zero-config local demo tenant.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in from the login screen as any role — Partner/Admin, Associate, Munshi/Clerk, or Client (portal). The AI receptionist is public at `/reception`.

## What's inside

| Area | Where |
|---|---|
| Dashboard (86 active / 7 tomorrow / Rs 940K / 0 missed) | `/dashboard` |
| Cases, case detail, hearing entry (one entry → diary + portal + notification + audit) | `/cases` |
| Court diary (30-day cause lists grouped by date) | `/diary` |
| Clients | `/clients` |
| Document automation (Vakalatnama, s.497 & s.498 bail, legal notice, plaint) | `/documents` |
| Fees & billing (ledger, record payment, queue reminder) | `/fees` |
| AI receptionist (urgency detection, callback booking, inquiry records) | `/reception`, `/inquiries` |
| Audit log (every login/view/edit) | `/audit` |
| Settings (branding, integration status, notification queue, demo reset) | `/settings` |
| Client portal (own cases only, RBAC-enforced) | `/portal` |

## Design system (PRD §9.7)

- All colors are semantic tokens in `src/styles/tokens.css` — the **only** file allowed to contain color literals.
- `npm run check:contrast` — computes WCAG ratios for every token pairing actually used; build fails under AA. Two spec bugs were caught and corrected by this gate (see comments in tokens.css).
- `npm run check:hex` — fails on any raw hex/rgb outside the token file.
- Both run automatically in `npm run build`.
- Light/dark via `data-theme` on `<html>`, no-flash inline init script, localStorage persistence, live `prefers-color-scheme` fallback.

## Data layer

- **Demo mode (default):** deterministic seeded JSON store in `.data/` — the PRD §13.4 demo tenant. Reset from Settings.
- **Production:** apply `supabase/migrations/0001_init.sql` (full multi-tenant schema with row-level security policies) to a Supabase project and set env vars from `.env.example`. Notification/payment/LLM channels activate when their keys are configured; until then queued items are honestly labeled, never faked as sent.

## Tests

```bash
npm test                # seed invariants: 86/7/940K numbers, case-number formats, matter threads, determinism
npm run test:e2e        # live API tests against a running server (defaults to http://localhost:3000; override with BASE=…):
                        #   RBAC 401s, anonymous redirects, receptionist urgent-intake golden path, no-flash script
npm run test:all        # contrast gate + hex gate + unit + e2e
```

## Deploy

Vercel (app) + Supabase (Postgres/Auth/Storage/Queues). See PRD §4.3 for the platform constraint and the optional Oracle-free-tier worker variant.
