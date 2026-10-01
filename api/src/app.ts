import path from 'node:path';
import express, { type Express } from 'express';
import { errorHandler, notFound } from './common/errors.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', notFound);

  if (env.NODE_ENV === 'production') {
    // Same relative depth from src/ (tsx) and dist/ (node).
    const webDist = path.join(import.meta.dirname, '../../web/dist');
    app.use(express.static(webDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile('index.html', { root: webDist });
    });
  }

  app.use(errorHandler);
  return app;
}
