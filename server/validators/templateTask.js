import { validateWithSchema } from './validateWithSchema.js';

const templateTaskSchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'name cannot be empty'
  },
  description: {
    required: false,
    normalize: v => v?.trim(),
    validate: v => true
  },
  defaultPriority: {
    required: true,
    normalize: v => {
      const num = parseInt(v, 10);
      if (isNaN(num)) throw new Error('Invalid defaultPriority');
      return num;
    },
    validate: v => (v >= 1 && v <= 5) || 'defaultPriority must be between 1 and 5'
  },
  defaultDueOffsetDays: {
    required: true,
    normalize: v => {
      const num = parseInt(v, 10);
      if (isNaN(num)) throw new Error('Invalid defaultDueOffsetDays');
      return num;
    },
    validate: v => true // Can be negative (due before wedding) or positive (due after wedding)
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
  categoryId: {
    required: true,
    normalize: v => v?.trim(),
    validate: v => v && v.length > 0 || 'categoryId cannot be empty'
  },
  dependsOnId: {
    required: false,
    normalize: v => v?.trim(),
    validate: v => true // FK validation will be handled in route
  }
};

export function validateTemplateTask(payload, options) {
  return validateWithSchema(payload, templateTaskSchema, options);
}
