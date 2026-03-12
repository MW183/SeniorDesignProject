/**
 * CSV Parser to automatically generate the wedding planning template
 * Usage: node server/template/parseTemplateFromCSV.js
 *
 * This script reads the CSV file and generates the weddingPlanningTemplate.js
 * No external dependencies required - uses Node's built-in fs module
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, 'full planning template for mike.csv');
const OUTPUT_PATH = path.join(__dirname, 'weddingPlanningTemplate.js');

// Priority mapping
const PRIORITY_MAP = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  '': 3, // Default to NORMAL if empty
};

// Helper function to get the next version number by reading the current template file
function getNextVersionNumber() {
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const content = fs.readFileSync(OUTPUT_PATH, 'utf-8');
      const versionMatch = content.match(/version:\s*(\d+)/);
      if (versionMatch) {
        return parseInt(versionMatch[1], 10) + 1;
      }
    }
  } catch (err) {
    console.warn('Warning: Could not read current template version, starting at 1');
  }
  return 1;
}

// Helper function to parse time anchor strings like "54 Weeks Out" into days
function parseTimeAnchor(timeAnchorStr) {
  if (!timeAnchorStr || typeof timeAnchorStr !== 'string' || timeAnchorStr.trim() === '') {
    return 0;
  }
  const match = timeAnchorStr.match(/(\d+)\s+(?:Weeks?|Days?)\s+Out/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = timeAnchorStr.toLowerCase().includes('week') ? 'week' : 'day';
  return unit === 'week' ? value * 7 : value;
}

// Helper function to create a composite key for (taskName, parentName) uniqueness
function createTaskKey(taskName, parentName) {
  const parent = parentName || 'TOPLEVEL';
  return `${parent}::${taskName}`;
}

// Simple CSV parser that handles quoted fields
function parseCSV(content) {
  const lines = content.split('\n');
  const records = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);

    records.push(fields);
  }

  return records;
}

function parseCsvTemplate() {
  // Read CSV file
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(fileContent);

  // Remove the header row and title rows
  const tasks = records
    .slice(3) // Skip title row, column headers, AND the actual "Task Type" header row
    .filter((record) => {
      if (!record || !record[0] || !record[1]) return false;
      // Explicitly filter out the header row
      if (record[0].trim() === 'Task Type' && record[1].trim() === 'Task Name') return false;
      return true;
    })
    .map((record) => ({
      Type: record[0]?.trim() || '',
      TaskName: record[1]?.trim() || '',
      ParentName: record[2]?.trim() || '',
      Priority: record[3]?.trim() || '',
      AssignedTo: record[4]?.trim() || '',
      Package: record[5]?.trim() || '',
      PipelinePhase: record[6]?.trim() || '',
      TaskCategory: record[7]?.trim() || '',
      TimeAnchor: record[8]?.trim() || '',
    }));

  console.log(`Parsed ${tasks.length} tasks from CSV`);

  // Group tasks by category (using PipelinePhase or TaskCategory)
  const categoryMap = new Map();
  const tasksByName = new Map();

  // First pass: identify categories and create task objects
  const allTasks = [];
  for (let i = 0; i < tasks.length; i++) {
    const record = tasks[i];

    const category = record.PipelinePhase || record.TaskCategory || 'Uncategorized';
    const priority = PRIORITY_MAP[record.Priority?.toUpperCase()] || PRIORITY_MAP.NORMAL;
    const dueOffsetDays = parseTimeAnchor(record.TimeAnchor);

    const taskObj = {
      type: record.Type || 'Task',
      name: record.TaskName || '',
      parentName: record.ParentName || null,
      priority,
      assignedTo: record.AssignedTo || null,
      package: record.Package || null,
      category,
      taskCategory: record.TaskCategory || null,
      dueOffsetDays,
      sortOrder: i,
      description: null,
      isParent: false,
      isMilestone: record.Type === 'Milestone',
    };

    allTasks.push(taskObj);
    const taskKey = createTaskKey(taskObj.name, taskObj.parentName);
    tasksByName.set(taskKey, taskObj);

    // Track categories
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
  }

  // Second pass: identify parent tasks and build hierarchy
  for (const task of allTasks) {
    if (task.parentName) {
      const parentKey = createTaskKey(task.parentName, null);
      if (tasksByName.has(parentKey)) {
        const parentTask = tasksByName.get(parentKey);
        parentTask.isParent = true;
        task.dependsOn = task.parentName;
      }
    }
  }

  // Third pass: group tasks by category
  const categoriesArray = [];
  const categoryOrder = [
    'Onboarding',
    'Planning',
    'Finalization',
    'Day of',
    'Uncategorized',
  ];

  // Sort categories
  const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  let sortOrder = 0;
  for (const categoryName of sortedCategories) {
    const categoryTasks = allTasks.filter((t) => t.category === categoryName);

    if (categoryTasks.length > 0) {
      categoriesArray.push({
        name: categoryName,
        sortOrder: sortOrder,
        tasks: categoryTasks,
      });
      sortOrder++;
    }
  }

  return {
    name: 'Full Planning Wedding Day',
    version: getNextVersionNumber(),
    description: 'Comprehensive wedding planning template with all major phases and vendor categories',
    categories: categoriesArray,
  };
}

function generateTemplateCode(templateData) {
  // Generate the template code
  let code = `/**
 * Full Planning Wedding Day Template
 * Immutable template for generating wedding planning tasks
 * 
 * AUTO-GENERATED from CSV - DO NOT EDIT MANUALLY
 * To update: node server/parseTemplateFromCSV.js
 */

