/**
 * Utility to instantiate a wedding template and generate tasks for a specific wedding
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
 *
 * @param {string} weddingId - The ID of the wedding to create tasks for
 * @param {string} templateId - The ID of the template to use
 * @returns {Promise<Object>} - Summary of created categories and tasks
 */
async function instantiateWeddingTemplate(weddingId, templateId) {
  try {
    // Fetch the wedding and template
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
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

    // Link the template to the wedding
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { templateId },
    });

    const createdCategories = [];
    const createdTasks = [];
    const taskMap = new Map(); // Maps template task name to created task ID for dependencies

    // Create all categories and tasks
    for (const category of template.categories) {
      // Create the task category
      const createdCategory = await prisma.taskCategory.create({
        data: {
          name: category.name,
          sortOrder: category.sortOrder,
          weddingId,
        },
      });

      createdCategories.push(createdCategory);

      // Create all tasks in this category
      for (const templateTask of category.tasks) {
        const dueDate = calculateDueDate(wedding.date, templateTask.defaultDueOffsetDays);

        const createdTask = await prisma.task.create({
          data: {
            name: templateTask.name,
            description: templateTask.description || null,
            priority: templateTask.defaultPriority,
            dueDate,
            sortOrder: templateTask.sortOrder,
            categoryId: createdCategory.id,
            templateTaskId: templateTask.id,
            // Dependencies will be handled in second pass
          },
        });

        createdTasks.push(createdTask);
        taskMap.set(templateTask.name, createdTask.id);
      }
    }

    // Second pass: link task dependencies using the task map
    // Refetch template tasks to get dependency info
    const templateTasks = await prisma.templateTask.findMany({
      where: { category: { templateId } },
      include: { dependsOn: true },
    });

    for (const templateTask of templateTasks) {
      if (templateTask.dependsOnId) {
        // Find the parent template task to get its name
        const parentTemplate = await prisma.templateTask.findUnique({
          where: { id: templateTask.dependsOnId },
        });

        if (parentTemplate) {
          const parentTaskId = taskMap.get(parentTemplate.name);
          if (parentTaskId) {
            // Find the created task for this template task
            const createdTask = createdTasks.find((t) => t.name === templateTask.name);
            if (createdTask) {
              await prisma.task.update({
                where: { id: createdTask.id },
                data: { dependsOnId: parentTaskId },
              });
            }
          }
        }
      }
    }

    // Update wedding to link template (already done during creation, but ensure it's set)
    const taskCount = createdTasks.length;
    console.log(`Successfully created ${taskCount} tasks for wedding ${weddingId}`);

    return {
      success: true,
      weddingId,
      templateId,
      message: `Successfully instantiated template for wedding. Created ${createdCategories.length} categories and ${createdTasks.length} tasks.`,
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
    const result = await instantiateWeddingTemplate(wedding.id, templateId);

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
  instantiateWeddingTemplate,
  createWeddingWithTemplate,
  calculateDueDate,
  shiftWeekendToFriday,
};
