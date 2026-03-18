import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { instantiateWeddingTemplate } from '../utils/instantiateWeddingTemplate.js';

const router = express.Router();

// GET /weddings — filter by date range and return weddings for current planner (or all if admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const { dateFrom, dateTo, limit, offset, plannerId } = q;
    const where = {};
    const isAdmin = req.user.role === 'ADMIN';
    
    // If not admin, only show weddings assigned to current user
    if (!isAdmin) {
      where.planners = {
        some: { plannerId: req.user.id }
      };
    } else if (plannerId) {
      // Admin can filter by specific planner
      where.planners = {
        some: { plannerId }
      };
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const weddings = await prisma.wedding.findMany({ 
      where, 
      take: limit ? parseInt(limit) : undefined, 
      skip: offset ? parseInt(offset) : undefined, 
      orderBy: { date: 'asc' }, 
      include: { 
        planners: { include: { planner: true } }, 
        categories: { 
          include: { tasks: true },
          orderBy: { sortOrder: 'asc' }
        },
        spouse1: true,
        spouse2: true,
        location: true,
        template: true
      } 
    });
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

// POST /weddings — create wedding and assign to current planner (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, locationId, spouse1Id, spouse2Id, templateId } = req.body;
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
    if (templateId) {
      const ok = await ensureExistsOrRespond(res, 'weddingTemplate', templateId, 'templateId');
      if (!ok) return;
    }
    
    // Create wedding and link to planner in same operation
    const wedding = await prisma.wedding.create({ 
      data: { 
        date: new Date(date), 
        locationId: locationId || null, 
        spouse1Id: spouse1Id || null, 
        spouse2Id: spouse2Id || null,
        templateId: templateId || null,
        planners: {
          create: {
            plannerId: req.user.id
          }
        }
      }, 
      include: {
        categories: {
          include: { tasks: true },
          orderBy: { sortOrder: 'asc' }
        },
        template: true
      }
    });

    // If templateId provided, auto-populate tasks
    if (templateId) {
      try {
        await instantiateWeddingTemplate(wedding.id, templateId);
        // Refetch to include newly created tasks
        const updatedWedding = await prisma.wedding.findUnique({
          where: { id: wedding.id },
          include: {
            categories: {
              include: { tasks: true },
              orderBy: { sortOrder: 'asc' }
            },
            template: true
          }
        });
        res.status(201).json(updatedWedding);
        return;
      } catch (err) {
        console.error('Error instantiating template:', err);
        // Don't fail the wedding creation, but log the error
      }
    }

    res.status(201).json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /weddings/:id — update wedding fields (requires auth). Validates provided FKs.
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, locationId, spouse1Id, spouse2Id, templateId } = req.body;
    const update = {};
    if (date !== undefined) update.date = new Date(date);
    if (locationId !== undefined) update.locationId = locationId;
    if (spouse1Id !== undefined) update.spouse1Id = spouse1Id;
    if (spouse2Id !== undefined) update.spouse2Id = spouse2Id;
    if (templateId !== undefined) update.templateId = templateId;
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
    if (templateId !== undefined && templateId !== null) {
      const ok = await ensureExistsOrRespond(res, 'weddingTemplate', templateId, 'templateId');
      if (!ok) return;
    }

    const wedding = await prisma.wedding.update({ where: { id }, data: update });
    res.json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /weddings/:id — remove planner from wedding (or delete if any admin/support)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPPORT';
    
    // Check if user has access to this wedding
    const plannerWedding = await prisma.plannerWedding.findUnique({
      where: { plannerId_weddingId: { plannerId: req.user.id, weddingId: id } }
    });
    
    if (!plannerWedding && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to this wedding' });
    }
    
    if (isAdmin) {
      // Admins can delete the entire wedding
      await prisma.wedding.delete({ where: { id } });
      res.json({ message: 'Wedding deleted' });
    } else {
      // Non-admins just remove themselves
      await prisma.plannerWedding.delete({
        where: { plannerId_weddingId: { plannerId: req.user.id, weddingId: id } }
      });
      res.json({ message: 'Removed from wedding' });
    }
  } catch (err) { handlePrismaError(res, err); }
});