// Priority mapping
const PRIORITY = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
};

// Helper function to parse time anchor strings like "54 Weeks Out" into days
function parseTimeAnchor(timeAnchorStr) {
  if (!timeAnchorStr || typeof timeAnchorStr !== 'string') return 0;
  const match = timeAnchorStr.match(/(\\d+)\\s+(?:Weeks?|Days?)\\s+Out/i);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = timeAnchorStr.toLowerCase().includes('week') ? 'week' : 'day';
  return unit === 'week' ? value * 7 : value;
}

// Helper to convert priority string to number
function getPriorityValue(priorityStr) {
  if (!priorityStr || priorityStr.trim() === '') return PRIORITY.NORMAL;
  return PRIORITY[priorityStr.toUpperCase()] || PRIORITY.NORMAL;
}

/**
 * Full Planning Wedding Day Template
 * Contains all tasks organized by category with dependencies
 */
const WEDDING_PLANNING_TEMPLATE = {
  name: '${templateData.name}',
  version: ${templateData.version},
  description: '${templateData.description}',
  categories: [
`;

  // Generate categories
  for (const category of templateData.categories) {
    code += `    {
      name: '${category.name.replace(/'/g, "\\'")}',
      sortOrder: ${category.sortOrder},
      tasks: [
`;

    // Generate tasks
    for (const task of category.tasks) {
      code += `        {
          name: '${task.name.replace(/'/g, "\\'")}',
          description: ${task.description ? `'${task.description.replace(/'/g, "\\'")}'` : 'null'},
          defaultPriority: PRIORITY.${Object.keys(PRIORITY_MAP).find((k) => PRIORITY_MAP[k] === task.priority) || 'NORMAL'},
          defaultDueOffsetDays: ${task.dueOffsetDays},
          sortOrder: ${task.sortOrder},
          dependsOn: ${task.dependsOn ? `'${task.dependsOn.replace(/'/g, "\\'")}'` : 'null'},
          isParent: ${task.isParent},
          isMilestone: ${task.isMilestone},
        },
`;
    }

    code += `      ],
    },
`;
  }

  code += `  ],
};

export {
  WEDDING_PLANNING_TEMPLATE,
  PRIORITY,
  parseTimeAnchor,
  getPriorityValue,
};
`;

  return code;
}

async function main() {
  try {
    console.log('Parsing template from CSV...');

    // Check if CSV exists
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`CSV file not found: ${CSV_PATH}`);
      process.exit(1);
    }

    // Parse the CSV
    const templateData = parseCsvTemplate();

    console.log(`\nTemplate structure:`);
    console.log(`  Name: ${templateData.name}`);
    console.log(`  Version: ${templateData.version}`);
    console.log(`  Categories: ${templateData.categories.length}`);
    let totalTasks = 0;
    for (const cat of templateData.categories) {
      console.log(`    - ${cat.name}: ${cat.tasks.length} tasks`);
      totalTasks += cat.tasks.length;
    }
    console.log(`  Total tasks: ${totalTasks}`);

    // Generate code
    const code = generateTemplateCode(templateData);

    // Write output file
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, code, 'utf-8');

    console.log(`\nTemplate generated successfully!`);
    console.log(`Output: ${OUTPUT_PATH}`);
    console.log(`\nNext steps:`);
    console.log(`1. npx prisma migrate dev --name add_wedding_template`);
    console.log(`2. node server/seed-template.js`);
  } catch (error) {
    console.error('Error parsing template:', error);
    process.exit(1);
  }
}

main();
