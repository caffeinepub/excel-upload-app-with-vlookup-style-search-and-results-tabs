# Crystal Atlas

## Current State
Version 77 live. Admin login has been broken — authenticated users see "Request Access" even with valid admin tokens because the profile setup dialog is the only place to enter the admin token, with no fallback after profile is saved. Additionally, there is no way for an admin to promote another user to admin role from the Admin Panel.

## Requested Changes (Diff)

### Add
- **ApprovalGate admin claim panel**: A collapsible "Are you an administrator?" section shown on the Access Request Pending screen, allowing the user to enter the admin token at any time (not just during profile setup). Includes real-time refetch after token acceptance.
- **"Make Admin" button in AdminUsersTab**: A purple "Make Admin" button appears for each approved user, allowing the current admin to promote them to full admin role (calls `assignCallerUserRole` with `#admin`).
- **`useGrantAdminRole` mutation hook**: New mutation that calls `assignCallerUserRole` to promote a user to admin.

### Modify
- **ApprovalGate**: Refactored to include admin claim flow with token input, error/success states, and forced re-fetch after claiming admin. Added loading state on "Check Again" button.
- **AdminUsersTab**: Added `useGrantAdminRole` import and usage, `handleGrantAdminRole` function, "Make Admin" button in each user row's actions, and updated help text.
- **useApprovalMutations.ts**: Added `useGrantAdminRole` export and `UserRole` import.

### Remove
- Nothing removed.

## Implementation Plan
1. Updated `ApprovalGate.tsx` — added collapsible admin claim section with token input and live re-fetch.
2. Added `useGrantAdminRole` to `useApprovalMutations.ts`.
3. Updated `AdminUsersTab.tsx` — imported `useGrantAdminRole`, `Crown` icon; added `handleGrantAdminRole`; added "Make Admin" button per user row.
