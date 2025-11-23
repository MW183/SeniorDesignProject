import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /weddings — filter by date range and return weddings
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { dateFrom, dateTo, limit, offset } = q;
    const where = {};
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const weddings = await prisma.wedding.findMany({ where, take: limit ? parseInt(limit) : undefined, skip: offset ? parseInt(offset) : undefined, orderBy: { date: 'asc' } });
    res.json(weddings);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /weddings/:id — fetch wedding by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    res.json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /weddings — create wedding (requires auth). Validates optional address and client FKs.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, locationId, spouse1Id, spouse2Id } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (locationId) {
      const ok = await ensureExistsOrRespond(res, 'address', locationId, 'locationId');
      if (!ok) return;
    }
    if (spouse1Id) {
      const ok = await ensureExistsOrRespond(res, 'client', spouse1Id, 'spouse1Id');
      if (!ok) return;
    }
    if (spouse2Id) {
      const ok = await ensureExistsOrRespond(res, 'client', spouse2Id, 'spouse2Id');
      if (!ok) return;
    }
    const wedding = await prisma.wedding.create({ data: { date: new Date(date), locationId: locationId || null, spouse1Id: spouse1Id || null, spouse2Id: spouse2Id || null }, select: { id: true, date: true, locationId: true } });
    res.status(201).json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /weddings/:id — update wedding fields (requires auth). Validates provided FKs.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, locationId, spouse1Id, spouse2Id } = req.body;
    const update = {};
    if (date !== undefined) update.date = new Date(date);
    if (locationId !== undefined) update.locationId = locationId;
    if (spouse1Id !== undefined) update.spouse1Id = spouse1Id;
    if (spouse2Id !== undefined) update.spouse2Id = spouse2Id;
    // validate FKs if provided
    if (locationId !== undefined && locationId !== null) {
      const ok = await ensureExistsOrRespond(res, 'address', locationId, 'locationId');
      if (!ok) return;
    }
    if (spouse1Id !== undefined && spouse1Id !== null) {
      const ok = await ensureExistsOrRespond(res, 'client', spouse1Id, 'spouse1Id');
      if (!ok) return;
    }
    if (spouse2Id !== undefined && spouse2Id !== null) {
      const ok = await ensureExistsOrRespond(res, 'client', spouse2Id, 'spouse2Id');
      if (!ok) return;
    }

    const wedding = await prisma.wedding.update({ where: { id }, data: update });
    res.json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /weddings/:id — delete wedding (requires ADMIN or SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.wedding.delete({ where: { id } });
    res.json({ message: 'Wedding deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
