# Specification

## Summary
**Goal:** Add keyword/row-name search filtering for Update Checking comparison results, including match options and export behavior that respects the filtered view.

**Planned changes:**
- Add a Results-tab search UI for Update Checking that appears/enables only after a comparison result exists (not shown for VLOOKUP).
- Support filtering displayed comparison rows by a user-entered keyword across all values/columns in each row, with match type options: Exact and Contains.
- Add a clear/reset action so users can quickly remove the filter and return to the full result set.
- Update Update Checking Excel/PDF exports so they export only the currently filtered rows when a filter is active, while preserving the existing Crystal Atlas branding header.

**User-visible outcome:** After running Update Checking, users can search the comparison results by keyword/row name (Exact or Contains), clear the search to restore all rows, and export Excel/PDF that matches the currently displayed filtered results.
