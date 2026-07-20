# Contextual Guidance Audit

Sprint 3D-1 audit only. This document reviews where lightweight contextual guidance would most help users inside the authenticated IndexPilot application. No UI, route, authentication, Prisma, or behavior changes are included in this phase.

## Scope And Sources

Documents read:

- `docs/design-system.md`
- `docs/first-run-audit.md`
- `docs/onboarding-architecture.md`
- `docs/first-inspection-success-audit.md`

Application areas inspected:

- Dashboard and onboarding: `app/(app)/dashboard/page.tsx`, `components/onboarding/*`
- Websites: `app/(app)/websites/page.tsx`, `app/(app)/websites/[id]/page.tsx`, `components/websites/website-form.tsx`, `components/websites/website-navigation.tsx`
- Sitemaps: `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`, `components/sitemaps/sitemap-form.tsx`
- URL inventory: `app/(app)/websites/[id]/urls/page.tsx`
- URL inspection form: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
- Inspection history and details: `app/(app)/websites/[id]/inspections/page.tsx`, `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Google account connection: `app/(app)/settings/google/page.tsx`, `components/google/google-account-actions.tsx`
- Search Console properties: `app/(app)/search-console/properties/page.tsx`, `app/(app)/search-console/properties/[propertyId]/page.tsx`

## High-Priority Opportunities

Limit: five high-priority opportunities.

1. URL inspection form requirement guidance
   - Route: `/websites/[id]/inspect`
   - Files: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
   - Type: inline callout plus helper text
   - Why it matters: users can reach a disabled or blocked inspection form without clearly understanding the dependency chain.

2. Search Console property compatibility explanation
   - Routes: `/search-console/properties`, `/search-console/properties/[propertyId]`, `/websites/[id]/inspect`
   - Files: `app/(app)/search-console/properties/page.tsx`, `app/(app)/search-console/properties/[propertyId]/page.tsx`, `app/(app)/websites/[id]/inspect/page.tsx`, `lib/url-inspections/property-compatibility.ts`
   - Type: helper text and status explanation
   - Why it matters: property type, verified state, active state, and URL-prefix path matching determine whether an inspection can run.

3. Inspection result interpretation
   - Route: `/websites/[id]/inspections/[inspectionId]`
   - Files: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`, `lib/url-inspections/result-page.ts`
   - Type: status explanation
   - Why it matters: users may confuse "inspection completed" with "URL indexed" or treat raw Google states as recommendations.

4. Sitemap import guidance
   - Routes: `/websites/[id]/sitemaps`, `/websites/[id]/sitemaps/[sitemapId]`
   - Files: `app/(app)/websites/[id]/sitemaps/page.tsx`, `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`, `components/sitemaps/sitemap-form.tsx`, `components/sitemaps/import-summary.tsx`
   - Type: inline callout and helper text
   - Why it matters: users need to understand that saving a sitemap is separate from fetching/importing it, and that sitemap indexes create child sitemap records.

5. Website details next-step guidance
   - Route: `/websites/[id]`
   - Files: `app/(app)/websites/[id]/page.tsx`, `components/websites/website-navigation.tsx`
   - Type: next-step action and helper text
   - Why it matters: after creating a website, users see details and navigation but may not know whether to add a sitemap, connect Google, or inspect a URL next.

## Page And Workflow Findings

### Dashboard

- Route: `/dashboard`
- Relevant files and components: `app/(app)/dashboard/page.tsx`, `components/onboarding/onboarding-checklist.tsx`, `components/onboarding/onboarding-completed-gate.tsx`, `components/layout/empty-state.tsx`
- User goal: understand setup progress and choose the next step.
- Current guidance: onboarding checklist shows Google connection, property selection, and first inspection. Completed state links to inspection history and inspect-another-URL. Dashboard empty state mentions adding a website, connecting Search Console, and inspecting URLs.
- Missing explanation: the dashboard does not explain why a compatible website/property relationship is required before inspecting a URL.
- Likely user confusion: a user may complete one setup step, then wonder why the inspection action is unavailable or where a website fits into the Google property flow.
- Recommended guidance: add one short sentence under the checklist: "URL inspections require an active website and a verified Search Console property that matches it."
- Guidance type: helper text.
- Recommended priority: Medium.

### Website List

