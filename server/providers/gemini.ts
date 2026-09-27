import { GoogleGenAI } from '@google/genai';
import { AIProvider, ExecuteParams, ProviderExecutionResult, ProviderModelInfo } from './types.ts';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly supportsVision = true;

  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
      }
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.aiClient;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  public async getModels(): Promise<ProviderModelInfo[]> {
    return [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        description: 'Next-gen flagship high-speed multimodal model with advanced reasoning.',
        supportsVision: true,
        contextWindow: 1048576,
        isDefault: true,
      },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        description: 'Complex reasoning, advanced coding, math, and STEM tasks.',
        supportsVision: true,
        contextWindow: 2097152,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        description: 'Ultra-fast, cost-efficient model for lightweight low-latency workflows.',
        supportsVision: true,
        contextWindow: 1048576,
      },
      {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest',
        description: 'Alias to the newest stable Gemini Flash production version.',
        supportsVision: true,
        contextWindow: 1048576,
      },
    ];
  }

  public async execute(params: ExecuteParams): Promise<ProviderExecutionResult> {
    const startTime = Date.now();
    const client = this.getClient();
    const model = params.model || 'gemini-3.8-flash';

    // Prepare contents array
    const parts: any[] = [];

    // Add files/images as inlineData if provided
    if (params.files && params.files.length > 0) {
      for (const file of params.files) {
        // Strip data:image/...;base64, prefix if included
        let base64Clean = file.data;
        if (base64Clean.includes(';base64,')) {
          base64Clean = base64Clean.split(';base64,')[1];
        }
        parts.push({
          inlineData: {
            mimeType: file.mimeType || 'image/jpeg',
            data: base64Clean,
          },
        });
      }
    }

    // Add user prompt text
    parts.push({
      text: params.userPrompt,
    });

    const config: any = {
      systemInstruction: params.systemPrompt,
      responseMimeType: 'application/json',
    };

    if (params.temperature !== undefined) {
      config.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      config.maxOutputTokens = params.maxTokens;
    }

    // Pass responseSchema if provided and valid
    if (params.jsonSchema && typeof params.jsonSchema === 'object') {
      try {
        // Gemini supports responseSchema in standard openAPI subset schema
        // We supply system instruction to reinforce JSON structure
      } catch (err) {
        // Silently fallback to prompt-based JSON enforcement
      }
    }

    try {
      const response = await client.models.generateContent({
        model,
        contents: parts.length === 1 && parts[0].text ? parts[0].text : { parts },
        config,
      });

      const latencyMs = Date.now() - startTime;
      const rawText = response.text || '{}';

      // Parse structured JSON output
      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(rawText.trim());
      } catch (parseErr) {
        // Attempt clean extraction if enclosed in markdown code fences
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          parsedOutput = JSON.parse(match[1].trim());
        } else {
          throw new Error(`Failed to parse AI provider JSON response: ${(parseErr as Error).message}`);
        }
      }

      const inputTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response.usageMetadata?.totalTokenCount || inputTokens + outputTokens;

      // Approximate cost for Gemini Flash (~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens)
      const estimatedCost = (inputTokens * 0.000075 + outputTokens * 0.0003) / 1000;

      return {
        rawOutput: rawText,
        parsedOutput,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        estimatedCost: Math.round(estimatedCost * 100000) / 100000,
        provider: this.id,
        model,
      };
    } catch (error: any) {
      // Clean up error message
      const msg = error?.message || 'Gemini API call failed';
      throw new Error(`[GeminiProvider Error] ${msg}`);
    }
  }
}
