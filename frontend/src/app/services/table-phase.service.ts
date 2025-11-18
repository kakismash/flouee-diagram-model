import { Injectable, signal, computed } from '@angular/core';
import { Table, Phase } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class TablePhaseService {
  private defaultPhases: Phase[] = [
    { id: 'phase-1', name: 'Not Started', color: '#E0E0E0', order: 0 },
    { id: 'phase-2', name: 'In Progress', color: '#2196F3', order: 1 },
    { id: 'phase-3', name: 'Done', color: '#4CAF50', order: 2 },
    { id: 'phase-4', name: 'Blocked', color: '#F44336', order: 3 }
  ];

  /**
   * Get phases for a table, or return default phases if none exist
   */
  getPhases(table: Table): Phase[] {
    return table.phases && table.phases.length > 0 
      ? [...table.phases].sort((a, b) => a.order - b.order)
      : this.defaultPhases;
  }

  /**
   * Get a phase by ID
   */
  getPhaseById(table: Table, phaseId: string): Phase | undefined {
    const phases = this.getPhases(table);
    return phases.find(p => p.id === phaseId);
  }

  /**
   * Create a new phase
   */
  createPhase(name: string, color: string, table: Table): Phase {
    const phases = this.getPhases(table);
    const maxOrder = phases.length > 0 
      ? Math.max(...phases.map(p => p.order)) 
      : -1;
    
    return {
      id: `phase-${Date.now()}`,
      name,
      color,
      order: maxOrder + 1
    };
  }

  /**
   * Update a phase
   */
  updatePhase(table: Table, phaseId: string, updates: Partial<Phase>): Phase | null {
    if (!table.phases) {
      return null;
    }

    const phaseIndex = table.phases.findIndex(p => p.id === phaseId);
    if (phaseIndex === -1) {
      return null;
    }

    table.phases[phaseIndex] = {
      ...table.phases[phaseIndex],
      ...updates
    };

    return table.phases[phaseIndex];
  }

  /**
   * Delete a phase
   */
  deletePhase(table: Table, phaseId: string): boolean {
    if (!table.phases) {
      return false;
    }

    const index = table.phases.findIndex(p => p.id === phaseId);
    if (index === -1) {
      return false;
    }

    table.phases.splice(index, 1);
    return true;
  }

  /**
   * Reorder phases
   */
  reorderPhases(table: Table, phaseIds: string[]): void {
    if (!table.phases) {
      return;
    }

    // Reorder phases based on the provided order
    const phaseMap = new Map(table.phases.map(p => [p.id, p]));
    table.phases = phaseIds
      .map(id => phaseMap.get(id))
      .filter((p): p is Phase => p !== undefined)
      .map((p, index) => ({ ...p, order: index }));
  }
}

