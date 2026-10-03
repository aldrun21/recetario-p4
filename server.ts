import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini Client
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for Gemini generation
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!geminiApiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY no configurado en el servidor." });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "Eres un asistente médico inteligente para redacción de recetas y análisis clínico."
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Error interno al comunicarse con Gemini" });
    }
  });

  // Cloudflare Workers KV API Simulator (for local dev & preview)
  const localKvStore: Record<string, any> = {};
  const kvDataFile = path.resolve(__dirname, 'kv-storage-dev.json');
  if (fs.existsSync(kvDataFile)) {
    try {
      Object.assign(localKvStore, JSON.parse(fs.readFileSync(kvDataFile, 'utf-8')));
    } catch (e) {
      console.error("Error reading local kv store:", e);
    }
  }

  function persistKv() {
    try {
      fs.writeFileSync(kvDataFile, JSON.stringify(localKvStore, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error persisting local kv store:", e);
    }
  }

  // Health check for KV
  app.get('/api/kv/health', (req, res) => {
    res.json({
      status: 'ok',
      kvConfigured: true,
      provider: 'cloudflare_workers_kv',
      environment: isProd ? 'production' : 'development',
      timestamp: new Date().toISOString()
    });
  });

  // Doc route: /api/kv/doc/:key
  app.get('/api/kv/doc/:key', (req, res) => {
    const key = req.params.key;
    const data = localKvStore[`doc:${key}`];
    res.json(data || null);
  });

  app.put('/api/kv/doc/:key', (req, res) => {
    const key = req.params.key;
    localKvStore[`doc:${key}`] = req.body;
    persistKv();
    res.json({ success: true, key });
  });

  app.post('/api/kv/doc/:key', (req, res) => {
    const key = req.params.key;
    localKvStore[`doc:${key}`] = req.body;
    persistKv();
    res.json({ success: true, key });
  });

  // Collection list: GET /api/kv/collections/:name
  app.get('/api/kv/collections/:name', (req, res) => {
    const collection = req.params.name;
    const userId = (req.query.userId as string) || 'karolt';
    const listKey = `col:${collection}:list:${userId}`;
    const list = localKvStore[listKey] || [];
    res.json(list);
  });

  // Collection create: POST /api/kv/collections/:name
  app.post('/api/kv/collections/:name', (req, res) => {
    const collection = req.params.name;
    const userId = (req.query.userId as string) || (req.body.createdBy as string) || 'karolt';
    const newId = req.body.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDoc = {
      ...req.body,
      id: newId,
      createdAt: req.body.createdAt || new Date().toISOString(),
      createdBy: userId
    };

    const singleKey = `col:${collection}:${userId}:${newId}`;
    localKvStore[singleKey] = newDoc;

    const listKey = `col:${collection}:list:${userId}`;
    const currentList = localKvStore[listKey] || [];
    localKvStore[listKey] = [newDoc, ...currentList];
    persistKv();

    res.status(201).json(newDoc);
  });

  // Collection update: PUT /api/kv/collections/:name/:id
  app.put('/api/kv/collections/:name/:id', (req, res) => {
    const collection = req.params.name;
    const docId = req.params.id;
    const userId = (req.query.userId as string) || 'karolt';

    const singleKey = `col:${collection}:${userId}:${docId}`;
    const existing = localKvStore[singleKey] || {};
    const updatedDoc = {
      ...existing,
      ...req.body,
      id: docId,
      updatedAt: new Date().toISOString()
    };
    localKvStore[singleKey] = updatedDoc;

    const listKey = `col:${collection}:list:${userId}`;
    const currentList = localKvStore[listKey] || [];
    localKvStore[listKey] = currentList.map((item: any) => (item.id === docId ? updatedDoc : item));
    persistKv();

    res.json(updatedDoc);
  });

  // Collection delete: DELETE /api/kv/collections/:name/:id
  app.delete('/api/kv/collections/:name/:id', (req, res) => {
    const collection = req.params.name;
    const docId = req.params.id;
    const userId = (req.query.userId as string) || 'karolt';

    const singleKey = `col:${collection}:${userId}:${docId}`;
    delete localKvStore[singleKey];

    const listKey = `col:${collection}:list:${userId}`;
    const currentList = localKvStore[listKey] || [];
    localKvStore[listKey] = currentList.filter((item: any) => item.id !== docId);
    persistKv();

    res.json({ success: true, deletedId: docId });
  });

  // Integrate Vite or Serve Static Files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve production static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
