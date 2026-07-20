# Sprint 6C-1 Project Dashboard Audit

## Executive Summary

IndexPilot does not currently have a separate route named "Project Dashboard." The closest existing surface is the selected website workspace overview at `/websites/[id]`. In current product language, a project maps to a website workspace that organizes sitemaps, URL inventory, URL inspections, and website metadata.

The selected project page gives users a reasonable overview within 10 seconds for static website setup: project name, status, domain, priority, imported URL count, and sitemap count are all visible. It is weaker as a project dashboard because project navigation, management actions, and destructive actions share the same header action area. Recent inspections are not shown on this page, and deeper project state still requires navigating to Inspection History, URL Inventory, or Sitemaps.

The safest next improvement is presentation-only: separate project section navigation from management actions on `/websites/[id]` so users can immediately see where to go next inside the project.

## Surfaces Reviewed

- Project dashboard equivalent: `app/(app)/websites/[id]/page.tsx`
- Project dashboard loading state: `app/(app)/websites/[id]/loading.tsx`
- Project navigation: `components/websites/website-navigation.tsx`
- Active project indicator: `components/websites/active-project-indicator.tsx`
- Website status badge: `components/websites/website-status-badge.tsx`
- Website management actions: `components/websites/website-actions.tsx`
- Website list context: `app/(app)/websites/page.tsx`
- Global dashboard context: `app/(app)/dashboard/page.tsx`
- Inspection history context: `app/(app)/websites/[id]/inspections/page.tsx`
- Design reference: `docs/design-system.md`
- Related audits: `docs/projects-experience-audit.md`, `docs/website-management-audit.md`, `docs/website-health-audit.md`

## Current Route And Purpose

Route: `/websites/[id]`

Current purpose:

- Show the selected website workspace.
- Provide project-level setup and discovery signals.
- Link to website-scoped sections.
- Allow editing, archiving, restoring, or deleting the website record.

This page is effectively the current Project Dashboard, even though the visible heading uses the website name rather than the word "Project."

## Page Hierarchy

The current hierarchy is:

1. Website name
2. `Current project` indicator
3. Website status badge
4. Helper text explaining that the workspace organizes sitemaps, URL inventory, and inspections
5. Domain
6. Action cluster with Back, Edit, website navigation, and website actions
7. `Website Overview` card
8. Summary rows
9. Metadata rows

Strengths:

- The selected project name is prominent.
- The active project indicator is visible and text-based.
- Website status is visible with a consistent status badge.
- The overview card now puts operational summary rows before supporting metadata.

Weakness:

- Project navigation and management actions are visually merged. A user scanning quickly sees many buttons but may not immediately understand which controls navigate within the project versus which controls modify the project.

## Project Summary

The header provides:

- Website name
- `Current project` badge
- Website status
- Project helper text
- Domain

This is enough to confirm which project is open. The helper text is useful and truthful: it says the workspace organizes sitemaps, URL inventory, and inspections, and it avoids implying IndexPilot controls Google indexing.

## Quick Actions

Current header actions include:

- Back
- Edit
- Website Details
- Sitemaps
- URL Inventory
- Inspection History
- Archive or Restore
- Delete

These are all useful, but their grouping is unclear. Navigation links and management actions sit together in one flex-wrapped area. On mobile, the action cluster can become dense, and the most important project navigation paths are easier to miss.

No new quick action should be added yet. The existing routes are enough; they need clearer visual grouping.

## Website Summary

The `Website Overview` card contains two definition-list groups:

- `Website health summary`
  - Status
  - Priority
  - Imported URL count
  - Sitemap count
- `Website metadata`
  - Name
  - Domain
  - Protocol
  - Platform
  - Notes
  - Created date
  - Updated date
  - Google connected
  - IndexNow enabled

Strengths:

- Summary information appears before metadata.
- Counts are easy to scan.
- Labels are visible and do not rely on color.
- The definition-list structure is appropriate for label/value content.

Weaknesses:

- `Google connected` and `IndexNow enabled` are currently placeholder-style values. They are safe and visible, but they may make the dashboard feel less complete until real values are available.
- No recent inspection state appears on the page.

## Recent Inspections

Recent inspections are not rendered on `/websites/[id]`.

Inspection state is available on `/websites/[id]/inspections`, which includes:

