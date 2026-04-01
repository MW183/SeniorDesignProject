/** tests for a variety of edge cases for vendor CRUD */

import http from 'http';
import app from '../server.js';
import { signJwt } from '../utils.js';
import prisma from '../prismaClient.js';

//Helper: start server on ephemeral port
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

//Test result tracker
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
            console.log(`  Error: ${error.message}`)
        }
    }

    summary() {
        console.log('\n');
        console.log(`Total tests: ${this.passed + this.failed}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
    }
}

//helper: make HTTP request
async function request(base, path, options = {}) {
    const url = `${base}${path}`;
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    return {
        status: response.status, body
    };
}

//helper: assert status code
function assertStatus(actual, expected, message){
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

//helper: assert error exists
function assertHasError(body, message){
    if (!body.error && !body.errors) {
        throw new Error(`${message}: expected error in response`);
    }
}

//helper: assert specific error message
function assertErrorContains(body, text, message) {
    const errors = body.errors || [body.error];
    const found = errors.some(e =>
    (typeof e === 'string' && e.includes(text)) || (e.message && e.message.includes(text))
    );

    if (!found) {
        throw new Error(`${message}: expected error containing "${text}", got ${JSON.stringify(errors)}`);
    }
}

//helper: assert value
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

async function runVendorTests() {
    const {server, port} = await startServer();
    const base = `http://localhost:${port}`;
    const runner = new TestRunner();

    console.log(`\n=== Running Vendor Management Tests ===\n`);

    try {
        // Create test user
        const adminUserRes = await request(base, '/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Vendor Test Admin',
                email: `vendortestadmin${Date.now()}@example.com`,
                password: 'testpass123',
                role: 'ADMIN'
            })
        });
        const adminUserId = adminUserRes.body.id;
        const adminToken = signJwt({sub: adminUserId, role: 'ADMIN'}, '1h');
        const adminHeader = {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        };

        // Create test location
        const locationRes = await request(base, '/address', {
            method: 'POST',
            headers: adminHeader,
            body: JSON.stringify({
                street: '123 Test St',
                city: 'Test City',
                state: 'CA',
                zip: '12345',
                type: 'Venue'
            })
        });
        const locationId = locationRes.body.id;

        // Create test wedding
        const weddingRes = await request(base, '/weddings', {
            method: 'POST',
            headers: adminHeader,
            body: JSON.stringify({
                date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                locationId
            })
        });
        const weddingId = weddingRes.body.id;

        // Create test vendors
        const vendor1Res = await request(base, '/vendors', {
            method: 'POST',
            headers: adminHeader,
            body: JSON.stringify({
                name: 'Test Florist',
                email: 'florist@test.com',
                phone: '555-1234'
            })
        });
        const vendorId1 = vendor1Res.body.id;

        const vendor2Res = await request(base, '/vendors', {
            method: 'POST',
            headers: adminHeader,
            body: JSON.stringify({
                name: 'Test Caterer',
                email: 'caterer@test.com',
                phone: '555-5678'
            })
        });
        const vendorId2 = vendor2Res.body.id;

        // ========== Tests ==========

        // GET vendors for wedding (empty)
        await runner.test('Get vendors for wedding (initially empty)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors`);
            assertStatus(status, 200, 'Should return 200');
            if (body.length !== 0) {
                throw new Error(`Expected 0 vendors, got ${body.length}`);
            }
        });

        // POST: Assign vendor to wedding
        await runner.test('Assign vendor to wedding', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'POST',
                headers: adminHeader
            });
            assertStatus(status, 201, 'Should return 201');
            assertEqual(body.vendorId, vendorId1, 'Vendor ID should match');
            assertEqual(body.rating, 0, 'Default rating should be 0');
            assertEqual(body.notes, null, 'Default notes should be null');
        });

        // GET vendors for wedding (1 vendor)
        await runner.test('Get vendors for wedding (1 vendor assigned)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors`);
            assertStatus(status, 200, 'Should return 200');
            if (body.length !== 1) {
                throw new Error(`Expected 1 vendor, got ${body.length}`);
            }
        });

        // POST: Duplicate assignment should fail
        await runner.test('Prevent duplicate vendor assignment', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'POST',
                headers: adminHeader
            });
            assertStatus(status, 409, 'Should return 409 Conflict');
            assertHasError(body, 'Should have error message');
            assertErrorContains(body, 'already assigned', 'Error should mention already assigned');
        });

        // POST: Assign second vendor
        await runner.test('Assign second vendor to wedding', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId2}`, {
                method: 'POST',
                headers: adminHeader
            });
            assertStatus(status, 201, 'Should return 201');
            assertEqual(body.vendorId, vendorId2, 'Vendor ID should match');
        });

        // GET vendors for wedding (2 vendors)
        await runner.test('Get vendors for wedding (2 vendors assigned)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors`);
            assertStatus(status, 200, 'Should return 200');
            if (body.length !== 2) {
                throw new Error(`Expected 2 vendors, got ${body.length}`);
            }
        });

        // PUT: Update rating without notes (should succeed at rating 0)
        await runner.test('Update rating to 0 without notes', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: 0,
                    notes: null
                })
            });
            assertStatus(status, 200, 'Should return 200');
            assertEqual(body.rating, 0, 'Rating should be 0');
        });

        // PUT: Update rating > 0 without notes (should fail)
        await runner.test('Reject rating > 0 without notes', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: 4,
                    notes: ''
                })
            });
            assertStatus(status, 400, 'Should return 400');
            assertHasError(body, 'Should have error message');
            assertErrorContains(body, 'Notes are required', 'Error should mention notes required');
        });

        // PUT: Update rating > 0 with notes (should succeed)
        await runner.test('Update rating > 0 with notes', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: 4,
                    notes: 'Beautiful flowers, professional service'
                })
            });
            assertStatus(status, 200, 'Should return 200');
            assertEqual(body.rating, 4, 'Rating should be 4');
            assertEqual(body.notes, 'Beautiful flowers, professional service', 'Notes should be saved');
        });

        // PUT: Validate invalid rating (out of bounds)
        await runner.test('Reject invalid rating (> 5)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: 10,
                    notes: 'Too high'
                })
            });
            assertStatus(status, 400, 'Should return 400');
            assertHasError(body, 'Should have error message');
            assertErrorContains(body, 'Rating must be', 'Error should mention rating bounds');
        });

        // PUT: Validate invalid rating (negative)
        await runner.test('Reject invalid rating (negative)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: -1,
                    notes: 'Negative'
                })
            });
            assertStatus(status, 400, 'Should return 400');
            assertHasError(body, 'Should have error message');
        });

        // PUT: Update second vendor with different rating
        await runner.test('Update different vendor with rating', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId2}`, {
                method: 'PUT',
                headers: adminHeader,
                body: JSON.stringify({
                    rating: 5,
                    notes: 'Excellent catering, highly recommend'
                })
            });
            assertStatus(status, 200, 'Should return 200');
            assertEqual(body.rating, 5, 'Rating should be 5');
        });

        // DELETE: Remove vendor from wedding
        await runner.test('Remove vendor from wedding', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'DELETE',
                headers: adminHeader
            });
            assertStatus(status, 200, 'Should return 200');
        });

        // GET vendors for wedding (1 vendor after deletion)
        await runner.test('Get vendors for wedding (1 after deletion)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors`);
            assertStatus(status, 200, 'Should return 200');
            if (body.length !== 1) {
                throw new Error(`Expected 1 vendor, got ${body.length}`);
            }
            if (body[0].vendorId !== vendorId2) {
                throw new Error(`Expected vendorId ${vendorId2}, got ${body[0].vendorId}`);
            }
        });

        // DELETE: Try to remove already-deleted vendor (should fail)
        await runner.test('Prevent removing non-assigned vendor', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId1}`, {
                method: 'DELETE',
                headers: adminHeader
            });
            assertStatus(status, 404, 'Should return 404');
            assertHasError(body, 'Should have error message');
        });

        // POST: Try to assign non-existent vendor
        await runner.test('Prevent assigning non-existent vendor', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/nonexistent`, {
                method: 'POST',
                headers: adminHeader
            });
            assertStatus(status, 404, 'Should return 404');
            assertHasError(body, 'Should have error message');
            assertErrorContains(body, 'Vendor not found', 'Error should mention vendor not found');
        });

        // DELETE: Remove last vendor
        await runner.test('Delete last vendor from wedding', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors/${vendorId2}`, {
                method: 'DELETE',
                headers: adminHeader
            });
            assertStatus(status, 200, 'Should return 200');
        });

        // GET vendors for wedding (empty after all deleted)
        await runner.test('Get vendors for wedding (empty after all deleted)', async () => {
            const { status, body } = await request(base, `/weddings/${weddingId}/vendors`);
            assertStatus(status, 200, 'Should return 200');
            if (body.length !== 0) {
                throw new Error(`Expected 0 vendors, got ${body.length}`);
            }
        });

        runner.summary();

        // Cleanup: Delete test data
        console.log('\nCleaning up test data...');
        try {
            // Delete wedding (cascades to WeddingVendor relationships)
            await prisma.wedding.delete({ where: { id: weddingId } });
            // Delete test vendors
            await prisma.vendor.deleteMany({ where: { id: { in: [vendorId1, vendorId2] } } });
            // Delete test location
            await prisma.address.delete({ where: { id: locationId } });
            // Delete test user
            await prisma.user.delete({ where: { id: adminUserId } });
            console.log('✓ Test data cleaned up');
        } catch (err) {
            console.error('Error during cleanup:', err.message);
        }
    } finally {
        server.close();
    }
}

runVendorTests().catch(console.error);
