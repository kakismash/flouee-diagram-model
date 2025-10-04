# 🚀 Configuración Rápida de Supabase

## Paso 1: Crear Proyecto Supabase (2 minutos)

1. **Ir a**: https://supabase.com
2. **Crear cuenta** (gratuita)
3. **Crear nuevo proyecto**:
   - Nombre: `flouee-diagram-model`
   - Contraseña: (generar una segura)
   - Región: más cercana a ti

## Paso 2: Obtener Credenciales

1. **Ir a**: Settings > API
2. **Copiar**:
   - Project URL
   - anon public key

## Paso 3: Configurar Frontend

Actualizar `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'TU_PROJECT_URL_AQUI',
  supabaseAnonKey: 'TU_ANON_KEY_AQUI'
};
```

## Paso 4: Ejecutar Migraciones

1. **Ir a**: SQL Editor en Supabase
2. **Copiar y pegar** el contenido de `supabase/migrations/001_initial_schema.sql`
3. **Ejecutar** el script

## Paso 5: Probar

```bash
cd frontend
ng serve
```

¡Listo! La persistencia debería funcionar.

---

## Alternativa: Configuración Temporal

Si quieres probar sin configurar Supabase ahora, podemos deshabilitar temporalmente la persistencia:

```typescript
// En project.service.ts, comentar las llamadas a Supabase
// y usar localStorage temporalmente
```
