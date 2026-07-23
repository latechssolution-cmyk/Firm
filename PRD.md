# Product Requirements Document
## Firm Management System for Law Firms — LaTech Solutions
### Production System Specification (End-to-End)

**Status:** v3 — full working-system specification
**Owner:** LaTech Solutions
**Date:** 2026-07-23
**Supersedes:** v2 (demo-prototype scope). v3 removes all mock/simulated elements; every feature below is specified as a real, working capability.

---

## 0. Executive summary

LaTech is building a **multi-tenant SaaS practice-management platform for Pakistani law firms**, sold through the funnel in `LaTech-Proposal-LawFirms.pdf`: consultation → branded demo → 14-day pilot → rollout.

**Core principle of this spec: there is no prototype.** The system the prospect sees in the demo is the production platform with a seeded *demo tenant*; the pilot is the same platform with the firm's real data in its own tenant; rollout is the same tenant with a paid subscription. Nothing is thrown away between stages, and no feature is faked:

| Capability | v2 (prototype) | v3 (this spec) |
|---|---|---|
| SMS/WhatsApp alerts | "Simulated sent" badge | Real delivery via local SMS aggregator + WhatsApp Business Cloud API, with delivery-status tracking |
| AI Receptionist | Scripted chat widget | Real inbound channel: WhatsApp bot from day one, voice line via a managed voice-AI platform (phased, §7.4) |
| Payments | Visual "Pay online" button | Real collection via Pakistani gateways (PayFast/Kuickpay — covers cards, JazzCash, Easypaisa, bank transfer) |
| Data | 86 synthetic filler cases | Real firm data via an import/digitization pipeline (§12); synthetic data exists **only** inside the isolated demo tenant |
| Tenancy | One hardcoded branded instance | True multi-tenant with per-tenant branding, subdomains, and row-level isolation |
| Backups | A settings screen mock | Automated encrypted backups with tested restore procedure and defined RPO/RTO |

The platform's promises to the buyer remain the proposal's three numbers — **0 missed hearing dates, any file in 10 seconds, 14-day free pilot** — now backed by real infrastructure rather than staged data.

---

## 1. Context & product vision

Pakistani law chambers run on pocket diaries, almirah files, munshi memory, and WhatsApp — causing missed dates, unbilled work, client distrust, and single-person dependency. Local competitors (WakeelDesk, Solicitors.pk ADVO/LCMS, DocsMove, FQMSYS) cover case tracking and billing; LaTech differentiates on **client portal + AI receptionist + local hands-on service** (digitization, training, support).

**Vision:** the operating system of a Pakistani law practice — every case, date, document, rupee, and client interaction in one confidential system, reachable from office, court, or home.

**Business model:** subscription per firm (monthly plan) or one-time license + support contract, per the proposal's "your budget decides" flexibility. Pilot conversion is the primary growth motion; the demo tenant is the top of that funnel.

## 2. Domain model — Pakistani legal system (normative for the data model)

### 2.1 Court hierarchy

1. **Supreme Court of Pakistan** — apex (CJP + 16 judges)
2. **Federal Shariat Court** — parallel Islamic-law jurisdiction
3. **Five High Courts** — Lahore, Sindh, Peshawar, Balochistan, Islamabad — each with regional benches (e.g., LHC Rawalpindi/Multan Bench); appellate + original constitutional jurisdiction (Art. 199 writs)
4. **District judiciary** — civil side (District Judge → ADJ → Senior Civil Judge → Civil Judge I/II/III) and criminal side (Sessions Judge → ASJ → Judicial Magistrate I/II/III)
5. **Special courts/tribunals** — Family Courts (Family Courts Act 1964), Banking, Anti-Terrorism, Accountability, Consumer, Rent, Labour, Tax/Customs/Service tribunals

**Normative rule:** `Court` is a structured entity — `type + tier + city/district + bench + court number` — with a **system-maintained master directory** of Pakistani courts shipped with the product and extendable per tenant. Cause lists group by this structure.

### 2.2 Case types & stage lifecycles (typed enums)

| Case type | Governing law | Stage lifecycle |
|---|---|---|
| Civil suit | CPC 1908 | Plaint → Summons → Written Statement → Issues → Plaintiff evidence → Defendant evidence → Arguments → Judgment/Decree → Execution |
| Criminal | CrPC 1898, PPC 1860, Qanun-e-Shahadat 1984 | FIR/Complaint → Bail (pre-arrest s.498 / post-arrest s.497 — distinct) → Challan/Charge → Prosecution evidence → s.342 statement → Defense evidence → Arguments → Judgment |
| Family | Family Courts Act 1964 | Plaint → Reply → **Pre-trial reconciliation (mandatory)** → Evidence → **Post-trial reconciliation** → Decree (khula, maintenance, custody, dower) |
| Writ/constitutional | Art. 199 | Institution → Notice → Comments/Report → Arguments → Order |
| Appeal/Revision | CPC/CrPC | Institution → Notice → Record requisition → Arguments → Order; linked to lower-court case |

Stage enums are **scoped per case type** and versioned in configuration (not hardcoded) so new tribunals/case types can be added without releases.

### 2.3 Case number formats

Authentic patterns, validated per court type at entry: `W.P. No. 4412/2026`, `Crl. Misc. No. 18600-B/2026`, `C.S. No. 337/2026`, `R.F.A. No. 51/2026`, `Family Suit No. 88/2026`, `Crl. Appeal No. …`. Appeals/revisions receive new numbers → cases link into **matter threads** (trial → appeal → revision as one chain).

### 2.4 Document template library (shipped)

