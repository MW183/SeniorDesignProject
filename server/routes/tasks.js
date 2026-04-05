import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import sgMail from '@sendgrid/mail';

const router = express.Router();

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

// GET /tasks/couple/me — get couple tasks assigned to current user (for CLIENT role)
router.get('/couple/me', requireAuth, async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { status, weddingId } = q;
    
    // Get all couple tasks assigned to this user
    const coupleTaskAssignments = await prisma.coupleTask.findMany({
      where: {
        assignedToId: req.user.id
      },
      include: {
        task: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                weddingId: true,
                sortOrder: true
              }
            }
          }
        }
      }
    });

    // Filter by status and weddingId if provided
    let tasks = coupleTaskAssignments.map(ct => ct.task);
    
    if (status) {
      tasks = tasks.filter(t => t.currentStatus === status);
    }
    
    if (weddingId) {
      tasks = tasks.filter(t => t.category.weddingId === weddingId);
    }

    // Sort by category's sortOrder and then by name
    const sorted = tasks.sort((a, b) => {
      if (a.category.sortOrder !== b.category.sortOrder) {
        return a.category.sortOrder - b.category.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });

    res.json(sorted);
  } catch (err) { 
    console.error('[Tasks/couple/me] Error:', err);
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
    const { name, description, priority, dueDate, sortOrder, assignedToId, currentStatus, completedOn, completedById, notes, assignToCouple } = req.body;
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
    if (assignToCouple !== undefined) update.assignToCouple = assignToCouple;

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

// GET /tasks/:id/couple — get all couple task assignments for this task
router.get('/:id/couple', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const coupleAssignments = await prisma.coupleTask.findMany({
      where: { taskId: id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json(coupleAssignments);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /tasks/:id/couple — assign a couple member to a task
router.post('/:id/couple', requireAuth, requireRole(['ADMIN', 'SUPPORT', 'USER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    if (!assignedToId) {
      return res.status(400).json({ error: 'assignedToId is required' });
    }

    // Verify task exists and get full details
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            name: true,
            weddingId: true
          }
        }
      }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mark task as assignToCouple if not already
    if (!task.assignToCouple) {
      await prisma.task.update({ where: { id }, data: { assignToCouple: true } });
    }

    // Create couple task assignment
    const coupleTask = await prisma.coupleTask.create({
      data: {
        taskId: id,
        assignedToId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    }).catch(err => {
      if (err.message.includes('Unique constraint failed')) {
        return res.status(400).json({ error: 'User already assigned to this couple task' });
      }
      throw err;
    });

    // Send email to the assigned client if email is provided
    if (user.email && user.role === 'CLIENT') {
      try {
        // Fetch wedding info for email
        const wedding = await prisma.wedding.findUnique({
          where: { id: task.category.weddingId },
          select: {
            id: true,
            date: true,
            spouse1: { select: { name: true } },
            spouse2: { select: { name: true } }
          }
        });

        const weddingDate = wedding?.date ? new Date(wedding.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'TBD';

        const coupleNames = [wedding?.spouse1?.name, wedding?.spouse2?.name]
          .filter(Boolean)
          .join(' & ') || 'Your Wedding';

        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@weddingplanner.com',
          subject: `Action Required: ${task.name} - ${coupleNames}'s Wedding`,
          html: `
            <h2>Action Required for Your Wedding!</h2>
            <p>Hi ${user.name},</p>
            <p>Your wedding planner has assigned you a task that needs your input:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${task.name}</h3>
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
              <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Category:</strong> ${task.category.name}</p>
              ${task.notes ? `<p><strong>Notes from Planner:</strong> ${task.notes}</p>` : ''}
            </div>
            <p>Please log in to your wedding planning portal to complete this task.</p>
            <p>If you have any questions, please reach out to your wedding planner.</p>
            <p>Best regards,<br/>Wedding Planning Team</p>
          `
        };

        await sgMail.send(mailOptions);
      } catch (emailErr) {
        console.error('Failed to send couple task notification email:', emailErr);
        // Don't fail the API response if email fails, just log it
      }
    }

    res.status(201).json(coupleTask);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /tasks/:id/couple/:userId — remove a couple member from a task
router.delete('/:id/couple/:userId', requireAuth, requireRole(['ADMIN', 'SUPPORT', 'USER']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Delete couple task assignment
    await prisma.coupleTask.delete({
      where: {
        taskId_assignedToId: { taskId: id, assignedToId: userId }
      }
    }).catch(err => {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Couple task assignment not found' });
      }
      throw err;
    });

    res.json({ message: 'Couple task assignment removed' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
