/**
 * CSV Parser to automatically generate the wedding planning template
 * Usage: node server/template/parseTemplateFromCSV.js
 *
 * This script reads a CSV file from the templates directory and generates 
 * the weddingPlanningTemplate.js. Allows selection of CSV file if multiple exist.
 * No external dependencies required - uses Node's built-in fs module
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, 'weddingPlanningTemplate.js');

// Priority mapping
const PRIORITY_MAP = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  '': 3, // Default to NORMAL if empty
};

// Function to find all CSV files in the templates directory
function findCsvFiles() {
  const csvFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.csv'))
    .sort();
  return csvFiles;
}

// Function to prompt user for CSV selection
async function selectCsvFile(csvFiles) {
  if (csvFiles.length === 0) {
    throw new Error('No CSV files found in the templates directory');
  }

  if (csvFiles.length === 1) {
    console.log(`Found 1 CSV file: ${csvFiles[0]}`);
    return csvFiles[0];
  }

  console.log('\nAvailable templates:');
  csvFiles.forEach((file, index) => {
    console.log(`[${index + 1}]: ${file}`);
  });

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('\nEnter the number associated with the desired template >> ', (answer) => {
      rl.close();
      const selectedIndex = parseInt(answer, 10) - 1;

      if (selectedIndex < 0 || selectedIndex >= csvFiles.length || isNaN(selectedIndex)) {
        console.error('Invalid selection. Please enter a valid number.');
        process.exit(1);
      }

      resolve(csvFiles[selectedIndex]);
    });
  });
}

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

function parseCsvTemplate(csvFileName) {
  const CSV_PATH = path.join(__dirname, csvFileName);
  
  // Read CSV file
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parseCSV(fileContent);

  // Extract header row to map columns
  const headerRow = records[0].map(h => h.trim()); // Trim whitespace/carriage returns
  const columnMap = {
    TaskType: headerRow.indexOf('Task Type'),
    TaskName: headerRow.indexOf('Task Name'),
    TaskCategory: headerRow.indexOf('Task Category'),
    Dependencies: headerRow.indexOf('Dependencies'),
    Priority: headerRow.indexOf('Priority'),
    TimeAnchor: headerRow.indexOf('Time Anchor (drop down)'),
  };
  
  console.log('\n=== CSV COLUMN MAPPING ===');
  console.log('Header row:', headerRow);
  console.log('Header row length:', headerRow.length);
  headerRow.forEach((col, idx) => {
    console.log(`  [${idx}]: "${col}" (length: ${col.length}, bytes: ${Buffer.from(col).toString('hex')})`);
  });
  console.log('Column map:', columnMap);

  // Parse records, filtering out header and non-task rows
  const tasks = records
    .slice(1) // Skip header row
    .filter((record) => {
      if (!record || !record[columnMap.TaskType]) return false;
      const taskType = record[columnMap.TaskType].trim();
      // Only keep "Task" and "Couple Tasks" rows; skip "Category" and "Phase"
      return taskType === 'Task' || taskType === 'Couple Tasks';
    })
    .map((record, index) => {
      const taskTypeStr = record[columnMap.TaskType]?.trim() || 'Task';
      const priority = PRIORITY_MAP[record[columnMap.Priority]?.toUpperCase()] || PRIORITY_MAP.NORMAL;
      const timeAnchorRaw = record[columnMap.TimeAnchor]?.trim(); // Trim here too
      const dueOffsetDays = parseTimeAnchor(timeAnchorRaw);
      
      // Debug logging for first few tasks
      if (index < 5) {
        console.log(`Task: ${record[columnMap.TaskName]?.trim()}`);
        console.log(`  TimeAnchor raw: "${timeAnchorRaw}"`);
        console.log(`  TimeAnchor index: ${columnMap.TimeAnchor}`);
        console.log(`  Record length: ${record.length}`);
        console.log(`  Parsed offset days: ${dueOffsetDays}`);
      }

      return {
        taskType: taskTypeStr === 'Couple Tasks' ? 'CoupleTask' : 'Task',
        name: record[columnMap.TaskName]?.trim() || '',
        category: record[columnMap.TaskCategory]?.trim() || 'Uncategorized',
        dependencyMetadata: record[columnMap.Dependencies]?.trim() || null,
        priority,
        dueOffsetDays,
        sortOrder: index,
        description: null,
      };
    });

  console.log(`Parsed ${tasks.length} tasks from CSV (filtered out Category and Phase rows)`);

  // Group tasks by category
  const categoryMap = new Map();
  for (const task of tasks) {
    if (!categoryMap.has(task.category)) {
      categoryMap.set(task.category, []);
    }
    categoryMap.get(task.category).push(task);
  }

  // Create categories array
  const categoriesArray = [];
  let sortOrder = 0;
  for (const [categoryName, categoryTasks] of categoryMap) {
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
    name: 'Onboarding + Planning + Finalization',
    version: getNextVersionNumber(),
    description: 'Comprehensive wedding planning template with onboarding, planning, and finalization phases',
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
          taskType: '${task.taskType}',
          dependencyMetadata: ${task.dependencyMetadata ? `'${task.dependencyMetadata.replace(/'/g, "\\'")}'` : 'null'},
          defaultPriority: PRIORITY.${Object.keys(PRIORITY_MAP).find((k) => PRIORITY_MAP[k] === task.priority) || 'NORMAL'},
          defaultDueOffsetDays: ${task.dueOffsetDays},
          sortOrder: ${task.sortOrder},
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
    // Find and select CSV file
    const csvFiles = findCsvFiles();
    const selectedCsvFile = await selectCsvFile(csvFiles);
    console.log(`\nUsing template: ${selectedCsvFile}`);
    
    console.log('Parsing template from CSV...');

    // Check if CSV exists
    const CSV_PATH = path.join(__dirname, selectedCsvFile);
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`CSV file not found: ${CSV_PATH}`);
      process.exit(1);
    }

    // Parse the CSV
    const templateData = parseCsvTemplate(selectedCsvFile);

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
