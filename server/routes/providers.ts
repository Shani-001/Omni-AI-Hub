import express, { Request, Response } from 'express';
import { providerRegistry } from '../providers/registry.ts';

export const providersRouter = express.Router();

/**
 * GET /api/providers
 * Returns all registered AI providers and their configuration status
 */
providersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const list = await providerRegistry.listProviders();
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'PROVIDERS_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/providers/:provider/models
 * Returns models for a specific AI provider
 */
providersRouter.get('/:provider/models', async (req: Request, res: Response) => {
  try {
    const provider = providerRegistry.getProvider(req.params.provider);
    const models = await provider.getModels();
    res.json({ success: true, data: models });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: { code: 'PROVIDER_NOT_FOUND', message: error.message },
    });
  }
});
