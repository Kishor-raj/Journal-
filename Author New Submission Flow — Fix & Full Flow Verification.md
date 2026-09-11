# Author New Submission Flow — Fix & Full Flow Verification

## Target Area

- [x] Work ONLY on the Author → New Submission flow.
- [x] Primary affected page:
  `https://ijidcr-asgard.vercel.app/author/submit/07b99396-fe90-4db0-b2a2-13680a6758df?step=0`
- [x] Do NOT change unrelated pages, modules, APIs, database logic, authentication, dashboards, or other workflows.
- [x] Preserve all currently working functionality.

---

## 1. Phase 1 — Subject / Category

- [x] Inspect the existing Subject / Category `*` implementation.
- [x] Verify the category list is fetched from the existing backend/database correctly.
- [x] Verify category selection works correctly.
- [x] Verify the selected category is stored correctly.
- [x] Verify the selected category remains available when moving between submission phases.
- [x] Verify the selected category appears correctly on the Review page.
- [x] Do NOT replace or redesign the existing category data/logic if it is already correct.
- [x] Only fix the category flow if testing identifies a real issue.

---

## 2. Phase 1 — Article Type

- [x] Inspect the existing Article Type `*` implementation.
- [x] Verify article types are loaded from the existing source correctly.
- [x] Verify article type selection works correctly.
- [x] Verify the selected article type is stored correctly.
- [x] Verify the selected article type remains available across submission steps.
- [x] Verify the selected article type appears correctly on the Review page.
- [x] Do NOT unnecessarily change the existing article-type database or API logic.

---

## 3. Phase 1 — Keywords

### Current Problem

- [x] Investigate why the Keyword section is not working correctly.

### Fix

- [x] Inspect the complete keyword flow:
  `UI → state → validation → API → backend → database → fetch → UI`.
- [x] Verify keyword input works correctly.
- [x] Verify adding a keyword works correctly.
- [x] Verify multiple keywords work correctly.
- [x] Verify removing/editing a keyword works correctly if supported by the existing UI.
- [x] Verify keywords are stored using the existing database/API structure.
- [x] Verify keywords are fetched correctly when the submission is reopened.
- [x] Verify keywords are not lost when moving between phases.
- [x] Verify keywords are not duplicated unexpectedly.
- [x] Verify keywords appear correctly on the Review page.
- [x] Do NOT create a new keyword architecture if the existing architecture can be fixed.

---

## 4. Metadata & Declarations — Conflict of Interest

- [x] Inspect the existing Conflict of Interest field/section.
- [x] Verify the frontend state correctly captures the entered value.
- [x] Verify validation works according to the existing requirements.
- [x] Verify the value is sent correctly to the backend.
- [x] Verify the backend receives the correct field/value.
- [x] Verify the value is stored in the correct existing database field/relationship.
- [x] Verify the value can be fetched again.
- [x] Verify the value remains available after navigating between phases.
- [x] Verify the Conflict of Interest information appears correctly on the Review page.
- [x] Do NOT change unrelated Metadata & Declarations logic.

---

## 5. Phase 5 — Review Page

### Main Problem

Some previously entered submission details are currently missing from the Review page.

- [x] Inspect the Review page data-fetching logic.
- [x] Identify every submission field that should be displayed.
- [x] Compare Review-page fields against the actual submission data stored in the database.
- [x] Check frontend field names against backend response field names.
- [x] Check nested objects/relationships.
- [x] Check IDs versus display values.
- [x] Check category relationship mapping.
- [x] Check article-type mapping.
- [x] Check keyword mapping.
- [x] Check Metadata mapping.
- [x] Check Declarations mapping.
- [x] Check Conflict of Interest mapping.
- [x] Fix missing data fetches.
- [x] Fix incorrect field mappings.
- [x] Fix missing API response properties only when required for this submission flow.
- [x] Ensure Review displays the actual saved values rather than hardcoded/default values.
- [x] Ensure empty optional fields are handled safely without breaking the Review page.
- [x] Ensure no existing Review functionality is removed.

### Review Page Must Verify

- [x] Subject / Category
- [x] Article Type
- [x] Keywords
- [x] All existing submission metadata
- [x] All existing declaration information
- [x] Conflict of Interest
- [x] All other submission details already supported by the existing system

---

## 6. Database Verification

- [x] Inspect the actual database records for the affected submission.
- [x] Verify Category data is stored correctly.
- [x] Verify Article Type data is stored correctly.
- [x] Verify Keyword data is stored correctly.
- [x] Verify Metadata data is stored correctly.
- [x] Verify Declaration data is stored correctly.
- [x] Verify Conflict of Interest data is stored correctly.
- [x] Verify relationships/foreign keys are correct.
- [x] Verify the Review page is reading from the correct records.
- [x] Do NOT modify the database schema unless absolutely required.
- [x] Do NOT migrate or rename existing database fields unnecessarily.
- [x] Do NOT delete existing submission data.

