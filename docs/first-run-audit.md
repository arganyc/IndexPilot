# First-Run Experience Audit

Sprint 3A audit only. This document reviews the current first-time user journey for a newly authenticated user with no connected Google account, no websites, no Search Console properties, no URL inspections, and no prior settings.

## Assumptions

- The user has reached the authenticated application shell after login.
- The user has an organization context available.
- No Google account is connected yet.
- No website records exist yet.
- No Search Console properties, URL records, sitemaps, or inspections exist yet.
- Google OAuth environment variables may or may not be configured. When they are missing, the Google settings page shows a safe configuration error.
- The current `/login` and `/signup` pages are placeholders, so a literal public signup-to-login flow is not fully implemented yet.

## Current First-Run Walkthrough

### 1. Auth Entry

- **Screen:** Log in
- **Route:** `/login`
- **Purpose:** Public placeholder for future authentication.
- **What the user sees:** "Log in to IndexPilot", brief supporting copy, a notice that authentication UI will be added later, a link to `/signup`, and a link back to `/`.
- **Expected action:** In the future, authenticate and enter the app. Today, there is no actual login form on this route.
- **What could confuse a first-time user:** The marketing header links to login, but the route clearly says authentication UI is not implemented.
- **Missing guidance:** No expected timeline, no alternate way to access the demo app, and no connection between auth placeholders and the existing Supabase-backed app shell.
- **Unnecessary friction:** A literal new user cannot create an account or log in from the public UI yet.
- **Recommended improvements:** Implement real Supabase auth UI before public launch, or label these pages as private-preview placeholders while the app is not publicly self-serve.

### 2. First App Landing

- **Screen:** Dashboard
- **Route:** `/dashboard`
- **Purpose:** Authenticated home screen.
- **What the user sees:** Empty state titled "Your indexing workspace is ready" with copy that says to add a website, connect Search Console, and start inspecting URLs. Primary action is "Add Website"; secondary action is "Connect Google".
- **Expected action:** Choose either website creation or Google connection.
- **What could confuse a first-time user:** The copy names three required setup actions, but the page does not explain the order or show progress. The primary CTA starts with website creation, while the most useful onboarding sequence may begin with Google Search Console connection.
- **Missing guidance:** No checklist, no "next best step", no explanation that URL inspection requires both an active website and a compatible verified Search Console property.
- **Unnecessary friction:** The user must infer which setup path unlocks the first successful inspection.
- **Recommended improvements:** Replace the generic first-run dashboard state with a setup checklist that shows "Connect Google Search Console", "Add or confirm a website", and "Inspect your first URL".

### 3. Website List With No Websites

- **Screen:** Websites
- **Route:** `/websites`
- **Purpose:** Manage tracked websites.
- **What the user sees:** Header with "Websites", an "Add Website" button, search and filters, then an empty state titled "No websites found" with an "Add Website" action.
- **Expected action:** Click "Add Website".
- **What could confuse a first-time user:** The empty-state copy says "Add your first website or adjust the current search and filters" even when there are no filters. A new user may wonder why filters are mentioned.
- **Missing guidance:** No explanation that the website domain should match a verified Search Console property for inspections.
- **Unnecessary friction:** The search and filter controls appear before any websites exist, adding noise for the first-run path.
- **Recommended improvements:** Use first-use-specific copy, such as "Add the first website you want to inspect", and include one short note about matching the website domain to a Search Console property.

### 4. Add Website

- **Screen:** Add Website
- **Route:** `/websites/new`
- **Purpose:** Create a Website record.
- **What the user sees:** Form fields for website name, domain, platform, priority, status, and notes. Supporting copy says domains are normalized before saving.
- **Expected action:** Enter website details and create the website.
- **What could confuse a first-time user:** Platform, priority, and status are operational fields that may feel premature during the first inspection setup. The domain field does not explain how URL-prefix and domain Search Console properties will match later.
- **Missing guidance:** No examples tied to Google properties, such as `sc-domain:example.com` versus `https://example.com/blog/`.
- **Unnecessary friction:** The user can create a website that will not have a compatible Search Console property, only discovering that later on the inspect page.
- **Recommended improvements:** Add lightweight helper text explaining that inspections require a verified Search Console property compatible with this domain.

### 5. Website Details After Creation

