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

export interface ConnectorInputRecord {
  id: string;
  connectorId: string;
  name: string;
  label: string;
  type: InputType;
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean | any;
  validationRules?: ValidationRules;
  orderIndex: number;
}

export interface ConnectorOutputSchemaRecord {
  id: string;
  connectorId: string;
  rawSchemaJson: string; // JSON Schema definition
  description?: string;
}

export interface ApiKeyRecord {
  id: string;
  connectorId: string;
  keyPrefix: string;
  keyHash: string; // SHA-256 hash of API key
  hint: string; // e.g. "...abcd"
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  isRevoked: boolean;
}

export interface ConnectorRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  provider: 'gemini' | 'openai' | string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  status: ConnectorStatus;
  createdAt: string;
  updatedAt: string;
  inputs?: ConnectorInputRecord[];
  outputSchema?: ConnectorOutputSchemaRecord;
  apiKeys?: ApiKeyRecord[];
}

export interface ApiRequestLogRecord {
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

export interface DatabaseState {
  connectors: ConnectorRecord[];
  inputs: ConnectorInputRecord[];
  outputSchemas: ConnectorOutputSchemaRecord[];
  apiKeys: ApiKeyRecord[];
  logs: ApiRequestLogRecord[];
}
