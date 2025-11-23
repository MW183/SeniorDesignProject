import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// GET /tasks — filter by status/assigned user/wedding and return tasks
router.get('/', async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { status, assignedTo, weddingId, limit, offset } = q;
    const where = {};
    if (status) where.currentStatus = status;
    if (assignedTo) where.assignedToId = assignedTo;
    if (weddingId) where.weddingId = weddingId;

    const tasks = await prisma.task.findMany({ where, take: limit ? parseInt(limit) : undefined, skip: offset ? parseInt(offset) : undefined, orderBy: { dueDate: 'asc' } });
    res.json(tasks);
  } catch (err) { handlePrismaError(res, err); }
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

// POST /tasks — create task (requires auth). Validates wedding FK and required fields.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, priority, dueDate, weddingId } = req.body;
    if (!name || priority === undefined || !dueDate || !weddingId) return res.status(400).json({ error: 'Missing required fields' });
    // validate wedding exists
    const okWedding = await ensureExistsOrRespond(res, 'wedding', weddingId, 'weddingId');
    if (!okWedding) return; // response already sent
    const task = await prisma.task.create({ data: { name: name.trim(), priority: parseInt(priority), dueDate: new Date(dueDate), weddingId }, select: { id: true, name: true, priority: true, dueDate: true } });
    res.status(201).json(task);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /tasks/:id — partial update of task fields (requires auth). Validates referenced user FKs when provided.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, priority, dueDate, assignedToId, currentStatus, completedOn, completedById, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (priority !== undefined) update.priority = parseInt(priority);
    if (dueDate !== undefined) update.dueDate = new Date(dueDate);
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
