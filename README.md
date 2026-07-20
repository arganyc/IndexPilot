# IndexPilot

Phase 1 scaffold for IndexPilot, a Next.js application for technical SEO workflows.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL
- Supabase Auth

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL and Supabase project values, then generate the Prisma client when models are added:

```bash
npm run db:generate
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Routes

- `/` Dashboard
- `/websites` Websites
- `/websites/new` Add Website
- `/websites/[id]` Website Details
- `/websites/[id]/edit` Edit Website
- `/websites/[id]/sitemaps` Website Sitemaps
- `/websites/[id]/sitemaps/[sitemapId]` Sitemap Details
- `/websites/[id]/urls` Website URL Inventory
- `/websites/[id]/urls/[urlId]` URL Details
- `/urls` URLs
- `/sitemaps` Sitemaps
- `/inspections` Inspections
- `/reports` Reports
- `/search-console/properties` Search Console Properties
- `/search-console/properties/[propertyId]` Search Console Property Details
- `/settings` Settings
- `/settings/google` Google Search Console Accounts

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm run start` starts the production server.
- `npm run lint` runs ESLint.
- `npm run db:generate` generates Prisma client code.
- `npm run db:migrate` runs Prisma migrations locally.
- `npm run db:seed` seeds demonstration Website Manager data.
- `npm run typecheck` runs TypeScript checks.
- `npm run test` runs unit tests.

## Current Phase Scope

Phase 4B-2D-3 documents the Search Console property list and details pages.
Website linking UI, URL Inspection, Search Analytics, IndexNow, crawling, AI
analysis, reporting, billing, and background workers are not part of this phase.

Google OAuth flow:

- `/settings/google` lists connected Google accounts for the current
  organization.
- `/api/google/oauth/start` starts Google OAuth 2.0 with offline access,
  incremental authorization, a CSRF state cookie, and the
  `https://www.googleapis.com/auth/webmasters.readonly` scope.
- `/api/google/oauth/callback` validates state, exchanges the authorization code,
  fetches the Google profile, fetches Search Console properties, stores encrypted
  tokens, and redirects back to settings.
- The scope configuration is centralized so future Google scopes can be added
  without redesigning the OAuth flow.

Google database models:

- `GoogleAccount` stores the organization ID, Google user ID, email, display
  name, avatar URL, encrypted access token, encrypted refresh token, token
  expiry, sync timestamp, and sync errors.
- `SearchConsoleProperty` stores organization ID, Google account ID, nullable
  website ID, raw site URL, normalized site URL, property type, permission
  level, verification status, sync status, last synced date, last seen date,
  optional removed-from-Google date, and timestamps.
- Google accounts are unique by `(organizationId, googleUserId)`.
- Search Console properties are unique by `(googleAccountId, normalizedSiteUrl)`.

Google token security:

- Access and refresh tokens are encrypted with AES-256-GCM before persistence.
- `TOKEN_ENCRYPTION_KEY` must be configured with a 32+ character secret.
- Refresh tokens are preserved when Google does not return a new refresh token.
- Expired access tokens are refreshed automatically with the refresh token.
- Google errors shown to users are concise and do not include raw token payloads.

Property synchronization:

- OAuth callback performs an initial Search Console property sync.
- Users can click `Refresh Properties` to reconcile properties returned by
  Google.
- Every returned property URL is normalized before storage.
- New properties are created with `syncStatus = ACTIVE`.
- Existing properties update permission level, verification state, property type,
  `lastSeenAt`, `lastSyncedAt`, and `syncStatus`.
- Duplicate properties are deduplicated by normalized Search Console site URL.
- Property type is inferred as `DOMAIN` for `sc-domain:` properties and
  `URL_PREFIX` otherwise.
- `siteUnverifiedUser` properties are stored with `verified = false`.
- Existing `websiteId` links are preserved during synchronization.

Search Console reconciliation:

- Properties returned by Google are marked `ACTIVE`.
- Previously stored properties missing from Google's latest response are marked
  `MISSING`; they are not deleted.
