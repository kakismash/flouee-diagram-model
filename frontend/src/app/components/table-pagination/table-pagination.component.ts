import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule
  ],
  template: `
    <div class="table-paginator">
      <div class="paginator-info">
        <span class="record-count">Showing {{ getStartRecord() }}-{{ getEndRecord() }} of {{ totalRecords }}</span>
      </div>
      
      <div class="paginator-controls">
        <button mat-icon-button
                [disabled]="currentPage === 0"
                (click)="goToFirstPage()"
                matTooltip="First page"
                class="paginator-btn">
          <mat-icon>first_page</mat-icon>
        </button>
        
        <button mat-icon-button
                [disabled]="currentPage === 0"
                (click)="goToPreviousPage()"
                matTooltip="Previous page"
                class="paginator-btn">
          <mat-icon>chevron_left</mat-icon>
        </button>
        
        <div class="page-info">
          <span>Page {{ currentPage + 1 }} of {{ getTotalPages() }}</span>
        </div>
        
        <button mat-icon-button
                [disabled]="currentPage >= getTotalPages() - 1"
                (click)="goToNextPage()"
                matTooltip="Next page"
                class="paginator-btn">
          <mat-icon>chevron_right</mat-icon>
        </button>
        
        <button mat-icon-button
                [disabled]="currentPage >= getTotalPages() - 1"
                (click)="goToLastPage()"
                matTooltip="Last page"
                class="paginator-btn">
          <mat-icon>last_page</mat-icon>
        </button>
        
        <mat-form-field appearance="outline" class="page-size-select">
          <mat-select [value]="pageSize" (selectionChange)="onPageSizeChange($event.value)">
            <mat-option [value]="10">10</mat-option>
            <mat-option [value]="25">25</mat-option>
            <mat-option [value]="50">50</mat-option>
            <mat-option [value]="100">100</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [`
    .table-paginator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: var(--theme-surface);
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      min-height: 56px;
    }

    .paginator-info {
      display: flex;
      align-items: center;
      color: var(--theme-text-secondary);
      font-size: 13px;
    }

    .record-count {
      font-weight: 500;
    }

    .paginator-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .paginator-btn {
      width: 32px;
      height: 32px;
      line-height: 32px;
      color: var(--theme-text-secondary);
      transition: all 150ms ease-out;
    }

    .paginator-btn:hover:not(:disabled) {
      background-color: rgba(0, 0, 0, 0.04);
      color: var(--theme-text-primary);
    }

    .paginator-btn:disabled {
      opacity: 0.4;
    }

    .paginator-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .page-info {
      padding: 0 12px;
      font-size: 13px;
      color: var(--theme-text-secondary);
      font-weight: 500;
    }

    .page-size-select {
      width: 70px;
      margin: 0;
    }

    .page-size-select ::ng-deep .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .page-size-select ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: var(--theme-surface-variant);
    }
  `]
})
export class TablePaginationComponent implements OnChanges {
  @Input() totalRecords = 0;
  @Input() pageSize = 25;
  @Input() currentPage = 0;
  @Input() data: any[] = [];

  @Output() pageChanged = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() paginatedDataChanged = new EventEmitter<any[]>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['pageSize'] || changes['currentPage']) {
      this.updatePagination();
    }
  }

  getStartRecord(): number {
    if (this.totalRecords === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = (this.currentPage + 1) * this.pageSize;
    return Math.min(end, this.totalRecords);
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  goToFirstPage(): void {
    if (this.currentPage > 0) {
      this.currentPage = 0;
      this.emitPageChange();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.emitPageChange();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.getTotalPages() - 1) {
      this.currentPage++;
      this.emitPageChange();
    }
  }

  goToLastPage(): void {
    const lastPage = this.getTotalPages() - 1;
    if (this.currentPage < lastPage) {
      this.currentPage = lastPage;
      this.emitPageChange();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 0;
    this.emitPageChange();
  }

  private emitPageChange(): void {
    this.pageChanged.emit({ pageIndex: this.currentPage, pageSize: this.pageSize });
    this.updatePagination();
  }

  private updatePagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const paginatedData = this.data.slice(startIndex, endIndex);
    this.paginatedDataChanged.emit(paginatedData);
  }
}



