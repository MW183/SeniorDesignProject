import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateAddress } from '../validators/validateAddress.js';

const router = express.Router();

// GET /addresses — list with optional filters
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { city, state, zip, type, limit, offset } = q;

    const where = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { equals: state, mode: 'insensitive' };
    if (zip) where.zip = { equals: zip };
    if (type) where.type = type;

    const addresses = await prisma.address.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined
    });

    res.json(addresses);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /addresses/:id — fetch single address
router.get('/:id', async (req, res) => {
  try {
    const address = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });
    res.json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /addresses — create address (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // validate payload
    const { data, errors } = validateAddress(req.body, { requireAll: true });
    if (errors.length) {
      return res.status(400).json({ errors });
    }
    const address = await prisma.address.create({ data });
    res.status(201).json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /addresses/:id — partial update (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateAddress(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const address = await prisma.address.update({ where: { id: req.params.id }, data });
    res.json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /addresses/:id — delete address (requires ADMIN or SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ message: 'Address deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;