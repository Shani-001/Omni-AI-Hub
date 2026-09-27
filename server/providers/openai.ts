import { AIProvider, ExecuteParams, ProviderExecutionResult, ProviderModelInfo } from './types.ts';

export class OpenAIProvider implements AIProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  public readonly supportsVision = true;

  public isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  public async getModels(): Promise<ProviderModelInfo[]> {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        description: 'Flagship versatile multimodal model with strong reasoning and vision.',
        supportsVision: true,
        contextWindow: 128000,
        isDefault: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast, lightweight and cost-efficient intelligent model.',
        supportsVision: true,
        contextWindow: 128000,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        description: 'Specialized reasoning model for high precision code and logic.',
        supportsVision: false,
        contextWindow: 200000,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High capability model with 128k context and vision capabilities.',
        supportsVision: true,
        contextWindow: 128000,
      },
    ];
  }

  public async execute(params: ExecuteParams): Promise<ProviderExecutionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API Key (OPENAI_API_KEY) is not configured in backend environment variables. Please set OPENAI_API_KEY in your server environment or use the Gemini provider.'
      );
    }

    const startTime = Date.now();
    const model = params.model || 'gpt-4o-mini';

    const messages: any[] = [
      {
        role: 'system',
        content: `${params.systemPrompt}\n\nIMPORTANT: You must output ONLY a valid JSON object matching the requested schema. No extra text or explanations.`,
      },
    ];

    // User message content
    if (params.files && params.files.length > 0) {
      const userContentParts: any[] = [{ type: 'text', text: params.userPrompt }];
      for (const file of params.files) {
        let base64Clean = file.data;
        if (!base64Clean.startsWith('data:')) {
          base64Clean = `data:${file.mimeType || 'image/jpeg'};base64,${base64Clean}`;
        }
        userContentParts.push({
          type: 'image_url',
          image_url: {
            url: base64Clean,
          },
        });
      }
      messages.push({
        role: 'user',
        content: userContentParts,
      });
    } else {
      messages.push({
        role: 'user',
        content: params.userPrompt,
      });
    }

    const payload: any = {
      model,
      messages,
      response_format: { type: 'json_object' },
    };

    if (params.temperature !== undefined) {
      payload.temperature = params.temperature;
    }
    if (params.maxTokens !== undefined) {
      payload.max_tokens = params.maxTokens;
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `OpenAI returned status ${res.status}: ${res.statusText}`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const rawText = data.choices?.[0]?.message?.content || '{}';

      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(rawText.trim());
      } catch (parseErr) {
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          parsedOutput = JSON.parse(match[1].trim());
        } else {
          throw new Error(`Failed to parse OpenAI JSON output: ${(parseErr as Error).message}`);
        }
      }

      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens;

      // Approximate cost for GPT-4o-mini (~$0.15/1M input, ~$0.60/1M output)
      const estimatedCost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;

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
    } catch (err: any) {
      throw new Error(`[OpenAIProvider Error] ${err.message}`);
    }
  }
}
