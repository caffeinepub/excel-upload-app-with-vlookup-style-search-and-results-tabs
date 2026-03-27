# Crystal Atlas — Drug Structure Analyzer

## Current State
The app has a Smart Search / Explore Universe tab with PubChem integration for chemical lookups. The sidebar has tabs for Main, Activities, and Admin sections. There is no dedicated drug structure comparison feature.

## Requested Changes (Diff)

### Add
- New `TabId`: `drugAnalyzer`
- New sidebar entry under Activities: "Drug Analyzer" with a molecule/flask icon
- New page: `DrugAnalyzerTab.tsx` — standalone full-page drug structure comparison tool
- Feature: Upload 2 drug structure images simultaneously (side by side upload zones)
- Feature: Auto-identify drug from uploaded image using DECIMER public API (https://decimer.ai/api/predict) which accepts a base64 image and returns a SMILES string, then resolve that SMILES to a compound name via PubChem
- Fallback: If DECIMER fails, use OCR-style text extraction from image filename or allow manual name entry
- Feature: After identification, fetch full compound data from PubChem for both drugs
- Feature: Side-by-side comparison table showing: Molecular Formula, Molecular Weight, IUPAC Name, Canonical SMILES, Drug Class/Category, Synonyms, Description, Pharmacological properties
- Feature: Structural similarity score (Tanimoto or simple comparison metric computed client-side)
- Feature: Visual comparison panel with drug images and property highlights
- Available to ALL users (not admin-only)

### Modify
- `App.tsx`: Add `drugAnalyzer` to TabId union and ALL_TABS array
- `DesktopSidebarNav.tsx`: Add `drugAnalyzer` to ACTIVITY_TABS, add icon import
- `App.tsx` renderTab(): Add case for `drugAnalyzer`

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/pages/DrugAnalyzerTab.tsx` with:
   - Two image upload zones side by side
   - On image drop/select: call DECIMER API (POST base64 image) to get SMILES
   - Use PubChem `/compound/smiles/{smiles}/JSON` to resolve compound details
   - Fallback input field for manual drug name if auto-detect fails
   - Comparison result section: two-column layout with side-by-side property table
   - Highlight differences between the two drugs
   - Show similarity score as a percentage
2. Update `App.tsx`: add `drugAnalyzer` TabId and tab def with Beaker/FlaskConical icon
3. Update `DesktopSidebarNav.tsx`: add to ACTIVITY_TABS and icon map
