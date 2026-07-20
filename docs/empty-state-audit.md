# Empty-State Audit

This audit identifies where IndexPilot needs consistent empty-state treatment. It follows `docs/design-system.md` and `docs/dashboard-ui-audit.md` and is documentation-only.

Empty states here exclude loading states and server/database error states. Those should remain separate because they communicate temporary progress or failure, not an expected absence of data.

## Empty-State Principles

- Explain what is missing in plain language.
- Help the user understand why the screen is empty.
- Offer one clear primary action when action is possible.
- Avoid blaming the user or implying they did something wrong.
- Keep copy concise and useful on mobile.
- Use semantic HTML, visible headings, and accessible labels.
- Use Lucide icons as small decorative support only, with `aria-hidden="true"`.
- Avoid decorative illustrations and cards nested inside cards.
- Distinguish first-use, zero search results, filtered zero results, no recent activity, unavailable data, and permission-related states.

## High Priority

### 1. Dashboard First-Use Scaffold

1. Screen or component: Dashboard
2. Relevant file path: `app/(app)/dashboard/page.tsx`, `components/layout/page-surface.tsx`
3. Trigger condition: Dashboard route renders before dashboard metrics or activity data exists.
4. Current behavior: Empty dashed `PageSurface` with only a screen-reader-only heading.
5. Recommended heading: `Your indexing workspace is ready`
6. Recommended supporting copy: `Add a website, connect Search Console, and start inspecting URLs to populate this dashboard.`
7. Recommended primary action: `Add Website` linking to `/websites/new`
8. Optional secondary action: `Connect Google` linking to `/settings/google`
9. Suggested Lucide icon: `Gauge`
10. Priority: High

Type: First-use empty state.

Status:

Resolved in Design System Phase 1C-2. The dashboard now renders this first-use empty state with `Gauge`, `Add Website`, and `Connect Google`.

### 2. Websites First-Use State

1. Screen or component: Websites list
2. Relevant file path: `app/(app)/websites/page.tsx`
3. Trigger condition: `websites.length === 0` and no active search/status/priority filters.
4. Current behavior: Shows `No websites found` with combined copy for first-use and filtered states.
5. Recommended heading: `No websites yet`
6. Recommended supporting copy: `Add the first website you want to manage in IndexPilot.`
7. Recommended primary action: `Add Website` linking to `/websites/new`
8. Optional secondary action: None
9. Suggested Lucide icon: `Globe2`
10. Priority: High

Type: First-use empty state.

### 3. Website Sitemaps First-Use State

1. Screen or component: Website sitemap list
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/page.tsx`
3. Trigger condition: No sitemap records exist for the selected website and no active search/status filter is applied.
4. Current behavior: Shows `No sitemaps found` with combined copy for first-use and filtered states.
5. Recommended heading: `No sitemaps added yet`
6. Recommended supporting copy: `Add a sitemap URL manually so IndexPilot can test and import it when you are ready.`
7. Recommended primary action: `Add Sitemap Manually` linking to `#add-sitemap`
8. Optional secondary action: `Website Details` linking to `/websites/[id]`
9. Suggested Lucide icon: `ListTree`
10. Priority: High

Type: First-use empty state.

### 4. URL Inventory First-Use State

1. Screen or component: Website URL inventory
2. Relevant file path: `app/(app)/websites/[id]/urls/page.tsx`
3. Trigger condition: No `UrlRecord` rows exist for the selected website and no active search/source filter is applied.
4. Current behavior: Shows `No imported URLs yet` with a link to Sitemaps.
5. Recommended heading: `No imported URLs yet`
6. Recommended supporting copy: `Import a URL-set sitemap to fill this inventory with real discovered URLs.`
7. Recommended primary action: `Go to Sitemaps` linking to `/websites/[id]/sitemaps`
8. Optional secondary action: None
9. Suggested Lucide icon: `Link2`
10. Priority: High

Type: First-use empty state.

### 5. Inspection History First-Use State

