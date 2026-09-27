import { AIProvider } from './types.ts';
import { GeminiProvider } from './gemini.ts';
import { OpenAIProvider } from './openai.ts';

class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
  }

  public register(provider: AIProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  public getProvider(id: string): AIProvider {
    const p = this.providers.get(id.toLowerCase());
    if (!p) {
      throw new Error(`AI Provider "${id}" is not supported. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return p;
  }

  public async listProviders() {
    const list = [];
    for (const [id, provider] of this.providers.entries()) {
      const models = await provider.getModels().catch(() => []);
      list.push({
        id,
        name: provider.name,
        supportsVision: provider.supportsVision,
        isConfigured: provider.isConfigured(),
        models,
      });
    }
    return list;
  }
}

export const providerRegistry = new ProviderRegistry();
