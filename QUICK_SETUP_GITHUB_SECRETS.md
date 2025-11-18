# ⚡ Configuración Rápida de GitHub Secrets

## ⚠️ IMPORTANTE: Las variables deben estar en GitHub Secrets, NO en Netlify

Si agregaste las variables en Netlify Environment Variables, necesitas moverlas a GitHub Secrets.

---

## 🔗 Enlaces Directos

### 1. Agregar Secrets en GitHub
👉 **https://github.com/kakismash/flouee-diagram-model/settings/secrets/actions**

### 2. Obtener Token de Netlify
👉 **https://app.netlify.com/user/applications**

### 3. Obtener Variables de Supabase
👉 **https://app.supabase.com/project/[TU_PROYECTO]/settings/api**

---

## 📋 Checklist de Variables

Agrega estas 3 variables en GitHub Secrets (una por una):

### ✅ 1. NETLIFY_AUTH_TOKEN

**Pasos:**
1. Ve a: https://app.netlify.com/user/applications
2. Click "New access token"
3. Nombre: "GitHub Actions Deployment"
4. **Copia el token** (solo lo verás una vez)
5. Ve a: https://github.com/kakismash/flouee-diagram-model/settings/secrets/actions
6. Click "New repository secret"
7. Name: `NETLIFY_AUTH_TOKEN`
8. Value: (pega el token)
9. Click "Add secret"

### ✅ 2. SUPABASE_URL

**Pasos:**
1. Ve a tu proyecto Supabase Master
2. Settings → API
3. Copia el "Project URL" (ej: `https://xxxxx.supabase.co`)
4. Ve a: https://github.com/kakismash/flouee-diagram-model/settings/secrets/actions
5. Click "New repository secret"
6. Name: `SUPABASE_URL`
7. Value: (pega la URL)
8. Click "Add secret"

### ✅ 3. SUPABASE_ANON_KEY

**Pasos:**
1. Ve a tu proyecto Supabase Master
2. Settings → API
3. En "Project API keys", copia la clave "anon" o "public"
4. **NO uses service_role key** (esa es privada)
5. Ve a: https://github.com/kakismash/flouee-diagram-model/settings/secrets/actions
6. Click "New repository secret"
7. Name: `SUPABASE_ANON_KEY`
8. Value: (pega la clave anónima)
9. Click "Add secret"

---

## ✅ Verificar que Están Configuradas

Después de agregar las 3 variables, deberías ver en GitHub:

1. Ve a: https://github.com/kakismash/flouee-diagram-model/settings/secrets/actions
2. Deberías ver estas 3 variables listadas:
   - ✅ `NETLIFY_AUTH_TOKEN`
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY`

**Nota:** Los valores están ocultos por seguridad (solo verás `••••••••`)

---

## 🚀 Después de Configurar

Una vez que tengas las 3 variables en GitHub Secrets:

1. Ve a: https://github.com/kakismash/flouee-diagram-model/actions
2. Selecciona "Deploy to Netlify"
3. Click "Run workflow"
4. Selecciona la rama `master`
5. Click "Run workflow"

El workflow ahora debería:
- ✅ Encontrar el `NETLIFY_AUTH_TOKEN`
- ✅ Crear automáticamente el sitio de Netlify
- ✅ Desplegar tu aplicación

---

## ❓ ¿Por qué GitHub Secrets y no Netlify Environment Variables?

- **GitHub Actions** hace el build (no Netlify)
- GitHub Actions necesita acceso a las variables durante el build
- Las variables de Netlify solo se usan si Netlify hace el build directamente
- Nuestro workflow usa GitHub Actions → por eso necesitamos GitHub Secrets

---

## 🔍 Si Ya Agregaste Variables en Netlify

Si ya agregaste variables en Netlify Environment Variables:
- ✅ Está bien, no las elimines (pueden ser útiles para otros propósitos)
- ⚠️ Pero **también** necesitas agregarlas en GitHub Secrets
- El workflow de GitHub Actions **no puede leer** las variables de Netlify

---

**¿Necesitas ayuda?** Revisa `GITHUB_SECRETS_SETUP.md` para instrucciones detalladas.

