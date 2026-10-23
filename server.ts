import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // =========================================================================
  // 1. BACKEND PROXY: FRED API (/api/fred)
  // =========================================================================
  app.get('/api/fred', async (req, res) => {
    try {
      const seriesId = req.query.series_id as string;
      if (!seriesId) {
        return res.status(400).json({ error: 'Missing required query parameter: series_id' });
      }

      // Read secret securely from server environment and extract 32-char hex key if user pasted full URL
      const rawKey = (process.env.FRED_API_KEY || '').trim();
      let apiKey = rawKey;
      if (apiKey.includes('api_key=')) {
        const match = apiKey.match(/api_key=([a-f0-9]{32})/i);
        if (match) apiKey = match[1];
      } else {
        const match = apiKey.match(/([a-f0-9]{32})/i);
        if (match) apiKey = match[1];
      }

      if (!apiKey) {
        return res.status(503).json({
          error: 'FRED_API_KEY is not configured on server',
          fallback: true,
        });
      }

      const limit = (req.query.limit as string) || '10';
      const sortOrder = (req.query.sort_order as string) || 'desc';
      const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
        seriesId
      )}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=${encodeURIComponent(
        sortOrder
      )}&limit=${encodeURIComponent(limit)}`;

      const response = await fetch(fredUrl, {
        headers: { Accept: 'application/json' },
      });

      const rawText = await response.text();
      const trimmed = rawText.trim();

      // Guard against FRED returning HTML (e.g. St. Louis Fed site maintenance, Cloudflare, or WAF block)
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return res.status(503).json({
          error: 'FRED API returned non-JSON response (e.g. site maintenance or upstream error)',
          fallback: true,
          status: response.status,
        });
      }

      let data: any;
      try {
        data = JSON.parse(trimmed);
      } catch {
        return res.status(503).json({
          error: 'Failed to parse FRED API response as JSON',
          fallback: true,
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({
          error: `FRED API responded with HTTP ${response.status}`,
          details: data,
          fallback: true,
        });
      }

      return res.json(data);
    } catch (err: any) {
      console.warn('[server] Notice: FRED API proxy encountered an error, falling back:', err?.message || err);
      return res.status(503).json({
        error: 'Failed to fetch data from FRED proxy',
        fallback: true,
        message: err?.message,
      });
    }
  });

  // =========================================================================
  // 2. BACKEND PROXY: GEMINI AI ENGINE (/api/gemini)
  // =========================================================================
  app.post('/api/gemini', async (req, res) => {
    try {
      const { prompt, systemInstruction, stream = false, model = 'gemini-3.8-flash' } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing required field: prompt' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on server',
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseStream = await ai.models.generateContentStream({
          model,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }

        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        return res.json({ text: response.text });
      }
    } catch (err: any) {
      console.error('[server] Error generating Gemini content:', err);
      return res.status(500).json({
        error: 'Failed to generate AI response from Gemini server proxy',
        message: err.message,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasFredKey: Boolean(process.env.FRED_API_KEY),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // =========================================================================
  // 3. VITE MIDDLEWARES & STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Kairos Macro Trading Hub listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[server] Fatal error starting server:', err);
  process.exit(1);
});
