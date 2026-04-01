/** Test utility to see if wedding date updates are able to propagate through existing tasks  */

import http from 'http';
import app from '../server.js';
import { signJwt } from '../utils.js';
import prisma from '../prismaClient.js';

// Helper: start server on ephemeral port
function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer(app);
        server.listen(0, () => {
            const addr = server.address();
            resolve({server, port: addr.port});
        });
        server.on('error', reject);
    });
}

// Test result tracker
class TestRunner {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    async test(description, testFn) {
        try {
            await testFn();
            this.passed++;
            this.results.push({status: 'Pass', description});
            console.log(`✓ ${description}`);
        } catch (error) {
            this.failed++;
            this.results.push({status: 'Fail', description, error: error.message});
            console.log(`✗ ${description}`);
            console.log(`  Error: ${error.message}`);
        }
    }

    summary() {
        console.log('\n' + '='.repeat(60));
        console.log(`Total tests: ${this.passed + this.failed}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log('='.repeat(60));
    }
}

// Helper: make HTTP request
async function request(base, path, options = {}) {
    const url = `${base}${path}`;
    const response = await fetch(url, options);
    const body = await response.text();
    return {
        ok: response.ok,
        status: response.status,
        body: body ? JSON.parse(body) : null,
        headers: response.headers
    };
}

// Helper: assert equality
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

// Helper: assert date is close (within 1 day)
function assertDateClose(actual, expected, message) {
    const actualTime = new Date(actual).getTime();
    const expectedTime = new Date(expected).getTime();
    const diffMs = Math.abs(actualTime - expectedTime);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays > 1) {
        throw new Error(`${message}: dates differ by ${diffDays.toFixed(2)} days. Expected ${expected}, got ${actual}`);
    }
}

// Main test runner
async function runTests() {
    console.log('Starting Wedding Date Update Tests...\n');
    
    const { server, port } = await startServer();
    const baseUrl = `http://localhost:${port}`;
    const runner = new TestRunner();
    
    let testPlannerUserId;
    let testWeddingId;
    let originalWeddingDate;
    let testTaskIds = [];
    
    try {
        // Create test planner user
        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@test.com' },
            update: {},
            create: {
                email: 'admin@test.com',
                name: 'Admin User',
                password: 'hashedpassword',
                role: 'ADMIN'
            }
        });
        
        const testPlanner = await prisma.user.create({
            data: {
                email: `planner-${Date.now()}@test.com`,
                name: 'Test Planner',
                password: 'hashedpassword',
                role: 'USER'
            }
        });
        testPlannerUserId = testPlanner.id;
        
        const authToken = signJwt({ userId: testPlanner.id, email: testPlanner.email, role: 'USER' });
        
        // Test 1: Create a wedding and add tasks
        await runner.test('Create wedding with initial date', async () => {
            originalWeddingDate = new Date('2026-06-15'); // June 15, 2026
            const res = await request(baseUrl, '/weddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    date: originalWeddingDate.toISOString(),
                    spouse1Id: null,
                    spouse2Id: null,
                    locationId: null
                })
            });
            
