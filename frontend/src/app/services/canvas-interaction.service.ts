import { Injectable, signal } from '@angular/core';

/**
 * Service to handle canvas interaction events (drag, zoom, pan, touch)
 * Extracted from diagram-editor.component.ts for reusability
 */
@Injectable({
  providedIn: 'root'
})
export class CanvasInteractionService {
  private isDragging = signal(false);
  private dragStart = signal({ x: 0, y: 0 });
  private lastTouchDistance = signal(0);
  private lastTouchCenter = signal({ x: 0, y: 0 });

  // Public signals
  readonly isDragging$ = this.isDragging.asReadonly();

  /**
   * Handle mouse down event for canvas dragging
   */
  onMouseDown(event: MouseEvent, canvasElement: HTMLElement): boolean {
    if (event.button === 0) { // Left click
      this.isDragging.set(true);
      this.dragStart.set({ x: event.clientX, y: event.clientY });
      canvasElement.style.cursor = 'grabbing';
      event.preventDefault();
      return true;
    }
    return false;
  }

  /**
   * Handle mouse move event for canvas panning
   */
  onMouseMove(
    event: MouseEvent,
    panCallback: (deltaX: number, deltaY: number) => void
  ): void {
    if (this.isDragging()) {
      const currentDragStart = this.dragStart();
      const deltaX = event.clientX - currentDragStart.x;
      const deltaY = event.clientY - currentDragStart.y;
      
      panCallback(deltaX, deltaY);
      
      this.dragStart.set({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(canvasElement: HTMLElement): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      canvasElement.style.cursor = 'grab';
    }
  }

  /**
   * Handle wheel event for zooming
   */
  onWheel(
    event: WheelEvent,
    zoomCallback: (zoomAmount: number, centerX: number, centerY: number) => void
  ): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    zoomCallback(delta, event.offsetX, event.offsetY);
  }

  /**
   * Handle touch start for pinch-to-zoom
   */
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length >= 2) {
      const touch0 = event.touches[0];
      const touch1 = event.touches[1];
      
      this.lastTouchDistance.set(this.getDistance(touch0, touch1));
      this.lastTouchCenter.set(this.getCenter(touch0, touch1));
    }
  }

  /**
   * Handle touch move for pinch-to-zoom and pan
   */
  onTouchMove(
    event: TouchEvent,
    zoomCallback: (zoomAmount: number, centerX: number, centerY: number) => void,
    panCallback: (deltaX: number, deltaY: number) => void
  ): void {
    event.preventDefault();
    
    if (event.touches.length >= 2) {
      const touch0 = event.touches[0];
      const touch1 = event.touches[1];
      
      const currentDistance = this.getDistance(touch0, touch1);
      const currentCenter = this.getCenter(touch0, touch1);
      
      const lastDistance = this.lastTouchDistance();
      if (lastDistance > 0) {
        const zoomAmount = currentDistance / lastDistance;
        zoomCallback(zoomAmount, currentCenter.x, currentCenter.y);
      }
      
      const lastCenter = this.lastTouchCenter();
      const deltaX = currentCenter.x - lastCenter.x;
      const deltaY = currentCenter.y - lastCenter.y;
      panCallback(deltaX, deltaY);
      
      this.lastTouchDistance.set(currentDistance);
      this.lastTouchCenter.set(currentCenter);
    }
  }

  /**
   * Calculate distance between two touch points
   */
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate center point between two touch points
   */
  private getCenter(touch1: Touch, touch2: Touch): { x: number, y: number } {
    return {
      x: (touch1.pageX + touch2.pageX) / 2,
      y: (touch1.pageY + touch2.pageY) / 2
    };
  }
}