// POST /weddings/:id/assign-planner — assign a planner to a wedding (requires admin)
router.post('/:id/assign-planner', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { plannerId } = req.body;

    if (!plannerId) {
      return res.status(400).json({ error: 'plannerId is required' });
    }

    // Verify wedding exists
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    // Verify planner exists
    const planner = await prisma.user.findUnique({ where: { id: plannerId } });
    if (!planner) {
      return res.status(404).json({ error: 'Planner not found' });
    }

    // Check if already assigned
    const existing = await prisma.plannerWedding.findUnique({
      where: { plannerId_weddingId: { plannerId, weddingId: id } }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Planner is already assigned to this wedding' });
    }

    // Create assignment
    const assignment = await prisma.plannerWedding.create({
      data: {
        plannerId,
        weddingId: id
      },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        wedding: true
      }
    });

    // Assign all unassigned tasks in this wedding's categories to the new planner
    await prisma.task.updateMany({
      where: {
        category: {
          weddingId: id
        },
        assignedToId: null
      },
      data: {
        assignedToId: plannerId
      }
    });

    console.log(`[Weddings] Assigned ${plannerId} to wedding ${id} and auto-assigned unassigned tasks`);

    res.status(201).json(assignment);
  } catch (err) { handlePrismaError(res, err); }
});

// GET /weddings/:id/planners — get all planners assigned to a wedding
router.get('/:id/planners', async (req, res) => {
  try {
    const { id } = req.params;
    
    const planners = await prisma.plannerWedding.findMany({
      where: { weddingId: id },
      include: {
        planner: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(planners.map(pw => pw.planner));
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /weddings/:id/planners/:plannerId — remove a planner from a wedding (requires admin)
router.delete('/:id/planners/:plannerId', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id, plannerId } = req.params;

    const assignment = await prisma.plannerWedding.findUnique({
      where: { plannerId_weddingId: { plannerId, weddingId: id } }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Planner is not assigned to this wedding' });
    }

    // Unassign all tasks assigned to this planner in this wedding
    await prisma.task.updateMany({
      where: {
        assignedToId: plannerId,
        category: {
          weddingId: id
        }
      },
      data: {
        assignedToId: null
      }
    });

    await prisma.plannerWedding.delete({
      where: { plannerId_weddingId: { plannerId, weddingId: id } }
    });

    console.log(`[Weddings] Removed ${plannerId} from wedding ${id} and unassigned their tasks`);

    res.json({ message: 'Planner removed from wedding' });
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /weddings/:id/reassign-tasks — bulk reassign tasks from one planner to another (requires admin)
router.put('/:id/reassign-tasks', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { fromPlannerId, toPlannerId } = req.body;

    if (!fromPlannerId || !toPlannerId) {
      return res.status(400).json({ error: 'fromPlannerId and toPlannerId are required' });
    }

    if (fromPlannerId === toPlannerId) {
      return res.status(400).json({ error: 'Cannot reassign tasks to the same planner' });
    }

    // Verify wedding exists
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    // Verify both planners exist
    const fromPlanner = await prisma.user.findUnique({ where: { id: fromPlannerId } });
    if (!fromPlanner) {
      return res.status(404).json({ error: 'From planner not found' });
    }

    const toPlanner = await prisma.user.findUnique({ where: { id: toPlannerId } });
    if (!toPlanner) {
      return res.status(404).json({ error: 'To planner not found' });
    }

    // Bulk reassign tasks
    const result = await prisma.task.updateMany({
      where: {
        assignedToId: fromPlannerId,
        category: {
          weddingId: id
        }
      },
      data: {
        assignedToId: toPlannerId
      }
    });

    console.log(`[Weddings] Reassigned ${result.count} tasks from ${fromPlannerId} to ${toPlannerId} for wedding ${id}`);

    res.json({ 
      message: `Reassigned ${result.count} tasks from ${fromPlanner.name} to ${toPlanner.name}`,
      count: result.count 
    });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
