# Inspection Details Audit

## Executive Summary

The Inspection Details page gives users a secure, complete view of one saved Google URL Inspection record. The current experience is strongest at access safety, long-value wrapping, clear result summaries for completed inspections, and consistent `Not available` fallbacks.

The main presentation opportunity is section scanability. After the header and status summary, users encounter a long sequence of similarly weighted cards. Coverage, Indexing Verdict, Indexing State, and Robots State are closely related indexing signals, but they are presented as four separate cards with repeated structure. This makes the page feel longer than the information requires, especially on mobile.

## Surfaces Reviewed

- Inspection Details page: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Inspection Details loading state: `app/(app)/websites/[id]/inspections/[inspectionId]/loading.tsx`
- Safe details data type and access helper: `lib/url-inspections/details-page.ts`
- Safe Prisma details repository: `lib/url-inspections/prisma-details-page-repository.ts`
- Existing focused tests: `tests/url-inspection-result-page.test.tsx`
- Design reference: `docs/design-system.md`

## Page Hierarchy

- The page starts with a compact header containing the page context, `Inspection Details` heading, inspected URL, status badge, created date, Reinspect action, and back link.
- Completed inspections then show a prominent result summary with first-use or normal completion copy.
- Failed inspections show `Inspection unavailable` copy before the details sections.
- Detailed fields follow as individual cards.

The hierarchy is understandable, but the header and detailed sections use different visual vocabularies: the header uses raw slate utility classes, while the completed and error summaries use more semantic theme tokens. This is not currently blocking, but future polish should prefer semantic tokens where practical.

## Section Order

Current order:

1. Header
2. Completed result summary, when status is `COMPLETED`
3. Failed result summary, when status is `FAILED`
4. Coverage
5. Indexing Verdict
6. Indexing State
7. Robots State
8. Crawl Information
9. Canonical Information
10. Last Crawl
11. Inspection Timestamps

This order generally follows the user's likely mental model: result summary first, indexing fields next, crawl and canonical context after that, then timestamps. The ordering is sound.

## Field Grouping

- Coverage, Indexing Verdict, Indexing State, and Robots State are closely related but currently rendered as four separate cards.
- Crawl Information is grouped well with Page Fetch State and Crawled As.
- Canonical Information is grouped well with user-declared and Google-selected canonical values.
- Last Crawl and Inspection Timestamps are separate, which is acceptable because one is a Google crawl signal and the other is IndexPilot record lifecycle metadata.

The biggest grouping issue is the four separate indexing-signal cards. They create repeated headings, repeated card chrome, and extra vertical travel for related values.

## Helper Text

- Completed results have clear helper text for Indexed, Not Indexed, and Unknown states.
- Not Indexed includes a concise `What to check next` list.
- Failed inspections have a safe, user-facing `Inspection unavailable` message.
- The individual detail sections do not include helper text, which is mostly appropriate because the page should stay dense and operational.

No additional helper text is recommended in the next sprint. The page already has enough explanation near the primary result state.

## Missing Values

- Missing string values render as `Not available`.
- Missing or invalid dates render as `Not available`.
- Sections remain visible when values are missing, which avoids layout surprises.
- The repeated `Not available` text can become visually noisy when several indexing fields are missing, especially for pending, running, or failed records.

The missing-value behavior is safe and consistent with the design system.

## Spacing

- The main page uses `grid gap-6`, which matches the app spacing rhythm.
- Detail rows use `gap-1`, `p-3`, and subtle bordered surfaces, which works well for grouped rows.
- Single-value cards use full card spacing for one short value, which contributes to vertical length.
- The completed and failed summary cards have comfortable spacing and a clearer internal hierarchy than the standalone field cards.

## Typography

- Section headings use `h3` inside `CardTitle`, which preserves logical page structure below the page heading.
- Detail labels use small uppercase text, consistent with compact metadata.
- Values use readable small text with wrapping utilities.
- The inspected URL uses `break-all` to avoid overflow.
- Some older raw slate classes remain, but the typography itself is generally consistent.

## Mobile Layout

- The page stacks naturally because the outer layout is a single-column grid.
- Long URLs and technical values use `break-all` or `break-words`.
- Detail row grids collapse from two or three columns to one column on small screens.
- The long sequence of single-field cards makes mobile scanning slower than necessary.

