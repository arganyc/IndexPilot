# Sprint 5A-1 Dashboard Intelligence Audit

## Executive Summary

The current Dashboard is an onboarding-led workspace rather than a data-rich intelligence dashboard. It answers “What should I look at first?” reasonably well for incomplete users because the onboarding checklist appears first and marks the current step. For completed users, the answer is less clear: the completed setup card appears first, but the only persistent dashboard body is a generic empty workspace state with broad actions.

The dashboard does not yet include KPI cards, recent inspections, or true dashboard-level insights. That is acceptable at this stage, but future work should avoid pretending those intelligence surfaces exist before the product has reliable dashboard data. The safest next improvement is a small presentation-only orientation treatment that makes the existing first card feel intentionally primary.

## Surfaces Reviewed

- Dashboard route: `app/(app)/dashboard/page.tsx`
- Onboarding checklist and completed state: `components/onboarding/onboarding-checklist.tsx`
- Onboarding completed gate: `components/onboarding/onboarding-completed-gate.tsx`
- Onboarding models and visibility helpers: `components/onboarding/`
- Empty state component: `components/layout/empty-state.tsx`
- App shell and page frame: `components/layout/app-shell.tsx`
- Shared loading scaffold: `components/layout/page-surface-loading.tsx`
- Dashboard tests: `tests/dashboard-onboarding.test.tsx`
- Design reference: `docs/design-system.md`
- Prior dashboard audit: `docs/dashboard-ui-audit.md`

## Page Hierarchy

Current order:

1. App shell `Dashboard` heading
2. Onboarding checklist when onboarding is incomplete
3. Completed setup card when onboarding is complete and not dismissed
4. Generic dashboard empty state

Strengths:

- The first visible card is useful for first-run users.
- The onboarding checklist provides clear progress and a current step.
- The completed state gives concrete next actions: view inspection history or inspect another URL.
- The generic empty state provides broad actions to add a website or connect Google.

Concerns:

- There is no page-level dashboard summary, so the first card does all orientation work.
- After the completed setup card is dismissed, the remaining empty state reads like first-run guidance even for users who may already have websites, Google connection, and inspection history.
- The dashboard does not yet create a strong “look here first” hierarchy for returning users.

## KPI Cards

KPI cards are not currently implemented on the dashboard.

Current behavior:

- No counts, trends, health summaries, or indexing totals render.
- The dashboard does not yet summarize websites, inspections, indexed URLs, not-indexed URLs, or errors.

Assessment:

- This avoids unsupported claims and avoids showing fake data.
- The absence of KPI cards means the dashboard cannot yet answer “what changed?” or “what needs attention?” for returning users.
- Future KPI cards should use real scoped data only and clearly describe their time or result scope.

## Recent Inspections

Recent inspections are not currently implemented on the dashboard.

Current behavior:

- Users can reach inspection history through onboarding completion actions or app navigation.
- The dashboard itself does not show recent inspection rows.

Assessment:

- This keeps the dashboard simple.
- Returning users do not yet get an immediate inspection-focused summary.
- Future recent-inspection work should reuse the history row presentation and safe missing-value conventions from Sprint 4.

## Quick Actions

Current quick actions:

- Incomplete onboarding checklist actions:
  - Connect Google Search Console
  - Choose a Search Console property
  - Inspect your first URL when a website route is available
- Completed onboarding actions:
  - View inspection history
  - Inspect another URL
- Generic empty-state actions:
  - Add Website
  - Connect Google

Strengths:

- Actions are real links and use existing routes.
- The current onboarding step receives primary button emphasis.
- Completed-state actions are relevant and scoped to an existing website when available.

Concerns:

- The generic empty-state actions can compete with the onboarding card because they appear as another prominent action block directly below it.
- For completed users, `Add Website` and `Connect Google` may be useful but do not necessarily represent the best next action.

## Empty States

Current dashboard empty state:

- Component: `components/layout/empty-state.tsx`
- Title: `Your indexing workspace is ready`
- Description: `Add a website, connect Search Console, and start inspecting URLs to populate this dashboard.`
- Actions: `Add Website`, `Connect Google`

Strengths:

- Uses a reusable empty-state component.
- Includes visible heading, supporting copy, icon, and actions.
- Uses semantic theme tokens and existing Button variants.

Concerns:

- It appears even when onboarding is incomplete, so users see both a step-by-step checklist and a broader empty state.
- It also appears after onboarding is complete, where the copy can feel less tailored.
- It is not wrong, but it does not clearly answer what to inspect first on a data-aware dashboard.

## Helper Text

Current helper text:

