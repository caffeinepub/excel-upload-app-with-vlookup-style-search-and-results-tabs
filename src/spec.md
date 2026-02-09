# Specification

## Summary
**Goal:** Fix Admin Users approve/reject so it sends a valid `Principal` to the backend and prevents the “Invalid principal argument” runtime error, with clear UI error handling when a Principal cannot be constructed.

**Planned changes:**
- Update `AdminUsersTab` approve/reject actions to pass a real `Principal` (e.g., existing `approval.principal` or `Principal.fromText(...)`) into `useSetApproval().mutateAsync` instead of casting a string to `any`.
- Add frontend validation for Principal parsing/construction before calling the mutation; if invalid, block the action and show an English error message in the Admin Users UI.
- Improve user-facing error handling for approval/rejection failures so errors are displayed in the Admin Users page (not only logged).

**User-visible outcome:** Admins can approve or reject users from the Admin Users tab without the “Invalid principal argument” error; if a user’s Principal is invalid, the UI shows a clear message and does not attempt the backend call.