## Accessibility

- The page uses visible headings and visible status text.
- Decorative icons use `aria-hidden`.
- The completed-status explanation is associated with the status area via `aria-describedby`.
- Detail sections use semantic headings.
- Grouped detail rows use definition-list markup.
- Missing values are visible text, not color-only.
- Reinspect and back actions remain keyboard reachable.

One structural concern: several single-value detail sections are not definition lists. This is acceptable, but grouped field presentation would make labels and values more consistent for assistive technology.

## Findings

### Strengths

- Secure server-side loading and scoped access are clear in the supporting repository and helper.
- The page does not select or render `rawResponse`.
- OAuth credentials are not selected.
- Result states are now more understandable after Sprint 4A.
- Long technical values are handled safely.
- Missing values are visible and consistent.

### Opportunities

- The indexing-related detail fields are over-separated.
- Single-value cards create visual repetition and extra mobile scrolling.
- Field labels and values could be more consistent if the indexing signals used the same definition-list row pattern as Crawl Information and Canonical Information.
- The page is readable, but not as scannable as it could be once a result has many fields.

## Recommended Improvement

Consolidate the four indexing-signal detail cards into one `Indexing Signals` card.

Scope:

- Affected surface only: the detailed field section in `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Combine these existing values into one card:
  - Coverage
  - Indexing Verdict
  - Indexing State
  - Robots State
- Use the existing `DetailRow`/definition-list pattern where practical.
- Preserve the existing values exactly.
- Preserve `Not available` behavior.
- Preserve the existing verdict badge if practical, or keep equivalent visible text without changing status logic.
- Keep the current section order by placing the new grouped card where Coverage currently appears.

Why this is the right next task:

- It is presentation-only.
- It affects one Inspection Details surface.
- It improves page hierarchy, field grouping, mobile scanability, and accessibility consistency.
- It requires no API, database, routing, authentication, inspection logic, or Google integration changes.
- It is suitable for a 15-25 minute implementation.

Do not include in this task:

- New helper text.
- New fields.
- New mappings.
- New colors.
- New icons.
- Changes to result-state summaries.
- Changes to crawl, canonical, last crawl, or timestamp sections.

## Sprint 4C Validation

QA completed for the Inspection Details page after the Sprint 4C presentation work.

Completed presentation improvements:

- The previous four separate indexing-signal cards were consolidated into one `Indexing Signals` card.
- Related values now use a consistent definition-list row pattern.
- User-facing labels were refined without renaming internal API or Prisma fields.
- Missing and unavailable values now use the consistent `Not available` placeholder path.
- Date values are guarded so invalid or missing timestamps do not render `Invalid Date` or empty date text.

Desktop review:

- The page hierarchy remains clear: header, result summary, grouped indexing signals, crawl information, canonical information, last crawl, and inspection timestamps.
- The grouped `Indexing Signals` card reduces repeated card chrome and improves scanability.
- Detail rows use consistent card spacing, compact labels, and readable value text.

Mobile review:

- The page remains a single-column flow at narrow widths.
- Two- and three-column detail grids collapse cleanly.
- Long inspected URLs use safe breaking, and long field values use safe wrapping.
- The grouped indexing signals reduce vertical scrolling compared with the previous separate-card layout.

Accessibility review:

- Section headings remain visible and logically ordered.
- Grouped field content uses definition-list markup.
- Missing values are visible text and do not rely on color.
- Decorative success icon remains hidden from assistive technology.
- Reinspect and back actions remain keyboard reachable.

Spacing and typography review:

- Main page spacing continues to use the established `grid gap-6` rhythm.
- Detail row spacing is consistent across indexing, crawl, canonical, crawl timestamp, and lifecycle timestamp rows.
- Labels use compact metadata typography, while values remain readable and wrap safely.

Missing-value review:

- Missing string values render `Not available`.
- Empty string values render `Not available`.
- String values equal to `null`, `undefined`, or `Invalid Date` render `Not available`.
- Missing or invalid dates render `Not available`.
- Empty labels are not rendered.

Validation results:

- Focused Inspection Details tests passed: `127 passed`
- Typecheck passed: `tsc --noEmit`
- Lint passed: `eslint`

Sprint 4C is ready to close.
