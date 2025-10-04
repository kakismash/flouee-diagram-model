import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
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
    this.notifications.update(notifications => [notification, ...notifications]);

    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  private generateId(): string {
    return `notification-${++this.notificationId}`;
  }
}
