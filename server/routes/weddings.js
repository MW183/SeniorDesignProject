import express from 'express';
import prisma from '../prismaClient.js';
import { handlePrismaError, ensureExistsOrRespond, hashPassword, signJwt } from '../utils.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { instantiateWeddingTemplate, calculateDueDate, shiftWeekendToFriday } from '../utils/instantiateWeddingTemplate.js';
import sgMail from '@sendgrid/mail';

const router = express.Router();

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Create a CLIENT user account and send verification email
 * @param {string} email - Client email
 * @param {string} name - Client name  
 * @returns {Promise<string>} - User ID
 */
async function createOrGetClientUser(email, name) {
  // Check if CLIENT user already exists
  let clientUser = await prisma.user.findUnique({
    where: { email }
  });
  
  if (clientUser) {
    return clientUser.id;
  }
  
  // Generate verification token and expiration
  const verificationToken = signJwt({ type: 'email_verify' }, process.env.EMAIL_VERIFY_EXPIRES || '24h');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Create new CLIENT user with NO password (will be set after verification)
  const tempPassword = await hashPassword(Math.random().toString(36).slice(2)); // Random hash, never used
  
  clientUser = await prisma.user.create({
    data: {
      name,
      email,
      password: tempPassword,
      role: 'CLIENT',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    }
  });
  
  // Send verification email with set password link
  const setPasswordLink = `${process.env.APP_URL || 'http://localhost:5173'}/set-password?token=${verificationToken}`;
  
  try {
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || process.env.SENDER_EMAIL || 'mikeweinstein183@gmail.com',
      subject: 'Welcome to Wedding Planner - Set Your Password',
      html: `
        <h2>Welcome to Wedding Planner!</h2>
        <p>Hi ${name},</p>
        <p>Your wedding planning account has been created. Please click the link below to set your password and verify your email:</p>
        <a href="${setPasswordLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Set Your Password
        </a>
        <p>Or copy this link: ${setPasswordLink}</p>
        <p>This link expires in 24 hours.</p>
        <p>Once you've set your password, you'll be able to log in and start viewing your wedding planning tasks.</p>
        <p>Happy planning!</p>
      `
    });
    console.log(`[Weddings] Verification email sent to ${email}`);
  } catch (emailErr) {
    console.error(`[Weddings] Failed to send verification email to ${email}:`, emailErr);
  }
  
  return clientUser.id;
}

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
    const wedding = await prisma.wedding.findUnique({ 
      where: { id },
      include: {
        spouse1: true,
        spouse2: true,
        location: true
      }
    });
    if (!wedding) return res.status(404).json({ error: 'Wedding not found' });
    res.json(wedding);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /weddings — create wedding and assign to current planner (requires auth)
