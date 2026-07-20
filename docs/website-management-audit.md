# Sprint 6B-1 Website Management Audit

## Executive Summary

The Website Management experience is centered on `/websites`, with website cards, filters, first-use and filtered empty states, a loading skeleton, add/edit forms, and archive/restore/delete actions. Users can identify websites by name and domain, understand status through visible badge text, and navigate into a website by selecting its card title.

Recent Project sprint work improved the visual hierarchy of website cards and clarified that a project is a website workspace. The remaining website-management friction is concentrated in the add/edit form: the current helper text explains that domains are normalized, but it does not help users understand what to enter or how the website record relates to inspections.

## Surfaces Reviewed

- `app/(app)/websites/page.tsx`
- `app/(app)/websites/loading.tsx`
- `app/(app)/websites/new/page.tsx`
- `app/(app)/websites/[id]/edit/page.tsx`
- `app/(app)/websites/actions.ts`
- `components/websites/website-form.tsx`
- `components/websites/website-actions.tsx`
- `components/websites/active-project-indicator.tsx`
- `lib/websites/validation.ts`
- `docs/design-system.md`
- `docs/projects-experience-audit.md`

## Website List

Route: `/websites`

The list includes:

- Page heading: `Websites`
- Helper text explaining that a project is a website workspace
- Primary action: `Add Website`
- Search field
- Status filter
- Priority filter
- Reset action
- Responsive card grid

The list is clear enough for users to discover website records and create a new one. The helper text now does a useful job connecting projects, websites, sitemaps, URL inventory, and inspections.

## Website Cards

Website cards show:

- Domain as the primary linked title
- Website name as secondary muted metadata
- Status badge
- Priority badge
- Platform badge
- Notes or `No notes.`
- Edit action
- Archive/restore/delete actions

Strengths:

- Domains are easy to scan as the primary identifier.
- Website names remain visible as secondary context.
- Status is visible as text inside a badge, so meaning does not rely on color alone.
- Supporting metadata is muted and grouped separately from the primary identifier.
- Long domains use truncation to avoid card overflow.

Risks:

- Truncated domains may hide key distinguishing details for similar subdomains.
- The `No notes.` placeholder can add repetition when many records have no notes.

These are low-priority presentation concerns. They do not block identifying or navigating websites.

## Add Website Flow

Route: `/websites/new`

The route renders `WebsiteForm` in create mode.

The form includes:

- Heading: `Add Website`
- Helper text: `Domains are normalized before saving.`
- Website name
- Domain
- Platform
- Priority
- Status
- Notes
- Cancel button
- Create Website submit button

The form is structurally sound and uses labeled fields. The main weakness is the helper text. It is accurate, but technical, and it does not tell a first-time user what the website record is for or what kind of domain value to enter.

## Edit Website Flow

Route: `/websites/[id]/edit`

The route loads the website by ID and renders `WebsiteForm` in edit mode with default values.

The same form structure is reused, which is good for consistency. However, the shared helper text has the same limitation in edit mode: it explains normalization but not the management purpose of the record.

## Archive And Remove Actions

Component: `WebsiteActions`

Current actions:

- `Archive` for active or paused websites
- `Restore` for archived websites
- `Delete` with confirmation dialog

Strengths:

- Actions are visible and text-labeled.
- Destructive delete uses a confirmation dialog.
- The delete dialog explains that archive is safer when the user wants to keep the record.
- Icons are decorative and paired with text labels.
- Pending states disable buttons during the action.

No high-priority action presentation issue was found.

## Empty State

The first-use empty state on `/websites` shows:

- Heading: `No websites yet`
- Helper: `Add your first website to begin organizing inspections and tracking Google's view of your content.`
- Primary action: `Add Website`

The filtered empty state shows:

- Heading: `No websites matched`
- Helper: `Try a different name, domain, status, or priority filter.`
- Primary action: `Reset filters`
- Secondary action: `Add Website`

The states are correctly differentiated. The first-use state explains why adding a website matters, while the filtered state helps users recover from search or filter combinations with no matches.

## Loading State

Route: `/websites/loading`

The loading state includes:

- Screen-reader status text: `Loading websites...`
- Header skeleton
- Filter skeleton
- Six card skeletons
- `aria-busy="true"`
- `aria-live="polite"`

The loading state preserves the final layout well and avoids showing an empty state before data resolves.

## Helper Text

Strong helper text:

- `/websites` explains the relationship between projects, websites, sitemaps, URL inventory, and inspections.

Weak helper text:

- `WebsiteForm` says `Domains are normalized before saving.`

The form helper is factual but not very user-centered. It should explain the expected domain input while preserving the normalization note.

## Typography And Spacing

The website list follows the current design system:

- Page sections use `grid gap-6`.
- Helper text uses small muted typography with readable line length.
- Cards use existing `Card` primitives.
- Card metadata uses muted semantic tokens.
- Form fields use `grid gap-2`.
- Form content uses a responsive two-column grid.

Some raw slate utilities remain in forms and older empty-state containers. This is consistent with other authenticated app pages and does not require immediate change.

## Responsive Layout

The experience is responsive:

- Header stacks on mobile.
- Filters stack on mobile and move to columns at medium width.
- Website cards render as one column before expanding to two and three columns.
- Card footer actions stack on small screens.
- The add/edit form stacks naturally on mobile.

Potential issue:

- Long domains are truncated in cards. This protects layout but can make similar websites harder to distinguish. The full domain is available after opening the website, so this is not urgent.

