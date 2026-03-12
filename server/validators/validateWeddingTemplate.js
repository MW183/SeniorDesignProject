import { validateWithSchema } from './validateWithSchema.js';

const weddingTemplateSchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'name cannot be empty'
  },
  version: {
    required: true,
    normalize: v => {
      const num = parseInt(v, 10);
      if (isNaN(num)) throw new Error('Invalid version');
      return num;
    },
    validate: v => v >= 1 || 'version must be at least 1'
  }
};

export function validateWeddingTemplate(payload, options) {
  return validateWithSchema(payload, weddingTemplateSchema, options);
}
