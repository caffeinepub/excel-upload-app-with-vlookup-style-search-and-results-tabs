# Crystal Atlas — Bug Fixes (Round N)

## Current State
Crystal Atlas is a comprehensive HR/productivity app. Several UI and data bugs are present:
1. Leave card submissions are stored in localStorage only — admin cannot receive them from other browsers/devices.
2. Broadcast history item text overflows the card boundary (no truncation/wrap).
3. Team channel seen-by names not showing — userMap lookup is async so names resolve empty; fallback to senderName on the receipt also fails.
4. Drug Analyzer results table overflows the card on desktop.
5. Admin Status KPI photo does not size naturally to the photo's aspect ratio — fixed 280px max-height causes distortion for tall photos.

## Requested Changes (Diff)

### Add
- Backend `submitLeaveRequest` and `getLeaveRequestsForAdmin` / `getMyLeaveRequests` functions to store leave cards in the canister (persists across devices, visible to admin regardless of browser).
- Frontend hooks and leave card form update to use backend storage.

### Modify
- `BroadcastHistory.tsx` — add `break-words` and proper `max-w-full` to the text paragraph to prevent overflow.
- `MessageFeed.tsx` — fix seen-by name resolution: use `r.senderName` from the `__seen:` receipt message directly as the primary name source (it is already set to the poster's display name when posted). Only use userMap as a secondary fallback.
- `DrugAnalyzerTab.tsx` — add `max-w-full overflow-x-auto` to results table wrapper and constrain text columns.
- `AdminStatusKPI.tsx` — remove the fixed `maxHeight: 280` on the photo img, use `max-h-64` with `object-contain` so the photo shows at its natural aspect ratio.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `LeaveRequest` type and storage (`submitLeaveRequest`, `getLeaveRequestsForAdmin`, `getMyLeaveRequests`, `updateLeaveRequestStatus`) to `main.mo`.
2. Update `LeaveCardTab.tsx` to call `submitLeaveRequest` on submit and load history from backend.
3. Update `AdminUsersTab.tsx` AdminLeaveCardsPanel to call `getLeaveRequestsForAdmin` instead of localStorage scan.
4. Fix `BroadcastHistory.tsx` text overflow.
5. Fix `MessageFeed.tsx` seen-by name resolution to use senderName first.
6. Fix `DrugAnalyzerTab.tsx` table overflow.
7. Fix `AdminStatusKPI.tsx` photo sizing.
