# Supabase Authentication Setup

## Error 500 con code_challenge

El error que estás experimentando es causado por la configuración de PKCE en Supabase. Aquí están los pasos para resolverlo:

### 1. Configurar Redirect URLs en Supabase Dashboard

1. Ve a tu [Supabase Dashboard](https://app.supabase.com/project/cwbywxaafncyplgsrblw)
2. Navega a **Authentication** → **URL Configuration**
3. Agrega las siguientes URLs en **Redirect URLs**:
   - `http://localhost:4200`
   - `http://localhost:4200/`
   - `http://localhost:4200/login`
   - `http://localhost:4200/editor`

### 2. Configurar Site URL

En la misma sección de **URL Configuration**:
- **Site URL**: `http://localhost:4200`

### 3. Deshabilitar confirmación de email (para desarrollo)

1. Ve a **Authentication** → **Providers** → **Email**
2. Deshabilita **Confirm email** (solo para desarrollo)
3. Esto permitirá que los usuarios se registren sin verificar el email

### 4. Aplicar migraciones de RLS

Ejecuta el siguiente comando para habilitar RLS y crear las políticas:

```bash
node scripts/apply-auth-migrations.js
```

**O manualmente en el SQL Editor de Supabase:**

Copia y pega el contenido de `supabase/migrations/003_enable_rls_and_auth.sql` en el SQL Editor y ejecútalo.

### 5. Verificar que las tablas existen

Asegúrate de que las siguientes tablas existan en tu base de datos:
- `organizations`
- `users`
- `projects`
- `project_collaborators`
- `project_history`

Si no existen, ejecuta primero:
```sql
-- Contenido de supabase/migrations/001_initial_schema.sql
```

### 6. Verificar el trigger de auto-creación de usuarios

El trigger `on_auth_user_created` debe existir en tu base de datos. Verifica en el SQL Editor:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### 7. Probar el signup nuevamente

1. Abre la aplicación en `http://localhost:4200/login`
2. Ve al tab "Sign Up"
3. Ingresa:
   - Email: `alfian1991@gmail.com`
   - Password: `123456` (o una más segura)
   - Organization Name: `The Most Wanted`
4. Haz click en "Sign Up"

### 8. Verificar los logs en la consola

Deberías ver en la consola del navegador:
- `Attempting to sign up: alfian1991@gmail.com`
- `Sign up successful: alfian1991@gmail.com`
- `Creating user profile and organization...`
- `User profile and organization created successfully`

### Troubleshooting

#### Si sigue dando error 500:

1. **Verifica los logs de Supabase**:
   - Ve a **Logs** → **API** en el dashboard
   - Busca errores relacionados con auth

2. **Verifica que el email no exista ya**:
   ```sql
   SELECT * FROM auth.users WHERE email = 'alfian1991@gmail.com';
   ```
   
   Si existe, elimínalo:
   ```sql
   DELETE FROM auth.users WHERE email = 'alfian1991@gmail.com';
   ```

3. **Verifica que la función handle_new_user existe**:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

4. **Simplifica el signup** (si sigue fallando):
   - Deshabilita temporalmente el trigger
   - Crea los usuarios manualmente en el dashboard de Supabase

#### Si el error persiste con PKCE:

El error `code_challenge: null` indica que el flujo PKCE no está funcionando correctamente. Esto puede ser porque:

1. **La versión de @supabase/supabase-js no soporta PKCE correctamente**
2. **La configuración del proyecto en Supabase tiene PKCE deshabilitado**

**Solución**: Cambiar a flujo implícito:

Ve a **Authentication** → **Settings** en Supabase Dashboard y asegúrate de que:
- **Enable PKCE flow** esté **ACTIVADO**
- **Enable implicit grant** esté **ACTIVADO**

### Configuración recomendada para desarrollo:

```
Authentication Settings:
✓ Enable Email provider
✓ Enable PKCE flow
✓ Enable implicit grant
✗ Confirm email (deshabilitado para desarrollo)
✓ Enable signup
✓ Secure email change
```

### Siguiente paso después de configurar:

1. Rebuild la aplicación: `ng build`
2. Inicia el servidor: `ng serve`
3. Abre `http://localhost:4200/login`
4. Intenta crear una cuenta nuevamente

Si sigues teniendo problemas, comparte:
1. Los logs completos de la consola del navegador
2. Los logs del API en el dashboard de Supabase
3. La configuración de Authentication Settings





