# Constellation behaviour (draft for slice 002, independent of rendering technology)

Status: Draft. Not in scope for Phase 0. It is captured here so slice 001 data shapes support it.

- **Selection and focus:** hover or focus highlights a star and freezes camera drift. Enter or
  click moves the camera closer in 350–700 ms with easing. Esc returns to the default view.
- **Zoom:** two levels in MVP: default (proper name + status label) and close (epithet,
  archetype, current mission, actions). There is no multi-constellation zoom.
- **Labels:** labels are always screen-aligned and never orbit. Collision avoidance moves labels
  radially. Each label has a minimum of 14px text and 4.5:1 contrast on its backing.
- **Status:** shown as motion + text label + glyph. It is never colour alone.
- **Keyboard and list equivalence:** an ordered list of the seven (DOM, always present) carries
  every action. The canvas is `aria-hidden` and keyboard focus moves through the list, which drives
  canvas highlighting.
- **Reduced motion / still mode:** there is no ambient rotation and selection jumps without camera
  travel. A permanent "Still constellation" setting is available.
- **Low performance:** if the frame time median exceeds 33 ms over 2 s, quality steps down
  (DPR cap → particles → shader). If it is still slow, the view switches to the still SVG.
- **Loading / WebGL failure:** the static SVG constellation renders first. The 3D bundle loads
  lazily, and on failure the SVG stays, with no error dialog.
