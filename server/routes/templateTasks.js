import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateTemplateTask } from '../validators/validateTemplateTask.js';

const router = express.Router();

// GET /template-tasks — list template tasks with optional filters
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { categoryId, templateId, limit, offset } = q;
    const where = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (templateId) {
      where.category = {
        templateId: templateId
      };
    }

    const tasks = await prisma.templateTask.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            templateId: true,
            template: {
              select: {
                id: true,
                name: true,
                version: true
              }
            }
          }
        }
      }
    });

    res.json(tasks);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /template-tasks/:id — fetch single template task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.templateTask.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            templateId: true,
            template: {
              select: {
                id: true,
                name: true,
                version: true
              }
            }
          }
        }
      }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Template task not found' });
    }
    
    res.json(task);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /template-tasks — create new template task (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateTemplateTask(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    // Validate category exists
    const ok = await ensureExistsOrRespond(res, 'templateCategory', data.categoryId, 'categoryId');
    if (!ok) return;

    const task = await prisma.templateTask.create({
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            templateId: true
          }
        }
      }
    });

    res.status(201).json(task);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /template-tasks/:id — update template task (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, errors } = validateTemplateTask(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const task = await prisma.templateTask.update({
      where: { id },
      data
    });

    res.json(task);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /template-tasks/:id — delete template task (requires ADMIN or SUPPORT)
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.templateTask.delete({ where: { id } });
    res.json({ message: 'Template task deleted' });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
