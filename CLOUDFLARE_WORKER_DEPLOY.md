# ⚡ Guía de Despliegue en Cloudflare Workers

Tu aplicación ahora está 100% configurada como **Cloudflare Worker con Static Assets (Vite + API + KV)**.

---

## 🛠️ Cómo funciona esta arquitectura
1. **Frontend (Vite React):** Se compila en la carpeta `dist/`.
2. **Entry-point (`worker.ts`):** 
   * Sirve todos los archivos estáticos de la app React desde `dist/`.
   * Enruta automáticamente cualquier subpágina (SPA) hacia `index.html`.
   * Procesa las llamadas API a Cloudflare Workers KV en `/api/kv/*`.
   * Procesa las llamadas al Asistente Inteligente Gemini en `/api/gemini/generate`.
3. **Base de Datos KV:** Vinculada automáticamente al namespace `RECETARIO_KV`.

---

## 🚀 Método 1: Despliegue desde tu Computadora / Terminal (Recomendado y más rápido)

Si tienes el repositorio clonado en tu máquina:
```bash
# 1. Iniciar sesión en Cloudflare (solo la primera vez)
npx wrangler login

# 2. Desplegar todo el Worker + Frontend compilado
npm run deploy
```
¡Listo! Wrangler compilará Vite, subirá los assets y desplegará tu Worker en `https://recetario-1.ccclaco.workers.dev`.

---

## 🌐 Método 2: Despliegue Automático con Cloudflare Workers (Git / Dashboard)

Si conectas tu repositorio de GitHub directamente a Cloudflare Workers:
1. En el panel de Cloudflare, ve a **Workers y Pages** > **Crear**.
2. Selecciona **Workers** > **Conectar a Git** (o usa el Worker `recetario-1` existente).
3. Configura los comandos:
   * **Build command:** `npm install --legacy-peer-deps && npm run build`
   * **Deploy command:** `npx wrangler deploy`
4. En **Settings** > **Variables / Bindings**:
   * Agrega el **KV Namespace Binding**:
     * **Variable Name:** `RECETARIO_KV`
     * **KV Namespace:** `RECETARIO_KV` (ID: `52547dd2027844989673e0ec5692db0f`)
   * *(Opcional)* Agrega la variable de entorno `GEMINI_API_KEY` para el asistente IA.

---

## 🔗 URL de tu Worker
Al terminar, tu sistema completo de recetas médicas estará activo en:
👉 **`https://recetario-1.ccclaco.workers.dev`**
