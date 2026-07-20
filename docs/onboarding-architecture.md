# Onboarding Architecture

Sprint 3B-1 establishes the reusable onboarding model only. It does not render an onboarding checklist, persist completion, or change existing application behavior.

## Module Location

Reusable onboarding types and helpers live in:

- `components/onboarding/onboarding-model.ts`
- `components/onboarding/index.ts`

The module is plain TypeScript. It does not depend on React, Prisma, Supabase, server actions, route handlers, or browser-only APIs. Future UI can import the model without coupling checklist rendering to persistence or data loading.

## State Model

The onboarding state model represents the minimum milestones needed to guide a new user to their first saved URL inspection:

```ts
type OnboardingState = {
  googleConnected: boolean;
  propertySelected: boolean;
  firstInspectionCompleted: boolean;
  onboardingCompleted: boolean;
};
```

### Fields

- `googleConnected`: At least one Google Search Console account is connected for the current organization.
- `propertySelected`: The user has selected, or the app has resolved, a verified active Search Console property to use for first inspection.
- `firstInspectionCompleted`: At least one URL inspection has completed for the user's website.
- `onboardingCompleted`: The overall onboarding flow is complete. This is currently an in-memory extension point and is not persisted yet.

### Default State

`emptyOnboardingState` represents a brand-new workspace:

```ts
{
  googleConnected: false,
  propertySelected: false,
  firstInspectionCompleted: false,
  onboardingCompleted: false
}
```

Use `createOnboardingState(partialState)` to safely merge known values with defaults.

## Checklist Model

Checklist items use a reusable shape:

```ts
type OnboardingChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  actionLabel?: string;
  destination?: string;
};
```

### Supported Checklist Steps

The current helper, `createOnboardingChecklist`, creates three setup items:

1. `connect-google`
   - Title: Connect Google Search Console
   - Default destination: `/settings/google`

2. `select-property`
   - Title: Choose a Search Console property
   - Default destination: `/search-console/properties`

3. `inspect-first-url`
   - Title: Inspect your first URL
   - Destination is optional because the inspection route requires a website ID.

The first incomplete item is marked `current: true`. When `onboardingCompleted` is true, all checklist items are completed and no item is current.

### Destination Overrides

`createOnboardingChecklist` accepts optional destination overrides:

```ts
type OnboardingChecklistOptions = {
  connectGoogleDestination?: string;
  selectPropertyDestination?: string;
  inspectUrlDestination?: string;
};
```

This allows future pages to provide context-specific links, such as `/websites/[id]/inspect`, without changing the checklist model.

## Progress Calculation

Progress is calculated by `calculateOnboardingProgress(state)`:

```ts
type OnboardingProgress = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
};
```

The current total is three task steps:

- Google connected
- Property selected
- First inspection completed

Progress uses whole-number percentages:

- 0 of 3: `0%`
- 1 of 3: `33%`
- 2 of 3: `67%`
- 3 of 3: `100%`

If `onboardingCompleted` is true, progress is forced to `100%`.

## Dashboard Checklist Rendering

Sprint 3B-2 renders the first checklist UI near the top of the authenticated dashboard:

- Route: `/dashboard`
- Page file: `app/(app)/dashboard/page.tsx`
- UI component: `components/onboarding/onboarding-checklist.tsx`

The checklist is shown only while onboarding is incomplete. Once all three derived steps are complete, the checklist is hidden. The existing dashboard empty-state content remains below the checklist so the dashboard page behavior is otherwise unchanged.

### Completion Derivation

The dashboard derives onboarding completion from current server-side application data:

- `googleConnected`: true when the current organization has at least one `GoogleAccount`.
- `propertySelected`: true when the current organization has at least one `SearchConsoleProperty` that is `verified` and has `syncStatus: ACTIVE`.
- `firstInspectionCompleted`: true when the current organization has at least one `UrlInspection` with `status: COMPLETED`.
- `onboardingCompleted`: true when all three derived steps are true.

These values are derived from real data only. Page visits, browser state, and client-submitted values do not mark a step complete.

### Current Step Selection

The shared `createOnboardingChecklist` helper marks the first incomplete item as `current: true`.

Rules:

- Completed items are never current.
- Only one item can be current at a time.
- When all items are complete, no item is current.

### Dashboard Action Destinations

The dashboard passes existing route destinations into the checklist helper:

- Connect Google Search Console: `/api/google/oauth/start`
- Choose a Search Console property: `/search-console/properties`
- Inspect your first URL: `/websites/[id]/inspect` when an active website is available

The inspection route requires a website ID. If no active website can be found, the checklist still renders the inspection step but omits that action destination.

## Dashboard Completed State

Sprint 3B-3 adds a compact completed-onboarding state in the same dashboard placement as the checklist.

### Trigger

The completed state renders only when all derived milestones are true:

- Google connection is confirmed from current organization `GoogleAccount` records.
- A usable property is confirmed from verified ACTIVE `SearchConsoleProperty` records.
- At least one completed URL inspection is confirmed from current organization `UrlInspection` records with `status: COMPLETED`.