- Route: `/websites`
- Relevant files and components: `app/(app)/websites/page.tsx`, `components/layout/empty-state.tsx`, `components/websites/website-actions.tsx`
- User goal: add or find a website to manage.
- Current guidance: heading says websites are tracked by IndexPilot; empty state prompts adding a website; filtered state prompts resetting filters.
- Missing explanation: no first-use explanation of what a Website record unlocks.
- Likely user confusion: users may treat Website as a generic bookmark rather than the local container for sitemaps, URL inventory, and inspections.
- Recommended guidance: first-use empty copy should say, "A website is the workspace for its sitemaps, imported URLs, and URL inspections."
- Guidance type: empty-state explanation.
- Recommended priority: Low.

### Add Or Edit Website

- Route: `/websites/new`, `/websites/[id]/edit`
- Relevant files and components: `components/websites/website-form.tsx`, `app/(app)/websites/new/page.tsx`, `app/(app)/websites/[id]/edit/page.tsx`
- User goal: create or update the website domain and operational metadata.
- Current guidance: form says domains are normalized before saving.
- Missing explanation: no example of how domain values relate to Search Console domain and URL-prefix properties.
- Likely user confusion: a user may create `example.com` and later wonder why a property for `https://example.com/blog/` only supports matching URLs.
- Recommended guidance: add helper text below Domain: "Use the website domain you manage in Search Console. URL-prefix properties only match URLs under that exact prefix."
- Guidance type: helper text.
- Recommended priority: Medium.

### Website Details

- Route: `/websites/[id]`
- Relevant files and components: `app/(app)/websites/[id]/page.tsx`, `components/websites/website-navigation.tsx`, `components/websites/website-actions.tsx`
- User goal: review the website and decide the next workflow.
- Current guidance: shows website metadata, sitemap count, imported URL count, and website navigation. Some integration rows are marked "Placeholder".
- Missing explanation: no contextual next step based on whether the website has sitemaps, URLs, compatible properties, or inspections.
- Likely user confusion: users may not know whether to add a sitemap, inspect a URL, or connect Google from this page.
- Recommended guidance: add a compact "Recommended next step" area that chooses one action: add/import sitemap when no URLs exist, inspect a URL when a compatible property exists, or connect/sync Google when no property is available.
- Guidance type: next-step action.
- Recommended priority: High.

Sprint 3D-10 website-details helper status: Implemented.

- Route updated: `/websites/[id]`
- Component updated: `app/(app)/websites/[id]/page.tsx`
- Guidance type used: static helper text below the page heading
- Final copy: Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google's indexing decisions.
- Notes: Existing website information, navigation, buttons, actions, statistics, and detail card remain unchanged.
- Sprint 3D status: Complete.

### Sitemap List

- Route: `/websites/[id]/sitemaps`
- Relevant files and components: `app/(app)/websites/[id]/sitemaps/page.tsx`, `components/sitemaps/sitemap-form.tsx`, `components/sitemaps/sitemap-actions.tsx`
- User goal: save, find, and manage sitemap files for a website.
- Current guidance: empty state says add a sitemap manually; form says it saves a known sitemap URL without fetching it.
- Missing explanation: not enough separation between saving, test fetching, parsing, and importing URLs.
- Likely user confusion: users may expect that adding a sitemap immediately imports URLs.
- Recommended guidance: add a short inline callout above the form: "Adding saves the sitemap record. Use Import on the sitemap details page to fetch it and save URLs."
- Guidance type: inline callout.
- Recommended priority: High.

Sprint 3D-8 sitemap-page helper status: Implemented.

- Route updated: `/websites/[id]/sitemaps`
- Component updated: `app/(app)/websites/[id]/sitemaps/page.tsx`
- Guidance type used: static helper text below the page heading
- Final copy: Sitemaps help IndexPilot discover which URLs belong to this website. They do not guarantee that Google will crawl or index every URL.
- Notes: Existing sitemap filters, cards, empty states, form, and actions remain unchanged.

### Sitemap Details And Import

- Route: `/websites/[id]/sitemaps/[sitemapId]`
- Relevant files and components: `app/(app)/websites/[id]/sitemaps/[sitemapId]/page.tsx`, `components/sitemaps/test-fetch-button.tsx`, `components/sitemaps/parse-test-button.tsx`, `components/sitemaps/import-sitemap-button.tsx`, `components/sitemaps/import-summary.tsx`
- User goal: test, parse, import, and review one sitemap.
- Current guidance: card copy says URL-set sitemaps can be imported and sitemap indexes can be recursively processed into child sitemap records. Child sitemap empty state explains when children appear.
- Missing explanation: users do not see the importer safety limits or partial-failure model before running import.
- Likely user confusion: a user may see warnings after import and not know whether imported URLs were preserved or why a child sitemap failed.
- Recommended guidance: add concise helper text near import actions: "Imports preserve successful URLs even when some child sitemaps fail. Safety limits stop overly large imports before they can overwhelm the workspace."
- Guidance type: inline callout.
- Recommended priority: High.