- **Screen:** Website Details
- **Route:** `/websites/[id]`
- **Purpose:** Show website metadata and website-level navigation.
- **What the user sees:** Website status, edit and action buttons, website navigation links for Website Details, Sitemaps, URL Inventory, and Inspection History. Detail rows include real sitemap and URL counts, plus placeholders for "Google connected: No" and "IndexNow enabled: No".
- **Expected action:** Continue to sitemaps, URL inventory, inspection history, or edit the website.
- **What could confuse a first-time user:** There is no direct "Inspect a URL" CTA on the details page. "Google connected: No" is a placeholder and may remain misleading even after a Google account exists but before a property is compatible.
- **Missing guidance:** No next-step prompt for connecting Google or running the first inspection.
- **Unnecessary friction:** The user must know to open "Inspection History" first, then click "Inspect a URL".
- **Recommended improvements:** Add a first-run action area on website details with "Connect Google" when needed and "Inspect a URL" when compatible properties exist.

### 6. Google Settings With No Connected Account

- **Screen:** Google Search Console Settings
- **Route:** `/settings/google`
- **Purpose:** Connect and manage Google accounts.
- **What the user sees:** Page header, "Connect Account" button, and an empty state titled "No Google accounts connected". The primary action connects an account. The secondary action goes to Search Console properties.
- **Expected action:** Click "Connect Account" and complete Google OAuth.
- **What could confuse a first-time user:** If OAuth configuration is missing, the page displays a combined sign-in/configuration error. A user cannot tell whether the issue is their session or the application's environment.
- **Missing guidance:** No explanation of why the `webmasters.readonly` scope is requested, that offline access is used for refresh tokens, or what happens after properties sync.
- **Unnecessary friction:** The secondary "Search Console properties" action leads to a page that may be empty and lacks a first-use action.
- **Recommended improvements:** Add a short setup explainer and make the post-connect next step explicit: "Choose a property or inspect a URL from a matching website."

### 7. Google OAuth Callback And Property Sync

- **Screen:** OAuth completion
- **Route:** `/api/google/oauth/callback` then `/settings/google?connected=...&properties=...`
- **Purpose:** Exchange the OAuth code, store encrypted tokens, and sync Search Console properties.
- **What the user sees:** On success, Google settings shows "Connected [email]. Synced [count] properties." On failure, it shows "Google account connection failed. Check OAuth configuration."
- **Expected action:** Review connected account or continue to properties/websites.
- **What could confuse a first-time user:** The success message confirms sync but does not direct the user to the next setup step. The error message is safe, but not actionable for a non-admin user.
- **Missing guidance:** No visible "Next: inspect a URL" path, no explanation of property compatibility, and no setup progress.
- **Unnecessary friction:** The user must decide whether to go to properties, websites, or dashboard next.
- **Recommended improvements:** Include a contextual next action after successful connection, such as "Continue to properties" or "Add a matching website".

### 8. Search Console Properties

- **Screen:** Search Console Properties
- **Route:** `/search-console/properties`
- **Purpose:** List synced Search Console properties.
- **What the user sees:** Summary cards, filters, search, and a table when records exist. With no records, the empty state says "No Search Console properties yet" and explains that the user should connect a Google account and sync properties from Google settings.
- **Expected action:** When no properties exist, go to Google settings. When properties exist, inspect which ones are active and verified.
- **What could confuse a first-time user:** The first-use empty state currently has no direct "Connect Google" action. When properties exist, linked and unlinked status may imply website linking is available, but website linking was intentionally deferred.
- **Missing guidance:** No explanation of how a property becomes available on the inspection form or how domain and URL-prefix compatibility work.
- **Unnecessary friction:** Users can see properties but not easily turn one into a first inspection from this page.
- **Recommended improvements:** Add a "Connect Google" action to the empty state, and later add a guided "Use this property" or website matching flow when linking is built.

### 9. Website Inspection History With No Inspections

- **Screen:** URL Inspection History
- **Route:** `/websites/[id]/inspections`
- **Purpose:** Show recent inspections for a website.
- **What the user sees:** Website navigation, an "Inspect a URL" header button, search/status/property controls, and an empty state titled "No inspections yet" with an "Inspect a URL" action.
- **Expected action:** Click "Inspect a URL".
- **What could confuse a first-time user:** Filter controls appear before any history exists. The page does not tell the user that a compatible verified Search Console property is required before the form will submit.
- **Missing guidance:** No checklist status such as "Google connected: required" or "Compatible property: required".
- **Unnecessary friction:** The user is asked to think about history filters before the first inspection exists.
- **Recommended improvements:** For first-use only, visually prioritize the "Inspect a URL" action and explain the dependency on compatible properties.

### 10. URL Inspection Form

