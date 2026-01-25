import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateClient } from '../validators/client.js';

const router = express.Router();

// GET /clients
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { search, email, limit, offset } = q;
    const where = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
    if (email) where.email = { equals: email, mode: 'insensitive' };

    const clients = await prisma.client.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /clients
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateClient(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /clients/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateClient(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /clients/:id
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;