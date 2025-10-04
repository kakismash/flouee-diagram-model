import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="notification-container">
      <div 
        *ngFor="let notification of notifications; trackBy: trackByNotificationId"
        class="notification"
        [class]="'notification-' + notification.type">
        
        <div class="notification-content">
          <div class="notification-icon">
            <mat-icon *ngIf="notification.type === 'success'">check_circle</mat-icon>
            <mat-icon *ngIf="notification.type === 'error'">error_outline</mat-icon>
            <mat-icon *ngIf="notification.type === 'warning'">warning</mat-icon>
            <mat-icon *ngIf="notification.type === 'info'">info</mat-icon>
          </div>
          
          <div class="notification-message" *ngIf="notification.message">
            {{ notification.message }}
          </div>
          
          <button 
            mat-icon-button 
            class="notification-close"
            (click)="removeNotification(notification.id)"
            [attr.aria-label]="'Close notification'">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <div class="notification-progress" *ngIf="notification.duration && notification.duration > 0">
          <div class="progress-bar" [style.animation-duration]="notification.duration + 'ms'"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      pointer-events: none;
    }
    
    .notification {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      pointer-events: auto;
      transform: translateX(100%);
      animation: slideIn 0.3s ease-out forwards;
    }
    
    .notification-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }
    
    .notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .notification-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .notification-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
    }
    
    .notification-close {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .notification-close mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }
    
    .notification-progress {
      height: 3px;
      background: rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background: currentColor;
      animation: progressBar linear forwards;
    }
    
    /* Success notification */
    .notification-success {
      border-left: 4px solid #4caf50;
    }
    
    .notification-success .notification-icon mat-icon {
      color: #4caf50;
    }
    
    .notification-success .progress-bar {
      background: #4caf50;
    }
    
    /* Error notification */
    .notification-error {
      border-left: 4px solid #d32f2f;
      background: #ffebee;
      border: 1px solid #ffcdd2;
    }
    
    .notification-error .notification-icon mat-icon {
      color: #d32f2f;
    }
    
    .notification-error .notification-message {
      color: #c62828;
      font-weight: 600;
    }
    
    .notification-error .progress-bar {
      background: #d32f2f;
    }
    
    .notification-error .notification-close mat-icon {
      color: #d32f2f;
    }
    
    /* Warning notification */
    .notification-warning {
      border-left: 4px solid #ff9800;
    }
    
    .notification-warning .notification-icon mat-icon {
      color: #ff9800;
    }
    
    .notification-warning .progress-bar {
      background: #ff9800;
    }
    
    /* Info notification */
    .notification-info {
      border-left: 4px solid #2196f3;
    }
    
    .notification-info .notification-icon mat-icon {
      color: #2196f3;
    }
    
    .notification-info .progress-bar {
      background: #2196f3;
    }
    
    /* Animations */
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes progressBar {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
    
    /* Responsive */
    @media (max-width: 480px) {
      .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `],
  animations: []
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {
    // Use effect to react to signal changes
    effect(() => {
      this.notifications = this.notificationService.getNotifications()();
    });
  }

  ngOnInit(): void {
    // Initial load
    this.notifications = this.notificationService.getNotifications()();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }
}
