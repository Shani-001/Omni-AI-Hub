import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectorsRouter } from '../server/routes/connectors.ts';
import { executionRouter } from '../server/routes/execution.ts';
import { analyticsRouter } from '../server/routes/analytics.ts';
import { providersRouter } from '../server/routes/providers.ts';
import { db } from '../server/db/database.ts';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'vercel-serverless',
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
});

// Core routes - mount with and without /api prefix for Vercel rewrite compatibility
app.use(['/api/connectors', '/connectors'], connectorsRouter);
app.use(['/api/providers', '/providers'], providersRouter);
app.use(['/api', '/'], analyticsRouter);
app.use(['/api', '/'], executionRouter);

// Dynamic short routes
const reserved = new Set(['connectors', 'providers', 'analytics', 'logs', 'health', 'run']);
app.post(['/api/:slug', '/:slug'], (req: Request, res: Response, next: NextFunction) => {
  const slug = req.params.slug;
  if (reserved.has(slug)) return next();
  const connector = db.getConnectorBySlug(slug);
  if (connector) {
    req.url = `/run/${slug}`;
    return executionRouter(req, res, next);
  }
  next();
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  });
});

export default app;
