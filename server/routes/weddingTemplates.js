import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateWeddingTemplate } from '../validators/weddingTemplate.js';

const router = express.Router();

// GET /wedding-templates — list templates with optional filters
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { name, version, limit, offset } = q;
    const where = {};
    
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    if (version) {
      where.version = parseInt(version);
    }

    const templates = await prisma.weddingTemplate.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            tasks: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    res.json(templates);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /wedding-templates/:id — fetch single template by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.weddingTemplate.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            tasks: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Wedding template not found' });
    }
    
    res.json(template);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /wedding-templates — create new template (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateWeddingTemplate(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    const template = await prisma.weddingTemplate.create({
      data,
      include: {
        categories: true
      }
    });

    res.status(201).json(template);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /wedding-templates/:id — update template (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, errors } = validateWeddingTemplate(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const template = await prisma.weddingTemplate.update({
      where: { id },
      data
    });

    res.json(template);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /wedding-templates/:id — delete template (requires ADMIN or SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if template is in use by any weddings
    const weddingsUsingTemplate = await prisma.wedding.count({
      where: { templateId: id }
    });
    
    if (weddingsUsingTemplate > 0) {
      return res.status(400).json({ 
        error: `Cannot delete template: ${weddingsUsingTemplate} wedding(s) are using this template` 
      });
    }
    
    await prisma.weddingTemplate.delete({ where: { id } });
    res.json({ message: 'Wedding template deleted' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
