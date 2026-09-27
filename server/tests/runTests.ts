import assert from 'assert';
import { db } from '../db/database.ts';
import { validateDynamicInputs } from '../engine/dynamicInput.ts';
import { buildExecutionPrompt } from '../engine/promptBuilder.ts';
import { validateAndNormalizeOutput } from '../engine/schemaValidator.ts';
import { authenticateConnectorRequest } from '../engine/auth.ts';
import { providerRegistry } from '../providers/registry.ts';

async function runTestSuite() {
  console.log('\n========================================');
  console.log(' RUNNING UNIVERSAL AI API HUB TEST SUITE ');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ PASS: ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    -> ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Connector Creation & Retrieval Test
  await test('Connector Creation and Storage', async () => {
    const testSlug = `test-article-${Date.now()}`;
    const result = db.saveConnector({
      name: 'Test Summarizer',
      slug: testSlug,
      description: 'Test summarization pipeline',
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      systemPrompt: 'Summarize the input text concisely.',
      temperature: 0.3,
      maxTokens: 500,
      status: 'active',
      inputs: [
        {
          name: 'text',
          label: 'Input Text',
          type: 'TEXT',
          required: true,
          orderIndex: 0,
        },
      ],
      outputSchemaJson: JSON.stringify({
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
      }),
    });

    assert.ok(result.connector.id, 'Connector should have generated ID');
    assert.strictEqual(result.connector.slug, testSlug);
    assert.ok(result.generatedRawApiKey, 'Should generate raw API key for new connector');

    const retrieved = db.getConnectorBySlug(testSlug);
    assert.ok(retrieved, 'Should retrieve created connector by slug');
    assert.strictEqual(retrieved?.inputs?.length, 1);
  });

  // 2. Connector Validation (Missing Name / Required Fields)
  await test('Connector Validation Rules', () => {
    assert.throws(
      () => {
        // Slugs must be unique if conflict exists
        const existing = db.getAllConnectors()[0];
        if (existing) {
          db.saveConnector({
            name: 'Duplicate Slug Test',
            slug: existing.slug,
            description: 'Duplicate',
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            systemPrompt: 'prompt',
            temperature: 0.5,
            maxTokens: 1000,
            status: 'active',
          });
        }
      },
      /already exists/i,
      'Should throw error on duplicate connector slug'
    );
  });

  // 3. API Key Generation and Validation
  await test('API Key Hashing and Verification', () => {
    const connectors = db.getAllConnectors();
    assert.ok(connectors.length > 0, 'Connectors should exist');
    const conn = connectors[0];

    const { apiKey, rawKey } = db.generateApiKey(conn.id, 'Integration Test Key');
    assert.ok(rawKey.startsWith('aic_live_'), 'Key should start with prefix');
    assert.strictEqual(apiKey.connectorId, conn.id);

    // Valid check
    const authSuccess = authenticateConnectorRequest(conn.id, rawKey);
    assert.strictEqual(authSuccess.authenticated, true);

    // Invalid key check
    const authFail = authenticateConnectorRequest(conn.id, 'aic_live_invalid_123456');
    assert.strictEqual(authFail.authenticated, false);

    // Revocation check
    db.revokeApiKey(apiKey.id);
    const authRevoked = authenticateConnectorRequest(conn.id, rawKey);
    assert.strictEqual(authRevoked.authenticated, false);
  });

  // 4. Dynamic Input Engine Validation (Text, Number, Boolean, JSON)
  await test('Dynamic Input Validation - Types, Defaults, and Required Checks', () => {
    const inputsConfig: any[] = [
      { name: 'topic', label: 'Topic', type: 'TEXT', required: true, validationRules: { minLength: 3 } },
      { name: 'count', label: 'Count', type: 'NUMBER', required: false, defaultValue: 5, validationRules: { min: 1, max: 50 } },
      { name: 'flag', label: 'Flag', type: 'BOOLEAN', required: false, defaultValue: true },
      { name: 'config', label: 'Config', type: 'JSON', required: false },
    ];

    // Valid submission
    const res1 = validateDynamicInputs(inputsConfig, {
      topic: 'Artificial Intelligence',
      count: '10',
      flag: 'true',
      config: '{"strict": true}',
    });
    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res1.values.topic, 'Artificial Intelligence');
    assert.strictEqual(res1.values.count, 10);
    assert.strictEqual(res1.values.flag, true);
    assert.deepStrictEqual(res1.values.config, { strict: true });

    // Missing required field
    const res2 = validateDynamicInputs(inputsConfig, {});
    assert.strictEqual(res2.isValid, false);
    assert.ok(res2.errors.some((e) => e.field === 'topic'));

    // Number out of bounds
    const res3 = validateDynamicInputs(inputsConfig, { topic: 'Valid', count: 100 });
    assert.strictEqual(res3.isValid, false);
    assert.ok(res3.errors.some((e) => e.field === 'count'));
  });

  // 5. Prompt Construction
  await test('Safe Prompt Engine Construction', () => {
    const { systemInstruction, userPrompt } = buildExecutionPrompt({
      systemPrompt: 'Extract entities from the user text.',
      inputsConfig: [
        { id: '1', connectorId: 'c1', name: 'text', label: 'Input Text', type: 'TEXT', required: true, orderIndex: 0 },
      ],
      inputValues: { text: 'Sunny Saini is software engineer.' },
      outputSchemaJson: '{"type":"object","properties":{"name":{"type":"string"}}}',
    });

    assert.ok(systemInstruction.includes('Extract entities from the user text.'));
    assert.ok(systemInstruction.includes('[OUTPUT SCHEMA REQUIREMENT]'));
    assert.ok(userPrompt.includes('Sunny Saini is software engineer.'));
  });

  // 6. Structured Output Schema Validation & Normalization
  await test('Output Schema Validation and Normalization', () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string' },
        rating: { type: 'number' },
        isActive: { type: 'boolean' },
      },
      required: ['name'],
    });

    const aiOutput = {
      name: 'Alpha Product',
      rating: '4.8', // string to be normalized to number
      isActive: 'true', // string to be normalized to boolean
    };

    const validated = validateAndNormalizeOutput(aiOutput, schema);
    assert.strictEqual(validated.isValid, true);
    assert.strictEqual(validated.normalizedData.name, 'Alpha Product');
    assert.strictEqual(validated.normalizedData.rating, 4.8);
    assert.strictEqual(validated.normalizedData.isActive, true);
  });

  // 7. Provider Adapter Multi-Provider Verification
  await test('Provider Registry Multi-Provider Support', async () => {
    const providers = await providerRegistry.listProviders();
    assert.ok(providers.length >= 2, 'Should register at least two providers');
    assert.ok(providers.some((p) => p.id === 'gemini'), 'Gemini provider must be registered');
    assert.ok(providers.some((p) => p.id === 'openai'), 'OpenAI provider must be registered');

    const gemini = providerRegistry.getProvider('gemini');
    assert.strictEqual(gemini.supportsVision, true);
    const geminiModels = await gemini.getModels();
    assert.ok(geminiModels.length > 0, 'Gemini must list models');
  });

  // 8. Request Logging and Analytics Persistence
  await test('Request Logging and Analytics Storage', () => {
    const conn = db.getAllConnectors()[0];
    const initialLogCount = db.getLogs({ connectorId: conn.id }).total;

    const logged = db.addLog({
      connectorId: conn.id,
      connectorName: conn.name,
      status: 200,
      success: true,
      responseTimeMs: 340,
      provider: conn.provider,
      model: conn.model,
      inputTokens: 120,
      outputTokens: 60,
      totalTokens: 180,
      estimatedCost: 0.00005,
      requestMetadata: {
        endpoint: `/api/${conn.slug}`,
        method: 'POST',
      },
    });

    assert.ok(logged.id, 'Log must have generated ID');
    const newLogCount = db.getLogs({ connectorId: conn.id }).total;
    assert.strictEqual(newLogCount, initialLogCount + 1);

    const analytics = db.getAnalytics(30);
    assert.ok(analytics.totalRequests >= newLogCount);
    assert.ok(analytics.timeline.length > 0);
  });

  console.log(`\n========================================`);
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
