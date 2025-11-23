// Express router for Client CRUD
import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /clients — build query from query params and return list
router.get('/', async (req, res) => {
  try {
    // parse optional filters and pagination
    const q = req.parsedQuery || req.query || {};
    const { search, email, limit, offset } = q;
    const where = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (email) where.email = { equals: email, mode: 'insensitive' };

    // query DB and return results
    const clients = await prisma.client.findMany({ where, take: limit ? parseInt(limit) : undefined, skip: offset ? parseInt(offset) : undefined, orderBy: { createdAt: 'desc' } });
    res.json(clients);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /clients/:id — fetch single client by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /clients — create a new client (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // validate body and create record
    const { name, email, phone, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const client = await prisma.client.create({ data: { name: name.trim(), email: email?.toLowerCase().trim() || null, phone: phone?.trim() || null, notes: notes || null }, select: { id: true, name: true, email: true, phone: true, createdAt: true } });
    res.status(201).json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /clients/:id — update client fields (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) update.email = email?.toLowerCase().trim() || null;
    if (phone !== undefined) update.phone = phone ? phone.trim() : null;
    if (notes !== undefined) update.notes = notes;

    const client = await prisma.client.update({ where: { id }, data: update });
    res.json(client);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /clients/:id — hard delete but block if any future weddings exist (requires ADMIN/SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check for future weddings referencing this client as spouse1 or spouse2
    const now = new Date();
    const futureWedding = await prisma.wedding.findFirst({
      where: {
        OR: [ { spouse1Id: id }, { spouse2Id: id } ],
        date: { gte: now }
      }
    });

    // if future wedding exists, block deletion
    if (futureWedding) {
      return res.status(400).json({ error: 'Cannot delete client with future weddings' });
    }

    // Safe to delete - this will nullify spouse references on past weddings due to onDelete: SetNull
    const client = await prisma.client.delete({ where: { id }, select: { id: true, name: true } });
    res.json({ message: 'Client deleted', client });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
