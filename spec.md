# Crystal Atlas

## Current State
Large multi-module HR app with attendance, team chat, expenses, calendar, KPI widgets (FDA, Orange Book, Molecule Explorer). Dashboard has FDA KPI widgets after broadcast section, then the main grid/widgets. Team chat uses channel messages with `__seen:` receipts for seen-by tracking. Leave card has PDF export and submit via jsPDF loaded via CDN. App has Motoko backend with 100+ functions.

## Requested Changes (Diff)

### Add
- **Admin Status KPI**: New KPI below the Molecule Explorer section on dashboard.
  - Admin-only: upload a photo + write a message, then click Send
  - KPI shows in 2 parts: Part 1 = uploaded photo (displayed fully/beautifully), Part 2 = message text
  - When admin sends, ALL users see this status KPI (poll from backend or shared storage)
  - Auto-expires after 12 hours; admin can manually remove at any time
  - Comments section below the status: all users can write comments; comments visible to all
  - One Celebration button: clicking it triggers a 5-second confetti/celebration animation across the full screen
  - Implementation: use existing `createBroadcast` with special prefix `__ADMINSTATUS__` for the status; comments stored as channel messages in a dedicated auto-created channel
- **TGA Calculator**: New sidebar section `TGA Calculator` with scientific calculation
  - Input: Weight loss % (W), Temperature °C (T), Molecular weight g/mol (MW)
  - Formula: moles_water = W/18, moles_compound = (100-W)/MW, n = (W×MW)/[18×(100-W)]
  - Round n to nearest common hydrate (0.5, 1, 2, 3, etc.)
  - Output: calculated n, hydrate type name, note based on temperature range

### Modify
- **Team Channel Seen By**: Fix seen-by names not showing in channel messages
  - Change `__seen:${msgId}` receipt format to `__seen:${msgId}:${callerPrincipal}` 
  - Update MessageFeed parsing to extract principal and resolve name from users list
  - Fix re-posting: always re-post seen receipts if not found in backend (in case channel was cleaned)
- **Leave Card PDF**: Fix "Preview & Download PDF" and "Submit Leave Card" buttons not working
  - Add jspdf as npm package (remove CDN dynamic loading which may fail due to CSP)
  - Fix error surfacing so failures are clearly shown

### Remove
- Nothing removed

## Implementation Plan
1. Add `jspdf` to `src/frontend/package.json` and install it
2. Update `LeaveCardTab.tsx`: import jspdf directly, remove CDN loader, fix error handling
3. Update `ChannelView.tsx`: change seen receipt format; fix re-post logic
4. Update `MessageFeed.tsx`: update `__seen:` parsing to extract principal, look up from users map
5. Create `AdminStatusKPI.tsx` component: uses broadcast API with `__ADMINSTATUS__` prefix, photo compression, comments via channel, confetti animation
6. Add `AdminStatusKPI` to `DeskboardTab.tsx` below Molecule Explorer section
7. Create `TGACalculatorTab.tsx` sidebar section with formula and output display
8. Add TGA Calculator to sidebar navigation
