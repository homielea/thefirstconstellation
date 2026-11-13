# ADR-0005: Frontend stack and 3D approach

Status: Accepted (2026-11-13), 3D part provisional until slice 002

## Decision
- Next.js (App Router) + React + TypeScript. Server components for data pages, small client
  components for the composer, live progress (EventSource) and artifact editing.
- Styling: project-owned CSS tokens (`src/styles/tokens.css`) and plain CSS. No component theme.
  Radix primitives are added when a slice needs dialogs, menus or popovers (slice 002+).
- Editor: textareas per section in Phase 0. TipTap is adopted in slice 003, after validating that
  anchored comments and version serialisation work.
- 3D (slice 002): React Three Fiber, lazy-loaded after a server-rendered static SVG constellation
  that is fully functional. The list view is equivalent.
- Fonts: Inter (UI) and Cormorant Garamond (opening story only), as replaceable font tokens, served
  through `next/font` at build time.
