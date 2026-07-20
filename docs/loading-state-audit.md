# Loading-State Audit

This audit identifies where IndexPilot needs consistent loading and skeleton-state treatment. It follows `docs/design-system.md`, `docs/empty-state-audit.md`, and `docs/dashboard-ui-audit.md`.

Loading states here exclude errors, permission failures, and true empty results. Those states should remain separate so users do not see empty-state messaging before data has finished loading.

## Loading-State Principles

- Preserve the final layout as closely as possible to reduce layout shift.
- Use skeletons for predictable page, card, table, and detail layouts.
- Use disabled button states with clear pending labels for form submissions and short mutations.
- Use inline progress for long-running actions where users stay on the page.
- Avoid full-page blocking when only one section or action is pending.
- Keep loading labels understandable: `Saving...`, `Refreshing...`, `Inspecting...`, and similar action-specific text.
- Expose state to assistive technology where appropriate with `aria-busy`, `role="status"`, or visible text.
- Avoid excessive animation and respect reduced-motion preferences in future skeleton primitives.
- Do not replace database errors, authorization failures, or zero-result states with loading UI.

## Existing Loading Coverage

- `app/(app)/search-console/properties/loading.tsx` provides a route-level skeleton for the Search Console property list.
- `app/(app)/search-console/properties/[propertyId]/loading.tsx` provides a route-level skeleton for property details.
- `app/(app)/websites/[id]/urls/loading.tsx` provides a route-level skeleton for URL inventory.
- Form and mutation controls already use pending labels in components such as `WebsiteForm`, `SitemapForm`, `InspectionForm`, `ReinspectButton`, `ImportSitemapButton`, `TestFetchButton`, `ParseTestButton`, `SitemapActions`, `WebsiteActions`, `GoogleAccountActions`, and `CopyUrlButton`.

## High Priority

### 1. Website List Initial Page Load

1. Screen or component: Websites list
2. Relevant file path: `app/(app)/websites/page.tsx`
3. Trigger condition: Initial navigation to `/websites` while the server query for website cards is pending.
4. Current behavior: No route-level loading file exists; users wait on the route transition with no page-specific skeleton.
5. Recommended loading treatment: Add a route-level skeleton matching the page header, filter bar, and responsive card grid.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header title block, `Add Website` button area, one filter panel around `h-24`, and six website-card placeholders in a `lg:grid-cols-2 xl:grid-cols-3` grid.
8. Accessibility requirements: Wrap skeleton content in a container with `aria-busy="true"` and include a visually available or screen-reader `Loading websites...` status; mark decorative blocks `aria-hidden` if needed.
9. Priority: High

Type: Initial page loading.

Status:

Resolved in Design System Phase 1D-2. `/websites` now has a route-level skeleton matching the header, filter panel, and responsive card grid.

### 2. Website Details Initial Page Load

1. Screen or component: Website details
2. Relevant file path: `app/(app)/websites/[id]/page.tsx`
3. Trigger condition: Direct navigation to a website detail page while website, sitemap count, and imported URL count queries are pending.
4. Current behavior: No route-level loading file exists.
5. Recommended loading treatment: Add a detail-page skeleton with header actions and a details card matching the current `dl` grid.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header with website name/domain, action cluster, and a `Card` containing 12 to 13 detail-row placeholders in `md:grid-cols-2 xl:grid-cols-3`.
8. Accessibility requirements: Provide `Loading website details...` as status text and avoid exposing placeholder rows as real detail labels.
9. Priority: High

Type: Initial page loading.

Status:

Resolved in Design System Phase 1D-2. `/websites/[id]` now has a route-level skeleton matching the header action cluster and website details card.

### 3. Sitemap List Initial Page Load

1. Screen or component: Website sitemap list
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/page.tsx`
3. Trigger condition: Navigation to `/websites/[id]/sitemaps` while the website, sitemap list, and parent sitemap options are loading.
4. Current behavior: No route-level loading file exists.
5. Recommended loading treatment: Add a skeleton matching the header, search/status filter form, sitemap cards, and manual sitemap form location.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header with two action buttons, filter bar around `h-24`, four sitemap-card placeholders in `xl:grid-cols-2`, and a final form-card placeholder near `#add-sitemap`.
8. Accessibility requirements: Use `aria-busy="true"` and a status label such as `Loading sitemaps...`; do not render the first-use empty state until loading finishes.
9. Priority: High

Type: Initial page loading.

### 4. Inspection History Initial Page Load

