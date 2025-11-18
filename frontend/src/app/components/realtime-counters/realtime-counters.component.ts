import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RealtimeCountersService, OrganizationCounters, CounterUpdate } from '../../services/realtime-counters.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-realtime-counters',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="counters-card" *ngIf="organizationCounters">
      <mat-card-header>
        <mat-icon mat-card-avatar>dashboard</mat-icon>
        <mat-card-title>Organization Usage</mat-card-title>
        <mat-card-subtitle>{{ organizationCounters.name }} ({{ organizationCounters.subscription_tier.toUpperCase() }})</mat-card-subtitle>
        
        <!-- Live indicator -->
        <div class="live-indicator" matTooltip="Live updates enabled">
          <div class="pulse-dot"></div>
          <span>LIVE</span>
        </div>
      </mat-card-header>

      <mat-card-content>
        <div class="counters-grid">
          <!-- Users Counter -->
          <div class="counter-item">
            <div class="counter-header">
              <mat-icon>people</mat-icon>
              <span>Users</span>
            </div>
            <div class="counter-value">
              <span class="current">{{ organizationCounters.current_users }}</span>
              <span class="separator">/</span>
              <span class="max">{{ organizationCounters.max_users }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" 
                   [style.width.%]="getProgressPercentage('users')"
                   [class.warning]="getProgressPercentage('users') > 80"
                   [class.danger]="getProgressPercentage('users') > 95">
              </div>
            </div>
            <div class="counter-status">
              <mat-chip 
                [class]="getStatusClass('users')"
                [matTooltip]="getStatusTooltip('users')">
                {{ getStatusText('users') }}
              </mat-chip>
            </div>
          </div>

          <!-- Projects Counter -->
          <div class="counter-item">
            <div class="counter-header">
              <mat-icon>folder</mat-icon>
              <span>Projects</span>
            </div>
            <div class="counter-value">
              <span class="current">{{ organizationCounters.current_projects }}</span>
              <span class="separator">/</span>
              <span class="max">{{ organizationCounters.max_projects }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" 
                   [style.width.%]="getProgressPercentage('projects')"
                   [class.warning]="getProgressPercentage('projects') > 80"
                   [class.danger]="getProgressPercentage('projects') > 95">
              </div>
            </div>
            <div class="counter-status">
              <mat-chip 
                [class]="getStatusClass('projects')"
                [matTooltip]="getStatusTooltip('projects')">
                {{ getStatusText('projects') }}
              </mat-chip>
            </div>
          </div>
        </div>

        <!-- Recent Updates -->
        <div class="recent-updates" *ngIf="recentUpdates.length > 0">
          <h4>Recent Updates</h4>
          <div class="update-list">
            <div *ngFor="let update of recentUpdates" class="update-item">
              <mat-icon>{{ update.counter_type === 'users' ? 'people' : 'folder' }}</mat-icon>
              <span class="update-text">
                {{ update.counter_type === 'users' ? 'Users' : 'Projects' }}: 
                {{ update.old_value }} → {{ update.new_value }}
              </span>
              <span class="update-time">{{ formatTime(update.timestamp) }}</span>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .counters-card {
      margin: 16px;
      max-width: 600px;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      color: #4caf50;
      font-size: 12px;
      font-weight: 500;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #4caf50;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .counters-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 16px 0;
    }

    .counter-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .counter-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #666;
    }

    .counter-value {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 24px;
      font-weight: bold;
    }

    .current {
      color: #1976d2;
    }

    .separator {
      color: #999;
    }

    .max {
      color: #666;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background-color: #4caf50;
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    .progress-fill.warning {
      background-color: #ff9800;
    }

    .progress-fill.danger {
      background-color: #f44336;
    }

    .counter-status {
      display: flex;
      justify-content: center;
    }

    .recent-updates {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .recent-updates h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #666;
    }

    .update-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .update-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
    }

    .update-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .update-text {
      flex: 1;
    }

    .update-time {
      font-size: 11px;
      color: #999;
    }

    @media (max-width: 600px) {
      .counters-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RealtimeCountersComponent implements OnInit, OnDestroy {
  @Input() organizationId!: string;
  
  organizationCounters: OrganizationCounters | null = null;
  recentUpdates: CounterUpdate[] = [];
  private destroy$ = new Subject<void>();

  constructor(private realtimeCountersService: RealtimeCountersService) {}

  ngOnInit(): void {
    if (!this.organizationId) {
      console.error('Organization ID is required');
      return;
    }

    // Subscribe to organization counters
    this.realtimeCountersService.getOrganizationCounters(this.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(counters => {
        this.organizationCounters = counters;
      });

    // Subscribe to counter updates
    this.realtimeCountersService.getCounterUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        if (update.organization_id === this.organizationId) {
          this.addRecentUpdate(update);
        }
      });

    // Start real-time subscription
    this.realtimeCountersService.subscribeToOrganization(this.organizationId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.realtimeCountersService.unsubscribeFromOrganization(this.organizationId);
  }

  getProgressPercentage(type: 'users' | 'projects'): number {
    if (!this.organizationCounters) return 0;
    
    const current = type === 'users' 
      ? this.organizationCounters.current_users 
      : this.organizationCounters.current_projects;
    const max = type === 'users' 
      ? this.organizationCounters.max_users 
      : this.organizationCounters.max_projects;
    
    return Math.min(100, (current / max) * 100);
  }

  getStatusClass(type: 'users' | 'projects'): string {
    const percentage = this.getProgressPercentage(type);
    
    if (percentage >= 100) return 'mat-chip-danger';
    if (percentage >= 80) return 'mat-chip-warning';
    return 'mat-chip-success';
  }

  getStatusText(type: 'users' | 'projects'): string {
    const percentage = this.getProgressPercentage(type);
    
    if (percentage >= 100) return 'FULL';
    if (percentage >= 80) return 'NEAR LIMIT';
    return 'OK';
  }

  getStatusTooltip(type: 'users' | 'projects'): string {
    if (!this.organizationCounters) return '';
    
    const current = type === 'users' 
      ? this.organizationCounters.current_users 
      : this.organizationCounters.current_projects;
    const max = type === 'users' 
      ? this.organizationCounters.max_users 
      : this.organizationCounters.max_projects;
    
    return `${current} of ${max} ${type} used`;
  }

  addRecentUpdate(update: CounterUpdate): void {
    this.recentUpdates.unshift(update);
    
    // Keep only last 5 updates
    if (this.recentUpdates.length > 5) {
      this.recentUpdates = this.recentUpdates.slice(0, 5);
    }
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return date.toLocaleTimeString();
  }
}





