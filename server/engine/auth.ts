import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.ts';

export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string') {
    return xApiKey.trim();
  }
  return null;
}

export function authenticateConnectorRequest(connectorId: string, rawKey: string | null) {
  if (!rawKey) {
    return {
      authenticated: false,
      code: 'MISSING_API_KEY',
      message: 'Authentication required. Pass your API key via "Authorization: Bearer <API_KEY>" or "x-api-key" header.',
    };
  }

  const result = db.validateApiKey(rawKey, connectorId);
  if (!result.valid) {
    return {
      authenticated: false,
      code: 'INVALID_API_KEY',
      message: 'The provided API key is invalid, revoked, or not authorized for this connector.',
    };
  }

  return {
    authenticated: true,
    keyRecord: result.keyRecord,
  };
}