- Onboarding checklist: `Complete these steps to inspect your first URL.`
- Completed state: explains that Google Search Console is connected, a property is selected, and the first URL inspection is complete.
- Empty state: describes how to populate the dashboard.

Assessment:

- Tone is calm and direct.
- Copy avoids unsupported indexing guarantees.
- Helper text uses established small muted typography.
- The dashboard lacks one explicit orientation sentence that frames the first card as the primary place to begin.

## Spacing

Strengths:

- Dashboard content uses `grid gap-6`, matching the app spacing rhythm.
- Onboarding checklist cards use consistent `Card` spacing.
- Empty state uses the shared spacing pattern from the design system.

Concerns:

- The onboarding card and generic empty state have equal page-level spacing and similar visual weight.
- The empty state can feel like a second competing primary panel rather than a secondary fallback.

## Typography

Strengths:

- The app shell provides the page `h1`.
- Onboarding checklist and completed state use `h2`.
- Checklist step titles use `h3`.
- Helper text uses small muted typography.

Concerns:

- The dashboard page has no visible local section label or helper text above the first dashboard card.
- The generic empty state also uses an `h2`, which is valid but visually competes with the onboarding `h2` because both are major panels.

## Mobile Layout

Strengths:

- The dashboard stacks naturally in one column.
- Onboarding checklist step rows collapse cleanly.
- Onboarding and empty-state action groups stack on mobile.
- Button labels remain visible and touch-friendly.

Concerns:

- On mobile, the checklist and empty state appear as two large blocks, so users may need to scroll through repeated setup-style guidance.
- The completed-state action group is compact, but the following empty state still takes substantial vertical space.

## Loading States

Current behavior:

- No dedicated `app/(app)/dashboard/loading.tsx` route loading state was found.
- The project has shared scaffold loading components such as `components/layout/page-surface-loading.tsx`.

Assessment:

- The dashboard currently performs several server-side checks before rendering onboarding state.
- A dashboard-specific loading skeleton may be useful later, but adding it is larger than the best next 15-20 minute presentation task.
- If added later, it should mirror the onboarding card and empty-state shape to avoid layout shift.

## Accessibility

Strengths:

