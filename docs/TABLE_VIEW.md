# Table View Documentation

## Overview

The Table View component provides an Airtable/NocoDB-like experience for viewing and managing database tables. It supports inline editing, filtering, sorting, column management, and custom views.

## Features

### Core Functionality

- **Inline Editing**: Click cells to edit values directly
- **Column Management**: Show/hide and reorder columns
- **Filtering**: Apply filters to data columns
- **Sorting**: Sort by multiple columns
- **Views**: Save and switch between custom views
- **Multi-Select**: Select multiple rows for bulk operations
- **Pagination**: Navigate through large datasets

### Design System Integration

The Table View uses the Design System components for consistent styling and theming:

- `ds-base-button` for action buttons
- `ds-chip` for tags and badges
- `ds-card` for container styling
- Theme-aware CSS variables throughout

## Component Structure

```
app-table-view
├── app-table-toolbar          # Main toolbar with actions
├── app-table-view-filters       # Filter panel
├── app-table-view-sorter        # Sort controls
├── app-table-view-column-manager # Column visibility/ordering
├── mat-table                    # Data table
│   ├── app-table-header         # Column headers
│   ├── app-table-cell           # Data cells
│   └── app-relationship-cell    # Relationship cells
└── app-table-pagination         # Pagination controls
```

## Usage

### Basic Example

```typescript
<app-table-view
  [table]="selectedTable"
  [data]="tableData"
  [relationships]="relationships"
  [relationshipDisplayColumns]="relationshipDisplayColumns"
  [allTables]="allTables"
  [allTableData]="allTableData"
  [views]="views"
  [activeView]="activeView"
  (dataChanged)="onDataChanged($event)"
  (viewSelected)="onViewSelected($event)"
  (viewCreated)="onViewCreated($event)"
  (viewUpdated)="onViewUpdated($event)"
  (viewDeleted)="onViewDeleted($event)">
</app-table-view>
```

## Component Props

### Inputs

- `table: Table` - The table definition
- `data: any[]` - Array of table records
- `relationships: Relationship[]` - Table relationships
- `relationshipDisplayColumns: RelationshipDisplayColumn[]` - Relationship display columns
- `allTables: Table[]` - All tables in the schema
- `allTableData: { [tableName: string]: any[] }` - Data for all tables
- `views: TableView[]` - Available views
- `activeView: TableView | null` - Currently active view

### Outputs

- `dataChanged: EventEmitter<DataChangeEvent>` - Emitted when data changes
- `viewSelected: EventEmitter<TableView>` - Emitted when a view is selected
- `viewCreated: EventEmitter<TableView>` - Emitted when a view is created
- `viewUpdated: EventEmitter<TableView>` - Emitted when a view is updated
- `viewDeleted: EventEmitter<string>` - Emitted when a view is deleted
- `relationshipDisplayColumnsUpdated: EventEmitter<RelationshipDisplayColumn[]>` - Emitted when relationship columns change

## Features in Detail

### Filters

The filter panel allows users to:
- Add multiple filter conditions
- Select columns to filter
- Choose filter operators (equals, contains, starts with, etc.)
- Set filter values
- Clear all filters

**Operators:**
- `equals` - Exact match
- `contains` - Substring match
- `starts_with` - Starts with value
- `ends_with` - Ends with value
- `greater_than` - Greater than value (for numbers/dates)
- `less_than` - Less than value (for numbers/dates)
- `is_empty` - Field is empty
- `is_not_empty` - Field has a value

### Sorting

The sorter allows users to:
- Add multiple sort columns
- Choose sort direction (ascending/descending)
- Remove sort columns
- Sort priority is based on order (last added has highest priority)

### Column Management

The column manager allows users to:
- Show/hide columns via checkboxes
- Reorder columns via drag-and-drop
- Show all columns
- Hide all columns

### Inline Editing

- Click any cell to edit (except auto-increment columns)
- Click column header to rename column
- Press Enter to save, Escape to cancel
- Validation occurs on save

### Multi-Select

