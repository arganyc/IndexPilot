# IndexPilot Design System

This document defines the first reusable design foundation for IndexPilot. It reflects the current Next.js, Tailwind CSS v4, and shadcn/ui architecture and should guide future product and marketing work without introducing a second visual system.

## Brand Philosophy

IndexPilot should feel focused, calm, and operational. The product helps SEO teams and website operators understand Google indexing signals, so the interface should prioritize clarity, scanability, and trust over decoration.

Use restrained layouts, direct labels, and stable patterns. Marketing pages may use stronger hierarchy and more breathing room, while authenticated application pages should stay dense enough for repeated workflows.

## Color System

IndexPilot uses semantic Tailwind tokens backed by CSS variables in `app/globals.css`. Prefer these tokens before adding raw colors.

| Role | Use | Preferred tokens |
| --- | --- | --- |
| Primary | Primary actions and strongest emphasis | `bg-primary`, `text-primary`, `text-primary-foreground` |
| Secondary | Quiet actions and low-emphasis surfaces | `bg-secondary`, `text-secondary-foreground` |
| Accent | Selected, hovered, or subtly highlighted UI | `bg-accent`, `text-accent-foreground` |
| Background | Page and app background | `bg-background`, `text-foreground` |
| Foreground | Primary readable text | `text-foreground` |
| Muted | Supporting text and subdued surfaces | `bg-muted`, `text-muted-foreground` |
| Border | Structural dividers and card outlines | `border-border`, `ring-foreground/10` |
| Destructive | Deletion, failed states, and serious errors | `bg-destructive`, `text-destructive` |
| Success | Successful or indexed states | Use restrained emerald utilities only when a semantic success token is unavailable |
| Warning | Warning, attention, and partial states | Use restrained amber utilities only when a semantic warning token is unavailable |

Do not introduce a separate palette for one-off features. If success and warning treatments become common enough, add semantic CSS variables in a future design-system phase and migrate usages intentionally.

Recommended state treatments:

- Success: use clear text such as `Indexed` or `Completed`; pair with subtle emerald utility classes only when needed.
- Warning: use clear text such as `Warning`, `Partial`, or `Needs attention`; pair with subtle amber utility classes only when needed.
- Error: prefer the existing `destructive` component variant.
- Neutral: use `secondary`, `outline`, `muted`, and `muted-foreground`.

## Typography

The global font stack uses Geist Sans and Geist Mono from `app/layout.tsx`. Tailwind maps these through `--font-sans`, `--font-mono`, and `--font-heading`.

Use typography by page role:

| Style | Recommended use | Typical classes |
| --- | --- | --- |
| Display | Marketing hero headlines only | `text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl` |
| H1 | Main page title, one per page | `text-3xl font-semibold leading-tight sm:text-4xl` |
| H2 | Major page or marketing sections | `text-2xl font-semibold leading-snug sm:text-3xl` |
| H3 | Card titles and subsection headings | `text-base font-semibold leading-snug` or `text-lg font-semibold` |
| Body | Main readable copy | `text-base leading-7` |
| Small | Secondary interface text | `text-sm leading-6 text-muted-foreground` |
| Caption | Labels, metadata, and compact notes | `text-xs font-medium text-muted-foreground` |

Keep letter spacing at the default value unless a local component already requires a different treatment. Avoid viewport-based font sizing. Long URLs and technical values should use wrapping utilities such as `break-words` or `break-all` where needed.

## Buttons

Use the existing `Button` component from `components/ui/button.tsx`. It already provides consistent radius, sizing, focus-visible rings, disabled states, icon sizing, and variants.

| Variant | Intended use |
| --- | --- |
| `default` | Primary action on a page or section |
| `secondary` | Secondary action with filled but quieter emphasis |
| `outline` | Alternative actions, navigation-like controls, and balanced action groups |
| `ghost` | Low-emphasis actions, toolbar controls, and compact navigation |
| `destructive` | Deletion and destructive actions, usually with confirmation |
| `link` | Text-style navigation where a button primitive is still useful |

Use `asChild` when a link should look like a button. Icon-only buttons must have an accessible name. Destructive actions should use confirmation when data can be permanently removed.

## Cards

Use the existing `Card` primitives from `components/ui/card.tsx` for repeated items, detail panels, forms, and compact tool surfaces.

Current card standards:

- Radius: inherited from the shadcn card pattern, currently `rounded-xl`.
- Border: use the existing subtle `ring-1 ring-foreground/10` card treatment.
- Padding: default card spacing is driven by `--card-spacing`, currently equivalent to `spacing(4)`.
- Compact cards: use `size="sm"` when a denser repeated item is needed.
- Footer: use `CardFooter` for separated actions or metadata rows.

Avoid cards inside cards. Page sections should usually be unframed layouts or full-width bands, while individual repeated records can be cards.

## Badges

Use the existing `Badge` component from `components/ui/badge.tsx`. It provides consistent sizing, focus rings, and variants.

| State | Recommended badge treatment |
| --- | --- |
| Indexed | `default` when positive emphasis is useful, or a future success token when available |
| Not Indexed | `secondary` or `outline`; use warning styling only when action is needed |
| Pending | `outline` or `secondary` |
| Warning | Subtle amber utility treatment until a semantic warning variant exists |
| Error | `destructive` |

Badges must include visible text. Do not rely on color alone to communicate meaning.

## Spacing

Use an 8-point spacing rhythm. Tailwind spacing values such as `2`, `4`, `6`, `8`, `10`, `12`, `16`, and `24` should cover most layout needs.

Recommended spacing:

- Marketing sections: `py-16` to `py-24`, depending on density.
- App page containers: `space-y-6` or `space-y-8`.
- Card grids: `gap-4`, `gap-6`, or `gap-8`.
- Card content: use the Card component defaults before adding custom padding.
- Form fields: `space-y-2` inside a field and `space-y-4` to `space-y-6` between fields.
- Table cells: use compact, scannable padding such as `px-4 py-3`.
- Button groups: `gap-2` or `gap-3`.

Prefer consistent vertical rhythm over one-off pixel adjustments.

## Accessibility

IndexPilot interfaces should be usable without a mouse and understandable without visual decoration.

Standards:

- Preserve visible focus states from shadcn/ui components.
- Use semantic landmarks: `header`, `nav`, `main`, `section`, and `footer`.
- Use one `h1` per page and logical heading order below it.
- Give form controls visible labels or accessible labels.
- Mark decorative Lucide icons with `aria-hidden="true"`.
- Give icon-only controls an accessible name.
- Keep status meaning visible in text, not color alone.
- Use sufficient contrast by relying on semantic theme tokens.
- Open external links safely with `rel="noopener noreferrer"` when using `target="_blank"`.
- Render missing data as clear visible text such as `Not available`.

## Responsive Principles

Build mobile-first and enhance at larger breakpoints.

- Stack layouts on mobile before moving to two, three, or four columns.
- Keep readable text widths with constraints such as `max-w-3xl` or `max-w-4xl`.
- Use `max-w-7xl px-4 sm:px-6 lg:px-8` for broad marketing containers.
- Prevent horizontal overflow from tables, URLs, and technical values.
- Use `break-words`, `break-all`, or `overflow-x-auto` where the content format requires it.
- Keep touch targets comfortable on mobile.
- Do not hide essential workflow actions behind hover-only behavior.

Future design-system phases may add audited success and warning tokens, expanded component examples, and visual QA snapshots. Until then, the current Tailwind semantic variables and shadcn/ui primitives remain the source of truth.