// Can accept spouse1Id/spouse2Id (User IDs) or inline spouse data { name, email, phone }
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, locationId, spouse1Id, spouse2Id, spouse1, spouse2, templateId } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    
    if (locationId) {
      const ok = await ensureExistsOrRespond(res, 'address', locationId, 'locationId');
      if (!ok) return;
    }
    
    // Handle spouse1: either existing User ID or create new User
    let finalSpouse1Id = null;
    if (spouse1Id) {
      const ok = await ensureExistsOrRespond(res, 'user', spouse1Id, 'spouse1Id');
      if (!ok) return;
      finalSpouse1Id = spouse1Id;
    } else if (spouse1 && spouse1.name && spouse1.email) {
      // Create new User with role=CLIENT
      const userId = await createOrGetClientUser(spouse1.email, spouse1.name);
      finalSpouse1Id = userId;
    }
    
    // Handle spouse2: either existing User ID or create new User
    let finalSpouse2Id = null;
    if (spouse2Id) {
      const ok = await ensureExistsOrRespond(res, 'user', spouse2Id, 'spouse2Id');
      if (!ok) return;
      finalSpouse2Id = spouse2Id;
    } else if (spouse2 && spouse2.name && spouse2.email) {
      // Create new User with role=CLIENT
      const userId = await createOrGetClientUser(spouse2.email, spouse2.name);
      finalSpouse2Id = userId;
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
        spouse1Id: finalSpouse1Id,
        spouse2Id: finalSpouse2Id,
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
        template: true,
        spouse1: true,
        spouse2: true
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
            template: true,
            spouse1: true,
            spouse2: true
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
// If date is updated, automatically recalculates all task due dates
// Can accept spouse1/spouse2 by ID or by inline data { name, email, phone }
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, locationId, spouse1Id, spouse2Id, spouse1, spouse2, templateId } = req.body;
    const update = {};
    
    // Check if wedding exists and capture old date before update
    const oldWedding = await prisma.wedding.findUnique({ where: { id } });
    if (!oldWedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    let dateHasChanged = false;
    let newDate = null;
    let dateDiffDays = 0;
    
    if (date !== undefined) {
      newDate = new Date(date);
      // Check if date is actually different (rounded down in days)
      const oldTime = oldWedding.date.getTime();
      const newTime = newDate.getTime();
      if (oldTime !== newTime) {
        dateHasChanged = true;
        // Calculate difference in days, rounded down
        dateDiffDays = Math.floor((newTime - oldTime) / (1000 * 60 * 60 * 24));
      }
      update.date = newDate;
    }
    
    if (locationId !== undefined) update.locationId = locationId;
    if (templateId !== undefined) update.templateId = templateId;
    
    // validate FKs if provided
    if (locationId !== undefined && locationId !== null) {
      const ok = await ensureExistsOrRespond(res, 'address', locationId, 'locationId');
      if (!ok) return;
    }
    
    // Handle spouse1: either existing ID, inline data, or clear it
    if (spouse1Id !== undefined || spouse1 !== undefined) {
      if (spouse1Id) {
        const ok = await ensureExistsOrRespond(res, 'client', spouse1Id, 'spouse1Id');
        if (!ok) return;
        update.spouse1Id = spouse1Id;
      } else if (spouse1 && spouse1.name) {
        // Create or update client from inline data
        let clientId = null;
        if (spouse1.email) {
          // Try to find existing client by email
          const existingClient = await prisma.client.findFirst({
            where: { email: spouse1.email }
          });
          if (existingClient) {
            clientId = existingClient.id;
            // Update existing client with new data
            await prisma.client.update({
              where: { id: clientId },
              data: {
                name: spouse1.name,
                phone: spouse1.phone || undefined
              }
            });
          } else {
            // Create new client
            const newClient = await prisma.client.create({
              data: {
                name: spouse1.name,
                email: spouse1.email,
                phone: spouse1.phone || null
              }
            });
            clientId = newClient.id;
          }
          
          // Create CLIENT user account if it doesn't exist
          await createOrGetClientUser(spouse1.email, spouse1.name);
        } else {
          // Create new client without email
          const newClient = await prisma.client.create({
            data: {
              name: spouse1.name,
              phone: spouse1.phone || null
            }
          });
          clientId = newClient.id;
        }
        update.spouse1Id = clientId;
      } else if (spouse1Id === null) {
        update.spouse1Id = null;
      }
    }
    
    // Handle spouse2: either existing ID, inline data, or clear it
    if (spouse2Id !== undefined || spouse2 !== undefined) {
      if (spouse2Id) {
        const ok = await ensureExistsOrRespond(res, 'client', spouse2Id, 'spouse2Id');
        if (!ok) return;
        update.spouse2Id = spouse2Id;
      } else if (spouse2 && spouse2.name) {
        // Create or update client from inline data
        let clientId = null;
        if (spouse2.email) {
          // Try to find existing client by email
          const existingClient = await prisma.client.findFirst({
            where: { email: spouse2.email }
          });
          if (existingClient) {
            clientId = existingClient.id;
            // Update existing client with new data
            await prisma.client.update({
              where: { id: clientId },
              data: {
                name: spouse2.name,
                phone: spouse2.phone || undefined
              }
            });
          } else {
            // Create new client
            const newClient = await prisma.client.create({
              data: {
                name: spouse2.name,
                email: spouse2.email,
                phone: spouse2.phone || null
              }
            });
            clientId = newClient.id;
          }
          
          // Create CLIENT user account if it doesn't exist
          await createOrGetClientUser(spouse2.email, spouse2.name);
        } else {
          // Create new client without email
          const newClient = await prisma.client.create({
            data: {
              name: spouse2.name,
              phone: spouse2.phone || null
            }
          });
          clientId = newClient.id;
        }
        update.spouse2Id = clientId;
      } else if (spouse2Id === null) {
        update.spouse2Id = null;
      }
    }
    
    if (templateId !== undefined && templateId !== null) {
      const ok = await ensureExistsOrRespond(res, 'weddingTemplate', templateId, 'templateId');
      if (!ok) return;
    }

    // If date has changed, recalculate all task due dates for this wedding
    if (dateHasChanged) {
      try {
        const tasks = await prisma.task.findMany({
          where: {
            category: {
              weddingId: id
            }
          },
          include: {
            templateTask: true
          }
        });
        
        // Recalculate due dates for each task
        for (const task of tasks) {
          let newDueDate;
          
          if (task.templateTask?.defaultDueOffsetDays !== undefined) {
            // Recalculate from template offset with new wedding date
            newDueDate = calculateDueDate(newDate, task.templateTask.defaultDueOffsetDays);
          } else {
            // Shift manually created task by the same amount the wedding date moved
            newDueDate = new Date(task.dueDate);
            newDueDate.setDate(newDueDate.getDate() + dateDiffDays);
            // Apply weekend adjustment
            newDueDate = shiftWeekendToFriday(newDueDate);
          }
          
          await prisma.task.update({
            where: { id: task.id },
            data: { dueDate: newDueDate }
          });
        }
        
        console.log(`[Weddings] Updated ${tasks.length} task due dates for wedding ${id} (date shifted by ${dateDiffDays} days)`);
      } catch (err) {
        console.error('Error recalculating task due dates:', err);
        // Don't fail the wedding update, but log the error
        return res.status(500).json({ error: 'Wedding updated but task due dates could not be recalculated', details: err.message });
      }
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

// GET /weddings/:id/vendors — get all vendors assigned to a wedding (with ratings/notes)
router.get('/:id/vendors', async (req, res) => {
  try {
    const { id } = req.params;
    
    const weddingVendors = await prisma.weddingVendor.findMany({
      where: { weddingId: id },
      include: {
        vendor: {
          include: {
            address: true,
            tags: {
              include: { tag: true }
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(weddingVendors);
  } catch (err) { handlePrismaError(res, err); }
});

// POST /weddings/:id/vendors/:vendorId — assign a vendor to a wedding (rating=0, notes=null)
router.post('/:id/vendors/:vendorId', requireAuth, async (req, res) => {
  try {
    const { id, vendorId } = req.params;

    // Verify wedding exists
    const wedding = await prisma.wedding.findUnique({ where: { id } });
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if already assigned
    const existing = await prisma.weddingVendor.findUnique({
      where: { weddingId_vendorId: { weddingId: id, vendorId } }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Vendor is already assigned to this wedding' });
    }

    // Assign vendor with rating=0, notes=null
    const assignment = await prisma.weddingVendor.create({
      data: {
        weddingId: id,
        vendorId: vendorId,
        rating: 0,
        notes: null
      },
      include: {
        vendor: {
          include: {
            address: true,
            tags: {
              include: { tag: true }
            }
          }
        }
      }
    });

    console.log(`[Weddings] Assigned vendor ${vendorId} to wedding ${id}`);

    res.status(201).json(assignment);
  } catch (err) { handlePrismaError(res, err); }
});

// PUT /weddings/:id/vendors/:vendorId — update vendor rating and notes (rating > 0 requires notes)
router.put('/:id/vendors/:vendorId', requireAuth, async (req, res) => {
  try {
    const { id, vendorId } = req.params;
    const { rating, notes } = req.body;

    // Verify assignment exists
    const assignment = await prisma.weddingVendor.findUnique({
      where: { weddingId_vendorId: { weddingId: id, vendorId } }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Vendor is not assigned to this wedding' });
    }

    // Validate rating
    if (rating !== undefined && (rating < 0 || rating > 5 || !Number.isInteger(rating))) {
      return res.status(400).json({ error: 'Rating must be an integer between 0 and 5' });
    }

    // Validate: rating > 0 requires notes
    if (rating !== undefined && rating > 0 && (!notes || notes.trim().length === 0)) {
      return res.status(400).json({ error: 'Notes are required when rating is greater than 0' });
    }

    // Update
    const updated = await prisma.weddingVendor.update({
      where: { weddingId_vendorId: { weddingId: id, vendorId } },
      data: {
        ...(rating !== undefined && { rating }),
        ...(notes !== undefined && { notes: notes && notes.trim().length > 0 ? notes : null })
      },
      include: {
        vendor: {
          include: {
            address: true,
            tags: {
              include: { tag: true }
            }
          }
        }
      }
    });

    console.log(`[Weddings] Updated vendor ${vendorId} on wedding ${id} - rating: ${updated.rating}, hasNotes: ${!!updated.notes}`);

    res.json(updated);
  } catch (err) { handlePrismaError(res, err); }
});

// DELETE /weddings/:id/vendors/:vendorId — remove a vendor from a wedding
router.delete('/:id/vendors/:vendorId', requireAuth, async (req, res) => {
  try {
    const { id, vendorId } = req.params;

    const assignment = await prisma.weddingVendor.findUnique({
      where: { weddingId_vendorId: { weddingId: id, vendorId } }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Vendor is not assigned to this wedding' });
    }

    await prisma.weddingVendor.delete({
      where: { weddingId_vendorId: { weddingId: id, vendorId } }
    });

    console.log(`[Weddings] Removed vendor ${vendorId} from wedding ${id}`);

    res.json({ message: 'Vendor removed from wedding' });
  } catch (err) { handlePrismaError(res, err); }
});

export default router;
