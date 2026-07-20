# Dashboard UI Audit

This audit compares the current dashboard experience against `docs/design-system.md`. It is documentation-only and does not propose visual changes outside a future implementation phase.

## Files Inspected

- `app/(app)/dashboard/page.tsx`
- `app/(app)/layout.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/page-surface.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `docs/design-system.md`

## Existing Dashboard Components

### Dashboard Route

File: `app/(app)/dashboard/page.tsx`

The dashboard page currently renders only:

- `PageSurface` with `title="Dashboard"`

There are no dashboard-specific cards, buttons, badges, tables, metrics, charts, or workflow panels yet.

### App Shell

File: `components/layout/app-shell.tsx`

The authenticated dashboard is wrapped by `AppShell` through `app/(app)/layout.tsx`.

Current shell elements:

- Fixed desktop sidebar
- Desktop primary navigation
- Sticky top header
- Mobile horizontal navigation
- App brand mark using `ShieldCheck`
- Page title derived from the current pathname
- Small `Phase 2` status label in the header
- Main content region with responsive padding

### Dashboard Placeholder Surface

File: `components/layout/page-surface.tsx`

`PageSurface` renders a full-height dashed placeholder section with a screen-reader-only `h2`. It currently uses raw slate and white classes rather than semantic design-system tokens.

### Dashboard Cards, Buttons, and Badges

There are no dashboard-specific cards, buttons, or badges on the current dashboard page. Future dashboard work should use:

- `components/ui/card.tsx` for dashboard metric cards and panels
- `components/ui/button.tsx` for actions
- `components/ui/badge.tsx` for statuses

## Design-System Inconsistencies

### High Priority

1. Raw slate and teal colors bypass semantic theme tokens.

Relevant files:

- `components/layout/app-shell.tsx`
- `components/layout/page-surface.tsx`

The design system says app UI should prefer semantic tokens such as `background`, `foreground`, `muted`, `border`, `primary`, and `accent`. `AppShell` currently uses hard-coded classes such as `bg-slate-50`, `text-slate-950`, `border-slate-200`, `bg-teal-600`, and `text-teal-800`.

Recommendation:

Standardize the shell on semantic tokens before building more dashboard UI so future dashboard cards inherit a stable visual foundation.

2. Active navigation state is visual but not exposed semantically.

Relevant file:

- `components/layout/app-shell.tsx`

The active sidebar and mobile navigation links use visual classes, but the links do not set `aria-current="page"`.

Recommendation:

Add `aria-current="page"` to active desktop and mobile navigation links in a future implementation pass.

### Medium Priority

1. The placeholder surface does not use the reusable Card system.

Relevant file:

- `components/layout/page-surface.tsx`

`PageSurface` uses a custom dashed bordered section. This is acceptable for scaffolding, but it does not align with the documented Card pattern for reusable panels.

Recommendation:

When the dashboard receives real content, replace or retire `PageSurface` in favor of purpose-built dashboard cards, empty states, or sections using existing `Card` primitives.

2. The app shell brand mark uses a local teal treatment instead of shared brand semantics.

Relevant file:

- `components/layout/app-shell.tsx`

The shell brand mark is visually distinct from the marketing `BrandMark`, which uses semantic tokens.

Recommendation:

Introduce or reuse a shared app brand mark pattern so authenticated and public surfaces feel connected without duplicating color decisions.

3. Page title sizing is smaller than the documented H1 guidance.

Relevant file:

- `components/layout/app-shell.tsx`

The shell header renders the page title as an `h1` with `text-lg`. The design system recommends larger H1 treatment for main page titles.

Recommendation:

Decide whether authenticated pages should use compact shell-level titles or page-level H1s. If the compact shell title remains the primary H1, document that exception or introduce a page header component for dashboard pages.

4. Status label styling is custom and temporary.

Relevant file:

- `components/layout/app-shell.tsx`

The `Phase 2` label uses a custom bordered `div` rather than `Badge`.

Recommendation:

If this label remains, render it with `Badge variant="outline"` or remove it when no longer useful.

### Low Priority

1. Placeholder border radius differs from the Card primitive.

Relevant file:

- `components/layout/page-surface.tsx`

`PageSurface` uses `rounded-lg`, while the Card primitive uses `rounded-xl`.

Recommendation:

Retire the placeholder or align temporary surfaces with Card radius when future dashboard panels are introduced.

Status:

Resolved in Design System Phase 1B-2. `PageSurface` now uses `rounded-xl`, semantic `border-border`, and `bg-card` while remaining a scaffold placeholder.

2. The dashboard page has no reusable page header component.

Relevant files:

- `app/(app)/dashboard/page.tsx`
- `components/layout/app-shell.tsx`

The page title currently comes from the shell. This is fine for the placeholder, but future dashboards may need title, description, actions, and metadata in a consistent page-header pattern.

Recommendation:

Create a reusable app page-header pattern before adding dashboard metrics and actions.

Status:

Partially improved in Design System Phase 1B-3. The shell title hierarchy was strengthened, but a reusable page-header component is intentionally deferred until real dashboard content exists.

## Accessibility Concerns

### High Priority

1. Active navigation should use `aria-current`.

Relevant file:

- `components/layout/app-shell.tsx`

Screen reader users should receive the same active-route information that sighted users receive visually.

### Medium Priority

1. No skip link is present for bypassing navigation.

Relevant file:

- `components/layout/app-shell.tsx`

The shell includes a fixed sidebar and mobile navigation before the main content.

Recommendation:

Add a visually hidden skip link that becomes visible on focus and targets the main content region.

2. Mobile navigation is horizontally scrollable without an explicit affordance.

Relevant file:

- `components/layout/app-shell.tsx`

The mobile nav uses `overflow-x-auto`. This preserves access to all links, but users may not immediately know more items are available off-screen.

Recommendation:

In a future shell polish pass, confirm mobile navigation scroll behavior visually and consider a more explicit mobile navigation pattern if it becomes hard to use.

### Low Priority

1. The placeholder surface communicates no visible empty-state content.

Relevant file:

- `components/layout/page-surface.tsx`

The section is intentionally empty during scaffolding. Once the dashboard has a real first-use state, it should include visible text and a clear next action.

## Responsive Concerns

### Medium Priority

1. The fixed sidebar and sticky header pattern should be verified with real dashboard content.

Relevant files:

- `components/layout/app-shell.tsx`
- `app/(app)/dashboard/page.tsx`

Current dashboard content is empty, so overflow, card wrapping, and table behavior cannot be validated yet.

Recommendation:

When dashboard cards are added, verify that cards stack cleanly on mobile, avoid horizontal scrolling, and respect the shell's `px-4 sm:px-6 lg:px-8` main padding.

2. Mobile navigation may become crowded as app sections grow.

Relevant file:

- `components/layout/app-shell.tsx`

The existing horizontal nav works with the current route count but may become less comfortable as more app routes are added.

Recommendation:

Before adding more top-level application routes, standardize a mobile navigation pattern.

## Reusable Components To Standardize

### High Priority

1. App navigation item

Relevant file:

- `components/layout/app-shell.tsx`

Both desktop and mobile navigation map over the same data but repeat similar link styling and active-state logic.

Recommendation:

Extract a small internal navigation item helper or component that handles active styles, icons, labels, and `aria-current`.

2. App page header

Relevant files:

- `components/layout/app-shell.tsx`
- Future dashboard pages

Recommendation:

Standardize a page header pattern for title, description, primary action, secondary action, and status badges before building the real dashboard.

### Medium Priority

1. Empty state component

Relevant file:

- `components/layout/page-surface.tsx`

Recommendation:

Replace placeholder-only surfaces with a reusable empty-state component using semantic tokens, optional icon, visible heading, body text, and optional action.

2. Dashboard metric card

Relevant components:

- `components/ui/card.tsx`
- Future dashboard files

Recommendation:

Create a metric-card pattern using `Card`, `CardHeader`, `CardTitle`, and `CardContent` before adding dashboard statistics.

3. Status badge mapping

Relevant components:

- `components/ui/badge.tsx`
- Future dashboard files

Recommendation:

Create a shared mapping for common dashboard states such as indexed, not indexed, pending, warning, and error.

### Low Priority

1. Shared brand mark for app shell and marketing

Relevant files:

- `components/layout/app-shell.tsx`
- `components/marketing/brand-mark.tsx`

Recommendation:

Consider extracting a shared low-level mark once the final brand direction stabilizes.

Status:

Deferred. Design System Phase 1B-4 kept the current app-shell mark and only tightened icon alignment, because creating a shared brand primitive would be premature before final brand direction.

## Recommended Implementation Order

1. High: Update `components/layout/app-shell.tsx` navigation links with semantic active state support and `aria-current`.
2. High: Convert `AppShell` color usage from raw slate/teal utilities to semantic design-system tokens.
3. High: Extract or standardize app navigation item logic inside `components/layout/app-shell.tsx`.
4. Medium: Decide and document the authenticated app H1/page-header pattern.
5. Medium: Replace `PageSurface` with a reusable empty-state component or remove it when real dashboard content is added.
6. Medium: Create reusable dashboard metric-card and dashboard section patterns using `components/ui/card.tsx`.
7. Medium: Standardize status badge mappings for indexing-oriented states.
8. Low: Align temporary placeholder radius and border treatment with the Card primitive if `PageSurface` remains.
9. Low: Revisit app and marketing brand mark consistency after the final logo direction is defined.

## Summary

The dashboard is currently a scaffold, not a designed dashboard. Most visible UI comes from `AppShell`, while the page itself renders an empty placeholder. The most important design-system work before dashboard implementation is to standardize shell colors, expose active navigation semantically, and create reusable app page-header, empty-state, metric-card, and status-badge patterns.
