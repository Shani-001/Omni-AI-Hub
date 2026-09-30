import {
  Connector,
  ApiRequestLog,
  AnalyticsData,
  ProviderInfo,
  ProviderModelInfo,
} from '../types/connector.ts';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: any;
  status?: number;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorObj = data && typeof data === 'object' && data.error ? data.error : null;
    const errorMsg = errorObj?.message || (typeof data === 'string' ? data : response.statusText);
    const errorCode = errorObj?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, errorCode, response.status, errorObj?.details);
  }

  return data;
}

export const api = {
  // Connectors
  async getConnectors(): Promise<Connector[]> {
    const res = await request<{ success: boolean; data: Connector[] }>(`${API_BASE}/connectors`);
    return res.data;
  },

  async getConnector(id: string): Promise<Connector> {
    const res = await request<{ success: boolean; data: Connector }>(`${API_BASE}/connectors/${id}`);
    return res.data;
  },

  async createConnector(payload: any): Promise<{ connector: Connector; generatedApiKey?: string }> {
    const res = await request<{ success: boolean; data: Connector; generatedApiKey?: string }>(
      `${API_BASE}/connectors`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return { connector: res.data, generatedApiKey: res.generatedApiKey };
  },

  async updateConnector(id: string, payload: any): Promise<Connector> {
    const res = await request<{ success: boolean; data: Connector }>(`${API_BASE}/connectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteConnector(id: string): Promise<void> {
    await request(`${API_BASE}/connectors/${id}`, { method: 'DELETE' });
  },

  async toggleStatus(id: string): Promise<Connector> {
    const res = await request<{ success: boolean; data: Connector }>(
      `${API_BASE}/connectors/${id}/status`,
      { method: 'PATCH' }
    );
    return res.data;
  },

  // API Keys
  async generateApiKey(connectorId: string, name?: string): Promise<{ apiKey: any; rawKey: string }> {
    const res = await request<{ success: boolean; data: { apiKey: any; rawKey: string } }>(
      `${API_BASE}/connectors/${connectorId}/keys`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
    return res.data;
  },

  async revokeApiKey(connectorId: string, keyId: string): Promise<void> {
    await request(`${API_BASE}/connectors/${connectorId}/keys/${keyId}`, {
      method: 'DELETE',
    });
  },

  // Developer Docs
  async getDocs(connectorId: string): Promise<any> {
    const res = await request<{ success: boolean; data: any }>(`${API_BASE}/connectors/${connectorId}/docs`);
    return res.data;
  },

  // Logs & Analytics
  async getLogs(params: { connectorId?: string; provider?: string; success?: boolean; limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    if (params.connectorId) query.set('connectorId', params.connectorId);
    if (params.provider) query.set('provider', params.provider);
    if (params.success !== undefined) query.set('success', String(params.success));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const res = await request<{ success: boolean; data: ApiRequestLog[]; total: number }>(
      `${API_BASE}/logs?${query.toString()}`
    );
    return res;
  },

  async getAnalytics(days = 30): Promise<AnalyticsData> {
    const res = await request<{ success: boolean; data: AnalyticsData }>(
      `${API_BASE}/analytics?days=${days}`
    );
    return res.data;
  },

  // Providers
  async getProviders(): Promise<ProviderInfo[]> {
    const res = await request<{ success: boolean; data: ProviderInfo[] }>(`${API_BASE}/providers`);
    return res.data;
  },

  async getProviderModels(providerId: string): Promise<ProviderModelInfo[]> {
    const res = await request<{ success: boolean; data: ProviderModelInfo[] }>(
      `${API_BASE}/providers/${providerId}/models`
    );
    return res.data;
  },

  // Execution / Playground Test
  async testConnector(
    connectorIdOrSlug: string,
    payload: FormData | Record<string, any>,
    apiKey?: string,
    modelOverride?: string
  ): Promise<any> {
    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = {};

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    } else {
      headers['x-admin-playground'] = 'true';
    }

    if (modelOverride) {
      headers['x-model-override'] = modelOverride;
    }

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: isFormData ? payload : JSON.stringify(payload),
    };

    return await request<any>(`${API_BASE}/connectors/${connectorIdOrSlug}/test`, options);
  },

  // Health
  async checkHealth(): Promise<{ status: string; uptime: number; providers: Record<string, boolean> }> {
    return await request<any>(`${API_BASE}/health`);
  },
};
