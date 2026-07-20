# Sprint 3 UI Polish Audit

Sprint 3E-1 audits the UI changes introduced across Sprints 3B, 3C, and 3D. This is documentation-only: no application code, routes, tests, data access, or product behavior were changed.

## Executive Summary

The Sprint 3 additions are generally consistent with the IndexPilot design system. The onboarding checklist, completed onboarding card, inspection success summary, and contextual helper text all use concise copy, existing routes, semantic structure, and restrained visual treatment.

The main polish need is terminology consistency around "website" versus "Search Console property." Most surfaces correctly distinguish IndexPilot website workspaces from Google Search Console properties, but the Website Details helper currently says the page summarizes a Search Console property even though the page is primarily a website workspace summary. That creates unnecessary first-run confusion and should be the next small implementation task.

Secondary polish opportunities are mostly visual consistency items: several app pages still use raw `slate` utility classes for muted text and detail-row surfaces while newer onboarding components use semantic tokens from `docs/design-system.md`. These are low-risk but touch multiple pages, so they should be handled after the single terminology fix.

## Surfaces Reviewed

- Dashboard onboarding checklist: `components/onboarding/onboarding-checklist.tsx`, `app/(app)/dashboard/page.tsx`
- Completed onboarding success card: `components/onboarding/onboarding-checklist.tsx`, `components/onboarding/onboarding-completed-gate.tsx`
- First inspection success summary: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Indexing-status explanation: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Not Indexed next-step guidance: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- URL inspection helper text: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
- Inspection history helper text: `app/(app)/websites/[id]/inspections/page.tsx`
- Sitemaps helper text: `app/(app)/websites/[id]/sitemaps/page.tsx`
- URL inventory helper text: `app/(app)/websites/[id]/urls/page.tsx`
- Website Details helper text: `app/(app)/websites/[id]/page.tsx`

## Copy Consistency Findings

### High Priority

1. **Website Details helper conflates website and Search Console property**
   - **Affected surface:** Website Details helper text
   - **Relevant file:** `app/(app)/websites/[id]/page.tsx`
   - **Exact problem:** The helper says, "Website details summarize the Google Search Console property connected to IndexPilot." The visible page primarily summarizes a Website record with domain, protocol, platform, priority, notes, imported URL count, and sitemap count. It does not present a selected Search Console property as the main object.
   - **Recommended correction:** Replace the helper with website-first language, such as: "Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions."
   - **Reason:** This preserves the important Google limitation while avoiding confusion between an IndexPilot website and a Google Search Console property.
   - **Implementation risk:** Low. This is copy-only and should require updating one focused test.

   Sprint 3E-5 status: Completed. The Website Details helper now uses website-workspace language and mentions sitemaps, URL inventory, and inspections without implying that the page summarizes a Google Search Console property.

### Medium Priority

1. **URL inspection setup guidance repeats the same prerequisite in three places**
   - **Affected surface:** URL inspection form and requirements callout
   - **Relevant files:** `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
   - **Exact problem:** The callout says the URL must belong to the website, the bullet repeats "Use an HTTP or HTTPS URL from this website," and the URL field helper repeats the same idea before adding the new "when to inspect" guidance.
   - **Recommended correction:** Keep the callout as the prerequisite summary and simplify the URL field helper to focus on the example and when-to-inspect sentence.
   - **Reason:** The form guidance is accurate, but repeated copy can make the primary form feel heavier than necessary.
   - **Implementation risk:** Low to medium. The URL helper is associated through `aria-describedby`, so tests should confirm the helper remains present and validation associations remain intact.

2. **Property terminology varies between "property," "Search Console property," and "selected property"**
   - **Affected surfaces:** Dashboard onboarding, URL inspection form, inspection history property filter, Website Details helper
   - **Relevant files:** `app/(app)/dashboard/page.tsx`, `components/onboarding/onboarding-model.ts`, `components/url-inspections/inspection-form.tsx`, `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/websites/[id]/page.tsx`
   - **Exact problem:** User-facing copy mostly says "Search Console property," but some compact labels say only "Property." That is acceptable in form labels where context is close, but the Website Details helper uses property language in a page-level description where context is broader.
   - **Recommended correction:** Use "Search Console property" in explanatory copy and reserve "Property" for compact labels inside clearly scoped property controls.
   - **Reason:** Consistent terms help users understand how websites, properties, URL inventory, and inspections relate.
   - **Implementation risk:** Low if handled as copy-only updates, medium if applied broadly across tests.

3. **Not Indexed next-step copy is useful but slightly circular**
   - **Affected surface:** Not Indexed next-step guidance
   - **Relevant file:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Exact problem:** "Review Google's inspection details" appears inside the inspection details page, so it may not clearly point users to the specific details below.
   - **Recommended correction:** Later, change that bullet to a more concrete text-only phrase such as "Review the coverage, crawl, robots, and canonical details below."
   - **Reason:** It makes the next step more actionable without adding UI.
   - **Implementation risk:** Low. This is copy-only, but tests that assert the exact current bullet would need updating.

### Low Priority

1. **"Inspection complete" and onboarding-complete cards share similar action language**
   - **Affected surfaces:** Completed onboarding success card and first inspection success summary
   - **Relevant files:** `components/onboarding/onboarding-checklist.tsx`, `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Exact problem:** Both completed states emphasize "Inspect another URL" and "View inspection history." This is not wrong, but users who finish their first inspection and then return to the dashboard may see a similar next-step pattern twice.
   - **Recommended correction:** Defer unless user testing shows fatigue. The dashboard success card already supports local dismissal.
   - **Reason:** The repetition is mild and may help reinforce the workflow.
   - **Implementation risk:** Low.