1. Screen or component: URL inspection history
2. Relevant file path: `app/(app)/websites/[id]/inspections/page.tsx`
3. Trigger condition: Navigation to inspection history while authentication, organization, website, property options, and recent inspections are loading.
4. Current behavior: No route-level loading file exists.
5. Recommended loading treatment: Add a skeleton preserving header actions, summary cards, three filter forms, and the recent-inspections table card.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Page header, optional action/navigation area, four summary-card placeholders, filter row with three panels, and one table surface with six to eight row placeholders.
8. Accessibility requirements: Announce `Loading inspection history...`; keep the skeleton scoped to the page and avoid showing filtered empty states before data resolves.
9. Priority: High

Type: Initial page loading and filtered result loading.

### 5. Inspection Form Data Load

1. Screen or component: Single URL inspection form
2. Relevant file path: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
3. Trigger condition: Navigation to `/websites/[id]/inspect` while website, compatible properties, Google account presence, and optional `urlRecordId` prefill are loading.
4. Current behavior: No route-level loading file exists; the form appears only after all server data resolves.
5. Recommended loading treatment: Add a route-level skeleton matching the header, setup notice area, and form card.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header with two outline links, one form card with URL input, property selector, and submit-button placeholders; reserve notice space only if future implementation can avoid visible jump.
8. Accessibility requirements: Provide `Loading inspection form...`; do not announce missing Google accounts or no-compatible-property states until data is resolved.
9. Priority: High

Type: Initial page loading and authentication resolution.

### 6. Long-Running URL Inspection Submission

1. Screen or component: Inspect URL form submission
2. Relevant file path: `components/url-inspections/inspection-form.tsx`, `app/(app)/websites/[id]/inspect/actions.ts`, `lib/url-inspections/service.ts`
3. Trigger condition: User submits one URL inspection, which may wait on Google URL Inspection API and database persistence.
4. Current behavior: Button disables, duplicate submits are prevented, and label changes to `Inspecting...`.
5. Recommended loading treatment: Keep the disabled button state, then add a small inline status message if inspections commonly take more than a moment.
6. Use: Disabled button state now; inline progress later if latency warrants it.
7. Expected layout dimensions to preserve: The current form height should remain stable; any inline status should occupy a reserved line below the submit button.
8. Accessibility requirements: Pending button text is visible; future inline status should use `role="status"` and should not expose Google raw responses.
9. Priority: High

Type: Long-running inspection request and form submission.

### 7. Sitemap Import Action

1. Screen or component: Sitemap details import action
2. Relevant file path: `components/sitemaps/import-sitemap-button.tsx`, `components/sitemaps/import-summary.tsx`, `lib/sitemaps/importer.ts`
3. Trigger condition: User clicks `Import Sitemap`, which can recursively fetch, parse, and persist sitemap data.
4. Current behavior: Button disables and label changes to `Importing...`; summary appears after completion.
5. Recommended loading treatment: Keep button disabling and add inline progress copy that clarifies the import may continue through child sitemaps.
6. Use: Disabled button state plus inline progress.
7. Expected layout dimensions to preserve: Reserve summary/progress space below the button in the existing `grid gap-3` wrapper so the details header does not jump dramatically.
8. Accessibility requirements: Use `role="status"` for progress text; warnings/errors must remain separate from loading copy and must not include raw XML.
9. Priority: High

Type: Long-running import request.

### 8. Google Property Refresh Action

1. Screen or component: Google account card actions
2. Relevant file path: `components/google/google-account-actions.tsx`, `app/(app)/settings/google/actions.ts`, `lib/google/accounts.ts`
3. Trigger condition: User clicks `Refresh Properties` while IndexPilot refreshes tokens and reconciles Search Console properties.
4. Current behavior: Button disables and label changes to `Refreshing...`; disconnect is also disabled; toast appears after completion.
5. Recommended loading treatment: Keep disabled buttons and add scoped inline refresh status when the property sync can take noticeable time.
6. Use: Disabled button state plus optional inline progress.
7. Expected layout dimensions to preserve: Maintain the Google account card height by reserving a small action-status line near the action buttons or sync metadata.
8. Accessibility requirements: Pending state must be announced with `role="status"`; token errors should remain sanitized error states, not loading text.
9. Priority: High

Type: Background refresh and form/action submission.

## Medium Priority

### 9. Search Console Property List Skeleton Standardization

