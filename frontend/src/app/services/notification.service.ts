import { Injectable, signal, inject, Injector, effect, untracked } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'loading';
  message?: string;
  duration?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = signal<Notification[]>([]);
  private notificationId = 0;
  private injector = inject(Injector);
  
  constructor() {
    // Effect to check and auto-remove expired notifications
    // Only runs when notifications change - no frequent polling needed
    effect(() => {
      const activeNotifications = this.notifications();
      const now = Date.now();
      
      // Find notifications that should be removed based on their duration
      const toRemove = activeNotifications.filter(n => {
        if (n.duration && n.duration > 0) {
          const elapsed = now - n.timestamp;
          return elapsed >= n.duration;
        }
        return false;
      });
      
      // Remove expired notifications
      if (toRemove.length > 0) {
        untracked(() => {
          this.notifications.update(notifications => 
            notifications.filter(n => !toRemove.some(tr => tr.id === n.id))
          );
        });
      }
    }, { injector: this.injector });
  }

  // Getters
  getNotifications() {
    return this.notifications.asReadonly();
  }

  // Show success notification (green checkmark)
  showSuccess(message?: string, duration: number = 1500): string {
    const notification: Notification = {
      id: this.generateId(),
      type: 'success',
      message,
      duration,
      timestamp: Date.now()
    };

    this.addNotification(notification);
    return notification.id;
  }

  // Show error notification (red error icon)
  showError(message: string, duration: number = 5000): string {
    const notification: Notification = {
      id: this.generateId(),
      type: 'error',
      message,
      duration,
      timestamp: Date.now()
    };

    this.addNotification(notification);
    return notification.id;
  }

  // Show info notification
  showInfo(message: string, duration: number = 3000): string {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      message,
      duration,
      timestamp: Date.now()
    };

    this.addNotification(notification);
    return notification.id;
  }

  // Show warning notification
  showWarning(message: string, duration: number = 4000): string {
    const notification: Notification = {
      id: this.generateId(),
      type: 'warning',
      message,
      duration,
      timestamp: Date.now()
    };

    this.addNotification(notification);
    return notification.id;
  }

  // Show loading notification (with spinner)
  showLoading(message: string = 'Applying changes...'): string {
    const notification: Notification = {
      id: this.generateId(),
      type: 'loading',
      message,
      duration: 0, // No auto-remove loading notifications
      timestamp: Date.now()
    };

    this.addNotification(notification);
    return notification.id;
  }

  // Update existing notification (e.g., from loading to success)
  updateNotification(id: string, updates: Partial<Notification>): void {
    this.notifications.update(notifications => 
      notifications.map(n => n.id === id ? { ...n, ...updates } : n)
    );
  }

  // Helper: Show loading, then update to success or error
  async showOperationStatus<T>(
    operation: () => Promise<T>,
    loadingMessage: string = 'Applying changes...',
    successMessage: string = 'Changes applied successfully'
  ): Promise<T> {
    const notificationId = this.showLoading(loadingMessage);
    
    try {
      const result = await operation();
      
      // Update to success
      this.updateNotification(notificationId, {
        type: 'success',
        message: successMessage,
        duration: 3000
      });
      
      // Duration is already set in the notification, effect will handle auto-remove
      
      return result;
    } catch (error: any) {
      // Update to error
      this.updateNotification(notificationId, {
        type: 'error',
        message: error.message || 'Error applying changes',
        duration: 5000
      });
      
      // Duration is already set in the notification, effect will handle auto-remove
      
      throw error;
    }
  }

  // Remove notification
  removeNotification(id: string): void {
    this.notifications.update(notifications => 
      notifications.filter(n => n.id !== id)
    );
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications.set([]);
  }

  private addNotification(notification: Notification): void {
    // Update notifications signal - effect will automatically check expiration
    this.notifications.update(notifications => [notification, ...notifications]);
  }

  private generateId(): string {
    return `notification-${++this.notificationId}`;
  }
}
