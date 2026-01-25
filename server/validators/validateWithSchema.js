export function validateWithSchema(payload, schema, { requireAll = false } = {}) {
  const errors = [];
  const data = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = payload[field];

    // Required field check
    if (value === undefined) {
      if (requireAll && rules.required) {
        errors.push(`${field} is required`);
      }
      continue;
    }

    // Normalization
    let normalized = value;
    if (rules.normalize) {
      try {
        normalized = rules.normalize(value);
      } catch {
        errors.push(`${field} is invalid`);
        continue;
      }
    }

    // Validation
    if (rules.validate) {
      const result = rules.validate(normalized, payload);
      if (result !== true) {
        errors.push(result);
        continue;
      }
    }

    data[field] = normalized;
  }

  if (!Object.keys(data).length) {
    errors.push('no valid fields provided');
  }

  return { data, errors };
}