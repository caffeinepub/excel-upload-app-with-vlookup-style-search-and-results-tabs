# Crystal Atlas

## Current State
- Profile page (`ProfileModal.tsx`) has a photo upload but the binary is never saved to backend — it only creates a local blob URL that becomes invalid. The `useUpdateUserProfileFull` mutation only sends `avatarUrl` string, not the binary. The backend profile field `profilePicture` is a `Uint8Array` read by `useAvatarUrl` hook.
- Department members panel (`DepartmentManager.tsx`) calls `actor.getUsersInDepartment(deptId.toString())` but the Motoko backend likely expects a `bigint`/`Nat` — causing empty results.
- Team tab (`TeamTab.tsx`, `TeamSidebar.tsx`) has a standard two-column layout with dark sidebar. User requests a totally new, visually unique interface.
- Dashboard (`DeskboardTab.tsx`) already has upcoming calendar events widget code but it only renders when `upcomingEvents.length > 0`. If events exist with future timestamps they should be visible — may be a nanoseconds/milliseconds conversion issue or missing visibility.
- Team message edit/delete/react functions exist but users report they don't work properly.

## Requested Changes (Diff)

### Add
- Profile photo: save binary `Uint8Array` to backend on upload using `useSaveCallerUserProfile` (which calls `saveCallerUserProfile`) — update the file handler to read as ArrayBuffer, convert to Uint8Array, and save to backend immediately.
- Dashboard: ensure upcoming calendar events are always visible as a prominent card even when count is low; fix potential nanosecond timestamp issue.

### Modify
- **Profile photo upload**: Fix `handleFileChange` in `ProfileModal.tsx` to actually save the image bytes to backend via `saveCallerUserProfile` (merging with existing profile). Also ensure avatarPreview shows the uploaded image immediately.
- **Department members**: Fix `useDepartmentMembers` to try `bigint` first and also show member avatars using `useAvatarUrl` (member's `profilePicture`). Also add a debug fallback: if result is empty, log a warning. Ensure `DeptMemberCards` is rendered in both admin and read-only modes.
- **Team chat — full redesign**: Completely new visual design for `TeamTab.tsx` and `TeamSidebar.tsx`:
  - Gradient glass-morphism sidebar with team name header, user avatar + status at top
  - Channels list with `#` prefix, unread dot indicators
  - DMs list with avatar + status dot
  - Main chat area with full-height message feed
  - Animated slide-in on open
  - Top bar showing channel/DM name with actions
  - Message bubbles: own messages right-aligned with primary color, others left-aligned with card color
  - Edit/delete/react always visible as small icon buttons below each message
  - Make emoji reactions, edit, and delete actually work end-to-end
- **Dashboard calendar events widget**: move it higher on the page (above reminders/todos), ensure it always renders if events exist regardless of position, fix timestamp handling if needed.

### Remove
- Nothing removed

## Implementation Plan
1. Fix `ProfileModal.tsx` photo upload: on file select, read as ArrayBuffer, create Uint8Array, call `useSaveCallerUserProfile` mutation with `{ displayName, profilePicture: new Uint8Array(arrayBuffer) }` to save binary to backend. Show preview immediately with `URL.createObjectURL(file)`.
2. Fix `DepartmentManager.tsx` `useDepartmentMembers`: use `actor.getUsersInDepartment(deptId)` passing bigint directly, handle fallback. In `DeptMemberCards`, render for both admin and readOnly by showing the member cards regardless of mode.
3. Redesign `TeamTab.tsx` and `TeamSidebar.tsx` with a fresh, visually striking interface:
   - Sidebar: deep navy/slate gradient background, rounded channel items, avatar+name workspace header
   - Main area: clean white/card background, large message feed
   - Message bubbles: iMessage-style layout with proper grouping
   - Action buttons (emoji, edit, delete) are always inline under messages
4. Fix `DeskboardTab.tsx` upcoming events: render the card widget unconditionally (don't gate on `upcomingEvents.length > 0` in the widget card itself — still show "No upcoming events" state), move it above the reminders row.
