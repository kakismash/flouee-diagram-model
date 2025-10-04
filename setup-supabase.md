# 🚀 Configuración de Supabase para Flouee Diagram Model

## Opción 1: Supabase Local (Recomendado para desarrollo)

### 1. Instalar Docker Desktop
- Descargar e instalar Docker Desktop desde: https://www.docker.com/products/docker-desktop
- Asegurarse de que Docker esté ejecutándose

### 2. Inicializar Supabase Local
```bash
# En el directorio raíz del proyecto
npx supabase init
npx supabase start
```

### 3. Obtener credenciales locales
```bash
npx supabase status
```

## Opción 2: Supabase Cloud (Para producción)

### 1. Crear cuenta en Supabase
- Ir a: https://supabase.com
- Crear cuenta gratuita
- Crear nuevo proyecto

### 2. Obtener credenciales
- Ir a Settings > API
- Copiar:
  - Project URL
  - anon public key

### 3. Configurar variables de entorno
```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'TU_PROJECT_URL_AQUI',
  supabaseAnonKey: 'TU_ANON_KEY_AQUI'
};
```

## Opción 3: Configuración Temporal (Para testing)

### Usar credenciales de ejemplo para desarrollo local
```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
};
```

## Pasos siguientes

1. **Elegir una opción** de las anteriores
2. **Configurar las credenciales** en environment.ts
3. **Ejecutar migraciones** si usas Supabase local
4. **Probar la aplicación**

## Comandos útiles

```bash
# Iniciar Supabase local
npx supabase start

# Ver estado
npx supabase status

# Aplicar migraciones
npx supabase db reset

# Parar Supabase local
npx supabase stop
```