- **Screen:** Inspect URL
- **Route:** `/websites/[id]/inspect`
- **Purpose:** Run one URL inspection using a compatible Search Console property.
- **What the user sees:** Website context, back links, and an "Inspect URL" form. If there are no compatible properties, an amber state says either "No connected Google accounts" or "No compatible Search Console properties", with links to Search Console properties and Google settings. The form remains visible but disabled.
- **Expected action:** Select a property, enter an HTTP or HTTPS URL belonging to the website, and submit. If blocked, go connect or sync Google.
- **What could confuse a first-time user:** The disabled form can feel like the destination is broken. The page does not explain whether the missing requirement is account connection, property verification, active sync status, domain mismatch, or URL-prefix path mismatch.
- **Missing guidance:** No examples of acceptable URLs, no property compatibility explanation, and no route back to add/edit the website domain if the property does not match.
- **Unnecessary friction:** The user may need to bounce between settings, properties, and website details without a guided recovery path.
- **Recommended improvements:** Add a requirement checklist above the form and tailor blocked-state actions to the exact missing requirement.

### 11. Inspection Submission

- **Screen:** Inspect URL form submission
- **Route:** `/websites/[id]/inspect`
- **Purpose:** Validate the form, call the single inspection service, and redirect to the saved inspection.
- **What the user sees:** Field-level validation for URL and property, button text changes to "Inspecting...", and successful or failed inspections redirect to `/websites/[id]/inspections/[inspectionId]` when an inspection ID exists.
- **Expected action:** Wait for the inspection result page.
- **What could confuse a first-time user:** A failed Google inspection can still redirect to a result page, which is correct for persistence but may be surprising without a success/failure transition message.
- **Missing guidance:** No progress explanation for a long-running Google API request beyond the pending button label.
- **Unnecessary friction:** If validation fails, the form keeps values, but broader setup failures are surfaced as general form errors.
- **Recommended improvements:** Keep the persisted-result behavior, but add a first-inspection transition message or result-page banner after redirect.

### 12. Inspection Details After First Inspection

- **Screen:** Inspection Details
- **Route:** `/websites/[id]/inspections/[inspectionId]`
- **Purpose:** Display one saved URL inspection.
- **What the user sees:** Header with inspected URL, status, creation date, "Reinspect URL" action, back to history, and sections for Coverage, Indexing Verdict, Indexing State, Robots State, Crawl Information, Canonical Information, Last Crawl, and Inspection Timestamps. Missing values display "Not available".
- **Expected action:** Review Google's inspection result, optionally reinspect, or return to history.
- **What could confuse a first-time user:** There is no explicit "inspection complete" success message. The detail sections are useful, but a first-time user may not know what to do after seeing coverage, verdict, and crawl details.
- **Missing guidance:** No recommended next actions such as "Inspect another URL", "View inspection history", or "Review this website's URL inventory".
- **Unnecessary friction:** The success moment is not celebrated or converted into a clear next step.
- **Recommended improvements:** Add a first-inspection success state or banner with next actions and a concise explanation of the result sections.

## Priority Findings

### High Priority

