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
mobile sections. Tables and detailed mobile rewrites remain later Phase 8 work.

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
- Command palette keeps dialog semantics.
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

## Known Limitations

- Lead detail drawer, automation visual builder, full AI Copilot redesign,
  executive analytics polish, and public 3D landing hero are not complete in
  this first implementation batch.
- Browser visual QA depends on available browser tooling.
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
