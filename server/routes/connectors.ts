import express, { Request, Response } from 'express';
import { db } from '../db/database.ts';

export const connectorsRouter = express.Router();

/**
 * GET /api/connectors
 * List all connectors with summary statistics
 */
connectorsRouter.get('/', (req: Request, res: Response) => {
  try {
    const connectors = db.getAllConnectors();
    const analytics = db.getAnalytics(90);

    // Decorate each connector with its request count and last used date
    const enriched = connectors.map((c) => {
      const connStat = analytics.requestsByConnector.find((s) => s.id === c.id);
      const logs = db.getLogs({ connectorId: c.id, limit: 1 }).logs;
      const lastUsed = logs.length > 0 ? logs[0].timestamp : undefined;

      return {
        ...c,
        requestsCount: connStat ? connStat.count : 0,
        successRate: connStat ? connStat.successRate : 100,
        lastUsedAt: lastUsed,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/connectors
 * Create a new connector
 */
connectorsRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      provider,
      model,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 2048,
      status = 'active',
      inputs = [],
      outputSchemaJson,
      outputSchemaDescription,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'API Name is required.' },
      });
    }

    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Provider and Model are required.' },
      });
    }

    if (!systemPrompt || !systemPrompt.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'System instructions/prompt are required.' },
      });
    }

    // Auto-generate slug from name if not provided
    const safeSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const result = db.saveConnector({
      name: name.trim(),
      slug: safeSlug,
      description: (description || '').trim(),
      provider: provider.trim(),
      model: model.trim(),
      systemPrompt: systemPrompt.trim(),
      temperature: Number(temperature),
      maxTokens: Number(maxTokens),
      status: status === 'disabled' ? 'disabled' : 'active',
      inputs,
      outputSchemaJson,
      outputSchemaDescription,
    });

    res.status(201).json({
      success: true,
      data: result.connector,
      generatedApiKey: result.generatedRawApiKey,
      message: 'Connector created successfully.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/connectors/:id
 * Retrieve a single connector by ID
 */
connectorsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const connector = db.getConnectorById(req.params.id);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connector not found.' },
      });
    }

    const logs = db.getLogs({ connectorId: connector.id, limit: 10 });
    res.json({
      success: true,
      data: {
        ...connector,
        recentLogs: logs.logs,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

/**
 * PUT /api/connectors/:id
 * Update an existing connector
 */
connectorsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.getConnectorById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connector not found.' },
      });
    }

    const {
      name,
      slug,
      description,
      provider,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      status,
      inputs,
      outputSchemaJson,
      outputSchemaDescription,
    } = req.body;

    const safeSlug = (slug || name || existing.slug)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const result = db.saveConnector({
      id: req.params.id,
      name: (name || existing.name).trim(),
      slug: safeSlug,
      description: description !== undefined ? description.trim() : existing.description,
      provider: provider || existing.provider,
      model: model || existing.model,
      systemPrompt: systemPrompt !== undefined ? systemPrompt.trim() : existing.systemPrompt,
      temperature: temperature !== undefined ? Number(temperature) : existing.temperature,
      maxTokens: maxTokens !== undefined ? Number(maxTokens) : existing.maxTokens,
      status: status || existing.status,
      inputs: inputs !== undefined ? inputs : existing.inputs,
      outputSchemaJson: outputSchemaJson !== undefined ? outputSchemaJson : existing.outputSchema?.rawSchemaJson,
      outputSchemaDescription: outputSchemaDescription !== undefined ? outputSchemaDescription : existing.outputSchema?.description,
    });

    res.json({
      success: true,
      data: result.connector,
      message: 'Connector updated successfully.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

/**
 * DELETE /api/connectors/:id
 * Delete connector
 */
connectorsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteConnector(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connector not found.' },
      });
    }
    res.json({ success: true, message: 'Connector deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message },
    });
  }
});

/**
 * PATCH /api/connectors/:id/status
 * Toggle connector status
 */
