/**
 * Utility to instantiate a wedding template and generate tasks for a specific wedding
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sgMail from '@sendgrid/mail';

const prisma = new PrismaClient();

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generate a random temporary password
 * @returns {string} - Random password (12 characters)
 */
function generateTemporaryPassword() {
  return Math.random().toString(36).slice(2, 14);
}

/**
 * Shift a date to Friday if it falls on a weekend (Saturday or Sunday)
 * @param {Date} date - The date to check and adjust
 * @returns {Date} - The adjusted date (or original if weekday)
 */
function shiftWeekendToFriday(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (dayOfWeek === 0) {
    // Sunday: go back 2 days to Friday
    date.setDate(date.getDate() - 2);
  } else if (dayOfWeek === 6) {
    // Saturday: go back 1 day to Friday
    date.setDate(date.getDate() - 1);
  }
  return date;
}

/**
 * Calculate a task due date based on wedding date and days offset
 * Subtracts days from the wedding date (e.g., 54 weeks = 378 days before wedding)
 * If the calculated date falls on a weekend, shifts it back to Friday
 */
function calculateDueDate(weddingDate, offsetDays) {
  const date = new Date(weddingDate);
  date.setDate(date.getDate() - offsetDays);
  return shiftWeekendToFriday(date);
}

/**
 * Create priority enum mapping
 */
const PRIORITY_ENUM = {
  1: 1, // URGENT maps to priority 1
  2: 2, // HIGH maps to priority 2
  3: 3, // NORMAL maps to priority 3
};

/**
 * Instantiate a wedding planning template for a specific wedding
 * Creates all categories and tasks with calculated due dates
 * Auto-assigns "Client Task -" categories to couple and creates CLIENT user accounts
 *
 * @param {string} weddingId - The ID of the wedding to create tasks for
 * @param {string} templateId - The ID of the template to use
 * @returns {Promise<Object>} - Summary of created categories and tasks
 */
