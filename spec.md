# Crystal Atlas

## Current State
A comprehensive HR/productivity app with attendance management, expense tracking, team chat, and admin controls. Version 85.

## Requested Changes (Diff)

### Add
- `deleteSharedExpenseReport` backend call in RegularExpenseTab's "Shared with Me" section so deleting a shared report is persisted (not just local state)
- A new `useDeleteSharedExpenseReport` hook in useRegularExpense.ts that calls `actor.deleteSharedExpenseReport(reportId)`

### Modify
- **ProfilePage.tsx**: Make profile truly full-screen and professional. Use `fixed inset-0 z-50 overflow-y-auto bg-background` or a full-page layout with organized sections (Personal Info, Contact Details, Employment Info). Hero banner, large avatar, 3-column grid on desktop. The page should feel like a full professional profile page.
- **RegularExpenseTab.tsx**: Replace the client-side-only `deletedReportIds` state deletion with a real backend call to `deleteSharedExpenseReport`. On success, invalidate the `getSharedReports` query cache so the list refreshes.
- **HolidayManager.tsx or similar**: Ensure `setHolidayForAllUsers` is properly awaited and errors are shown (not silently swallowed). After creating a holiday successfully, call `setHolidayForAllUsers` and show a toast if it fails.
- **AdminUsersTab.tsx**: In the admin attendance edit dialog, remove the Check-In and Check-Out time fields (they cannot be properly saved from text strings), keeping only Day Type, Work Note, and a Save button.

### Remove
- Nothing

## Implementation Plan
1. Add `useDeleteSharedExpenseReport` hook to useRegularExpense.ts
2. Update RegularExpenseTab.tsx Shared with Me delete button to call the hook
3. Update ProfilePage.tsx for full-screen professional layout
4. Update HolidayManager holiday creation to properly await and handle setHolidayForAllUsers errors
5. Update AdminUsersTab.tsx edit dialog to remove check-in/check-out fields
6. Validate and build
