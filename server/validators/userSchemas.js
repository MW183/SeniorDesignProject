import { z } from 'zod';

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'USER', 'SUPPORT']).optional(),
  phone: z.string().optional().nullable()
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'USER', 'SUPPORT']).optional(),
  phone: z.string().optional().nullable()
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN','USER','SUPPORT']).optional(),
  email: z.string().email().optional(),
  limit: z.preprocess((val) => val ? Number(val) : undefined, z.number().int().positive().optional()),
  offset: z.preprocess((val) => val ? Number(val) : undefined, z.number().int().nonnegative().optional())
});
