# Specification

## Summary
**Goal:** Add admin-approved username/password user management, fix attendance hours recalculation and summaries, add work brief notes to attendance, and make the Calendar feature functional with attendance-to-calendar integration.

**Planned changes:**
- Add username/password registration and login, with admin approval required before accessing user features; provide admin user CRUD (list/edit/delete) plus approve/reject.
- Enforce approval checks in backend authorization for user-only features and surface pending/rejected status in the UI.
- Fix attendance working-time calculation so edits (including past dates) correctly recompute per-day workingTime and summary totalWorkingTime sums the full selected range.
- Add validation and clear English errors for invalid time ranges (e.g., check-out before check-in) and update the attendance summary UI after edits without a full reload.
- Add a persisted “work brief note” field to attendance entries and make it editable/viewable in the attendance day editor UI.
- Wire the existing Calendar UI to real backend event queries/mutations (list/create/delete).
- Integrate attendance with calendar events so attendance entries appear as calendar events without duplication and respecting authorization rules.

**User-visible outcome:** Users can register and log in with a username/password and can only use the app after admin approval; admins can manage users. Attendance edits correctly update daily and total hours, users can add a work brief note per day, and the Calendar tab can create/list/delete events while also showing attendance entries as calendar events.
