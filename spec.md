# Crystal Atlas

## Current State
- Full-featured multi-module app: Excel/patent management, attendance, expenses, customers, team chat, reminders, calendar events, holidays, broadcast panel
- 3D character exists on Reminders/dashboard pages (previous design)
- Team chat (TeamTab.tsx) has issues: users shown by principal/code name instead of display name, personal DMs not connecting between users, chat delete not functioning, online/offline/busy status not updating on click
- No Leave Card generation feature
- Attendance module exists with check-in/out, history, PDF download
- Leave submissions do not auto-update the attendance calendar

## Requested Changes (Diff)

### Add
- **Mini Astronaut character**: floating mini astronaut image (`/assets/generated/mini-astronaut-transparent.dim_300x300.png`) used everywhere a character/mascot appeared before (Reminders page, dashboard, onboarding, etc.)
- **Leave Card PDF Generator**: new section/tab accessible from Attendance area
  - Manual form with fields filled by Tab key: Employee Name, Department, Leave Type (Sick/Casual/Annual/Festival/Other), From Date, To Date, Number of Days (auto-calc), Reason, Manager Name, signature line
  - A4 PDF download with company logo header, company footer info, proper HR formatting
  - After submission: attendance calendar auto-updates the leave dates with the selected leave type
  - Submitted leave cards stored in history (leave card history viewable)
- **Leave Card history**: list of all submitted leave cards per user

### Modify
- **Team Chat (TeamTab.tsx)** — full fix:
  - All users displayed by their saved `displayName` from `UserProfile` (never principal ID)
  - Direct Messages: fix the DM conversation — messages sent via `sendDirectMessage` must correctly load between two users via `getDirectMessages(otherPrincipal)`; display name shown for both sides
  - Chat delete: implement delete message functionality for channel messages and DMs (sender can delete own messages, admin can delete any)
  - User status (Online/Offline/Busy/Away): clicking a status option calls `setUserStatus` and immediately updates the UI; polling refreshes statuses from `getUserStatuses` every 5 seconds
  - DM user search: show all registered users by display name, not principal ID
- **Attendance calendar**: when a leave card is submitted, automatically create attendance entries for each day in the leave range with the corresponding leave status

### Remove
- Old 3D character model references (replace with mini astronaut image)

## Implementation Plan
1. Replace all character/mascot references across all pages with the mini astronaut PNG image with floating CSS animation
2. Fix TeamTab.tsx:
   a. Load all user profiles on mount to build a principalId → displayName map
   b. Use display name map everywhere users are shown (DM list, channel messages, user search)
   c. Fix DM flow: on selecting a DM contact, call `getDirectMessages(contact.principal)` and poll every 5 seconds
   d. Add delete message handler for channel and DM messages (with confirmation)
   e. Fix status selector: on click of Online/Offline/Busy/Away, call `setUserStatus` immediately, refresh UI
3. Add Leave Card feature to AttendanceTab.tsx:
   a. New "Leave Card" sub-tab with tabbed form (Tab-key navigable fields)
   b. Fields: Employee Name, Department, Leave Type, From Date, To Date, Days (auto), Reason, Manager Name
   c. On submit: save leave card to backend history, loop through date range and call `saveAttendanceEntry` for each day with the correct leave status
   d. PDF generation: A4 format, logo header, company footer, clean HR layout
   e. Leave Card history sub-tab showing past submissions
4. Add new backend types and functions: `LeaveCard` type, `submitLeaveCard`, `getLeaveCards` functions
5. Validate and build
