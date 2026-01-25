import { validateWithSchema } from './validateWithSchema.js';

const vendorSchema = {
  name: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'name cannot be empty'
  },
  addressId: {
    required: false,
    normalize: v => v?.trim(),
    validate: v => true // FK validation will be handled in route
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
  rating: {
    required: false,
    normalize: v => v,
    validate: v => v === undefined || (Number.isInteger(v) && v >= 0) || 'rating must be a positive integer'
  },
  notes: {
    required: false
  }
};

export function validateVendor(payload, options) {
  return validateWithSchema(payload, vendorSchema, options);
}