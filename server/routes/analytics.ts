import express, { Request, Response } from 'express';
import { db } from '../db/database.ts';

export const analyticsRouter = express.Router();

/**
 * GET /api/analytics
 * Retrieve aggregated analytics based on actual database logs
 */
analyticsRouter.get('/analytics', (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const analytics = db.getAnalytics(days);
    const connectors = db.getAllConnectors();

    const activeConnectors = connectors.filter((c) => c.status === 'active').length;
    const totalConnectors = connectors.length;

    res.json({
      success: true,
      data: {
        ...analytics,
        totalConnectors,
        activeConnectors,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/logs
 * Retrieve paginated request logs with optional filtering
 */
analyticsRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const connectorId = req.query.connectorId as string | undefined;
    const provider = req.query.provider as string | undefined;
    const success = req.query.success !== undefined ? req.query.success === 'true' : undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const result = db.getLogs({
      connectorId,
      provider,
      success,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'LOGS_ERROR', message: error.message },
    });
  }
});
