import { validateWithSchema } from './validateWithSchema.js';

const userSchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length >= 2 || 'name must be at least 2 characters'
  },
  email: {
    required: true,
    normalize: v => v.toLowerCase().trim(),
    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'invalid email'
  },
  password: {
    required: true,
    normalize: v => v,
    validate: v => v.length >= 6 || 'password must be at least 6 characters'
  },
  role: {
    required: false,
    validate: v => !v || ['ADMIN','USER','SUPPORT','CLIENT'].includes(v) || 'role must be ADMIN, USER, SUPPORT, or CLIENT'
  },
  phone: {
    required: false,
    normalize: v => v?.trim(),
    validate: v => true
  }
};

export function validateUser(payload, options) {
  return validateWithSchema(payload, userSchema, options);
}