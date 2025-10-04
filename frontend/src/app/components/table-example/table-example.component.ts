import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartTableComponent, TableColumn, TableConfig, TableEvents } from '../smart-table/smart-table.component';

@Component({
  selector: 'app-table-example',
  standalone: true,
  imports: [
    CommonModule,
    SmartTableComponent
  ],
  template: `
    <div class="table-example">
      <h2>Modular Table Example</h2>
      <p>This example shows how to use the modular table components instead of the monolithic table-view component.</p>
      
      <app-smart-table
        [data]="sampleData"
        [columns]="tableColumns"
        [config]="tableConfig"
        [selectedRows]="selectedRows"
        [editingCell]="editingCell"
        [editingValue]="editingValue"
        [editingColumnName]="editingColumnName"
        [editingColumnNameValue]="editingColumnNameValue"
        (events)="onTableEvents($event)">
      </app-smart-table>
    </div>
  `,
  styles: [`
    .table-example {
      padding: 20px;
    }
    
    h2 {
      color: var(--theme-primary);
      margin-bottom: 16px;
    }
    
    p {
      color: var(--theme-on-surface);
      margin-bottom: 24px;
    }
  `]
})
export class TableExampleComponent implements OnInit {
  sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, department: 'Engineering' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, department: 'Marketing' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, department: 'Sales' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', age: 28, department: 'Engineering' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', age: 32, department: 'HR' }
  ];

  tableColumns: TableColumn[] = [
    {
      id: 'id',
      name: 'ID',
      type: 'regular',
      isPrimaryKey: true,
      isAutoIncrement: true,
      isVisible: true,
      isEditable: false,
      isDraggable: true
    },
    {
      id: 'name',
      name: 'Name',
      type: 'regular',
      isVisible: true,
      isEditable: true,
      isDraggable: true
    },
    {
      id: 'email',
      name: 'Email',
      type: 'regular',
      isUnique: true,
      isVisible: true,
      isEditable: true,
      isDraggable: true
    },
    {
      id: 'age',
      name: 'Age',
      type: 'regular',
      isVisible: true,
      isEditable: true,
      isDraggable: true
    },
    {
      id: 'department',
      name: 'Department',
      type: 'regular',
      isVisible: true,
      isEditable: true,
      isDraggable: true
    }
  ];

  tableConfig: TableConfig = {
    enableMultiselect: true,
    enableActions: true,
    enableDragDrop: true,
    enablePagination: true,
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    stickyHeaders: true
  };

  selectedRows = new Set<number>();
  editingCell: { row: number; column: string } | null = null;
  editingValue = '';
  editingColumnName: string | null = null;
  editingColumnNameValue = '';

  ngOnInit() {
    console.log('Table Example initialized with modular components');
  }

  onTableEvents(events: TableEvents) {
    console.log('Table events received:', events);
    
    // Handle different event types
    if (events.onCellEdit) {
      events.onCellEdit(0, 'name', 'New Value');
    }
    
    if (events.onColumnReorder) {
      events.onColumnReorder(this.tableColumns);
    }
    
    if (events.onRowSelect) {
      events.onRowSelect(0, true);
    }
    
    if (events.onRowDelete) {
      events.onRowDelete(0);
    }
    
    if (events.onRowEdit) {
      events.onRowEdit(0);
    }
    
    if (events.onRowView) {
      events.onRowView(0);
    }
    
    if (events.onPageChange) {
      events.onPageChange({ pageIndex: 0, pageSize: 10, length: 100 } as any);
    }
  }
}
