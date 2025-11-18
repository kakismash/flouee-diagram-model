# Exponer Schemas Org_xxx en PostgREST

Para usar las capacidades estándar de Supabase (`.from()`, filtros, ordenamiento, paginación, etc.) con tablas en schemas personalizados `org_xxx`, necesitamos configurar PostgREST para exponer estos schemas.

## ⚠️ IMPORTANTE: Configuración Requerida

**Sin esta configuración, obtendrás errores 404/406 al intentar insertar datos.**

## Paso 1: Configurar PostgREST en Supabase Dashboard

1. Ve al proyecto **Slave** en Supabase Dashboard: 
   - https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/settings/api

2. En la sección **"Exposed Schemas"** o **"API Schemas"**, agrega:
   - `org_4305d40642bd42d1883ba1289d67bb0f` (tu schema actual)
   - O mejor aún, configura para exponer todos los schemas que empiecen con `org_`

3. **Guarda los cambios**

**Nota:** En Supabase Cloud, esto se configura en el Dashboard. No hay un archivo de configuración local que puedas modificar directamente para proyectos en la nube.

## Paso 2: Configurar Permisos SQL

Ejecuta este SQL en el proyecto Slave para otorgar permisos a los roles de Supabase:

```sql
-- Otorgar permisos de uso en el schema
GRANT USAGE ON SCHEMA org_4305d40642bd42d1883ba1289d67bb0f TO anon, authenticated, service_role;

-- Otorgar permisos en todas las tablas existentes
GRANT ALL ON ALL TABLES IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f TO anon, authenticated, service_role;

-- Otorgar permisos en todas las funciones existentes
GRANT ALL ON ALL ROUTINES IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f TO anon, authenticated, service_role;

-- Otorgar permisos en todas las secuencias existentes
GRANT ALL ON ALL SEQUENCES IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f TO anon, authenticated, service_role;

-- Configurar permisos por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f 
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Configurar permisos por defecto para futuras funciones
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f 
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Configurar permisos por defecto para futuras secuencias
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA org_4305d40642bd42d1883ba1289d67bb0f 
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
```

## Paso 3: Función para Otorgar Permisos Automáticamente (Opcional)

Para múltiples schemas org_xxx, puedes crear una función que otorgue permisos automáticamente:

```sql
-- Función para otorgar permisos a un schema org_xxx
CREATE OR REPLACE FUNCTION grant_org_schema_permissions(schema_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', schema_name);
  EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role', schema_name);
  EXECUTE format('GRANT ALL ON ALL ROUTINES IN SCHEMA %I TO anon, authenticated, service_role', schema_name);
  EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role', schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I GRANT ALL ON TABLES TO anon, authenticated, service_role', schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I GRANT ALL ON ROUTINES TO anon, authenticated, service_role', schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I GRANT ALL ON SEQUENCES TO anon, authenticated, service_role', schema_name);
END;
$$;

-- Ejecutar para cada schema org_xxx existente
SELECT grant_org_schema_permissions(schema_name)
FROM information_schema.schemata
WHERE schema_name LIKE 'org_%';
```

## Paso 4: Verificación

Después de configurar, puedes verificar que funciona haciendo una consulta directa:

```typescript
const { data, error } = await supabase
  .schema('org_4305d40642bd42d1883ba1289d67bb0f')
  .from('t_ckupzrei5')
  .select('*')
  .limit(1);
```

Si funciona, significa que PostgREST está exponiendo el schema correctamente.

## Importante

- ✅ Esta configuración debe hacerse en el proyecto **Slave** (ffzufnwxvqngglsapqrf)
- ✅ Una vez configurado, podrás usar `.from()`, `.insert()`, `.update()`, `.delete()`, filtros, ordenamiento, etc. directamente
- ✅ Los permisos SQL deben ejecutarse cada vez que se crea un nuevo schema `org_xxx`
- ❌ **NO usamos funciones RPC** - solo el método estándar de Supabase

## Solución de Problemas

### Error 404 Not Found
- El schema no está en la lista de "Exposed Schemas" en el Dashboard
- Verifica que agregaste el schema correcto

### Error 406 Not Acceptable
- El schema está expuesto pero faltan permisos
- Ejecuta el SQL de permisos del Paso 2

### Error PGRST205 / PGRST116
- PostgREST no puede encontrar la tabla
- Verifica que el schema esté expuesto y que los permisos estén configurados
