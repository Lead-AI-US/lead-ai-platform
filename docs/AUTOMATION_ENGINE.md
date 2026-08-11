# Automation Engine

P0 defines automation primitives without enabling arbitrary automation execution.

Automation shape:

```text
trigger -> conditions -> actions -> automationRun -> event/audit
```

Templates such as New Lead Follow-up, Missed Lead Recovery, Appointment Follow-up, After-Hours Lead Capture, Human Escalation, and Knowledge Gap Alert are product architecture placeholders until backend execution is implemented.

No external provider integration is marked connected unless the provider account is actually verified.
