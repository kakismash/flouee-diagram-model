import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CanvasGridService {
  // Transform state
  scale = signal(1);
  offsetX = signal(0);
  offsetY = signal(0);
  
  // Grid configuration
  gridSize = 20;

  constructor() { }

  initializeCanvas(canvas: HTMLCanvasElement) {
    // Canvas initialization is no longer needed, but keeping for compatibility
    this.updateCanvasSize();
  }

  updateCanvasSize() {
    // Canvas size update is no longer needed, but keeping for compatibility
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
    return {
      x: (screenX - this.offsetX()) / this.scale(),
      y: (screenY - this.offsetY()) / this.scale()
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
    return {
      x: worldX * this.scale() + this.offsetX(),
      y: worldY * this.scale() + this.offsetY()
    };
  }

  // Snap coordinates to grid
  snapToGrid(worldX: number, worldY: number): { x: number, y: number } {
    return {
      x: Math.round(worldX / this.gridSize) * this.gridSize,
      y: Math.round(worldY / this.gridSize) * this.gridSize
    };
  }

  // Zoom functionality
  zoom(zoomAmount: number, centerX?: number, centerY?: number) {
    const oldScale = this.scale();
    const newScale = Math.max(0.4, Math.min(5, oldScale * zoomAmount)); // Min zoom changed to 0.4
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom around the center point
      const worldX = (centerX - this.offsetX()) / oldScale;
      const worldY = (centerY - this.offsetY()) / oldScale;
      
      this.offsetX.update(offset => centerX - worldX * newScale);
      this.offsetY.update(offset => centerY - worldY * newScale);
    }
    
    this.scale.set(newScale);
  }

  // Pan functionality
  pan(deltaX: number, deltaY: number) {
    this.offsetX.update(offset => offset + deltaX);
    this.offsetY.update(offset => offset + deltaY);
  }


  // Get current transform values for HTML overlay
  getTransform(): { scale: number, offsetX: number, offsetY: number } {
    return {
      scale: this.scale(),
      offsetX: this.offsetX(),
      offsetY: this.offsetY()
    };
  }

  // Get CSS transform string for HTML overlay
  getCSSTransform(): string {
    return `translate(${this.offsetX()}px, ${this.offsetY()}px) scale(${this.scale()})`;
  }

  // Get current scale for external components
  getScale(): number {
    return this.scale();
  }
}
