import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /vendors — list vendors, optional search and pagination
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { search, limit, offset } = q;
    const where = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const vendors = await prisma.vendor.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { name: 'asc' }
    });

    res.json(vendors);
  } catch (err) {
    console.error('[GET /vendors] Error:', err);
    handlePrismaError(res, err);
  }
});

// GET /vendors/:id — fetch single vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    console.error(`[GET /vendors/${req.params.id}] Error:`, err);
    handlePrismaError(res, err);
  }
});

// POST /vendors — create vendor (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, addressId, email, phone, rating, notes } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Validate addressId if provided
    if (addressId) {
      const ok = await ensureExistsOrRespond(res, 'address', addressId, 'addressId');
      if (!ok) return; // response already sent
    }

    const vendorData = {
      name: name.trim(),
      addressId: addressId || null,
      email: email?.toLowerCase().trim() || null,
      phone: phone?.trim() || null,
      rating: typeof rating === 'number' ? rating : 0, // ensure Int
      notes: notes || null
    };

    const vendor = await prisma.vendor.create({ data: vendorData });
    res.status(201).json(vendor);
  } catch (err) {
    console.error('[POST /vendors] Error:', err);
    handlePrismaError(res, err);
  }
});

// PUT /vendors/:id — update vendor (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, addressId, email, phone, rating, notes } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) update.email = email?.toLowerCase().trim() || null;
    if (phone !== undefined) update.phone = phone?.trim() || null;
    if (notes !== undefined) update.notes = notes;
    if (rating !== undefined) update.rating = typeof rating === 'number' ? rating : 0;

    // Validate addressId if provided
    if (addressId !== undefined) {
      if (addressId !== null) {
        const ok = await ensureExistsOrRespond(res, 'address', addressId, 'addressId');
        if (!ok) return; // response already sent
      }
      update.addressId = addressId;
    }

    const vendor = await prisma.vendor.update({ where: { id }, data: update });
    res.json(vendor);
  } catch (err) {
    console.error(`[PUT /vendors/${req.params.id}] Error:`, err);
    handlePrismaError(res, err);
  }
});

// DELETE /vendors/:id — remove vendor (requires ADMIN/SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vendor.delete({ where: { id } });
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    console.error(`[DELETE /vendors/${req.params.id}] Error:`, err);
    handlePrismaError(res, err);
  }
});

export default router;