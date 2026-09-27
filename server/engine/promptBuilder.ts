import { ConnectorInputRecord } from '../db/schema.ts';

export function buildExecutionPrompt(params: {
  systemPrompt: string;
  inputsConfig: ConnectorInputRecord[];
  inputValues: Record<string, any>;
  outputSchemaJson?: string;
}): { systemInstruction: string; userPrompt: string } {
  // Construct pristine, un-tamperable system instructions with strict JSON requirement
  let systemInstruction = params.systemPrompt.trim();

  if (params.outputSchemaJson) {
    systemInstruction += `\n\n[OUTPUT SCHEMA REQUIREMENT]\nYou MUST return strictly a single valid JSON object strictly matching this JSON schema:\n${params.outputSchemaJson}\nDo not enclose the JSON in conversational preambles or markdown code fences if possible, or return strictly valid parsable JSON.`;
  }

  // Format user input safely into structured key-value context
  const lines: string[] = ['USER INPUT PARAMETERS:'];
  for (const inputDef of params.inputsConfig) {
    const val = params.inputValues[inputDef.name];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object') {
        lines.push(`- ${inputDef.label || inputDef.name} (${inputDef.name}):\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\``);
      } else {
        lines.push(`- ${inputDef.label || inputDef.name} (${inputDef.name}): ${String(val)}`);
      }
    }
  }

  const userPrompt = lines.join('\n');
  return {
    systemInstruction,
    userPrompt,
  };
}
