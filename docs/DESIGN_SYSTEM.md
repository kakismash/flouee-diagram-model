# Design System Documentation

## Overview

The Design System provides a foundation for building consistent, theme-aware, and accessible UI components across the application. All components follow a set of principles and use design tokens that map to the theme system.

## Core Principles

1. **Theme-Aware**: All components use CSS variables (`var(--theme-*)`), never hardcoded colors
2. **Configurable**: Components accept size, variant, and other props for flexibility
3. **Accessible**: Follow WCAG 2.1 AA standards with proper ARIA attributes
4. **Composable**: Components can be combined to create complex UIs
5. **Responsive**: Mobile-first design approach
6. **Type-Safe**: Full TypeScript typing with interfaces

## Design Tokens

### Colors

All colors are mapped from the theme system:

```typescript
import { designTokens } from '../design-system/design-system.tokens';

// Access colors
const primary = designTokens.colors.primary; // var(--theme-primary)
const textPrimary = designTokens.colors.textPrimary; // var(--theme-text-primary)
```

### Spacing

Spacing tokens are available as CSS variables:

```css
.element {
  padding: var(--ds-spacing-md, 16px);
  margin: var(--ds-spacing-lg, 24px);
}
```

Available spacing: `xs`, `sm`, `md`, `lg`, `xl`, `xxl`

### Border Radius

```css
.rounded {
  border-radius: var(--ds-radius-medium, 8px);
}
```

Available radius: `none`, `small`, `medium`, `large`, `full`

## Components

### Base Button (`ds-base-button`)

A flexible button component with multiple variants and sizes.

```typescript
import { BaseButtonComponent } from './components/design-system/base-button/base-button.component';

// Usage
<ds-base-button
  label="Click me"
  icon="add"
  variant="primary"
  size="medium"
  shape="square"
  (clicked)="handleClick($event)">
</ds-base-button>
```

**Props:**
- `label`: Button text
- `icon`: Material icon name
- `iconPosition`: 'left' | 'right' (default: 'left')
- `variant`: 'primary' | 'secondary' | 'text' | 'outline' | 'ghost'
- `size`: 'small' | 'medium' | 'large'
- `shape`: 'square' | 'round'
- `disabled`: boolean
- `loading`: boolean
- `fullWidth`: boolean

### Badge (`ds-badge`)

Status badges for displaying information.

```typescript
import { BadgeComponent } from './components/design-system/badge/badge.component';

<ds-badge variant="primary" size="medium">PK</ds-badge>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
- `size`: 'small' | 'medium' | 'large'
- `outline`: boolean
- `dot`: boolean (for dot-only badges)

### Chip (`ds-chip`)

Tags or labels that can be removable or clickable.

```typescript
import { ChipComponent } from './components/design-system/chip/chip.component';

<ds-chip
  variant="default"
  removable
  (removed)="onRemove($event)">
  Tag
</ds-chip>
```

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
- `size`: 'small' | 'medium' | 'large'
- `outline`: boolean
- `clickable`: boolean
- `removable`: boolean
- `icon`: Material icon name

### Card (`ds-card`)

Container component for content grouping.

```typescript
import { CardComponent } from './components/design-system/card/card.component';

<ds-card
  title="Card Title"
  variant="elevated"
  size="medium">
  <div slot="header">Custom header</div>
  Content goes here
  <div slot="footer">Footer content</div>
</ds-card>
```

**Props:**
- `title`: string
- `variant`: 'default' | 'elevated' | 'outlined'
- `size`: 'small' | 'medium' | 'large'
- `showHeader`: boolean
- `showFooter`: boolean
- `clickable`: boolean

### Empty State (`ds-empty-state`)

Placeholder for empty states.

```typescript
import { EmptyStateComponent } from './components/design-system/empty-state/empty-state.component';

<ds-empty-state
  icon="table_chart"
  title="No Tables Found"
  description="Create your first table to get started"
  actionLabel="Create Table"
  (actionClicked)="createTable()">
</ds-empty-state>
```

**Props:**
- `icon`: Material icon name
- `title`: string
- `description`: string
- `actionLabel`: string
- `actionVariant`: 'primary' | 'secondary' | 'outline'

### Loading Spinner (`ds-loading-spinner`)

Loading indicator component.

```typescript
import { LoadingSpinnerComponent } from './components/design-system/loading-spinner/loading-spinner.component';

<ds-loading-spinner
  size="medium"
  message="Loading data..."
  center>
</ds-loading-spinner>
```

**Props:**
- `size`: 'small' | 'medium' | 'large'
- `strokeWidth`: number (default: 4)
- `message`: string
- `center`: boolean

### Divider (`ds-divider`)

Section divider.

```typescript
import { DividerComponent } from './components/design-system/divider/divider.component';

<ds-divider orientation="horizontal" spacing="medium"></ds-divider>
```

**Props:**
- `orientation`: 'horizontal' | 'vertical'
- `spacing`: 'none' | 'small' | 'medium' | 'large'

### Spacer (`ds-spacer`)

Spacing utility component.

```typescript
import { SpacerComponent } from './components/design-system/spacer/spacer.component';

<ds-spacer size="md"></ds-spacer>
```

**Props:**
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

## Table View Components

### Filters (`app-table-view-filters`)

Filter panel for table views.

```typescript
import { TableViewFiltersComponent } from './components/table-view/table-view-filters/table-view-filters.component';

<app-table-view-filters
  [availableColumns]="columns"
  [activeFilters]="filters"
  (filtersChanged)="onFiltersChanged($event)">
</app-table-view-filters>
```

### Sorter (`app-table-view-sorter`)

Sorting controls for table views.

```typescript
import { TableViewSorterComponent } from './components/table-view/table-view-sorter/table-view-sorter.component';

<app-table-view-sorter
  [availableColumns]="columns"
  [sortColumns]="sorts"
  (sortChanged)="onSortChanged($event)">
</app-table-view-sorter>
```

### Column Manager (`app-table-view-column-manager`)

Column visibility and ordering manager.

```typescript
import { TableViewColumnManagerComponent } from './components/table-view/table-view-column-manager/table-view-column-manager.component';

<app-table-view-column-manager
  [columnSettings]="columnSettings"
  (columnsChanged)="onColumnsChanged($event)">
</app-table-view-column-manager>
```

## Usage Guidelines

### Creating New Components

1. Place in `components/design-system/[component-name]/`
2. Use design tokens from `design-system.tokens.ts`
3. Use configuration from `design-system.config.ts`
4. Reference CSS variables, never hardcoded values
5. Support size variants (small, medium, large)
6. Support theme variants when appropriate
7. Include proper TypeScript interfaces
8. Add documentation and examples

### Theming

All components automatically adapt to the current theme through CSS variables. No component-specific theme logic is needed.

### Accessibility

- Use semantic HTML
- Include ARIA labels where appropriate
- Ensure keyboard navigation support
- Maintain proper focus management
- Test with screen readers

## Examples

See individual component directories for detailed usage examples and additional props.

