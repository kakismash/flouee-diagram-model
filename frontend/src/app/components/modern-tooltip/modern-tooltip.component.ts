import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface TooltipData {
  title: string;
  description?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
  properties?: { [key: string]: any };
}

@Component({
  selector: 'app-modern-tooltip',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="tooltip-trigger" 
         #trigger
         (mouseenter)="onMouseEnter()"
         (mouseleave)="onMouseLeave()">
      <ng-content></ng-content>
    </div>
    
    <div class="tooltip-overlay" 
         *ngIf="isVisible"
         [class]="'tooltip-' + (data?.type || 'info')"
         [style.left.px]="tooltipPosition.x"
         [style.top.px]="tooltipPosition.y"
         [@tooltipAnimation]>
      
      <div class="tooltip-header">
        <div class="tooltip-icon" *ngIf="data?.icon">
          <mat-icon>{{ data?.icon }}</mat-icon>
        </div>
        <div class="tooltip-title">{{ data?.title }}</div>
        <button mat-icon-button 
                class="tooltip-close"
                (click)="hideTooltipManually()"
                *ngIf="closable">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="tooltip-content" *ngIf="data?.description">
        <p>{{ data?.description }}</p>
      </div>
      
      <div class="tooltip-properties" *ngIf="data?.properties">
        <div class="property-item" 
             *ngFor="let property of getPropertyEntries()">
          <span class="property-label">{{ property.key }}:</span>
          <span class="property-value">{{ property.value }}</span>
        </div>
      </div>
      
      <div class="tooltip-arrow"></div>
    </div>
  `,
  styles: [`
    .tooltip-trigger {
      display: inline-block;
      position: relative;
    }
    
    .tooltip-overlay {
      position: fixed;
      z-index: 10000;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      border: 1px solid #e0e0e0;
      min-width: 250px;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(10px);
    }
    
    .tooltip-header {
      display: flex;
      align-items: center;
      padding: 12px 16px 8px 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .tooltip-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      margin-right: 8px;
    }
    
    .tooltip-info .tooltip-icon {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
    }
    
    .tooltip-warning .tooltip-icon {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: white;
    }
    
    .tooltip-error .tooltip-icon {
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      color: white;
    }
    
    .tooltip-success .tooltip-icon {
      background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
      color: white;
    }
    
    .tooltip-icon mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .tooltip-title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
    }
    
    .tooltip-close {
      width: 24px;
      height: 24px;
      line-height: 24px;
    }
    
    .tooltip-close mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #6c757d;
    }
    
    .tooltip-content {
      padding: 8px 16px 12px 16px;
    }
    
    .tooltip-content p {
      margin: 0;
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }
    
    .tooltip-properties {
      padding: 8px 16px 12px 16px;
      border-top: 1px solid #f0f0f0;
    }
    
    .property-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;
    }
    
    .property-label {
      font-weight: 500;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .property-value {
      font-weight: 600;
      color: #2c3e50;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    
    .tooltip-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    }
    
    .tooltip-arrow::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    }
    
    /* Arrow positioning */
    .tooltip-overlay[data-position="top"] .tooltip-arrow {
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: #e0e0e0;
    }
    
    .tooltip-overlay[data-position="top"] .tooltip-arrow::before {
      bottom: 1px;
      left: -6px;
      border-top-color: #ffffff;
    }
    
    .tooltip-overlay[data-position="bottom"] .tooltip-arrow {
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: #e0e0e0;
    }
    
    .tooltip-overlay[data-position="bottom"] .tooltip-arrow::before {
      top: 1px;
      left: -6px;
      border-bottom-color: #ffffff;
    }
    
    .tooltip-overlay[data-position="left"] .tooltip-arrow {
      right: -12px;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: #e0e0e0;
    }
    
    .tooltip-overlay[data-position="left"] .tooltip-arrow::before {
      right: 1px;
      top: -6px;
      border-left-color: #ffffff;
    }
    
    .tooltip-overlay[data-position="right"] .tooltip-arrow {
      left: -12px;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: #e0e0e0;
    }
    
    .tooltip-overlay[data-position="right"] .tooltip-arrow::before {
      left: 1px;
      top: -6px;
      border-right-color: #ffffff;
    }
  `],
  animations: [
    trigger('tooltipAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.8) translateY(-10px)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'scale(1) translateY(0)'
      })),
      transition('void => *', animate('200ms ease-out')),
      transition('* => void', animate('150ms ease-in'))
    ])
  ]
})
export class ModernTooltipComponent implements AfterViewInit, OnDestroy {
  @Input() data: TooltipData | null = null;
  @Input() delay: number = 1000; // 1 second delay
  @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @Input() closable: boolean = false;
  @Input() disabled: boolean = false;
  
  @Output() show = new EventEmitter<void>();
  @Output() hide = new EventEmitter<void>();
  
  @ViewChild('trigger', { static: true }) trigger!: ElementRef;
  
  isVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  private showTimeout: any;
  private hideTimeout: any;
  
  ngAfterViewInit() {
    // Component initialization
  }
  
  ngOnDestroy() {
    this.clearTimeouts();
  }
  
  onMouseEnter() {
    if (this.disabled || !this.data) return;
    
    this.clearTimeouts();
    this.showTimeout = setTimeout(() => {
      this.showTooltip();
    }, this.delay);
  }
  
  onMouseLeave() {
    this.clearTimeouts();
    this.hideTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 100); // Small delay to prevent flickering
  }
  
  private showTooltip() {
    if (this.isVisible) return;
    
    this.calculatePosition();
    this.isVisible = true;
    this.show.emit();
  }
  
  private hideTooltip() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.hide.emit();
  }
  
  private calculatePosition() {
    const triggerRect = this.trigger.nativeElement.getBoundingClientRect();
    const tooltipWidth = 280; // Approximate tooltip width
    const tooltipHeight = 120; // Approximate tooltip height
    const margin = 15;
    
    let x = 0;
    let y = 0;
    
    switch (this.position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        y = triggerRect.top - tooltipHeight - margin;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        y = triggerRect.bottom + margin;
        break;
      case 'left':
        x = triggerRect.left - tooltipWidth - margin;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        break;
      case 'right':
        x = triggerRect.right + margin;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        break;
    }
    
    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position
    if (x < margin) x = margin;
    if (x + tooltipWidth > viewportWidth - margin) {
      x = viewportWidth - tooltipWidth - margin;
    }
    
    // Adjust vertical position
    if (y < margin) y = margin;
    if (y + tooltipHeight > viewportHeight - margin) {
      y = viewportHeight - tooltipHeight - margin;
    }
    
    this.tooltipPosition = { x, y };
  }
  
  private clearTimeouts() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
  
  public showTooltipManually() {
    this.showTooltip();
  }
  
  public hideTooltipManually() {
    this.hideTooltip();
  }
  
  getPropertyEntries(): { key: string; value: any }[] {
    if (!this.data?.properties) return [];
    return Object.entries(this.data.properties).map(([key, value]) => ({ key, value }));
  }
}
