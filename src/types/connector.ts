export type ConnectorStatus = 'active' | 'disabled';

export type InputType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'IMAGE' | 'FILE' | 'JSON';

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedMimeTypes?: string[];
  maxFileSizeMb?: number;
}

export interface ConnectorInput {
  id?: string;
  name: string;
  label: string;
  type: InputType;
  required: boolean;
  description?: string;
  defaultValue?: any;
  validationRules?: ValidationRules;
  orderIndex: number;
}

export interface ConnectorOutputSchema {
  id?: string;
  rawSchemaJson: string;
  description?: string;
}

export interface ApiKey {
  id: string;
  connectorId: string;
  keyPrefix: string;
  hint: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  isRevoked: boolean;
}

export interface Connector {
  id: string;
  name: string;
  slug: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  status: ConnectorStatus;
  createdAt: string;
  updatedAt: string;
  inputs?: ConnectorInput[];
  outputSchema?: ConnectorOutputSchema;
  apiKeys?: ApiKey[];
  requestsCount?: number;
  successRate?: number;
  lastUsedAt?: string;
  recentLogs?: ApiRequestLog[];
}

export interface ApiRequestLog {
  id: string;
  connectorId: string;
  connectorName?: string;
  timestamp: string;
  status: number;
  success: boolean;
  responseTimeMs: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  errorType?: string;
  errorMessage?: string;
  requestMetadata?: {
    endpoint: string;
    method: string;
    clientIp?: string;
    userAgent?: string;
    inputKeys?: string[];
    fileCounts?: number;
  };
  responseMetadata?: {
    dataSnippet?: string;
    keysExtracted?: string[];
  };
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  description: string;
  supportsVision: boolean;
  contextWindow?: number;
  isDefault?: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  supportsVision: boolean;
  isConfigured: boolean;
  models: ProviderModelInfo[];
}

export interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTimeMs: number;
  totalTokens: number;
  estimatedCost: number;
  totalConnectors: number;
  activeConnectors: number;
  requestsByProvider: Record<string, number>;
  requestsByConnector: Array<{ id: string; name: string; count: number; successRate: number }>;
  timeline: Array<{ date: string; total: number; success: number; failed: number; avgLatency: number }>;
}
