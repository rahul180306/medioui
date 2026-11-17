import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const configuredPort = process.env.PORT ? Number(process.env.PORT) : 3000;
const port = Number.isInteger(configuredPort) && configuredPort >= 0 && configuredPort <= 65535
  ? configuredPort
  : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

// This standalone UI server is an offline demonstration host, not an execution
// backend. Keep legacy URLs explicitly disabled and reject every other API path
// before Vite's SPA fallback can return HTML with a misleading 200 response.
const disabledApiRoutes = new Set([
  'GET /api/gemini/health',
  'GET /api/gemini/key-status',
  'POST /api/gemini/validate-key',
  'POST /api/gemini/clear-key',
  'GET /api/gemini/models',
  'GET /api/dummy-project/files',
  'POST /api/terminal/execute',
  'GET /api/system/resources',
  'GET /api/gemini/status',
  'GET /api/experiential/key-status',
  'POST /api/experiential/save-key',
  'POST /api/experiential/test-call',
  'POST /api/gemini/execute',
  'POST /api/turns',
]);

app.use('/api', (req, res) => {
  const pathname = new URL(req.originalUrl, 'http://127.0.0.1').pathname;
  const route = `${req.method} ${pathname}`;
  if (disabledApiRoutes.has(route)) {
    return res.status(503).json({
      code: 'OFFLINE_API_DISABLED',
      error: 'This endpoint is disabled in the standalone offline demonstration server.',
    });
  }
  return res.status(404).json({ code: 'API_NOT_FOUND', error: 'API route not found.' });
});

if (!isProduction) {
  const vite = await createViteServer({
    root: path.resolve(__dirname, 'mediobot-ui-refinement'),
    server: { middlewareMode: true, hmr: false, ws: false, host: '127.0.0.1' },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distPath)) app.use(express.static(distPath));
  app.use((_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    return res.status(404).send('Not Found');
  });
}

const server = app.listen(port, '127.0.0.1', () => {
  const address = server.address();
  const boundPort = address && typeof address === 'object' ? address.port : port;
  process.stdout.write(`Mediobot offline demo UI listening at http://127.0.0.1:${boundPort}\n`);
});