1. Screen or component: Website URL inspection history
2. Relevant file path: `app/(app)/websites/[id]/inspections/page.tsx`
3. Trigger condition: No inspections exist for the selected website and no active filters are applied.
4. Current behavior: Shows `No inspections yet`; archived websites suppress the action.
5. Recommended heading: `No inspections yet`
6. Recommended supporting copy: `Inspect a URL to start tracking Google indexing results for this website.`
7. Recommended primary action: `Inspect a URL` linking to `/websites/[id]/inspect`
8. Optional secondary action: `URL Inventory` linking to `/websites/[id]/urls`
9. Suggested Lucide icon: `SearchCheck`
10. Priority: High

Type: First-use empty state.

### 6. Search Console Properties First-Use State

1. Screen or component: Search Console property list
2. Relevant file path: `app/(app)/search-console/properties/page.tsx`
3. Trigger condition: No Search Console property records exist and no active filters are applied.
4. Current behavior: Shows `No Search Console properties yet`; no action is rendered in the first-use state.
5. Recommended heading: `No Search Console properties yet`
6. Recommended supporting copy: `Connect a Google account and sync properties to make them available in IndexPilot.`
7. Recommended primary action: `Google settings` linking to `/settings/google`
8. Optional secondary action: None
9. Suggested Lucide icon: `Search`
10. Priority: High

Type: First-use empty state.

### 7. Google Accounts First-Use State

1. Screen or component: Google settings
2. Relevant file path: `app/(app)/settings/google/page.tsx`
3. Trigger condition: `accounts.length === 0`
4. Current behavior: Shows `No Google accounts connected` with a connect action.
5. Recommended heading: `No Google accounts connected`
6. Recommended supporting copy: `Connect a Google account to sync Search Console properties for this organization.`
7. Recommended primary action: `Connect Account` linking to `/api/google/oauth/start`
8. Optional secondary action: `Search Console properties` linking to `/search-console/properties`
9. Suggested Lucide icon: `ExternalLink` or `Cable`
10. Priority: High

Type: First-use empty state.

Status:

Resolved in Design System Phase 1C-2. Google settings now uses the shared empty-state component with `Cable`, `Connect Account`, and `Search Console properties`.

### 8. Inspection Form Missing Google Account

1. Screen or component: Single URL inspection form
2. Relevant file path: `app/(app)/websites/[id]/inspect/page.tsx`
3. Trigger condition: The website is accessible, but no Google accounts exist for the organization.
4. Current behavior: Shows an amber panel headed `No connected Google accounts` with links to properties and Google settings.
5. Recommended heading: `No connected Google accounts`
6. Recommended supporting copy: `Connect a Google account before running URL inspections for this website.`
7. Recommended primary action: `Google settings` linking to `/settings/google`
8. Optional secondary action: `Search Console properties` linking to `/search-console/properties`
9. Suggested Lucide icon: `AlertCircle`
10. Priority: High

Type: Permission-related setup state.

### 9. Inspection Form No Compatible Properties

1. Screen or component: Single URL inspection form
2. Relevant file path: `app/(app)/websites/[id]/inspect/page.tsx`
3. Trigger condition: Google accounts exist, but no active verified Search Console property is compatible with the selected website.
4. Current behavior: Shows an amber panel headed `No compatible Search Console properties`.
5. Recommended heading: `No compatible Search Console properties`
6. Recommended supporting copy: `Sync or connect a verified active property that matches this website before running inspections.`
7. Recommended primary action: `Search Console properties` linking to `/search-console/properties`
8. Optional secondary action: `Google settings` linking to `/settings/google`
9. Suggested Lucide icon: `AlertCircle`
10. Priority: High

Type: Permission-related setup state.

## Medium Priority

### 10. Websites Filtered Zero Results

1. Screen or component: Websites list
2. Relevant file path: `app/(app)/websites/page.tsx`
3. Trigger condition: No websites match active search, status, or priority filters.
4. Current behavior: Uses the same `No websites found` state as first-use.
5. Recommended heading: `No websites matched`
6. Recommended supporting copy: `Try a different name, domain, status, or priority filter.`
7. Recommended primary action: `Reset filters` linking to `/websites`
8. Optional secondary action: `Add Website` linking to `/websites/new`
9. Suggested Lucide icon: `Search`
10. Priority: Medium

Type: Filtered zero results.

Status:

Resolved in Design System Phase 1C-3. The websites page now renders this filtered-zero state separately from the first-use empty state.

### 11. Sitemaps Filtered Zero Results

1. Screen or component: Website sitemap list
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/page.tsx`
3. Trigger condition: No sitemaps match active search or status filters.
4. Current behavior: Uses the same `No sitemaps found` state as first-use.
5. Recommended heading: `No sitemaps matched`
6. Recommended supporting copy: `Try a different sitemap URL, error term, or status filter.`
7. Recommended primary action: `Reset filters` linking to `/websites/[id]/sitemaps`
8. Optional secondary action: `Add Sitemap Manually` linking to `#add-sitemap`
9. Suggested Lucide icon: `Search`
10. Priority: Medium

Type: Filtered zero results.

Status:

Resolved in Design System Phase 1C-3. The website sitemaps page now renders this filtered-zero state separately from the first-use empty state.

### 12. URL Inventory Filtered Zero Results

1. Screen or component: Website URL inventory
2. Relevant file path: `app/(app)/websites/[id]/urls/page.tsx`
3. Trigger condition: No URLs match active search or source sitemap filter.
4. Current behavior: Shows `No URLs match these filters` and a reset action.
5. Recommended heading: `No URLs matched`
6. Recommended supporting copy: `Try a different URL, path, or source sitemap filter.`
7. Recommended primary action: `Reset filters` linking to `/websites/[id]/urls`
8. Optional secondary action: None
9. Suggested Lucide icon: `Search`
10. Priority: Medium

Type: Filtered zero results.

### 13. Inspection History Filtered Zero Results

1. Screen or component: Website URL inspection history
2. Relevant file path: `app/(app)/websites/[id]/inspections/page.tsx`
3. Trigger condition: Active search, status, or property filters return no inspections.
4. Current behavior: Shows `No inspections matched` and a clear filters action.
5. Recommended heading: `No inspections matched`
6. Recommended supporting copy: `The current search or filters did not match any saved inspections.`
7. Recommended primary action: `Clear filters` linking to `/websites/[id]/inspections`
8. Optional secondary action: None
9. Suggested Lucide icon: `SearchCheck`
10. Priority: Medium

Type: Filtered zero results.

### 14. Search Console Properties Filtered Zero Results

1. Screen or component: Search Console property list
2. Relevant file path: `app/(app)/search-console/properties/page.tsx`
3. Trigger condition: Active search, sync status, property type, linked state, or pagination query returns no properties.
4. Current behavior: Shows `No properties match these filters` and a reset action.
5. Recommended heading: `No properties matched`
6. Recommended supporting copy: `Try a different property URL, account email, sync status, property type, or link filter.`
7. Recommended primary action: `Reset filters` linking to `/search-console/properties`
8. Optional secondary action: `Google settings` linking to `/settings/google`
9. Suggested Lucide icon: `Search`
10. Priority: Medium

Type: Filtered zero results.

### 15. Settings Landing Placeholder

1. Screen or component: Settings index
2. Relevant file path: `app/(app)/settings/page.tsx`, `components/layout/page-surface.tsx`
3. Trigger condition: Settings index renders with no settings overview content.
4. Current behavior: Empty `PageSurface` plus a Google Search Console management card.
5. Recommended heading: `Settings overview coming soon`
6. Recommended supporting copy: `Use Google Search Console settings now; more organization settings will appear here as they are added.`
7. Recommended primary action: `Manage Google` linking to `/settings/google`
8. Optional secondary action: None
9. Suggested Lucide icon: `Settings`
10. Priority: Medium

Type: Unavailable data / scaffold state.

### 16. Top-Level URL, Sitemap, Inspection, and Report Scaffolds

1. Screen or component: Top-level app placeholder routes
2. Relevant file path: `app/(app)/urls/page.tsx`, `app/(app)/sitemaps/page.tsx`, `app/(app)/inspections/page.tsx`, `app/(app)/reports/page.tsx`, `components/layout/page-surface.tsx`
3. Trigger condition: User navigates to top-level sections that currently render only `PageSurface`.
4. Current behavior: Empty dashed scaffold with no visible explanation or action.
5. Recommended heading: `Choose a website first`
6. Recommended supporting copy: `URL inventory, sitemaps, and inspections are currently managed from each website workspace.`
7. Recommended primary action: `View Websites` linking to `/websites`
8. Optional secondary action: For Reports, omit action until reports are implemented.
9. Suggested Lucide icon: `Globe2`
10. Priority: Medium

