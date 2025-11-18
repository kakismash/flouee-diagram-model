import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DividerOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'ds-divider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <hr
      [class]="dividerClasses"
      [attr.aria-orientation]="orientation"
      [attr.aria-label]="ariaLabel">
  `,
  styles: [`
    hr {
      border: none;
      margin: 0;
      padding: 0;
    }

    .orientation-horizontal {
      width: 100%;
      height: 1px;
      background-color: var(--theme-divider);
    }

    .orientation-vertical {
      width: 1px;
      height: 100%;
      background-color: var(--theme-divider);
      align-self: stretch;
    }

    .spacing-small {
      margin: var(--ds-spacing-sm, 8px) 0;
    }

    .spacing-medium {
      margin: var(--ds-spacing-md, 16px) 0;
    }

    .spacing-large {
      margin: var(--ds-spacing-lg, 24px) 0;
    }

    .spacing-small.orientation-vertical {
      margin: 0 var(--ds-spacing-sm, 8px);
    }

    .spacing-medium.orientation-vertical {
      margin: 0 var(--ds-spacing-md, 16px);
    }

    .spacing-large.orientation-vertical {
      margin: 0 var(--ds-spacing-lg, 24px);
    }
  `]
})
export class DividerComponent {
  @Input() orientation: DividerOrientation = 'horizontal';
  @Input() spacing: 'none' | 'small' | 'medium' | 'large' = 'none';
  @Input() ariaLabel: string | null = null;

  get dividerClasses(): string {
    const classes = [`orientation-${this.orientation}`];
    if (this.spacing !== 'none') {
      classes.push(`spacing-${this.spacing}`);
    }
    return classes.join(' ');
  }
}

