<!-- 13f1faf0-bd3c-444a-92a0-98598d08e3e5 cb1bb680-99e0-4182-979a-f6b92c819409 -->
# Refactorizar TableViewComponent a módulos reutilizables

## Objetivo

Reducir `table-view.component.ts` de 1368 líneas a 300-500 líneas mediante:

- Extracción de funcionalidades en componentes modulares
- Eliminación de código duplicado/no utilizado
- Mejora de reutilización y mantenibilidad

## Análisis Actual

### Componentes Existentes (Ya Separados)

- ✅ `TableBodyComponent` - Renderización de tabla
- ✅ `TableViewFiltersComponent` - Filtros
- ✅ `TableViewSorterComponent` - Ordenamiento
- ✅ `TableViewColumnManagerComponent` - Gestión de columnas
- ✅ `TableToolbarComponent` - Toolbar
- ✅ `TablePaginationComponent` - Paginación
- ❌ `TableViewActionsComponent` - **NO SE USA** (eliminar o integrar)

### Funcionalidades a Extraer

1. **Data Editing Logic** (~200 líneas)

   - `saveEdit()`, `validateRequiredFields()`, `removeTemporaryRecord()`
   - Gestión de registros temporales
   - Validación de campos requeridos
   - **Extraer a**: `TableDataEditorService` o `TableDataEditorComponent`

2. **View Management Logic** (~150 líneas)

   - `applyViewToTable()`, `applyDefaultColumns()`, `onColumnDrop()`
   - Lógica de inicialización de columnas
   - **Extraer a**: `TableViewManagerService`

3. **Skeleton Loader** (~60 líneas)

   - Template y estilos del skeleton
   - **Extraer a**: `TableSkeletonComponent`

4. **Relationship Management** (~50 líneas)

   - `startEditRelationship()`, `saveEditRelationship()`, `getRelationshipType()`, etc.
   - Métodos stub que pueden moverse a servicio
   - **Extraer a**: `TableRelationshipEditorService`

5. **Column Name Editing** (~90 líneas)

   - `saveColumnName()` con toda su lógica
   - **Mover a**: `TableColumnNameEditorService`

6. **Event Handlers Simplificados** (~100 líneas)

   - Muchos son delegaciones simples a servicios
   - Consolidar en métodos más directos

## Plan de Refactorización

### Fase 1: Limpieza y Eliminación

1. **Eliminar `TableViewActionsComponent`** si no se usa

   - Verificar si se usa en otros lugares
   - Si no, eliminar el archivo

2. **Remover logs de debug**

   - Eliminar todos los `console.log` de `onColumnDrop` y `saveColumnName`
   - Mantener solo logs críticos de errores

3. **Eliminar código muerto**

   - Métodos stub sin implementación (`startEditRelationship`, `saveEditRelationship`)
   - Getters innecesarios que solo delegan

### Fase 2: Extracción de Servicios

4. **Crear `TableDataEditorService`**

   - `saveEdit(rowIndex, columnName, element)`
   - `validateRequiredFields(record)`
   - `removeTemporaryRecord()`
   - `onStartAddRecord()` - lógica de creación de registros temporales
   - **Ubicación**: `frontend/src/app/services/table-data-editor.service.ts`

5. **Crear `TableViewManagerService`**

   - `applyViewToTable(view)` - mover desde componente
   - `applyDefaultColumns()` - mover desde componente
   - `onColumnDrop(event)` - lógica de reordenamiento
   - `initializeColumns()` - lógica de inicialización
   - **Ubicación**: `frontend/src/app/services/table-view-manager.service.ts`

6. **Crear `TableColumnNameEditorService`**

   - `saveColumnName(columnId, newName)` - toda la lógica actual
   - **Ubicación**: `frontend/src/app/services/table-column-name-editor.service.ts`

7. **Extender `TableRelationshipService`**

   - Mover métodos stub de relationship management
   - `startEditRelationship()`, `saveEditRelationship()`, `getRelationshipType()`, etc.

### Fase 3: Extracción de Componentes

8. **Crear `TableSkeletonComponent`**

   - Template y estilos del skeleton loader
   - **Ubicación**: `frontend/src/app/components/table-view/table-skeleton/table-skeleton.component.ts`
   - **Inputs**: `columnCount`, `rowCount` (opcionales, con defaults)

9. **Simplificar Event Handlers en Componente Principal**

   - Convertir delegaciones simples en llamadas directas
   - Reducir métodos que solo llaman a servicios

### Fase 4: Reorganización del Componente Principal

10. **Simplificar `table-view.component.ts`**

    - Mantener solo:
      - Inputs/Outputs
      - Template (simplificado)
      - Lifecycle hooks (simplificados)
      - Delegación a servicios
      - Computed signals esenciales
    - **Objetivo**: 300-500 líneas

11. **Reorganizar Template**

    - Usar `app-table-skeleton` en lugar de template inline
    - Simplificar bindings usando servicios directamente

## Estructura Final Esperada

```
table-view.component.ts (~400 líneas)
├── Inputs/Outputs
├── Computed signals (solo esenciales)
├── Lifecycle hooks (simplificados)
├── Delegación a servicios
└── Template simplificado (edición inline en celdas)

Servicios nuevos:
├── table-data-editor.service.ts (edición inline, sin componente)
├── table-view-manager.service.ts
├── table-column-name-editor.service.ts
└── table-relationship.service.ts (extendido)

Componentes nuevos (opcionales):
└── table-skeleton.component.ts (solo si se extrae del template)
```

## Verificaciones Post-Refactorización

1. ✅ Funcionalidad de drag and drop de columnas sigue funcionando
2. ✅ Edición de datos funciona correctamente
3. ✅ Filtros y ordenamiento funcionan
4. ✅ Paginación funciona
5. ✅ Edición de nombres de columnas funciona
6. ✅ Registros temporales funcionan
7. ✅ No hay regresiones en funcionalidad existente

## Notas

- Mantener compatibilidad con componentes hijos existentes
- No cambiar interfaces públicas de servicios existentes
- Asegurar que todos los tests pasen (si existen)
- Documentar servicios nuevos con JSDoc

### To-dos

- [ ] Eliminar TableViewActionsComponent si no se usa y remover logs de debug
- [ ] Crear TableDataEditorService con lógica de edición de datos
- [ ] Crear TableViewManagerService con lógica de gestión de vistas
- [ ] Crear TableColumnNameEditorService con lógica de edición de nombres
- [ ] Crear TableSkeletonComponent para skeleton loader
- [ ] Refactorizar table-view.component.ts para usar nuevos servicios y componentes
- [ ] Verificar que toda la funcionalidad sigue funcionando correctamente