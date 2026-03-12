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
  normalize: v => { 
    if (v === undefined || v === null) return 0; 
    return 0; // Don't process decimals or invalid values
  },
  validate: (normalized, payload) => {
    const original = payload.rating;
    if (original === undefined || original === null) return true;
    
    
    if (typeof original === 'number' && !Number.isInteger(original)) {
      return 'rating must be an integer (not a decimal)';
    }
    
    
    if (typeof original === 'number' && original < 0) {
      return 'rating must be positive';
    }
    
    
    if (typeof original === 'number' && (original < 0 || original > 10)) {
      return 'rating must be between 0 and 10';
    }
    
    return true;
  }
},
  notes: {
    required: false
  }
};

export function validateVendor(payload, options) {
  return validateWithSchema(payload, vendorSchema, options);
}