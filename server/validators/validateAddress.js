import { validateWithSchema } from './validateWithSchema.js';

const addressSchema = {
  street: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'street cannot be empty'
  },
  city: {
    required: true,
    normalize: v => v.trim(),
    validate: v => v.length > 0 || 'city cannot be empty'
  },
  state: {
    required: true,
    normalize: v => v.trim().toUpperCase(),
    validate: v => v.length === 2 || 'state must be a 2-letter code'
  },
  zip: {
    required: true,
    normalize: v => v.trim(),
    validate: v =>
      /^\d{5}(-\d{4})?$/.test(v) || 'zip must be a valid US ZIP code'
  },
  type: {
    required: true,
    validate: v =>
      ['Venue', 'Vendor', 'Client'].includes(v) ||
      'type must be Venue, Vendor, or Client'
  }
};

export function validateAddress(payload, options) {
  return validateWithSchema(payload, addressSchema, options);
}