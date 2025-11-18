# Design System

This directory contains the core design system configuration and tokens for the application.

## Overview

The design system provides:
- **Consistent UI Components**: Reusable, theme-aware components
- **Design Tokens**: Centralized configuration for sizes, spacing, colors, etc.
- **Theme Integration**: Seamless integration with the theme system

## Structure

- `design-system.config.ts` - Configuration (sizes, spacing, shadows, etc.)
- `design-system.tokens.ts` - Design tokens mapped to CSS variables
- `README.md` - This file

## Design Tokens

All design tokens map to CSS variables from the theme system. Components should reference these tokens instead of hardcoded values.

### Usage Example

```typescript
import { designTokens } from '../design-system/design-system.tokens';
import { designSystemConfig } from '../design-system/design-system.config';

// In component styles
styles: [`
  .my-component {
    background: ${designTokens.colors.surface};
    padding: ${designSystemConfig.spacing.md};
    border-radius: ${designSystemConfig.borderRadius.medium};
  }
`]
```

Or use CSS variables directly:

```css
.my-component {
  background: var(--theme-surface);
  padding: var(--ds-spacing-md, 16px);
  border-radius: var(--ds-radius-medium, 8px);
}
```

## Component Principles

1. **Theme-Aware**: All components use CSS variables, never hardcoded colors
2. **Configurable**: Components accept size, variant, and other props
3. **Accessible**: Follow WCAG 2.1 AA standards
4. **Composable**: Components can be combined to create complex UIs
5. **Responsive**: Mobile-first design approach

## Creating New Components

When creating a new component in the design system:

1. Place it in `components/design-system/[component-name]/`
2. Use design tokens from `design-system.tokens.ts`
3. Use configuration from `design-system.config.ts`
4. Reference CSS variables, never hardcoded values
5. Support size variants (small, medium, large)
6. Support theme variants (primary, secondary, etc.)
7. Include proper TypeScript interfaces
8. Add documentation and examples

## Design System Components

Components are located in `components/design-system/`:

- `base-button/` - Core button component
- `badge/` - Status badges
- `chip/` - Chips/tags
- `form-field/` - Form field wrapper
- `card/` - Card container
- And more...

See individual component directories for usage examples.

