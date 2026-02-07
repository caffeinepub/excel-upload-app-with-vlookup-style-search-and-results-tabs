# Specification

## Summary
**Goal:** Add a desktop-accessible Regular Expense feature for authenticated users with budget tracking, daily expense logging, and downloadable PDF reports, and ensure the existing History page is reachable from the desktop sidebar.

**Planned changes:**
- Update desktop (lg+) sidebar navigation to include a visible, clickable "History" item that opens the existing History content.
- Add a new desktop (lg+) sidebar item "Regular Expense" that navigates to a new Regular Expense page/tab.
- Add a desktop-only "Regular Expense" button on the Deskboard page that navigates to the Regular Expense page/tab (hidden on < lg).
- Create the Regular Expense UI: per-user budget input (save/update), expense entry form (Date, Type, Amount + Add), and an on-page list/table of added expenses.
- Add backend persistence and authorized APIs for per-user budget and expense entries (get/set budget, add expense, list expenses).
- Add frontend PDF export from Regular Expense with a selectable report type (weekly/monthly/yearly) and a Download PDF action; generated PDFs include Date/Type/Amount and totals for the selected period, with filenames reflecting range and covered dates.
- Ensure unauthenticated users see an English login-required message on Regular Expense and cannot submit changes.

**User-visible outcome:** On desktop, users can open History from the sidebar, navigate to a new Regular Expense page from the sidebar or Deskboard, set a budget, log daily expenses, see their entries listed, and download weekly/monthly/yearly expense reports as PDFs when logged in.