2. **"Discovered" is used correctly but may need future glossary support**
   - **Affected surfaces:** Sitemaps helper and URL inventory helper
   - **Relevant files:** `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/urls/page.tsx`
   - **Exact problem:** The copy correctly says discovered URLs are not necessarily indexed, but future users may still confuse IndexPilot discovery with Google crawling.
   - **Recommended correction:** Leave current copy unchanged. Consider a future glossary or status legend if more discovery and crawl surfaces are added.
   - **Reason:** Current helpers are concise, truthful, and appropriately scoped.
   - **Implementation risk:** Low.

## Visual Consistency Findings

### Medium Priority

1. **Mixed semantic tokens and raw slate utilities**
   - **Affected surfaces:** Inspection details, inspection history, sitemaps, URL inventory, Website Details
   - **Relevant files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`, `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/urls/page.tsx`, `app/(app)/websites/[id]/page.tsx`
   - **Exact problem:** Newer onboarding UI uses semantic tokens such as `text-muted-foreground`, `border-border`, and `bg-muted/40`, while several app surfaces still use `text-slate-500`, `text-slate-600`, `border-slate-200`, `bg-white`, and `shadow-sm`.
   - **Recommended correction:** In a later visual-only sweep, standardize recently added helper text and detail-row styling to semantic tokens where this does not alter layout or behavior.
   - **Reason:** The design system asks future work to prefer semantic tokens and avoid one-off palettes.
   - **Implementation risk:** Medium because it touches several app pages and snapshots/tests may depend on class names.

   Sprint 3E-2 status: Partially implemented for Sprint 3 informational helper text. The URL inspection form helper text, inspection history helper, sitemaps helper, URL inventory helper, and Website Details helper now use the shared small helper typography rhythm and semantic muted foreground color. Broader detail-row and card-token cleanup remains deferred.

2. **Inspection details mixes two card treatments**
   - **Affected surface:** Inspection Details page
   - **Relevant file:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Exact problem:** The summary header uses a hand-built `rounded-lg border border-slate-200 bg-white p-6 shadow-sm`, while the result sections use `Card`. Detail rows use `border-slate-100 bg-slate-50`.
   - **Recommended correction:** Later, align the summary header and detail rows with existing `Card` and semantic token patterns.
   - **Reason:** This would reduce visual drift without changing information architecture.
   - **Implementation risk:** Medium due to inspection details test coverage and responsive layout.

### Low Priority

1. **Page-heading helper text is visually consistent but not token-consistent**
   - **Affected surfaces:** Inspection history, sitemaps, URL inventory, Website Details
   - **Relevant files:** `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/urls/page.tsx`, `app/(app)/websites/[id]/page.tsx`
   - **Exact problem:** All four helpers use similar spacing and width, but they use raw slate muted text rather than `text-muted-foreground`.
   - **Recommended correction:** Defer to a token-cleanup sprint.
   - **Reason:** The visible result is acceptable, and a broader token cleanup is safer as a dedicated task.
   - **Implementation risk:** Low.

2. **URL inspection callout has slightly more visual weight than other static helpers**
   - **Affected surface:** URL inspection form
   - **Relevant file:** `app/(app)/websites/[id]/inspect/page.tsx`
   - **Exact problem:** The requirements callout is useful and correctly close to the form, but it is more prominent than the simple heading helpers added elsewhere.
   - **Recommended correction:** Keep it for now because the inspection form has more prerequisites than the passive list pages.
   - **Reason:** The visual weight is justified by the risk of failed submissions and setup blockers.
   - **Implementation risk:** Low.

## Accessibility Findings

### Low Priority

1. **Onboarding completed dismiss control relies on an icon-only button**
   - **Affected surface:** Completed onboarding success card
   - **Relevant file:** `components/onboarding/onboarding-checklist.tsx`
   - **Exact problem:** The dismiss button has an accessible label and uses a real button, but it is icon-only and visually small next to two larger actions.
   - **Recommended correction:** Leave unchanged unless users miss it. If changed later, consider a small text button only if it does not compete with the primary actions.
   - **Reason:** Current accessibility is acceptable; this is discoverability polish.
   - **Implementation risk:** Low.

2. **Indexing-status explanation is associated with the status region, but the status derivation is based on coverage text matching**
   - **Affected surface:** First inspection success summary
   - **Relevant file:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Exact problem:** The UI is accessible and text-based, but future status additions could become harder to reason about if coverage text matching expands.
   - **Recommended correction:** Leave unchanged for now. If more statuses are added, move status interpretation into a tested utility with explicit known inputs.
   - **Reason:** Current implementation is safe for existing states and has an unknown fallback.
   - **Implementation risk:** Low to medium in a future helper extraction.

## Mobile Findings

### Low Priority

1. **Inspection details action row may become tall on small screens**
   - **Affected surface:** Inspection Details header and completed summary
   - **Relevant file:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Exact problem:** Buttons correctly wrap and use full width where defined, but the header can include Reinspect URL, Back to inspection history, a long URL, status, date, and then the success summary directly below.
   - **Recommended correction:** Keep unchanged. If future visual QA shows crowding, make spacing adjustments inside the existing header only.
   - **Reason:** Current behavior avoids horizontal overflow and preserves actions.
   - **Implementation risk:** Low.

2. **Filter controls on inspection history use three adjacent form cards on desktop and stack on narrow screens**
   - **Affected surface:** Inspection history filters
   - **Relevant file:** `app/(app)/websites/[id]/inspections/page.tsx`
   - **Exact problem:** The layout is responsive, but three bordered filter forms can feel heavy compared with the concise helper text above them.
   - **Recommended correction:** Defer until filter UX is intentionally revisited.
   - **Reason:** This predates Sprint 3E polish and changing it would exceed the requested scope.
   - **Implementation risk:** Medium because it could affect filter preservation tests.

## Sprint 3E-3 Empty-State Consistency

Status: Completed.

The custom empty-state blocks that do not use `components/layout/empty-state.tsx` now follow the same vertical rhythm as the shared empty-state pattern:

- Responsive padding: `p-6 sm:p-8`
- Centered readable content width: `max-w-md`
- Consistent spacing between content groups: `gap-4`
- Consistent heading-to-description spacing: `gap-2`
- Description line-height: `leading-6`
- Primary actions remain immediately after the descriptive text

Updated surfaces:

- Websites first-use empty state
- Website sitemaps first-use empty state
- URL inventory first-use and filtered empty states
- Inspection history first-use and filtered empty states
- Search Console properties filtered empty state

No empty-state copy, icons, routes, actions, business logic, or data loading behavior changed.

## Sprint 3E-4 Page-Header Consistency

Status: Completed.

Primary dashboard page headers now follow the established app-page pattern used by URL Inspection and Inspection History:

- Mobile-first column layout with actions following heading content in reading and keyboard order
- Desktop alignment with `sm:items-start` so actions align to the top of multi-line headings and helper text
- `min-w-0` heading containers where long website names or domains may wrap
- Shared helper text rhythm with `mt-2 max-w-3xl text-sm leading-6 text-muted-foreground`
- Action groups retain responsive wrapping with `items-start`

Updated surfaces:

- Websites
- Website Details
- Sitemaps
- URL Inventory

Reference surfaces that already matched the pattern:

- URL Inspection
- Inspection History

The Dashboard route continues to rely on the AppShell page title plus onboarding/empty-state content and did not need a separate page-header change.

No page-heading text, helper copy, buttons, navigation, cards, tables, filters, forms, routes, or business logic changed.

## Sprint 3E-5 Final Quality Review

Status: Completed.

Final review covered:

- Dashboard onboarding checklist
- Completed onboarding success card
- First-inspection success summary
- URL inspection form guidance
- Inspection result status guidance
- Inspection history guidance, filters, empty states, and page header
- Websites page header and empty states
- Website Details helper text and page header
- Sitemaps helper text, page header, and empty states
- URL Inventory helper text, page header, and empty states
- Sprint 3 helper text, empty-state spacing, and page-header spacing polish

Issues corrected:

- Website Details helper terminology was corrected so it describes an IndexPilot website workspace instead of implying the page summarizes a Google Search Console property.
- Vitest configuration now allows `10000ms` per test so the full Next page-render test suite can complete reliably during production validation. The failing full-suite runs were timeout failures during cold route imports, not assertion failures.

Unresolved low-priority observations:

- Inspection details still uses a hand-built summary header and detail-row visual treatment while other sections use `Card`; this can be handled in a future visual-only component consistency pass.
- The Not Indexed next-step guidance is accurate, but the first bullet could become more specific in a later copy-only polish pass.
- Inspection history filter controls remain visually heavier than the surrounding helper text; a dedicated filter UX pass should handle that rather than Sprint 3 closure.
- Broader raw `slate` utility cleanup remains deferred outside the Sprint 3 helper-text and page-header surfaces.

Final validation results:

- Full test suite: Passed, 36 files and 728 tests.
- Typecheck: Passed with `tsc --noEmit`.
- Lint: Passed with `eslint`.
- Production build: Passed with `next build`.

Sprint 3 is ready to close.

## Prioritized Recommendations

### High

1. **Correct Website Details helper terminology**
   - **Affected surface:** Website Details helper text
   - **Exact problem:** The copy describes the page as summarizing a Search Console property, but the page summarizes a website workspace.
   - **Recommended correction:** Use website-first copy and mention sitemaps, URL inventory, and inspections.
   - **Reason:** This is the clearest terminology inconsistency and affects a first-run decision point.
   - **Implementation risk:** Low.

### Medium

1. **Reduce repeated URL inspection prerequisite copy**
   - **Affected surface:** URL inspection form and requirements callout
   - **Exact problem:** The URL-from-this-website requirement appears in the callout, bullet list, and field helper.
   - **Recommended correction:** Simplify the field helper while preserving its `aria-describedby` relationship.
   - **Reason:** The form would feel lighter while keeping the same validation expectations.
   - **Implementation risk:** Low to medium.

2. **Standardize recent helper text to semantic muted tokens**
   - **Affected surface:** Page-heading helper text on app pages
   - **Exact problem:** Recent helpers use raw slate color utilities instead of semantic design-system tokens.
   - **Recommended correction:** Convert helper paragraphs to `text-muted-foreground` in a focused visual-only pass.
   - **Reason:** Aligns new guidance with the design-system direction.
   - **Implementation risk:** Low, but cross-file.

3. **Make Not Indexed next-step copy more specific**
   - **Affected surface:** Inspection result Not Indexed guidance
   - **Exact problem:** "Review Google's inspection details" is accurate but not as specific as it could be on the details page.
   - **Recommended correction:** Mention the specific visible sections below, such as coverage, crawl, robots, and canonical details.
   - **Reason:** Improves actionability without adding UI.
   - **Implementation risk:** Low.

### Low

1. **Leave onboarding completed dismissal as icon-only for now**
   - **Affected surface:** Completed onboarding success card
   - **Exact problem:** Discoverability could be improved, but the control is accessible and secondary.
   - **Recommended correction:** No immediate change.
   - **Reason:** Larger text would compete with the two primary success actions.
   - **Implementation risk:** Low.

2. **Defer inspection history filter visual consolidation**
   - **Affected surface:** Inspection history filters
   - **Exact problem:** The three form cards are visually heavy but functional.
   - **Recommended correction:** Revisit during a dedicated filter UX sprint.
   - **Reason:** Consolidating filters could affect preservation behavior and tests.
   - **Implementation risk:** Medium.

3. **Keep sitemap and URL inventory discovery helpers unchanged**
   - **Affected surface:** Sitemaps and URL inventory
   - **Exact problem:** The helpers both use "discover/discovered," but the repetition is purposeful and truthful.
   - **Recommended correction:** No immediate change.
   - **Reason:** These helpers clarify that discovery does not mean Google indexing.
   - **Implementation risk:** Low.

## Recommended Sprint 3E-2 Task

**Objective:** Correct the Website Details helper text so it distinguishes an IndexPilot website workspace from a Google Search Console property.

**Scope:**

- Update `app/(app)/websites/[id]/page.tsx`.
- Update the existing focused Website Details test that asserts the helper copy.

**Suggested final copy:**

"Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions."

**Why this task:**

- It addresses the only high-priority finding.
- It affects one page and one closely related test.
- It requires no API, database, authentication, or routing changes.
- It is suitable for a 15-25 minute implementation task.

**Risk:** Low. Copy-only change with no behavior impact.

## Validation

- Application code was not modified in Sprint 3E-1.
- Tests were not modified in Sprint 3E-1.
- Existing documentation files were not modified in Sprint 3E-1.
- Only `docs/sprint-3-ui-polish-audit.md` was created for this task.
