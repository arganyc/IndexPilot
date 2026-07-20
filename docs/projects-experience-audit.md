# Sprint 6A-1 Projects Experience Audit

## Executive Summary

IndexPilot does not currently expose a separate "Projects" model, route, list, card, switcher, or creation flow. The closest product concept is the website workspace: users create websites, open a website details page, and navigate between website-specific sections such as sitemaps, URL inventory, and inspection history.

The current website experience is functional and reasonably scannable, but the "project" concept is implicit. A new user can find the Websites area and add a website, but they may not immediately understand that a website is the organizing container for the rest of the product. Active context is clear once a user is inside a website page, but there is no global project switcher for moving directly between website workspaces.

## Surfaces Reviewed

- `app/(app)/websites/page.tsx`
- `app/(app)/websites/loading.tsx`
- `app/(app)/websites/new/page.tsx`
- `app/(app)/websites/[id]/page.tsx`
- `components/websites/website-form.tsx`
- `components/websites/website-navigation.tsx`
- `components/websites/website-actions.tsx`
- `components/layout/app-shell.tsx`
- `docs/design-system.md`

## Current Routing And Components

| Experience | Current route or component | Notes |
| --- | --- | --- |
| Project list equivalent | `/websites` | Lists website workspaces with search, status filter, priority filter, cards, and empty states. |
| Project card equivalent | Website cards in `app/(app)/websites/page.tsx` | Shows website name, domain, status, priority, platform, notes, edit action, and archive/delete actions. |
| Project switcher equivalent | None | Users switch workspaces by returning to `/websites`; there is no global switcher. |
| Active project context | `/websites/[id]` and child routes | The website name, status, domain, and website navigation communicate the active workspace. |
| Project creation equivalent | `/websites/new` using `WebsiteForm` | Creates a website with name, domain, platform, priority, status, and notes. |
| Project navigation | `WebsiteNavigation` | Provides website-scoped tabs for details, sitemaps, URL inventory, and inspection history. |

## Project List

The `/websites` page is the primary place users discover and switch between website workspaces. It provides:

- A page heading: `Websites`
- Helper text: `Manage the websites tracked by IndexPilot.`
- A primary `Add Website` action
- Search, status, and priority filters
- Reset behavior for filtered views
- Responsive card grid for populated states

The list is useful for returning users, but the helper text is too brief for first-time users. It does not explain that a website is the workspace that connects sitemaps, URL inventory, and inspections.

## Project Cards

Website cards make the website name and domain easy to scan. The status badge is visible, and supporting badges for priority and platform help users distinguish records.

Strengths:

- Website name is linked and visually primary.
- Domain appears immediately below the name.
- Status remains visible on the card.
- Edit, archive, restore, and delete actions are grouped at the bottom.
- Mobile stacking is handled through existing flex and grid utilities.

Risks:

- The card does not explicitly tell users that selecting a website opens the workspace for related sitemaps, URLs, and inspections.
- The `No notes.` placeholder is low priority but can add visual noise when many cards have no notes.

## Project Switcher

There is no dedicated project switcher. The closest pattern is:

- App sidebar `Websites` link for returning to the website list.
- `WebsiteNavigation` for moving within the currently selected website.
- `Back` link on website details for returning to all websites.

This is workable for a small product, but users cannot quickly jump between active websites from deep routes without navigating back to the website list first.

## Project Creation Flow

The creation flow is handled by `/websites/new`, which renders `WebsiteForm` in create mode.

The form includes:

- Website name
- Domain
- Platform
- Priority
- Status
- Notes
- Cancel
- Create Website

The form copy currently says `Domains are normalized before saving.` That is accurate but technical. It explains what the system does, not why a website should be created or what it unlocks. For first-time users, the form would benefit from short contextual copy in a later phase, but this audit recommends only one smaller list-page improvement first.

## Empty State

The unfiltered empty state on `/websites` shows:

- Heading: `No websites found`
- Helper text: `Add your first website or adjust the current search and filters.`
- Primary action: `Add Website`

The filtered empty state uses the reusable `EmptyState` component with:

- Heading: `No websites matched`
- Helper text: `Try a different name, domain, status, or priority filter.`
- Primary action: `Reset filters`
- Secondary action: `Add Website`

The filtered empty state is specific and helpful. The first-use empty state mixes two scenarios: no websites and adjusted filters. Because the unfiltered branch has no active filters, the reference to adjusting filters is less precise.

## Loading State

`app/(app)/websites/loading.tsx` provides skeletons for the page heading area, filters, and six website cards.

Strengths:

- Uses the existing `Skeleton` component.
- Preserves the final card-grid layout.
- Includes `aria-busy="true"` and screen-reader status text.
- Keeps loading scoped to the page rather than adding a blocking overlay.

No high-priority loading-state issue was found.

## Helper Text

Existing helper text follows the design-system pattern of `text-sm leading-6 text-muted-foreground` with a readable `max-w-3xl` on the website list and detail page.

The main inconsistency is conceptual rather than stylistic: the website list helper text does not define what a website represents in IndexPilot. The Website Details page already uses clearer workspace language:

`Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions.`

The list page should align with that language.

## Typography And Spacing

The project surfaces mostly follow `docs/design-system.md`:

- Page heading uses `text-2xl font-semibold`.
- Helper text uses small muted typography.
- Cards use existing `Card` primitives.
- Button groups use `gap-2` or `gap-3`.
- Page sections generally use `grid gap-6`.

Minor inconsistency: website cards use `rounded-lg` and raw slate utilities in nearby form/empty-state containers while the design system recommends leaning on semantic card primitives and tokens. This is low priority because it does not block understanding.

## Mobile Layout

