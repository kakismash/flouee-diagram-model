import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FloatingElementConfig {
  targetId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  align?: 'start' | 'center' | 'end';
  zIndex?: number;
  show?: boolean;
}

@Component({
  selector: 'app-floating-element',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="config().show" 
      #floatingElement
      class="floating-element"
      [style.z-index]="config().zIndex || 10000"
      [style.position]="'fixed'"
      [style.pointer-events]="'auto'">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .floating-element {
      transition: all 0.3s ease-out;
    }
  `]
})
export class FloatingElementComponent implements OnInit, OnDestroy {
  @Input() config = signal<FloatingElementConfig>({
    targetId: '',
    position: 'top',
    offset: 10,
    align: 'end',
    zIndex: 10000,
    show: false
  });

  @ViewChild('floatingElement', { static: false }) floatingElement!: ElementRef;

  private updatePosition = () => this.calculateAndSetPosition();

  constructor() {
    // Effect to update position when config changes
    effect(() => {
      if (this.config().show) {
        setTimeout(() => this.updatePosition(), 0);
      }
    });
  }

  ngOnInit() {
    // Add listeners for scroll and resize
    window.addEventListener('scroll', this.updatePosition, { passive: true });
    window.addEventListener('resize', this.updatePosition, { passive: true });
  }

  ngOnDestroy() {
    // Clean up listeners
    window.removeEventListener('scroll', this.updatePosition);
    window.removeEventListener('resize', this.updatePosition);
  }

  private calculateAndSetPosition(): void {
    if (!this.floatingElement || !this.config().show) {
      return;
    }

    const targetElement = document.getElementById(this.config().targetId);
    if (!targetElement) {
      console.warn(`FloatingElement: Target element with id "${this.config().targetId}" not found`);
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const floatingRect = this.floatingElement.nativeElement.getBoundingClientRect();
    const config = this.config();

    let top = 0;
    let left = 0;

    // Calculate position based on config
    switch (config.position) {
      case 'top':
        top = targetRect.top - floatingRect.height - (config.offset || 10);
        left = this.calculateHorizontalAlignment(targetRect, floatingRect, config.align);
        break;
      
      case 'bottom':
        top = targetRect.bottom + (config.offset || 10);
        left = this.calculateHorizontalAlignment(targetRect, floatingRect, config.align);
        break;
      
      case 'left':
        top = this.calculateVerticalAlignment(targetRect, floatingRect, config.align);
        left = targetRect.left - floatingRect.width - (config.offset || 10);
        break;
      
      case 'right':
        top = this.calculateVerticalAlignment(targetRect, floatingRect, config.align);
        left = targetRect.right + (config.offset || 10);
        break;
    }

    // Ensure element stays within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if it goes outside viewport
    if (left < 0) left = 10;
    if (left + floatingRect.width > viewportWidth) {
      left = viewportWidth - floatingRect.width - 10;
    }

    // Adjust vertical position if it goes outside viewport
    if (top < 0) top = 10;
    if (top + floatingRect.height > viewportHeight) {
      top = viewportHeight - floatingRect.height - 10;
    }

    // Apply the calculated position
    this.floatingElement.nativeElement.style.top = `${top}px`;
    this.floatingElement.nativeElement.style.left = `${left}px`;
  }

  private calculateHorizontalAlignment(targetRect: DOMRect, floatingRect: DOMRect, align?: string): number {
    switch (align) {
      case 'start':
        return targetRect.left;
      case 'center':
        return targetRect.left + (targetRect.width - floatingRect.width) / 2;
      case 'end':
      default:
        return targetRect.right - floatingRect.width;
    }
  }

  private calculateVerticalAlignment(targetRect: DOMRect, floatingRect: DOMRect, align?: string): number {
    switch (align) {
      case 'start':
        return targetRect.top;
      case 'center':
        return targetRect.top + (targetRect.height - floatingRect.height) / 2;
      case 'end':
      default:
        return targetRect.bottom - floatingRect.height;
    }
  }

  // Public method to manually update position
  public updatePositionNow(): void {
    this.updatePosition();
  }
}
