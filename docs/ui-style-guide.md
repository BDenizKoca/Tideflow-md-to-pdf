# Tideflow UI Style Guide

The goal of this refactor is to rely on a small, shared palette for both dark and light modes. The key pieces are:

## Theme Tokens

The theme variables are defined in `src/styles/themes.css`.

- **Surface scale**  
  `--surface-base`, `--surface-muted`, `--surface-subtle`, `--surface-raised`, `--surface-popover`  
  Use these for backgrounds (app shell, panels, popovers, cards).

- **Borders & interaction**  
  `--border-default`, `--border-strong`, `--border-muted`  
  `--interactive-surface`, `--interactive-surface-hover`, `--interactive-surface-active`  
  `--interactive-border`, `--interactive-border-hover`

- **Focus outline**  
  `--focus-outline` (also available as `--focus-ring` for backward compatibility)

- **Accent & semantic colours**  
  `--accent-color`, `--accent-color-strong` and the existing `--success-*`, `--warning-*`, `--error-*`, `--info-*`.

## Base Primitives

`src/styles/primitives.css` and the updated `src/index.css` provide shared behaviour:

- `.ui-button`, `.ui-button--primary`, `.ui-button--danger`, `.ui-button--ghost`
- `.ui-input`, `.ui-select`
- `.ui-pill` variants for status badges

All buttons, inputs, and select elements now use the `--interactive-*` tokens for hover/active states, with neutral focus behaviour.

## Component Guidance

- **Toolbar / Tab bar / Status bar** now use surface/background tokens rather than bespoke gradients.  
- **PDF Preview and Editor toolbars** use the same interactive tokens for their controls.  
- Focus highlights should not introduce separate outlines; rely on border colour changes instead.

## Visual QA

1. Toggle between dark and light modes and verify:  
   - Toolbar, tab bar, status bar share a consistent neutral surface.  
   - Button hover/press states feel consistent across components.  
   - Focus states do not introduce coloured outlines and still show a minimal border change.
2. Check text contrast in both themes for toolbar, address bar, and PDF controls.
3. Scroll through the PDF preview and editor to confirm scrollbars and cards use the new surface tokens.

> When adding new UI, prefer the primitives and tokens above to stay aligned with the system.
