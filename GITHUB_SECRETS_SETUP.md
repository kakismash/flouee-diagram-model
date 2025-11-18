# Configuración de GitHub Secrets

Este documento explica qué variables necesitas crear manualmente en GitHub Secrets y cuáles se crean automáticamente.

## 📋 Resumen Rápido

| Variable | Estado | Acción Requerida |
|----------|--------|------------------|
| `NETLIFY_AUTH_TOKEN` | ⚠️ **REQUERIDA** | Crear manualmente |
| `NETLIFY_SITE_ID` | ✅ **Automática** | Se crea en el primer deploy |
| `SUPABASE_URL` | ⚠️ **REQUERIDA** | Crear manualmente |
| `SUPABASE_ANON_KEY` | ⚠️ **REQUERIDA** | Crear manualmente |

---

## 🔑 Variables que DEBES Crear Manualmente

### 1. `NETLIFY_AUTH_TOKEN` ⚠️ REQUERIDA

**Descripción:** Token de autenticación de Netlify para permitir que GitHub Actions despliegue en tu cuenta.

**Cómo obtenerlo:**
1. Ve a [Netlify User Settings → Applications](https://app.netlify.com/user/applications)
2. Haz clic en "New access token"
3. Dale un nombre descriptivo (ej: "GitHub Actions - Flouee Deployment")
4. **Copia el token inmediatamente** (solo lo verás una vez)

**Pasos para agregarlo a GitHub:**
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NETLIFY_AUTH_TOKEN`
5. Value: (pega el token que copiaste)
6. Click "Add secret"

---

### 2. `SUPABASE_URL` ⚠️ REQUERIDA

**Descripción:** URL del proyecto Supabase Master (Control Plane) donde está la autenticación y metadata.

**Cómo obtenerlo:**
1. Ve a tu proyecto Supabase Master en [Supabase Dashboard](https://app.supabase.com/)
2. Ve a Settings → API
3. Copia el valor de "Project URL" (ej: `https://xxxxx.supabase.co`)

**Pasos para agregarlo a GitHub:**
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SUPABASE_URL`
5. Value: (pega la URL de tu proyecto Supabase Master)
6. Click "Add secret"

---

### 3. `SUPABASE_ANON_KEY` ⚠️ REQUERIDA

**Descripción:** Clave anónima (public key) del proyecto Supabase Master. Esta clave es segura para usar en el frontend.

**Cómo obtenerlo:**
1. Ve a tu proyecto Supabase Master en [Supabase Dashboard](https://app.supabase.com/)
2. Ve a Settings → API
3. En la sección "Project API keys", copia la clave "anon" o "public"
4. **NO uses la service_role key** (esa es privada y solo para backend)

**Pasos para agregarlo a GitHub:**
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SUPABASE_ANON_KEY`
5. Value: (pega la clave anónima)
6. Click "Add secret"

---

## ✅ Variables que se Crean Automáticamente

### `NETLIFY_SITE_ID` ✅ Automática

**Descripción:** ID del sitio de Netlify donde se despliega la aplicación.

**Cómo funciona:**
- Si `NETLIFY_SITE_ID` **NO está** en GitHub Secrets:
  - El workflow crea automáticamente un nuevo sitio en Netlify
  - Extrae el Site ID de la respuesta
  - Lo muestra en los logs con instrucciones para agregarlo
  - Despliega al sitio recién creado

- Si `NETLIFY_SITE_ID` **SÍ está** en GitHub Secrets:
  - El workflow usa el sitio existente
  - Despliega normalmente

**Después del primer deploy:**
1. Revisa los logs del workflow en GitHub Actions
2. Busca la sección que dice "🔑 IMPORTANT: Add this to GitHub Secrets"
3. Copia el valor de `NETLIFY_SITE_ID`
4. Agrégalo a GitHub Secrets (mismo proceso que las otras variables)
5. Esto hará que los siguientes deploys sean más rápidos

---

## 📝 Checklist de Configuración

Antes de hacer el primer deploy, asegúrate de tener:

- [ ] `NETLIFY_AUTH_TOKEN` creado en GitHub Secrets
- [ ] `SUPABASE_URL` creado en GitHub Secrets
- [ ] `SUPABASE_ANON_KEY` creado en GitHub Secrets
- [ ] `NETLIFY_SITE_ID` se creará automáticamente en el primer deploy

---

## 🚀 Primer Deploy

Una vez que tengas las 3 variables requeridas configuradas:

1. **Opción A - Merge a master:**
   - Haz merge de tu código a la rama `master`
   - El workflow se ejecutará automáticamente

2. **Opción B - Ejecución manual:**
   - Ve a GitHub → Actions
   - Selecciona "Deploy to Netlify"
   - Click "Run workflow"
   - Selecciona la rama `master`
   - Click "Run workflow"

3. **Revisa los logs:**
   - Si se creó un nuevo sitio, verás el `NETLIFY_SITE_ID` en los logs
   - Copia ese valor y agrégalo a GitHub Secrets para futuros deploys

---

## 🔍 Verificar que las Variables Están Configuradas

Para verificar que tienes todas las variables necesarias:

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Deberías ver al menos estas 3 variables:
   - ✅ `NETLIFY_AUTH_TOKEN`
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY`
   - ⏳ `NETLIFY_SITE_ID` (se agregará después del primer deploy)

---

## ❓ Preguntas Frecuentes

### ¿Por qué necesito NETLIFY_AUTH_TOKEN?
El token permite que GitHub Actions se autentique con Netlify para crear sitios y desplegar código.

### ¿Por qué necesito SUPABASE_URL y SUPABASE_ANON_KEY?
Estas variables se inyectan en el build del frontend para que la aplicación sepa cómo conectarse a Supabase.

### ¿Puedo usar la service_role key en lugar de anon key?
**NO.** La service_role key es privada y nunca debe estar en el frontend. Solo usa la anon/public key.

### ¿Qué pasa si no agrego NETLIFY_SITE_ID?
El workflow creará un nuevo sitio cada vez. Es mejor agregarlo después del primer deploy para reutilizar el mismo sitio.

### ¿Dónde encuentro los valores de Supabase?
En el dashboard de Supabase: Settings → API. Ahí encontrarás tanto la URL como las claves.

---

## 🔐 Seguridad

- ✅ Las variables en GitHub Secrets están encriptadas
- ✅ Solo son accesibles durante la ejecución del workflow
- ✅ No se muestran en los logs (excepto NETLIFY_SITE_ID que se crea)
- ✅ Usa siempre la anon key, nunca la service_role key en el frontend

---

**Última actualización:** 2025-01-20

