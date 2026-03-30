import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import {validateVendor} from '../validators/validateVendor.js';

const router = express.Router();

// GET /vendors — list vendors, optional search and pagination
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { search, searchBy = 'name', limit, offset } = q;
    const where = {};

    if (search) {
      if (searchBy === 'tag') {
        // Search by tag name
        where.tags = {
          some: {
            tag: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        };
      } else if (searchBy === 'email') {
        // Search by email
        where.email = { contains: search, mode: 'insensitive' };
      } else if (searchBy === 'phone') {
        // Search by phone
        where.phone = { contains: search, mode: 'insensitive' };
      } else {
        // Default: search by vendor name
        where.name = { contains: search, mode: 'insensitive' };
      }
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: { tags: { include: { tag: true } } },
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

// GET /tags — list all tags (MUST come before /:id route)
router.get('/tags/list', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    res.json(tags);
  } catch (err) {
    console.error('[GET /vendors/tags/list] Error:', err);
    handlePrismaError(res, err);
  }
});

// POST /tags — create a new tag (MUST come before /:id route)
router.post('/tags/create', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Create or get existing tag (upsert)
    const tag = await prisma.tag.upsert({
      where: { name: name.trim() },
      create: { name: name.trim() },
      update: {}
    });

    res.status(201).json(tag);
  } catch (err) {
    console.error('[POST /vendors/tags/create] Error:', err);
    handlePrismaError(res, err);
  }
});

// POST /vendors/:id/tags/:tagId — add tag to vendor (MUST come before /:id route)
router.post('/:id/tags/:tagId', requireAuth, async (req, res) => {
  try {
    const { id: vendorId, tagId } = req.params;

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    // Verify tag exists
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    // Add tag (upsert to handle if already exists)
    const vendorTag = await prisma.vendorTag.upsert({
      where: { vendorId_tagId: { vendorId, tagId } },
      create: { vendorId, tagId },
      update: {}
    });

    res.status(201).json(vendorTag);
  } catch (err) {
    console.error(`[POST /vendors/${req.params.id}/tags/${req.params.tagId}] Error:`, err);
    handlePrismaError(res, err);
  }
});

// DELETE /vendors/:id/tags/:tagId — remove tag from vendor (MUST come before /:id route)
router.delete('/:id/tags/:tagId', requireAuth, async (req, res) => {
  try {
    const { id: vendorId, tagId } = req.params;

    await prisma.vendorTag.delete({
      where: { vendorId_tagId: { vendorId, tagId } }
    });

    res.json({ message: 'Tag removed from vendor' });
  } catch (err) {
    console.error(`[DELETE /vendors/${req.params.id}/tags/${req.params.tagId}] Error:`, err);
    handlePrismaError(res, err);
  }
});

// GET /vendors/:id — fetch single vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    console.error(`[GET /vendors/${req.params.id}] Error:`, err);
    handlePrismaError(res, err);
  }
});

// POST /vendors – create vendor (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    // Use the validator instead of manual validation
    const { data, errors } = validateVendor(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    // Validate addressId if provided
    if (data.addressId) {
      const ok = await ensureExistsOrRespond(res, 'address', data.addressId, 'addressId');
      if (!ok) return; 
    }

    const vendor = await prisma.vendor.create({ data });
    res.status(201).json(vendor);
  } catch (err) {
    console.error('[POST /vendors] Error:', err);
    handlePrismaError(res, err);
  }
});

// PUT /vendors/:id – update vendor (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use the validator
    const { data, errors } = validateVendor(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    // Validate addressId if provided
    if (data.addressId !== undefined && data.addressId !== null) {
      const ok = await ensureExistsOrRespond(res, 'address', data.addressId, 'addressId');
      if (!ok) return; 
    }

    const vendor = await prisma.vendor.update({ where: { id }, data });
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