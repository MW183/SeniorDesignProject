import { validateWithSchema } from './validateWithSchema.js';

const templateCategorySchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'name cannot be empty'
  },
  sortOrder: {
    required: true,
    normalize: v => {
      const num = parseInt(v, 10);
      if (isNaN(num)) throw new Error('Invalid sortOrder');
      return num;
    },
    validate: v => v >= 0 || 'sortOrder must be non-negative'
  },
  templateId: {
    required: true,
    normalize: v => v?.trim(),
    validate: v => v && v.length > 0 || 'templateId cannot be empty'
  }
};

export function validateTemplateCategory(payload, options) {
  return validateWithSchema(payload, templateCategorySchema, options);
}