---

## 7. Frontend → Backend Verification

- [x] Inspect the API request generated when saving submission details.
- [x] Verify request payload field names.
- [x] Verify request payload values.
- [x] Verify required fields are included.
- [x] Verify optional fields are handled correctly.
- [x] Verify the backend receives the expected data.
- [x] Verify no field is silently dropped before reaching the backend.
- [x] Verify no frontend transformation changes the saved value incorrectly.

---

## 8. Backend → Database Verification

- [x] Inspect the relevant submission controller/service.
- [x] Verify incoming fields are mapped correctly.
- [x] Verify existing Prisma/database operations.
- [x] Verify create/update operations.
- [x] Verify related records are saved correctly.
- [x] Verify update operations do not overwrite unrelated fields with `null`/`undefined`.
- [x] Verify repeated saves do not create unwanted duplicates.
- [x] Preserve existing database behavior wherever it is already correct.

---

## 9. Database → Frontend Verification

- [x] Inspect the API used to load an existing submission.
- [x] Verify all required relationships are included in the response.
- [x] Verify category data is returned correctly.
- [x] Verify article type data is returned correctly.
- [x] Verify keywords are returned correctly.
- [x] Verify metadata/declarations are returned correctly.
- [x] Verify Conflict of Interest is returned correctly.
- [x] Verify frontend correctly maps the API response.
- [x] Verify Review page uses fetched data rather than stale local state.
- [x] Verify refresh/reload does not cause previously saved data to disappear.

---

# 10. Navigation & Persistence Testing

- [x] Start a new submission.
- [x] Enter valid data in Phase 1.
- [x] Continue to the next phase.
- [x] Go back to the previous phase.
- [x] Verify all entered data remains.
- [x] Continue through the remaining phases.
- [x] Verify data remains available.
- [x] Refresh the browser.
- [x] Verify saved data is fetched again correctly.
- [x] Navigate to the Review phase.
- [x] Verify all saved information is displayed.
- [x] Edit a previously entered field.
- [x] Save the change.
- [x] Return to Review.
- [x] Verify the updated value is displayed.
- [x] Verify unrelated values were not changed or deleted.

---

# 11. Full End-to-End Flow Test — FINAL

## Test the complete flow once from beginning to end.

- [x] Start from Author → New Submission.
- [x] Complete Phase 1.
- [x] Test Subject / Category.
- [x] Test Article Type.
- [x] Test Keywords.
- [x] Complete all existing submission phases.
- [x] Complete Metadata & Declarations.
- [x] Enter/verify Conflict of Interest.
- [x] Continue to Phase 5 — Review.
- [x] Verify every previously entered value is displayed.
- [x] Verify no expected field is missing.
- [x] Verify no wrong/stale value is displayed.
- [x] Verify no data is duplicated.
- [x] Verify no data is overwritten.
- [x] Verify no data disappears when navigating backward/forward.
- [x] Verify refresh/reload behavior.
- [x] Verify saved database data matches the Review page.
- [x] Verify frontend → API → backend → database flow.
- [x] Verify database → API → frontend flow.
- [x] Check browser console for errors.
- [x] Check Network/API requests for failed requests.
- [x] Check backend logs for related errors.
- [x] Check for `undefined`, `null`, incorrect IDs, or missing relationships.
- [x] Check validation errors.
- [x] Check save/update behavior.
- [x] Check existing submission functionality is not broken.
- [x] If the full-flow test reveals another issue directly related to this submission flow, fix it.
- [x] Re-test the affected flow after fixing it.
- [x] Do NOT expand the scope into unrelated application areas.

---

## 12. Final Regression Check

- [x] Confirm Subject / Category works.
- [x] Confirm Article Type works.
- [x] Confirm Keywords work.
- [x] Confirm Conflict of Interest works.
- [x] Confirm all relevant data is stored correctly.
- [x] Confirm all relevant data is fetched correctly.
- [x] Confirm Review page displays complete data.
- [x] Confirm navigation does not lose data.
- [x] Confirm refresh does not lose saved data.
- [x] Confirm edit/update does not overwrite unrelated fields.
- [x] Confirm no new console errors.
- [x] Confirm no new API errors.
- [x] Confirm no unrelated logic was changed.
- [x] Confirm the complete Author → New Submission → Review flow works end-to-end.

---

# Final Rule

- [x] **Fix the actual problem, not unrelated code.**
- [x] **Reuse existing working logic wherever possible.**
- [x] **Do not unnecessarily change database schema, API contracts, category logic, article-type logic, or unrelated modules.**
- [x] **Before finishing, perform one complete end-to-end submission flow test.**
- [x] **Any data-fetch, data-mapping, persistence, navigation, or Review-page issue discovered during that final test must be fixed if it belongs to this submission flow.**
- [x] **Final result: Author can complete a submission, all entered data is correctly stored, fetched, preserved, and fully displayed on Phase 5 — Review.**