1. Screen or component: Search Console property list
2. Relevant file path: `app/(app)/search-console/properties/loading.tsx`, `app/(app)/search-console/properties/page.tsx`
3. Trigger condition: Initial load or filter navigation while properties and summary counts are loading.
4. Current behavior: A loading file exists with ad hoc pulsing slate blocks.
5. Recommended loading treatment: Keep the route-level skeleton but align it with the final filter controls, table width, semantic tokens, and reduced-motion guidance.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header, four summary cards, filter panel, and a table/card surface around `h-96`.
8. Accessibility requirements: Add `aria-busy` and `Loading Search Console properties...`; avoid using animation for users who prefer reduced motion.
9. Priority: Medium

Type: Initial page loading and filtered result loading.

Status:

Resolved in Design System Phase 1D-3. The existing property-list loading route now uses the shared Skeleton primitive, semantic tokens, `aria-busy`, status text, and a table-shaped placeholder aligned to the final layout.

### 10. Search Console Property Details Skeleton Standardization

1. Screen or component: Search Console property details
2. Relevant file path: `app/(app)/search-console/properties/[propertyId]/loading.tsx`, `app/(app)/search-console/properties/[propertyId]/page.tsx`
3. Trigger condition: Direct navigation to a property details page while the property, Google account, and optional linked website are loading.
4. Current behavior: A loading file exists with fixed detail-row placeholders.
5. Recommended loading treatment: Keep the skeleton and standardize it to semantic card tokens and accessible busy status.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Title block, status badges, and a details card with 12 row placeholders in the current responsive grid.
8. Accessibility requirements: Include `Loading property details...`; do not select or expose OAuth token fields in loading fixtures or tests.
9. Priority: Medium

Type: Initial page loading.

Status:

Resolved in Design System Phase 1D-3. The existing property-details loading route now uses the shared Skeleton primitive, semantic card tokens, `aria-busy`, status text, and detail-row placeholders aligned to the rendered details grid.

### 11. URL Inventory Skeleton Standardization

1. Screen or component: URL inventory
2. Relevant file path: `app/(app)/websites/[id]/urls/loading.tsx`, `app/(app)/websites/[id]/urls/page.tsx`
3. Trigger condition: Initial load, search, filter, sort, or pagination navigation while inventory data is loading.
4. Current behavior: A route-level skeleton exists with header, summary card, filter, and table placeholders.
5. Recommended loading treatment: Keep the skeleton and align table placeholder width with the final `min-w-[1120px]` table plus pagination area.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header/action area, archived-notice space only when known, four summary cards, filter panel, table area, and pagination bar.
8. Accessibility requirements: Announce `Loading URL inventory...`; avoid showing `No imported URLs yet` or filtered zero states while route data is pending.
9. Priority: Medium

Type: Initial page loading, search results, filtered results, pagination.

Status:

Resolved in Design System Phase 1D-3. The existing URL inventory loading route now uses the shared Skeleton primitive, semantic tokens, `aria-busy`, status text, table-width preservation, and a pagination placeholder.

### 12. Sitemap Details Initial Page Load

