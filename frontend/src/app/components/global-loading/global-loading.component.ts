import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-global-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="global-loading-overlay" [class.hidden]="!isLoading">
      <div class="global-loading-container">
        
        <!-- Material Loading (Current) -->
        <div *ngIf="!useLottie" class="material-loading">
          <mat-spinner [diameter]="60" color="primary"></mat-spinner>
          <div class="loading-text">{{ loadingText }}</div>
          <div class="loading-subtitle" *ngIf="loadingSubtitle">{{ loadingSubtitle }}</div>
        </div>
        
        <!-- Lottie Loading (Future) -->
        <div *ngIf="useLottie" class="lottie-loading">
          <!-- TODO: Replace with Lottie component when implemented -->
          <div class="lottie-placeholder">
            <mat-icon class="lottie-icon">animation</mat-icon>
            <div class="loading-text">{{ loadingText }}</div>
            <div class="loading-subtitle" *ngIf="loadingSubtitle">{{ loadingSubtitle }}</div>
          </div>
        </div>
        
        <!-- Progress indicator -->
        <div class="progress-container" *ngIf="showProgress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress"></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    .global-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--theme-background, #ffffff);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    
    .global-loading-overlay.hidden {
      opacity: 0;
      visibility: hidden;
    }
    
    .global-loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 32px;
      text-align: center;
    }
    
    /* Material Loading Styles */
    .material-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    
    .loading-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--theme-text-primary, #333333);
      margin-top: 16px;
    }
    
    .loading-subtitle {
      font-size: 14px;
      color: var(--theme-text-secondary, #666666);
      margin-top: 8px;
    }
    
    /* Lottie Loading Styles (Future) */
    .lottie-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    
    .lottie-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    
    .lottie-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--theme-primary, #1976d2);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    /* Progress Bar */
    .progress-container {
      width: 200px;
      margin-top: 16px;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--theme-surface-variant, #e0e0e0);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: var(--theme-primary, #1976d2);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 12px;
      color: var(--theme-text-secondary, #666666);
      margin-top: 8px;
      text-align: center;
    }
    
    /* Dark theme support */
    .global-loading-overlay {
      background: var(--theme-background, #ffffff);
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .global-loading-container {
        padding: 16px;
        gap: 16px;
      }
      
      .loading-text {
        font-size: 16px;
      }
      
      .lottie-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
      
      .progress-container {
        width: 150px;
      }
    }
  `]
})
export class GlobalLoadingComponent implements OnInit, OnDestroy {
  @Input() isLoading: boolean = false;
  @Input() loadingText: string = 'Loading...';
  @Input() loadingSubtitle: string = '';
  @Input() useLottie: boolean = false; // Future: true when Lottie is implemented
  @Input() showProgress: boolean = false;
  @Input() progress: number = 0;
  
  // Animation timer for progress simulation
  private progressTimer?: number;
  
  ngOnInit() {
    // Simulate progress if showProgress is true but no progress value provided
    if (this.showProgress && this.progress === 0) {
      this.simulateProgress();
    }
  }
  
  ngOnDestroy() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
  }
  
  private simulateProgress() {
    let currentProgress = 0;
    this.progressTimer = window.setInterval(() => {
      currentProgress += Math.random() * 10;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
        }
      }
      this.progress = Math.min(currentProgress, 100);
    }, 200);
  }
}











