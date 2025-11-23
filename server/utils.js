import prisma from './prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const handlePrismaError = (res, error) => {
  console.error(error);

  if (error && error.code) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({ error: 'Unique constraint failed.' });
      case 'P2025':
        return res.status(404).json({ error: 'Record not found.' });
      case 'P2003':
        return res.status(400).json({ error: 'Foreign key constraint failed.' });
      default:
        return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  return res.status(500).json({ error: 'Internal server error.' });
};

// Ensure a referenced record exists. modelName should be the lower-case Prisma model name (e.g. 'user', 'address').
export async function ensureExists(modelName, id, label = 'id') {
  if (!id) throw new FKNotFoundError(modelName, id, label);
  const modelMethod = prisma[modelName];
  if (!modelMethod || typeof modelMethod.findUnique !== 'function') {
    throw new Error(`Unknown model ${modelName}`);
  }
  const found = await modelMethod.findUnique({ where: { id } });
  if (!found) throw new FKNotFoundError(modelName, id, label);
  return true;
}

export class FKNotFoundError extends Error {
  constructor(modelName, id, label = 'id') {
    super(`${label} ${id} not found in ${modelName}`);
    this.name = 'FKNotFoundError';
    this.model = modelName;
    this.missingId = id;
    this.label = label;
  }
}

// Wrapper that responds with 400 on missing FK and returns true if exists.
export async function ensureExistsOrRespond(res, modelName, id, label = 'id') {
  try {
    await ensureExists(modelName, id, label);
    return true;
  } catch (err) {
    if (err && err.name === 'FKNotFoundError') {
      res.status(400).json({ error: `${label} does not reference a valid ${modelName}` });
      return false;
    }
    throw err;
  }
}

// Password + JWT helpers
export async function hashPassword(password) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload, expiresIn = '1h') {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.verify(token, secret);
}
