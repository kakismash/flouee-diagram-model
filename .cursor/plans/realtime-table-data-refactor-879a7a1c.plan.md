<!-- 879a7a1c-faab-4e27-a9c0-ecf48dfec0f0 08124511-8ed4-4563-ada9-1c57bb85f038 -->
# Internal Table Scroll Implementation

## Objective

Make the table view have internal scrolling instead of page scrolling. The table should use the available container height, and pagination should be visible at the bottom.

## Changes Required

### 1. Update `table-view.component.ts` styles

**File:** `frontend/src/app/components/table-view/table-view.component.ts`

**Changes:**

- Change `.table-content` from `min-height: calc(100vh - 32px)` to `height: 100%` to respect parent container
- Update `.table-wrapper` to have both `overflow-y: auto` and `overflow-x: auto` for internal scrolling
- Ensure `.table-wrapper` has a defined height constraint (using `flex: 1` with `min-height: 0` to allow flexbox shrinking)
- Keep pagination outside the scroll area (fixed at bottom) so it's always visible
- Ensure pagination does NOT scroll horizontally (only the table content scrolls horizontally)

**Specific CSS changes:**

```css
.table-content {
  /* Change from min-height to height: 100% */
  height: 100%;
  /* Remove min-height: calc(100vh - 32px) */
  /* Keep: margin, background-color, border-radius, box-shadow, overflow, display, flex-direction */
  /* Ensure overflow-x is hidden on the container so pagination doesn't scroll horizontally */
  overflow-x: hidden;
}

.table-wrapper {
  /* Add overflow-y: auto for vertical scrolling */
  overflow-y: auto;
  overflow-x: auto; /* Only table content scrolls horizontally */
  /* Add min-height: 0 to allow flexbox shrinking */
  min-height: 0;
  /* Keep: flex: 1, display, flex-direction */
}

/* Ensure pagination doesn't scroll horizontally */
app-table-pagination {
  overflow-x: hidden;
  width: 100%;
}
```

### 2. Verify parent container constraints

**File:** `frontend/src/app/components/view-mode/view-mode.component.ts`

**Check:** Ensure `.tab-content` or parent containers don't prevent height constraints from working properly. The `.tables-container` already has `height: 100%` and `overflow-y: auto`, which might conflict. We may need to adjust this.

**Potential changes:**

- If `.tables-container` has `overflow-y: auto`, we might need to remove it or adjust it since the scroll should be internal to the table, not the container
- Ensure `.tab-content` allows the table to take full available height

## Implementation Details

1. The table will scroll internally within `.table-wrapper`
2. The toolbar remains fixed at the top
3. The pagination remains fixed at the bottom (outside scroll area)
4. The table body scrolls vertically and horizontally as needed
5. The table respects the available height from the parent container

## Testing Considerations

- Verify scroll works when table has many rows
- Verify horizontal scroll works when table has many columns
- Verify pagination is always visible at bottom
- Verify toolbar is always visible at top
- Verify table doesn't expand beyond container height