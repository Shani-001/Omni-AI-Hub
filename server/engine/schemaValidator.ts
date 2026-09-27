export interface ValidationOutputResult {
  isValid: boolean;
  normalizedData: any;
  error?: string;
}

/**
 * Validates and normalizes structured output against expected JSON schema or basic object shapes
 */
export function validateAndNormalizeOutput(
  rawParsed: any,
  schemaJsonString?: string
): ValidationOutputResult {
  if (!rawParsed || typeof rawParsed !== 'object') {
    return {
      isValid: false,
      normalizedData: null,
      error: 'AI output is not a JSON object or array.',
    };
  }

  // If no output schema is enforced, return parsed object directly
  if (!schemaJsonString || !schemaJsonString.trim()) {
    return {
      isValid: true,
      normalizedData: rawParsed,
    };
  }

  let schemaObj: any;
  try {
    schemaObj = JSON.parse(schemaJsonString);
  } catch (e) {
    // If schema in DB is invalid, pass through
    return {
      isValid: true,
      normalizedData: rawParsed,
    };
  }

  // Handle standard JSON Schema (with type: "object", properties: {...}, required: [...])
  // or a shorthand sample schema like {"name": "string", "company": "string"}
  const properties = schemaObj.properties || (schemaObj.type ? null : schemaObj);
  const required: string[] = Array.isArray(schemaObj.required) ? schemaObj.required : [];

  if (properties && typeof properties === 'object') {
    const normalized: Record<string, any> = { ...rawParsed };
    const missingRequired: string[] = [];

    // Check required fields
    for (const reqKey of required) {
      if (normalized[reqKey] === undefined || normalized[reqKey] === null) {
        missingRequired.push(reqKey);
      }
    }

    if (missingRequired.length > 0) {
      // In soft normalization, provide null for missing required fields if possible
      for (const missing of missingRequired) {
        normalized[missing] = null;
      }
    }

    // Attempt type normalization
    for (const [key, propDef] of Object.entries(properties)) {
      if (normalized[key] !== undefined && normalized[key] !== null) {
        let expectedType = '';
        if (typeof propDef === 'string') {
          expectedType = propDef.toLowerCase();
        } else if (typeof propDef === 'object' && (propDef as any).type) {
          expectedType = String((propDef as any).type).toLowerCase();
        }

        if (expectedType === 'string' && typeof normalized[key] !== 'string') {
          normalized[key] = String(normalized[key]);
        } else if (expectedType === 'number' && typeof normalized[key] !== 'number') {
          const n = Number(normalized[key]);
          if (!isNaN(n)) normalized[key] = n;
        } else if (expectedType === 'boolean' && typeof normalized[key] !== 'boolean') {
          normalized[key] = Boolean(normalized[key]);
        } else if (expectedType === 'array' && !Array.isArray(normalized[key])) {
          normalized[key] = [normalized[key]];
        }
      }
    }

    return {
      isValid: true,
      normalizedData: normalized,
    };
  }

  return {
    isValid: true,
    normalizedData: rawParsed,
  };
}
