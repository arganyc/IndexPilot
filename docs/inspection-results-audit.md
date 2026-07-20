# Sprint 4A-1 Inspection Results Audit

## Executive Summary

The URL Inspection Details page gives users a secure, readable view of a saved Google URL Inspection result. Completed inspections are the strongest experience today: they include a success summary, indexing-status explanation, actions, field sections, safe fallbacks, and mobile wrapping for long URLs and technical values.

The biggest remaining clarity gap is the non-completed result experience. Pending, running, and failed inspections currently rely on the header status badge while the detailed result sections can still show many `Not available` values. A first-time user may not understand whether the result is still being prepared, failed safely, or simply missing Google-provided fields.

## Surfaces Reviewed

- Inspection Details route: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Inspection Details loading state: `app/(app)/websites/[id]/inspections/[inspectionId]/loading.tsx`
- Safe inspection details repository: `lib/url-inspections/prisma-details-page-repository.ts`
- Inspection details access and selected record type: `lib/url-inspections/details-page.ts`
- Shared result formatting and badge helpers: `lib/url-inspections/result-page.ts`
- Focused result page tests: `tests/url-inspection-result-page.test.tsx`
- Detail loading tests: `tests/detail-loading-states.test.tsx`
- Guidance reference: `docs/contextual-guidance-audit.md`
- Design reference: `docs/design-system.md`

## Findings

### Indexed State

- Clarity: Strong. The completed-inspection summary separates the completed request from the URL indexing status and says indexed visibility can still vary.
- Visual hierarchy: Strong. The success summary appears near the top, with the URL indexing status badge and explanation grouped together.
- Terminology: Consistent with the rest of the product. It uses `URL indexed`, `Coverage state`, and Google-centered language.
- Actionability: Good. Users can inspect another URL or view inspection history without adding unsupported claims.

Sprint 4A-2 indexed presentation status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Presentation: the indexed status now uses a clearer `Indexed` heading, the helper text `Google currently reports this page as indexed.`, and a `Last inspected` timestamp when `completedAt` is available.
- Notes: Not Indexed, Unknown, Error, loading, routing, data loading, and status-detection behavior remain unchanged.

### Not Indexed State

- Clarity: Strong. The page explains that Google currently reports the URL is not indexed and points users to the inspection details.
- Actionability: Good. The `What to check next` list is concise and factual.
- Truthfulness: Good. The copy does not imply IndexPilot can force crawling, indexing, rankings, or search visibility.
- Visual hierarchy: Good. The status explanation remains secondary to the result itself.

Sprint 4A-3 not-indexed presentation status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Presentation: the not-indexed status now uses a clearer `Not Indexed` heading, the helper text `Google currently reports that this page is not indexed.`, the existing `What to check next` guidance list, and a `Last inspected` timestamp when `completedAt` is available.
- Notes: Indexed, Unknown, Error, loading, routing, data loading, and status-detection behavior remain unchanged.

### Unknown State

- Clarity: Adequate. Unknown or unavailable coverage uses a safe fallback explanation.
- Readability: Good. The unknown explanation is visible text and not color-only.
- User risk: Users may still wonder whether `Not available` in the later detail sections means Google omitted a value, the inspection is incomplete, or the URL has a problem.

Sprint 4A-4 unknown presentation status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Copy added: `Unknown`, `Google did not return a clear indexing status for this page.`, and `This result does not confirm whether the page is indexed.`
- Uncertainty safeguard: the copy avoids implying that the page is indexed, not indexed, unseen by Google, or that IndexPilot can determine a status Google did not provide.
- Timestamp behavior: the presentation shows `Last inspected` using `completedAt` when available and omits the timestamp section entirely when unavailable or invalid.
- Notes: Indexed, Not Indexed, Error, loading, routing, data loading, and status-detection behavior remain unchanged.

### Inspection Error State

