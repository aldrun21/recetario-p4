# Guía de Despliegue en Cloudflare (Pages + Workers KV)

Tu aplicación de **Recetas Médicas Dermatológicas** está 100% preparada y optimizada para ser alojada en **Cloudflare Pages** y utilizar **Cloudflare Workers KV** como base de datos de alta velocidad en el edge.

---

## 🏗 Arquitectura Preparada

* **Frontend:** React + Vite + Tailwind CSS compilado en la carpeta `dist/`.
* **Backend Edge Serverless:** Ubicado en la carpeta `/functions/api/` (Cloudflare Pages Functions).
  * `/functions/api/kv/[[route]].ts`: API REST para almacenar y consultar pacientes, recetas, catálogo de medicamentos y perfil médico en **Workers KV**.
  * `/functions/api/gemini/generate.ts`: Endpoint serverless para la generación con IA sin exponer claves en el navegador.
* **Base de Datos:** Espacio de nombres **Cloudflare Workers KV** (`RECETARIO_KV`).
* **Archivos de configuración incluidos:**
  * `wrangler.jsonc` y `wrangler.toml` con la configuración del proyecto y la vinculación de KV.

---

## 🚀 Despliegue Paso a Paso (Método Recomendado: Cloudflare Dashboard)

### Paso 1: Subir el proyecto a GitHub o GitLab
Sube tu código a un repositorio en GitHub o GitLab.

### Paso 2: Crear el Espacio de Nombres KV en Cloudflare
1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. En el menú lateral izquierdo, haz clic en **Workers y Pages** > **KV**.
3. Haz clic en **Crear un espacio de nombres** (*Create a namespace*).
4. Asigna el nombre: **`RECETARIO_KV`** y haz clic en **Agregar**.
5. *(Opcional)* Copia el `ID` generado por si deseas pegarlo en `wrangler.jsonc` o `wrangler.toml`.

### Paso 3: Crear el Proyecto en Cloudflare Pages
1. En el menú lateral, ve a **Workers y Pages** > **Crear**.
2. Selecciona la pestaña **Pages** > **Conectar a Git** (*Connect to Git*).
3. Selecciona tu repositorio de recetas médicas.
4. En la configuración de compilación (*Build settings*):
   * **Framework preset:** `Vite`
   * **Build command:** `npm run build`
   * **Build output directory:** `dist`
5. Haz clic en **Guardar e implementar** (*Save and Deploy*).

### Paso 4: Vincular el KV a tu Proyecto en Cloudflare Pages
*(Este paso es fundamental para que la base de datos de KV funcione)*
1. En Cloudflare Dashboard, ve a tu proyecto de Pages recién creado.
2. Haz clic en la pestaña **Configuración** (*Settings*) > **Funciones** (*Functions*).
3. Baja hasta la sección **Enlaces de espacio de nombres KV** (*KV namespace bindings*) y haz clic en **Agregar enlace** (*Add binding*).
4. Configura:
   * **Nombre de la variable:** `RECETARIO_KV` *(debe ser exactamente este nombre)*
   * **Espacio de nombres KV:** Selecciona el `RECETARIO_KV` que creaste en el Paso 2.
5. Haz clic en **Guardar** (*Save*).
6. Ve a la pestaña **Implementaciones** (*Deployments*) y haz clic en **Reimplementar** (*Retry deployment*) para que tome efecto el enlace.

### Paso 4: Configuración de Compilación Recomendada en Cloudflare Pages
Para evitar cualquier error con `npm ci` o lockfiles en Cloudflare, usa esta configuración:
* **Framework preset:** `Vite`
* **Build command:** `npm install --legacy-peer-deps && npm run build`
* **Build output directory:** `dist`
* **Deploy command:** *(DEJAR VACÍO / EN BLANCO)* — Cloudflare Pages despliega automáticamente la carpeta `dist` sin necesidad de ningún comando adicional.

### Paso 5: Variables de Entorno Recomendadas
En tu proyecto de Pages > **Configuración** (*Settings*) > **Variables de entorno** (*Environment variables*), agrega:
* **`SKIP_DEPENDENCY_INSTALL`**: `true` *(Obliga a Cloudflare a usar tu comando de compilación limpio sin fallos de lockfile)*
* **`NODE_VERSION`**: `20`
* **`GEMINI_API_KEY`**: *(Opcional)* Tu clave de API de Google Gemini para el asistente de redacción médica.

---

## ⚠️ Solución al error: "Missing entry-point to Worker script or to assets directory"

Si el log muestra:
```text
Executing user deploy command: npx wrangler deploy
▲ [WARNING] It seems that you have run wrangler deploy on a Pages project...
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

**Solución directa:**
1. En tu proyecto de Cloudflare Pages > **Settings (Configuración)** > **Builds & deployments (Compilaciones e implementaciones)**.
2. En **Build configuration**, haz clic en **Edit (Editar)**.
3. En el campo **Deploy command (Comando de implementación)**, **BORRA TODO Y DÉJALO VACÍO**.
4. Haz clic en **Save (Guardar)** y reintenta el despliegue.

---

## ⚠️ Solución al error: "npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync"

Este error ocurre porque Cloudflare ejecuta `npm clean-install` (`npm ci`), el cual es hiperestricto y exige binarios opcionales de otros sistemas operativos.

### La solución definitiva (en 1 minuto en Cloudflare Pages):
1. En tu proyecto de Cloudflare Pages > **Settings (Configuración)** > **Builds & deployments (Compilaciones e implementaciones)**.
2. En **Build configuration (Configuración de compilación)**, haz clic en **Edit (Editar)** y pon:
   * **Build command:** `npm install --legacy-peer-deps && npm run build`
3. Ve a **Settings** > **Environment variables (Variables de entorno)** y agrega:
   * **Variable:** `SKIP_DEPENDENCY_INSTALL` con valor `true`
4. Haz clic en **Guardar** y luego en la pestaña **Deployments** > **Retry deployment**.
   *(¡Con esto Cloudflare no fallará nunca en la instalación!)*

---

## ⚠️ Solución al error: "Unknown lockfile version at bun.lock"

Si Cloudflare intentara usar `bun install --frozen-lockfile` por detectar `bun.lock`:
Simplemente elimina `bun.lock` de tu repositorio en GitHub o agrega la variable de entorno `SKIP_DEPENDENCY_INSTALL=true`.

---

## 💻 Despliegue Alternativo por Terminal (Wrangler CLI)

Si prefieres usar la terminal con `wrangler`:

```bash
# 1. Instalar dependencias y compilar
npm install
npm run build

# 2. Iniciar sesión en Cloudflare
npx wrangler login

# 3. Crear el espacio KV (si aún no lo creaste)
npx wrangler kv namespace create RECETARIO_KV

# 4. Desplegar en Cloudflare Pages
npx wrangler pages deploy dist --project-name recetario-medico
```

---

## 🔄 ¿Cómo funciona el guardado en Workers KV?

La función serverless `/functions/api/kv/[[route]].ts` organiza tus datos de forma estructurada en Cloudflare KV:
* `doc:doctor_{userId}`: Perfil del médico, cédula, membrete, consultorio y opciones rápidas configuradas.
* `col:patients:list:{userId}`: Lista indexada en tiempo real de todos tus pacientes.
* `col:prescriptions:list:{userId}`: Historial completo de recetas emitidas.
* `col:medications_catalog:list:{userId}`: Catálogo de fórmulas magistrales y medicamentos comerciales.

¡Tu aplicación ya está 100% lista para ser desplegada en la red global de Cloudflare con velocidad ultra rápida y costo cero en el plan gratuito!
