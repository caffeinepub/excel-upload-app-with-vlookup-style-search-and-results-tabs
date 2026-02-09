# Specification

## Summary
**Goal:** Add in-app (while-open) reminder notifications that show a dismissible toast, play a generic iPhone-style ringtone, and drive a permanent on-screen 3D armored-hero character with reminder- and tab-based animations.

**Planned changes:**
- Implement in-app reminder due detection that triggers without page refresh and shows a toast with reminder title + human-readable English date/time and a reliable dismiss action.
- Add a legally-safe, generic iPhone-style ringtone that plays when a reminder triggers, provides an “Enable sound” style user action when autoplay is blocked, and stops/resets when the toast is dismissed.
- Add a permanent, non-infringing 3D armored-hero/robot character rendered in the main interface with graceful fallback if 3D/WebGL fails.
- Implement character animation states: idle by default, switch to dance when a reminder triggers, and return after dismissal.
- Map each major app tab to a deterministic character animation (e.g., drink water, jump, call, funny movement) with fast switching, while ensuring reminder “dance” overrides tab animations until dismissed.
- Wire the reminder event so the toast, ringtone, and character animation respond together.
- Apply a cohesive visual theme for the character area and reminder toast consistent with existing Tailwind styling and not primarily blue/purple.

**User-visible outcome:** While using the app, due reminders pop up as a toast you can dismiss; a generic ringtone plays (after sound is enabled if needed); and a permanent 3D armored character animates per tab and dances during active reminders, returning to normal afterward.
