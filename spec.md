# Crystal Atlas — Attendance, Calendar, Expenses, Team Chat, Mobile Fixes

## Current State

Crystal Atlas is a full-stack HR/collaboration app with Motoko backend and React frontend. It features Attendance (check in/out, history, PDF), Calendar (events, holidays), Expenses (shared reports), Team Chat (channels, DMs, reactions, status), and mobile layout.

- TodayAttendanceView: shows day type as a static badge, no dropdown to change it
- AttendanceDateEditor: has a Select component for status but it's only on the date-editor panel
- Calendar (CalendarTab): has CalendarEvents but no inline calendar picker for creating events
- Expenses (RegularExpenseTab): shared reports tab labeled incorrectly; shared report data shown as raw JSON/text
- TeamTab: profiles and reactions not visible for messages from other users; chat is small/boxed not full-screen
- Mobile: Team Chat, Attendance, and other pages have layout/text overflow issues

## Requested Changes (Diff)

### Add
- Day Type selector drawer/dropdown on TodayAttendanceView — user can change the day type (Present, Leave, Festival Leave, Company Leave, Week Off, Half Day, Holiday) directly from the Today tab
- Holiday name + day type label shown below each date cell on the Attendance Calendar view
- Calendar Events page: show a full calendar picker to select a date, then create/edit/delete events (title, description, time, public or admin-only visibility)
- Full-screen Team Chat layout with slide-in animation when navigating to Team tab
- Profiles (avatar + name) visible on all messages including from other users in Team Chat
- Emoji reactions visible and interactive for all users (not just own messages)

### Modify
- RegularExpenseTab: rename "Shared with User" tab → "Shared with Me"
- Shared expense report view: replace raw text with formatted table (Date, Category, Description, Amount columns + total row at bottom)
- TodayAttendanceView: wire Day Type select to call `saveAttendanceEntry` when changed
- Team Chat: improve visuals — larger message area, better padding, animated entry, profile pictures on all messages
- Mobile layout: fix text overflow, wrapping, and padding across Team Chat, Attendance, Dashboard, and other pages

### Remove
- Nothing removed

## Implementation Plan

1. **TodayAttendanceView**: Add a Select/Drawer for Day Type (all 7 statuses). On change, call `saveAttendanceEntry` with updated status for today's date.

2. **Attendance Calendar**: In the calendar cell renderer, look up holidays and attendance entries for each date. Show holiday name + type (e.g. "Diwali — Festival Leave") below the day number.

3. **RegularExpenseTab / Shared Reports**:
   - Rename tab label from "Shared with User" → "Shared with Me"
   - Parse `reportData` JSON to extract expense rows, render as a clean table with columns: Date, Category, Description, Amount — plus a bold total row at the bottom

4. **CalendarTab — Calendar Events**:
   - Replace the current event creation UI with a shadcn Calendar component for date selection
   - Below the calendar, show a form to create an event for the selected date (title, description, time, visibility toggle admin-only/public)
   - List existing events for the selected date with Edit and Delete controls

5. **TeamTab — Full-screen + Visuals**:
   - Wrap TeamTab content in a full-viewport overlay that animates in (slide from right or fade-scale) when the tab is activated
   - Increase chat area to use full height/width; keep sidebar visible
   - Show sender avatar + display name on every message bubble (not just own)
   - Show emoji reaction bar on all messages, not just own

6. **Mobile Fixes**:
   - Add `overflow-hidden` / `overflow-x-hidden` to root containers
   - Ensure all flex/grid layouts have proper `flex-wrap` or `min-w-0` on children
   - Fix Team Chat sidebar and message area on small screens (stack vertically or use a slide-over sidebar)
   - Fix Attendance Today/History card layouts on mobile
   - Ensure text doesn't overflow on dashboard widgets
