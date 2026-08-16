# Automation Engine

Phase 2 adds a policy-gated automation runtime without enabling arbitrary
automation execution.

Automation shape:

```text
trigger -> conditions -> actions -> automationRun -> event/audit
```

The runtime lives in `src/server/automations/*`:

- trigger matching
- condition evaluation
- deterministic run IDs for idempotency
- retry classification
- action proposal through the central AI Action Engine
- `automationRuns` persistence
- business events and audit entries

Templates such as New Lead Follow-up, Missed Lead Recovery, Appointment
Follow-up, After-Hours Lead Capture, Human Escalation, and Knowledge Gap Alert
are visible in the app as templates. Live automation definitions and recorded
runs are read from Firestore; direct client writes remain denied by security
rules.

No external provider integration is marked connected unless the provider account is actually verified.
