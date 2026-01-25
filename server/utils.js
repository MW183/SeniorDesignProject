import prisma from './prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


// Handles Prisma errors and returns consistent JSON responses.
// Includes error details only in non-production environments.

export const handlePrismaError = (res, error) => {
  console.error(error); // always log

  const details = process.env.NODE_ENV !== 'production' ? error.meta || error.message : undefined;

  if (error && error.code) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({ error: 'Unique constraint failed.', details });
      case 'P2025':
        return res.status(404).json({ error: 'Record not found.', details });
      case 'P2003':
        return res.status(400).json({ error: 'Foreign key constraint failed.', details });
      default:
        return res.status(500).json({ error: 'Internal server error.', details });
    }
  }

  return res.status(500).json({ error: 'Internal server error.', details });
};


// Throws if a referenced record does not exist.
// modelName = lowercase Prisma model (e.g., 'user', 'address')

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


// Custom error class for missing foreign key references

export class FKNotFoundError extends Error {
  constructor(modelName, id, label = 'id') {
    super(`${label} ${id} not found in ${modelName}`);
    this.name = 'FKNotFoundError';
    this.model = modelName;
    this.missingId = id;
    this.label = label;
  }
}


// Ensures FK exists, responds with 400 JSON if not, returns true if exists

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


// Hash a password using bcrypt

export async function hashPassword(password) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
}


// Compare plain password with hash

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}


// Sign JWT with payload
// Throws if JWT_SECRET is missing in production
export function signJwt(payload, expiresIn = '1h') {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production!');
  }
  return jwt.sign(payload, secret || 'dev-secret', { expiresIn });
}


// Verify JWT token
// Throws if invalid or expired

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.verify(token, secret);
}