- `removedFromGoogleAt` is set only the first time a property becomes missing.
- Missing properties that reappear are restored to `ACTIVE` and clear
  `removedFromGoogleAt`.
- Repeating a sync with the same Google response does not create duplicates,
  remove website links, or report unchanged records as updated.
- The synchronization summary reports discovered, created, updated, unchanged,
  marked missing, restored, errors, and duration.

Search Console property list:

- `/search-console/properties` lists real `SearchConsoleProperty` records for
  the current authenticated organization.
- The table shows property URL, property type, Google account email, permission
  level, verification status, sync status, last synchronized date, and linked
  website state.
- Summary cards show total properties, linked properties, unlinked properties,
  and missing properties.
- Property URLs link to the property details page.
- Linked website names link to the existing website details page.
- The page handles empty results and database load failures with safe messages.

Search Console property search:

- Search is handled server-side through URL parameters.
- The search field matches property URL, normalized property URL, or Google
  account email.
- Search results preserve the same organization ownership scope as the default
  list.

Search Console property filters:

- Sync status filter supports `ACTIVE`, `MISSING`, and `ERROR`.
- Property type filter supports domain properties and URL-prefix properties.
- Website link filter supports linked and unlinked properties.
- Filters are persisted in the URL and can be reset from the page.

Search Console property pagination:

- Pagination is handled with server-side query parameters.
- Page sizes are 10, 25, and 50.
- Sorting supports property URL and last synchronized date.
- Sort direction supports ascending and descending order.

Search Console property details:

- `/search-console/properties/[propertyId]` shows one synchronized Search
  Console property.
- The page displays full and normalized property URLs, property type, permission
  level, verification status, sync status, Google account email and display
  name, linked website name and domain when available, sync timestamps, removal
  date, and record timestamps.
- Missing optional values are shown as `Not available`.
- Status badges make missing and error properties visually distinct.
- Actions include Back to properties, Open in Google Search Console, View Google
  account settings, and View linked website when one exists.
- Google Search Console links are generated server-side, point to
  `https://search.google.com/search-console`, and open in a new tab with
  `noopener noreferrer`.
- The details query is scoped to the current authenticated organization and does
  not select OAuth access tokens, refresh tokens, client secrets, or other
  sensitive account fields.
- Unauthorized cross-organization property access returns a not-found response
  without revealing whether the property exists.

Search Console property security:

- Property list and details pages keep Prisma access server-side.
- The current organization is resolved from trusted server-side Supabase auth
  context; organization IDs are not accepted from client parameters.
- Property list queries always include the current `organizationId`.
- Property details access confirms the property belongs to the current
  organization and the related Google account belongs to the same organization.
- Linked website relationship validation is supported when website organization
  data is available.
- OAuth access tokens, refresh tokens, client secrets, and raw Google token
  payloads are not selected for property pages or sent to the browser.
- Cross-organization detail access uses a not-found response so unauthorized
  users cannot infer whether a property exists.

URL Inspection database foundation:

- `UrlInspection` stores Google Search Console URL Inspection requests and
  results for later execution phases.
- Each inspection belongs to an `Organization`, `Website`, and
  `SearchConsoleProperty`.
- An inspection may optionally link back to an imported `UrlRecord`.
- Stored request identity includes inspected URL, normalized URL, requested time,
  completion time, and status.
- Status lifecycle values are `PENDING`, `RUNNING`, `COMPLETED`, and `FAILED`.
- Completed result fields include inspection result link, verdict, coverage
  state, indexing state, robots.txt state, page fetch state, Google canonical,
  user canonical, last crawl time, crawled-as value, referring URLs, sitemap
  URLs, and raw response JSON.
- Failed result fields include error code, safe error message, completion time,
  and optional raw response JSON.
- Indexes support organization, website, Search Console property, URL record,
  normalized URL, status, requested date, and completed date lookups.
- PostgreSQL enforces one active inspection per organization, Search Console
  property, and normalized URL for `PENDING` or `RUNNING` records through a
  partial unique index in the migration.
