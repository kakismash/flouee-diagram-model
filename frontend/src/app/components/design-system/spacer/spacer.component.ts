import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ds-spacer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [style]="spacerStyle"></div>
  `,
  styles: [`
    div {
      flex-shrink: 0;
    }
  `]
})
export class SpacerComponent {
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md';

  get spacerStyle(): string {
    const sizeMap: Record<string, string> = {
      xs: 'var(--ds-spacing-xs, 4px)',
      sm: 'var(--ds-spacing-sm, 8px)',
      md: 'var(--ds-spacing-md, 16px)',
      lg: 'var(--ds-spacing-lg, 24px)',
      xl: 'var(--ds-spacing-xl, 32px)',
      xxl: 'var(--ds-spacing-xxl, 48px)'
    };

    return `width: ${sizeMap[this.size]}; height: ${sizeMap[this.size]};`;
  }
}