### URL Inventory

- Route: `/websites/[id]/urls`
- Relevant files and components: `app/(app)/websites/[id]/urls/page.tsx`, `components/urls/copy-url-button.tsx`, `lib/urls/inventory.ts`
- User goal: review real URLs imported from sitemaps and drill into source records.
- Current guidance: summary cards, filters, table, "Not checked" placeholders for HTTP and indexing status, and an empty state pointing to Sitemaps.
- Missing explanation: "Not checked" appears without clarifying that crawling and indexing checks are not part of URL inventory yet.
- Likely user confusion: users may think IndexPilot attempted checks and found no data, rather than seeing an intentionally unavailable phase.
- Recommended guidance: add a small status explanation near the table: "HTTP and indexing status show Not checked until crawling or URL inspection data is connected for these records."
- Guidance type: status explanation.
- Recommended priority: Medium.

Sprint 3D-9 URL-inventory helper status: Implemented.

- Route updated: `/websites/[id]/urls`
- Component updated: `app/(app)/websites/[id]/urls/page.tsx`
- Guidance type used: static helper text below the page heading
- Final copy: URL inventory shows the pages IndexPilot has discovered for this website. A discovered URL is not necessarily indexed by Google.
- Notes: Existing URL list, filters, status labels, pagination, empty state, and actions remain unchanged.

### URL Details

- Route: `/websites/[id]/urls/[urlId]`
- Relevant files and components: `app/(app)/websites/[id]/urls/[urlId]/page.tsx`
- User goal: review one imported URL record and navigate to related website/sitemap/live URL.
- Current guidance: values are labeled, missing values are shown as not checked or not available.
- Missing explanation: no direct explanation that the URL record came from sitemap import and is not the same as an inspection result.
- Likely user confusion: users may expect indexing status here to reflect Google immediately.
- Recommended guidance: add helper text: "This record is imported from sitemap data. Inspect the URL to save Google's current indexing result."
- Guidance type: helper text.
- Recommended priority: Low.

### URL Inspection Form

- Route: `/websites/[id]/inspect`
- Relevant files and components: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`, `lib/url-inspections/form-page.ts`, `lib/url-inspections/property-compatibility.ts`
- User goal: run a single Google URL Inspection request for a URL that belongs to the selected website and property.
- Current guidance: blocked states distinguish no Google account from no compatible properties. Form labels URL and Search Console property. Invalid URL record warnings are safe.
- Missing explanation: no requirement checklist for account connected, property active, property verified, and URL/property compatibility.
- Likely user confusion: users may not understand why a visible Search Console property is excluded, why URL-prefix path mismatches fail, or why an archived website disables submission.
- Recommended guidance: add a compact requirements callout above the form with these bullets: "Connected Google account, active verified property, URL belongs to this website, URL matches the selected property." Add field helper text with one acceptable URL example.
- Guidance type: inline callout plus helper text.
- Recommended priority: High.

### Inspection History

- Route: `/websites/[id]/inspections`
- Relevant files and components: `app/(app)/websites/[id]/inspections/page.tsx`, `lib/url-inspections/history.ts`, `lib/url-inspections/result-page.ts`
- User goal: find recent inspections and compare status, verdict, coverage, and timing.
- Current guidance: summary cards explain counts are based on the 25 most recent inspections. Empty and filtered states are distinct. Filters preserve query state.
- Missing explanation: no short explanation of what verdict versus coverage means.
- Likely user confusion: users may treat `PASS`, `FAIL`, coverage text, and inspection status as interchangeable.
- Recommended guidance: add a small status legend: "Status is whether the inspection request finished. Verdict and coverage are Google's indexing signals for the URL."
- Guidance type: status explanation.
- Recommended priority: Medium.

Sprint 3D-7 inspection-history helper status: Implemented.

- Route updated: `/websites/[id]/inspections`
- Component updated: `app/(app)/websites/[id]/inspections/page.tsx`
- Guidance type used: static helper text below the page heading
- Final copy: Inspection history shows previous Google URL inspection results so you can review how a URL's reported status has changed over time.
- Notes: Existing heading, filters, table, summary cards, pagination, and empty states remain unchanged.

### Inspection Details

- Route: `/websites/[id]/inspections/[inspectionId]`
- Relevant files and components: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`, `lib/url-inspections/result-page.ts`, `lib/url-inspections/first-completed-inspection.ts`
- User goal: understand the saved Google inspection result and decide whether to reinspect or investigate.
- Current guidance: completed inspections include success summary with first-use variation, clear request completion, indexing status summary, and actions. Detailed sections show coverage, verdict, indexing state, robots state, crawl information, canonical information, last crawl, and timestamps.
- Missing explanation: detailed sections do not explain what the raw Google fields mean or how to interpret `Not available`.
- Likely user confusion: users may infer that `Not available` means a problem, or that a not-indexed coverage state can be fixed directly by IndexPilot.
- Recommended guidance: add one compact "How to read this result" explanation near the detailed sections: "Google controls indexing. IndexPilot stores the result, highlights signals, and helps you decide what to check next."
- Guidance type: status explanation.
- Recommended priority: High.