- Validation helpers normalize inspection URLs by lowercasing hostnames,
  removing fragments, removing default ports, and trimming trailing slashes on
  non-root paths without removing query parameters.
- Current limitation: this phase does not call the Google URL Inspection API and
  does not include inspection forms, queues, tables, reports, crawling, IndexNow,
  AI features, or background jobs.

Google URL Inspection API client:

- The server-only Google URL Inspection client lives in
  `lib/url-inspections/google-client.ts`.
- The Google endpoint and API version are centralized in
  `lib/url-inspections/google-config.ts`.
- The client uses the existing
  `https://www.googleapis.com/auth/webmasters.readonly` Google OAuth scope.
- Requests send `inspectionUrl`, `siteUrl`, and `languageCode`, defaulting to
  `en-US`, to Google's official URL Inspection endpoint.
- Before calling Google, the client confirms the authenticated organization owns
  the selected Google account and Search Console property, confirms the property
  belongs to that Google account, requires the property to be `ACTIVE` and
  verified, validates the inspected URL, and checks that the URL fits the
  selected property.
- Domain properties such as `sc-domain:example.com` allow the root domain and
  subdomains.
- URL-prefix properties such as `https://example.com/blog/` require matching
  protocol, host, port, and URL path prefix.
- Unrelated domains, unsupported URL schemes, malformed property URLs, and
  URL-prefix path mismatches are rejected before Google is called.
- Access tokens are read and refreshed server-side only. Expired access tokens
  are refreshed with the stored refresh token, new tokens are persisted, and a
  single retry is attempted after an authorization failure.
- Missing or revoked refresh tokens return a safe reconnect-required error.
- Successful responses are normalized with missing optional fields converted to
  `null` or empty arrays, safe `lastCrawlTime` parsing, and raw JSON preserved
  for later persistence.
- API errors are mapped to sanitized codes for invalid requests, unauthorized or
  revoked authorization, permission denied, property mismatch, URL outside
  property, quota exceeded, rate limiting, Google service unavailable, network
  timeout, malformed responses, and unknown API failures.
- Current limitation: this phase does not create inspection execution services,
  inspection UI, bulk queues, result tables, reports, crawling, IndexNow, AI
  features, or background jobs.

Single URL inspection service:

- `lib/url-inspections/service.ts` runs one URL inspection request and persists
  its lifecycle in `UrlInspection`.
- The service accepts a website ID, Search Console property ID, inspected URL,
  and optional imported `UrlRecord` ID.
- Authentication and organization context are resolved server-side; organization
  IDs are never accepted from client input.
- Before creating an inspection, the service validates the selected website,
  Search Console property ownership, active and verified property state,
  inspected URL format, URL membership in the selected website, property
  compatibility, and optional `UrlRecord` ownership.
- Duplicate active inspections are checked server-side by organization, Search
  Console property, normalized URL, and `PENDING` or `RUNNING` status.
- When an active duplicate exists, no new record is created and the existing
  inspection ID is returned as `alreadyInProgress`.
- New inspections are created as `PENDING`, immediately marked `RUNNING`, then
  persisted as `COMPLETED` or `FAILED` after the Google URL Inspection client
  returns.
- Successful inspections persist normalized Google result fields, referring URL
  and sitemap URL JSON arrays, sanitized raw response JSON, completion time, and
  clear previous error fields.
- Failed inspections persist completion time, status `FAILED`, sanitized error
  code, and sanitized error message. OAuth tokens, authorization headers, stack
  traces, and secrets are not persisted.
- The single URL inspection form lives at `/websites/[id]/inspect`.
- The page loads the selected website and compatible Search Console properties
  server-side. Compatible properties must belong to the current organization, be
  `ACTIVE`, be verified, and match the website domain or URL-prefix rules.
- OAuth access tokens, refresh tokens, token payloads, and unnecessary property
  sync internals are not selected for the form component.
- Optional `urlRecordId` query parameters are validated server-side against the
  selected website. Valid records prefill the URL input; invalid or cross-website
  records are ignored without exposing their URLs.
