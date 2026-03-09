# Crystal Atlas

## Current State
Multi-feature web app (patent data, attendance, team chat, expenses, etc.) running on ICP with Motoko backend + React frontend.

Three specific bugs reported:
1. Admin cannot see user approval requests — new users who log in and request approval don't appear in the Admin Users tab because `listApprovals` only shows users already in the approval state map, and display names are not shown (only principal IDs truncated).
2. Team Chat DM and channel message delete/edit not working persistently — `deleteChannelMessage` and `deleteDirectMessage` only update the local React Query cache but there are NO backend delete endpoints. After refresh messages reappear. Edit works for channel messages but the UI delete is frontend-only.
3. "Grant Date Access" / "Revoke Date Access" buttons silently fail — the mutations call correct backend endpoints but error feedback is swallowed; also the "Delete User" currently only sets approval to rejected instead of fully removing the user.

## Requested Changes (Diff)

### Add
- Backend: `deleteChannelMessage(messageId)` — sender or admin can delete; removes from `channelMessages` map
- Backend: `deleteDirectMessage(messageId)` — sender or admin can delete; removes from `directMessages` map
- Backend: `getAllUsersForAdmin()` — returns all users with principal, displayName, and approval status. Merges `approvalState.approvalStatus` map with `userProfiles` map so users who saved a profile but haven't been added to approval state yet still appear
- Backend: `removeUserCompletely(user)` — removes user from `approvalState.approvalStatus`, `accessControlState.userRoles`, `userProfiles`, and `customDatePermissions`
- Frontend: `useDeleteChannelMessage` now calls real `actor.deleteChannelMessage(messageId)` backend endpoint
- Frontend: `useDeleteDirectMessage` now calls real `actor.deleteDirectMessage(messageId)` backend endpoint
- Frontend: `useGetAllUsersForAdmin` hook using the new `getAllUsersForAdmin()` backend endpoint
- Frontend: `useRemoveUserCompletely` mutation hook

### Modify
- Backend: `requestApproval` — when a user calls it, also ensure they are registered in `userProfiles` lookup so admin can see their name. No functional change needed but rely on `getAllUsersForAdmin` to merge data.
- Frontend `AdminUsersTab`: Replace `useListApprovals` with `useGetAllUsersForAdmin` so all registered users are visible with their display names. Show display name in the table (with principal as a tooltip / secondary line). Ensure Grant Date Access, Revoke Date Access, and Delete buttons all show `toast.success` and `toast.error` properly (already attempted but error path needs to be more visible). Replace `useDeleteUser` (which just rejects) with `useRemoveUserCompletely` for the Delete button.
- Frontend `useTeamMessaging.ts`: `useDeleteChannelMessage` and `useDeleteDirectMessage` now call real backend endpoints and invalidate the correct query cache keys.

### Remove
- Nothing removed

## Implementation Plan
1. Generate updated Motoko backend with `deleteChannelMessage`, `deleteDirectMessage`, `getAllUsersForAdmin`, and `removeUserCompletely` endpoints.
2. Update `useTeamMessaging.ts` — `useDeleteChannelMessage` and `useDeleteDirectMessage` call real backend endpoints.
3. Add `useGetAllUsersForAdmin` and `useRemoveUserCompletely` hooks in `useApproval.ts` / `useApprovalMutations.ts`.
4. Update `AdminUsersTab.tsx` — use `useGetAllUsersForAdmin`, display names, fix delete to use `useRemoveUserCompletely`, ensure all action toasts are visible.
5. Validate and deploy.
