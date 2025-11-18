<!-- bb0124db-ede9-44e9-af56-8f47d4d673ea 859f8394-628b-44e9-8e33-2f2762151ed3 -->
# Refactor Table Add Record Inline and Fix UI Issues

## Phase 1: Remove Add Record Button and Move Filters Button

### Files to modify:

- `frontend/src/app/components/table-toolbar/table-toolbar.component.ts`
- Remove the "Add Record" button from the toolbar
- Add a new `@Output() openFilters = new EventEmitter<void>()` for opening filters
- Add a button with filter icon that emits `openFilters`

- `frontend/src/app/components/table-view/table-view.component.ts`
- Remove `(addRecord)="onAddRecord()"` binding from `app-table-toolbar`
- Add `(openFilters)="onOpenFilters()"` binding
- Implement `onOpenFilters()` method to toggle `filtersExpanded`
- Remove `onAddRecord` method and `addRecord()` private method

- `frontend/src/app/components/table-view/table-view-filters/table-view-filters.component.ts`
- Keep the panel structure but make it controlled by parent component
- The header click should be handled by parent (via `openFilters` event)

## Phase 2: Implement Inline Add Record with Single Button

### Files to modify:

- `frontend/src/app/components/table-view/table-body/table-body.component.ts`
- Remove the current `dataSourceWithNewRow` computed that adds `{ _isNewRow: true }`
- Create a new computed `dataSourceWithAddRow` that adds a special row object `{ _isAddRow: true }` only if there's no temporary record being edited
- Modify the template to show a single button spanning all columns when `element._isAddRow` is true
- The button should have a distinctive style (different background, border, icon)
- Add `@Output() onStartAddRecord = new EventEmitter<void>()` to emit when the add button is clicked

- `frontend/src/app/components/table-view/table-view.component.ts`
- Add `temporaryRecord: any | null = null` to track the temporary record being edited
- Add `temporaryRecordIndex: number | null = null` to track its position
- Modify `onAddNewRow` to be `onStartAddRecord` that:
- Creates a temporary record immediately using `tableDataService.createRecord()`
- Adds it to `filteredData` (but mark it as temporary)
- Sets `temporaryRecord` and `temporaryRecordIndex`
- Updates pagination to show the new record
- Starts editing the first editable column
- Add logic to detect click outside the temporary record row
- If temporary record is incomplete (required fields missing), remove it from `filteredData` when clicking outside
- Add validation method `validateRequiredFields(record: any): boolean` that checks all required columns
- Modify `onSaveEdit` to validate required fields before saving
- If Enter is pressed and required fields are missing, trigger bounce animation instead of saving

## Phase 3: Visual Feedback for Required Fields

### Files to modify:

- `frontend/src/app/components/table-view/table-body/table-body.component.ts`
- Add `@Input() temporaryRecordIndex?: number | null` to identify the temporary row
- Add `@Input() getRequiredColumns?: () => TableColumn[]` to get required columns
- In the template, add conditional classes to cells in temporary row:
- `class.required-field` if column is required and empty
- `class.required-field-filled` if column is required and filled
- Add CSS for `.required-field` (e.g., red border or background tint)
- Add CSS for `.required-field-filled` (e.g., green border or background tint)
- Add CSS for bounce animation `@keyframes bounce` and apply to row when validation fails

- `frontend/src/app/components/table-view/table-view.component.ts`
- Pass `temporaryRecordIndex` to `app-table-body`
- Pass `getRequiredColumns` getter that returns `table.columns.filter(col => !col.isNullable && !col.isAutoIncrement)`

## Phase 4: Fix Pagination Issues

### Files to modify:

- `frontend/src/app/components/table-view/table-view.component.ts`
- Fix `onAddNewRow`/`onStartAddRecord` to not increment page number incorrectly
- Ensure that when a temporary record is added, pagination adjusts correctly
- If the new record is on a new page, navigate to that page
- Ensure `updatePagination()` correctly handles temporary records (they should be included in count)

- `frontend/src/app/components/table-pagination/table-pagination.component.ts`
- Ensure pagination component correctly displays total count including temporary records
- When temporary record is removed, update count accordingly

## Phase 5: Fix Container Styling and Responsiveness

### Files to modify:

- `frontend/src/app/components/table-view/table-view.component.ts`
- Fix `.table-content` styles:
- Ensure `border-radius` is properly applied and visible
- Add `overflow: hidden` to prevent content from breaking rounded corners
- Set `min-height: calc(100vh - 32px)` to fill available space
- Add `display: flex; flex-direction: column` to ensure proper layout
- Fix `.table-wrapper` styles:
- Add `flex: 1` to take remaining space
- Ensure proper overflow handling
- Remove any styles that might be causing transparent corners
- Ensure the container fills the default page height

## Phase 6: Make Filters Functional

### Files to modify:

- `frontend/src/app/components/table-view/table-view.component.ts`
- Ensure `onFiltersChanged` correctly applies filters
- Verify that `applyFiltersAndSort()` is being called
- Test that filters persist when panel is closed and reopened
- Ensure filter state is preserved in the view if applicable

## Implementation Notes:

1. The temporary record should be marked with a special property like `_isTemporary: true` to distinguish it from regular records
2. When validating on Enter, check all required fields and show bounce animation on the row if validation fails
3. The add row button should span all columns using `colspan` or by being placed in a special column that spans the entire width
4. Click outside detection can be implemented using `@HostListener('document:click')` or by checking if the click target is outside the table row
5. The bounce animation should be subtle but noticeable (e.g., translateY with easing)

### To-dos

- [ ] Remove 'Add Record' button from toolbar and add filters button in its place
- [ ] Create single add button that spans entire row in table body
- [ ] Implement temporary record creation and management logic
- [ ] Add visual feedback for required fields (colors, validation)
- [ ] Implement click outside detection to remove incomplete temporary records
- [ ] Fix pagination incrementing incorrectly when adding records
- [ ] Fix container corners, spacing, and make it fill page height
- [ ] Verify and fix filters functionality