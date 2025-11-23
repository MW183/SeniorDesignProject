import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /addresses — filter by city/state/zip and return addresses
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { city, state, zip, limit, offset } = q;
    const where = {};
    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (state) where.state = { equals: state, mode: 'insensitive' };
    if (zip) where.zip = { equals: zip };

    const addresses = await prisma.address.findMany({ where, take: limit ? parseInt(limit) : undefined, skip: offset ? parseInt(offset) : undefined });
    res.json(addresses);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /addresses/:id — fetch a single address by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const address = await prisma.address.findUnique({ where: { id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });
    res.json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /addresses — create an address record (requires auth). Validates required fields.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { street, city, state, zip } = req.body;
    if (!street || !city || !state || !zip) return res.status(400).json({ error: 'Street, city, state and zip are required' });
    const address = await prisma.address.create({ data: { street: street.trim(), city: city.trim(), state: state.trim(), zip: zip.trim() } });
    res.status(201).json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /addresses/:id — partial update of address fields (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { street, city, state, zip } = req.body;
    const update = {};
    if (street !== undefined) update.street = street.trim();
    if (city !== undefined) update.city = city.trim();
    if (state !== undefined) update.state = state.trim();
    if (zip !== undefined) update.zip = zip.trim();

    const address = await prisma.address.update({ where: { id }, data: update });
    res.json(address);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /addresses/:id — delete address (requires ADMIN or SUPPORT role)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.address.delete({ where: { id } });
    res.json({ message: 'Address deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
