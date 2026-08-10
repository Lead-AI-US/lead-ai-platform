# Manual Visual QA

Automated in-app Browser QA was not executable in this environment because Browser runtime initialization failed before a session could be created. Use this checklist with an authenticated, deployment-protected Preview session.

## Preview

- URL: `https://lead-ai-platform-qwy9punf1-aruns-projects-ba93fc58.vercel.app`
- Environment: Vercel Preview
- Authentication: Vercel team auth, shareable protected preview access, or approved automation bypass

## Routes

- `/app`
- `/app/leads`
- `/app/conversations`
- `/app/ai-agent`
- `/app/knowledge`
- `/app/analytics`
- `/app/integrations`
- `/app/ai-assets`
- `/app/developer`
- `/app/settings`

## Viewports

- Desktop: `1440x900`
- Desktop: `1280x800`
- Tablet: `768x1024`
- Mobile: `390x844`
- Mobile: `375x812`

## Criteria

For each route and viewport, verify:

- Layout, spacing, and typography remain coherent.
- No horizontal overflow or clipped text appears.
- Responsive navigation is usable.
- Forms, buttons, tables, cards, status badges, and command surfaces fit their containers.
- Loading, empty, and error states are legible and aligned.
- Dark mode remains readable.
- Keyboard focus states and accessible labels are present where expected.
- The command palette opens, searches, and closes without visual overlap.

## Evidence

Capture at least one screenshot per route on desktop and one mobile or tablet viewport for any page where an issue is found. Record pass/fail status in `docs/MANUAL_VISUAL_QA_RESULT.md`.