async function instantiateWeddingFromTemplate(weddingId, templateId) {
  try {
    // Fetch the wedding and template
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { spouse1: true, spouse2: true }
    });

    if (!wedding) {
      throw new Error(`Wedding with ID ${weddingId} not found`);
    }

    const template = await prisma.weddingTemplate.findUnique({
      where: { id: templateId },
      include: {
        categories: {
          include: {
            tasks: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Create CLIENT user accounts for spouses if they don't already exist and have email
    const coupleUsers = [];
    if (wedding.spouse1 && wedding.spouse1.email) {
      let clientUser = await prisma.user.findUnique({
        where: { email: wedding.spouse1.email }
      });
      
      if (!clientUser) {
        const tempPassword = "password" //generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        clientUser = await prisma.user.create({
          data: {
            name: wedding.spouse1.name,
            email: wedding.spouse1.email,
            password: hashedPassword,
            role: 'CLIENT',
            emailVerified: false
          }
        });
        console.log(`[Template] Created CLIENT user for spouse1: ${wedding.spouse1.email}`);
        
        // Send welcome email with temporary password
        try {
          await sgMail.send({
            to: wedding.spouse1.email,
            from: 'noreply@weddingplanner.com',
            subject: 'Welcome to Wedding Planner - Your Account is Ready',
            html: `
              <h2>Welcome to Wedding Planner!</h2>
              <p>Hi ${wedding.spouse1.name},</p>
              <p>Your wedding planning account has been created. Here are your login details:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${wedding.spouse1.email}</p>
                <p><strong>Temporary Password:</strong> <code style="font-family: monospace; background: white; padding: 5px; border-radius: 3px;">${tempPassword}</code></p>
              </div>
              <p><strong><a href="${process.env.APP_URL || 'http://localhost:3000'}/login">Log in here</a></strong></p>
              <p style="margin-top: 20px; color: #666;">After logging in, we recommend changing your password for security.</p>
              <p>Happy planning!</p>
            `
          });
          console.log(`[Template] Welcome email sent to ${wedding.spouse1.email}`);
        } catch (emailErr) {
          console.error(`[Template] Failed to send welcome email to ${wedding.spouse1.email}:`, emailErr);
        }
      }
      coupleUsers.push(clientUser);
    }

    if (wedding.spouse2 && wedding.spouse2.email) {
      let clientUser = await prisma.user.findUnique({
        where: { email: wedding.spouse2.email }
      });
      
      if (!clientUser) {
        const tempPassword = "password" //generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        clientUser = await prisma.user.create({
          data: {
            name: wedding.spouse2.name,
            email: wedding.spouse2.email,
            password: hashedPassword,
            role: 'CLIENT',
            emailVerified: false
          }
        });
        console.log(`[Template] Created CLIENT user for spouse2: ${wedding.spouse2.email}`);
        
        // Send welcome email with temporary password
        try {
          await sgMail.send({
            to: wedding.spouse2.email,
            from: 'noreply@weddingplanner.com',
            subject: 'Welcome to Wedding Planner - Your Account is Ready',
            html: `
              <h2>Welcome to Wedding Planner!</h2>
              <p>Hi ${wedding.spouse2.name},</p>
              <p>Your wedding planning account has been created. Here are your login details:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${wedding.spouse2.email}</p>
                <p><strong>Temporary Password:</strong> <code style="font-family: monospace; background: white; padding: 5px; border-radius: 3px;">${tempPassword}</code></p>
              </div>
              <p><strong><a href="${process.env.APP_URL || 'http://localhost:3000'}/login">Log in here</a></strong></p>
              <p style="margin-top: 20px; color: #666;">After logging in, we recommend changing your password for security.</p>
              <p>Happy planning!</p>
            `
          });
          console.log(`[Template] Welcome email sent to ${wedding.spouse2.email}`);
        } catch (emailErr) {
          console.error(`[Template] Failed to send welcome email to ${wedding.spouse2.email}:`, emailErr);
        }
      }
      coupleUsers.push(clientUser);
    }

    // Link the template to the wedding
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { templateId },
    });

    const createdCategories = [];
    const createdTasks = [];

    // Create all categories first
    for (const category of template.categories) {
      const createdCategory = await prisma.taskCategory.create({
        data: {
          name: category.name,
          sortOrder: category.sortOrder,
          weddingId,
        },
      });
      createdCategories.push(createdCategory);
    }

    // Build map of category names to IDs
    const categoryNameMap = new Map();
    for (const category of template.categories) {
      const dbCategory = await prisma.taskCategory.findFirst({
        where: { name: category.name, weddingId },
      });
      if (dbCategory) {
        categoryNameMap.set(category.name, dbCategory.id);
      }
    }

    // Batch create ALL tasks at once
    const allTasksData = [];
    for (const category of template.categories) {
      const isClientTaskCategory = category.name.startsWith('Client Task -');
      const categoryId = categoryNameMap.get(category.name);

      for (const templateTask of category.tasks) {
        allTasksData.push({
          name: templateTask.name,
          description: templateTask.description || null,
          priority: templateTask.defaultPriority,
          dueDate: calculateDueDate(wedding.date, templateTask.defaultDueOffsetDays),
          sortOrder: templateTask.sortOrder,
          categoryId: categoryId,
          templateTaskId: templateTask.id,
          assignToCouple: isClientTaskCategory,
        });
      }
    }

    if (allTasksData.length > 0) {
      await prisma.task.createMany({
        data: allTasksData,
      });
      console.log(`[Template] Batch created all ${allTasksData.length} tasks in one query`);
    }

    // Fetch all created tasks
    const allCreatedTasks = await prisma.task.findMany({
      where: { weddingId },
    });

    // Batch assign couple tasks for all client task categories
    const coupleTasksData = [];
    for (const task of allCreatedTasks) {
      if (task.assignToCouple && coupleUsers.length > 0) {
        for (const coupleUser of coupleUsers) {
          coupleTasksData.push({
            taskId: task.id,
            assignedToId: coupleUser.id,
          });
        }
      }
    }

    if (coupleTasksData.length > 0) {
      await prisma.coupleTask.createMany({
        data: coupleTasksData,
        skipDuplicates: true,
      });
      console.log(`[Template] Batch assigned ${coupleTasksData.length} couple task instances`);
    }

    // Process dependencies (feature for future use - currently disabled)
    // for (const templateTask of template.tasks) {
    //   if (templateTask.dependsOnId) {
    //     // Handle dependency logic here when needed
    //   }
    // }

    // Update wedding to link template (already done during creation, but ensure it's set)
    const taskCount = createdTasks.length;
    console.log(`Successfully created ${taskCount} tasks for wedding ${weddingId}`);

    return {
      success: true,
      weddingId,
      templateId,
      coupleUsersCreated: coupleUsers.length,
      message: `Successfully instantiated template for wedding. Created ${createdCategories.length} categories, ${createdTasks.length} tasks, and ${coupleUsers.length} couple users.`,
      categoriesCreated: createdCategories.length,
      tasksCreated: createdTasks.length,
    };
  } catch (error) {
    console.error('Error instantiating wedding template:', error);
    throw error;
  }
}

/**
 * Create a wedding with a template in a single transaction
 * Useful for creating a new wedding and immediately populating it with template tasks
 *
 * @param {Object} weddingData - Wedding data (date, spouse1Id, spouse2Id, locationId)
 * @param {string} templateId - Template to use
 * @returns {Promise<Object>} - The created wedding with task counts
 */
async function createWeddingWithTemplate(weddingData, templateId) {
  try {
    // Validate template exists
    const template = await prisma.weddingTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Create the wedding
    const wedding = await prisma.wedding.create({
      data: {
        ...weddingData,
        templateId,
      },
    });

    // Instantiate the template for this wedding
    const result = await instantiateWeddingFromTemplate(wedding.id, templateId);

    return {
      wedding,
      templateResult: result,
    };
  } catch (error) {
    console.error('Error creating wedding with template:', error);
    throw error;
  }
}

export {
  instantiateWeddingFromTemplate,
  createWeddingWithTemplate,
  calculateDueDate,
  shiftWeekendToFriday,
};
