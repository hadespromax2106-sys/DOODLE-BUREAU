import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = import.meta.dirname;
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const DIST_INDEX = path.resolve(DIST_DIR, 'index.html');

async function createAppServer(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'doodle-bureau-arena',
      uptimeSec: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });

  const isDev =
    process.env.NODE_ENV === 'development' ||
    (process.env.NODE_ENV !== 'production' && !fs.existsSync(DIST_INDEX));

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR, { maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.sendFile(DIST_INDEX);
    });
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`Doodle Bureau server listening on http://${HOST}:${PORT}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
