import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseState,
  ConnectorRecord,
  ConnectorInputRecord,
  ConnectorOutputSchemaRecord,
  ApiKeyRecord,
  ApiRequestLogRecord,
} from './schema.ts';
import { seedInitialData } from './seed.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class Database {
  private state: DatabaseState = {
    connectors: [],
    inputs: [],
    outputSchemas: [],
    apiKeys: [],
    logs: [],
  };
  private isLoaded = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        this.isLoaded = true;
      } else {
        // First run: seed with demonstration connectors and realistic initial logs
        this.state = seedInitialData();
        this.persistSync();
        this.isLoaded = true;
      }
    } catch (err) {
      console.error('[DB] Failed to load database file, re-initializing seed:', err);
      this.state = seedInitialData();
      this.persistSync();
      this.isLoaded = true;
    }
  }

  private persistSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to persist database:', err);
    }
  }

  // --- Connectors ---

  public getAllConnectors(): ConnectorRecord[] {
    this.ensureInitialized();
    return this.state.connectors.map((c) => this.attachRelations(c));
  }

  public getConnectorById(id: string): ConnectorRecord | null {
    this.ensureInitialized();
    const conn = this.state.connectors.find((c) => c.id === id);
    if (!conn) return null;
    return this.attachRelations(conn);
  }

  public getConnectorBySlug(slug: string): ConnectorRecord | null {
    this.ensureInitialized();
    const cleanSlug = slug.toLowerCase().trim();
    const conn = this.state.connectors.find((c) => c.slug.toLowerCase() === cleanSlug);
    if (!conn) return null;
    return this.attachRelations(conn);
  }

  private attachRelations(c: ConnectorRecord): ConnectorRecord {
    const inputs = this.state.inputs
      .filter((i) => i.connectorId === c.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const outputSchema = this.state.outputSchemas.find((s) => s.connectorId === c.id);
    const apiKeys = this.state.apiKeys.filter((k) => k.connectorId === c.id);

    return {
      ...c,
      inputs,
      outputSchema,
      apiKeys,
    };
  }

  public saveConnector(data: {
    id?: string;
    name: string;
    slug: string;
    description: string;
    provider: string;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    status: 'active' | 'disabled';
    inputs?: Array<Omit<ConnectorInputRecord, 'id' | 'connectorId'>>;
    outputSchemaJson?: string;
    outputSchemaDescription?: string;
  }): { connector: ConnectorRecord; generatedRawApiKey?: string } {
    this.ensureInitialized();
    const now = new Date().toISOString();
    const isNew = !data.id;
    const connectorId = data.id || crypto.randomUUID();

    // Check slug collision
    const existingWithSlug = this.state.connectors.find(
      (c) => c.slug.toLowerCase() === data.slug.toLowerCase() && c.id !== connectorId
    );
    if (existingWithSlug) {
      throw new Error(`An API connector with slug "${data.slug}" already exists.`);
    }

    let connectorRecord: ConnectorRecord;
    let generatedRawApiKey: string | undefined;

    if (isNew) {
      connectorRecord = {
        id: connectorId,
        name: data.name,
        slug: data.slug.toLowerCase().trim(),
        description: data.description,
        provider: data.provider,
        model: data.model,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };
      this.state.connectors.push(connectorRecord);

      // Generate default API Key for this new connector
      const rawKey = `aic_live_${crypto.randomBytes(24).toString('hex')}`;
      generatedRawApiKey = rawKey;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const apiKeyRecord: ApiKeyRecord = {
        id: crypto.randomUUID(),
        connectorId,
        keyPrefix: rawKey.substring(0, 12),
        keyHash,
        hint: `...${rawKey.substring(rawKey.length - 6)}`,
        name: 'Default Production Key',
        createdAt: now,
        isRevoked: false,
      };
      this.state.apiKeys.push(apiKeyRecord);
    } else {
      const idx = this.state.connectors.findIndex((c) => c.id === connectorId);
      if (idx === -1) throw new Error(`Connector not found with ID ${connectorId}`);
      connectorRecord = {
        ...this.state.connectors[idx],
        name: data.name,
        slug: data.slug.toLowerCase().trim(),
        description: data.description,
        provider: data.provider,
        model: data.model,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        status: data.status,
        updatedAt: now,
      };
      this.state.connectors[idx] = connectorRecord;
    }

    // Replace inputs
    if (data.inputs) {
      this.state.inputs = this.state.inputs.filter((i) => i.connectorId !== connectorId);
      data.inputs.forEach((inp, idx) => {
        this.state.inputs.push({
          id: crypto.randomUUID(),
          connectorId,
          name: inp.name.trim(),
          label: inp.label || inp.name,
          type: inp.type,
          required: inp.required ?? true,
          description: inp.description,
          defaultValue: inp.defaultValue,
          validationRules: inp.validationRules,
          orderIndex: inp.orderIndex ?? idx,
        });
      });
    }

    // Replace output schema
    if (data.outputSchemaJson) {
      this.state.outputSchemas = this.state.outputSchemas.filter(
        (s) => s.connectorId !== connectorId
      );
      this.state.outputSchemas.push({
        id: crypto.randomUUID(),
        connectorId,
        rawSchemaJson: data.outputSchemaJson,
        description: data.outputSchemaDescription,
      });
    }

    this.persistSync();
    return {
      connector: this.attachRelations(connectorRecord),
      generatedRawApiKey,
    };
  }

  public toggleConnectorStatus(id: string): ConnectorRecord {
    this.ensureInitialized();
    const conn = this.state.connectors.find((c) => c.id === id);
    if (!conn) throw new Error('Connector not found');
    conn.status = conn.status === 'active' ? 'disabled' : 'active';
    conn.updatedAt = new Date().toISOString();
    this.persistSync();
    return this.attachRelations(conn);
  }

  public deleteConnector(id: string): boolean {
    this.ensureInitialized();
    const connIdx = this.state.connectors.findIndex((c) => c.id === id);
    if (connIdx === -1) return false;
    this.state.connectors.splice(connIdx, 1);
    this.state.inputs = this.state.inputs.filter((i) => i.connectorId !== id);
    this.state.outputSchemas = this.state.outputSchemas.filter((s) => s.connectorId !== id);
    this.state.apiKeys = this.state.apiKeys.filter((k) => k.connectorId !== id);
    this.state.logs = this.state.logs.filter((l) => l.connectorId !== id);
    this.persistSync();
    return true;
  }

  // --- API Keys ---

  public generateApiKey(connectorId: string, name = 'API Key'): { apiKey: ApiKeyRecord; rawKey: string } {
    this.ensureInitialized();
    const conn = this.state.connectors.find((c) => c.id === connectorId);
    if (!conn) throw new Error('Connector not found');

    const rawKey = `aic_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKeyRecord: ApiKeyRecord = {
      id: crypto.randomUUID(),
      connectorId,
      keyPrefix: rawKey.substring(0, 12),
      keyHash,
      hint: `...${rawKey.substring(rawKey.length - 6)}`,
      name,
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };
    this.state.apiKeys.push(apiKeyRecord);
    this.persistSync();
    return { apiKey: apiKeyRecord, rawKey };
  }

  public revokeApiKey(keyId: string): boolean {
    this.ensureInitialized();
    const key = this.state.apiKeys.find((k) => k.id === keyId);
    if (!key) return false;
    key.isRevoked = true;
    this.persistSync();
    return true;
  }

  public validateApiKey(rawKey: string, connectorId?: string): { valid: boolean; keyRecord?: ApiKeyRecord; connector?: ConnectorRecord } {
    this.ensureInitialized();
    if (!rawKey) return { valid: false };
    const hash = crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
    const keyRecord = this.state.apiKeys.find((k) => k.keyHash === hash && !k.isRevoked);
    if (!keyRecord) return { valid: false };

    if (connectorId && keyRecord.connectorId !== connectorId) {
      return { valid: false };
    }

    const connector = this.getConnectorById(keyRecord.connectorId);
    if (!connector) return { valid: false };

    // Record last used timestamp
    keyRecord.lastUsedAt = new Date().toISOString();
    this.persistSync();

    return { valid: true, keyRecord, connector };
  }

  // --- Logs & Analytics ---

  public addLog(entry: Omit<ApiRequestLogRecord, 'id' | 'timestamp'>): ApiRequestLogRecord {
    this.ensureInitialized();
    const logRecord: ApiRequestLogRecord = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.state.logs.unshift(logRecord);
    // Keep max 5,000 logs in memory/disk to prevent uncontrolled growth
    if (this.state.logs.length > 5000) {
      this.state.logs.length = 5000;
    }
    this.persistSync();
    return logRecord;
  }

  public getLogs(filters?: {
    connectorId?: string;
    provider?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): { logs: ApiRequestLogRecord[]; total: number } {
    this.ensureInitialized();
    let result = [...this.state.logs];

    if (filters?.connectorId) {
      result = result.filter((l) => l.connectorId === filters.connectorId);
    }
    if (filters?.provider) {
      result = result.filter((l) => l.provider.toLowerCase() === filters.provider!.toLowerCase());
    }
    if (filters?.success !== undefined) {
      result = result.filter((l) => l.success === filters.success);
    }

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paged = result.slice(offset, offset + limit);

    // Decorate with connectorName if missing
    paged.forEach((log) => {
      if (!log.connectorName) {
        const c = this.state.connectors.find((conn) => conn.id === log.connectorId);
        if (c) log.connectorName = c.name;
      }
    });

    return { logs: paged, total };
  }

  public getAnalytics(days = 30): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTimeMs: number;
    totalTokens: number;
    estimatedCost: number;
    requestsByProvider: Record<string, number>;
    requestsByConnector: Array<{ id: string; name: string; count: number; successRate: number }>;
    timeline: Array<{ date: string; total: number; success: number; failed: number; avgLatency: number }>;
  } {
    this.ensureInitialized();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filteredLogs = this.state.logs.filter((l) => new Date(l.timestamp) >= cutoff);

    const totalRequests = filteredLogs.length;
    const successfulRequests = filteredLogs.filter((l) => l.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    const totalLatency = filteredLogs.reduce((acc, l) => acc + (l.responseTimeMs || 0), 0);
    const averageResponseTimeMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

    const totalTokens = filteredLogs.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
    const estimatedCost = filteredLogs.reduce((acc, l) => acc + (l.estimatedCost || 0), 0);

    const requestsByProvider: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      const p = l.provider || 'unknown';
      requestsByProvider[p] = (requestsByProvider[p] || 0) + 1;
    });

    const connectorMap: Record<string, { name: string; total: number; success: number }> = {};
    filteredLogs.forEach((l) => {
      const c = this.state.connectors.find((conn) => conn.id === l.connectorId);
      const name = c ? c.name : l.connectorName || 'Deleted Connector';
      if (!connectorMap[l.connectorId]) {
        connectorMap[l.connectorId] = { name, total: 0, success: 0 };
      }
      connectorMap[l.connectorId].total += 1;
      if (l.success) connectorMap[l.connectorId].success += 1;
    });

    const requestsByConnector = Object.entries(connectorMap).map(([id, val]) => ({
      id,
      name: val.name,
      count: val.total,
      successRate: val.total > 0 ? Math.round((val.success / val.total) * 100) : 0,
    }));

    // Group by Day (YYYY-MM-DD)
    const timelineMap: Record<string, { total: number; success: number; failed: number; latencySum: number }> = {};
    // Ensure all days in range exist
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      timelineMap[dateStr] = { total: 0, success: 0, failed: 0, latencySum: 0 };
    }

    filteredLogs.forEach((l) => {
      const dateStr = l.timestamp.split('T')[0];
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].total += 1;
        if (l.success) timelineMap[dateStr].success += 1;
        else timelineMap[dateStr].failed += 1;
        timelineMap[dateStr].latencySum += l.responseTimeMs || 0;
      }
    });

    const timeline = Object.entries(timelineMap).map(([date, item]) => ({
      date,
      total: item.total,
      success: item.success,
      failed: item.failed,
      avgLatency: item.total > 0 ? Math.round(item.latencySum / item.total) : 0,
    }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: Math.round(successRate * 10) / 10,
      averageResponseTimeMs,
      totalTokens,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      requestsByProvider,
      requestsByConnector,
      timeline,
    };
  }
}

export const db = new Database();
