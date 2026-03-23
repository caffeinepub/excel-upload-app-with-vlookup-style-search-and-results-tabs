# Crystal Atlas

## Current State

The app is a full HR/productivity platform (v96) with attendance, team chat, departments, admin panel, maintenance mode, and more.

## Requested Changes (Diff)

### Add
- Week Off bulk-marking feature for admin: pick a date, mark ALL approved users' attendance as `weeklyOff` for that date using `adminUpdateUserAttendance` in a loop.
- Channel message seen-by receipt system: when a user opens a channel, post a silent `__seen:${msgId}` channel message for each newly-visible message (deduplicated). Filter these from display but use them to compute seen-by names per message.

### Modify
- **Maintenance Mode button**: Fix `useSetMaintenanceMode` to add error toast and success toast on toggle. In `App.tsx`, also force `activeTab` to "deskboard" when `isMaintenanceMode && !isAdmin` (belt-and-suspenders beyond the overlay). Add optimistic refetch after toggle.
- **Department members**: Replace the broken `getUsersInDepartment` backend call approach in `DeptMemberCards` with a client-side approach: use `useObserveUsers()` and `useAllUsersPublic()` data, filter users whose `profile.departmentId` matches the department id OR call `getUsersInDepartment` and fallback to the client-side filter. Expose a prop to pass known members down from the parent which already has `useObserveUsers` data.
- **Channel seen-by display**: In `MessageFeed.tsx`, filter out messages with text starting with `__seen:` from the visible list. Build a `seenByMap` from those silent messages mapping `msgId -> Set<senderName>`. Show names from this map under each message instead of the localStorage approach.

### Remove
- The localStorage-only seen tracking (unreliable across browsers/users) replaced by the `__seen:` channel message approach.

## Implementation Plan

1. `useSetMaintenanceMode` hook: add `onError` toast and `onSuccess` toast and force `queryClient.refetchQueries`.
2. `App.tsx`: when `isMaintenanceMode && !isAdmin`, force `activeTab` state to "deskboard" in a `useEffect`.
3. `AttendanceTab` or new `WeekOffBulkPanel` component in admin section: date picker + "Mark Week Off for All Users" button that calls `getAllUsersForAdmin()` then loops `adminUpdateUserAttendance(principal, date, { weeklyOff: null }, [], [], "")`.
4. `DepartmentManager`: pass `useObserveUsers()` data down to `DeptMemberCards`. In `DeptMemberCards`, first try `getUsersInDepartment` (existing); if it returns 0 items, fall back to filtering the passed-in users by `profile.departmentId`.
5. `ChannelView.tsx`: after marking messages seen in localStorage, also post `__seen:${msgId}` channel messages (fire-and-forget, deduplicated via a ref of already-posted IDs).
6. `MessageFeed.tsx`: separate raw messages into `visibleMessages` (text not starting with `__seen:`) and `seenReceipts` (text starting with `__seen:`). Build seenByMap. Pass to each `MessageBubble` and show names.
