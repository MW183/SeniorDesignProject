/**
 * Seed script to populate the database with the wedding planning template
 * Run with: node templates/seed-template.js
 */

import { PrismaClient } from '@prisma/client';
import {
  WEDDING_PLANNING_TEMPLATE,
  parseTimeAnchor,
  getPriorityValue,
} from './weddingPlanningTemplate.js';

const prisma = new PrismaClient();

// Helper function to create a composite key for (taskName, parentName) uniqueness
function createTaskKey(taskName, parentName) {
  const parent = parentName || 'TOPLEVEL';
  return `${parent}::${taskName}`;
}

async function seedTemplate() {
  try {
    console.log('Starting template seed...');
    
    // Count tasks in the imported template
    let templateTaskCount = 0;
    for (const cat of WEDDING_PLANNING_TEMPLATE.categories) {
      templateTaskCount += cat.tasks.length;
    }
    console.log(`Template contains ${templateTaskCount} tasks across ${WEDDING_PLANNING_TEMPLATE.categories.length} categories`);

    // Check if template already exists
    const existingTemplate = await prisma.weddingTemplate.findUnique({
      where: {
        name_version: {
          name: WEDDING_PLANNING_TEMPLATE.name,
          version: WEDDING_PLANNING_TEMPLATE.version,
        },
      },
    });

    if (existingTemplate) {
      console.log(
        `Template "${WEDDING_PLANNING_TEMPLATE.name}" version ${WEDDING_PLANNING_TEMPLATE.version} already exists.`
      );
      console.log('Skipping seed. To update, delete the old template first.');
      return;
    }

    // Create the wedding template
    const template = await prisma.weddingTemplate.create({
      data: {
        name: WEDDING_PLANNING_TEMPLATE.name,
        version: WEDDING_PLANNING_TEMPLATE.version,
      },
    });

    console.log(`Created wedding template: ${template.name} (v${template.version})`);

    // Create categories and tasks
    for (const categoryData of WEDDING_PLANNING_TEMPLATE.categories) {
      // Create the template category
      const category = await prisma.templateCategory.create({
        data: {
          name: categoryData.name,
          sortOrder: categoryData.sortOrder,
          templateId: template.id,
        },
      });

      console.log(`  Created category: ${category.name}`);

      // Create tasks for this category
      for (const taskData of categoryData.tasks) {
        const task = await prisma.templateTask.create({
          data: {
            name: taskData.name,
            description: taskData.description || null,
            taskType: taskData.taskType || 'Task',
            dependencyMetadata: taskData.dependencyMetadata || null,
            defaultPriority: taskData.defaultPriority,
            defaultDueOffsetDays: taskData.defaultDueOffsetDays,
            sortOrder: taskData.sortOrder,
            categoryId: category.id,
          },
        });

        if (taskData.sortOrder % 5 === 0) {
          console.log(`    - ${task.name} (due ${task.defaultDueOffsetDays} days before wedding)`);
        }
      }
    }

    // Count actual tasks in database
    const taskCount = await prisma.templateTask.count({
      where: { categoryId: { in: (await prisma.templateCategory.findMany({ where: { templateId: template.id } })).map(c => c.id) } }
    });
    
    console.log(
      `\nSuccessfully seeded template with ${templateTaskCount} tasks across ${WEDDING_PLANNING_TEMPLATE.categories.length} categories!`
    );
    console.log(`Database contains ${taskCount} total tasks created.`);
    console.log(`\nTemplate ID: ${template.id}`);
    console.log('You can now create weddings using this template.');

    return template;
  } catch (error) {
    console.error('Error seeding template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTemplate().catch((error) => {
  console.error(error);
  process.exit(1);
});
