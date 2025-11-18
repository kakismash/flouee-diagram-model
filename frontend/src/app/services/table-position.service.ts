import { Injectable } from '@angular/core';
import { Table } from '../models/table.model';
import { CanvasGridService } from './canvas-grid.service';

/**
 * Service to manage table positioning and grid snapping
 * Extracted from diagram-editor.component.ts for reusability
 */
@Injectable({
  providedIn: 'root'
})
export class TablePositionService {
  constructor(private canvasGrid: CanvasGridService) {}

  /**
   * Convert screen coordinates to world coordinates and snap to grid
   */
  screenToWorldAndSnap(screenX: number, screenY: number): { x: number, y: number } {
    const worldPos = this.canvasGrid.screenToWorld(screenX, screenY);
    return this.canvasGrid.snapToGrid(worldPos.x, worldPos.y);
  }

  /**
   * Snap table position to grid
   */
  snapTablePosition(table: Table, position: { x: number, y: number }): { x: number, y: number } {
    return this.canvasGrid.snapToGrid(position.x, position.y);
  }

  /**
   * Get center of current view in world coordinates
   */
  getViewCenter(): { x: number, y: number } {
    // Default center point (can be adjusted based on viewport)
    const centerX = 400;
    const centerY = 300;
    return this.canvasGrid.screenToWorld(centerX, centerY);
  }

  /**
   * Get view center snapped to grid
   */
  getViewCenterSnapped(): { x: number, y: number } {
    const center = this.getViewCenter();
    return this.canvasGrid.snapToGrid(center.x, center.y);
  }
}