Sprint 3D-4 indexing-status status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Guidance type used: inline status explanation in the completed-inspection summary
- Supported statuses: indexed, not indexed, unknown or unavailable
- Indexed copy: Google currently reports that this URL is indexed. Its visibility in search results can still vary.
- Not-indexed copy: Google currently reports that this URL is not indexed. Review the inspection details for possible reasons and next steps.
- Unknown fallback copy: Google did not provide a confirmed indexing status for this inspection. Review the available details or inspect the URL again later.
- Notes: Unexpected or missing coverage data uses the unknown fallback. Failed inspections do not render completed-result guidance.

Sprint 3D-5 not-indexed next-checks status: Implemented.

- Route updated: `/websites/[id]/inspections/[inspectionId]`
- Component updated: `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
- Trigger: only the not-indexed indexing-status path
- Final heading: What to check next
- Final copy: Review Google's inspection details. Make any necessary improvements to the page. Inspect this URL again after meaningful changes.
- Notes: Indexed and unknown or unavailable indexing statuses do not render this section.

### Google Account Settings

- Route: `/settings/google`
- Relevant files and components: `app/(app)/settings/google/page.tsx`, `components/google/google-account-actions.tsx`, `lib/google/accounts.ts`, `lib/google/oauth.ts`
- User goal: connect, refresh, sync, or disconnect Google Search Console accounts.
- Current guidance: account cards show email, property count, last synced, token status, sync errors, and connection success/failure banners.
- Missing explanation: no concise explanation of the requested Google scope, offline refresh behavior, or what property sync does next.
- Likely user confusion: users may worry about token storage or expect connection alone to create websites.
- Recommended guidance: add helper text below the page heading: "IndexPilot requests read-only Search Console access, stores tokens securely, and syncs property metadata for this organization."
- Guidance type: helper text.
- Recommended priority: Medium.

### Search Console Property List

- Route: `/search-console/properties`
- Relevant files and components: `app/(app)/search-console/properties/page.tsx`, `lib/search-console/property-details.ts`
- User goal: review synced Search Console properties and find a property by URL/account/status.
- Current guidance: summary cards, filters, table, linked/unlinked labels, verified/unverified badges, sync status badges.
- Missing explanation: no explanation of why unlinked properties are not editable yet, or what Active, Missing, Error, Verified, and Unverified mean in workflow terms.
- Likely user confusion: users may believe an unlinked property is unusable, or that a Missing property was deleted from IndexPilot.
- Recommended guidance: add status helper copy near the filters: "Properties remain listed even if Google no longer returns them. Verified active properties can be used for compatible URL inspections."
- Guidance type: status explanation.
- Recommended priority: Medium.

Sprint 3D-3 empty-state status: Implemented.

- Route updated: `/search-console/properties`
- Component updated: `app/(app)/search-console/properties/page.tsx`
- Empty state trigger: no Search Console property records and no active filters
- Final heading: No Search Console properties yet
- Final copy: Connect a Google account and sync properties to make them available in IndexPilot for review and URL inspection setup.
- Action destination: `/settings/google`
- Notes: Filtered empty results and populated property tables remain unchanged.

### Search Console Property Details

- Route: `/search-console/properties/[propertyId]`
- Relevant files and components: `app/(app)/search-console/properties/[propertyId]/page.tsx`, `lib/search-console/property-details.ts`, `lib/search-console/prisma-property-details.ts`
- User goal: understand one property, its account, sync state, and linked website relationship.
- Current guidance: badges for status, verification, link state, and type; warning/error notices for Missing, Error, and archived linked website.
- Missing explanation: no explanation of domain versus URL-prefix compatibility, and no note that website linking is not yet implemented from this page.
- Likely user confusion: users may expect a "Link website" action or may not understand why a URL-prefix property only supports URLs below its prefix.
- Recommended guidance: add helper text in property details: "Domain properties can inspect matching hostnames. URL-prefix properties can inspect URLs under the exact prefix. Website linking will be added in a later phase."
- Guidance type: helper text.
- Recommended priority: Medium.

## Recommended Sprint 3D-2 Item

Implement the URL inspection form requirements callout on `/websites/[id]/inspect`.

Reason:

- It is the highest leverage guidance point in the first successful inspection path.
- It explains what a user must have before submitting.
- It directly addresses no-Google-account, no-compatible-property, archived website, URL-to-website, and property-compatibility confusion.
- It can reuse existing data already loaded by `getUrlInspectionFormPageData`.
- It can remain small: one semantic callout and one or two short field helper lines.

Suggested copy:

Title: Before you inspect

Body: URL inspections require a connected Google account, an active verified Search Console property, and a URL that belongs to this website and matches the selected property.

Optional field helper:

- URL: Use an HTTP or HTTPS URL from this website, such as `https://example.com/page`.
- Search Console property: Domain properties can cover matching hostnames. URL-prefix properties only cover URLs under that prefix.

