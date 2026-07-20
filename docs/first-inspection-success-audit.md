# First Inspection Success Audit

Sprint 3C-1 audit only. This document reviews the current experience immediately after a successful URL inspection and proposes a compact first-inspection success state. No UI, routing, database, authentication, or inspection behavior changes are included in this phase.

## Scope

The audited flow starts when a user submits the URL inspection form and ends when they review the saved completed inspection and decide what to do next.

Relevant routes:

- Submit inspection: `/websites/[id]/inspect`
- View inspection result: `/websites/[id]/inspections/[inspectionId]`
- View inspection history: `/websites/[id]/inspections`

## Relevant Files And Components

- `app/(app)/websites/[id]/inspect/page.tsx`
  - Loads the website, compatible Search Console properties, and URL prefill data.
  - Renders setup blockers when no Google account or compatible property exists.

- `components/url-inspections/inspection-form.tsx`
  - Renders the URL input, Search Console property selector, validation messages, duplicate-submit guard, and pending button label.

- `app/(app)/websites/[id]/inspect/actions.ts`
  - Validates submitted form data.
  - Calls `runSingleUrlInspection`.
  - Redirects completed, failed, and already-in-progress outcomes to `/websites/[id]/inspections/[inspectionId]`.

- `lib/url-inspections/service.ts`
  - Creates the inspection record.
  - Moves it from `PENDING` to `RUNNING`.
  - Calls the Google URL Inspection client.
  - Persists `COMPLETED` or `FAILED` inspection data.

