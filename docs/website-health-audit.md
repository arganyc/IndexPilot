# Sprint 5B-1 Website Health Overview Audit

## Executive Summary

IndexPilot does not currently have a single dedicated Website Health Overview surface. Website-level state is distributed across the Dashboard, Website Details, Sitemaps, URL Inventory, URL Inspection, Inspection History, and Inspection Details pages.

Users can understand parts of a website's current state, but they have to assemble the picture themselves: website status and metadata live on Website Details, URL discovery totals live on URL Inventory, sitemap fetch/import signals live on Sitemaps, and Google indexing signals live in Inspection History and Inspection Details. The product has useful building blocks, but it does not yet make the website's current state quickly scannable from one place.

The safest next step is a small presentation-only improvement to the existing Website Details page: improve the hierarchy of the existing details card so the already-rendered website status, sitemap count, imported URL count, and key metadata are easier to scan. This should not add new queries, calculations, badges, health scores, or claims about Google indexing.

## Surfaces Reviewed

- Dashboard: `app/(app)/dashboard/page.tsx`
- Websites list: `app/(app)/websites/page.tsx`
- Website Details: `app/(app)/websites/[id]/page.tsx`
- Website loading state: `app/(app)/websites/[id]/loading.tsx`
- Website navigation: `components/websites/website-navigation.tsx`
- Sitemaps list: `app/(app)/websites/[id]/sitemaps/page.tsx`
- Sitemap Details: `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`
- URL Inventory: `app/(app)/websites/[id]/urls/page.tsx`
- URL Details: `app/(app)/websites/[id]/urls/[urlId]/page.tsx`
- URL Inspection form: `app/(app)/websites/[id]/inspect/page.tsx`
- Inspection form component: `components/url-inspections/inspection-form.tsx`
- Inspection History: `app/(app)/websites/[id]/inspections/page.tsx`
- Inspection Details: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- URL inventory service: `lib/urls/inventory.ts`
- URL inventory Prisma repository: `lib/urls/prisma-repository.ts`
- Inspection history service: `lib/url-inspections/history.ts`
- Inspection history Prisma repository: `lib/url-inspections/prisma-history-repository.ts`
- Inspection details Prisma repository: `lib/url-inspections/prisma-details-page-repository.ts`
- Data model: `prisma/schema.prisma`

## Existing Website-Level Data

Currently rendered or safely available data that could contribute to a future website-level summary:

- Website metadata: name, domain, protocol, platform, priority, status, notes, created date, updated date.
- Website counts: sitemap count and imported URL count on Website Details navigation/data rows.
- Search Console connection hints: connected property workflow exists; Website Details currently shows placeholder rows for Google connected and IndexNow enabled.
- Sitemap signals: sitemap status, type, URL count, parent/child sitemap relationships, last fetched, last successful fetch, last error, imported URL record count.
- URL inventory signals: total imported URLs, discovered in last 7 days, updated in last 7 days, source sitemap count, first discovered, last discovered, sitemap lastmod.
- Inspection signals: recent inspection status, verdict, coverage state, inspected URL, completed/created timestamp, Search Console property option, latest 25-inspection summary counts.
- Inspection detail signals: coverage status, indexing verdict, indexing state, robots.txt status, page fetch status, crawled as, canonical URLs, last crawl, inspection timestamps.
- ActivityLog model: exists in the schema and is written by sitemap import code, but no user-facing activity overview was found.

Sensitive or unsuitable data for a public health summary:

- `rawResponse` should remain excluded from health UI.
- OAuth access tokens, refresh tokens, and provider credentials should never be selected or displayed.
- Internal IDs should not be emphasized unless needed for support/debugging.

## Page Hierarchy

Dashboard:

- The dashboard is still onboarding-led.
- It does not render website health KPIs, recent activity, or website-level inspection summaries.
- This keeps the dashboard honest, but returning users do not yet get a quick answer to "What is the current state of my website?"

Website Details:

- The page title, status badge, domain, helper text, navigation, actions, and details card are all visible.
- The details card contains the most direct website-level facts, including status, priority, sitemap count, and imported URL count.
- The rows are presented as a flat metadata list, so operational health signals do not stand out from lower-priority metadata such as protocol or created date.