- Form submission is handled by a server action that binds the trusted website
  ID from the route, optionally passes a page-validated `urlRecordId`, and never
  accepts an organization ID from the browser.
- The form validates required URL, absolute URL format, HTTP/HTTPS protocol, and
  required Search Console property selection before calling the server-side
  inspection service.
- The inspection service remains authoritative for website ownership, property
  ownership, property status, verification, URL-to-website compatibility,
  property-to-URL compatibility, `UrlRecord` ownership, and duplicate active
  inspection checks.
- Service outcomes `completed`, `failed`, and `alreadyInProgress` redirect to
  `/websites/[id]/inspections/[inspectionId]`; validation, authorization, and
  not-found failures render sanitized messages on the form.
- `/websites/[id]/inspections/[inspectionId]` displays the Inspection Details
  page for one saved URL inspection.
- Inspection Details access is resolved server-side. The route requires
  authentication, resolves the current organization from trusted context,
  confirms the selected website, and scopes the inspection query to the validated
  inspection ID, website ID, and organization ID.
- The details query selects only the fields currently rendered by the page:
  inspected URL, status, created date, coverage state, indexing verdict,
  indexing state, robots state, page fetch state, crawled-as value, and stored
  canonical URL values, last crawl timestamp, and inspection lifecycle
  timestamps.
- The page currently displays a summary header, a Back to inspection history
  link, and sections for Coverage, Indexing Verdict, Indexing State, Robots
  State, Crawl Information, Canonical Information, Last Crawl, and Inspection
  Timestamps.
- Missing detail values render as `Not available` while keeping each section
  visible.
- Sensitive fields are excluded from the details query and UI. `rawResponse`,
  OAuth access tokens, OAuth refresh tokens, provider credentials, unrelated
  website data, and unrelated organization data are not selected or rendered.
- Canonical Information displays the stored user-declared canonical and
  Google-selected canonical as plain text. It does not parse `rawResponse`,
  compare URLs, infer conflicts, or generate SEO recommendations.
- Last Crawl displays the stored `lastCrawlTime` with the existing readable
  date-and-time formatter. It does not parse `rawResponse`, calculate crawl age,
  or label crawl freshness.
- Inspection Timestamps displays existing lifecycle timestamps for Created,
  Updated, and Completed with the existing readable date-and-time formatter.
  Missing or invalid timestamp values render as `Not available`.
- Current Inspection Details limitations: reinspect controls, raw API response
  display, and discovery-source details are not shown yet.
- `/websites/[id]/inspections` displays URL inspection history for the selected
  website.
- The history page loads the 25 most recent inspections for the current
  organization and website, ordered newest first.
- The history page supports URL search with the `q` query parameter, such as
  `/websites/[id]/inspections?q=contact`.
- URL search trims the submitted value, applies a maximum length, and uses Prisma
  case-insensitive partial matching against `inspectedUrl`.
- The route also accepts an optional server-side `status` query parameter:
  `pending`, `running`, `completed`, or `failed`.
- Missing, empty, `all`, and unsupported `status` values are treated as no status
  filter, and status filtering combines with `q` inside the scoped Prisma query.
- The history page includes a no-JavaScript status selector that submits the
  existing `status` parameter and preserves the active `q` search value.
- The history page also supports a `property` query parameter for Search Console
  property filtering.
- `property` accepts a validated Search Console property ID. `property=all`
  disables property filtering.
- Missing, empty, invalid, cross-organization, or unrelated property values are
  treated as inactive.
- Property filtering combines with `q` and `status` using AND logic.
- Search and status forms preserve the active property filter.
- `Clear all` and filtered empty-state `Clear filters` links remove `q`,
  `status`, and `property` by linking back to `/websites/[id]/inspections`.
- Property-only filtering counts as an active filter. Empty property-filtered
  results show `No inspections matched`.
- Inspection history results remain limited to the latest 25 inspections.
- Property IDs are validated against Search Console properties connected to the
  selected website's inspections. Organization and website scoping remain
  enforced, and raw `property` query values are not used directly in Prisma
  filtering.
- History summary cards show loaded inspections, completed, failed, and in
  progress counts based only on those 25 loaded rows.
