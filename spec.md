# Crystal Atlas

## Current State
Crystal Atlas is a full-stack HR/productivity app with Motoko backend and React frontend. It has attendance tracking (check-in/out, history, PDF export), holiday management, team chat, user profiles, expense sharing, calendar events, department management, and admin controls.

Known issues:
- Holiday creation does NOT auto-update all users' attendance history
- Admin cannot edit individual user attendance records
- Profile page is not full-page; lacks professional section layout
- Shared expense reports display in raw/unformatted text, not a clean table
- Department view is only available to admins, not all users
- Calendar Events calendar widget doesn't fill its container box fully

## Requested Changes (Diff)

### Add
- Backend: `setHolidayForAllUsers(date, holidayName, holidayType)` — when admin creates a holiday, auto-insert/update an attendance record with status "Holiday" for every registered user on that date
- Backend: `adminUpdateUserAttendance(userId, date, dayType, checkIn, checkOut, workNote)` — admin can overwrite any field of a user's attendance for a given date
- Frontend: After admin saves a holiday, trigger auto-update of all users' attendance history
- Frontend: Admin employee attendance view — edit button per record that opens a modal to change Day Type, Check-in, Check-out, Work Note
- Frontend: Department tab visible to ALL users (read-only for non-admins)

### Modify
- Profile page: Redesign as full-page professional layout with three sections — Personal Info (name, photo, birthdate, bio), Contact Details (email, phone), Employment Info (joining date, job title, department). All fields editable, savable.
- Shared expense report ("Shared with Me" tab): Replace raw text display with a clean HTML table — columns: Date, Category, Description, Amount — with a bold Total row at bottom. Reports remain deletable by sender.
- Calendar Events page: Make the calendar widget fill 100% of its container box with proper spacing and no overflow issues.

### Remove
- Nothing removed

## Implementation Plan
1. Add `setHolidayForAllUsers` and `adminUpdateUserAttendance` backend functions
2. Wire holiday creation flow to call `setHolidayForAllUsers` after saving holiday
3. Add edit modal in admin attendance viewer for per-user record edits
4. Redesign ProfileModal/ProfilePage as full-page sectioned layout
5. Fix SharedExpenseReport display to render as a proper HTML table with Date/Category/Description/Amount columns and Total row
6. Make Department tab read-only visible to all users (hide edit controls for non-admins)
7. Fix Calendar Events calendar widget CSS to fill container box fully