## Accessibility

Strengths:

- Form fields have visible labels.
- Validation errors are visible text.
- Buttons and links have descriptive labels.
- Delete action uses a confirmation dialog.
- Status values are visible as text.
- Loading state has screen-reader status text.
- Empty-state actions are keyboard reachable.

Concerns:

- The form helper text is not programmatically associated with a specific input. Because it is introductory form guidance rather than field-specific help, this is acceptable.
- The form does not include field-specific helper text for the domain field, so users may rely on validation after submitting.

## User Understanding

### Can Users Identify Each Website?

Yes. The domain is primary, and the website name appears directly beneath it when present.

### Can Users Distinguish Domains?

Mostly. Domains are visible but truncated on cards. This is good for layout safety, but similar subdomains may require opening the website details page for confirmation.

### Can Users Understand Website Status?

Yes. Status appears as readable badge text such as `Active`, `Paused`, or `Archived`.

### Can Users Navigate Between Websites?

Yes, through the `/websites` list. There is no global website switcher, but navigation through cards is straightforward.

## Findings

### High Priority

No high-priority blocker was found.

### Medium Priority

1. Add/edit form helper text is too technical for first-time website management.
   - Affected surface: `components/websites/website-form.tsx`
   - Exact problem: `Domains are normalized before saving.` describes system behavior but does not explain what users should enter.
   - Recommended correction: replace it with user-centered helper text that preserves the normalization concept.
   - Reason: improves confidence during website creation and editing without changing validation or behavior.
   - Implementation risk: Low.

2. Similar domains can be harder to distinguish when card domains truncate.
   - Affected surface: `/websites` cards
   - Exact problem: truncation protects the layout but may hide meaningful subdomain or path differences.
   - Recommended correction: make the domain the primary card element while preserving truncation for layout safety.
   - Reason: users usually distinguish website records by domain first.
   - Implementation risk: Low.
   - Status: Completed in Sprint 6B-2.

### Low Priority

1. Empty-state naming mixes `projects` and `websites`.
   - Affected surface: `/websites` empty states
   - Exact problem: first-use state says `projects`, filtered state says `websites`.
   - Recommended correction: use website-specific empty-state copy for Website Management.
   - Reason: keeps the management surface aligned with the page heading and primary action.
   - Implementation risk: Low.
   - Status: Completed in Sprint 6B-4.

2. Raw slate utilities remain in older containers.
   - Affected surface: website filters, form, and empty state
   - Exact problem: some styles use raw slate classes instead of semantic tokens.
   - Recommended correction: gradually align with semantic tokens during future visual-only passes.
   - Reason: consistency improvement, not a usability blocker.
   - Implementation risk: Low.

## Recommended Sprint 6B-2 Implementation

Update only the helper text in `components/websites/website-form.tsx`.

Recommended copy:

`Enter the domain visitors use for this website. IndexPilot will normalize it before saving.`

Why this is the best next task:

- It is presentation-only.
- It affects one shared add/edit form.
- It requires no API, database, routing, authentication, validation, or business-logic changes.
- It improves both the add website and edit website flows.
- It preserves the existing normalization message while making it more useful to users.
- It is suitable for a 15-20 minute implementation.

Out of scope for the next sprint:

- Changing validation.
- Adding new helper text to every field.
- Redesigning the form.
- Adding a website switcher.
- Changing card truncation.
- Renaming routes or data models.

## Sprint 6B-2 Update

Completed the website-card visual hierarchy refinement on `/websites`.

Changes completed:

- Made the domain the primary linked card title.
- Kept the website name as secondary muted text beneath the domain.
- Preserved supporting metadata as muted content.
- Preserved existing spacing, status badges, actions, routes, data, and business logic.

No other website-management recommendations were implemented in this sprint.

## Sprint 6B-3 Update

Completed the website-status presentation refinement.

Changes completed:

- Added a shared `WebsiteStatusBadge` for website status surfaces.
- Preserved existing status values: `Active`, `Paused`, and `Archived`.
- Standardized badge variants across website cards and website-scoped headers.
- Added accessible status labels such as `Website status: Active`.
- Preserved status logic, routes, APIs, and business behavior.

## Sprint 6B-4 Update

Completed the Website Management empty-state refinement.

Changes completed:

- Updated the first-use heading to `No websites yet`.
- Updated the helper text to explain that adding a website begins organizing inspections and tracking Google's view of content.
- Preserved the existing `Add Website` primary action.
- Left filtered empty states unchanged.

## Sprint 6B Validation

QA completed for:

- Website list
- Cards and rows
- Status presentation
- Helper text
- Empty state
- Spacing
- Typography
- Responsive layouts
- Accessibility

Validation summary:

- QA completed: Yes.
- Responsive review completed: Yes. Website cards, filters, empty states, and action groups continue to stack or wrap on narrow screens.
- Accessibility reviewed: Yes. Website status is communicated with visible text and accessible labels, destructive actions retain confirmation, and empty-state actions remain keyboard reachable.
- Tests passed: Yes.
- Typecheck passed: Yes.
- Lint passed: Yes.
- Production ready: Yes.

Presentation issues corrected during final QA:

- Updated this audit to reflect the completed shared status badge and website-specific empty-state copy.

Deferred items:

- Add/edit form helper text remains a recommended future presentation-only improvement.
- A dedicated website switcher remains deferred because it would affect navigation behavior.