- Website-level navigation includes an `Inspection History` link for the current
  website and marks the history route active when viewed.
- Archived websites keep history visible but hide new inspection actions.
- Current limitation: automatic refresh for pending inspections, bulk queue,
  sorting controls, pagination, scheduling, reports, crawling, IndexNow, AI
  features, and billing are not implemented yet.

Organization ownership:

- Google account actions resolve the current organization server-side from the
  authenticated Supabase user.
- Connect, disconnect, and sync operations are scoped by `organizationId`.
- The current implementation uses the Supabase user ID as the organization key
  until a first-class organization membership model is added.

Secure sitemap fetching includes:

- Server-only fetches with no arbitrary browser-side URL fetches.
- SSRF protection through DNS resolution and IP safety checks before every request.
- Revalidation of every redirect destination.
- Manual redirect handling with a maximum of 5 redirects.
- Redirect loop detection.
- 15-second timeout.
- 20 MB maximum response size.
- `IndexPilotBot/0.1 (+sitemap-fetcher)` user agent.
- Supported response types: `application/xml`, `text/xml`, `application/gzip`, `application/x-gzip`, `text/plain`, `application/octet-stream`, and likely XML bodies with imperfect headers.
- Rejection of unsafe hosts, private/reserved/local IPs, cloud metadata addresses, unsupported protocols, oversized responses, and obvious HTML error pages.

Sitemap parsing includes:

- Standard `<sitemapindex>` files.
- Standard `<urlset>` files.
- XML namespaces on sitemap elements.
- Optional `lastmod` values on sitemap index and URL entries.
- Optional `changefreq` and `priority` values on URL entries.
- Gzip detection by content type, `.gz` source URL, and gzip magic bytes.
- 20 MB maximum uncompressed parse size.
- XML depth and element-count limits.
- Rejection of external entity declarations and unsupported XML declarations.
- Validation warnings for missing `loc`, invalid URLs, duplicate entries, invalid `lastmod`, and invalid priority values.

Sitemap import behavior:

- Imports one stored sitemap at a time from the sitemap details page.
- Uses the secure sitemap fetcher and XML/gzip parser.
- Imports `URL_SET` sitemaps directly.
- Recursively processes `SITEMAP_INDEX` files and imports each usable child
  URL-set sitemap.
- Creates child `Sitemap` records when an index references a new sitemap URL.
- Reuses existing child `Sitemap` records when the normalized sitemap URL
  already exists for the website.
- Stores `parentSitemapId` for child sitemaps discovered through an index.
- Saves valid page URLs as `UrlRecord` rows.
- Stores `websiteId`, `sitemapId`, URL, normalized URL, path, sitemap `lastmod`, `firstDiscoveredAt`, and `lastDiscoveredAt`.
- Prevents duplicate normalized page URLs per website.
- Preserves `firstDiscoveredAt` on re-import.
- Updates `lastDiscoveredAt` on re-import.
- Updates `sitemapLastModifiedAt` only when the incoming valid `lastmod` is newer.
- Re-importing the same sitemap is idempotent and does not create duplicate rows.
- Sets each sitemap status to `FETCHING` during import, `IMPORTED` on success, and `FAILED` on failure.
- Sets sitemap-index `urlCount` to the number of unique page URLs discovered
  beneath that index during the import.
- Writes import start and finish entries to `ActivityLog` without storing raw XML
  or sensitive fetch internals.

Import architecture:

- Shared safety defaults live in `lib/sitemaps/config.ts`.
- Secure fetching, XML/gzip parsing, recursive importing, URL persistence, and
  logging are separate server-side modules.
- The sitemap details page triggers a server action; browsers never fetch
  arbitrary sitemap URLs directly.
- Import summaries are rendered through a reusable component and include
  processed sitemaps, failed sitemaps, new URLs, updated URLs, skipped URLs,
  warnings, errors, duration, and safety-limit status.
- URL inserts use batched `createMany` with duplicate protection.
- Existing URL records are loaded in one lookup per URL-set sitemap and common
  re-import updates are batched with `updateMany`.