Vakalatnama · Bail application pre-arrest (s.498 CrPC) · Bail application post-arrest (s.497 CrPC) · Plaint (CPC O.VII) · Written statement (O.VIII) · Legal notice · Affidavit · Agreement/GPA. Templates are per-tenant customizable (firms upload their own house styles); system templates are starting points.

### 2.5 Compliance posture

- No comprehensive data-protection statute is in force in Pakistan (PDP Bill 2023/2025 draft cabinet-approved, unpassed; PECA 2016 as amended 2025 is criminal law).
- **Design target: PDP-Bill-ready** — consent records, breach-notification runbook (72h), data-subject access/erasure workflows — because the bill will likely pass within the product's life, and because advocate–client confidentiality under Pakistan Bar Council rules applies **today**.
- Confidentiality features (RBAC, audit log, encryption, backups) are product differentiators per the proposal's explicit promises.

## 3. Users, roles & permissions

### 3.1 Roles (per tenant)

| Role | Scope |
|---|---|
| **Owner/Partner (Admin)** | All cases, billing, staff & role management, tenant settings, audit log, subscription |
| **Associate** | Assigned cases: read/write, drafting; no firm-wide fee visibility unless granted |
| **Clerk/Munshi** | Diary + data entry + document filing on permitted cases; fee entry only if granted |
| **Client** | Portal: own case(s) only, read-only + payments + messages |
| **LaTech Platform Admin** (cross-tenant) | Tenant provisioning, support access (time-boxed, consent-logged), platform ops. Cannot read case content without an explicit, audited support-access grant |

Permissions are capability-based under the role defaults (e.g., grant one munshi fee-entry rights) — enforced **server-side on every request** via row-level security + policy checks, never UI-only.

### 3.2 Primary user stories (acceptance criteria in §5 requirement IDs)

1. Advocate opens tomorrow's cause list at 8 PM, grouped by court with file-readiness — prepares in one pass.
2. Advocate searches any party/case/document and reaches the file in seconds, from a phone at court.
3. Munshi records hearing outcome + next date once → diary, client portal timeline, and real SMS/WhatsApp to client all update from that single entry.
4. Associate generates a s.497 bail application; FIR no., sections, parties, court auto-fill; files it to the case.
5. Client logs into the portal, sees only their case, pays an outstanding balance via JazzCash/card, and messages the firm.
6. A caller reaches the firm's AI receptionist at 11:42 PM (WhatsApp or voice line); an urgent detention matter is flagged, a callback is booked into the advocate's real calendar, and the advocate is notified on WhatsApp immediately.
7. Admin reviews the audit log: who viewed/downloaded which document, when, from where.
8. New firm onboards: LaTech imports their register/Excel via the import pipeline; scanned files are digitized, OCR'd, and attached to cases.

## 4. System architecture

### 4.1 Overview

Multi-tenant SaaS. One production deployment serves all firms; tenant isolation at the database row level; per-tenant subdomains and branding.

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients                                                        │
│  • Firm web app (responsive PWA)  app.latechs.org / {firm}.…    │
│  • Client portal (PWA)            portal.{firm-domain}          │
│  • WhatsApp (clients & AI receptionist channel)                 │
│  • Voice line (managed voice-AI platform → AI receptionist)     │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTPS / TLS 1.2+
┌──────────────▼──────────────────────────────────────────────────┐
│  API layer (REST + webhooks)                                    │
│  AuthN (JWT sessions, MFA) · AuthZ (RBAC + RLS policies)        │
├─────────────────────────────────────────────────────────────────┤
│  Application services                                           │
│  Cases · Diary · Documents · Billing · Portal · Inquiries       │
│  Notification service (SMS/WhatsApp/email/push, queued, retried)│
│  Document generation service (template → DOCX/PDF)              │
│  AI Receptionist service (conversation orchestration)           │
│  Import/digitization service (CSV/Excel mapping, OCR queue)     │
│  Audit service (append-only event log)                          │
├─────────────────────────────────────────────────────────────────┤
│  Data (Supabase)                                                │
│  PostgreSQL (RLS, per-tenant scoping) · Storage (files,         │
│  encrypted at rest) · Queues (pgmq) · pg_cron schedules         │
├─────────────────────────────────────────────────────────────────┤
│  External integrations (§7)                                     │
│  SMS aggregator · WhatsApp Business Cloud API · Payment gateway │
│  Voice-AI platform (telephony+STT+TTS) · Email (transactional)  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Tenancy & branding

- Every row carries `tenant_id`; PostgreSQL row-level security enforces isolation as defense-in-depth beneath application checks.
- Per-tenant: subdomain (`{firm}.latechs.org`) or custom domain (`app.yourfirm.pk` via CNAME + automated TLS), logo, colors, firm name (English + Urdu), notification sender identity (branded SMS mask where the aggregator supports it).
- **Demo tenant:** a normal tenant flagged `demo=true`, seeded with the sample dataset (§13.4), auto-reset nightly, real features enabled with sandbox integration credentials (payment gateway sandbox, test WhatsApp number). This replaces the v2 "prototype" — demos run on production code.

### 4.3 Technology stack (decided)

**Platform constraint (decided): the entire system runs on Vercel + Supabase only.** No separate container fleet, no self-managed servers. Anything that cannot run in this pair is either replaced with an API-based managed service called *from* it, or explicitly deferred (noted below).

> **HARD RULE — free tier only.** Every service must stay within its provider's free tier; never provision anything that incurs charges. Vercel Hobby, Supabase Free (500 MB DB / 1 GB storage), and Oracle Cloud Always-Free (≤ 2× E2.1.Micro AMD *or* ≤ 4 ARM A1.Flex OCPUs / 24 GB; ≤ 200 GB block storage; no load balancers). Before creating any cloud resource, confirm it falls in the free tier; if a task would require paid resources, stop and raise it rather than provisioning. The optional OCI worker (below) is sized to Always-Free.

