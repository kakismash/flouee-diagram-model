import { Injectable, HostListener, inject } from '@angular/core';
import { TableEditService } from './table-edit.service';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableKeyboardService {
  private tableEditService = inject(TableEditService);
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled = true;

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean): void {
    const shortcutKey = this.buildShortcutKey(key, ctrl, shift, alt);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Enable/disable keyboard shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Handle keyboard events
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) {
      return;
    }

    // Don't handle shortcuts when user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const shortcutKey = this.buildShortcutKey(
      event.key,
      event.ctrlKey || event.metaKey, // Support both Ctrl and Cmd
      event.shiftKey,
      event.altKey
    );

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }

  /**
   * Build shortcut key string
   */
  private buildShortcutKey(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean): string {
    const parts: string[] = [];
    if (ctrl) parts.push('ctrl');
    if (shift) parts.push('shift');
    if (alt) parts.push('alt');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Get shortcut key from shortcut object
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return this.buildShortcutKey(
      shortcut.key,
      shortcut.ctrl,
      shortcut.shift,
      shortcut.alt
    );
  }

  /**
   * Get all registered shortcuts (for help/display)
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }
}

