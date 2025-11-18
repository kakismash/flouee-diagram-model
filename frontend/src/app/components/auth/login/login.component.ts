import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ModernInputComponent } from '../../modern-input/modern-input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ModernInputComponent
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <mat-icon class="app-icon">account_tree</mat-icon>
          <h1>Flouee Diagram Model</h1>
          <p>Database Schema Designer</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoadingSuccess" class="loading-success-state">
          <div class="success-animation">
            <div class="checkmark-circle">
              <mat-icon class="checkmark">check</mat-icon>
            </div>
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h2 class="welcome-message">Welcome back!</h2>
          <p class="loading-text">Preparing your dashboard...</p>
        </div>

        <!-- Auth Forms -->
        <div *ngIf="!isLoadingSuccess" class="auth-forms-container">
          <mat-tab-group class="auth-tabs" [(selectedIndex)]="selectedTab">
          <!-- Login Tab -->
          <mat-tab label="Sign In">
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
              <div class="input-group">
                <label class="input-label">Email</label>
                <app-modern-input
                  [value]="loginForm.get('email')?.value || ''"
                  (valueChange)="loginForm.get('email')?.setValue($event)"
                  [config]="{
                    type: 'email',
                    placeholder: 'Enter your email',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'email',
                    maxLength: 50
                  }"
                  class="full-width">
                </app-modern-input>
                <div class="error-message" *ngIf="loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched">
                  Email is required
                </div>
                <div class="error-message" *ngIf="loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched">
                  Please enter a valid email
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Password</label>
                <app-modern-input
                  [value]="loginForm.get('password')?.value || ''"
                  (valueChange)="loginForm.get('password')?.setValue($event)"
                  [config]="{
                    type: hideLoginPassword ? 'password' : 'text',
                    placeholder: 'Enter your password',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'lock',
                    showPasswordToggle: true,
                    maxLength: 50
                  }"
                  (passwordToggle)="hideLoginPassword = !hideLoginPassword"
                  class="full-width">
                </app-modern-input>
                <div class="error-message" *ngIf="loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched">
                  Password is required
                </div>
                <div class="error-message" *ngIf="loginForm.get('password')?.hasError('minlength') && loginForm.get('password')?.touched">
                  Password must be at least 6 characters
                </div>
              </div>

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
              <div class="input-group">
                <label class="input-label">Email</label>
                <app-modern-input
                  [value]="signupForm.get('email')?.value || ''"
                  (valueChange)="signupForm.get('email')?.setValue($event)"
                  [config]="{
                    type: 'email',
                    placeholder: 'Enter your email',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'email',
                    maxLength: 50
                  }"
                  class="full-width">
                </app-modern-input>
                <div class="error-message" *ngIf="signupForm.get('email')?.hasError('required') && signupForm.get('email')?.touched">
                  Email is required
                </div>
                <div class="error-message" *ngIf="signupForm.get('email')?.hasError('email') && signupForm.get('email')?.touched">
                  Please enter a valid email
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Password</label>
                <app-modern-input
                  [value]="signupForm.get('password')?.value || ''"
                  (valueChange)="signupForm.get('password')?.setValue($event)"
                  [config]="{
                    type: hideSignupPassword ? 'password' : 'text',
                    placeholder: 'Enter your password',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'lock',
                    showPasswordToggle: true,
                    maxLength: 50
                  }"
                  (passwordToggle)="hideSignupPassword = !hideSignupPassword"
                  class="full-width">
                </app-modern-input>
                <div class="error-message" *ngIf="signupForm.get('password')?.hasError('required') && signupForm.get('password')?.touched">
                  Password is required
                </div>
                <div class="error-message" *ngIf="signupForm.get('password')?.hasError('minlength') && signupForm.get('password')?.touched">
                  Password must be at least 6 characters
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Confirm Password</label>
                <app-modern-input
                  [value]="signupForm.get('confirmPassword')?.value || ''"
                  (valueChange)="signupForm.get('confirmPassword')?.setValue($event)"
                  [config]="{
                    type: hideConfirmPassword ? 'password' : 'text',
                    placeholder: 'Confirm your password',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'lock',
                    showPasswordToggle: true,
                    maxLength: 50
                  }"
                  (passwordToggle)="hideConfirmPassword = !hideConfirmPassword"
                  class="full-width">
                </app-modern-input>
                <div class="error-message" *ngIf="signupForm.get('confirmPassword')?.hasError('required') && signupForm.get('confirmPassword')?.touched">
                  Please confirm your password
                </div>
                <div class="error-message" *ngIf="signupForm.get('confirmPassword')?.hasError('passwordMismatch') && signupForm.get('confirmPassword')?.touched">
                  Passwords do not match
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Organization Name (Optional)</label>
                <app-modern-input
                  [value]="signupForm.get('organizationName')?.value || ''"
                  (valueChange)="signupForm.get('organizationName')?.setValue($event)"
                  [config]="{
                    type: 'text',
                    placeholder: 'Enter organization name',
                    size: 'medium',
                    variant: 'outline',
                    icon: 'business',
                    maxLength: 50
                  }"
                  class="full-width">
                </app-modern-input>
              </div>

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
      box-sizing: border-box;
      overflow-x: auto;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 600px;
      min-width: 500px;
      box-sizing: border-box;
      overflow: hidden;
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

    /* Loading Success State */
    .loading-success-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 40px;
      text-align: center;
      animation: fadeInUp 0.6s ease-out;
    }

    .success-animation {
      position: relative;
      margin-bottom: 32px;
    }

    .checkmark-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      animation: checkmarkPop 0.8s ease-out 0.3s both;
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
    }

    .checkmark {
      color: white;
      font-size: 40px;
      width: 40px;
      height: 40px;
      animation: checkmarkDraw 0.6s ease-out 0.8s both;
    }

    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: loadingDots 1.4s ease-in-out infinite both;
    }

    .loading-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .loading-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }

    .welcome-message {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 24px;
      font-weight: 600;
      animation: fadeInUp 0.6s ease-out 0.4s both;
    }

    .loading-text {
      margin: 0;
      color: #666;
      font-size: 16px;
      animation: fadeInUp 0.6s ease-out 0.6s both;
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes checkmarkPop {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes checkmarkDraw {
      0% {
        transform: scale(0) rotate(45deg);
        opacity: 0;
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }

    @keyframes loadingDots {
      0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Auth Forms Container */
    .auth-forms-container {
      animation: fadeInUp 0.4s ease-out;
    }

    .auth-tabs {
      margin-bottom: 24px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 90%;
      box-sizing: border-box;
      margin-left: auto;
      margin-right: auto;
      padding-bottom: 5px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
    }

    .input-label {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }

    .full-width {
      width: 100%;
      box-sizing: border-box;
    }

    .auth-button {
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      margin-top: 8px;
      width: 100%;
      box-sizing: border-box;
    }

    .error-message {
      font-size: 12px;
      color: #d32f2f;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .error-message mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Global error message */
    .error-message:not(.input-group .error-message) {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid #f44336;
      margin-top: 16px;
      font-size: 14px;
    }

    .error-message:not(.input-group .error-message) mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .login-container {
        padding: 16px;
      }
      
      .login-card {
        padding: 32px;
        max-width: 100%;
        min-width: 400px;
      }
      
      .login-header h1 {
        font-size: 24px;
      }

      .auth-form {
        gap: 12px;
      }
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 24px;
        min-width: 350px;
      }
      
      .login-header h1 {
        font-size: 22px;
      }
    }

    @media (max-width: 360px) {
      .login-card {
        padding: 20px;
        min-width: 320px;
      }
      
      .login-header h1 {
        font-size: 20px;
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
  isLoadingSuccess = false;

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
        // Show loading success state
        this.isLoadingSuccess = true;
        
        // AuthService already handles navigation to /dashboard
        // No need to navigate here - prevents double navigation
        console.log('✅ Login successful, AuthService handling navigation');
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