Mobile behavior is generally sound:

- Page header stacks heading and action.
- Filters stack before switching to columns on wider screens.
- Website cards render as one column before expanding to larger grids.
- Card actions stack on small screens.
- Website navigation wraps into multiple rows.

Potential mobile friction:

- Without a project switcher, deep website routes may require extra taps to move to another website.
- Long domains on website cards use truncation, which prevents overflow but may hide distinguishing path or subdomain details.

## Accessibility

Strengths:

- Website navigation uses a named `nav` region and `aria-current="page"` for the active item.
- Loading state exposes status text to assistive technology.
- Buttons and links use visible text labels.
- Decorative icons use `aria-hidden="true"` where present.
- Empty-state actions remain keyboard reachable.

Concerns:

- The `/websites` page uses an `h2` as the primary visible page heading inside the app shell. This may be intentional within the current shell hierarchy, but the page-level heading strategy should remain consistent across app pages.
- The active website is clear on website details and child pages, but active project context is not visible globally in the app shell.

## User Understanding

### What a Project Represents

Partially clear. Users can infer that a website is the central object, but the list-page copy does not state that websites are the organizing workspaces for sitemaps, URL inventory, and inspections.

### Which Project Is Active

Clear inside a website workspace. The website name, domain, status badge, and website navigation establish active context.

Less clear globally. The app sidebar does not show the active website, and there is no project switcher.

### How To Navigate Between Projects

Mostly clear but indirect. Users can return to `/websites` and select another website. There is no direct switcher from deep website-specific routes.

## Findings

### High Priority

No high-priority blocker was found. Users can create, view, and navigate website workspaces with the current UI.

### Medium Priority

1. A website workspace is the current project equivalent, but this is not explained on the website list.
   - Affected surface: `/websites`
   - Recommended correction: clarify the helper text beneath the `Websites` heading.
   - Reason: helps users understand what a project represents before they create or choose one.
   - Implementation risk: Low.
   - Status: Resolved in Sprint 6A-5 with project/workspace helper text.

2. There is no dedicated project switcher.
   - Affected surface: app shell and website-specific routes.
   - Recommended correction: consider a future website switcher after the concept and terminology are finalized.
   - Reason: deep navigation between website workspaces currently requires returning to the website list.
   - Implementation risk: Medium because it touches navigation behavior and state.

3. First-use website empty state is less specific than the filtered empty state.
   - Affected surface: `/websites`
   - Recommended correction: in a later sprint, make the unfiltered empty-state copy describe adding the first website workspace.
   - Reason: avoids suggesting filter changes when no filters are active.
   - Implementation risk: Low.
   - Status: Resolved in Sprint 6A-4 with project-specific first-use copy.

### Low Priority

1. Website creation helper text is technically accurate but not user-oriented.
   - Affected surface: `WebsiteForm`
   - Recommended correction: later add a short sentence about how the website organizes indexing work.
   - Reason: first-time users may not know why the form fields matter.
   - Implementation risk: Low.

2. Card and container styling mixes semantic tokens with raw slate utilities.
   - Affected surface: `/websites` cards, filters, and empty state.
   - Recommended correction: gradually align with semantic tokens when touching these surfaces.
   - Reason: improves design-system consistency over time.
   - Implementation risk: Low.
   - Status: Partially resolved in Sprint 6A-2 for website project cards only.

3. Long domains are truncated on cards.
   - Affected surface: website cards.
   - Recommended correction: consider preserving truncation but exposing more context in detail views rather than adding tooltips.
   - Reason: avoids overflow while keeping cards compact.
   - Implementation risk: Low.

## Recommended Sprint 6A-2 Implementation

Update only the helper text below the `Websites` heading on `/websites`.

Recommended copy:

`A website is the workspace for its sitemaps, URL inventory, and Google URL inspections.`

Why this is the best first task:

- It is presentation-only.
- It affects one surface.
- It requires no API, database, routing, authentication, or business-logic changes.
- It helps users understand what a project represents before they create or select one.
- It aligns the website list with the clearer website-workspace language already used on the Website Details page.
- It is suitable for a 15-20 minute implementation.

Out of scope for the next sprint:

- Adding a project switcher.
- Renaming websites to projects.
- Changing routes.
- Changing website creation fields.
- Redesigning cards.
- Adding onboarding or persistence.

## Sprint 6A-2 Update

Completed the project-card visual hierarchy refinement for the website cards on `/websites`.

Changes completed:

- Made the project name the primary card element with stronger heading typography.
- Kept the domain directly beneath the name as secondary muted text.
- Standardized supporting metadata and notes with muted semantic text tokens.
- Preserved the existing card spacing, actions, links, status badges, data, routing, and business logic.

No other project-experience recommendations were implemented in this sprint.

## Sprint 6A Validation

QA completed for:

- Project cards
- Active project indicator
- Projects empty state
- Project helper text
- Spacing
- Typography
- Responsive layouts
- Accessibility

Validation summary:

- QA completed: Yes.
- Responsive review completed: Yes. Project cards, empty state, and active project indicators continue to use wrapping and stacking utilities for narrow screens.
- Accessibility reviewed: Yes. The active project indicator uses visible text, empty-state actions remain keyboard reachable, and project context is not communicated by color alone.
- Tests passed: Yes.
- Typecheck passed: Yes.
- Lint passed: Yes.
- Production ready: Yes.

Presentation issues corrected during final QA:

- Updated the `/websites` helper text so the page explains that a project is a website workspace for sitemaps, URL inventory, and Google URL inspections.

Deferred items:

- A dedicated project switcher remains deferred because it would affect navigation behavior and is outside Sprint 6A's presentation-only scope.
