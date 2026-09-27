import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { connectorsRouter } from './server/routes/connectors.ts';
import { executionRouter } from './server/routes/execution.ts';
import { analyticsRouter } from './server/routes/analytics.ts';
import { providersRouter } from './server/routes/providers.ts';
import { db } from './server/db/database.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Basic security and parsing middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Custom security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
});

// Core API routes
app.use('/api/connectors', connectorsRouter);
app.use('/api/providers', providersRouter);
app.use('/api', analyticsRouter);
app.use('/api', executionRouter);

// Direct dynamic generated endpoint support: POST /api/:slug (e.g. POST /api/card-scanner)
// If the slug is not one of the registered API keywords, route to execution
const reservedWords = new Set([
  'connectors',
  'providers',
  'analytics',
  'logs',
  'health',
  'run',
]);

app.post('/api/:slug', (req: Request, res: Response, next: NextFunction) => {
  const slug = req.params.slug;
  if (reservedWords.has(slug)) {
    return next();
  }
  // Check if connector exists with this slug
  const connector = db.getConnectorBySlug(slug);
  if (connector) {
    // Forward to execution handler
    req.url = `/run/${slug}`;
    return executionRouter(req, res, next);
  }
  next();
});

// Centralized error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    },
  });
});

// Frontend serving
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[API HUB] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
