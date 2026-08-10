# Roadmap

## Status

MVP implemented (2026-08-09, `feat/real-saas-foundation`) — see
`docs/MVP_VERIFICATION.md` for what's real vs. not yet configured/verified.
Phases 1-2 below are done against the narrowed website-chat-first scope, not
the original generic "product modules" concept. Phase 3-4 items are mostly
done too (Firestore rules, server auth, tests, CI) with two honest gaps:
Firestore rules were written and unit-testable but couldn't be run against a
live emulator in this environment (needs JDK 21+, sandbox has Java 8), and
no real OpenAI/Firebase project credentials exist yet, so live-model and
live-deploy behavior are BLOCKED ON CONFIGURATION, not verified.

## Phase 1: Product Foundation

- Confirm target user and first use case.
- Define data model, environment variables, and security boundaries.
- Create the first UI or API skeleton.
- Add test strategy and deployment assumptions.

## Phase 2: MVP Demo

- Implement the core workflow: Create a dashboard shell with lead, conversation, and automation module views.
- Add realistic sample data and public-safe examples.
- Add screenshots or a short demo video.
- Validate the workflow with at least one business scenario.

## Phase 3: Trust And Integrations

- Add authentication or protected access where needed.
- Add integration placeholders or provider adapters.
- Add monitoring, logging, error handling, and abuse controls.
- Improve responsible AI notes, human review paths, and explainability.

## Phase 4: Product Readiness

- Add automated tests and setup verification.
- Finalize deployment documentation.
- Review security and privacy posture.
- Decide whether status should move to Demo Ready, In Development, or Production Ready.