- The app shell provides a visible `Dashboard` heading.
- Onboarding uses a semantic section, heading, ordered list, and progressbar.
- Progressbar exposes `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Step status is communicated through visible text such as `Completed`, `Current step`, and `Not started`.
- Decorative icons use `aria-hidden`.
- The completed-state dismiss button has an accessible label.
- Empty state uses a labeled section and visible text.

Concerns:

- Multiple high-weight sections can make the reading order feel repetitive rather than decisively prioritized.
- The generic empty state may be read as equally important as the onboarding checklist because both are prominent sections.

## Design-System Compliance

Aligned:

- Uses existing `Card`, `Button`, and reusable empty-state patterns.
- Uses semantic tokens for the onboarding and empty-state components.
- Uses existing Lucide icons as decorative support.
- Preserves visible focus behavior from shared button/link components.
- Uses responsive stacking and readable helper text.

Partially aligned:

- The dashboard page itself does not yet have a reusable dashboard header or intelligence summary pattern.
- The current empty state is a broad scaffold and may need to become secondary once real dashboard intelligence exists.

## Does The Dashboard Answer “What Should I Look At First?”

For incomplete users: mostly yes.

- The onboarding checklist appears first.
- The first incomplete step is marked current.
- The current step receives the primary action treatment.
- Progress is visible.

For completed users: partially.

- The completed setup card appears first when not dismissed.
- It offers useful actions to history and another inspection.
- After dismissal, the page falls back to a generic empty state and no longer gives a clear data-oriented next focus.

For returning users with data: not yet.

- There are no KPI cards, recent inspections, or prioritized issue summaries.
- The dashboard does not yet answer what changed, what needs attention, or where to go first based on inspection outcomes.

## Findings

### High

No high-priority blockers were found in the current dashboard presentation. The onboarding checklist safely covers the first-run path.

### Medium

1. The first dashboard card needs clearer orientation.

- Affected surface: `app/(app)/dashboard/page.tsx`
- Problem: The onboarding checklist is functionally first, but there is no local dashboard orientation telling users that this is the first thing to look at.
- Impact: Users can still proceed, but the page relies on card order alone to communicate priority.

2. Generic empty state competes with onboarding guidance.

- Affected surface: `app/(app)/dashboard/page.tsx`
- Problem: The generic empty state sits directly below onboarding and has its own strong heading and actions.
- Impact: First-run users may see two setup-oriented panels and wonder which action path matters most.

3. Completed dashboard lacks intelligence content.

- Affected surface: `app/(app)/dashboard/page.tsx`
- Problem: Once onboarding is complete or dismissed, the dashboard has no KPI or recent-inspection summary.
- Impact: Returning users do not yet get a prioritized “look here first” answer.

### Low

1. Dashboard loading state is generic or absent.

- Affected surface: future `app/(app)/dashboard/loading.tsx`
- Problem: The dashboard has server-rendered state checks but no route-specific skeleton.
- Impact: Minor for now; future content will benefit from a dashboard-specific skeleton.

2. Dashboard section hierarchy may need refinement once KPI cards arrive.

- Affected surface: future dashboard components
- Problem: The current page has no metric-card or recent-list pattern to evaluate.
- Impact: Low until dashboard intelligence features are implemented.

## Recommended Sprint 5A-2 Implementation

Add one small presentation-only dashboard orientation block above the existing onboarding or completed setup card.

Suggested visible copy:

- Label: `Start here`
- Helper text: `Use the next recommended step below to finish setup or continue inspecting URLs.`

Scope:

- Affected file: `app/(app)/dashboard/page.tsx`
- Use existing small muted typography and spacing.
- Do not change onboarding state, queries, actions, routes, authentication, Prisma, or persistence.
- Do not add KPI cards, recent inspections, charts, analytics, or new data fetching.
- Do not rewrite the onboarding checklist or empty state.

Reason:

- It directly improves the dashboard’s answer to “What should I look at first?” by making the first card’s priority explicit.
- It is presentation-only.
- It affects one dashboard surface.
- It is suitable for a 15-20 minute Codex implementation.

Implementation risk:

- Low. The change can be a small static text block before the existing first dashboard section and can be covered by focused dashboard tests.

## Sprint 5A-2 KPI Card Review

Status: reviewed and deferred.

The requested Sprint 5A-2 scope was to improve the visual hierarchy of Dashboard KPI cards while adding no new metrics, changing no data, and modifying no calculations or business logic. The current dashboard does not render KPI cards, metric cards, dashboard totals, or recent-inspection summary cards. The only card-like dashboard surfaces are the onboarding checklist, the completed onboarding state, and the generic workspace empty state.

Because there are no existing KPI cards to visually refine, application-code changes would require adding a new metric surface or new dashboard data, which is outside this sprint's constraints. No UI code was changed.

Confirmed:

- `app/(app)/dashboard/page.tsx` does not render KPI cards.
- The dashboard data queries are limited to onboarding state checks.
- No dashboard metric calculations were introduced or changed.
- No API, routing, business logic, or data-fetching behavior changed.

Outcome:

- The KPI-card visual hierarchy review is complete.
- KPI-card presentation work remains deferred until dashboard KPI cards exist.
- The prior presentation-only orientation recommendation remains the safest next dashboard improvement that does not introduce new metrics.

## Sprint 5A-3 Dashboard Empty State

Status: completed.

The dashboard empty state was refined with calmer first-run copy and a simpler presentation.

Completed changes:

- Heading changed to `Welcome to IndexPilot`.
- Helper text changed to `Inspect your first URL to begin building insights about how Google sees your website.`
- The existing primary `Add Website` action was preserved.
- No new actions were added.
- The dashboard empty-state icon was removed.
- No metrics, calculations, APIs, routing, authentication, or business logic changed.

## Sprint 5A Validation

Status: production ready.

QA completed:

- Reviewed the Dashboard onboarding checklist, completed onboarding card, and dashboard empty state.
- Confirmed KPI cards are not currently implemented, so no KPI presentation changes were made.
- Confirmed Recent Activity is not currently implemented on the dashboard, so no ordering, pagination, query, or timestamp behavior was changed.
- Confirmed dashboard helper text and empty-state copy remain calm, concise, and free of Google indexing guarantees.

Responsive review completed:

- Dashboard content continues to use the existing single-column `grid gap-6` rhythm.
- Onboarding actions, completed-state actions, and empty-state actions continue to stack on narrow screens.
- Empty-state text remains constrained by the shared `max-w-md` empty-state pattern.

Accessibility reviewed:

- The app shell continues to provide the page `Dashboard` heading.
- Onboarding checklist and completed state retain semantic sections and headings.
- Progress remains exposed through the existing `progressbar` attributes.
- Empty-state content remains visible text and does not rely on iconography.
- Existing action links and dismiss controls keep their accessible names and keyboard behavior.

Validation:

- Focused dashboard tests passed.
- Typecheck passed.
- Lint passed.
- Sprint 5A is ready for production.
