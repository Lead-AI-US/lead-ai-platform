# Reality Baseline — `lead-ai-platform`

Written before any implementation in this pass, from direct inspection of the
repository as cloned from `https://github.com/Lead-AI-US/lead-ai-platform`
(`main`, commit `accfddf`). This document exists so later status claims can be
checked against a documented starting point rather than repeated from memory.

## What exists

```
git log --oneline -5
  accfddf docs: upgrade Lead.AI-US product ecosystem documentation
  cc2fc8e Initial Lead.AI repository foundation

find . -maxdepth 3 -type f (excluding .git)
  .env.example
  .github/ISSUE_TEMPLATE/bug_report.md
  .github/ISSUE_TEMPLATE/feature_request.md
  .github/pull_request_template.md
  .gitignore
  AGENTS.md
  docs/API_SPEC.md
  docs/ARCHITECTURE.md
  docs/DEPLOYMENT.md
  docs/MVP_PLAN.md
  docs/PRODUCT_SPEC.md
  docs/QUALITY_CHECKLIST.md
  docs/ROADMAP.md
  docs/SECURITY.md
  docs/USER_FLOW.md
  LICENSE
  README.md
```

Pushed at `2026-05-18T06:01:09Z` — matching the "six repos in ten seconds"
automated-batch signature already documented by a prior ecosystem audit
(`Work_2026/Lead.ai/lead-ai-ops/LEAD_AI_REPOSITORY_MAP.md`). Disk usage 15 KB.

## What is documentation only

Every file above is markdown, a license placeholder, GitHub templates, or
`.env.example`. There is:

- **No `package.json`.** No dependency manifest of any kind.
- **No source code.** No `src/`, `api/`, `app/`, or any `.ts`/`.tsx`/`.py` file.
- **No test files, no CI workflow**, no `.github/workflows/`.
- **No lockfile**, no build config (`vite.config`, `tsconfig`, etc).

The repo's own README says this directly: *"There is no complete runnable
application in this repository yet."* That statement is accurate and is being
taken at face value rather than re-verified line by line, since there is
nothing to run.

`README.md`'s stated tech stack (React, Tailwind, Firebase, **FastAPI-ready
API structure**, OpenAI-compatible workflows) predates this pass's
architecture decision. Per the governing brief, this pass builds a
TypeScript-first stack instead (Vercel serverless functions, not FastAPI) —
the README is updated as part of this work to reflect what's actually
implemented, not left describing an unbuilt alternative.

## What is runnable

Nothing, prior to this pass.

## What is missing (relative to a working MVP)

Everything in the product loop: authentication, workspace/tenant model,
Firestore data layer and security rules, lead capture, knowledge base, the
website chat widget and its API, OpenAI integration, conversation/handoff
persistence, analytics, dashboard UI, tests, and CI. All of it is added in
this pass, from zero, as tracked by the commit history on
`feat/real-saas-foundation`.

## Standing constraints carried over from prior audits

From `lead-ai-workspace/README.md` (a sibling audit workspace, not part of
this repo): do not publish monetary amounts/pricing/revenue claims, do not
publish immigration-sensitive employment statements, do not delete
repos/branches/deployments without approval. These apply to the *marketing*
site, not this platform repo, but are noted here since both are part of the
same product and the same "no fabricated claims" principle governs this
build too — see `docs/AI_ARCHITECTURE.md` and `docs/SECURITY.md` for how it's
applied here (zero-pricing AI policy, no fabricated social proof, truthful
empty states).
