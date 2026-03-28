# Crystal Atlas

## Current State
- Drug Structure Analyzer (DrugAnalyzerTab.tsx) shows comparison results in a table but the table overflows the container on PC — cells with SMILES/descriptions exceed the box width.
- The page uses dark indigo/slate colors (standalone dark theme) that don't match the app's Blue Ocean theme.
- DeskboardTab.tsx has AdminBroadcastComposer followed by BroadcastHistory below it. No KPI widgets after it.

## Requested Changes (Diff)

### Add
- **2 KPI widgets** side by side (grid-cols-2) placed immediately after the BroadcastHistory block in DeskboardTab.tsx:
  1. **FDA Latest Approvals KPI**: Cycles through the latest 10 FDA-approved drugs, showing 1 drug at a time every 5 seconds. Fetches from FDA openFDA API (`https://api.fda.gov/drug/drugsfda.json?sort=submissions.submission_status_date:desc&limit=10`). Drug name is clickable and opens the drug label at `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo={application_number}`. Shows drug name, application number, company.
  2. **Orange Book New Approvals KPI**: Shows newly approved drugs from the FDA Orange Book, fetched from `https://api.fda.gov/drug/drugsfda.json?search=submissions.submission_type:ORIG&sort=submissions.submission_status_date:desc&limit=5`. Updates daily. Shows drug name, approval date, applicant.

### Modify
- **DrugAnalyzerTab.tsx**: 
  - Fix results table overflow: use `table-fixed w-full` with explicit column widths, `overflow-hidden` wrapper, `word-break: break-word`, truncate long values properly.
  - Match app theme: replace dark slate/indigo standalone theme with the app's CSS variables (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `text-primary`, etc.) — Blue Ocean theme.
  - The page should feel consistent with the rest of the app visually.

### Remove
- Nothing removed.

## Implementation Plan
1. Modify `DrugAnalyzerTab.tsx`: swap all hardcoded dark bg/text classes to theme-aware CSS variable classes; fix comparison table to use `table-fixed` with clamped column widths and `break-words` overflow handling.
2. Create `FDAApprovalsKPI.tsx` component: fetches FDA data, cycles through drugs 1-by-1 every 5s using setInterval, shows drug name as clickable link, application number, sponsor.
3. Create `OrangeBookKPI.tsx` component: fetches Orange Book approvals from FDA API, renders a list of 5 latest approved drugs with name and date.
4. In `DeskboardTab.tsx`, import and place both KPIs in a `grid grid-cols-1 sm:grid-cols-2 gap-4` immediately after the BroadcastHistory block.