1. **Authentication entry is still placeholder-only**
   - **Files:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`
   - **Impact:** A literal first-time user cannot self-serve account creation or login from the public UI.
   - **Recommendation:** Implement the Supabase auth UI before public onboarding, or clearly mark the product as invite/private-preview.

2. **No guided setup sequence from the dashboard**
   - **Files:** `app/(app)/dashboard/page.tsx`
   - **Impact:** The user sees required setup actions but no order, progress, or dependency explanation.
   - **Recommendation:** Add a first-run checklist that guides Google connection, website setup, property readiness, and first inspection.

3. **Search Console properties first-use page is a dead end**
   - **Files:** `app/(app)/search-console/properties/page.tsx`
   - **Impact:** The empty state tells users to connect Google settings but does not provide an action.
   - **Recommendation:** Add a primary "Connect Google" action and optionally a secondary "Back to dashboard" action.

4. **Website details do not direct users to the first inspection**
   - **Files:** `app/(app)/websites/[id]/page.tsx`, `components/websites/website-navigation.tsx`
   - **Impact:** After creating a website, the next inspection step is not obvious.
   - **Recommendation:** Add contextual setup actions on website details, including "Connect Google" or "Inspect a URL" depending on readiness.

5. **Compatible-property blocking state lacks enough diagnosis**
   - **Files:** `app/(app)/websites/[id]/inspect/page.tsx`
   - **Impact:** Users can reach a disabled inspection form without knowing the exact missing requirement.
   - **Recommendation:** Show a checklist for account connected, property synced, property active, property verified, and property compatible with the website.

6. **No first-inspection success moment**
   - **Files:** `app/(app)/websites/[id]/inspections/[inspectionId]/page.tsx`
   - **Impact:** The first successful inspection lands on details but does not orient the user or suggest next actions.
   - **Recommendation:** Add a success message and guided next actions after the first completed inspection.

### Medium Priority

1. **Dashboard CTA order may not match the ideal setup sequence**
   - **Files:** `app/(app)/dashboard/page.tsx`
   - **Recommendation:** If onboarding begins with Google, make "Connect Google" the primary first-run action and keep "Add Website" as the next step.

2. **Add Website lacks Search Console compatibility helper text**
   - **Files:** `components/websites/website-form.tsx`
   - **Recommendation:** Add concise domain-matching guidance without changing the form structure.

3. **Google connection success does not identify the next step**
   - **Files:** `app/(app)/settings/google/page.tsx`
   - **Recommendation:** After OAuth success, offer "View properties", "Add matching website", or "Inspect a URL" when enough data exists.

4. **Property list can imply linking exists before linking UI is available**
   - **Files:** `app/(app)/search-console/properties/page.tsx`
   - **Recommendation:** Add small explanatory text that website linking/matching is a future workflow, while inspections use compatible active verified properties.

5. **Inspection history exposes filters before first use**
   - **Files:** `app/(app)/websites/[id]/inspections/page.tsx`
   - **Recommendation:** In first-use state, prioritize the empty-state action and reduce emphasis on filters until records exist.

6. **Long-running inspection progress is minimal**
   - **Files:** `components/url-inspections/inspection-form.tsx`
   - **Recommendation:** Keep the current pending button, but consider a short inline note that Google inspection can take a moment.

### Low Priority

1. **Website list first-use copy mentions filters when no filters are active**
   - **Files:** `app/(app)/websites/page.tsx`
   - **Recommendation:** Use distinct first-use copy for no websites.

2. **Placeholder values on website details are visually labeled but not explained**
   - **Files:** `app/(app)/websites/[id]/page.tsx`
   - **Recommendation:** Replace placeholder labels with milestone-aware helper text when integrations are not yet connected.

3. **Global app badge still says Phase 2**
   - **Files:** `components/layout/app-shell.tsx`
   - **Recommendation:** Update or remove the phase badge before a public onboarding release.

4. **Settings area lacks a broader setup overview**
   - **Files:** `app/(app)/settings/page.tsx`, `app/(app)/settings/google/page.tsx`
   - **Recommendation:** Add a simple settings overview once more integrations are available.

## Recommended Onboarding Flow

Keep the first-run flow short and task-oriented:

1. **Connect Google Search Console**
   - Route: `/settings/google`
   - Primary action: Connect Google account.
   - Completion signal: Account connected and properties synced.

2. **Choose or confirm a property**
   - Route: `/search-console/properties`
   - Primary action: Pick a verified active property to use.
   - Completion signal: User understands which property matches the website they want to inspect.

3. **Add or confirm the website**
   - Route: `/websites/new` or `/websites/[id]`
   - Primary action: Create a Website record whose domain matches the selected property.
   - Completion signal: Website exists and a compatible property is available.

4. **Inspect your first URL**
   - Route: `/websites/[id]/inspect`
   - Primary action: Enter a URL and submit inspection.
   - Completion signal: Inspection record is created and the user lands on the result page.

5. **Success**
   - Route: `/websites/[id]/inspections/[inspectionId]`
   - Primary action: Review the result and choose the next task.

## Recommended First-Inspection Success Screen

Immediately after the first successful completed inspection, show a lightweight success panel on the inspection details route.

### Success Message

- **Heading:** First inspection complete
- **Supporting copy:** IndexPilot saved Google's latest inspection data for this URL. You can review the result now, inspect another URL, or start building inspection history for this website.

### Suggested Next Actions

- **Primary:** Inspect another URL
  - Destination: `/websites/[id]/inspect`
- **Secondary:** View inspection history
  - Destination: `/websites/[id]/inspections`
- **Optional:** View website details
  - Destination: `/websites/[id]`

### Result Orientation

Show a short "What to review" list:

- Coverage and indexing verdict
- Crawl and robots states
- Canonical URLs
- Last crawl time

Avoid recommendations or SEO diagnosis until a later product phase supports them.

## Recommended Implementation Order

1. Implement real auth UI or clearly gate the current private-preview flow.
2. Add a dashboard first-run checklist with setup progress.
3. Improve no-property and no-compatible-property states with exact next actions.
4. Add first-run guidance to website creation and website details.
5. Add a first-inspection success panel on the inspection details page.

## Notes For Future Sprint Planning

- Onboarding should not bypass existing server-side authorization, property compatibility, or inspection service validation.
- The onboarding flow should use trusted server-side organization context only.
- Google tokens and raw inspection responses should remain server-side.
- The first-run experience can be built incrementally by improving existing empty states and adding a small setup checklist before introducing a dedicated onboarding route.
