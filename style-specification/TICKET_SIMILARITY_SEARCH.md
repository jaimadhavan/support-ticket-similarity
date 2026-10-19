# Ticket Similarity Search — Style Specification

This document captures the current visual language of the Ticket Similarity Search page. Use it as the reference when extending or restyling this page; it describes the existing UI rather than introducing a new theme.

## Design intent

- Present resolved-ticket precedents in a calm, readable workspace.
- Keep search controls compact and prominent, with clear distinction between primary and secondary actions.
- Use restrained blue for navigation, focus, and match evidence; green for successful resolutions; amber for no-match feedback.
- Keep ticket information scannable through metadata badges, clear section labels, and consistent spacing.

## Layout and typography

| Element | Specification |
|---|---|
| Page container | Centered; maximum width `1200px`; `0.75rem` outer padding (`0.5rem` at mobile); viewport-height vertical flex layout |
| Font | System sans-serif stack: `-apple-system`, BlinkMacSystemFont, `Segoe UI`, Roboto, `Helvetica Neue`, Arial |
| Main title | `2.5rem`, `#333`, centered; reduce to `1.75rem` on narrow screens |
| Supporting copy | `1.1rem`, `#666`, centered |
| Section heading | `1.5rem`, `#333` |
| Ticket subject | `1.25rem`, weight `600`, `#333` |
| Body copy | `#666`, line-height `1.6` |
| Compact labels and metadata | `0.875rem`; labels use weight `600` and `#6b7280` |

The page header is centered with a compact `1rem` bottom margin. Controls and results are vertically stacked. Results form a single-column list with about `0.65rem` between cards. The search controls are a horizontal flex row with compact gaps; on viewports at or below `768px`, the controls stack vertically.

## Color and shape

| Use | Value |
|---|---|
| Primary text | `#333` / `#374151` |
| Secondary text | `#666` / `#6b7280` |
| Main surface | `#fff` |
| Subtle surface | `#f9fafb` |
| Default border | `#d1d5db` |
| Light divider | `#e5e7eb` |
| Primary blue | `#0ea5e9`; hover `#0284c7` |
| Active/focus blue | `#2563eb` |
| Pale blue surface | `#eff6ff` |
| Success green | `#065f46` text on `#ecfdf5`; resolution panel uses `#f0fdf4` |
| No-match amber | `#fffbeb`, border `#fcd34d` |
| Error | `#f8d7da` background, `#721c24` text, `#f5c6cb` border |

Use compact, mostly `4px` corner radii for inputs, buttons, badges, and cards. Borders are light and understated; surfaces use little or no shadow except ticket cards.

## Search controls

- Place the search row inside a `#f9fafb` panel with `0.5rem` padding, a `1px solid #e5e7eb` border, `4px` radius, and `1rem` bottom spacing.
- The keyword field expands to fill available width. Input and result-limit select use white backgrounds, `0.875rem` text, compact `0.55rem 0.75rem` padding, and a `1px solid #d1d5db` border.
- Focused inputs use a `#2563eb` border and a subtle blue focus halo (`rgba(37, 99, 235, 0.1)`).
- Buttons use compact `0.55rem 1rem` padding, `0.9rem` text, and `4px` radius. Search is primary blue; Clear is white with a gray border.
- Disabled buttons remain visible but use `60%` opacity and a not-allowed cursor.

## Search feedback

- Availability and informational notices: pale blue background, blue text/border, `1rem` padding, and `4px` radius.
- Success messages: pale green surface, dark green text, green border.
- Errors: pale red surface, dark red text, red-tinted border.
- No-good-match state: centered amber panel with `2rem` padding, `1.1rem` text, and `1.6` line-height.
- Keep messages in normal page flow; do not use browser alert dialogs.

## Result cards

- White card, `1px solid #d1d5db`, `4px` radius, `1.5rem` padding, and a subtle `0 1px 3px` shadow.
- Ticket metadata is a wrapping flex row with `1.5rem` gaps. Reserve space at the right for the numbered card marker.
- Ticket ID badge: pale amber (`#fef3c7`) with brown text (`#92400e`) and monospace type.
- Category badge: pale blue with blue text; status badge: pale green with green text. Both use compact padding and capitalize/uppercase display as currently styled.
- Match explanation uses a pale blue panel, blue left border, and blue term chips with white text.
- Resolution uses a pale green panel with a green left border. The Copy action sits in its upper-right corner; hover darkens green and gives a small lift.
- On card hover, lift by `3px`, brighten the border to `#93c5fd`, strengthen the shadow, and change the subject to `#1d4ed8`.
- Disable motion and hover transforms under `prefers-reduced-motion: reduce`.

## Responsive and accessibility behavior

- At `768px` and below, stack search controls and navigation vertically and stack ticket metadata; keep navigation labels left-aligned.
- Admin category and ticket forms reuse the same compact control sizing, focus ring, buttons, border colors, and spacing. Use `min-width: 0`, border-box sizing, and single-column fields on narrow screens to prevent overflow.
- Preserve visible keyboard focus on form controls. Use native inputs, selects, and buttons with clear labels/titles.
- Keep loading/success information exposed as status and errors as alerts, matching the page's existing live-region semantics.
- Hover is an enhancement only; information and actions must remain available without pointer hover.

## Source of truth

Implementation references:

- [`app.html`](../ui/src/app/app.html) — page structure, labels, controls, and feedback states.
- [`app.css`](../ui/src/app/app.css) — page layout, search controls, and result styling.
- [`styles.css`](../ui/src/styles.css) — global Historical Tickets page styles; not part of the Search page visual rules above.
- [`admin-pages.component.css`](../ui/src/app/admin/admin-pages.component.css) — Admin form and list styling aligned to these shared control and spacing rules.