Do not claim IndexPilot can force Google to index a URL. Keep the copy factual and setup-focused.

Sprint 3D-2 status: Implemented.

- Route updated: `/websites/[id]/inspect`
- Components updated: `app/(app)/websites/[id]/inspect/page.tsx`, `components/url-inspections/inspection-form.tsx`
- Guidance type used: inline callout plus visible field helper text
- Final callout heading: Before you inspect
- Final callout copy: URL inspections require a connected Google account, an active verified Search Console property, and a URL that belongs to this website and matches the selected property.
- Final field helper copy: Use an HTTP or HTTPS URL from this website, such as `https://example.com/page`. Domain properties can cover matching hostnames. URL-prefix properties only cover URLs under that prefix.
- Action route: none. Existing blocked-state links to `/search-console/properties` and `/settings/google` remain unchanged.

Sprint 3D-6 URL-input helper status: Implemented.

- Route updated: `/websites/[id]/inspect`
- Component updated: `components/url-inspections/inspection-form.tsx`
- Guidance type used: visible helper text directly below the URL input
- Final copy: Inspect a URL when you want to check Google's latest reported indexing status for that page.
- Accessibility: the helper remains associated with the URL input through `aria-describedby`, alongside validation messages when present.

## Accessibility Recommendations

- Tooltips must be keyboard accessible, triggered by focus as well as hover, and must not contain essential instructions that are unavailable elsewhere.
- Prefer visible helper text for required setup guidance, especially on forms and blocked states.
- Use semantic callouts with headings when guidance affects whether an action can be completed.
- Keep status explanations in visible text next to badges. Do not rely on badge color alone.
- For mobile, stack callout content and actions; avoid side-by-side explanation/action layouts that squeeze long URLs.
- Decorative Lucide icons should use `aria-hidden="true"`.
- Error-adjacent guidance should not replace real errors. Database, authentication, and authorization failures should remain explicit safe error states.
- Missing values should keep visible text such as `Not available` or `Not checked`, with helper copy explaining what those states mean when needed.

## Prioritization Summary

High priority:

- URL inspection form requirement guidance.
- Search Console property compatibility explanation.
- Inspection result interpretation.
- Sitemap import guidance.
- Website details next-step guidance.

Medium priority:

- Dashboard setup dependency helper.
- Add/Edit Website domain compatibility helper.
- URL inventory `Not checked` explanation.
- Inspection history status legend.
- Google settings security/scope helper.
- Search Console property list status explanation.
- Search Console property details property-type explanation.

Low priority:

- Website list first-use explanation.
- URL details sitemap-import versus inspection-result helper.

Deferred:

- Modal tours, forced walkthroughs, blocking popovers, large documentation panels, and recommendation engines.
- Any claim that IndexPilot can force indexing, control Google Search results, replace Google Search Console, or submit ordinary URLs through an unsupported indexing API.