Recursive sitemap protections:

- Maximum recursion depth is 5.
- Maximum sitemap files processed per import is 100.
- Maximum discovered URLs per import is 50,000.
- Maximum redirects per fetch is 5.
- Maximum fetch timeout is 15 seconds.
- Maximum response and decompressed XML size is 20 MB.
- Maximum XML depth is 50.
- Maximum XML nodes is 250,000.
- Each normalized sitemap URL is visited at most once per import.
- Circular sitemap references are skipped with warnings.
- Duplicate child sitemap records are prevented by the existing per-website
  normalized sitemap URL uniqueness rule.
- Cross-domain child sitemaps are rejected unless they match the website's
  normalized domain.

Partial failure behavior:

- One failed child sitemap does not stop sibling sitemap imports.
- URLs already imported from successful children are preserved.
- Failed child sitemaps are marked `FAILED` with a concise error.
- Invalid URLs are skipped and reported as warnings.
- Malformed XML fails only the sitemap that contains it.
- Safety limits stop additional work safely while preserving data already
  imported during the run.
- Parent sitemap indexes are marked `IMPORTED` when at least one child URL-set
  import succeeds, with warning summaries retained in `lastError`.
- Parent sitemap indexes are marked `FAILED` only when no usable child sitemap
  data was imported.
- The import result reports processed sitemaps, created child sitemaps, imported
  URL-set files, failed child sitemaps, added URLs, updated URLs, skipped URLs,
  warnings, whether a safety limit was reached, and duration.

Import logging:

- `ActivityLog` records import start and finish events.
- Logs include website ID, root sitemap ID, duration, result counts, warning and
  error summaries, and safety-limit information.
- Logs intentionally exclude raw XML response bodies and sensitive exception
  details.

Testing:

- Unit tests cover secure fetch validation, XML/gzip parsing, recursive imports,
  duplicate handling, circular references, safety limits, partial failures,
  idempotent re-imports, URL inventory queries, URL details access, Search
  Console property details access, and import summary state.

Current recursive import limitation: robots.txt discovery, automatic sitemap discovery, URL Inspection, IndexNow, crawling, reports, and background jobs are intentionally not implemented yet.

URL inventory behavior:

- `/websites/[id]/urls` lists real `UrlRecord` rows imported from sitemaps.
- `/websites/[id]/urls/[urlId]` shows details for one imported URL record.
- Queries are scoped server-side by website.
- URL details verify the selected `UrlRecord` belongs to the selected website.
- The website details page links to Sitemaps and URL Inventory with real counts.
- Archived websites keep their imported URL inventory visible for reference.

URL inventory filters and sorting:

- Search by URL or path.
- Filter by source sitemap.
- Sort by URL, first discovered date, last discovered date, or sitemap `lastmod`.
- Choose page sizes of 10, 25, 50, or 100.
- Pagination is handled with server-side query parameters.

URL inventory placeholders:

- HTTP status shows `Not checked` because crawling is not implemented yet.
- Indexing status shows `Not checked` because Google Search Console and URL
  inspection integrations are not implemented yet.

Known limitations and future phases:

- URL records cannot be manually edited or deleted from the inventory.
- Website linking and matching UI will be added in Phase 4B-3.
- Imports run synchronously from the sitemap details action; background workers
  are not implemented yet.
- Robots.txt discovery and automatic sitemap discovery are not implemented yet.
- Search Console URL Inspection persistence, API client, single-inspection
  service, single URL inspection form submission, and single result page exist,
  but queues, reports, and scheduled runs are not implemented yet.
- IndexNow, crawling, reports, AI analysis, and background jobs are intentionally
  not implemented yet.

Manual Google Cloud setup:

- Create an OAuth 2.0 Web application client in Google Cloud Console.
- Enable the Google Search Console API.
- Add `http://localhost:3000/api/google/oauth/callback` for local development
  and the production callback URL for deployment.
- Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
  `GOOGLE_OAUTH_REDIRECT_URI`, and `TOKEN_ENCRYPTION_KEY`.