Inspection History:

- Provides the strongest current website-level inspection summary with Loaded inspections, Completed, Failed, and In progress.
- The summary is explicitly scoped to the latest 25 inspections, which is truthful and useful.
- This information is not visible from the Website Details page without navigation.

URL Inventory:

- Provides the strongest current website-level URL discovery summary.
- Total imported URLs, recent discovery, recent update, and source sitemap count are clear.
- It does not represent Google indexing status, and the helper text correctly avoids implying that discovery means indexed.

Sitemaps:

- Sitemap status, URL counts, last fetch, and last errors help users understand discovery pipeline health.
- These signals are scattered across the list and detail pages rather than summarized at website level.

## Summary Cards

Existing summary cards:

- URL Inventory summary cards:
  - Total imported URLs
  - Discovered in last 7 days
  - Updated in last 7 days
  - Source sitemaps
- Inspection History summary cards:
  - Loaded inspections
  - Completed
  - Failed
  - In progress

Assessment:

- The cards use the existing small-label and prominent-number pattern.
- URL Inventory cards answer discovery questions well.
- Inspection History cards answer inspection-state questions for the latest loaded set.
- There is no combined website-level summary card set yet, and adding one would require new product decisions about scope, calculations, and data freshness.

## Data Grouping

Strengths:

- Sitemaps, URL inventory, inspections, and details each have a clear local purpose.
- Website navigation exposes the major website subsections.
- Counts in navigation help users see that URL Inventory and Sitemaps contain data.

Concerns:

- Website Details mixes operational signals and static metadata in one flat `dl`.
- Placeholder rows such as Google connected and IndexNow enabled appear alongside real values, which can make the current website state feel less reliable.
- Health-adjacent data is separated by workflow rather than summarized by user question.

## Consistency

Aligned:

- App pages use grid-based spacing and existing card/button/badge primitives.
- Helper text added in Sprint 3 is calm and avoids indexing guarantees.
- Recent inspection and detail pages now use consistent missing-value language such as `Not available`.

Partially aligned:

- Website Details and Sitemap Details still use some slate utility classes instead of semantic tokens in local detail rows.
- Some placeholder rows append the word `Placeholder`, which reads like implementation language rather than product language.
- Empty states are a mix of reusable `EmptyState` and local hand-built patterns.

## Empty States

Current behavior:

- Dashboard uses the reusable empty state with calm first-run copy.
- Websites list has first-use and filtered empty states.
- URL Inventory differentiates first-use and filtered empty states.
- Inspection History differentiates first-use and filtered empty states.
- Sitemaps differentiates first-use and filtered empty states.
- Sitemap Details has an empty state for child sitemaps and a placeholder panel for imported URLs.

Assessment:

- Empty states generally tell users what is missing and what to do next.
- The dedicated health-overview concept is not present, so there is no health-specific empty state yet.
- Existing empty states should not be used to imply continuous monitoring or guaranteed Google indexing.

## Loading States

Current behavior:

- Website Details has a route loading skeleton that mirrors the details layout.
- URL Inventory, Inspection Details, and other detail surfaces have route or scaffold loading states from prior design-system work.
- Dashboard does not yet have a dedicated intelligence loading state because intelligence widgets do not exist.

Assessment:

- Loading treatment is adequate for existing surfaces.
- A future website health overview should reuse skeleton dimensions close to the final summary layout to avoid layout shift.

## Helper Text

Strengths:

- Website Details explains that settings organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions.
- URL Inventory explains that discovered URLs are not necessarily indexed.
- Sitemaps explains that sitemaps do not guarantee crawling or indexing.
- URL Inspection explains when to inspect a URL and what prerequisites apply.

Concerns:

- Website Details helper text is useful but the following card title remains generic, so users may not immediately connect the page to a health overview.
- Inspection History helper text is scoped to previous inspection results, not a current website-wide health score.

## Typography And Spacing

Strengths:

- Page-level helper text generally uses `text-sm leading-6 text-muted-foreground` with readable width.
- Summary cards use a clear label/value hierarchy.
- Tables use compact, scannable cell spacing.

Concerns:

- Website Details detail rows make every field similar in visual weight.
- Static metadata and health-adjacent counts sit at the same hierarchy level.
- Some cards use local slate colors where semantic tokens would improve consistency over time.

## Mobile Layout

Strengths:

- Major pages stack in one column on small screens.
- Buttons and navigation links wrap rather than relying on hover-only behavior.
- Long URLs use truncation or breaking patterns depending on the surface.

Concerns:

- Website navigation can become a dense cluster on mobile.
- Website Details shows many equally weighted rows, requiring scrolling before users see the most useful website state.
- Tables rely on horizontal scroll, which is appropriate for data-dense inventory and history views but less ideal for a future health overview.

## Accessibility

Strengths:

- Pages keep visible headings and descriptive actions.
- Statuses are written as text in badges.
- Form controls have visible labels.
- Decorative icons are generally marked with `aria-hidden`.
- Missing inspection values use visible placeholder text rather than raw `null` or `undefined`.

Concerns:

- The Website Details card has one broad details list, but it does not clearly communicate which values are most important for understanding website state.
- Placeholder rows on Website Details include a visible `Placeholder` tag, which may be confusing to screen reader and sighted users because it is implementation-oriented.
- Future health summaries should avoid color-only severity cues and should not imply IndexPilot controls Google.

## Can Users Quickly Understand The Current Website State?

Partially.

Users can understand:

- Whether a website is active, paused, or archived.
- How many sitemaps and imported URLs are associated with the website.
- Whether URL discovery is happening through URL Inventory summary cards.
- What recent URL inspections reported, once they navigate to Inspection History.
- Detailed Google-reported inspection signals for a single inspected URL.

Users cannot quickly understand:

- A combined website-level health picture from one surface.
- Whether there are recent inspection failures without visiting Inspection History.
- Whether sitemap import/fetch issues affect discovery without checking Sitemaps.
- Whether the URL inventory has changed recently from Website Details.
- Whether health-adjacent values are current, scoped, or placeholders.

## Findings

### High

No high-priority blocker was found. Existing surfaces remain usable and truthful.

### Medium

1. Website Details does not prioritize health-adjacent fields.

- Affected surface: `app/(app)/websites/[id]/page.tsx`
- Problem: Status, priority, imported URL count, and sitemap count are rendered in the same flat list as metadata and placeholder rows.
- Impact: Users have to scan many equally weighted fields to understand the website's current operational state.

2. Website health is spread across several routes.

- Affected surfaces: Website Details, URL Inventory, Sitemaps, Inspection History.
- Problem: Discovery, sitemap health, and inspection status are available but separated by workflow.
- Impact: Users can find the data, but not quickly from one overview.

3. Placeholder rows may reduce confidence.

- Affected surface: `app/(app)/websites/[id]/page.tsx`
- Problem: `Google connected`, `IndexNow enabled`, and `Imported URLs` use a visible `Placeholder` marker.
- Impact: The page can feel unfinished even when real status/count data is available.

### Low

1. Dashboard has no website health entry point.

- Affected surface: `app/(app)/dashboard/page.tsx`
- Problem: The dashboard is onboarding-led and does not surface website health yet.
- Impact: Acceptable until actual dashboard intelligence work begins.

2. Activity logs are not surfaced.

- Affected area: future website activity surface.
- Problem: `ActivityLog` exists and sitemap import writes logs, but no user-facing activity summary was found.
- Impact: Low until recent activity becomes a planned product surface.

3. Mixed local styling remains on older website pages.

- Affected surfaces: Website Details, Sitemaps, URL Inventory.
- Problem: Some rows use local `slate-*` classes instead of semantic tokens.
- Impact: Low visual consistency risk, not a functional blocker.

## Recommended Sprint 5B-2 Implementation

Improve the presentation hierarchy of the existing Website Details card.

Scope:

- Affected file: `app/(app)/websites/[id]/page.tsx`
- Presentation only.
- Use existing data already rendered on the page.
- Do not add new fields, queries, calculations, badges, health scores, API calls, or routing changes.