- Summary cards for the latest 25 inspections
- Recent inspection table
- Search, status, and property filters
- First-use and filtered empty states

Assessment:

- This separation is truthful and avoids adding new queries to the project dashboard.
- Users cannot understand recent inspection activity within 10 seconds from the project dashboard itself.
- Adding recent inspection data would require a data/query decision and is out of scope for the next presentation-only task.

## Helper Text

Current helper text:

`Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions.`

Assessment:

- Clear and accurate.
- Avoids implying indexing control.
- Uses the established `text-sm leading-6 text-muted-foreground` pattern.
- Fits the design-system guidance for calm, operational helper text.

No helper-text rewrite is recommended for the next sprint.

## Empty States

The selected project dashboard does not have a full-page empty state because a website record must exist for the route to render. Instead, unavailable or not-yet-backed values appear as visible placeholders in metadata rows such as:

- `Google connected`: `No`
- `IndexNow enabled`: `No`
- `Notes`: `No notes.`

Assessment:

- Missing values are visible and not rendered as `null`, `undefined`, or empty labels.
- Placeholder values are not currently the biggest 10-second comprehension issue.

## Loading States

`app/(app)/websites/[id]/loading.tsx` provides:

- `aria-busy="true"`
- `aria-live="polite"`
- Screen-reader status text: `Loading website details...`
- Header skeleton
- Action skeletons
- Details card skeletons

Strengths:

- Loading state preserves the broad final layout.
- Skeletons use the existing `Skeleton` component.
- Screen-reader status is present.

Potential mismatch:

- The loading state still resembles a larger flat details grid more than the current summary-first grouping. This is low priority because it does not affect the loaded dashboard.

## Spacing And Typography

Aligned with the design system:

- Page container uses `grid gap-6`.
- Header uses responsive flex wrapping.
- Helper text uses readable muted typography.
- Summary rows use compact label/value hierarchy.
- Card content uses `grid gap-6`.
- Summary and metadata grids stack on mobile.

Minor inconsistency:

- Detail rows still use some raw slate utility classes rather than semantic tokens. This is common across older app surfaces and should be handled in a broader visual consistency pass rather than this sprint.

## Responsive Layout

Mobile behavior is mostly sound:

- Header content stacks on small screens.
- Summary rows become one column before expanding at larger breakpoints.
- Metadata rows become one column before expanding.
- Buttons and navigation wrap.

Mobile concern:

- The header action area can become visually dense because project navigation and project management actions are not separated.

## Accessibility

Strengths:

- Status is visible text inside `WebsiteStatusBadge`.
- Active project state is visible text through `Current project`.
- `WebsiteNavigation` uses a named `nav` region and `aria-current="page"`.
- Buttons and links use descriptive visible labels.
- Definition lists expose label/value relationships.

Concerns:

- Because navigation and management actions are visually grouped together, keyboard users encounter many controls in one cluster without a clear visual distinction between "go somewhere" and "modify this project."
- The primary visible page heading is an `h2`, consistent with existing app pages but worth revisiting in a future heading-hierarchy pass if the app shell does not provide the page `h1`.

## Can Users Understand The Current Project State Within 10 Seconds?

Partially.

Users can quickly understand:

- Which project is open.
- Whether the project is active, paused, or archived.
- The website domain.
- Priority.
- Imported URL count.
- Sitemap count.

Users cannot quickly understand:

- Whether recent inspections succeeded or failed.
- Whether there are recent indexing issues.
- Which header controls are project navigation versus project management.
- The next best action after landing on the page.

The strongest near-term improvement is to clarify the existing navigation/actions hierarchy without adding new data.

## Findings

### High Priority

No high-priority blocker was found. The project dashboard equivalent renders, identifies the active project, and exposes project sections.

### Medium Priority

1. Project navigation is visually mixed with management actions.
   - Affected surface: `app/(app)/websites/[id]/page.tsx`
   - Exact problem: Back, Edit, Website Details, Sitemaps, URL Inventory, Inspection History, Archive/Restore, and Delete appear in one header action area.
   - Recommended correction: separate `WebsiteNavigation` into its own small project-sections row beneath the header content, while keeping management actions grouped separately.
   - Reason: helps users understand how to navigate the project within 10 seconds without adding routes, data, or new behavior.
   - Implementation risk: Low.
   - Status: Completed in Sprint 6C-3.