- Enable multi-select mode via toolbar button
- Click rows to select/deselect
- Select all checkbox in header
- Bulk operations on selected rows (delete)

## Events

### DataChangeEvent

```typescript
interface DataChangeEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SCHEMA_UPDATE';
  table: string;
  data: any;
  id?: string;
  schemaUpdate?: any;
}
```

## Services

The Table View uses several services:

- `TableEditService` - Manages editing state
- `TableViewService` - Manages view configuration
- `TableRelationshipService` - Handles relationships
- `DataSimulationService` - Data operations

## Styling

All styling uses CSS variables from the theme system:

```css
.table-content {
  background-color: var(--theme-surface);
  border-radius: var(--ds-radius-medium);
}

.data-table {
  background-color: var(--theme-table-row);
}

.data-table tr:hover {
  background-color: var(--theme-table-row-hover);
}
```

## Keyboard Navigation

- `Enter` - Save edit
- `Escape` - Cancel edit
- `Tab` - Navigate between cells
- `Arrow Keys` - Navigate cells (coming soon)

## Mobile Responsiveness

The Table View is responsive:
- Horizontal scrolling on small screens
- Touch-friendly controls
- Responsive filter panel
- Adaptive column widths

## Future Enhancements

- [ ] Formula columns
- [ ] Calendar view
- [ ] Kanban view
- [ ] Chart views
- [ ] Advanced filters (nested conditions)
- [ ] Export/Import (CSV, JSON)
- [ ] Collaborative editing indicators
- [ ] Real-time updates visualization

## Best Practices

1. **Performance**: Use pagination for large datasets
2. **Views**: Save common filter/sort combinations as views
3. **Column Visibility**: Hide unnecessary columns for better UX
4. **Filtering**: Apply filters before sorting for better performance
5. **Accessibility**: Ensure proper ARIA labels for screen readers

## Troubleshooting

### Columns not showing
- Check column visibility in column manager
- Verify active view settings
- Ensure columnSettings are initialized

### Filters not working
- Verify filter conditions are properly set
- Check that column types match operator requirements
- Review applyFilters() implementation

### Sorting issues
- Ensure sort columns are valid
- Check column types for proper comparison
- Verify data is not null/undefined

### Angular Material Table Template Errors

**Error:** `Cannot read properties of undefined (reading 'template')`

**Root Cause:** Angular Material Table requires `*matHeaderCellDef` directive on all column definitions. If a column is missing this directive, Material cannot find the header template and throws this error.

**Solution (Implemented 2025-01-20):**

1. **Column Header Structure:**
   - All regular columns (`reg_...`) must have `<th mat-header-cell *matHeaderCellDef>` wrapping the header content
   - The `app-table-header` component was refactored to only provide content (no `<th>` wrapper)
   - Angular Material manages the `<th>` element, components should only provide content

2. **Reactive Column Filtering:**
   - `displayedColumns` computed signal now filters against available `MatColumnDef` instances
   - Uses `@ViewChildren(MatColumnDef)` to track available column definitions
   - Prevents rendering columns before their `matColumnDef` is available in the DOM
   - Updates reactively when column definitions change

3. **Implementation Details:**
   ```typescript
   // table-body.component.ts
   @ViewChildren(MatColumnDef) columnDefs!: QueryList<MatColumnDef>;
   private availableColumnNames = signal<string[]>([]);
   
   readonly displayedColumns = computed(() => {
     const requested = [...regularCols, ...relationshipCols];
     const available = this.availableColumnNames();
     return requested.filter(name => available.includes(name));
   });
   ```

**Files Modified:**
- `frontend/src/app/components/table-view/table-body/table-body.component.ts`
  - Added `*matHeaderCellDef` to regular column headers
  - Added reactive column filtering with `@ViewChildren` and signals
- `frontend/src/app/components/table-header/table-header.component.ts`
  - Removed `<th>` wrapper (Angular Material handles it)
  - Component now only provides header content

**Key Principle:** Angular Material Table requires column definitions to be present in the DOM before row definitions can reference them. The reactive filtering ensures `displayedColumns` only includes columns that have their `MatColumnDef` available.

