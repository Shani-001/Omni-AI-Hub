import express, { Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db/database.ts';
import { extractApiKey, authenticateConnectorRequest } from '../engine/auth.ts';
import { validateDynamicInputs } from '../engine/dynamicInput.ts';
import { buildExecutionPrompt } from '../engine/promptBuilder.ts';
import { validateAndNormalizeOutput } from '../engine/schemaValidator.ts';
import { providerRegistry } from '../providers/registry.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
});

export const executionRouter = express.Router();

/**
 * Core dynamic execution handler
 */
async function handleConnectorExecution(req: Request, res: Response, isDirectSlug = false) {
  const startTime = Date.now();
  const slugOrId = req.params.slug || req.params.id;

  if (!slugOrId) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'BAD_REQUEST', message: 'Connector slug or ID is required.' },
    });
  }

  // Find connector by slug or ID
  const connector = db.getConnectorBySlug(slugOrId) || db.getConnectorById(slugOrId);

  if (!connector) {
    return res.status(404).json({
      success: false,
      data: null,
      error: {
        code: 'CONNECTOR_NOT_FOUND',
        message: `No connector found matching identifier "${slugOrId}".`,
      },
    });
  }

  // Check if disabled
  if (connector.status === 'disabled') {
    db.addLog({
      connectorId: connector.id,
      connectorName: connector.name,
      status: 403,
      success: false,
      responseTimeMs: Date.now() - startTime,
      provider: connector.provider,
      model: connector.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      errorType: 'CONNECTOR_DISABLED',
      errorMessage: 'This connector is currently disabled by an administrator.',
    });

    return res.status(403).json({
      success: false,
      data: null,
      error: {
        code: 'CONNECTOR_DISABLED',
        message: 'This connector has been deactivated by its administrator.',
      },
    });
  }

  // Authenticate API Key
  // If internal test playground header `x-admin-playground: true` is present, bypass key check for admin convenience, otherwise strictly require API key
  const isPlayground = req.headers['x-admin-playground'] === 'true';
  const rawApiKey = extractApiKey(req);

  if (!isPlayground) {
    const authResult = authenticateConnectorRequest(connector.id, rawApiKey);
    if (!authResult.authenticated) {
      db.addLog({
        connectorId: connector.id,
        connectorName: connector.name,
        status: 401,
        success: false,
        responseTimeMs: Date.now() - startTime,
        provider: connector.provider,
        model: connector.model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        errorType: authResult.code || 'UNAUTHORIZED',
        errorMessage: authResult.message,
      });

      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: authResult.code,
          message: authResult.message,
        },
      });
    }
  }

  // Validate incoming dynamic inputs
  const uploadedFiles = req.files as Express.Multer.File[] | undefined;
  const validationResult = validateDynamicInputs(
    connector.inputs || [],
    req.body || {},
    uploadedFiles
  );

  if (!validationResult.isValid) {
    const latency = Date.now() - startTime;
    const errorDetails = validationResult.errors.map((e) => `${e.field}: ${e.message}`).join('; ');

    db.addLog({
      connectorId: connector.id,
      connectorName: connector.name,
      status: 400,
      success: false,
      responseTimeMs: latency,
      provider: connector.provider,
      model: connector.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      errorType: 'VALIDATION_ERROR',
      errorMessage: errorDetails,
      requestMetadata: {
        endpoint: req.originalUrl,
        method: req.method,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
        inputKeys: Object.keys(req.body || {}),
        fileCounts: uploadedFiles ? uploadedFiles.length : 0,
      },
    });

    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters.',
        details: validationResult.errors,
      },
    });
  }

  // Build prompt
  const { systemInstruction, userPrompt } = buildExecutionPrompt({
    systemPrompt: connector.systemPrompt,
    inputsConfig: connector.inputs || [],
    inputValues: validationResult.values,
    outputSchemaJson: connector.outputSchema?.rawSchemaJson,
  });

  // Call chosen AI provider adapter with safe retry for transient errors
  try {
    const provider = providerRegistry.getProvider(connector.provider);

    const effectiveModel =
      (req.headers['x-model-override'] as string) ||
      (req.body?.__modelOverride as string) ||
      connector.model;

    let providerResult;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        providerResult = await provider.execute({
          model: effectiveModel,
          systemPrompt: systemInstruction,
          userPrompt,
          temperature: connector.temperature,
          maxTokens: connector.maxTokens,
          files: validationResult.files,
          jsonSchema: connector.outputSchema?.rawSchemaJson,
        });
        break;
      } catch (err: any) {
        const isTransient = err.message.includes('503') || err.message.includes('high demand') || err.message.includes('timeout') || err.message.includes('429');
        if (attempts < maxAttempts && isTransient) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }
    }

    if (!providerResult) {
      throw new Error('Provider returned empty result.');
    }

    // Validate and normalize output schema
    const outputValidation = validateAndNormalizeOutput(
      providerResult.parsedOutput,
      connector.outputSchema?.rawSchemaJson
    );

    const latency = Date.now() - startTime;

    // Log successful request
    db.addLog({
      connectorId: connector.id,
      connectorName: connector.name,
      status: 200,
      success: true,
      responseTimeMs: latency,
      provider: connector.provider,
      model: providerResult.model || effectiveModel,
      inputTokens: providerResult.inputTokens,
      outputTokens: providerResult.outputTokens,
      totalTokens: providerResult.totalTokens,
      estimatedCost: providerResult.estimatedCost,
      requestMetadata: {
        endpoint: req.originalUrl,
        method: req.method,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
        inputKeys: Object.keys(validationResult.values),
        fileCounts: validationResult.files.length,
      },
      responseMetadata: {
        dataSnippet: JSON.stringify(outputValidation.normalizedData).substring(0, 200),
        keysExtracted: outputValidation.normalizedData && typeof outputValidation.normalizedData === 'object'
          ? Object.keys(outputValidation.normalizedData)
          : [],
      },
    });

    return res.status(200).json({
      success: true,
      data: outputValidation.normalizedData,
      meta: {
        connector: connector.name,
        slug: connector.slug,
        provider: connector.provider,
        model: providerResult.model || effectiveModel,
        latencyMs: latency,
        tokens: {
          input: providerResult.inputTokens,
          output: providerResult.outputTokens,
          total: providerResult.totalTokens,
        },
      },
      error: null,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    const errorMessage = error?.message || 'AI provider execution failed.';

    let errorCode = 'PROVIDER_ERROR';
    let statusCode = 502;

    if (errorMessage.includes('timed out') || errorMessage.includes('TIMEOUT')) {
      errorCode = 'PROVIDER_TIMEOUT';
      statusCode = 504;
    } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      statusCode = 429;
    } else if (
      errorMessage.includes('503') ||
      errorMessage.includes('high demand') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('spikes in demand')
    ) {
      errorCode = 'UPSTREAM_HIGH_DEMAND';
      statusCode = 503;
    } else if (errorMessage.includes('not configured')) {
      errorCode = 'PROVIDER_NOT_CONFIGURED';
      statusCode = 503;
    }

    db.addLog({
      connectorId: connector.id,
      connectorName: connector.name,
      status: statusCode,
      success: false,
      responseTimeMs: latency,
      provider: connector.provider,
      model: connector.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      errorType: errorCode,
      errorMessage,
      requestMetadata: {
        endpoint: req.originalUrl,
        method: req.method,
        clientIp: req.ip,
        userAgent: req.get('user-agent'),
        inputKeys: Object.keys(validationResult.values),
      },
    });

    return res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
  }
}

// Generated dynamic endpoint: POST /api/run/:slug
executionRouter.post('/run/:slug', upload.any(), (req: Request, res: Response) => {
  handleConnectorExecution(req, res);
});

// Playground test endpoint: POST /api/connectors/:id/test
executionRouter.post('/connectors/:id/test', upload.any(), (req: Request, res: Response) => {
  handleConnectorExecution(req, res);
});
