// Express router for User CRUD + auth-related user actions
import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, hashPassword, comparePassword } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { userCreateSchema, userUpdateSchema, userQuerySchema } from '../validators/userSchemas.js';

const router = express.Router();

// GET /users
// build query: parse query params and construct Prisma `where` filter
router.get('/', requireAuth, validateQuery(userQuerySchema), async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { search, email, role, limit, offset } = q;
    // initialize where filter
    const where = {};

    // if a free-text `search` is provided, match name OR email case-insensitively
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // if exact email filter present, add case-insensitive equality
    if (email) where.email = { equals: email, mode: 'insensitive' };
    // if role filter present, add equality
    if (role) where.role = role;

    // execute query with pagination and ordering, selecting safe fields
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { createdAt: 'desc' }
    });

    // return results
    res.json(users);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /users/:id — fetch single user by id
router.get('/:id', async (req, res) => {
  try {
    // read path parameter
    const { id } = req.params;
    // fetch user and select non-sensitive fields
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } });
    // error check: 404 when user not found
    if (!user) return res.status(404).json({ error: 'User not found' });
    // return user
    res.json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /users — create a new user (signup is public)
router.post('/', validateBody(userCreateSchema), async (req, res) => {
  try {
    // extract and validate request body
    const { name, email, phone, password, role } = req.body;
    // hash the supplied password before storing
    const hashed = await hashPassword(password);
    // create user record; normalize email and trim fields
    const user = await prisma.user.create({ data: { name: name.trim(), email: email.toLowerCase().trim(), phone: phone?.trim() || null, password: hashed, role }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } });
    // respond with created user (no password returned)
    res.status(201).json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /users/:id — partial update of user fields (requires auth)
router.put('/:id', requireAuth, validateBody(userUpdateSchema), async (req, res) => {
  try {
    // read path parameter and possible update fields
    const { id } = req.params;
    const { name, email, phone, role, password } = req.body;
    const update = {};
    // conditionally add provided fields to update object
    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) update.email = email.toLowerCase().trim();
    if (phone !== undefined) update.phone = phone ? phone.trim() : null;
    if (role !== undefined) update.role = role;
    if (password !== undefined) update.password = await hashPassword(password);

    // perform update and return selected fields
    const user = await prisma.user.update({ where: { id }, data: update, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } });
    res.json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /users/:id — remove a user (restricted to ADMIN and SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    // read path parameter
    const { id } = req.params;
    // delete from DB
    await prisma.user.delete({ where: { id } });
    // respond with message only
    res.json({ message: 'User deleted' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