Suggested change:

- Rename or reframe the card heading from `Website Details` to a clearer overview heading such as `Website Overview`.
- Add one short supporting sentence in the card header explaining that the section summarizes the website's setup and available discovery data.
- Group the existing real operational fields first:
  - Status
  - Priority
  - Sitemap count
  - Imported URL count
- Keep static metadata below:
  - Name
  - Domain
  - Protocol
  - Platform
  - Notes
  - Created date
  - Updated date
- Keep placeholder rows, if retained, visually secondary and do not let them compete with real website state.

Reason:

- It helps users understand the current website state more quickly without inventing a health score.
- It uses existing data already loaded by the page.
- It is presentation-only and suitable for a 15-20 minute implementation.
- It avoids unsupported claims about Google crawling, indexing, rankings, or IndexPilot control over Google.

Implementation risk:

- Low. The change is localized to one page's visual grouping and can be covered with focused Website Details tests verifying that existing values still render.

## Sprint 5B-2 Website Health Summary Card Hierarchy

Status: completed.

The Website Details card was reframed as `Website Overview` and now presents existing health-adjacent summary information before supporting metadata.

Completed changes:

- Existing summary values are shown first: status, priority, imported URL count, and sitemap count.
- Status is treated as the most prominent summary value.
- Supporting metrics use slightly quieter but still scannable typography.
- Static website metadata remains available below the summary group.
- No new metrics, calculations, scoring, AI, APIs, database changes, business logic, or routing changes were introduced.

## Sprint 5B-3 Inspection Status Breakdown

Status: completed.

The Inspection History summary cards were grouped into a clearer inspection status breakdown while preserving the existing values and ordering.

Completed changes:

- Added the visible grouping heading `Inspection status breakdown`.
- Kept the existing scope note: `Based on the 25 most recent inspections.`
- Preserved the existing order: Loaded inspections, Completed, Failed, In progress.
- Made `Loaded inspections` the primary visual metric.
- Kept Completed, Failed, and In progress visually secondary.
- Existing colors, calculations, filters, APIs, sorting, pagination, and database behavior remain unchanged.

## Sprint 5B-4 Website Health Empty State

Status: completed.

The website-insights first-use empty state on Inspection History now uses health-oriented copy while preserving the existing primary inspection action.

Completed changes:

- Heading changed to `No website insights yet`.
- Helper text changed to `Inspect a few URLs to begin building an overview of how Google currently sees your website.`
- Existing `Inspect a URL` primary action and destination were preserved.
- No icons, illustrations, onboarding flows, sample metrics, business logic, API changes, or database changes were added.
- Archived-website empty behavior remains unchanged.

## Sprint 5B Validation

Status: production ready.

QA completed:

- Reviewed the Website Overview summary group, Inspection History status breakdown, website-insights empty state, helper text, spacing, typography, and actions.
- Confirmed summary cards preserve existing values and present the most important website state first.
- Confirmed the inspection status breakdown preserves existing values, ordering, colors, calculations, filters, and pagination.
- Confirmed the website-insights empty state uses the approved copy and preserves the existing primary action.
- Corrected one presentation issue on Website Details by removing visible implementation-oriented `Placeholder` labels while preserving placeholder styling and values.

Responsive review completed:

- Website Overview summary values stack on mobile and move to two and four columns at larger breakpoints.
- Inspection status breakdown keeps the existing responsive card grid.
- Empty-state copy remains centered, constrained, and readable on narrow screens.
- Long website domains and inspection URLs continue to use existing wrapping or truncation patterns.

Accessibility reviewed:

- Website Overview uses labeled `dl` groups for the summary and metadata.
- Inspection status breakdown is a labeled section with visible text for each status metric.
- Empty-state content remains visible text and does not rely on icons, illustrations, or color alone.
- Existing primary actions remain keyboard accessible and keep their labels and destinations.
- No health score, AI summary, or unsupported Google indexing claim was introduced.

Validation:

- Focused tests passed.
- Typecheck passed.
- Lint passed.
- Sprint 5B is ready for production.
