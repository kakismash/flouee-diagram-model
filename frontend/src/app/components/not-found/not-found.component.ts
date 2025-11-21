import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BaseButtonComponent } from '../design-system/base-button/base-button.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    BaseButtonComponent
  ],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="not-found-icon">
          <mat-icon>error_outline</mat-icon>
        </div>
        
        <h1 class="not-found-title">404</h1>
        <h2 class="not-found-subtitle">Page Not Found</h2>
        
        <p class="not-found-description">
          Looks like you've followed a broken link or entered a URL that doesn't exist on this site.
        </p>
        
        <div class="not-found-actions">
          <ds-base-button
            label="Go to Dashboard"
            icon="home"
            [variant]="'primary'"
            [size]="'large'"
            (clicked)="goHome()">
          </ds-base-button>
          
          <ds-base-button
            label="Go Back"
            icon="arrow_back"
            [variant]="'secondary'"
            [size]="'large'"
            (clicked)="goBack()">
          </ds-base-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: var(--ds-spacing-lg, 24px);
      background: var(--theme-background);
      color: var(--theme-text-primary);
    }

    .not-found-content {
      text-align: center;
      max-width: 600px;
      width: 100%;
    }

    .not-found-icon {
      margin-bottom: var(--ds-spacing-lg, 24px);
    }

    .not-found-icon mat-icon {
      font-size: 120px;
      width: 120px;
      height: 120px;
      color: var(--theme-primary);
      opacity: 0.8;
    }

    .not-found-title {
      font-size: 72px;
      font-weight: 700;
      margin: 0;
      margin-bottom: var(--ds-spacing-xs, 8px);
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary, var(--theme-primary)));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .not-found-subtitle {
      font-size: 32px;
      font-weight: 600;
      margin: 0;
      margin-bottom: var(--ds-spacing-md, 16px);
      color: var(--theme-text-primary);
    }

    .not-found-description {
      font-size: 16px;
      line-height: 1.6;
      color: var(--theme-text-secondary);
      margin: 0;
      margin-bottom: var(--ds-spacing-xl, 32px);
    }

    .not-found-actions {
      display: flex;
      gap: var(--ds-spacing-md, 16px);
      justify-content: center;
      flex-wrap: wrap;
    }

    .not-found-actions ds-base-button {
      min-width: 180px;
    }


    @media (max-width: 768px) {
      .not-found-title {
        font-size: 56px;
      }

      .not-found-subtitle {
        font-size: 24px;
      }

      .not-found-actions {
        flex-direction: column;
      }

      .not-found-actions ds-base-button {
        width: 100%;
      }
    }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  goHome() {
    const isAuthenticated = this.authService.isAuthenticated();
    if (isAuthenticated) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  goBack() {
    window.history.back();
  }
}

