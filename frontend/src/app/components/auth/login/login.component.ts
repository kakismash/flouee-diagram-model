import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <mat-icon class="app-icon">account_tree</mat-icon>
          <h1>Flouee Diagram Model</h1>
          <p>Database Schema Designer</p>
        </div>

        <mat-tab-group class="auth-tabs" [(selectedIndex)]="selectedTab">
          <!-- Login Tab -->
          <mat-tab label="Sign In">
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="Enter your email">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput [type]="hideLoginPassword ? 'password' : 'text'" formControlName="password" placeholder="Enter your password">
                <button mat-icon-button matSuffix type="button" (click)="hideLoginPassword = !hideLoginPassword">
                  <mat-icon>{{hideLoginPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="loginForm.get('password')?.hasError('minlength')">
                  Password must be at least 6 characters
                </mat-error>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="full-width auth-button" 
                      [disabled]="loginForm.invalid || authService.isLoading()">
                <mat-spinner *ngIf="authService.isLoading()" diameter="20"></mat-spinner>
                <span *ngIf="!authService.isLoading()">Sign In</span>
              </button>
            </form>
          </mat-tab>

          <!-- Sign Up Tab -->
          <mat-tab label="Sign Up">
            <form [formGroup]="signupForm" (ngSubmit)="onSignup()" class="auth-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="Enter your email">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="signupForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="signupForm.get('email')?.hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput [type]="hideSignupPassword ? 'password' : 'text'" formControlName="password" placeholder="Enter your password">
                <button mat-icon-button matSuffix type="button" (click)="hideSignupPassword = !hideSignupPassword">
                  <mat-icon>{{hideSignupPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="signupForm.get('password')?.hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="signupForm.get('password')?.hasError('minlength')">
                  Password must be at least 6 characters
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm Password</mat-label>
                <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" formControlName="confirmPassword" placeholder="Confirm your password">
                <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                  <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="signupForm.get('confirmPassword')?.hasError('required')">
                  Please confirm your password
                </mat-error>
                <mat-error *ngIf="signupForm.get('confirmPassword')?.hasError('passwordMismatch')">
                  Passwords do not match
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Organization Name (Optional)</mat-label>
                <input matInput formControlName="organizationName" placeholder="Enter organization name">
                <mat-icon matSuffix>business</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="full-width auth-button" 
                      [disabled]="signupForm.invalid || authService.isLoading()">
                <mat-spinner *ngIf="authService.isLoading()" diameter="20"></mat-spinner>
                <span *ngIf="!authService.isLoading()">Sign Up</span>
              </button>
            </form>
          </mat-tab>
        </mat-tab-group>

        <!-- Error Display -->
        <div *ngIf="authService.error()" class="error-message">
          <mat-icon>error</mat-icon>
          <span>{{ authService.error() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 450px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .app-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
      margin-bottom: 16px;
    }

    .login-header h1 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .login-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .auth-tabs {
      margin-bottom: 24px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .auth-button {
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      margin-top: 8px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid #f44336;
      margin-top: 16px;
    }

    .error-message mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .login-container {
        padding: 16px;
      }
      
      .login-card {
        padding: 24px;
      }
      
      .login-header h1 {
        font-size: 24px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  signupForm: FormGroup;
  selectedTab = 0;
  hideLoginPassword = true;
  hideSignupPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      organizationName: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      if (confirmPassword?.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  async onLogin() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      const result = await this.authService.signIn(email, password);
      
      if (result.success) {
        this.snackBar.open('Welcome back!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/']);
      } else {
        this.snackBar.open(result.error || 'Login failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  async onSignup() {
    if (this.signupForm.valid) {
      const { email, password, organizationName } = this.signupForm.value;
      
      const result = await this.authService.signUp(email, password, organizationName);
      
      if (result.success) {
        this.snackBar.open('Account created successfully! Please check your email to verify your account.', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.selectedTab = 0; // Switch to login tab
        this.loginForm.patchValue({ email });
      } else {
        this.snackBar.open(result.error || 'Signup failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
}






