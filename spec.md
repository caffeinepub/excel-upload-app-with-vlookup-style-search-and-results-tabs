# Crystal Atlas

## Current State
The app has Team Chat with channel messages and DMs. Seen-by is tracked in localStorage using principal IDs and shows "Seen by {count}". Reactions are state-only (not persisted, vanish on refresh). Department members call `getUsersInDepartment(deptId.toString())` but members don't render reliably for regular users.

## Requested Changes (Diff)

### Add
- A hook/utility to resolve principal IDs to display names using `getAllRegisteredUsersPublic`
- Persistent reactions stored in localStorage keyed by channelId/dmConvKey + messageId + emoji, synced on mount and updated on react

### Modify
- MessageFeed: "Seen by" label should show user display names (e.g. "Seen by Rahul, Priya") instead of "Seen by {count}"
- MessageFeed: Reactions now load from localStorage on mount and save back on change, so they persist across refresh
- DepartmentManager: Fix `useDepartmentMembers` to correctly call `getUsersInDepartment` with the numeric bigint dept ID (not toString)

### Remove
- Nothing removed

## Implementation Plan
1. Add `useAllUsersPublic` hook to fetch all public users
2. In `MessageFeed`, use that hook to map seenBy principal IDs to display names for the Seen by label
3. In `MessageFeed`, persist reactions to localStorage keyed by channelId+messageId or dmConv+messageId, load on mount
4. In `DepartmentManager`, fix `getUsersInDepartment` call to pass the correct ID type
