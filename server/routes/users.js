// Express router for User CRUD + auth-related actions
import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, hashPassword } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateUser } from '../validators/validateUsers.js';

const router = express.Router();

// GET /users — list users with optional query filters
router.get('/', requireAuth, async (req, res) => {
  try {
    // parse query params
    const { search, email, role, limit, offset } = req.query || {};
    const where = {};

    // free-text search on name OR email (case-insensitive)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // exact email filter
    if (email) where.email = { equals: email, mode: 'insensitive' };

    // role filter
    if (role) where.role = role;

    // query DB with optional pagination
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /users/:id — fetch single user
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /users — create a new user (signup)
router.post('/', async (req, res) => {
  try {
    // validate body using generic validator
    const { data, errors } = validateUser(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    if (!data.role) data.role = 'USER';

    // hash password before storing
    const hashed = await hashPassword(data.password);
    data.password = hashed;

    // Auto-validate CLIENT and USER roles on creation
    const shouldAutoValidate = ['CLIENT', 'USER'].includes(data.role);

    // create user in DB
    const user = await prisma.user.create({
      data: {
        ...data,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim() || null,
        emailVerified: shouldAutoValidate
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
    });

    res.status(201).json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /users/:id — partial update (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // validate body; requireAll=false for partial updates
    const { data, errors } = validateUser(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    // hash password if updating
    if (data.password) data.password = await hashPassword(data.password);

    // normalize strings
    if (data.name) data.name = data.name.trim();
    if (data.email) data.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) data.phone = data.phone?.trim() || null;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
    });

    res.json(user);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /users/:id — remove user (ADMIN or SUPPORT only)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;