- Clarity: Needs improvement. A failed inspection shows the `FAILED` status badge in the header, but the page does not provide a compact explanation near the result area.
- Visual hierarchy: Weak for this state. The detailed sections remain visible and may show multiple `Not available` values, which can distract from the fact that the inspection itself failed.
- Security: Good. The current details query does not select `rawResponse`, OAuth tokens, refresh tokens, or credentials.
- Actionability: Limited. Users can use the existing `Reinspect URL` action, but the page does not explain that failed inspections do not have a completed Google result to review.

Sprint 4A-5 inspection error presentation status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- User-facing copy: `Inspection unavailable`, `Google could not complete this inspection.`, and `Try again later. If the issue continues, confirm that your Google connection and Search Console property are still available.`
- Retry behavior: the existing `Reinspect URL` submit action remains unchanged; no new retry control, loading state, or request logic was added.
- Technical details: raw API payloads, stack traces, provider details, tokens, and internal codes are not used as the primary user-facing message.
- Accessibility considerations: the error heading is semantic within the page hierarchy, the explanation is visible text, and the copy wraps using the existing muted-text pattern.

### Missing or Unavailable Values

- Clarity: Consistent but under-explained. Missing values render as `Not available`, which matches the design-system guidance.
- Readability: Good. Values use wrapping utilities such as `break-words`.
- User risk: Repeated `Not available` rows can look like a problem when the result is pending, running, failed, or when Google simply did not return a field.

### Loading Transition

- Clarity: Strong. The route has a dedicated skeleton that preserves the expected page shape.
- Accessibility: Strong. The loading wrapper uses `aria-busy="true"` and a screen-reader status message.
- Layout stability: Strong. The skeleton mirrors the header and detail-card structure and avoids showing empty states while loading.

### Mobile Layout

- Long URL handling: Good. The inspected URL uses `break-all`, and detail values use `break-words`.
- Responsive structure: Good. Header actions wrap, the completed summary stacks on smaller screens, and detail grids collapse.
- Risk: The repeated detail cards can feel visually heavy on mobile when an inspection is not completed and most values are unavailable.

## Accessibility Observations

- The page uses visible text for statuses and explanations, so meaning is not communicated by color alone.
- Decorative success icons use `aria-hidden="true"`.
- The indexing-status explanation is associated with the status region through `aria-describedby`.
- Loading state has a screen-reader status message and does not expose decorative skeletons as meaningful content.
- The page should continue preserving one clear primary page heading in the app shell context and logical section headings inside the result content.
- Any future non-completed-state helper should be visible text, not a tooltip-only explanation.

## Mobile Observations

- Long inspected URLs and canonical values wrap safely.
- Action buttons stack or wrap without requiring horizontal scrolling.
- Detail rows remain readable because grids collapse at narrower widths.
- Non-completed inspections can still feel dense on mobile because the user sees many unavailable fields before receiving a clear explanation of why details may be missing.

## Prioritized Recommendations

### High

Add one compact non-completed inspection state explanation to the Inspection Details page.

- Affected surface: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Problem: Pending, running, and failed inspections currently rely mainly on the raw status badge while detailed sections may show many `Not available` values.
- Recommended correction: Render a small, status-aware explanation near the top of the result page when `inspection.status` is `PENDING`, `RUNNING`, or `FAILED`.
- Suggested copy:
  - Pending: `This inspection has been queued. Google result details will appear after the inspection runs.`
  - Running: `This inspection is currently running. Google result details are not available yet.`
  - Failed: `This inspection did not complete successfully. Result details may be unavailable, and sensitive error details are not shown.`
- Reason: This improves clarity for inspection error and in-progress states without changing data loading, routing, authentication, or Google integration.
- Implementation risk: Low. It uses the already loaded `inspection.status` and can reuse existing Card, Badge, or muted-text patterns.

## Recommended Sprint 4A-2 Task

Implement the high-priority recommendation above: add a compact, status-aware non-completed inspection explanation to the existing Inspection Details page for `PENDING`, `RUNNING`, and `FAILED` statuses.

This task should affect only the inspection details result surface, require no API changes, require no database changes, require no routing changes, and require no authentication changes.
