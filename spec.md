# Crystal Atlas

## Current State
- DeskboardTab.tsx has a "Deep Research" collapsible section using `ExploreHerePanel`
- FDAApprovalsKPI.tsx shows rotating FDA approvals (5s per drug, 1-10 results)
- OrangeBookKPI.tsx exists alongside FDA KPI
- DrugAnalyzerTab.tsx shows drug comparison results that overflow the card boundaries
- LeaveCardTab.tsx allows leave requests but no half-day selection on separate date

## Requested Changes (Diff)

### Add
- **Molecule Search tab** (replaces Deep Research): New `MoleculeSearchPanel` component in DeskboardTab replacing the ExploreHerePanel in the Deep Research section. Search by compound name, fetch 2D structure image from PubChem (free image API: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/PNG`) and 3D rotatable molecule using Three.js/React Three Fiber (fetch SDF/coordinates from PubChem 3D API). Toggle between 2D and 3D view.
- **Half-day leave option** in LeaveCardTab: Add a secondary date picker labeled "Half Day Date (optional)" so users can request 1 full day + 1 half day = 1.5 days total in a single leave request.

### Modify
- **FDAApprovalsKPI**: Fix layout — add proper padding/margins, center all content, ensure the drug name/details are centered in the card body. Fix the API query to use OR syntax correctly to get real fresh results: `search=submissions.submission_status:"AP"&limit=20` without the broken application_number filter.
- **DrugAnalyzerTab**: Fix results overflow — constrain all table cells with `max-w-xs break-words overflow-hidden`, truncate long SMILES strings, ensure the comparison table is fully scrollable horizontally with `overflow-x-auto`, and fix font sizes to not exceed card boundaries.

### Remove
- `ExploreHerePanel` usage in the Deep Research section of DeskboardTab (replaced by MoleculeSearchPanel)

## Implementation Plan
1. Create `src/frontend/src/components/dashboard/MoleculeSearchPanel.tsx` — search input, 2D/3D toggle, PubChem 2D image display, Three.js/R3F 3D molecule viewer with atom spheres and bond cylinders parsed from PubChem JSON compound data
2. Update `DeskboardTab.tsx` — replace ExploreHerePanel import/usage in Deep Research section with MoleculeSearchPanel; rename section title to "Molecule Explorer"
3. Update `FDAApprovalsKPI.tsx` — fix API URL to use simpler query, add `mx-auto text-center` to card body, fix padding
4. Update `DrugAnalyzerTab.tsx` — wrap results table in `overflow-x-auto`, add `max-w-[120px] truncate` to long cells, fix container constraints
5. Update `LeaveCardTab.tsx` — add optional half-day date picker field; when set, total days = full days + 0.5; include half-day date in leave request submission and PDF output