2. Recent inspection state is not visible from the project dashboard.
   - Affected surface: `/websites/[id]`
   - Exact problem: users must open Inspection History to understand recent inspection outcomes.
   - Recommended correction: defer until a data-backed project dashboard sprint because this would require query and product-scope decisions.
   - Reason: not presentation-only.
   - Implementation risk: Medium.

3. Placeholder-like metadata may reduce confidence.
   - Affected surface: Website Overview metadata rows
   - Exact problem: `Google connected` and `IndexNow enabled` currently show `No`, which may be interpreted as meaningful configuration state even if the product does not yet fully support the field.
   - Recommended correction: defer until the underlying data source and product meaning are confirmed.
   - Reason: changing labels or values could alter product meaning.
   - Implementation risk: Medium.

### Low Priority

1. Loading skeleton does not fully mirror summary-first grouping.
   - Affected surface: `app/(app)/websites/[id]/loading.tsx`
   - Recommended correction: in a future loading-state pass, align skeleton row counts and grouping with the loaded `Website Overview` structure.
   - Reason: minor loading polish.
   - Implementation risk: Low.

2. Detail rows mix raw slate utilities with semantic tokens.
   - Affected surface: `DetailRow` in `app/(app)/websites/[id]/page.tsx`
   - Recommended correction: align with semantic tokens during a future design-system consistency pass.
   - Reason: visual consistency.
   - Implementation risk: Low.

3. Project summary hierarchy can be stronger.
   - Affected surface: header summary in `app/(app)/websites/[id]/page.tsx`
   - Recommended correction: make the project name visually dominant and group domain, active-project state, and website status as secondary metadata.
   - Reason: improves 10-second comprehension without adding metrics or changing logic.
   - Implementation risk: Low.
   - Status: Completed in Sprint 6C-2.

## Recommended Sprint 6C-2 Implementation

Improve only the presentation of project navigation on `/websites/[id]`.

Recommended implementation:

- Move the existing `WebsiteNavigation` out of the mixed header action cluster.
- Place it in a dedicated row directly below the project header.
- Add a small visible label such as `Project sections`.
- Keep the existing navigation links, destinations, active state, and `aria-current` behavior unchanged.
- Keep Back, Edit, Archive/Restore, and Delete as management actions in the header action area.

Why this is the best next task:

- It is presentation-only.
- It affects one project dashboard surface.
- It reuses the existing `WebsiteNavigation` component.
- It requires no API, database, routing, authentication, or business-logic changes.
- It improves 10-second comprehension by separating project navigation from project management.
- It is suitable for a 15-20 minute implementation.

Out of scope for the next sprint:

- Adding recent inspection data to the dashboard.
- Adding new quick actions.
- Changing route destinations.
- Changing website status logic.
- Changing summary-card calculations.
- Renaming routes or data models.

## Sprint 6C-2 Update

Completed the Project Summary hierarchy refinement on `/websites/[id]`.

Changes completed:

- Made the project name the dominant visual element in the header.
- Grouped `Current project`, website status, and domain as supporting metadata.
- Kept the existing helper text, actions, route destinations, status values, summary counts, and business logic unchanged.
- Preserved responsive wrapping for long project names and domains.

No other project-dashboard recommendations were implemented in this sprint.

## Sprint 6C-3 Update

Completed the Quick Actions presentation refinement on `/websites/[id]`.

Changes completed:

- Grouped project management controls under `Project actions`.
- Grouped project navigation under `Project sections`.
- Preserved the existing Back, Edit, archive/restore, delete, and section-navigation destinations and behavior.
- Added explicit label associations for both action groups during final QA.

## Sprint 6C-4 Update

Completed the Recent Inspections presentation refinement on the project-scoped inspection history surface.

Changes completed:

- Kept the inspected URL as the primary row content.
- Kept status easy to scan in its existing table column.
- Kept the timestamp visually secondary with the existing `Inspected` label and date formatter.
- Preserved existing ordering, actions, filters, and inspection data.

## Sprint 6C Validation

- QA completed: Yes.
- Responsive review completed: Yes.
- Accessibility reviewed: Yes.
- Tests passed: Yes.
- Typecheck passed: Yes.
- Lint passed: Yes.
- Production ready: Yes.
