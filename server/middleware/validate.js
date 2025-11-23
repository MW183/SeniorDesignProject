import { z } from 'zod';

export function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation', details: parsed.error.format() });
        }
        req.body = parsed.data;
        next();
    };
}

export function validateQuery(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation', details: parsed.error.format() });
        }
        // do not overwrite req.query (may be getter-only in some environments)
        req.parsedQuery = parsed.data;
        next();
    };
}