            if (!res.ok) throw new Error(`Failed to create wedding: ${JSON.stringify(res.body)}`);
            testWeddingId = res.body.id;
        });
        
        // Test 2: Create categories and tasks
        let testCategoryId;
        await runner.test('Create task category', async () => {
            const category = await prisma.taskCategory.create({
                data: {
                    name: 'Test Category',
                    sortOrder: 1,
                    weddingId: testWeddingId
                }
            });
            testCategoryId = category.id;
        });
        
        // Test 3: Create a template-based task
        let templateTaskId;
        await runner.test('Create template task for offset-based recalculation', async () => {
            const task = await prisma.task.create({
                data: {
                    name: 'Template Task (30 days before)',
                    description: 'Task with offset from template',
                    priority: 2,
                    dueDate: new Date('2026-05-16'), // 30 days before wedding
                    sortOrder: 1,
                    categoryId: testCategoryId,
                    templateTaskId: 'mock-template-id-1'
                }
            });
            testTaskIds.push(task.id);
            templateTaskId = task.id;
        });
        
        // Test 4: Create a manually-created task
        let manualTaskId;
        await runner.test('Create manual task for date-shift recalculation', async () => {
            const task = await prisma.task.create({
                data: {
                    name: 'Manual Task (assigned)',
                    description: 'Task added manually by user',
                    priority: 3,
                    dueDate: new Date('2026-06-01'), // 14 days before wedding
                    sortOrder: 2,
                    categoryId: testCategoryId
                }
            });
            testTaskIds.push(task.id);
            manualTaskId = task.id;
        });
        
        // Test 5: Update wedding date to a later date (+7 days)
        const newWeddingDate = new Date('2026-06-22'); // June 22, 2026 (7 days later)
        await runner.test('Update wedding date to +7 days later', async () => {
            const res = await request(baseUrl, `/weddings/${testWeddingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    date: newWeddingDate.toISOString()
                })
            });
            
            if (!res.ok) throw new Error(`Failed to update wedding: ${JSON.stringify(res.body)}`);
        });
        
        // Test 6: Verify template-based task was recalculated (should be 30 days before new date)
        await runner.test('Template task recalculated with new offset', async () => {
            const task = await prisma.task.findUnique({ where: { id: templateTaskId } });
            const expectedDate = new Date('2026-05-23'); // 30 days before June 22
            assertDateClose(task.dueDate, expectedDate, 'Template task due date');
        });
        
        // Test 7: Verify manual task was shifted by +7 days
        await runner.test('Manual task shifted by date difference', async () => {
            const task = await prisma.task.findUnique({ where: { id: manualTaskId } });
            const expectedDate = new Date('2026-06-08'); // 7 days later
            assertDateClose(task.dueDate, expectedDate, 'Manual task due date');
        });
        
        // Test 8: Update wedding date backward (-3 days)
        const backwardWeddingDate = new Date('2026-06-19'); // June 19, 2026 (3 days earlier than 6/22)
        await runner.test('Update wedding date backward (-3 days)', async () => {
            const res = await request(baseUrl, `/weddings/${testWeddingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    date: backwardWeddingDate.toISOString()
                })
            });
            
            if (!res.ok) throw new Error(`Failed to update wedding: ${JSON.stringify(res.body)}`);
        });
        
        // Test 9: Verify tasks adjusted backward correctly
        await runner.test('All tasks adjusted backward after date change', async () => {
            const task = await prisma.task.findUnique({ where: { id: manualTaskId } });
            const expectedDate = new Date('2026-06-05'); // 3 days earlier than 6/8
            assertDateClose(task.dueDate, expectedDate, 'Manual task after backward shift');
        });
        
        // Test 10: Verify no date change = no recalculation
        await runner.test('No task updates when date unchanged', async () => {
            const taskBefore = await prisma.task.findUnique({ where: { id: manualTaskId } });
            const dueDateBefore = new Date(taskBefore.dueDate).getTime();
            
            const res = await request(baseUrl, `/weddings/${testWeddingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    date: backwardWeddingDate.toISOString() // Same date
                })
            });
            
            if (!res.ok) throw new Error(`Failed to update wedding: ${JSON.stringify(res.body)}`);
            
            const taskAfter = await prisma.task.findUnique({ where: { id: manualTaskId } });
            const dueDateAfter = new Date(taskAfter.dueDate).getTime();
            
            assertEqual(dueDateBefore, dueDateAfter, 'Task due date should not change');
        });
        
    } catch (error) {
        console.error('Test setup error:', error);
    } finally {
        // Cleanup
        try {
            if (testWeddingId) {
                await prisma.wedding.delete({ where: { id: testWeddingId } });
            }
            if (testPlannerUserId) {
                await prisma.user.delete({ where: { id: testPlannerUserId } });
            }
        } catch (err) {
            console.log('Cleanup warning:', err.message);
        }
        
        server.close();
        await prisma.$disconnect();
        runner.summary();
    }
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
