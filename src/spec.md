# Specification

## Summary
**Goal:** Enable month-based attendance viewing and date-wise editing (past and upcoming), plus centralized global festival/company leave management that reflects across all users and attendance summaries.

**Planned changes:**
- Backend: Add APIs to fetch, upsert, and range-list attendance entries for any provided date(s) with existing permission checks.
- Backend: Add persistent global holidays (festival/company leave) with admin-protected upsert/delete and range listing by date.
- Backend: Update attendance summary calculations to count festival and company leave correctly across a date range, including global-holiday-only dates.
- Frontend: Add a calendar-style month view on the Attendance page with month navigation and visual indicators for today, saved entries, and global holidays.
- Frontend: Add a per-date attendance editor (status + optional time inputs) with validation and clear English error messages; refresh relevant cached attendance data after saving.
- Frontend: Add an authorized-only UI to create/edit/delete global holidays (date, name, type) and show them automatically on the attendance calendar for all users.

**User-visible outcome:** Users can browse an attendance month calendar, select any date (previous or upcoming) to view/edit attendance, and see festival/company leave days marked; authorized users can manage global holiday dates that automatically apply for everyone and are counted in summaries.
