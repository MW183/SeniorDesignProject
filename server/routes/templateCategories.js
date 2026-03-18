import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateTemplateCategory } from '../validators/validateTemplateCategory.js';

const router = express.Router();

// GET /template-categories — list categories with optional filters
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { templateId, limit, offset } = q;
    const where = {};
    
    if (templateId) {
      where.templateId = templateId;
    }

    const categories = await prisma.templateCategory.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        tasks: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.json(categories);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /template-categories/:id — fetch single category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.templateCategory.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        tasks: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Template category not found' });
    }
    
    res.json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /template-categories — create new category (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateTemplateCategory(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    // Validate template exists
    const ok = await ensureExistsOrRespond(res, 'weddingTemplate', data.templateId, 'templateId');
    if (!ok) return;

    const category = await prisma.templateCategory.create({
      data,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            version: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /template-categories/:id — update category (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, errors } = validateTemplateCategory(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const category = await prisma.templateCategory.update({
      where: { id },
      data
    });

    res.json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /template-categories/:id — delete category (requires ADMIN or SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.templateCategory.delete({ where: { id } });
    res.json({ message: 'Template category deleted' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