| Layer | Choice | Rationale & constraints |
|---|---|---|
| Web apps + API (firm app, client portal, REST endpoints, integration webhooks) | **Next.js + TypeScript + Tailwind on Vercel** — API routes/serverless functions for all synchronous API work and webhook receivers (WhatsApp, payment gateway) | Webhook handlers ack fast and enqueue to Supabase Queues; per-tenant subdomain/custom-domain routing via middleware + Vercel wildcard domains; PWA support |
| Database, auth, storage | **Supabase** (managed PostgreSQL + RLS + Auth + Storage) | RLS is the tenant-isolation backbone (§4.2); phone-OTP auth covers CP-1; Storage signed URLs cover DA-6 |
| Background & async work | **Supabase Queues (pgmq) + Supabase Edge Functions + pg_cron / Vercel Cron** | Notification dispatch/retry (NT-3), OCR jobs, import jobs, nightly demo-tenant reset, day-before digests — all as queue consumers drained by scheduled/triggered Edge Functions. No Redis; rate-limit counters live in Postgres |
| OCR | **Cloud OCR API** (Google Vision-class, Urdu+English) called from Edge Functions | Self-hosted Tesseract doesn't fit serverless; API OCR is per-page metered — cost passed through in digitization pricing (§12) |
| Document generation | JS-native: `docx` / docx-templates for DOCX; `pdf-lib`/React-PDF for PDF export — all in serverless functions | No LibreOffice headless (needs a container). Constraint: PDF fidelity for complex layouts is lower; templates designed within JS-renderable bounds |
| LLM | **Claude API (Anthropic)** behind an internal adapter, called from serverless/Edge Functions | AI receptionist orchestration (§7.4); prompts versioned per §11 |
| Voice (Phase B) | **Managed voice-AI platform** (Vapi/Retell-class) handling telephony + STT/TTS, calling our API for logic via webhooks | Self-hosted media streaming is impossible on serverless; a managed voice-agent provider keeps Phase B inside this stack. Pakistani DID number availability through such providers is a §15 open question |

**Summary:** Vercel runs everything request-shaped; Supabase runs everything data-shaped and queue-shaped; heavy compute (OCR, voice) is bought as metered APIs rather than hosted. Function execution limits (~minutes max) are respected by designing every job as small queue-driven chunks (e.g., OCR one document page per invocation).

**Optional cost-saver variant — Oracle Cloud free-tier worker.** If an OCI Always-Free account is available (Ampere A1: up to 4 OCPUs / 24 GB RAM), one free ARM VM can run a **pull-based worker** that drains the same Supabase Queues (pgmq) the Edge Functions use — no architecture change, since jobs are already queue-shaped. Use it for the two costs the serverless-only stack externalizes:
- **Tesseract OCR (eng+urd)** instead of the metered cloud OCR API — free bulk digitization during onboarding
- **LibreOffice headless** for high-fidelity PDF export of complex templates, restoring what the JS-only PDF path gives up

Rules for this variant: the VM is a *disposable accelerator*, never a system of record — if it's down, jobs fall back to the cloud OCR API / JS PDF path automatically (queue consumers are interchangeable); primary DB, auth, and files stay on Supabase; the VM holds no state and no secrets beyond a scoped queue-consumer key; free-tier caveats (no SLA, ARM capacity availability by region, self-patching) are acceptable precisely because nothing depends on it.

### 4.4 Offline & mobile reality

- PWA with offline read cache of the user's diary + recently opened cases (advocates in court basements with no signal must still see today's list). Writes queue and sync when back online, with conflict prompts.
- All UIs responsive; client portal mobile-first.

## 5. Functional requirements

Priority: **P0** = required for pilot-ready production launch · **P1** = fast-follow (≤ 60 days post-launch) · **P2** = roadmap.

