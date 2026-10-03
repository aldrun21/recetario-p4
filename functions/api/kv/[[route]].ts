import type { PagesFunction, KVNamespace } from '../../types';

interface Env {
  RECETARIO_KV?: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: CORS_HEADERS
  });
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const kv = env.RECETARIO_KV;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Health check endpoint
  if (pathname === '/api/kv/health') {
    return jsonResponse({
      status: 'ok',
      kvConfigured: Boolean(kv),
      provider: 'cloudflare_workers_kv',
      timestamp: new Date().toISOString()
    });
  }

  if (!kv) {
    return errorResponse(
      'Cloudflare Workers KV no está vinculado. Por favor, vincula "RECETARIO_KV" en Configuración de Cloudflare Pages > Funciones > Enlaces de espacio de nombres KV.',
      503
    );
  }

  try {
    // 1. Single Document Route: /api/kv/doc/:key
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

    // 2. Collection Route: /api/kv/collections/:name (and with optional /:id)
    const colMatch = pathname.match(/^\/api\/kv\/collections\/([^\/]+)(?:\/([^\/]+))?$/);
    if (colMatch) {
      const collection = colMatch[1];
      const docId = colMatch[2];
      const userId = url.searchParams.get('userId') || 'karolt';

      const listKey = `col:${collection}:list:${userId}`;

      // A. LIST ALL DOCUMENTS IN COLLECTION
      if (!docId && request.method === 'GET') {
        const list = await kv.get(listKey, 'json');
        if (Array.isArray(list)) {
          return jsonResponse(list);
        }

        // Fallback: list by prefix if listKey was empty
        const listed = await kv.list({ prefix: `col:${collection}:${userId}:` });
        const items = await Promise.all(
          listed.keys.map(k => kv.get(k.name, 'json'))
        );
        const validItems = items.filter(Boolean);
        // Save back index for fast future reads
        if (validItems.length > 0) {
          await kv.put(listKey, JSON.stringify(validItems));
        }
        return jsonResponse(validItems);
      }

      // B. CREATE DOCUMENT IN COLLECTION
      if (!docId && request.method === 'POST') {
        const body = (await request.json()) as Record<string, any>;
        const newId = body.id || (crypto.randomUUID ? crypto.randomUUID() : 'doc_' + Date.now());
        const timestamp = new Date().toISOString();

        const newDoc = {
          ...body,
          id: newId,
          createdAt: body.createdAt || timestamp,
          createdBy: userId
        };

        // Save individual key
        await kv.put(`col:${collection}:${userId}:${newId}`, JSON.stringify(newDoc));

        // Update list cache
        const currentList = (await kv.get(listKey, 'json')) || [];
        const updatedList = [newDoc, ...(Array.isArray(currentList) ? currentList : [])];
        await kv.put(listKey, JSON.stringify(updatedList));

        return jsonResponse(newDoc, 201);
      }

      // C. UPDATE DOCUMENT
      if (docId && (request.method === 'PUT' || request.method === 'PATCH')) {
        const body = (await request.json()) as Record<string, any>;
        const singleKey = `col:${collection}:${userId}:${docId}`;

        const existing = (await kv.get(singleKey, 'json')) || {};
        const updatedDoc = {
          ...existing,
          ...body,
          id: docId,
          updatedAt: new Date().toISOString()
        };

        await kv.put(singleKey, JSON.stringify(updatedDoc));

        // Update in list cache
        const currentList = (await kv.get(listKey, 'json')) || [];
        if (Array.isArray(currentList)) {
          const updatedList = currentList.map(item => (item.id === docId ? updatedDoc : item));
          await kv.put(listKey, JSON.stringify(updatedList));
        }

        return jsonResponse(updatedDoc);
      }

      // D. DELETE DOCUMENT
      if (docId && request.method === 'DELETE') {
        const singleKey = `col:${collection}:${userId}:${docId}`;
        await kv.delete(singleKey);

        // Remove from list cache
        const currentList = (await kv.get(listKey, 'json')) || [];
        if (Array.isArray(currentList)) {
          const updatedList = currentList.filter(item => item.id !== docId);
          await kv.put(listKey, JSON.stringify(updatedList));
        }

        return jsonResponse({ success: true, deletedId: docId });
      }

      // E. GET SINGLE DOCUMENT
      if (docId && request.method === 'GET') {
        const singleKey = `col:${collection}:${userId}:${docId}`;
        const doc = await kv.get(singleKey, 'json');
        if (!doc) {
          return errorResponse('Documento no encontrado', 404);
        }
        return jsonResponse(doc);
      }
    }

    return errorResponse(`Ruta no encontrada: ${pathname}`, 404);
  } catch (error: any) {
    console.error('Error en Cloudflare Workers KV API:', error);
    return errorResponse(error.message || 'Error interno en Cloudflare Workers KV', 500);
  }
};