The dashboard still derives completion from real server-side data only. It does not infer completion from page visits, browser state, or fake data.

### Success Actions

The completed state uses existing website-scoped routes:

- View inspection history: `/websites/[id]/inspections`
- Inspect another URL: `/websites/[id]/inspect`

The website ID comes from the completed inspection when available, falling back to the first active website for incomplete checklist actions.

### Persistence And Dismissal

Persistence and dismissal remain deferred. The completed state is intentionally derived each time from current data so it cannot become stale or hide required setup after account/property/inspection records change. A future sprint can persist user preferences such as a dismissed success card, but real setup readiness should continue to be derived server-side.

## Local Dismissal Storage Utility

Sprint 3B-4A adds a small localStorage helper for future onboarding dismissal UI:

- File: `components/onboarding/onboarding-storage.ts`
- Storage key: `indexpilot:onboarding-complete-dismissed:v1`

### Helper Functions

- `readOnboardingDismissal()`: returns `true` only when the versioned key stores the literal value `"true"`.
- `saveOnboardingDismissal()`: stores the literal value `"true"` under the versioned key.
- `clearOnboardingDismissal()`: removes the versioned key.

### SSR And Safety Handling

The helper is safe to import during server-side rendering. It checks for `window` and `window.localStorage` before reading or writing. If localStorage is unavailable, blocked, missing, or throws, the helpers return safe defaults:

- Reads return `false`.
- Saves and clears no-op safely.
- Invalid stored values are treated as not dismissed.

The utility does not use cookies, Prisma, authentication state, or server persistence.

### Completed-State Integration

Sprint 3B-4B wires the local dismissal utility into the completed onboarding state only.

- Component: `components/onboarding/onboarding-completed-gate.tsx`
- Visibility helper: `components/onboarding/onboarding-visibility.ts`
- Rule: render the completed state only when onboarding is complete and the local dismissal value is not saved.

The gate reads localStorage after hydration with `readOnboardingDismissal()`. The initial render uses the safe non-dismissed default, then hides the completed card if the browser has the versioned dismissal key saved. The incomplete checklist does not read or use the dismissal value, so an incomplete user still sees the checklist regardless of localStorage.

### Dismissal Behavior

Sprint 3B-4C adds a dismiss button to the completed onboarding state. The action is intentionally local and presentation-only:

- Clicking dismiss calls `dismissOnboardingCompletedState()`.
- The helper saves `"true"` to `indexpilot:onboarding-complete-dismissed:v1`.
- The completed card hides immediately for the current browser session.
- On remount, the completed card remains hidden when the saved value is present.
- If localStorage is blocked or throws, the click still hides the card for the current session and fails safely.

Dismissal applies only to the completed state. The incomplete checklist ignores the dismissal key entirely and continues to render whenever onboarding is incomplete.

## Future Persistence Strategy

Completion is not persisted in Sprint 3B-1, Sprint 3B-2, Sprint 3B-3, Sprint 3B-4A, or Sprint 3B-4B.

Recommended future approach:

1. Derive setup milestones from trusted server-side data:
   - Google connection from `GoogleAccount`
   - Property readiness from active verified `SearchConsoleProperty` records
   - First inspection completion from `UrlInspection`

2. Persist only user-dismissed or manually completed onboarding state when needed:
   - Candidate location: organization-level preference table or JSON settings field
   - Candidate state: `onboardingCompleted`, dismissed checklist IDs, completed-at timestamp

3. Keep milestone derivation authoritative:
   - Do not let browser-submitted onboarding values mark real product prerequisites as complete.
   - Use client state only for UI preferences, not permission or setup readiness.

### Future Server Persistence Migration

When cross-device or organization-wide dismissal is needed, migrate dismissal from localStorage to server persistence without changing the real completion rules:

1. Add a server-side preference, likely organization-scoped or user-scoped depending on product requirements.
2. Read the persisted preference in the dashboard data loader alongside the derived onboarding milestones.
3. Keep localStorage as an optional client fallback only during migration, or clear it after a successful server write.
4. Continue deriving `googleConnected`, `propertySelected`, and `firstInspectionCompleted` from authoritative database records.
5. Never trust a browser-submitted dismissal value to satisfy onboarding prerequisites.

## Extension Strategy

The model can grow without changing current consumers by adding:

- Additional checklist items for future workflows
- Optional item metadata such as `disabled`, `reason`, or `completedAt`
- Separate onboarding profiles for different roles
- Organization-level persisted preferences
- A server-side loader that derives `OnboardingState` from Prisma queries

Future UI should keep these boundaries:

- Data derivation: server-side
- Checklist state and progress: shared model
- Rendering: dedicated onboarding UI components
- Persistence: explicit server action or route handler

## Current Limitations

- The dashboard checklist is presentation-only.
- The dashboard completed state is presentation-only and can be locally dismissed.
- No completion state is persisted yet.
- No database schema changes are included.
- Completed-state dismissal is stored only in browser localStorage.
- No authentication, routing, or inspection workflow behavior changes are included.