connectorsRouter.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const updated = db.toggleConnectorStatus(req.params.id);
    res.json({
      success: true,
      data: updated,
      message: `Connector ${updated.status === 'active' ? 'activated' : 'disabled'} successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'STATUS_ERROR', message: error.message },
    });
  }
});

/**
 * POST /api/connectors/:id/keys
 * Generate a new API Key
 */
connectorsRouter.post('/:id/keys', (req: Request, res: Response) => {
  try {
    const name = req.body.name || 'API Key';
    const { apiKey, rawKey } = db.generateApiKey(req.params.id, name);
    res.status(201).json({
      success: true,
      data: {
        apiKey,
        rawKey, // Only shown once at creation!
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'KEY_GEN_ERROR', message: error.message },
    });
  }
});

/**
 * DELETE /api/connectors/:id/keys/:keyId
 * Revoke an API Key
 */
connectorsRouter.delete('/:id/keys/:keyId', (req: Request, res: Response) => {
  try {
    const revoked = db.revokeApiKey(req.params.keyId);
    if (!revoked) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'API key not found.' },
      });
    }
    res.json({ success: true, message: 'API key revoked successfully.' });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'KEY_REVOKE_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/connectors/:id/logs
 * Retrieve request logs for a specific connector
 */
connectorsRouter.get('/:id/logs', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const success = req.query.success !== undefined ? req.query.success === 'true' : undefined;

    const result = db.getLogs({
      connectorId: req.params.id,
      limit,
      offset,
      success,
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

/**
 * GET /api/connectors/:id/docs
 * Generate developer documentation payload
 */
connectorsRouter.get('/:id/docs', (req: Request, res: Response) => {
  try {
    const connector = db.getConnectorById(req.params.id);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connector not found.' },
      });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;
    const endpointPath = `/api/run/${connector.slug}`;
    const directPath = `/api/${connector.slug}`;
    const fullUrl = `${baseUrl}${endpointPath}`;

    // Sample request body based on input types
    const sampleBody: Record<string, any> = {};
    const sampleCurlFields: string[] = [];
    const hasFiles = (connector.inputs || []).some((i) => i.type === 'IMAGE' || i.type === 'FILE');

    (connector.inputs || []).forEach((inp) => {
      if (inp.type === 'IMAGE') {
        sampleBody[inp.name] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        sampleCurlFields.push(`-F "${inp.name}=@/path/to/card.png"`);
      } else if (inp.type === 'FILE') {
        sampleCurlFields.push(`-F "${inp.name}=@/path/to/document.pdf"`);
      } else if (inp.type === 'NUMBER') {
        sampleBody[inp.name] = inp.defaultValue ? Number(inp.defaultValue) : 100;
        sampleCurlFields.push(`-F "${inp.name}=${sampleBody[inp.name]}"`);
      } else if (inp.type === 'BOOLEAN') {
        sampleBody[inp.name] = inp.defaultValue !== undefined ? inp.defaultValue === 'true' || inp.defaultValue === true : true;
        sampleCurlFields.push(`-F "${inp.name}=${sampleBody[inp.name]}"`);
      } else if (inp.type === 'JSON') {
        try {
          sampleBody[inp.name] = inp.defaultValue ? JSON.parse(inp.defaultValue) : { optionA: true };
        } catch {
          sampleBody[inp.name] = { sample: 'value' };
        }
        sampleCurlFields.push(`-F "${inp.name}='${JSON.stringify(sampleBody[inp.name])}'"`);
      } else {
        sampleBody[inp.name] = inp.defaultValue || `Sample ${inp.label || inp.name}`;
        sampleCurlFields.push(`-F "${inp.name}=${sampleBody[inp.name]}"`);
      }
    });

    const activeKey = (connector.apiKeys || []).find((k) => !k.isRevoked);
    const keyPlaceholder = activeKey ? `${activeKey.keyPrefix}...` : 'YOUR_API_KEY';

    let curlExample = '';
    if (hasFiles) {
      curlExample = `curl -X POST "${fullUrl}" \\\n  -H "Authorization: Bearer ${keyPlaceholder}" \\\n  ${sampleCurlFields.join(' \\\n  ')}`;
    } else {
      curlExample = `curl -X POST "${fullUrl}" \\\n  -H "Authorization: Bearer ${keyPlaceholder}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(sampleBody, null, 2)}'`;
    }

    const docs = {
      name: connector.name,
      description: connector.description,
      slug: connector.slug,
      endpoint: endpointPath,
      directEndpoint: directPath,
      fullUrl,
      httpMethod: 'POST',
      provider: connector.provider,
      model: connector.model,
      status: connector.status,
      contentType: hasFiles ? 'multipart/form-data (or application/json with base64)' : 'application/json',
      auth: {
        type: 'Bearer Token or Header',
        headers: [
          { name: 'Authorization', value: 'Bearer YOUR_API_KEY', required: true },
          { name: 'x-api-key', value: 'YOUR_API_KEY', required: false, description: 'Alternative to Authorization header' },
        ],
      },
      parameters: connector.inputs || [],
      outputSchema: connector.outputSchema?.rawSchemaJson ? JSON.parse(connector.outputSchema.rawSchemaJson) : null,
      curlExample,
      sampleRequestBody: sampleBody,
      sampleSuccessResponse: {
        success: true,
        data: connector.outputSchema?.rawSchemaJson
          ? JSON.parse(connector.outputSchema.rawSchemaJson)
          : { status: 'completed' },
        meta: {
          connector: connector.name,
          slug: connector.slug,
          provider: connector.provider,
          model: connector.model,
          latencyMs: 842,
          tokens: { input: 120, output: 85, total: 205 },
        },
        error: null,
      },
      errorResponses: [
        {
          status: 400,
          description: 'Validation error (missing field, wrong type, invalid JSON)',
          example: {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input parameters.',
              details: [{ field: 'topic', message: 'Field "topic" is required.' }],
            },
          },
        },
        {
          status: 401,
          description: 'Authentication failure',
          example: {
            success: false,
            data: null,
            error: {
              code: 'INVALID_API_KEY',
              message: 'The provided API key is invalid or revoked.',
            },
          },
        },
        {
          status: 403,
          description: 'Connector disabled by admin',
          example: {
            success: false,
            data: null,
            error: {
              code: 'CONNECTOR_DISABLED',
              message: 'This connector has been deactivated by its administrator.',
            },
          },
        },
        {
          status: 502,
          description: 'Upstream AI provider error',
          example: {
            success: false,
            data: null,
            error: {
              code: 'PROVIDER_ERROR',
              message: 'The AI provider failed to process the request.',
            },
          },
        },
      ],
    };

    res.json({ success: true, data: docs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DOCS_ERROR', message: error.message },
    });
  }
});
