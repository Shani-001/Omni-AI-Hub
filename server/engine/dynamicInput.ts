import { ConnectorInputRecord } from '../db/schema.ts';

export interface ValidatedInputResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  values: Record<string, any>;
  files: Array<{ name: string; mimeType: string; data: string }>;
}

export function validateDynamicInputs(
  inputsConfig: ConnectorInputRecord[],
  body: Record<string, any>,
  uploadedFiles?: Express.Multer.File[]
): ValidatedInputResult {
  const errors: Array<{ field: string; message: string }> = [];
  const values: Record<string, any> = {};
  const files: Array<{ name: string; mimeType: string; data: string }> = [];

  // Group uploaded files by field name
  const filesByField: Record<string, Express.Multer.File> = {};
  if (uploadedFiles && uploadedFiles.length > 0) {
    uploadedFiles.forEach((file) => {
      filesByField[file.fieldname] = file;
    });
  }

  for (const inputDef of inputsConfig) {
    const fieldName = inputDef.name;
    const rules = inputDef.validationRules || {};
    let rawVal = body[fieldName];
    const uploadedFile = filesByField[fieldName];

    // Check default value if not provided
    if ((rawVal === undefined || rawVal === null || rawVal === '') && inputDef.defaultValue !== undefined && inputDef.defaultValue !== '') {
      rawVal = inputDef.defaultValue;
    }

    // Check required
    if (inputDef.required) {
      if (inputDef.type === 'IMAGE' || inputDef.type === 'FILE') {
        if (!uploadedFile && !rawVal) {
          errors.push({ field: fieldName, message: `Field "${fieldName}" is required. Please upload a file or provide a base64 string.` });
          continue;
        }
      } else if (rawVal === undefined || rawVal === null || rawVal === '') {
        errors.push({ field: fieldName, message: `Field "${fieldName}" (${inputDef.label || fieldName}) is required.` });
        continue;
      }
    }

    // If optional and missing, skip further validation
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (!uploadedFile) {
        continue;
      }
    }

    // Type-specific validations
    switch (inputDef.type) {
      case 'TEXT': {
        const strVal = String(rawVal);
        if (rules.minLength !== undefined && strVal.length < rules.minLength) {
          errors.push({ field: fieldName, message: `"${fieldName}" must be at least ${rules.minLength} characters.` });
        }
        if (rules.maxLength !== undefined && strVal.length > rules.maxLength) {
          errors.push({ field: fieldName, message: `"${fieldName}" must not exceed ${rules.maxLength} characters.` });
        }
        values[fieldName] = strVal;
        break;
      }

      case 'NUMBER': {
        const numVal = Number(rawVal);
        if (isNaN(numVal)) {
          errors.push({ field: fieldName, message: `"${fieldName}" must be a valid number.` });
        } else {
          if (rules.min !== undefined && numVal < rules.min) {
            errors.push({ field: fieldName, message: `"${fieldName}" must be at least ${rules.min}.` });
          }
          if (rules.max !== undefined && numVal > rules.max) {
            errors.push({ field: fieldName, message: `"${fieldName}" must be at most ${rules.max}.` });
          }
          values[fieldName] = numVal;
        }
        break;
      }

      case 'BOOLEAN': {
        if (typeof rawVal === 'boolean') {
          values[fieldName] = rawVal;
        } else if (rawVal === 'true' || rawVal === '1' || rawVal === 1) {
          values[fieldName] = true;
        } else if (rawVal === 'false' || rawVal === '0' || rawVal === 0) {
          values[fieldName] = false;
        } else {
          errors.push({ field: fieldName, message: `"${fieldName}" must be a boolean (true/false).` });
        }
        break;
      }

      case 'JSON': {
        if (typeof rawVal === 'object' && rawVal !== null) {
          values[fieldName] = rawVal;
        } else if (typeof rawVal === 'string') {
          try {
            values[fieldName] = JSON.parse(rawVal);
          } catch (e) {
            errors.push({ field: fieldName, message: `"${fieldName}" must be valid JSON: ${(e as Error).message}` });
          }
        } else {
          errors.push({ field: fieldName, message: `"${fieldName}" must be a valid JSON object or array.` });
        }
        break;
      }

      case 'IMAGE':
      case 'FILE': {
        let fileMime = '';
        let fileBase64 = '';
        let fileName = fieldName;
        let fileSizeBytes = 0;

        if (uploadedFile) {
          fileMime = uploadedFile.mimetype;
          fileBase64 = uploadedFile.buffer.toString('base64');
          fileName = uploadedFile.originalname;
          fileSizeBytes = uploadedFile.size;
        } else if (typeof rawVal === 'string') {
          // May be data URI "data:image/png;base64,..." or raw base64
          if (rawVal.startsWith('data:')) {
            const matches = rawVal.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              fileMime = matches[1];
              fileBase64 = matches[2];
            } else {
              fileBase64 = rawVal;
              fileMime = inputDef.type === 'IMAGE' ? 'image/jpeg' : 'application/octet-stream';
            }
          } else {
            fileBase64 = rawVal;
            fileMime = inputDef.type === 'IMAGE' ? 'image/jpeg' : 'application/octet-stream';
          }
          fileSizeBytes = Buffer.byteLength(fileBase64, 'base64');
        }

        // Validate MIME type
        if (rules.allowedMimeTypes && rules.allowedMimeTypes.length > 0) {
          if (!rules.allowedMimeTypes.includes(fileMime)) {
            errors.push({
              field: fieldName,
              message: `Invalid file format "${fileMime}". Allowed: ${rules.allowedMimeTypes.join(', ')}`,
            });
          }
        } else if (inputDef.type === 'IMAGE' && !fileMime.startsWith('image/')) {
          errors.push({
            field: fieldName,
            message: `Field "${fieldName}" requires an image file (e.g. image/jpeg, image/png).`,
          });
        }

        // Validate file size (default max 10MB)
        const maxMb = rules.maxFileSizeMb || 10;
        if (fileSizeBytes > maxMb * 1024 * 1024) {
          errors.push({
            field: fieldName,
            message: `File exceeds maximum allowed size of ${maxMb}MB.`,
          });
        }

        if (fileBase64) {
          files.push({
            name: fileName,
            mimeType: fileMime,
            data: fileBase64,
          });
          values[fieldName] = `[File: ${fileName} (${fileMime}, ${(fileSizeBytes / 1024).toFixed(1)} KB)]`;
        }
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values,
    files,
  };
}
