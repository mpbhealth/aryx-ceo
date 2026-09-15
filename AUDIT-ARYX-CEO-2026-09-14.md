# Audit — ARYX CEO — 2026-09-14

Mode: FULL SYSTEM AUDIT + authorized repair  
Auditor: Cursor session  
Environment read: COS Supabase `kylemtjsypmrtmuhmang` (production) · Vercel `aryx-ceo` / `prj_usQUsVbwgriUV3SMIZOnvFIgx20x` · host `https://ceo.aryx.pro`  
Discovery: read-only SQL, function list, Vercel deployments. Repair: local code + edge-function deploy. No production SQL writes.

Scope in: mounted COS desk (Command, Finance, CRM, Enrollments, Advisors, Pipeline, Tickets, Marketing, Inbox, Organizer, Company/Build, Settings), warehouse extractors, deployed edge functions, org links, cron.  
Scope out: inventing a MarketFlow team id, remounting AI chat, creating `outlook_config`, rotating the mail cron secret.

## Coverage

Surfaces inventoried: mounted nav + auth + 8 live functions + warehouse facts + org links.  
Verified in production: function list, org-link flags, `outlook_config` absence, warehouse shape from prior pass, Vercel production SHA.  
Sampled: Policy create path, Organizer calendar, Assignments, leftover CTO pages.  
Untouched this pass: Inbox Graph mail end-to-end, CRM write-proxy live POST, password reset email click, every Company/Build CRUD row.

## RESUME HERE

Pass 3 closed vanishing department/employee fields, assignment completed counts, note-share calls to missing tables, assignment create project/email wiring.

Auth Site URL is live: `https://ceo.aryx.pro` plus `https://ceo.aryx.pro/**`. Still not ours: MarketFlow team id, Outlook Graph store, isolation org.

## Drift Register

| Artifact | Repo | Deployed (at audit start) | Class | Risk |
|---|---|---|---|---|
| Vercel production | local dirty / this repair | `8eeffa6` READY on `aryx-ceo` | **repo-ahead** after repair | frontend honesty fixes not live until push |
| `connector-sync` | ticket_scope `mpb_pilot` or `mapped` | v22 | **repo-ahead** until redeploy | tickets already extract for MPB (`mpb_pilot`) |
| `outlook-calendar` | present, no demo events | **absent** | **repo-only** | Organizer 404'd then invented meetings |
| `agent-chat` | present, UI unmounted | **absent** | repo-only, intentionally unmounted | do not remount |
| Leftover unused functions (compliance-*, monday-api, …) | deleted this pass | never deployed | cleared | none live |
| `outlook_config` | hook/function expect it | **table does not exist** | stamped-not-applied / never created | calendar cannot connect |
| Auth Site URL | repo lists `ceo.aryx.pro` | live `https://ceo.aryx.pro` plus `/**` | **live** | email and OAuth redirects use the CEO host |
| `cos_org_link.marketflow_team_id` | extractor ready | **null** on both orgs | data gap | Marketing stays `—` |
| Isolation org `b000…0002` | unlinked | confirmed unlinked | intended | keep empty |

Live functions at audit start: `connector-sync` v22, `crm-proxy` v17, `email-oauth` v14, `email-api` v13, `mail-renewal` v15, `mail-webhook` v14, `send-auth-email` v10, `sso-exchange` v10.

## Feature Surface Matrix (mounted)

| ID | Surface | Status after repair |
|---|---|---|
| CMD-HOME | Command facts, book, P&L, tickets, marketing | SHIPPED with `formatFact` / no fake zeros |
| FIN-PNL | Finance P&L | SHIPPED; `—` when empty |
| CRM-* | crm-proxy live GET | FUNCTIONAL WITH RISKS (not warehoused) |
| ENROLL / IQ / PIPE | warehouse facts | SHIPPED for linked MPB org |
| TIX | ITSTS extract + pages | SHIPPED for `mpb_pilot` MPB org |
| MKT | `fact_traffic_daily` | BLOCKED BY EXTERNAL DEPENDENCY (no team id) |
| CAL | Organizer Outlook | INTENTIONALLY OUT OF SCOPE until Graph is provisioned; no longer invents events |
| POL | Policy create | FUNCTIONAL WITH RISKS — text insert only |
| ASG | Assignments | FUNCTIONAL — clipboard only; Monday tab removed |
| MAIL | Inbox / mail-* functions | SHIPPED (prior); not re-traced this pass |
| AI | Global assistant | INTENTIONALLY OUT OF SCOPE (unmounted, function not deployed) |
| PUB-UPLOAD | `/public/upload` | removed |

