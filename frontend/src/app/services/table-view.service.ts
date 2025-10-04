import { Injectable, signal } from '@angular/core';
import { TableView, ColumnViewSetting } from '../models/table-view.model';
import { Table, TableColumn } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class TableViewService {
  
  private activeViews = signal<{ [tableId: string]: string }>({});

  constructor() { }

  /**
   * Crea una nueva vista para una tabla
   */
  createView(table: Table, name: string, description?: string): TableView {
    const view: TableView = {
      id: this.generateId(),
      name,
      description,
      tableId: table.id,
      isDefault: false,
      columnSettings: this.createDefaultColumnSettings(table),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return view;
  }

  /**
   * Crea la vista por defecto para una tabla
   */
  createDefaultView(table: Table): TableView {
    const view: TableView = {
      id: this.generateId(),
      name: 'Default View',
      description: 'Default view showing all columns',
      tableId: table.id,
      isDefault: true,
      columnSettings: this.createDefaultColumnSettings(table),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return view;
  }

  /**
   * Crea configuraciones de columna por defecto
   */
  private createDefaultColumnSettings(table: Table): ColumnViewSetting[] {
    const settings: ColumnViewSetting[] = [];
    
    // Regular columns
    table.columns
      .filter(col => !col.isSystemGenerated && !col.isForeignKey)
      .forEach((col, index) => {
        settings.push({
          columnId: col.id,
          columnName: col.name,
          isVisible: true,
          order: index
        });
      });

    return settings;
  }

  /**
   * Aplica una vista a una tabla
   */
  applyView(table: Table, view: TableView): TableColumn[] {
    if (!view.columnSettings) {
      return table.columns;
    }

    // Filtrar y ordenar columnas según la vista
    const visibleColumns = table.columns
      .filter(col => {
        const setting = view.columnSettings.find(s => s.columnId === col.id);
        return setting ? setting.isVisible : true;
      })
      .sort((a, b) => {
        const settingA = view.columnSettings.find(s => s.columnId === a.id);
        const settingB = view.columnSettings.find(s => s.columnId === b.id);
        const orderA = settingA ? settingA.order : 999;
        const orderB = settingB ? settingB.order : 999;
        return orderA - orderB;
      });

    return visibleColumns;
  }

  /**
   * Obtiene las vistas de una tabla
   */
  getTableViews(tableId: string, allViews: { [tableId: string]: TableView[] }): TableView[] {
    return allViews[tableId] || [];
  }

  /**
   * Establece la vista activa para una tabla
   */
  setActiveView(tableId: string, viewId: string): void {
    const currentViews = this.activeViews();
    this.activeViews.set({
      ...currentViews,
      [tableId]: viewId
    });
  }

  /**
   * Obtiene la vista activa para una tabla
   */
  getActiveView(tableId: string): string | null {
    return this.activeViews()[tableId] || null;
  }

  /**
   * Actualiza una vista existente
   */
  updateView(view: TableView, updates: Partial<TableView>): TableView {
    return {
      ...view,
      ...updates,
      updatedAt: new Date()
    };
  }

  /**
   * Duplica una vista
   */
  duplicateView(view: TableView, newName: string): TableView {
    return {
      ...view,
      id: this.generateId(),
      name: newName,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Elimina una vista
   */
  deleteView(views: TableView[], viewId: string): TableView[] {
    return views.filter(view => view.id !== viewId);
  }

  /**
   * Valida si una vista es válida
   */
  validateView(view: TableView, table: Table): boolean {
    if (!view.name || !view.tableId) {
      return false;
    }

    // Verificar que todas las columnas de la vista existan en la tabla
    const tableColumnIds = table.columns.map(col => col.id);
    const invalidColumns = view.columnSettings?.filter(setting => 
      !tableColumnIds.includes(setting.columnId)
    );

    return !invalidColumns || invalidColumns.length === 0;
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return 'view_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}
