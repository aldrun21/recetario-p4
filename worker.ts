import { GoogleGenAI } from '@google/genai';

export interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expiration?: number; expirationTtl?: number; metadata?: any }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; expiration?: number; metadata?: any }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface Env {
  RECETARIO_KV?: KVNamespace;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  GEMINI_API_KEY?: string;
  [key: string]: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: CORS_HEADERS,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle OPTIONS CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. API ROUTES (/api/*)
    if (pathname.startsWith('/api/')) {
      // Health check endpoint
      if (pathname === '/api/kv/health') {
        return jsonResponse({
          status: 'ok',
          kvConfigured: Boolean(env.RECETARIO_KV),
          provider: 'cloudflare_workers_kv',
          timestamp: new Date().toISOString(),
        });
      }

      // Gemini AI endpoint
      if (pathname === '/api/gemini/generate' && request.method === 'POST') {
        try {
          const geminiApiKey = env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            return errorResponse('GEMINI_API_KEY no configurado en Cloudflare Worker.', 500);
          }
          const body = (await request.json()) as any;
          const { prompt, systemInstruction } = body;
          const ai = new GoogleGenAI({
            apiKey: geminiApiKey,
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build-cloudflare-worker' },
            },
          });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction:
                systemInstruction ||
                'Eres un asistente médico inteligente para redacción de recetas y análisis clínico dermatológico.',
            },
          });
          return jsonResponse({ text: response.text });
        } catch (err: any) {
          return errorResponse(err.message || 'Error en Gemini AI', 500);
        }
      }

      // KV Data Routes
      const kv = env.RECETARIO_KV;
      if (!kv) {
        return errorResponse(
          'Cloudflare Workers KV no está vinculado. Por favor vincula RECETARIO_KV en la configuración de tu Worker.',
          503
        );
      }

      // Route: /api/kv/doc/:key
      const docMatch = pathname.match(/^\/api\/kv\/doc\/(.+)$/);
      if (docMatch) {
        const docKey = decodeURIComponent(docMatch[1]);
        if (request.method === 'GET') {
          const data = await kv.get(`doc:${docKey}`, 'json');
          return jsonResponse(data || null);
        }
        if (request.method === 'PUT' || request.method === 'POST') {
          const body = await request.json();
          await kv.put(`doc:${docKey}`, JSON.stringify(body));
          return jsonResponse({ success: true, key: docKey });
        }
        if (request.method === 'DELETE') {
          await kv.delete(`doc:${docKey}`);
          return jsonResponse({ success: true, deleted: docKey });
        }
      }

      // Route: /api/kv/collections/:name (and optional /:id)
      const colMatch = pathname.match(/^\/api\/kv\/collections\/([^\/]+)(?:\/([^\/]+))?$/);
      if (colMatch) {
        const collection = colMatch[1];
        const docId = colMatch[2];
        const userId = url.searchParams.get('userId') || 'karolt';
        const listKey = `col:${collection}:list:${userId}`;

        // LIST ALL
        if (!docId && request.method === 'GET') {
          const list = await kv.get(listKey, 'json');
          if (Array.isArray(list)) {
            return jsonResponse(list);
          }
          const listed = await kv.list({ prefix: `col:${collection}:${userId}:` });
          const items = await Promise.all(listed.keys.map((k) => kv.get(k.name, 'json')));
          const validItems = items.filter(Boolean);
          if (validItems.length > 0) {
            await kv.put(listKey, JSON.stringify(validItems));
          }
          return jsonResponse(validItems);
        }

        // CREATE
        if (!docId && request.method === 'POST') {
          const body = (await request.json()) as Record<string, any>;
          const newId = body.id || (crypto.randomUUID ? crypto.randomUUID() : 'doc_' + Date.now());
          const timestamp = new Date().toISOString();
          const newDoc = {
            ...body,
            id: newId,
            createdAt: body.createdAt || timestamp,
            createdBy: userId,
          };
          await kv.put(`col:${collection}:${userId}:${newId}`, JSON.stringify(newDoc));
          const currentList = (await kv.get(listKey, 'json')) || [];
          const updatedList = [newDoc, ...(Array.isArray(currentList) ? currentList : [])];
          await kv.put(listKey, JSON.stringify(updatedList));
          return jsonResponse(newDoc, 201);
        }

        // UPDATE
        if (docId && (request.method === 'PUT' || request.method === 'PATCH')) {
          const body = (await request.json()) as Record<string, any>;
          const singleKey = `col:${collection}:${userId}:${docId}`;
          const existing = (await kv.get(singleKey, 'json')) || {};
          const updatedDoc = {
            ...existing,
            ...body,
            id: docId,
            updatedAt: new Date().toISOString(),
          };
          await kv.put(singleKey, JSON.stringify(updatedDoc));
          const currentList = (await kv.get(listKey, 'json')) || [];
          if (Array.isArray(currentList)) {
            const updatedList = currentList.map((item: any) => (item.id === docId ? updatedDoc : item));
            await kv.put(listKey, JSON.stringify(updatedList));
          }
          return jsonResponse(updatedDoc);
        }

        // DELETE
        if (docId && request.method === 'DELETE') {
          const singleKey = `col:${collection}:${userId}:${docId}`;
          await kv.delete(singleKey);
          const currentList = (await kv.get(listKey, 'json')) || [];
          if (Array.isArray(currentList)) {
            const updatedList = currentList.filter((item: any) => item.id !== docId);
            await kv.put(listKey, JSON.stringify(updatedList));
          }
          return jsonResponse({ success: true, deletedId: docId });
        }

        // GET SINGLE
        if (docId && request.method === 'GET') {
          const singleKey = `col:${collection}:${userId}:${docId}`;
          const doc = await kv.get(singleKey, 'json');
          if (!doc) {
            return errorResponse('Documento no encontrado', 404);
          }
          return jsonResponse(doc);
        }
      }

      return errorResponse(`Ruta API no encontrada: ${pathname}`, 404);
    }

    // 2. STATIC ASSETS SERVING & SPA FALLBACK
    if (env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return assetResponse;
        }
        // Fallback to index.html for Single Page App client routing
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      } catch (err) {
        console.error('Error al servir asset desde Worker:', err);
      }
    }

    return new Response('Recetario Médico Dermatológico Worker activo.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
