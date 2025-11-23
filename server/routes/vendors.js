import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /vendors — build query from query params and return vendor list
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { search, tag, limit, offset } = q;
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    // tag filtering will require join; leave for later

    const vendors = await prisma.vendor.findMany({ where, take: limit ? parseInt(limit) : undefined, skip: offset ? parseInt(offset) : undefined, orderBy: { name: 'asc' } });
    res.json(vendors);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /vendors/:id — fetch vendor by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /vendors — create vendor record (requires auth). Validates optional address FK.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, addressId, email, phone, rating, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (addressId) {
      const ok = await ensureExistsOrRespond(res, 'address', addressId, 'addressId');
      if (!ok) return; // response already sent
    }
    const vendor = await prisma.vendor.create({ data: { name: name.trim(), addressId: addressId || null, email: email?.toLowerCase().trim() || null, phone: phone?.trim() || null, rating: rating || 0, notes: notes || null }, select: { id: true, name: true, addressId: true } });
    res.status(201).json(vendor);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /vendors/:id — partial update of vendor fields (requires auth). Validates address FK when provided.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, addressId, email, phone, rating, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (addressId !== undefined) update.addressId = addressId;
    if (email !== undefined) update.email = email?.toLowerCase().trim() || null;
    if (phone !== undefined) update.phone = phone ? phone.trim() : null;
    if (rating !== undefined) update.rating = rating;
    if (notes !== undefined) update.notes = notes;

    if (addressId !== undefined && addressId !== null) {
      const ok = await ensureExistsOrRespond(res, 'address', addressId, 'addressId');
      if (!ok) return; // response already sent
    }

    const vendor = await prisma.vendor.update({ where: { id }, data: update });
    res.json(vendor);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /vendors/:id — delete vendor (requires ADMIN or SUPPORT role)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vendor.delete({ where: { id } });
    res.json({ message: 'Vendor deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
