import { validateWithSchema } from './validateWithSchema.js';

const taskCategorySchema = {
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
  weddingId: {
    required: true,
    normalize: v => v?.trim(),
    validate: v => v && v.length > 0 || 'weddingId cannot be empty'
  }
};

export function validateTaskCategory(payload, options) {
  return validateWithSchema(payload, taskCategorySchema, options);
}