## Defect Register

| ID | Sev | Module | Defect | Evidence | Label | Fix |
|---|---|---|---|---|---|---|
| D-CAL-1 | P1 | Organizer | Demo meetings shown as a schedule; writes simulated success | `useOutlookCalendar` + `outlook-calendar` generated events; function not deployed; `outlook_config` missing | CONFIRMED | Empty calendar; honest modal; no local invent |
| D-POL-1 | P1 | Policy | Attach/share toasted success; dummy approvers; files never stored | `AddPolicyModal` simulate upload/share | CONFIRMED | Removed fake UI; insert still writes `policies` |
| D-POL-2 | P2 | Policy | Document number / effective date collected, no columns | live `policies` columns | CONFIRMED | Fields removed |
| D-ASG-1 | P1 | Assignments | Teams/email returned `{success:true}` without send | `communicationHelpers` (prior) | CONFIRMED | false + error; buttons removed |
| D-ASG-2 | P2 | Assignments | Clipboard treated object as always success | `if (success)` on object | CONFIRMED | `result.success` |
| D-ASG-3 | P3 | Assignments | Monday tab decorative | empty “will be displayed here” | CONFIRMED | removed |
| D-AI-1 | P2 | Chat | Assistant remounted against undeployed `agent-chat` | `CosApp` + function list | CONFIRMED | unmounted again |
| D-PUB-1 | P2 | Public upload | Unauth route to undeployed function | `main.tsx` | CONFIRMED | routes removed |
| D-FACT-1 | P2 | Command/Finance | `$0` when linked but empty | `\|\| 0` | CONFIRMED | `formatFact` |
| D-MKT-1 | — | Marketing | No sessions | `fact_traffic_daily` 0; `marketflow_team_id` null | CONFIRMED | leave unlinked |
| D-AUTH-1 | P2 | Auth | Site URL omitted `ceo.aryx.pro` | was `cos.aryxtech.com` | CLOSED 2026-09-14 | config push |
| D-CRON-1 | P3 | Ops | Mail cron command embeds secret | `cron.job` | CONFIRMED | rotate; do not print |
| D-SYNC-1 | P3 | AdvisorIQ | three `sync_runs` stuck `running` | prior warehouse read | INFERRED this resume | inspect later |
| D-COH-1 | P3 | Enrollments | `fact_iq_cohorts` unused | table filled, no UI | CONFIRMED | backlog |

## Evidence

- `to_regclass('public.outlook_config')` → null. [CONFIRMED]
- Org links: MPB `ticket_scope=mpb_pilot`, IQ/enroll/CRM on; MarketFlow off. Isolation all none. [CONFIRMED]
- Production deploy SHA `8eeffa6` at start. [CONFIRMED]
- No `outlook-calendar` or `agent-chat` in live function list. [CONFIRMED]

## Repair applied (this pass)

1. Unmount AI assistant; drop `/public/upload`.
2. Delete leftover unmounted CTO pages, mocks, unused hooks, unused undeployed functions.
3. Honest Command/Finance facts; hold + churn reason mix.
4. Ticket extractor accepts `mpb_pilot` or `mapped` (still MPB org only).
5. Assignments: no fake send; clipboard uses `result.success`; Monday tab gone.
6. Policy: no fake attach/share; only persistable fields.
7. Calendar: no invented events; setup does not collect Graph secrets in the browser.

## Release decision

**GO WITH CONDITIONS** after this commit is production and `connector-sync` + `outlook-calendar` are deployed.

Conditions (not code):

1. Auth URLs are set: Site URL `https://ceo.aryx.pro`, allow list includes `https://ceo.aryx.pro` and `https://ceo.aryx.pro/**`.
2. Marketing stays empty until a real MarketFlow team id is mapped.
3. Outlook stays empty until Graph is provisioned server-side. Do not create `outlook_config` from the browser.
4. Isolation org stays unlinked.
