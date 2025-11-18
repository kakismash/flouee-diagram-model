import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="search-container">
      <div class="search-wrapper" [class.focused]="isFocused">
        <mat-icon class="search-icon">search</mat-icon>
        <input
               [value]="searchValue()"
               (input)="onSearchInput($event)"
               (focus)="isFocused = true"
               (blur)="isFocused = false"
               placeholder="Search records..."
               class="search-input"
               type="text">
        @if (searchValue()) {
          <button mat-icon-button
                  (click)="clearSearch()"
                  class="clear-button"
                  type="button">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      display: flex;
      align-items: center;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 360px;
      min-width: 280px;
      max-width: 100%;
      height: 40px;
      background-color: rgba(0, 0, 0, 0.04);
      border: 1.5px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      padding: 0 14px;
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
      gap: 12px;
      touch-action: manipulation;
    }

    .search-wrapper:hover {
      background-color: rgba(0, 0, 0, 0.06);
      border-color: rgba(0, 0, 0, 0.2);
    }

    .search-wrapper.focused {
      background-color: var(--theme-surface);
      border-color: var(--theme-primary);
      border-width: 2px;
      box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.08);
    }

    .search-icon {
      color: var(--theme-text-secondary);
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      opacity: 0.7;
    }

    .search-wrapper.focused .search-icon {
      color: var(--theme-primary);
      opacity: 1;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      color: var(--theme-text-primary);
      padding: 0;
      height: 100%;
      font-weight: 400;
      line-height: 1.5;
    }

    .search-input::placeholder {
      color: var(--theme-text-secondary);
      opacity: 0.6;
      font-weight: 400;
    }

    .clear-button {
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      line-height: 36px;
      flex-shrink: 0;
      opacity: 0.6;
      transition: all 150ms ease-out;
      border-radius: 6px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .clear-button:active {
      opacity: 1;
      transform: scale(0.9);
    }

    .clear-button:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.08);
    }

    .clear-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--theme-text-secondary);
    }

    /* Ensure Material touch targets are properly sized */
    .clear-button ::ng-deep .mat-mdc-button-touch-target {
      width: 36px !important;
      height: 36px !important;
    }

    .clear-button:hover mat-icon {
      color: var(--theme-text-primary);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .search-wrapper {
        width: 100%;
        min-width: 200px;
        height: 44px;
      }

      .search-input {
        font-size: 16px; /* Prevents zoom on iOS */
      }
    }

    @media (max-width: 480px) {
      .search-wrapper {
        width: 100%;
        min-width: 0;
        height: 40px;
        padding: 0 12px;
        gap: 10px;
      }

      .search-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .search-input {
        font-size: 16px;
      }
    }

    /* Touch device optimizations */
    @media (hover: none) and (pointer: coarse) {
      .search-wrapper {
        height: 44px;
      }

      .clear-button {
        width: 32px;
        height: 32px;
        min-width: 32px;
        min-height: 32px;
      }
    }
  `]
})
export class TableSearchComponent {
  searchValue = signal<string>('');
  isFocused = false;

  @Output() searchChanged = new EventEmitter<string>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
    this.searchChanged.emit(value);
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.searchChanged.emit('');
    // Keep focus after clearing
    const input = document.querySelector('.search-input') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }
}