- `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
  - Loads the saved inspection securely.
  - Renders inspection details, sections, and actions.

- `lib/url-inspections/details-page.ts`
  - Verifies authentication, website ownership, organization scope, and inspection ownership.

- `lib/url-inspections/prisma-details-page-repository.ts`
  - Selects only fields used by the inspection details page.

- `app/(app)/websites/[id]/inspections/page.tsx`
  - Shows inspection history, filters, summary cards, and the "Inspect a URL" action.

## Current Successful Inspection Experience

### 1. Submitting A URL

- **Route:** `/websites/[id]/inspect`
- **Current feedback:** The submit button changes from "Inspect URL" to "Inspecting..." while the form action is pending.
- **Current result:** The user is redirected when the server action returns an inspection ID.
- **Available actions before submit:** Back to website, back to URL inventory, choose property, enter URL, submit.
- **Missing guidance:** There is no note that Google inspection can take a moment or that a persisted failed inspection may still redirect to the result page.
- **Potential confusion:** A user may interpret the pending state as a general page load rather than a Google API request being performed server-side.

### 2. Waiting For The Result

- **Route:** `/websites/[id]/inspect`
- **Current feedback:** Only the button-level "Inspecting..." label and disabled submit state.
- **Current result:** No intermediate progress page, toast, banner, or success transition is shown.
- **Available actions:** None while the form is pending beyond normal browser navigation.
- **Missing guidance:** No reassurance that the request is running safely server-side and no expectation-setting for a delayed API response.
- **Potential confusion:** The user may not know whether the inspection was saved until the redirect finishes.

### 3. Viewing The Completed Inspection

- **Route:** `/websites/[id]/inspections/[inspectionId]`
- **Current success feedback:** The page shows the inspection status in a badge. For completed inspections, the raw status value appears as `COMPLETED`.
- **Current result summary:** The page renders sections for:
  - Coverage
  - Indexing Verdict
  - Indexing State
  - Robots State
  - Crawl Information
  - Canonical Information
  - Last Crawl
  - Inspection Timestamps
- **Current available actions:**
  - Reinspect URL
  - Back to inspection history
- **Missing guidance:** There is no explicit "inspection completed" message, no first-use orientation, and no quick explanation of which field matters most.
- **Potential confusion:** `COMPLETED` confirms the inspection request completed, not that the inspected URL is indexed. A first-time user could mistake the technical status for an indexing success.

### 4. Deciding What To Do Next

- **Route:** `/websites/[id]/inspections/[inspectionId]`
- **Current feedback:** The detail sections are visible, but they do not suggest next steps.
- **Current available actions:** Reinspect or return to history.
- **Missing guidance:** No recommended next action for common outcomes, such as inspecting another URL, reviewing history, or reading the full details.
- **Potential confusion:** A user who sees `PASS`, `FAIL`, `Submitted and indexed`, or `Not available` has no short orientation on what those values mean in the IndexPilot workflow.

## Recommended Compact Success State

Add a compact first-inspection success state near the top of the inspection details page, above the detailed sections.

### Sprint 3C-2 Implementation Note

Sprint 3C-2 implements a compact completed-inspection success summary on `/websites/[id]/inspections/[inspectionId]` for saved inspections with `COMPLETED` status. The summary uses existing saved inspection fields, distinguishes request completion from the URL's indexing status, and links to the existing inspect-another-URL and inspection-history routes. First-use detection remains deferred.

### Purpose

The success state should help the user quickly understand:

- The inspection request completed successfully.
- The URL's indexing result still depends on Google's returned verdict and coverage fields.
- The most important result to review first.
- What action to take next.

### Recommended Copy

- **Eyebrow:** First inspection complete
- **Heading:** Google returned an inspection result for this URL.
- **Supporting copy:** Review the indexing verdict and coverage state below, then inspect another URL or compare results in inspection history.

### Recommended Result Summary

Show a concise summary using existing saved fields:

- **Inspection status:** `COMPLETED`
- **Indexing verdict:** `verdict`, or `Not available`
- **Coverage state:** `coverageState`, or `Not available`
- **Inspected URL:** `inspectedUrl`

Use existing badge patterns where possible, but keep the meaning visible in text. Do not imply the URL is indexed unless the stored result actually says so.

### Recommended Actions

Use only existing routes/actions:

1. **View full inspection details**
   - Destination: current route, `/websites/[id]/inspections/[inspectionId]`
   - Use if the success state is later reused outside the details route, such as a future post-submit screen or banner.

2. **Inspect another URL**
   - Destination: `/websites/[id]/inspect`

3. **View inspection history**
   - Destination: `/websites/[id]/inspections`

If the success state is implemented directly on the details page, the "View full inspection details" action can be omitted because the user is already there. In that case, keep only "Inspect another URL" and "View inspection history".

## First-Use Detection Recommendation

Prefer existing inspection data. Do not add persistence or database fields for this milestone.

### Sprint 3C-3 Detection Helper

Sprint 3C-3 adds reusable server-side first-completed-inspection detection in `lib/url-inspections/first-completed-inspection.ts`.

Definition:

- The current inspection must have `status: COMPLETED`.
- The current inspection must have a usable `completedAt` timestamp.
- No earlier `COMPLETED` inspection may exist in the current organization scope.
- Earlier `FAILED`, `PENDING`, or `RUNNING` inspections are ignored.
- Records from another organization are ignored under the current tenancy model.

Ordering uses `completedAt` as the primary timestamp. When two completed inspections have the same `completedAt`, the inspection ID is used as a stable secondary ordering value. The Prisma adapter performs an existence query that selects only `id` and does not load full inspection history.

Fail-safe behavior: if the current inspection is not completed, required data is missing or invalid, or the lookup cannot be determined safely, the helper returns `false` so the normal completed-inspection experience can render without blocking the page.

### Sprint 3C-4 Copy Variation

Sprint 3C-4 passes the first-completed-inspection result into the existing completed-inspection success summary on `/websites/[id]/inspections/[inspectionId]`.

First-use copy:

- **Eyebrow:** First inspection complete
- **Heading:** You completed your first Google URL inspection.
- **Supporting text:** IndexPilot is now ready to help you monitor and understand this website's indexing status.

Normal copy remains unchanged:

- **Eyebrow:** Inspection complete
- **Heading:** Google inspection completed successfully.
- **Supporting text:** Review the result below and decide what to do next.

Fallback behavior: when first-inspection detection is `false` or cannot be determined safely, the page renders the normal completion copy. The indexing-status summary remains unchanged and continues to distinguish inspection completion from the URL's indexed, not-indexed, or unavailable indexing status.

### Organization-Level First Completed Inspection

The cleanest definition for "the user's first completed inspection" in the current app is organization-scoped, because `getCurrentOrganizationContext()` currently resolves `organizationId` from the authenticated user ID.

Recommended query concept:

- Current inspection must have `status: COMPLETED`.
- Count completed inspections for the current organization excluding the current inspection.
- If that count is `0`, treat the current completed inspection as the first completed inspection.

Example condition:

- `organizationId` matches current organization.
- `status` is `COMPLETED`.
- `id` is not the current inspection ID.
- Optional: `completedAt` is earlier than or equal to the current inspection's `completedAt` if deterministic ordering is needed.

### Website-Level Alternative

If the product wants a first success per website rather than per user/organization:

- Count completed inspections for the same `websiteId` excluding the current inspection.
- If the count is `0`, show the first-inspection success state for that website.

### Recommended Starting Point

Start with website-level first completed inspection if the success state appears on a website-scoped route. This matches the current route structure and keeps the experience relevant when users manage multiple websites.

## Accessibility Recommendations

- **Success announcement:** Render the success state as a normal section with clear text. If later implemented client-side after submit without a full navigation, use `role="status"` or an appropriately polite live region.
- **Heading hierarchy:** Keep one page-level app-shell `h1`. Use an `h2` for the success state heading, followed by existing `h3` detail section headings.
- **Icon accessibility:** Use a decorative Lucide success icon with `aria-hidden="true"`. Do not rely on the icon or color alone.
- **Keyboard focus:** After redirect, do not trap focus. If a client-side success banner is introduced later, consider moving focus only when it improves orientation and does not interrupt normal navigation.
- **Result status communication:** Display explicit text such as "Inspection completed" and separately show "Indexing verdict" and "Coverage state".
- **Mobile layout:** Stack summary rows and actions vertically on small screens. Long URLs and coverage values should wrap without horizontal scrolling.

## Prioritized Recommendations

### High Priority

1. **Clarify that inspection completion is not the same as indexed**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** The current `COMPLETED` badge can be mistaken for an indexing success.
   - **Recommendation:** Add copy that separates request completion from Google's indexing verdict and coverage state.

2. **Add a first-inspection success state**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`, `lib/url-inspections/details-page.ts`, `lib/url-inspections/prisma-details-page-repository.ts`
   - **Reason:** First-time users need confirmation and orientation after the first successful inspection.
   - **Recommendation:** Show the compact success state only for the first completed inspection, using existing inspection counts.