### 5.1 Case & practice management
| ID | Requirement | Pri |
|---|---|---|
| CM-1 | Dashboard: active cases, hearings today/tomorrow, fees pending, missed-dates counter, urgent inquiries | P0 |
| CM-2 | Case CRUD: structured court (from master directory §2.1), typed stage (§2.2), validated case number (§2.3), parties, FIR/sections for criminal, client link, assigned users | P0 |
| CM-3 | Case detail: single screen — hearing timeline, orders, documents, fee ledger, notes, linked matter thread | P0 |
| CM-4 | Court diary / cause list: day/week/month, grouped by court+bench, readiness status per hearing | P0 |
| CM-5 | Global search: case no., parties, client, document titles **and OCR'd document text**; as-you-type; < 2 s at 10k cases/tenant | P0 |
| CM-6 | Hearing entry: outcome + next date in one form → triggers diary update, portal timeline, client notification (real, §5.5) | P0 |
| CM-7 | Matter threads: trial → appeal → revision linked as one chain | P0 |
| CM-8 | Conflict-of-interest check on intake (search opposing parties across firm's cases) | P1 |
| CM-9 | Reports: cases by court/type/stage/advocate, hearing load, outcome stats; export CSV/PDF | P1 |
| CM-10 | Task lists per case (e.g., "file rejoinder by 30 Jul") with assignees and due dates | P1 |
| CM-11 | Court-status auto-pull from public e-court portals (SC/LHC/IHC case-status pages) by case number, where scrape/API access is feasible | P2 |

### 5.2 Client portal
| ID | Requirement | Pri |
|---|---|---|
| CP-1 | Client authentication: phone-number + OTP login (SMS/WhatsApp OTP); optional password. Server-side scoping to own cases only (RLS-enforced) | P0 |
| CP-2 | Case status: stage, next hearing (date/court/time), balance due | P0 |
| CP-3 | Timeline auto-updated from hearing entries | P0 |
| CP-4 | Document sharing: per-document visibility toggle; client downloads logged | P0 |
| CP-5 | **Real online payment** of balance due (gateway §7.3): card, JazzCash, Easypaisa, bank transfer; receipt issued; ledger auto-updated | P0 |
| CP-6 | Secure messaging thread client ↔ firm (with notification to assigned users) | P1 |
| CP-7 | Urdu/English toggle; RTL-safe | P0 |
| CP-8 | Consent capture at first login (terms + data-processing consent, timestamped — PDP-ready) | P0 |

### 5.3 Document automation & management
| ID | Requirement | Pri |
|---|---|---|
| DA-1 | Shipped template library (§2.4) + per-tenant custom templates (DOCX with merge fields, uploaded by firm or LaTech onboarding) | P0 |
| DA-2 | Generate: template + case/client/court fields → editable draft (rich text) → export DOCX/PDF for filing | P0 |
| DA-3 | Lifecycle: Draft → Review → Filed; version history retained | P0 |
| DA-4 | Upload scanned filings (PDF/JPG); **OCR pipeline** (English + Urdu) makes them full-text searchable; auto-suggest case attachment | P0 |
| DA-5 | Bulk digitization mode for onboarding: batch upload → queue → OCR → clerk review screen for case assignment | P0 |
| DA-6 | Storage quotas per plan; files encrypted at rest; signed, expiring download URLs | P0 |

### 5.4 AI Receptionist (real channels, phased)
| ID | Requirement | Pri |
|---|---|---|
| AI-1 | **WhatsApp intake bot** on the firm's business number: greets (Urdu/English), collects matter type + summary + contact, classifies urgency, books consultation into the firm's real calendar (double-booking impossible), creates Inquiry record | P0 |
| AI-2 | Existing-client recognition by phone number → can share next hearing date (only that) without staff involvement | P1 |
| AI-3 | Urgent matters: immediate WhatsApp + push notification to designated advocate(s) with summary | P0 |
| AI-4 | Web chat widget on the firm's site/portal running the same intake pipeline | P1 |
| AI-5 | **Voice line** via managed voice-AI platform (§7.4 Phase B): caller dials the firm's number → platform handles telephony/STT/TTS → our webhook drives the same intake logic → Urdu + English; call recording + transcript attached to Inquiry; graceful fallback to voicemail-with-transcript if the pipeline degrades | P1 |
| AI-6 | Guardrails: the assistant never gives legal advice, never quotes fees unless configured, never discloses case data to unverified callers; all conversations logged and reviewable; configurable handoff phrases ("a human will call you") | P0 |
| AI-7 | Inquiry pipeline view: new → contacted → consultation held → converted to client/case (one-click conversion carrying data over) | P0 |

*LLM provider: Claude (Anthropic API) for conversation orchestration and Urdu/English handling; provider-abstracted so models can be swapped. Prompt templates and refusal rules version-controlled per §11.*

### 5.5 Notifications (real delivery)
| ID | Requirement | Pri |
|---|---|---|
| NT-1 | Event-driven notifications: hearing entered/changed → client + team; day-before hearing digest (configurable time) → advocate + munshi; fee reminder schedule → client | P0 |
| NT-2 | Channels: SMS (local aggregator, branded mask), WhatsApp template messages (Business Cloud API), email, in-app/push. Per-recipient channel preference; WhatsApp-first with SMS fallback | P0 |
| NT-3 | Delivery tracking: queued → sent → delivered/failed per message; failures retried with backoff; persistent failures surfaced to munshi dashboard | P0 |
| NT-4 | All templates bilingual (Urdu/English) per recipient preference; WhatsApp templates pre-approved via Meta template review | P0 |
| NT-5 | Quiet hours + rate limiting per client to prevent spam | P1 |

### 5.6 Fees, billing & payments
| ID | Requirement | Pri |
|---|---|---|
| FB-1 | Per-case fee ledger: agreed fee, installments, received, adjustments, pending | P0 |
| FB-2 | Payment collection: gateway checkout from portal (CP-5) **and** payment-link generation sent via WhatsApp/SMS for clients who don't use the portal | P0 |
| FB-3 | Manual receipt entry for cash/bank-transfer payments (still the norm); receipt PDF issued | P0 |
| FB-4 | Automated polite reminders per configurable schedule (NT-1) | P0 |
| FB-5 | Firm-level receivables report; per-advocate collection report | P1 |
| FB-6 | Expense tracking per case (court fees, clerk expenses) | P2 |

### 5.7 Security, audit & tenant administration
| ID | Requirement | Pri |
|---|---|---|
| SEC-1 | RBAC per §3.1, server-side + PostgreSQL RLS | P0 |
| SEC-2 | Append-only audit log: logins, views, downloads, edits, permission changes, support-access grants; filterable; exportable; retained ≥ 2 years | P0 |
| SEC-3 | AuthN: email/phone + password with strength rules; **MFA (TOTP or WhatsApp/SMS OTP) mandatory for admin, optional for staff**; session expiry + device list with remote revoke | P0 |
| SEC-4 | Encryption: TLS 1.2+ in transit; AES-256 at rest (DB volumes + object storage); secrets in a managed vault, never in code | P0 |
| SEC-5 | Tenant admin screens: user management, role/capability grants, branding, notification settings, template management, data export (full tenant export to structured archive — the firm's data is theirs) | P0 |
| SEC-6 | Platform-admin support access: explicit grant by firm admin, time-boxed, fully audited | P0 |
| SEC-7 | Rate limiting, brute-force lockout, OWASP ASVS L2 as the security baseline; dependency scanning in CI | P0 |
| SEC-8 | PDP-readiness: consent records (CP-8), breach-notification runbook (72h), data-subject access/erasure procedure documented and implementable per tenant | P1 |

### 5.8 Data import & digitization (see also §12 operations)
| ID | Requirement | Pri |
|---|---|---|
| IM-1 | CSV/Excel importer with interactive column mapping (case no., parties, court, next date, fees), validation report, dry-run preview, rollback | P0 |
| IM-2 | Bulk scan ingestion (DA-5) with OCR and review queue | P0 |
| IM-3 | Onboarding checklist workflow per new tenant (LaTech-side): import → verify counts with munshi → training sessions logged → go-live sign-off | P0 |

## 6. Explicitly no longer out of scope (v2 → v3 conversions)

Every v2 exclusion is now specified as real: multi-tenancy (§4.2), SMS/WhatsApp gateway (§5.5, §7.2), payments (§5.6, §7.3), AI receptionist live channels (§5.4, §7.4), mobile via PWA + offline cache (§4.3), real backups/DR (§9.3). Remaining true exclusions: **native app-store apps** (PWA covers the need; revisit on demand) and **court e-filing integration** (no public firm-facing filing API exists in Pakistan; tracked as CM-11 status-pull only).

## 7. External integrations

### 7.1 Integration principles
Every external dependency sits behind an internal adapter interface with: sandbox mode (used by the demo tenant), health checks, retry/backoff queues, and a documented manual fallback (e.g., if SMS aggregator is down, notifications queue and munshi sees a "call client" task rather than silent loss).

### 7.2 SMS & WhatsApp
- **SMS:** Pakistani aggregator with branded-mask support (candidates: local corporate SMS providers/aggregators serving Jazz/Telenor/Zong/Ufone routes). Requirements: branded sender ID, delivery reports API, Urdu (UCS-2) support, per-message cost visibility. Contract + sender-ID registration is an **onboarding-critical path item** (lead time weeks, start immediately).
- **WhatsApp:** Meta **WhatsApp Business Cloud API**. One WABA per firm (firm's own number) for client-facing identity; template messages pre-approved (hearing update, payment link, reminder, OTP); session messages for the AI receptionist intake window. Embedded-signup flow in tenant onboarding.

### 7.3 Payments
- Gateway: **PayFast (Pakistan) or Kuickpay** — both aggregate cards + JazzCash + Easypaisa + bank channels through one integration; per-firm sub-merchant onboarding (firm's own settlement account — LaTech does not hold client money).
- Flows: hosted checkout from portal; payment links; webhook reconciliation into the fee ledger; refund handling manual via gateway dashboard (documented procedure).
- Note: firm-side merchant KYC (bank account, registration docs) is part of tenant onboarding checklist (IM-3).

### 7.4 AI Receptionist stack
- **Phase A (launch, P0):** WhatsApp + web-chat intake — WhatsApp Business API → orchestration service → Claude API with firm-specific system prompt (practice areas, calendar rules, guardrails AI-6) → calendar hold + Inquiry record.
- **Phase B (P1):** Voice — a **managed voice-AI platform** (Vapi/Retell-class) owns telephony, streaming STT, and TTS, and calls our Vercel webhook endpoints to drive the same intake orchestration (per the §4.3 Vercel+Supabase-only constraint — no self-hosted media servers). Key dependency to validate early: a Pakistani inbound number reachable through the chosen platform (their carrier partners, or call-forwarding from the firm's existing local number to the platform's number). Urdu STT/TTS quality is gated per tenant before enablement; recordings stored per SEC-4.
- Calendar: internal calendar service is the source of truth; two-way sync with Google Calendar (P1) for advocates who live in it.

### 7.5 Email
Transactional email provider for receipts, portal invites, password resets. SPF/DKIM/DMARC configured per sending domain.

## 8. Data model (production)

```
Tenant        (id, name, name_urdu, subdomain, custom_domain?, branding{logo,colors},
               plan, status[trial|active|suspended], demo:bool, created_at)
Subscription  (id, tenant, plan, period, status, payment_method)
User          (id, tenant, role, capabilities[], name, phone, email?, cnic?,
               password_hash?, mfa{type,secret}, status, last_login)
ClientParty   (id, tenant, name, cnic?, phone, address, portal_enabled,
               consent{terms_at, data_at}, language_pref, channel_pref)
Court         (id, master_id?, tenant?, type, name, bench, city, court_room?)   -- master + tenant-custom
Case          (id, tenant, matter_thread_id, number, type, court→Court, stage,
               title, parties[], client→ClientParty, assigned_users[], status,
               fir_no?, police_station?, sections[]?, filed_on, decided_on?)
Hearing       (id, case, date, time?, purpose, outcome_note?, next_date?,
               readiness[ready|pending|na], entered_by, entered_at)
Document      (id, case, kind[generated|uploaded], template→Template?, title,
               status[draft|review|filed], version, visibility[firm|shared],
               file_ref, ocr_text?, ocr_status, created_by, created_at)
Template      (id, tenant?|system, type, name, language, docx_ref, merge_fields[])
FeeEntry      (id, case, kind[agreed|installment_due|received|adjustment], amount,
               method[cash|bank|gateway]?, gateway_txn_id?, date, note, entered_by)
PaymentIntent (id, tenant, case, client, amount, gateway, status[pending|paid|failed|
               expired], checkout_url, webhook_payloads[], created_at)
Inquiry       (id, tenant, channel[whatsapp|voice|webchat], caller{name,phone},
               matter_type, summary, urgency, transcript_ref, recording_ref?,
               callback_slot?, status[new|contacted|consulted|converted|closed],
               converted_case?→Case)
CalendarSlot  (id, tenant, user, start, end, kind[hearing|consultation|hold], source)
Notification  (id, tenant, recipient{user|client}, channel, template, language,
               payload, status[queued|sent|delivered|failed], attempts, provider_ref,
               created_at, delivered_at?)
Task          (id, tenant, case?, title, assignee, due_date, status)
AuditEvent    (id, tenant, user?, action, entity_type, entity_id, ip, user_agent, at)  -- append-only
ImportJob     (id, tenant, kind[csv|scans], file_refs[], mapping, dry_run:bool,
               report{created,skipped,errors[]}, status, rollback_token?)
```

Retention: cases/documents/audit — for the life of the tenancy + export on exit (SEC-5); notifications 12 months; recordings/transcripts per firm-configurable policy (default 12 months).

## 9. Non-functional requirements

### 9.1 Performance & capacity
- Search < 2 s at 10,000 cases and 100,000 documents per tenant; dashboard < 1.5 s TTI on mid-range Android over 4G.
- Sizing target year 1: 50 tenant firms, ~500 staff users, ~10,000 portal clients, ~250k notifications/month. Architecture must scale to 10× by configuration (horizontal app scaling, managed Postgres vertical + read replicas), not redesign.

### 9.2 Availability
- Target 99.5% monthly uptime (business promise; court mornings 8 AM–2 PM PKT are the critical window — maintenance windows only 9 PM–6 AM PKT).
- Health checks + status page; degradation modes defined per integration (§7.1).

### 9.3 Backup & disaster recovery
- Postgres: continuous WAL archiving + nightly full snapshots; object storage versioned + cross-region replicated.
- **RPO ≤ 1 hour, RTO ≤ 4 hours.** Restore procedure tested quarterly with a documented drill log (this is the substance behind the proposal's "daily backups" promise).
- Per-tenant export (SEC-5) doubles as the firm's own escrow copy.

### 9.4 Hosting & data residency
- Primary: reputable cloud region with acceptable latency to Pakistan (me-central/ap-south class). No Pakistani data-localization statute currently compels in-country hosting; if a client firm demands it, a per-tenant dedicated deployment on a Pakistani provider is a paid option — architecture (single-tenant flag + IaC) must permit this.

### 9.5 Localization
- Full bilingual UI: English baseline; Urdu translations for client portal + notifications (P0) and staff UI (P1). RTL-safe layout; Noto Nastaliq Urdu font; dates rendered unambiguously (`28 Jul 2026`); Hijri date display optional per tenant (P2).

### 9.6 Observability
- Structured logs (tenant-tagged, PII-scrubbed), error tracking (Sentry-class), metrics + alerting (notification failure rate, queue depth, OCR backlog, gateway webhook lag, AI-conversation error rate), uptime monitoring on all public endpoints.

### 9.7 UI design system & theming (normative)

A complete light/dark theming system, **structurally guaranteed to hit WCAG AA — not just aimed at it**. This section is binding on all UI work; violations are CI failures, not review comments.

#### 9.7.1 Tokens
Every color is a semantic CSS custom property, defined once in a single token file, referenced everywhere. **No hex/rgb literal is allowed outside this file.**

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--color-bg` | `#F8F9FA` | `#121212` | |
| `--color-surface` | `#FFFFFF` | `#1E1E1E` | |
| `--color-surface-elev` | `#FFFFFF`* | `#242424` | *light: 1px border only, no separate fill |
| `--color-text-primary` | `#1A1A1A` | `#FFFFFF` | |
| `--color-text-secondary` | `#5F6773` | `#CFCFCF` | light darkened from `#6B7280` → 4.84:1 to 5.72:1 |
| `--color-border-subtle` | `#DDDDDD` | `#3A3A3A` | decorative dividers, cards — boundary isn't the sole cue |
| `--color-border-interactive` | `#999999` | `#6B6B6B` | inputs/focus-critical boundaries, verified ≥ 3:1 (WCAG 1.4.11) |
| `--color-primary` | `#CB2957` | `#CB2957` | |
| `--color-primary-hover` | `#A71F47` | `#D42F62` | dark corrected from `#E03A6D` (was 4.2:1, failed AA) → 4.79:1 |
| `--color-muted-bg` | `#EEEEEE` | `#2A2A2A` | |
| `--color-success` | `#16A34A` | `#4ADE80` | |
| `--color-warning` | `#D97706` | `#FBBF24` | |
| `--color-danger` | `#DC2626` | `#F87171` | deliberately hue-separated (~5°) from primary's magenta (~343°) so Save/Delete never read as the same color family |
| `--color-info` | `#2563EB` | `#60A5FA` | |

#### 9.7.2 Two-tier borders, not one
`border-subtle` stays intentionally faint (~1.3–1.5:1) for pure visual separation where content itself already implies the boundary — a card with its own background and padding doesn't need a loud outline. `border-interactive` is reserved for anything where the border is the only way to know something is a distinct, editable region — form inputs, focus-critical containers — and is calibrated to clear the WCAG 1.4.11 non-text 3:1 threshold in both themes. **Using `border-subtle` on a form input is a lint-catchable mistake, not a style choice.**

#### 9.7.3 Contrast is enforced, not assumed
At build time, convert every token pair to OKLCH and compute actual contrast ratios (relative-luminance formula) for every (text, background) and (component, adjacent-background) combination actually used. **Fail the build** if any body-text pairing is under 4.5:1, any large-text/UI-component pairing is under 3:1, or any interactive border is under 3:1. This is exactly the check that would have caught the dark-hover failure before it shipped — a comment, not a suggestion: don't skip it. The script ships as `check:contrast`, wired into CI (§11).

#### 9.7.4 Switching mechanism
CSS custom properties scoped via `data-theme="light|dark"` on `<html>`, toggled by a hook/store — no remount, no reload. Persist to `localStorage`; with no stored preference, read `prefers-color-scheme` and keep listening live for OS changes. Apply the resolved theme via a small inline blocking script in `<head>` before hydration, to eliminate flash-of-wrong-theme.

#### 9.7.5 Coverage — no exceptions
Every page, modal, table, form, chart, toast, badge, and icon reads exclusively from these tokens — across the firm app, client portal, and any embedded widgets. Charts and status badges map to `success`/`warning`/`danger`/`info` **by meaning**, never to a literal color per series (e.g., case-stage badges, fee status, hearing readiness all resolve through semantic tokens). CI includes a grep/lint rule failing on any raw hex in component files outside the token definitions.

#### 9.7.6 Interactive states, specified exactly
default → hover (`primary-hover`, or 8–10% lightness shift for non-button surfaces) → active (press feedback, ≤ 100ms) → focus (visible 2px ring in `primary`, never suppressed) → disabled (40–50% opacity, `cursor: not-allowed`, no hover/active response). All four, on every interactive element, both themes.

#### 9.7.7 Motion
`background-color`/`color`/`border-color` transition 150–250ms ease-out — properties only, nothing layout-triggering. Wrapped in `@media (prefers-reduced-motion: no-preference)`; reduced-motion gets an instant, identical-end-state swap.

#### 9.7.8 Visual restraint
`primary` appears only on primary actions, active/selected states, and links — never a background wash, never more than one accent moment per view. No gradients, no decorative shadow/glow, one elevation step max between `surface` and `surface-elev`. This restraint is what makes the deliberate departure from navy/charcoal legal-industry convention read as a considered brand choice rather than an accident — **confirm that positioning with stakeholders before shipping** (see §15); it's a strategic call, not a technical one. *Interaction with per-tenant branding (§4.2): tenant branding overrides `--color-primary`/`--color-primary-hover` only, and any tenant-supplied accent must pass the same `check:contrast` gate at provisioning time — a tenant cannot configure their instance out of AA compliance.*

#### 9.7.9 Explicitly banned
Hex/rgb literals outside the token file · more than one accent color · disabled elements visually identical to enabled ones · any theme toggle causing layout shift · hardcoded per-series chart colors · `border-subtle` on an interactive boundary · shipping without `check:contrast` wired into CI.

#### 9.7.10 Deliverables
Token file · theme provider/hook with no-flash init script · toggle component demonstrating all four states in both themes · the `check:contrast` script · one demo screen (nav + table + form with a focused input + one modal + one toast) proving every surface obeys the tokens. These land in M1 (§13) alongside the core platform UI foundation.

## 10. Testing & quality

- **Unit + integration tests** on all services; CI-blocking. Minimum: every P0 requirement has at least one automated test tracing to its ID.
- **RLS/permission test suite:** automated cross-tenant and cross-role access attempts (the CP-1/SEC-1 guarantees) run on every build — this is the single most reputation-critical property of the product.
- **E2E tests** (Playwright-class) for the golden paths: hearing entry → notification delivered (sandbox), document generate → export, portal payment (gateway sandbox), WhatsApp intake → inquiry → conversion.
- **Notification sandbox harness:** every channel testable without real sends; staging uses sandbox credentials.
- **Load test** to 9.1 capacity targets before pilot #1; **security review** (OWASP ASVS L2 checklist + dependency audit) before first real-data tenant.
- **UAT with a practicing lawyer** on domain correctness (stages, numbers, templates, Urdu strings) before the first demo.

## 11. Delivery infrastructure

- Monorepo; trunk-based development; CI runs tests/lint/security scan **plus `check:contrast` and the no-raw-hex lint rule (§9.7 — build-failing, not warnings)**; CD via **Vercel preview deployments → staging → production**, each environment paired with its own Supabase project; all schema changes via versioned, reversible Supabase migrations, gated in CD.
- Staging uses sandbox integration credentials; the **demo tenant lives in production** (sandbox credentials, nightly reset via pg_cron).
- Feature flags per tenant (e.g., voice receptionist rollout).
- Prompt templates, notification templates, and stage-enum configs are versioned artifacts deployed like code.

## 12. Onboarding & rollout operations (the "service" half of the product)

Per the proposal's promises (free digitization, staff training, 3-month priority support), onboarding is productized:

1. **Provision tenant** — branding, subdomain/domain, court list confirmation, template pack selection.
2. **Integration onboarding** — WhatsApp Business signup for the firm's number; SMS sender-ID registration; payment-gateway sub-merchant KYC. (Longest lead times — start day 1.)
3. **Data import** — register/Excel via IM-1 with dry-run review alongside the munshi; scanned files via IM-2 bulk OCR queue; verification: case count + next-30-days hearing dates reconciled against the firm's diary **before go-live** (this check is what makes "0 missed dates" safe to promise).
4. **Training** — role-based sessions (advocate 1h, munshi 2h, associates 1h); Urdu-language quick-reference cards; training completion logged in IM-3 checklist.
5. **Hypercare** — 14-day pilot with daily check-in; then 3-month priority support (direct WhatsApp line to LaTech support, response SLA: urgent 2h / normal next business day).
6. **Go-live sign-off** — firm admin confirms data verification; subscription starts.

## 13. Delivery plan & milestones

| Milestone | Contents | Exit criteria |
|---|---|---|
| **M1 — Core platform** (weeks 1–4) | Tenancy, auth/MFA, RBAC+RLS, case/court/hearing/diary, global search, dashboard, audit log, **design-system foundation (§9.7 deliverables: tokens, theme provider, `check:contrast` in CI, demo screen)** | RLS test suite green; golden-path E2E for case/diary; lawyer UAT on domain model; `check:contrast` passing in CI with both themes |
| **M2 — Documents & portal** (weeks 3–7, overlapping) | Templates + generation + export, upload + OCR pipeline, client portal with OTP login, consent, sharing | Portal isolation tests green; OCR search working on Urdu+English scans |
| **M3 — Communications & money** (weeks 5–9) | Notification service + SMS/WhatsApp live, fee ledger, gateway checkout + payment links + webhooks | Real delivered SMS/WhatsApp in staging-to-real-number test; sandbox payment reconciles ledger |
| **M4 — AI Receptionist Phase A** (weeks 7–10) | WhatsApp intake bot, urgency flags, calendar booking, inquiry pipeline, guardrails | Live WhatsApp conversation books a real calendar slot; guardrail test set passes |
| **M5 — Import & onboarding tooling** (weeks 8–11) | CSV importer with dry-run/rollback, bulk scan ingestion, onboarding checklist | A real register Excel imports clean; reconciliation report produced |
| **M6 — Demo tenant & client demo** (week 11–12) | Seeded demo tenant on production (dataset §13.4), demo script rehearsed | Full demo runs on production build with zero mocked features |
| **M7 — Pilot #1** (weeks 12–14+) | First firm onboarded per §12 | 14 days live, 0 missed dates, firm converts |

*Demo pressure note:* if the client meeting must happen before M6, demo whatever milestones are complete **plus a clearly-labeled roadmap** — do not re-introduce mocks to fill gaps; a smaller honest demo protects the pilot promise.

### 13.4 Demo-tenant dataset (the only synthetic data in the system)
Isolated in the `demo=true` tenant, nightly-reset, sandbox integrations. Mirrors the proposal's screenshots so the demo is "the mockups come to life": *Malik vs. State* (`Crl. Misc. No. 18600-B/2026`, post-arrest bail, order reserved), *Sana Traders* (`C.S. No. 337/2026`, evidence stage), *Khan Family* (`Family Suit No. 88/2026`, arguments), *City Builders* (`R.F.A. No. 51/2026`, linked matter thread), `W.P. No. 4412/2026`, plus filler to match dashboard figures (86 active / 7 tomorrow / Rs 940K pending / 0 missed). Demo walkthrough: dashboard → cause list → live search → case file → hearing entry firing a **real sandbox WhatsApp message to the demo phone** → portal as client → sandbox payment → bail-application generation → WhatsApp AI intake live on the demo number → audit log → pilot close.

## 14. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Integration lead times (WhatsApp Business verification, SMS sender-ID, gateway KYC) | Blocks M3/M4 dates | Start registrations week 1; sandbox modes keep development unblocked; §7.1 adapters isolate delays |
| Urdu voice pipeline quality (Phase B STT/TTS) | Flagship feature underwhelms | WhatsApp-first launch (text intake is reliable today); voice gated behind quality bar with recorded-call review before enabling per tenant |
| Domain inaccuracy in front of advocates | Credibility loss | Lawyer UAT gate at M1/M2; stage enums and number formats config-driven for fast correction |
| Cross-tenant data leak | Existential (confidentiality is the brand) | RLS + app-layer checks + automated cross-tenant test suite on every build + security review before first real tenant |
| Firms' data arrives as paper only (no Excel) | Onboarding cost balloons | Bulk-scan + OCR + review queue (IM-2) is P0, priced into onboarding; digitization effort estimated during consultation step |
| Notification cost blowout (SMS pricing) | Margin erosion | WhatsApp-first routing (cheaper), SMS fallback only; per-tenant usage metering visible to LaTech |
| PDP Bill passes with strict requirements | Compliance scramble | SEC-8 readiness items built early; breach runbook + consent records already in place |
| Client expects native mobile apps | Sales objection | PWA install flow demoed on a phone in the meeting; native apps on roadmap if pilot feedback demands |

## 15. Open questions

1. First-client practice mix (criminal vs. civil vs. family dominant) — orders template polish and seed emphasis for their demo/pilot.
2. Their existing records format (Excel? register books only?) — sizes the digitization effort for the pilot quote.
3. Firm's WhatsApp number situation — existing business number to migrate, or new number for the platform?
4. Payment gateway preference/bank relationships — affects sub-merchant onboarding speed.
5. Pricing table (monthly tiers vs. one-time license) — commercial decision needed before pilot-end conversion conversation.
6. Voice receptionist platform selection — evaluate managed voice-AI providers (Vapi/Retell-class) on: Pakistani number reachability (native DID or call-forwarding from the firm's local number), Urdu STT/TTS quality, call-recording legality, and per-minute cost — during M1–M3.
7. **Brand accent confirmation (per §9.7.8):** the design system's `#CB2957` crimson departs from both the navy/charcoal legal-industry convention *and* the dark/lime look of LaTech's own proposal PDF. Stakeholders must confirm this positioning before M1 UI work hardens; note that per-tenant branding (§4.2/§9.7.8) means the platform default matters mostly for demos and marketing.

## 16. Glossary

| Term | Meaning |
|---|---|
| **Munshi** | Chamber clerk; traditionally holds the diary, files, and fee register |
| **Vakalatnama** | Power of attorney authorizing an advocate; first filing in every case |
| **Cause list** | Court's daily list of cases fixed for hearing |
| **Khula** | Wife-initiated dissolution of marriage (Family Court) |
| **Challan** | Police charge-sheet submitted after investigation |
| **FIR** | First Information Report — registers a criminal case with police |
| **CNIC** | Computerized National Identity Card number |
| **W.P.** | Writ Petition (High Court, Art. 199) |
| **RLS** | Row-level security (PostgreSQL tenant/role isolation) |
| **WABA** | WhatsApp Business Account |
| **RPO / RTO** | Recovery point / recovery time objective (backup guarantees) |
