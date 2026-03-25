import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /tasks — filter by status/assigned user/category/wedding and return tasks
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { status, assignedTo, categoryId, weddingId, limit, offset } = q;
    const where = {};
    if (status) where.currentStatus = status;
    if (assignedTo) where.assignedToId = assignedTo;
    if (categoryId) where.categoryId = categoryId;
    if (weddingId) {
      where.category = {
        weddingId: weddingId
      };
    }

    const tasks = await prisma.task.findMany({ 
      where, 
      take: limit ? parseInt(limit) : undefined, 
      skip: offset ? parseInt(offset) : undefined, 
      orderBy: { dueDate: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            weddingId: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    res.json(tasks);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /tasks/assigned/me — get tasks assigned to current user grouped by category
router.get('/assigned/me', requireAuth, async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { status, weddingId } = q;
    const where = {
      assignedToId: req.user.id
    };
    if (status) where.currentStatus = status;
    if (weddingId) {
      where.category = {
        weddingId: weddingId
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            weddingId: true,
            sortOrder: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Sort by category's sortOrder on the client side
    const sorted = tasks.sort((a, b) => {
      if (a.category.sortOrder !== b.category.sortOrder) {
        return a.category.sortOrder - b.category.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json(sorted);
  } catch (err) { 
    console.error('[Tasks/assigned/me] Error:', err);
    handlePrismaError(res, err); 
  }
});

// GET /tasks/:id — fetch a single task by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /tasks — create task (requires auth). Validates category FK and required fields.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, priority, dueDate, categoryId, sortOrder, assignedToId, templateTaskId } = req.body;
    if (!name || priority === undefined || !dueDate || !categoryId) {
      return res.status(400).json({ error: 'Missing required fields: name, priority, dueDate, categoryId' });
    }
    // validate category exists
    const okCategory = await ensureExistsOrRespond(res, 'taskCategory', categoryId, 'categoryId');
    if (!okCategory) return; // response already sent
    
    // validate optional FKs
    if (assignedToId) {
      const ok = await ensureExistsOrRespond(res, 'user', assignedToId, 'assignedToId');
      if (!ok) return;
    }
    if (templateTaskId) {
      const ok = await ensureExistsOrRespond(res, 'templateTask', templateTaskId, 'templateTaskId');
      if (!ok) return;
    }
    
    const task = await prisma.task.create({ 
      data: { 
        name: name.trim(), 
        description: description?.trim() || null,
        priority: parseInt(priority), 
        dueDate: new Date(dueDate), 
        categoryId,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        assignedToId: assignedToId || null,
        templateTaskId: templateTaskId || null
      }, 
      select: { 
        id: true, 
        name: true, 
        description: true,
        priority: true, 
        dueDate: true,
        categoryId: true,
        sortOrder: true
      } 
    });
    res.status(201).json(task);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /tasks/:id — partial update of task fields (requires auth). Validates referenced user FKs when provided.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, priority, dueDate, sortOrder, assignedToId, currentStatus, completedOn, completedById, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description?.trim() || null;
    if (priority !== undefined) update.priority = parseInt(priority);
    if (dueDate !== undefined) update.dueDate = new Date(dueDate);
    if (sortOrder !== undefined) update.sortOrder = parseInt(sortOrder);
    if (assignedToId !== undefined) update.assignedToId = assignedToId;
    if (currentStatus !== undefined) update.currentStatus = currentStatus;
    if (completedOn !== undefined) update.completedOn = completedOn ? new Date(completedOn) : null;
    if (completedById !== undefined) update.completedById = completedById;
    if (notes !== undefined) update.notes = notes;

    // validate FK references if provided
    if (assignedToId !== undefined && assignedToId !== null) {
      const ok = await ensureExistsOrRespond(res, 'user', assignedToId, 'assignedToId');
      if (!ok) return;
    }
    if (completedById !== undefined && completedById !== null) {
      const ok = await ensureExistsOrRespond(res, 'user', completedById, 'completedById');
      if (!ok) return;
    }

    const task = await prisma.task.update({ where: { id }, data: update });
    res.json(task);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /tasks/:id — delete task (requires ADMIN or SUPPORT role)
router.delete('/:id', requireAuth, requireRole(['ADMIN','SUPPORT']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
