import { Component, Input, Output, EventEmitter, forwardRef, signal, OnInit, OnChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ModernInputConfig {
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  size?: 'small' | 'medium' | 'large';
  variant?: 'outline' | 'fill';
  showClearButton?: boolean;
  showPasswordToggle?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  required?: boolean;
  autocomplete?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  errorMessage?: string;
  hint?: string;
  label?: string;
}

@Component({
  selector: 'app-modern-input',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ModernInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="modern-input-container" 
         [class]="getSizeClass()"
         [style.width]="getDynamicWidth()">
      <mat-form-field 
        [appearance]="config.variant || 'outline'"
        [class]="getFormFieldClass()"
        [floatLabel]="config.label ? 'always' : 'auto'">
        
        <!-- Label -->
        <mat-label *ngIf="config.label">{{ config.label }}</mat-label>
        
        <!-- Left Icon -->
        <mat-icon *ngIf="config.icon && config.iconPosition !== 'right'" 
                  matPrefix 
                  class="input-icon">
          {{ config.icon }}
        </mat-icon>
        
        <!-- Input -->
        <input 
          matInput
          [type]="getInputType()"
          [placeholder]="config.placeholder || ''"
          [value]="internalValue()"
          [disabled]="config.disabled"
          [readonly]="config.readonly"
          [attr.maxlength]="config.maxLength"
          [attr.minlength]="config.minLength"
          [pattern]="config.pattern"
          [required]="config.required"
          [autocomplete]="config.autocomplete"
          (input)="onInput($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          (keyup.enter)="onEnter()"
          (keyup.escape)="onEscape()"
          #inputRef>
        
        <!-- Right Icon -->
        <mat-icon *ngIf="config.icon && config.iconPosition === 'right'" 
                  matSuffix 
                  class="input-icon">
          {{ config.icon }}
        </mat-icon>
        
        <!-- Clear Button -->
        <button *ngIf="config.showClearButton && internalValue() && !config.disabled"
                matSuffix
                mat-icon-button
                type="button"
                (click)="clearValue()"
                class="clear-button">
          <mat-icon>clear</mat-icon>
        </button>
        
        <!-- Password Toggle -->
        <button *ngIf="config.showPasswordToggle && config.type === 'password'"
                matSuffix
                mat-icon-button
                type="button"
                (click)="togglePasswordVisibility()"
                class="password-toggle">
          <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        
        <!-- Hint -->
        <mat-hint *ngIf="config.hint">{{ config.hint }}</mat-hint>
        
        <!-- Error -->
        <mat-error *ngIf="config.errorMessage">{{ config.errorMessage }}</mat-error>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .modern-input-container {
      width: auto;
      min-width: 80px;
      max-width: 100%;
      position: relative;
      display: inline-block;
      box-sizing: border-box;
    }

    /* When used in table cells, constrain width */
    :host-context(td[mat-cell]) .modern-input-container,
    :host-context(.cell-input) .modern-input-container {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      display: block !important;
    }

    /* Size variants */
    .modern-input-container.small {
      --input-height: 32px;
      --input-padding: 8px 12px;
      --input-font-size: 14px;
    }

    .modern-input-container.medium {
      --input-height: 40px;
      --input-padding: 12px 16px;
      --input-font-size: 16px;
    }

    .modern-input-container.large {
      --input-height: 48px;
      --input-padding: 16px 20px;
      --input-font-size: 18px;
    }

    /* Form field customization */
    .modern-input-container ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    .modern-input-container ::ng-deep .mat-mdc-form-field-infix {
      min-height: var(--input-height, 40px);
      padding: var(--input-padding, 12px 16px);
    }

    .modern-input-container ::ng-deep .mat-mdc-form-field-infix input {
      font-size: var(--input-font-size, 16px);
      line-height: 1.2;
    }

    /* Compact variant */
    .modern-input-container.compact ::ng-deep .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .modern-input-container.compact ::ng-deep .mat-mdc-form-field-infix {
      border-top: none;
      padding: 8px 0;
    }

    .modern-input-container.compact ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    /* Inline variant */
    .modern-input-container.inline ::ng-deep .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .modern-input-container.inline ::ng-deep .mat-mdc-form-field-infix {
      border-top: none;
      padding: 4px 0;
      min-height: 28px;
    }

    .modern-input-container.inline ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .modern-input-container.inline ::ng-deep .mat-mdc-text-field-wrapper {
      padding: 0;
    }

    /* Icons */
    .input-icon {
      color: var(--theme-text-secondary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Buttons */
    .clear-button,
    .password-toggle {
      color: var(--theme-text-secondary);
      width: 24px;
      height: 24px;
      line-height: 24px;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      position: relative;
      z-index: 1;
    }

    .clear-button:hover,
    .password-toggle:hover {
      color: var(--theme-primary);
    }

    /* Ensure buttons don't affect input width */
    .modern-input-container ::ng-deep .mat-mdc-form-field-suffix {
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-width: 40px;
      padding: 0 8px;
    }

    .modern-input-container ::ng-deep .mat-mdc-form-field-prefix {
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-width: 40px;
      padding: 0 8px;
    }

    /* Focus states */
    .modern-input-container ::ng-deep .mat-mdc-form-field-focus-overlay {
      background-color: transparent;
    }

    .modern-input-container ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-outline-thick {
      color: var(--theme-primary);
    }

    /* Error states */
    .modern-input-container ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mat-mdc-form-field-outline-thick {
      color: var(--theme-error);
    }

    /* Disabled states */
    .modern-input-container ::ng-deep .mat-mdc-form-field.mat-form-field-disabled {
      opacity: 0.6;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .modern-input-container.small {
        --input-height: 36px;
        --input-padding: 10px 14px;
        --input-font-size: 16px;
      }

      .modern-input-container.medium {
        --input-height: 44px;
        --input-padding: 14px 18px;
        --input-font-size: 18px;
      }

      .modern-input-container.large {
        --input-height: 52px;
        --input-padding: 18px 22px;
        --input-font-size: 20px;
      }
    }

    /* Dark theme adjustments */
    .dark-theme .modern-input-container ::ng-deep .mat-mdc-form-field-outline {
      color: var(--theme-border);
    }

    .dark-theme .modern-input-container ::ng-deep .mat-mdc-form-field-outline-thick {
      color: var(--theme-primary);
    }

    .dark-theme .modern-input-container ::ng-deep .mat-mdc-input-element {
      color: var(--theme-text-primary);
    }

    .dark-theme .modern-input-container ::ng-deep .mat-mdc-input-element::placeholder {
      color: var(--theme-text-secondary);
    }

  `]
})
export class ModernInputComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() config: ModernInputConfig = {};
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() enter = new EventEmitter<void>();
  @Output() escape = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();
  @Output() tab = new EventEmitter<void>();

  internalValue = signal<string>('');
  showPassword = signal<boolean>(false);
  private canvas: HTMLCanvasElement | null = null;

  private onChange = (value: string) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.internalValue.set(this.value);
  }

  ngOnChanges(changes: any) {
    // Only update if value actually changed from outside (not from user input)
    // This prevents overwriting user input while typing
    if (changes.value && changes.value.currentValue !== this.internalValue()) {
      this.internalValue.set(this.value || '');
    }
  }

  getSizeClass(): string {
    const size = this.config.size || 'medium';
    const variant = this.config.variant || 'outline';
    return `${size} ${variant === 'outline' ? 'compact' : ''}`;
  }

  getFormFieldClass(): string {
    return this.config.variant === 'outline' ? 'compact' : '';
  }

  getInputType(): string {
    if (this.config.type === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.config.type || 'text';
  }

  getDynamicWidth(): string {
    // If maxLength is specified, use fixed width based on maxLength
    if (this.config.maxLength) {
      return this.getFixedWidthForMaxLength();
    }

    const currentValue = this.internalValue();
    const placeholder = this.config.placeholder || '';
    const textToMeasure = currentValue || placeholder;
    
    if (!textToMeasure) {
      return 'auto';
    }

    // Calculate width based on text length + 2 extra characters
    const targetLength = Math.max(textToMeasure.length + 2, 4);
    const baseWidth = this.measureTextWidth(textToMeasure);
    const extraWidth = this.measureTextWidth('MM'); // 2 extra characters
    const totalWidth = baseWidth + extraWidth;
    
    // Add padding for form field
    const padding = 32; // 16px on each side
    const finalWidth = Math.max(totalWidth + padding, 80); // Minimum 80px
    
    return `${finalWidth}px`;
  }

  private getFixedWidthForMaxLength(): string {
    const maxLength = this.config.maxLength || 50;
    
    // Calculate width based on maxLength characters
    // Use a representative character width (average of 'M' and 'i')
    const avgCharWidth = this.measureTextWidth('Mi') / 2;
    const textWidth = avgCharWidth * maxLength;
    
    // Calculate padding based on what elements are present
    let padding = 32; // Base padding for borders
    
    // Add space for left icon if present
    if (this.config.icon && this.config.iconPosition !== 'right') {
      padding += 40; // Icon + spacing
    }
    
    // Add space for right elements (icon, clear button, password toggle)
    if (this.config.icon && this.config.iconPosition === 'right') {
      padding += 40; // Icon + spacing
    }
    if (this.config.showClearButton) {
      padding += 40; // Clear button + spacing
    }
    if (this.config.showPasswordToggle && this.config.type === 'password') {
      padding += 40; // Password toggle button + spacing
    }
    
    const finalWidth = Math.max(textWidth + padding, 120); // Minimum 120px for readability
    
    return `${finalWidth}px`;
  }

  private measureTextWidth(text: string): number {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      return text.length * 8; // Fallback: ~8px per character
    }

    // Use the same font as the input
    const fontSize = this.getFontSize();
    const fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    context.font = `${fontSize}px ${fontFamily}`;
    
    const metrics = context.measureText(text);
    return metrics.width;
  }

  private getFontSize(): number {
    const size = this.config.size || 'medium';
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      default: return 16;
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    this.internalValue.set(newValue);
    this.onChange(newValue);
    this.valueChange.emit(newValue);
    
    // Trigger change detection to recalculate width
    setTimeout(() => {
      // This will trigger the getDynamicWidth() method to recalculate
    }, 0);
  }

  onBlur(): void {
    this.onTouched();
    // Emit blur immediately - the parent component will handle the delay if needed
    this.blur.emit();
  }

  onFocus(): void {
    this.focus.emit();
  }

  onEnter(): void {
    this.enter.emit();
  }

  onEscape(): void {
    this.escape.emit();
  }

  onTab(event: Event): void {
    // Prevent default tab behavior
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }
    // Emit tab event to parent
    this.tab.emit();
  }

  clearValue(): void {
    this.internalValue.set('');
    this.onChange('');
    this.valueChange.emit('');
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.internalValue.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.config.disabled = isDisabled;
  }
}
