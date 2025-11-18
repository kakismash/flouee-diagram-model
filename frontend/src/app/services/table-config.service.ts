import { Injectable, signal, computed, inject } from '@angular/core';
import { Table, TableColumn } from '../models/table.model';
import { TableView, ColumnViewSetting } from '../models/table-view.model';

export interface TableConfig {
  columnWidths: Map<string, number>;
  columnVisibility: Map<string, boolean>;
  columnOrder: Map<string, number>;
  filters: any[];
  sortColumns: any[];
  pageSize: number;
  currentPage: number;
}

@Injectable({
  providedIn: 'root'
})
export class TableConfigService {
  private configs = signal<Map<string, TableConfig>>(new Map());

  /**
   * Get configuration for a table
   */
  getConfig(tableId: string): TableConfig {
    const configs = this.configs();
    if (!configs.has(tableId)) {
      configs.set(tableId, this.createDefaultConfig());
      this.configs.set(new Map(configs));
    }
    return configs.get(tableId)!;
  }

  /**
   * Update column width for a table
   */
  setColumnWidth(tableId: string, columnId: string, width: number): void {
    const configs = new Map(this.configs());
    const config = configs.get(tableId) || this.createDefaultConfig();
    config.columnWidths.set(columnId, width);
    configs.set(tableId, config);
    this.configs.set(configs);
  }

  /**
   * Get column width
   */
  getColumnWidth(tableId: string, columnId: string): number | undefined {
    const config = this.getConfig(tableId);
    return config.columnWidths.get(columnId);
  }

  /**
   * Update column visibility
   */
  setColumnVisibility(tableId: string, columnId: string, isVisible: boolean): void {
    const configs = new Map(this.configs());
    const config = configs.get(tableId) || this.createDefaultConfig();
    config.columnVisibility.set(columnId, isVisible);
    configs.set(tableId, config);
    this.configs.set(configs);
  }

  /**
   * Get column visibility
   */
  getColumnVisibility(tableId: string, columnId: string): boolean {
    const config = this.getConfig(tableId);
    return config.columnVisibility.get(columnId) ?? true;
  }

  /**
   * Update column order
   */
  setColumnOrder(tableId: string, columnIds: string[]): void {
    const configs = new Map(this.configs());
    const config = configs.get(tableId) || this.createDefaultConfig();
    columnIds.forEach((id, index) => {
      config.columnOrder.set(id, index);
    });
    configs.set(tableId, config);
    this.configs.set(configs);
  }

  /**
   * Get column order
   */
  getColumnOrder(tableId: string, columnId: string): number {
    const config = this.getConfig(tableId);
    return config.columnOrder.get(columnId) ?? 0;
  }

  /**
   * Apply view settings to config
   */
  applyViewSettings(tableId: string, view: TableView): void {
    if (!view.columnSettings) {
      return;
    }

    const configs = new Map(this.configs());
    const config = configs.get(tableId) || this.createDefaultConfig();

    view.columnSettings.forEach(setting => {
      if (setting.width !== undefined) {
        config.columnWidths.set(setting.columnId, setting.width);
      }
      config.columnVisibility.set(setting.columnId, setting.isVisible);
      config.columnOrder.set(setting.columnId, setting.order);
    });

    configs.set(tableId, config);
    this.configs.set(configs);
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): TableConfig {
    return {
      columnWidths: new Map(),
      columnVisibility: new Map(),
      columnOrder: new Map(),
      filters: [],
      sortColumns: [],
      pageSize: 25,
      currentPage: 0
    };
  }

  /**
   * Reset configuration for a table
   */
  resetConfig(tableId: string): void {
    const configs = new Map(this.configs());
    configs.delete(tableId);
    this.configs.set(configs);
  }
}

