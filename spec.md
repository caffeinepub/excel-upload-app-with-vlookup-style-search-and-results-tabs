# Crystal Atlas

## Current State
Crystal Atlas is a full-stack ICP app with React frontend and Motoko backend. It includes:
- Attendance check-in/check-out with work notes, PDF download, past attendance history
- Leave card with admin approval flow
- Holiday management (admin-managed)
- Team Chat (channels, DMs, reactions, edit/delete messages, status)
- Admin panel: user approval, grant/revoke date access, delete user, promote admin (via 3-dot menu)
- Department management
- Admin broadcast panel
- Reminders, To-Do, Notes
- Dashboard with event bar, reminder bar
- Excel upload, VLOOKUP, smart search
- Expense tracking
- Customer management
- User profile tab (sidebar)

## Requested Changes (Diff)

### Add
1. **Profile Button near Logout** — A dedicated Profile button in the top nav/near logout. Opens a modal/panel with ALL user info editable (name, photo, phone, email, job title, department(s), bio, etc.) Saves to backend canister.
2. **Expense Report Sharing** — Users can select one or multiple registered users and share their expense report as an in-app shared view. Recipients see shared reports in a "Shared with Me" section. Backend stores shared report records.
3. **Welcome Splash (Two-layer system)**
   - **Daily (once per day on first open):** Full 5-second animated splash with user's name, time-based greeting (Good Morning/Afternoon/Evening/Night), unique daily welcome message that never repeats. Stored in localStorage with date key.
   - **Every open (after daily splash):** 3-second animated banner showing a new motivational/success quote + time-based nice-day note. Never repeats the same quote. Queue managed in localStorage.
4. **Holiday Date Lock** — When a holiday date is set by admin, ALL users are blocked from editing attendance on that date (check-in, check-out, work notes, status). Only admins bypass this lock.
5. **Backend: `shareExpenseReport`** — Stores shared expense report with sender, recipients list, report data, timestamp.
6. **Backend: `getSharedReports`** — Returns reports shared with the calling user.
7. **Backend: `updateUserProfile`** — Accepts full profile object (name, phone, email, jobTitle, bio, departments list, avatarUrl).
8. **Backend: `getFullUserProfile`** — Returns complete profile for any user (admin) or self.
9. **Backend: `isHolidayDate`** — Checks if a given date is a holiday, returns Bool.

### Modify
1. **Department Management** — Show ALL user profile data (name, photo, job title, email, phone, departments) in each department card. Users can belong to 1 or more departments simultaneously (multi-department assignment).
2. **AttendanceTab** — Before allowing check-in/check-out or editing, call `isHolidayDate`. If true and user is not admin, block editing and show "This date is a holiday" message.
3. **UserProfileTab** — Extend with full profile fields: name, photo, phone, email, job title, bio, multi-department assignment.

### Remove
- Nothing removed

## Implementation Plan
1. Add backend endpoints: `shareExpenseReport`, `getSharedReports`, `updateUserProfileFull`, `getFullUserProfile`, `isHolidayDate`, multi-department user assignment.
2. Add ProfileButton component in top nav (near logout) — opens ProfileModal with all fields editable.
3. Build WelcomeSplash component (daily version: 5s animated fullscreen) and QuoteBanner component (every-open: 3s animated top banner). Manage with localStorage date keys and quote index tracking.
4. Update DepartmentsAdminTab to show full user profile cards per department, support multi-department assignment UI.
5. Update AttendanceTab to call `isHolidayDate` and block non-admin editing on holiday dates.
6. Add ExpenseReportSharing to RegularExpenseTab — "Share Report" button opens user picker, calls `shareExpenseReport`. Add "Shared with Me" tab showing reports received.
