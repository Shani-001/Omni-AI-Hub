import crypto from 'crypto';
import { DatabaseState, ConnectorRecord, ConnectorInputRecord, ConnectorOutputSchemaRecord, ApiKeyRecord, ApiRequestLogRecord } from './schema.ts';

export function seedInitialData(): DatabaseState {
  const now = new Date();
  const cardScannerId = 'conn_card_scanner_01';
  const articleWriterId = 'conn_article_writer_02';

  // Seed API Keys
  // We use known seeds so developers and testers can easily run cURL without generating a new key first
  const cardScannerRawKey = 'aic_live_demo_card_scanner_secret_key_88';
  const cardScannerKeyHash = crypto.createHash('sha256').update(cardScannerRawKey).digest('hex');

  const articleWriterRawKey = 'aic_live_demo_article_writer_secret_key_99';
  const articleWriterKeyHash = crypto.createHash('sha256').update(articleWriterRawKey).digest('hex');

  const connectors: ConnectorRecord[] = [
    {
      id: cardScannerId,
      name: 'Card Scanner',
      slug: 'card-scanner',
      description: 'Extracts contact name, company, designation, phone, email, and website from business card images using AI vision.',
      provider: 'gemini',
      model: 'gemini-flash-latest',
      systemPrompt: 'You are an intelligent business card OCR and contact extraction system. Given an image of a business card (and optional notes), accurately extract the person\'s full name, company name, professional designation/job title, phone number, email address, and website URL. Return strictly a JSON object conforming to the required schema. If any field is not visible on the card, return null for that field.',
      temperature: 0.2,
      maxTokens: 1024,
      status: 'active',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: articleWriterId,
      name: 'Article Writer',
      slug: 'article-writer',
      description: 'Generates structured articles, executive summaries, and SEO keywords based on topic, target word count, and style options.',
      provider: 'gemini',
      model: 'gemini-flash-latest',
      systemPrompt: 'You are an elite editorial content writer and SEO copywriter. Based on the provided topic, SEO keywords, target word count, and optional stylistic instructions, write an engaging, high-quality, comprehensive article with an executive summary, markdown-formatted body, and SEO keyword list. Return ONLY a valid JSON object matching the required schema.',
      temperature: 0.7,
      maxTokens: 2500,
      status: 'active',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  const inputs: ConnectorInputRecord[] = [
    // Card Scanner Inputs
    {
      id: 'inp_cs_01',
      connectorId: cardScannerId,
      name: 'image',
      label: 'Business Card Image',
      type: 'IMAGE',
      required: true,
      description: 'High-resolution photo or scan of the business card (JPEG, PNG, WEBP).',
      orderIndex: 0,
      validationRules: {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSizeMb: 10,
      },
    },
    {
      id: 'inp_cs_02',
      connectorId: cardScannerId,
      name: 'notes',
      label: 'Context Notes',
      type: 'TEXT',
      required: false,
      description: 'Optional additional context or hints (e.g. "Met at SaaStr 2026").',
      orderIndex: 1,
    },

    // Article Writer Inputs
    {
      id: 'inp_aw_01',
      connectorId: articleWriterId,
      name: 'topic',
      label: 'Article Topic',
      type: 'TEXT',
      required: true,
      description: 'The core topic or title theme of the article.',
      defaultValue: 'The Future of AI-Powered Microservices and Automated API Gateways',
      orderIndex: 0,
    },
    {
      id: 'inp_aw_02',
      connectorId: articleWriterId,
      name: 'keywords',
      label: 'Target SEO Keywords',
      type: 'TEXT',
      required: false,
      description: 'Comma-separated target keywords to organically weave into the content.',
      defaultValue: 'AI gateway, microservices, developer productivity, schema validation',
      orderIndex: 1,
    },
    {
      id: 'inp_aw_03',
      connectorId: articleWriterId,
      name: 'word_count',
      label: 'Target Word Count',
      type: 'NUMBER',
      required: false,
      defaultValue: 800,
      description: 'Approximate target length for the generated article.',
      orderIndex: 2,
      validationRules: {
        min: 150,
        max: 3000,
      },
    },
    {
      id: 'inp_aw_04',
      connectorId: articleWriterId,
      name: 'options',
      label: 'Style & Format Options',
      type: 'JSON',
      required: false,
      description: 'JSON object specifying tone, audience, or specific sections.',
      defaultValue: JSON.stringify({ tone: 'authoritative', audience: 'software architects' }, null, 2),
      orderIndex: 3,
    },
  ];

  const outputSchemas: ConnectorOutputSchemaRecord[] = [
    {
      id: 'schema_cs_01',
      connectorId: cardScannerId,
      rawSchemaJson: JSON.stringify(
        {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the contact' },
            company: { type: 'string', description: 'Company or organization name' },
            designation: { type: 'string', description: 'Job title or role' },
            phone: { type: 'string', description: 'Primary telephone or mobile number' },
            email: { type: 'string', description: 'Direct or business email address' },
            website: { type: 'string', description: 'Website URL' },
          },
          required: ['name'],
        },
        null,
        2
      ),
      description: 'Standard business card contact record.',
    },
    {
      id: 'schema_aw_01',
      connectorId: articleWriterId,
      rawSchemaJson: JSON.stringify(
        {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Engaging title for the article' },
            summary: { type: 'string', description: '2-3 sentence executive synopsis' },
            article: { type: 'string', description: 'Full markdown article content' },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of relevant keywords extracted or covered',
            },
          },
          required: ['title', 'summary', 'article', 'keywords'],
        },
        null,
        2
      ),
      description: 'Structured publication article with SEO metadata.',
    },
  ];

  const apiKeys: ApiKeyRecord[] = [
    {
      id: 'key_cs_01',
      connectorId: cardScannerId,
      keyPrefix: 'aic_live_dem',
      keyHash: cardScannerKeyHash,
      hint: '...key_88',
      name: 'Default Demo Key (Preconfigured)',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
    },
    {
      id: 'key_aw_01',
      connectorId: articleWriterId,
      keyPrefix: 'aic_live_dem',
      keyHash: articleWriterKeyHash,
      hint: '...key_99',
      name: 'Default Demo Key (Preconfigured)',
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      isRevoked: false,
    },
  ];

  // Seed realistic historical logs across past 5 days for the demonstration connectors
  const logs: ApiRequestLogRecord[] = [];
  const providers = ['gemini', 'gemini'];
  for (let i = 0; i < 28; i++) {
    const hoursAgo = Math.floor(Math.random() * 120) + 1;
    const isSuccess = Math.random() > 0.07; // 93% success rate
    const isCardScanner = i % 2 === 0;
    const connId = isCardScanner ? cardScannerId : articleWriterId;
    const connName = isCardScanner ? 'Card Scanner' : 'Article Writer';
    const latency = isCardScanner ? Math.floor(Math.random() * 600) + 850 : Math.floor(Math.random() * 900) + 1100;
    const inTokens = isCardScanner ? 820 : 340;
    const outTokens = isCardScanner ? 140 : 890;
    const cost = ((inTokens * 0.00015 + outTokens * 0.0006) / 1000);

    logs.push({
      id: `log_seed_${i}`,
      connectorId: connId,
      connectorName: connName,
      timestamp: new Date(now.getTime() - hoursAgo * 3600 * 1000).toISOString(),
      status: isSuccess ? 200 : (i % 3 === 0 ? 400 : 504),
      success: isSuccess,
      responseTimeMs: latency,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      inputTokens: inTokens,
      outputTokens: outTokens,
      totalTokens: inTokens + outTokens,
      estimatedCost: isSuccess ? cost : 0,
      errorType: isSuccess ? undefined : (i % 3 === 0 ? 'VALIDATION_ERROR' : 'PROVIDER_TIMEOUT'),
      errorMessage: isSuccess ? undefined : (i % 3 === 0 ? 'Missing required input field "image"' : 'Upstream provider timed out after 15000ms'),
      requestMetadata: {
        endpoint: `/api/${isCardScanner ? 'card-scanner' : 'article-writer'}`,
        method: 'POST',
        clientIp: '127.0.0.1',
        userAgent: 'curl/8.5.0',
        inputKeys: isCardScanner ? ['image'] : ['topic', 'keywords'],
      },
      responseMetadata: isSuccess ? {
        dataSnippet: isCardScanner ? '{"name":"Sarah Jenkins","company":"CloudScale","designation":"VP Eng"}' : '{"title":"Microservices in 2026","summary":"..."}',
        keysExtracted: isCardScanner ? ['name', 'company', 'designation', 'phone', 'email'] : ['title', 'summary', 'article', 'keywords'],
      } : undefined,
    });
  }

  return {
    connectors,
    inputs,
    outputSchemas,
    apiKeys,
    logs,
  };
}