1. Screen or component: Sitemap details
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`
3. Trigger condition: Navigation to a sitemap details page while sitemap details, parent sitemap, child sitemaps, and URL counts are loading.
4. Current behavior: No route-level loading file exists.
5. Recommended loading treatment: Add a skeleton matching the header action row, details card, child-sitemap card, and imported-URLs panel.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Header with action buttons, details card with eight to nine detail rows, child sitemap panel, and imported URL placeholder panel.
8. Accessibility requirements: Announce `Loading sitemap details...`; keep action buttons absent or inert until trusted IDs are loaded.
9. Priority: Medium

Type: Initial page loading.

### 13. Inspection Details Initial Page Load

1. Screen or component: Inspection details/result page
2. Relevant file path: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
3. Trigger condition: Direct navigation to an inspection result while authentication, website ownership, and inspection details are loading.
4. Current behavior: No route-level loading file exists.
5. Recommended loading treatment: Add a details skeleton matching the summary header and current result-section cards.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Summary header card with inspected URL line, status/date row, action buttons, and section cards for coverage, verdict, indexing state, robots state, crawl information, canonical information, last crawl, and timestamps.
8. Accessibility requirements: Announce `Loading inspection details...`; never include `rawResponse`, OAuth fields, or real-looking placeholder result values.
9. Priority: Medium

Type: Initial page loading and authentication resolution.

Status:

Resolved in Design System Phase 1D-3. `/websites/[id]/inspections/[inspectionId]` now has a route-level skeleton matching the inspection summary header and result-section cards.

### 14. Website Create/Edit Form Submissions

1. Screen or component: Website create/edit form
2. Relevant file path: `components/websites/website-form.tsx`, `app/(app)/websites/new/page.tsx`, `app/(app)/websites/[id]/edit/page.tsx`
3. Trigger condition: User submits create or edit form while server validation, duplicate-domain checks, and persistence run.
4. Current behavior: Submit button disables and changes to `Saving...`; cancel is disabled.
5. Recommended loading treatment: Keep disabled button state and standardize error reserve spacing if form-level feedback is added.
6. Use: Disabled button state.
7. Expected layout dimensions to preserve: Form card and field grid should not shift except for validation errors associated with fields.
8. Accessibility requirements: Pending state is visible; if a form-level status is added, use `role="status"` and preserve field-level `aria-invalid`.
9. Priority: Medium

Type: Form submission.

### 15. Sitemap Form and Type Edit Submissions

1. Screen or component: Manual sitemap form and sitemap type edit
2. Relevant file path: `components/sitemaps/sitemap-form.tsx`, `components/sitemaps/sitemap-type-form.tsx`
3. Trigger condition: User adds a sitemap or saves sitemap type while validation and duplicate checks run.
4. Current behavior: Buttons disable and use `Saving...`; toast appears after server action.
5. Recommended loading treatment: Keep disabled button state and add inline status only if server latency becomes noticeable.
6. Use: Disabled button state.
7. Expected layout dimensions to preserve: Current form card and details-header tool row should remain stable.
8. Accessibility requirements: Maintain field-level error associations; future inline status should use `role="status"`.
9. Priority: Medium

Type: Form submission.

### 16. Test Fetch and Parse Test Actions

1. Screen or component: Sitemap details test actions
2. Relevant file path: `components/sitemaps/test-fetch-button.tsx`, `components/sitemaps/parse-test-button.tsx`
3. Trigger condition: User clicks `Test Fetch` or `Parse Test` while secure fetching and parsing occur.
4. Current behavior: Buttons disable and labels change to `Testing...` or `Parsing...`; result panels appear after completion.
5. Recommended loading treatment: Keep the disabled button state and reserve/standardize the result panel area for smoother layout.
6. Use: Disabled button state plus optional inline progress.
7. Expected layout dimensions to preserve: Maintain the tool-button row and result panel below each button without pushing neighboring header controls unpredictably.
8. Accessibility requirements: Use action-specific `role="status"` if progress copy is added; do not reveal raw sitemap content.
9. Priority: Medium

Type: Short indeterminate action.

### 17. Search and Filter Route Transitions

1. Screen or component: Server-side search/filter forms across app lists
2. Relevant file path: `app/(app)/websites/page.tsx`, `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/urls/page.tsx`, `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/search-console/properties/page.tsx`
3. Trigger condition: User submits a GET search/filter form and waits for the server-rendered result route.
4. Current behavior: Forms submit normally; only routes with `loading.tsx` show page-specific loading during navigation.
5. Recommended loading treatment: Prefer route-level skeletons that preserve each page's filter and result layout; avoid client-only spinners for these server routes.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: The corresponding filter form, summary area, table/card grid, and pagination where present.
8. Accessibility requirements: Keep the submitted filter values visible after navigation completes; loading state should not announce zero results before the server returns.
9. Priority: Medium

Type: Search results, filtered results, route transition.

## Low Priority

### 18. Dashboard Future Data Loading

1. Screen or component: Dashboard
2. Relevant file path: `app/(app)/dashboard/page.tsx`
3. Trigger condition: Future dashboard summaries, recent activity, or indexing overview panels wait on database/API data.
4. Current behavior: Dashboard currently uses a first-use empty state rather than real dashboard data.
5. Recommended loading treatment: Defer until real dashboard widgets exist; then use section-level skeletons per panel instead of a full-page blocker.
6. Use: Section-level skeleton.
7. Expected layout dimensions to preserve: Future metric cards, recent activity list, and operational panels should each keep their final footprint.
8. Accessibility requirements: Announce only the loading region that is pending; do not hide already loaded dashboard sections.
9. Priority: Low

Type: Section-level loading and future dashboard summaries.

Status:

Deferred after Design System Phase 1D-4. The dashboard currently renders a first-use empty state and has no data widgets to load; add section-level skeletons when real dashboard summaries or activity panels are introduced.

### 19. Top-Level Scaffold Routes

1. Screen or component: Top-level placeholder app sections
2. Relevant file path: `app/(app)/urls/page.tsx`, `app/(app)/sitemaps/page.tsx`, `app/(app)/inspections/page.tsx`, `app/(app)/reports/page.tsx`
3. Trigger condition: Future route data loads for top-level aggregate URL, sitemap, inspection, or report views.
4. Current behavior: These routes are scaffold placeholders with no data loading.
5. Recommended loading treatment: Defer until these pages have real aggregate queries; use skeletons matching their future table or report layout.
6. Use: Skeleton.
7. Expected layout dimensions to preserve: Unknown until aggregate views are designed; document expected table/card dimensions when those phases start.
8. Accessibility requirements: Avoid a generic spinner-only page; use specific loading text such as `Loading reports...` when a route becomes real.
9. Priority: Low

Type: Future initial page loading.

Status:

Resolved in Design System Phase 1D-4. The current top-level scaffold routes now share `PageSurfaceLoading`, which preserves the scaffold footprint with semantic skeletons and route-specific loading announcements.

### 20. Marketing and Auth Placeholder Pages

1. Screen or component: Public marketing and auth placeholders
2. Relevant file path: `app/(marketing)/**/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
3. Trigger condition: Future marketing content or Supabase auth widgets load client-side data.
4. Current behavior: Pages are static or placeholder-only and do not wait on dynamic data.
5. Recommended loading treatment: No loading UI is needed now. Reassess when login/signup forms and dynamic public content are implemented.
6. Use: None currently; disabled button state for future auth submissions.
7. Expected layout dimensions to preserve: Auth card/container dimensions and marketing section rhythm once those forms are built.
8. Accessibility requirements: Future auth pending states should use clear labels such as `Signing in...` and should not trap focus.
9. Priority: Low

