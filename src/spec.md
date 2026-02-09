# Specification

## Summary
**Goal:** Center the 3D character inside the Character Dock preview box on desktop and prevent any head/top clipping caused by the UI frame/layout.

**Planned changes:**
- Update the Character Dock preview box container layout/styling so the character appears visually centered within the frame on xl+ viewports.
- Adjust the Character Dock canvas container styling (e.g., safe padding/inner framing, height/min-height, and overflow handling) to ensure the full character remains visible during idle and other animations without cropping.
- Apply changes using existing Character Dock styling/classes or equivalent composition patterns, without modifying the 3D model/transforms as the primary approach.

**User-visible outcome:** On desktop, the Character Dock preview shows the character perfectly centered and fully visible (including the head/antenna) with no horizontal or vertical clipping.
