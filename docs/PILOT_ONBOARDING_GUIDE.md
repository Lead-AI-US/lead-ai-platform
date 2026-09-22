# Pilot onboarding guide — appointment-based local business

Written for a first real pilot customer (a salon, barbershop, or similar
appointment-based local business) and whoever is onboarding them. No
technical background assumed for the owner-facing parts.

## Before you start

Lead.AI answers customer questions on your website and captures contact
details when someone wants to book, using **only information you've
approved**. It never invents prices, hours, or availability, and it never
tells a customer their appointment is confirmed unless a real booking
system says so (this pilot does not yet include real calendar booking —
see "What this pilot does not do" below).

## 1. Business details to collect from the owner

Ask the owner for, in plain language:

- **Business name** and **type of business** (e.g. "hair salon," "barber
  shop").
- **What's the #1 problem you want help with?** (e.g. "I miss calls while
  I'm cutting hair," "people text after hours and I forget to reply").
  This becomes the workspace's `primaryGoal` — it doesn't change what the
  AI can say, but it tells you what to prioritize configuring first.
- **Website domain**, if they have one (optional — a business without a
  website yet can still use the pilot; the widget install step is simply
  deferred until they have somewhere to put it).

## 2. Approved knowledge — what the AI is allowed to say

This is the most important step. The AI **only** answers from what you
enter here — nothing else, ever. Write each as a short title + a factual
answer, one topic per entry:

| Title | Example content |
|---|---|
| Hours | "We're open Tuesday–Saturday, 9am–6pm. Closed Sunday and Monday." |
| Services | "We offer haircuts, color, and blowouts. We do not offer nail services." |
| Booking policy | "We ask for 24 hours' notice to cancel or reschedule." |
| Location | "123 Main St, Springfield. Street parking available." |
| Late policy | "We can hold your appointment for 10 minutes past your booked time." |

**Do not include**: prices (the AI is policy-blocked from stating them
even if you write them in — safer to just not), guarantees of any kind,
anything that could be medical advice, or anything you're not 100% sure
is accurate. Each entry starts as a **draft** and must be explicitly
**approved** in the Knowledge page before the AI can use it — review what
you wrote before approving.

## 3. Customer inquiry categories

Have the owner think through the 4–6 questions they get asked most. Turn
each into a knowledge entry. Typical categories for this vertical:
hours, services offered, pricing range (see above — be careful here),
booking/cancellation policy, parking/location, walk-ins vs.
appointment-only.

Anything outside approved knowledge gets an honest "I don't have that
information, let me connect you with the team" response and a **human
handoff** flag — it is never guessed.

## 4. Lead notification / escalation

Right now, the owner needs to actively check the **Leads** and
**Inbox/Conversations** pages in the dashboard — there is no push
notification or email alert yet in this pilot. Set expectations
accordingly: **tell the owner to check the dashboard at least once a
day**, and more often right after installing the widget. (Email/SMS
alerting is a reasonable P1 addition, not built yet — don't promise it.)

## 5. Website widget installation

1. In the dashboard, go to **AI Agent → Deploy**. The website channel
   shows "Configuration required" until an allowed origin is set.
2. Go to **Settings** and add the business's real website domain to
   allowed origins (this is the security boundary that stops anyone else
   from using your business's AI on their own site — see
   `docs/SECURITY_MODEL.md`).
3. Get the widget snippet (Command Palette → "copy widget snippet," or
   ask an engineer — there's currently no dedicated "copy" button on the
   Deploy tab itself, just the command palette action).
4. Paste the snippet into the business's website, just before `</body>`.
   If they use Squarespace/Wix/etc., this usually goes in a
   "custom code" or "embed" section — ask the specific platform's support
   if unsure.
5. Open the real website and confirm the chat bubble appears in the
   bottom-right corner.

## 6. Data privacy and consent

- Tell the customer, in your own website's privacy policy or a note near
  the chat widget, that messages are processed by Lead.AI to answer
  questions and may be shared with the business to follow up. Don't rely
  on Lead.AI to have already disclosed this on your behalf.
- Don't put real customer data into a knowledge entry (e.g. don't paste a
  list of client names/emails into the "Services" entry). Knowledge is
  for business facts, not customer records.
- A visitor's contact details (name/email/phone) are only captured when
  they choose to give them (typically to request a booking) — the AI
  doesn't ask for contact info to answer an FAQ.

## What this pilot does not do (be honest with the owner about this)

- **No real appointment booking or calendar sync.** The AI can say "I can
  have the team reach out to schedule a time" — it never says "your
  appointment is confirmed," because no such confirmation exists yet.
- **No WhatsApp/Instagram/SMS.** Website chat only, for now.
- **No automatic email/SMS alerts** when a lead comes in (see §4).
- **No live-model guarantee.** Answer quality depends on a live AI
  provider key being configured; without one, every message gets a safe
  "I don't have that information" response and an automatic handoff flag
  — which is the intended safe behavior, not a bug, but the owner should
  know it means the AI won't demo well until a real key is in place.

## Pilot acceptance checklist

Run through this with the owner present, on their own phone if possible:

- [ ] Owner can sign in to the dashboard.
- [ ] Workspace shows the correct business name.
- [ ] At least 3 knowledge entries exist and are marked **approved** (not
      draft).
- [ ] Widget appears on the real business website (not just a test page).
- [ ] A test message sent from a phone gets a sensible reply grounded in
      the approved knowledge (ask an FAQ you know the answer to).
- [ ] A test message asking to book something appears as a new lead in
      the dashboard within a minute.
- [ ] The owner successfully changes that test lead's status (e.g. to
      "contacted") — this is the human follow-up step.
- [ ] The owner understands they need to check the dashboard manually
      (no alerts yet) and knows where the Leads and Inbox pages are.
- [ ] The owner has read and understood "What this pilot does not do"
      above.
