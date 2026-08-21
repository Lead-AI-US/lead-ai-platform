# Phase 8 Premium Product Experience

## Scope

Phase 8 modernizes the Lead.AI SaaS interface while preserving the Phase 2
security model, tenant isolation, action policy, idempotency, automation
runtime, audit logging, and test coverage.

This work starts from PR #15 head:

```text
01941d83823cc505a37b08753df8b5f0196292c1
```

PR #15 remains unmerged unless explicitly approved.

## Architecture

The authenticated app remains a standard React/Vite DOM application. WebGL is
not required for the dashboard or privileged workflows. Phase 8A-8C introduces
CSS-based spatial depth through reusable components rather than adding a 3D
runtime dependency.

New primitives:

- `src/components/spatial/SpatialCard.tsx`
- `src/components/motion/SignalField.tsx`

Updated foundations:

- semantic CSS variables in `src/index.css`
- Tailwind token mappings in `tailwind.config.ts`
- upgraded `Card`, `Button`, `Badge`, `Input`, `EmptyState`, and `Skeleton`

## Design System

Tokens cover:

- background
- surface
- surface-elevated
- surface-interactive
- border
- border-hover
- text via foreground/muted-foreground
- accent/accent-soft
- success/warning/danger/info
- shadow/glow
- radius

Dark mode is defined independently, not as a simple inversion.

## Component Inventory

Phase 8A-8C touched:

- App shell
- Sidebar
- Workspace header
- Page header
- Command palette
- Dashboard command center
- Core UI primitives

No backend authorization or Firestore rules were moved into client UI state.

## Responsive Behavior

The shell keeps the existing desktop sidebar and mobile overlay navigation.
Cards and dashboard metrics use responsive grids that collapse into stacked
mobile sections. Phase 8J hardened the Leads route so mobile uses readable
lead cards while desktop keeps the denser table.

## 3D Strategy

Current phase uses lightweight CSS spatial depth:

- layered grid field
- soft light fields
- depth-aware cards
- subtle hover lift on pointer devices
- reduced-motion safeguards

No Three.js or React Three Fiber dependency has been added yet. A future public
landing hero can add a lazy-loaded WebGL visualization only if bundle and
fallback requirements are met.

## Performance Strategy

- No new runtime dependencies.
- Existing route-level lazy loading is preserved.
- CSS spatial effects avoid continuous JavaScript animation.
- Reduced-motion users receive near-static behavior.
- Dashboard still queries bounded workspace collections and counts.

## Accessibility Strategy

- Focus rings remain visible.
- Command palette keeps dialog semantics, restores focus, and supports
  Escape, Arrow Up, Arrow Down, and Enter.
- Sidebar labels remain text-visible and not icon-only.
- Spatial effects are decorative and do not carry unique information.
- Reduced motion is respected globally.

## Testing Evidence

Phase 8A-8C local verification:

```text
npm run typecheck: GREEN
npm run lint: GREEN
npm test: GREEN
npm run build: GREEN
npm audit --omit=dev: GREEN
npx firebase emulators:exec --only firestore "npm run test:rules": GREEN
git diff --check: GREEN
```

Playwright unauthenticated route smoke covered `/`, `/login`, `/signup`, and
protected `/app/*` redirects at 1440, 1280, 768, 390, and 375 pixel widths:

```text
route load: GREEN
horizontal overflow: GREEN
authenticated app visual QA: MANUAL_REQUIRED
```

The authenticated app shell cannot be visually completed locally until Firebase
Preview access is available or a real internal test account is supplied.

Phase 8J authenticated emulator QA:

```text
Firebase Auth emulator signup: GREEN
Firebase Auth emulator login: GREEN
Firestore emulator membership resolution: GREEN
ProtectedRoute authenticated /app render: GREEN
Authenticated route sweep: GREEN
```

QA method:

- Firebase Auth emulator and Firestore emulator ran with project
  `demo-lead-ai-platform`.
- Client Firebase SDK used explicit `VITE_FIREBASE_AUTH_EMULATOR_HOST` and
  `VITE_FIRESTORE_EMULATOR_HOST` values.
