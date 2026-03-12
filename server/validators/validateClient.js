import { validateWithSchema } from './validateWithSchema.js';

const clientSchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'name cannot be empty'
  },
  email: {
    required: false,
    normalize: v => v?.toLowerCase().trim(),
    validate: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'invalid email'
  },
  phone: {
    required: false,
    normalize: v => v?.trim(),
    validate: v => true
  },
  notes: {
    required: false
  }
};

export function validateClient(payload, options) {
  return validateWithSchema(payload, clientSchema, options);
}