3. **Surface the most important result fields first**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** Verdict and coverage are currently available but require scanning multiple sections.
   - **Recommendation:** Include verdict and coverage in the compact success summary.

### Medium Priority

1. **Improve pending-state guidance**
   - **Files:** `components/url-inspections/inspection-form.tsx`
   - **Reason:** The button says "Inspecting..." but does not explain what is happening.
   - **Recommendation:** Add a short, accessible pending note in a later implementation sprint if the request often takes noticeable time.

2. **Use readable status labels consistently**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`, `lib/url-inspections/result-page.ts`
   - **Reason:** The history table formats statuses as "Completed", while details currently displays raw `COMPLETED`.
   - **Recommendation:** Reuse existing badge label helpers on the details page when implementing the success state.

3. **Recommend next actions based on context**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** Current actions are useful but not framed as next steps.
   - **Recommendation:** Group "Inspect another URL" and "View inspection history" under the first-success state.

### Low Priority

1. **Add result orientation helper text**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** Users may not know what coverage, verdict, robots, or canonical values mean.
   - **Recommendation:** Add short explanatory copy later, after the compact success state is in place.

2. **Normalize details-page visual status treatment**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** The page uses raw values in some places and formatted labels elsewhere.
   - **Recommendation:** Reuse the existing `formatInspectionLabel`, `getStatusBadge`, and `getVerdictBadge` patterns where appropriate.

3. **Consider an optional Google result link placement**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Reason:** The current page does not expose `inspectionResultLink`, even though the schema supports it.
   - **Recommendation:** In a later sprint, show a safe external link only when present and validated.

## Current Non-Goals

- Do not add notifications, animations, or celebration effects.
- Do not add new database fields.
- Do not persist first-success dismissal yet.
- Do not change inspection submission behavior.
- Do not implement contextual SEO recommendations.
- Do not display raw Google API responses.
