export interface TableView {
  id: string;
  name: string;
  description?: string;
  tableId: string;
  isDefault: boolean;
  columnSettings: ColumnViewSetting[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ColumnViewSetting {
  columnId: string;
  columnName: string;
  isVisible: boolean;
  order: number;
  width?: number;
}

export interface ViewConfig {
  views: TableView[];
  activeViewId?: string;
}
