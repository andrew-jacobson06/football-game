# UI development rules

- Every new or changed UI element must use the app's semantic design tokens from `apps/web/src/App.css`; do not introduce fixed light- or dark-only foregrounds, backgrounds, borders, shadows, or form-control colors.
- Every UI element must be checked in both `data-theme="dark"` and `data-theme="light"` modes before the work is considered complete.
- Use the shared `AppSelect` component for dropdowns. Do not add an unstyled native `<select>` or a one-off dropdown treatment.
- Team colors, field markings, status colors, and other meaning-bearing colors may remain fixed when changing them would alter their meaning. All surrounding UI chrome must remain theme-aware.

