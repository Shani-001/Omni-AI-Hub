export interface FileInputItem {
  mimeType: string;
  data: string; // base64 encoded data
  name?: string;
}

export interface ExecuteParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: any;
  files?: FileInputItem[];
}

export interface ProviderExecutionResult {
  rawOutput: string;
  parsedOutput: any;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  description: string;
  supportsVision: boolean;
  contextWindow?: number;
  isDefault?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  supportsVision: boolean;
  isConfigured(): boolean;
  getModels(): Promise<ProviderModelInfo[]>;
  execute(params: ExecuteParams): Promise<ProviderExecutionResult>;
}
