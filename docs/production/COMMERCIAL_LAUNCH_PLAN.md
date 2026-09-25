# Commercial launch plan — internal, not for external distribution

**All prices in this document are draft proposals pending explicit
owner approval.** Nothing here has been published anywhere
customer-facing, and nothing should be quoted to a prospect until the
owner signs off on the numbers, the terms, and a real payment provider
integration (see "Billing status" below). This document exists to give
that approval something concrete to react to, not to announce a price.

## Packages

Three tiers, matching the pilot-loop feature set that's actually built
and verified (see `docs/production/LEADAI_2_BASELINE.md`) — nothing
described here as "included" is aspirational.

| | **Starter** | **Growth** | **Managed Pro** |
|---|---|---|---|
| Workspace + AI assistant | 1 workspace, 1 configured agent | 1 workspace, 1 agent | 1 workspace, 1 agent |
| Website widget | ✅ | ✅ | ✅ |
| Approved-knowledge Q&A | ✅ | ✅ | ✅ |
| Lead capture + dashboard | ✅ | ✅ | ✅ |
| Human handoff | ✅ | ✅ | ✅ |
| Team seats | 1 (owner only) | up to 3 | up to 10 |
| Team invites / role management | — | ✅ | ✅ |
| Monthly conversation volume (soft cap, see below) | ~150 | ~500 | ~2,000 |
| Analytics dashboard | Basic (lead/handoff counts) | + funnel view | + funnel view |
| Setup | Self-serve onboarding guide | Assisted onboarding call | Full white-glove setup |
| Support | Email, best-effort | Email, 2-business-day SLA | Priority + monthly check-in |
| Automations, CRM sync, advanced lead scoring | Not available (not built yet — `automationRunner.ts` is unwired, see baseline doc) | Same | Same |

Conversation-volume numbers are **soft planning caps**, not enforced
quotas — there is no metering/billing-caps code today (Phase 5's own
"usage metering and reasonable caps" is not built). They exist only so
the cost model below has a number to work from.

### Draft pricing (placeholder figures — owner must approve or replace)

| | Starter | Growth | Managed Pro |
|---|---|---|---|
| One-time setup fee | $[TBD — draft: 300] | $[TBD — draft: 750] | $[TBD — draft: 1,500] |
| Monthly subscription | $[TBD — draft: 99] | $[TBD — draft: 249] | $[TBD — draft: 599] |

These draft figures are placeholders for discussion, sized to comfortably
clear the per-customer cost estimate below with real margin — they are
not derived from any competitor benchmark or market research done in
this pass.

## Per-customer cost model (estimated, not measured)

No workspace has ever run against a live OpenAI key or a paid Firebase
plan in this environment (see "Blocked" below), so **every number here
is a planning estimate from public pricing**, not a measured actual.
Treat this table as directional until the first pilot produces real
usage numbers, then replace it.

Assumptions: `gpt-4.1-mini` (the default configured in
`src/lib/ai/openaiClient.ts`), ~2,000 input + ~300 output tokens per
conversation turn (system prompt + approved knowledge + history),
average 3 turns per conversation.

| Cost driver | Starter (~150 conv/mo) | Growth (~500 conv/mo) | Managed Pro (~2,000 conv/mo) |
|---|---|---|---|
| OpenAI (`gpt-4.1-mini`, ~6,900 tokens/conversation at current public per-token pricing) | ~$3–5 | ~$10–15 | ~$40–60 |
| Firebase (Firestore reads/writes, Auth, Hosting — Spark free tier covers a single low-volume workspace; Blaze pay-as-you-go beyond that) | ~$0–5 | ~$5–15 | ~$20–40 |
| Vercel (serverless function invocations, bandwidth) | ~$0 (Hobby/free tier likely sufficient) | ~$0–20 (may need Pro) | ~$20–40 (Pro tier) |
| Messaging (WhatsApp/Instagram via an approved provider) | Not built — see baseline doc | Not built | Not built |
| Onboarding time (one-time, owner's own hours) | ~1–2 hrs | ~3–5 hrs | ~8–12 hrs |
| Ongoing support time (owner's own hours/month) | ~0.5 hr | ~1–2 hrs | ~3–5 hrs |
| **Estimated infra cost/month** | **~$3–10** | **~$15–50** | **~$80–140** |

At the draft subscription prices above, gross margin on infra cost
alone is comfortably positive at every tier; the real constraint for
the first 1–2 customers is **the owner's own support/onboarding time**,
not infra spend — worth pricing Managed Pro's premium around that
explicitly rather than around compute cost.

## Minimum requirements for two paying pilot customers

Everything in this list is either already done (✅, cite the commit) or
still blocked (❌, cite the exact blocker) — nothing is assumed done
without a checked citation.

1. ✅ Verified core loop (signup → workspace → knowledge → widget →
   real lead → handoff) — `docs/production/LEADAI_2_BASELINE.md`,
   `e2e/pilotJourney.spec.ts` (6/6 against real emulators).
2. ✅ Team management (invite, roles, leave) for a pilot that wants more
   than one staff account — `docs/AUTHORIZATION.md`.
3. ❌ A real Firebase project (Authentication + Firestore), with
   `firebase/firestore.rules` and `firebase/firestore.indexes.json`
   actually deployed — no project exists in this environment.
4. ❌ A real `OPENAI_API_KEY` — live model behavior has never been
   verified end-to-end; everything downstream of the model call is
   verified, the call itself is not.
5. ❌ Confirmed Vercel project ownership under the intended team
   (`aruns-projects-0839d12f` was not visible to this session's
   connector; only `aruns-projects-ba93fc58` was, and no
   `lead-ai-platform` project exists there yet).
6. ❌ A real payment path — see "Billing status" below. Not required to
   onboard the first pilot if payment is handled manually
   (invoice/bank transfer) while checkout is built properly.
7. ⚠️ A written pilot agreement / terms the owner is comfortable
   sending — out of scope for this pass (legal, not engineering).

## Billing status (this pass didn't touch billing code)

No Stripe/PayPal integration exists in `lead-ai-platform` today. Per
the mission brief's own priority ("prioritize selling an already
functioning service over building a complex self-service billing
platform prematurely"), the recommended path for the first 1–2
customers is a **manual invoice** (bank transfer, or whatever the owner
already uses for other clients) rather than building hosted checkout
before there's a paying customer to justify it. A real checkout
integration is P1, not a blocker for pilot #1.

## What this document is not

Not a public price list, not a signed contract, not a claim that
metering/caps/messaging/automations exist — each of those is called out
above exactly where it's missing. Replace the draft prices and the cost
estimates with real numbers as soon as either exists.