Type: Future authentication resolution and form submission.

Status:

Deferred after Design System Phase 1D-4. Current marketing and auth routes are static placeholders and do not wait on dynamic data; add focused auth pending states when real Supabase login and signup forms are implemented.

### 21. Copy URL Action

1. Screen or component: URL inventory row action
2. Relevant file path: `components/urls/copy-url-button.tsx`
3. Trigger condition: User clicks copy URL while clipboard write is pending.
4. Current behavior: Button disables during the short transition and shows toast success/error.
5. Recommended loading treatment: Keep current behavior; no skeleton or spinner is needed for this very short action.
6. Use: Disabled button state.
7. Expected layout dimensions to preserve: Row action button group should not change width materially.
8. Accessibility requirements: If label changes are added later, ensure the copied state is announced or visible through toast semantics.
9. Priority: Low

Type: Short indeterminate action.

Status:

Resolved after Design System Phase 1D-4 review. The existing disabled button state remains the appropriate treatment for this short clipboard action; no skeleton or spinner is needed.

## Implementation Notes

- Add route-level `loading.tsx` files before introducing a reusable skeleton primitive only if repeated markup becomes burdensome.
- If a reusable skeleton primitive is created later, base it on semantic tokens such as `bg-muted`, `border-border`, and `bg-card` instead of raw slate classes.
- Keep skeleton animation restrained and compatible with reduced-motion preferences.
- For long-running operations, prefer visible action-specific pending text over generic spinners.
- Page skeletons should match the final layout closely enough that empty states, tables, and summary cards do not jump into place after data resolves.
- Existing error components and red error panels should remain separate from loading states.

## Completion Summary

High-priority items completed:

- 1. Website List Initial Page Load
- 2. Website Details Initial Page Load

Medium-priority items completed:

- 9. Search Console Property List Skeleton Standardization
- 10. Search Console Property Details Skeleton Standardization
- 11. URL Inventory Skeleton Standardization
- 13. Inspection Details Initial Page Load

Low-priority items completed:

- 19. Top-Level Scaffold Routes
- 21. Copy URL Action

Deferred items:

- 18. Dashboard Future Data Loading: defer until dashboard summaries, recent activity, or indexing overview panels exist.
- 20. Marketing and Auth Placeholder Pages: defer until login/signup forms or dynamic public content exist.
- 3. Sitemap List Initial Page Load
- 4. Inspection History Initial Page Load
- 5. Inspection Form Data Load
- 6. Long-Running URL Inspection Submission
- 7. Sitemap Import Action
- 8. Google Property Refresh Action
- 12. Sitemap Details Initial Page Load
- 14. Website Create/Edit Form Submissions
- 15. Sitemap Form and Type Edit Submissions
- 16. Test Fetch and Parse Test Actions
- 17. Search and Filter Route Transitions

Recommended future improvements:

- Continue adding route-level skeletons in small route-focused passes.
- Consider a table skeleton helper once more table pages share the same loading markup.
- Add inline `role="status"` progress copy for long-running imports and Google synchronization only when real latency warrants it.