Type: Unavailable data / navigation guidance state.

### 17. Sitemap Details Imported URLs Placeholder

1. Screen or component: Sitemap details imported URLs panel
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`
3. Trigger condition: Viewing a sitemap detail page before imported URL list UI exists in that panel.
4. Current behavior: Shows a dashed box with implementation-phase copy.
5. Recommended heading: `Imported URLs are available in URL Inventory`
6. Recommended supporting copy: `This sitemap can import URLs, but the detailed URL list lives in the website URL inventory.`
7. Recommended primary action: `Open URL Inventory` linking to `/websites/[id]/urls`
8. Optional secondary action: None
9. Suggested Lucide icon: `Link2`
10. Priority: Medium

Type: Unavailable data.

### 18. Recent Activity Panel

1. Screen or component: Future recent activity dashboard or website panel
2. Relevant file path: `prisma/schema.prisma`, `lib/sitemaps/importer.ts`, future dashboard component
3. Trigger condition: ActivityLog exists but no activity records exist for the current organization, website, or sitemap scope.
4. Current behavior: Activity is written by the sitemap importer, but no recent activity UI is currently rendered.
5. Recommended heading: `No recent activity`
6. Recommended supporting copy: `Imports, inspections, and account changes will appear here as activity is recorded.`
7. Recommended primary action: `Inspect a URL` or `Go to Sitemaps`, depending on context
8. Optional secondary action: None
9. Suggested Lucide icon: `History`
10. Priority: Medium

Type: No recent activity.

## Low Priority

### 19. Sitemap Details Child Sitemaps

1. Screen or component: Sitemap details child sitemap list
2. Relevant file path: `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`
3. Trigger condition: A sitemap has no child sitemap records.
4. Current behavior: Shows a simple inline `No child sitemaps.` sentence.
5. Recommended heading: `No child sitemaps`
6. Recommended supporting copy: `Child sitemaps appear here when a sitemap index is imported.`
7. Recommended primary action: None
8. Optional secondary action: None
9. Suggested Lucide icon: `ListTree`
10. Priority: Low

Type: Unavailable nested data.

Status:

Resolved in Design System Phase 1C-4. The sitemap details child-sitemap panel now uses the shared empty-state component with `ListTree` and explanatory copy.

### 20. Website Detail Placeholder Values

1. Screen or component: Website details fields
2. Relevant file path: `app/(app)/websites/[id]/page.tsx`
3. Trigger condition: Fields such as notes, Google connected, or IndexNow enabled have no real value yet.
4. Current behavior: Detail rows show `No notes.`, `No`, and a `Placeholder` label.
5. Recommended heading: Not applicable; this is field-level unavailable data.
6. Recommended supporting copy: Use `Not available` for unavailable integrations and `No notes added` for notes.
7. Recommended primary action: For notes, `Edit`; for Google connection, `Google settings` once linking is appropriate.
8. Optional secondary action: None
9. Suggested Lucide icon: None
10. Priority: Low

Type: Unavailable data.

### 21. URL Details Placeholder Values

1. Screen or component: URL detail rows and URL inventory table fields
2. Relevant file path: `app/(app)/websites/[id]/urls/page.tsx`, `app/(app)/websites/[id]/urls/[urlId]/page.tsx`
3. Trigger condition: HTTP status, indexing status, source sitemap, or timestamp values are not available.
4. Current behavior: Uses `Not checked` or `Not available`.
5. Recommended heading: Not applicable; this is field-level unavailable data.
6. Recommended supporting copy: Continue using `Not checked` for future crawl/index checks and `Not available` for absent imported metadata.
7. Recommended primary action: None until checking workflows exist.
8. Optional secondary action: `View source sitemap` when available.
9. Suggested Lucide icon: None
10. Priority: Low

Type: Unavailable data.

### 22. Inspection Details Missing Result Fields

1. Screen or component: Inspection details sections
2. Relevant file path: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
3. Trigger condition: Stored inspection result fields such as coverage, verdict, canonical, robots, crawl, or timestamps are null.
4. Current behavior: Uses `Not available` in section rows.
5. Recommended heading: Not applicable; these are section-level missing values.
6. Recommended supporting copy: Keep `Not available`; optionally add one concise section note only if repeated missing values confuse users.
7. Recommended primary action: Reinspect control when the connected workflow is available.
8. Optional secondary action: Back to inspection history.
9. Suggested Lucide icon: None
10. Priority: Low

Type: Unavailable data.

### 23. Search Console Property Detail Missing Relationships

1. Screen or component: Search Console property details
2. Relevant file path: `app/(app)/search-console/properties/[propertyId]/page.tsx`
3. Trigger condition: Optional property fields, Google account display name, or linked website relationship is missing.
4. Current behavior: Uses `Not available`, `Unlinked`, or status badges depending on the field.
5. Recommended heading: Not applicable; this is field-level unavailable data.
6. Recommended supporting copy: Keep `Not available` for optional account fields and `Unlinked` for missing website link.
7. Recommended primary action: None until website-linking workflow exists.
8. Optional secondary action: `View Google account settings` when account is valid.
9. Suggested Lucide icon: None
10. Priority: Low

Type: Unavailable data / permission-adjacent relationship state.

### 24. Archived Website No-New-Action States

1. Screen or component: URL inventory and inspection history for archived websites
2. Relevant file path: `app/(app)/websites/[id]/urls/page.tsx`, `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/websites/[id]/inspect/page.tsx`
3. Trigger condition: Selected website has `ARCHIVED` status and no current records or compatible new action.
4. Current behavior: Uses amber archived notices and suppresses inspection action in history.
5. Recommended heading: `Website archived`
6. Recommended supporting copy: `Existing records remain available for reference. Restore the website before starting new inspection or import work.`
7. Recommended primary action: `Website Details` linking to `/websites/[id]`
8. Optional secondary action: Restore action where the existing action component supports it.
9. Suggested Lucide icon: `Archive`
10. Priority: Low

Type: Permission-related state.

## Implementation Notes

- First-use and filtered zero-result states should not share the same heading.
- Filtered zero-result states should usually include a reset or clear action.
- First-use states should direct users to the next setup step.
- Unavailable field values should stay concise and visible, usually `Not available` or `Not checked`.
- Avoid adding cards inside existing `CardContent` when an empty state already lives inside a card. Use an unframed panel, dashed surface, or compact inline treatment instead.
- Current database error states such as `Properties unavailable`, `URL inventory unavailable`, and `Inspection history unavailable` are intentionally excluded from this audit.

## Phase 1C Completion Summary

Resolved items:

- 1. Dashboard First-Use Scaffold
- 7. Google Accounts First-Use State
- 10. Websites Filtered Zero Results
- 11. Sitemaps Filtered Zero Results
- 19. Sitemap Details Child Sitemaps

Intentionally deferred items:

- 20. Website Detail Placeholder Values: field-level wording should be handled with a broader details-page consistency pass.
- 21. URL Details Placeholder Values: current `Not checked` and `Not available` labels are acceptable until checking workflows exist.
- 22. Inspection Details Missing Result Fields: current section-level fallbacks are acceptable until additional result actions are added.
- 23. Search Console Property Detail Missing Relationships: website-linking work is not part of this design-system phase.
- 24. Archived Website No-New-Action States: archived workflow copy should be handled with a dedicated archived-state pass.

Remaining unresolved items:

- 2. Websites First-Use State
- 3. Website Sitemaps First-Use State
- 4. URL Inventory First-Use State
- 5. Inspection History First-Use State
- 6. Search Console Properties First-Use State
- 8. Inspection Form Missing Google Account
- 9. Inspection Form No Compatible Properties
- 12. URL Inventory Filtered Zero Results
- 13. Inspection History Filtered Zero Results
- 14. Search Console Properties Filtered Zero Results
- 15. Settings Landing Placeholder
- 16. Top-Level URL, Sitemap, Inspection, and Report Scaffolds
- 17. Sitemap Details Imported URLs Placeholder
- 18. Recent Activity Panel
