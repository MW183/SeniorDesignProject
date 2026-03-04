import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { validateTaskCategory } from '../validators/taskCategory.js';

const router = express.Router();

// GET /task-categories — list task categories with optional filters
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { weddingId, limit, offset } = q;
    const where = {};
    
    if (weddingId) {
      where.weddingId = weddingId;
    }

    const categories = await prisma.taskCategory.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        wedding: {
          select: {
            id: true,
            date: true,
            spouse1: {
              select: {
                id: true,
                name: true
              }
            },
            spouse2: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json(categories);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// GET /task-categories/:id — fetch single task category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.taskCategory.findUnique({
      where: { id },
      include: {
        wedding: {
          select: {
            id: true,
            date: true,
            spouse1: {
              select: {
                id: true,
                name: true
              }
            },
            spouse2: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Task category not found' });
    }
    
    res.json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// POST /task-categories — create new task category (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data, errors } = validateTaskCategory(req.body, { requireAll: true });
    if (errors.length) return res.status(400).json({ errors });

    // Validate wedding exists
    const ok = await ensureExistsOrRespond(res, 'wedding', data.weddingId, 'weddingId');
    if (!ok) return;

    const category = await prisma.taskCategory.create({
      data,
      include: {
        wedding: {
          select: {
            id: true,
            date: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// PUT /task-categories/:id — update task category (requires auth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, errors } = validateTaskCategory(req.body, { requireAll: false });
    if (errors.length) return res.status(400).json({ errors });

    const category = await prisma.taskCategory.update({
      where: { id },
      data
    });

    res.json(category);
  } catch (err) {
    handlePrismaError(res, err);
  }
});

// DELETE /task-categories/:id — delete task category (requires ADMIN or SUPPORT)
// Note: This will cascade delete all tasks in the category
router.delete('/:id', requireAuth, requireRole(['ADMIN', 'SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check how many tasks will be deleted
    const taskCount = await prisma.task.count({
      where: { categoryId: id }
    });
    
    await prisma.taskCategory.delete({ where: { id } });
    res.json({ 
      message: 'Task category deleted',
      tasksDeleted: taskCount
    });
  } catch (err) {
    handlePrismaError(res, err);
  }
});

export default router;