- Admin SDK emulator initialization used `FIREBASE_PROJECT_ID` and emulator
  host vars, with no service-account secrets.
- A synthetic internal user signed up through the real `/signup` form.
- Workspace, membership, and representative tenant records were seeded into
  the Firestore emulator; the browser then signed in normally and reached
  `/app` through `ProtectedRoute` and `WorkspaceProvider`.
- `vercel dev` was attempted, but in this session it served HTML while Vite
  module URLs returned 404, so authenticated visual QA used direct Vite. This
  means serverless API visual interactions remain local-not-executed unless
  `vercel dev` is repaired.

Authenticated route inventory:

| Route | Feature | Auth Required | Tenant Data | Phase 8J QA |
|---|---|---:|---:|---|
| `/app` | Dashboard | Yes | Yes | GREEN |
| `/app/inbox` | Inbox / conversations | Yes | Yes | GREEN |
| `/app/customers` | Customers | Yes | Yes | GREEN |
| `/app/customers/:customerId` | Customer profile | Yes | Yes | GREEN |
| `/app/leads` | Leads | Yes | Yes | GREEN |
| `/app/conversations` | Conversations alias | Yes | Yes | GREEN |
| `/app/ai-agent` | AI Agent Test | Yes | Yes | GREEN |
| `/app/knowledge` | Knowledge | Yes | Yes | GREEN |
| `/app/automations` | Automations | Yes | Yes | GREEN |
| `/app/analytics` | Analytics | Yes | Yes | GREEN |
| `/app/integrations` | Integrations | Yes | Yes | GREEN |
| `/app/ai-assets` | AI Assets | Yes | Yes | GREEN |
| `/app/developer` | Developer Center | Yes | Yes | GREEN |
| `/app/settings` | Settings | Yes | Yes | GREEN |

Viewport evidence:

```text
1440x1000: GREEN
1280x900: GREEN
1024x900: GREEN
768x1000: GREEN
430x932: GREEN
390x844: GREEN
375x812: GREEN
horizontal overflow failures: 0
blank route failures: 0
checks recorded: 105
```

Keyboard and theme evidence:

```text
Ctrl+K command palette open: GREEN
Escape close: GREEN
Arrow Down focus move: GREEN
Arrow Up focus move: GREEN
focus restoration on close: GREEN
dark mode applied across tested viewports: GREEN
```

Manual visual observations:

- Desktop dashboard hierarchy, cards, badges, and activity feed are readable.
- Mobile dashboard stacks correctly with no visible overlap.
- Dark mode has deliberate surfaces and readable status chips.
- Leads mobile table compression was found and fixed with mobile lead cards.
- API-backed widgets can show designed local error states when direct Vite is
  used without Vercel serverless functions.

## Known Limitations

- Lead detail drawer, automation visual builder, full AI Copilot redesign,
  executive analytics polish, and public 3D landing hero are not complete in
  this first implementation batch.
- Browser visual QA used local Playwright against emulators.
- Local `vercel dev` frontend serving remained unreliable in this environment;
  direct Vite was used for authenticated visual QA.
- Production validation is blocked by infrastructure.

## Infrastructure Blockers

Use `BLOCKED_INFRASTRUCTURE` until validated live:

- Vercel Git is still connected to the wrong GitHub repository.
- Fresh Vercel Preview from `Lead-AI-US/lead-ai-platform` is blocked.
- Preview `OPENAI_API_KEY` is missing.
- Firebase live verification is blocked.
- OpenAI live verification is blocked.
- Runtime log verification is blocked.

## Production Activation Steps

1. Merge PR #15 after approval.
2. Grant Vercel GitHub App access to `Lead-AI-US/lead-ai-platform`.
3. Reconnect existing Vercel project `lead-ai-platform`.
4. Add missing Preview `OPENAI_API_KEY`.
5. Create a fresh Git-backed Preview.
6. Run live Firebase, OpenAI, tenant isolation, action engine, automation,
   persistence, runtime log, and visual QA checks.
