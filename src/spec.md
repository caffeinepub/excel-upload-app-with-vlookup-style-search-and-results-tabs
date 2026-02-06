# Specification

## Summary
**Goal:** Update the Upload tab empty-state to use a new round red “PATENTED” logo with continuous one-direction rotation + flip, and fix text overlap issues in both PDF exports and the in-app UI.

**Planned changes:**
- Add a new transparent-cutout static image asset for the round red “PATENTED” logo under `frontend/public/assets/generated` (used only for the Upload tab empty-state animation).
- Update the Upload tab empty-state (when no workbook is loaded) to display the new logo centered and slightly smaller than the current presentation.
- Adjust the Upload tab empty-state animation so rotation is continuous, smooth, slow, loops forever in a single direction (no reversing), while preserving the flip effect and respecting reduced-motion preferences.
- Fix PDF export layout spacing/wrapping so no text overlaps in headers, footers, or tables, including multi-page exports with consistent margins.
- Fix visible in-app layout formatting issues that cause text overlap across responsive widths, keeping all user-facing text in English.

**User-visible outcome:** When no workbook is loaded, users see a centered, slightly smaller round red “PATENTED” logo that flips and rotates continuously in one direction; PDF exports and the app UI no longer show overlapping text and remain readable across pages and screen sizes.
