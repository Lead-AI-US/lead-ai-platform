# Product Spec

**Superseded (2026-08-09):** the generic "AI insights panel / product modules" concept
below was the pre-implementation planning sketch. The actual MVP built in
`feat/real-saas-foundation` narrowed scope to one concrete, working loop —
see `docs/MVP_VERIFICATION.md` for what's real. This file is kept for
history per the project's "never erase evidence" rule, not as current spec.

## Product

Lead.AI Platform

## Role

Main Lead.AI SaaS platform/dashboard.

## What actually shipped instead (see MVP_VERIFICATION.md)

Sign up → create workspace → add approved knowledge → install website chat
widget → visitor conversation → AI answer or human handoff → lead capture →
owner dashboard → real analytics. WhatsApp, calendar booking, billing, and
"AI insights panel"-style generic modules are explicitly deferred.

## Value Proposition

A central AI automation dashboard for managing leads, conversations, analytics, and workflow modules.

## Problem

Businesses need one place to manage AI automation, leads, conversations, analytics, and product workflows.

## Target Users

- Small business owners
- Sales teams
- Customer support teams
- Agencies
- Startup operators

## Core Features

- Dashboard
- Lead overview
- AI insights panel
- Product modules
- Conversation summary
- Usage analytics
- Automation status
- Integration placeholders
- Admin-ready architecture

## MVP Scope

The MVP should prove one practical workflow before expanding into a full product.

First valuable demo: Create a dashboard shell with lead, conversation, and automation module views.

## Out Of Scope For MVP

- Production claims.
- Real customer data.
- Complex multi-tenant enterprise controls.
- Unsupported accuracy claims.
- Paid billing flows unless explicitly required for the first demo.

## Success Metrics

- A visitor understands the product in under 10 seconds.
- The primary workflow can be demonstrated with safe sample data.
- Setup and security expectations are documented.
- AI outputs include limitations, explanations, or review guidance where relevant.
