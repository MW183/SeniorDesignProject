import http from 'http';
import app from '../server.js';
import { signJwt } from '../utils.js';

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
            console.log(`${description}`);
        } catch (error) {
            this.failed++;
            this.results.push({status: 'Fail', description, error: error.message});
            console.log(`${description}`);
            console.log(`Error: ${error.message}`)
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

//helper: asser error exists
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


async function runValidationTests() {
    const {server, port} = await startServer();
    const base = `http:localhost:${port}`;
    const runner = new TestRunner();

    console.log(`Running validation tests`);


    //generate test tokens
    const adminToken = signJwt({sub: 'admin-test-id', role: 'ADMIN'}, '1h');
    const userToken = signJwt({sub: 'user-test-id', role:'USER'}, '1h');


    const adminHeader = {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
    };


//Address validation tests
  await runner.test('Address: missing all required fields', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject empty payload');
    assertHasError(body, 'Should return errors');
  });

  await runner.test('Address: missing street', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        city: 'TestCity',
        state: 'CA',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject missing street');
    assertErrorContains(body, 'street', 'Should mention street field');
  });

  await runner.test('Address: missing city', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        state: 'CA',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject missing city');
    assertErrorContains(body, 'city', 'Should mention city field');
  });

  await runner.test('Address: missing state', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject missing state');
    assertErrorContains(body, 'state', 'Should mention state field');
  });

  await runner.test('Address: missing zip', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'CA',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject missing zip');
    assertErrorContains(body, 'zip', 'Should mention zip field');
  });

  await runner.test('Address: missing type', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'CA',
        zip: '12345'
      })
    });
    assertStatus(status, 400, 'Should reject missing type');
    assertErrorContains(body, 'type', 'Should mention type field');
  });

  await runner.test('Address: invalid state (not 2 letters)', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'California',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject invalid state');
    assertErrorContains(body, 'state', 'Should mention state validation');
  });

  await runner.test('Address: invalid zip format', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'CA',
        zip: '1234',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject invalid zip');
    assertErrorContains(body, 'zip', 'Should mention zip validation');
  });

  await runner.test('Address: invalid type', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'CA',
        zip: '12345',
        type: 'InvalidType'
      })
    });
    assertStatus(status, 400, 'Should reject invalid type');
    assertErrorContains(body, 'type', 'Should mention type validation');
  });

  await runner.test('Address: valid with 5-digit zip', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '123 Main St',
        city: 'TestCity',
        state: 'CA',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 201, 'Should accept valid address');
    if (!body.id) throw new Error('Should return created address with id');
    
    // Cleanup
    await request(base, `/address/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Address: valid with ZIP+4 format', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '456 Oak Ave',
        city: 'TestTown',
        state: 'NY',
        zip: '12345-6789',
        type: 'Vendor'
      })
    });
    assertStatus(status, 201, 'Should accept ZIP+4 format');
    if (!body.id) throw new Error('Should return created address with id');
    
    // Cleanup
    await request(base, `/address/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Address: state normalization (lowercase to uppercase)', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '789 Pine Rd',
        city: 'TestVille',
        state: 'tx',
        zip: '54321',
        type: 'Client'
      })
    });
    assertStatus(status, 201, 'Should accept lowercase state');
    if (body.state !== 'TX') {
      throw new Error(`State should be normalized to uppercase, got ${body.state}`);
    }
    
    // Cleanup
    await request(base, `/address/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Address: empty street after trim', async () => {
    const { status, body } = await request(base, '/address', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        street: '   ',
        city: 'TestCity',
        state: 'CA',
        zip: '12345',
        type: 'Venue'
      })
    });
    assertStatus(status, 400, 'Should reject empty street');
    assertErrorContains(body, 'street', 'Should mention street validation');
  });


  //Client validation tests
  console.log(`\n Client validation tests`);

await runner.test('Client: missing required name', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject missing name');
    assertErrorContains(body, 'name', 'Should mention name field');
  });

  await runner.test('Client: empty name after trim', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: '   '
      })
    });
    assertStatus(status, 400, 'Should reject empty name');
    assertErrorContains(body, 'name', 'Should mention name validation');
  });

  await runner.test('Client: invalid email format', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Client',
        email: 'invalid-email'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email');
    assertErrorContains(body, 'email', 'Should mention email validation');
  });

  await runner.test('Client: valid with only name', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Valid Client'
      })
    });
    assertStatus(status, 201, 'Should accept client with only name');
    if (!body.id) throw new Error('Should return created client with id');
    
    // Cleanup
    await request(base, `/clients/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Client: valid with all fields', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Complete Client',
        email: 'test@example.com',
        phone: '555-1234',
        notes: 'Test notes'
      })
    });
    assertStatus(status, 201, 'Should accept complete client');
    if (!body.id) throw new Error('Should return created client with id');
    
    // Cleanup
    await request(base, `/clients/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Client: email normalization (lowercase)', async () => {
    const { status, body } = await request(base, '/clients', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Email Test Client',
        email: 'TEST@EXAMPLE.COM'
      })
    });
    assertStatus(status, 201, 'Should accept uppercase email');
    if (body.email !== 'test@example.com') {
      throw new Error(`Email should be normalized to lowercase, got ${body.email}`);
    }
    
    // Cleanup
    await request(base, `/clients/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });
  
  //user validation tests
  console.log(`\n--- User Validation Tests ---`);

  await runner.test('User: missing all required fields', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject empty user');
    assertHasError(body, 'Should return errors');
  });

  await runner.test('User: missing name', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject missing name');
    assertErrorContains(body, 'name', 'Should mention name field');
  });

  await runner.test('User: name too short', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        email: 'test@example.com',
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject short name');
    assertErrorContains(body, 'name', 'Should mention name validation');
  });

  await runner.test('User: missing email', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject missing email');
    assertErrorContains(body, 'email', 'Should mention email field');
  });

  await runner.test('User: invalid email format', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'not-an-email',
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email');
    assertErrorContains(body, 'email', 'Should mention email validation');
  });

  await runner.test('User: missing password', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com'
      })
    });
    assertStatus(status, 400, 'Should reject missing password');
    assertErrorContains(body, 'password', 'Should mention password field');
  });

  await runner.test('User: password too short', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: '12345'
      })
    });
    assertStatus(status, 400, 'Should reject short password');
    assertErrorContains(body, 'password', 'Should mention password validation');
  });

  await runner.test('User: invalid role', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'SUPERADMIN'
      })
    });
    assertStatus(status, 400, 'Should reject invalid role');
    assertErrorContains(body, 'role', 'Should mention role validation');
  });

  await runner.test('User: valid with required fields only', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid User',
        email: `valid${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    assertStatus(status, 201, 'Should accept valid user');
    if (!body.id) throw new Error('Should return created user with id');
    
    // Cleanup
    await request(base, `/users/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('User: valid with all fields', async () => {
    const { status, body } = await request(base, '/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Complete User',
        email: `complete${Date.now()}@example.com`,
        password: 'password123',
        role: 'ADMIN',
        phone: '555-1234'
      })
    });
    assertStatus(status, 201, 'Should accept complete user');
    if (!body.id) throw new Error('Should return created user with id');
    if (body.role !== 'ADMIN') throw new Error('Should set role correctly');
    
    // Cleanup
    await request(base, `/users/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  //vendor validation tests
  console.log(`\n--- Vendor Validation Tests ---`);

  await runner.test('Vendor: missing required name', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject missing name');
    assertHasError(body, 'Should return error');
  });

  await runner.test('Vendor: empty name after trim', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: '   '
      })
    });
    assertStatus(status, 400, 'Should reject empty name');
  });

  await runner.test('Vendor: invalid email format', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Vendor',
        email: 'not-valid'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email');
  });

  await runner.test('Vendor: invalid rating (negative)', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Vendor',
        rating: -1
      })
    });
    assertStatus(status, 400, 'Should reject negative rating');
  });

  await runner.test('Vendor: invalid rating (decimal)', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Vendor',
        rating: 3.5
      })
    });
    assertStatus(status, 400, 'Should reject decimal rating');
  });

  await runner.test('Vendor: valid with only name', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Minimal Vendor'
      })
    });
    assertStatus(status, 201, 'Should accept vendor with only name');
    if (!body.id) throw new Error('Should return created vendor with id');
    
    // Cleanup
    await request(base, `/vendors/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Vendor: valid with all fields', async () => {
    const { status, body } = await request(base, '/vendors', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Complete Vendor',
        email: 'vendor@example.com',
        phone: '555-9876',
        rating: 5,
        notes: 'Great vendor'
      })
    });
    assertStatus(status, 201, 'Should accept complete vendor');
    if (!body.id) throw new Error('Should return created vendor with id');
    
    // Cleanup
    await request(base, `/vendors/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  //task validation tests

 console.log(`\n--- Task Validation Tests ---`);

  // First create a wedding for task tests
  const weddingRes = await request(base, `/weddings`, {
    method: 'POST',
    headers: adminHeader,
    body: JSON.stringify({
      date: new Date().toISOString()
    })
  });
  const testWeddingId = weddingRes.body.id;

  await runner.test('Task: missing all required fields', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject empty task');
    assertHasError(body, 'Should return error');
  });

  await runner.test('Task: missing name', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        priority: 1,
        dueDate: new Date().toISOString(),
        weddingId: testWeddingId
      })
    });
    assertStatus(status, 400, 'Should reject missing name');
  });

  await runner.test('Task: missing priority', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Task',
        dueDate: new Date().toISOString(),
        weddingId: testWeddingId
      })
    });
    assertStatus(status, 400, 'Should reject missing priority');
  });

  await runner.test('Task: missing dueDate', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Task',
        priority: 1,
        weddingId: testWeddingId
      })
    });
    assertStatus(status, 400, 'Should reject missing dueDate');
  });

  await runner.test('Task: missing weddingId', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Task',
        priority: 1,
        dueDate: new Date().toISOString()
      })
    });
    assertStatus(status, 400, 'Should reject missing weddingId');
  });

  await runner.test('Task: invalid weddingId (non-existent)', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Test Task',
        priority: 1,
        dueDate: new Date().toISOString(),
        weddingId: 'non-existent-id'
      })
    });
    assertStatus(status, 400, 'Should reject invalid weddingId');
  });

  await runner.test('Task: valid with required fields', async () => {
    const { status, body } = await request(base, '/tasks', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        name: 'Valid Task',
        priority: 2,
        dueDate: new Date().toISOString(),
        weddingId: testWeddingId
      })
    });
    assertStatus(status, 201, 'Should accept valid task');
    if (!body.id) throw new Error('Should return created task with id');
    
    // Cleanup
    await request(base, `/tasks/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  // Cleanup wedding
  await request(base, `/weddings/${testWeddingId}`, {
    method: 'DELETE',
    headers: adminHeader
  });


//wedding validation tests
console.log(`\n--- Wedding Validation Tests ---`);

  await runner.test('Wedding: missing required date', async () => {
    const { status, body } = await request(base, '/weddings', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject missing date');
    assertHasError(body, 'Should return error');
  });

  await runner.test('Wedding: valid with only date', async () => {
    const { status, body } = await request(base, '/weddings', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        date: new Date().toISOString()
      })
    });
    assertStatus(status, 201, 'Should accept wedding with only date');
    if (!body.id) throw new Error('Should return created wedding with id');
    
    // Cleanup
    await request(base, `/weddings/${body.id}`, {
      method: 'DELETE',
      headers: adminHeader
    });
  });

  await runner.test('Wedding: invalid locationId (non-existent)', async () => {
    const { status, body } = await request(base, '/weddings', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        date: new Date().toISOString(),
        locationId: 'non-existent-address-id'
      })
    });
    assertStatus(status, 400, 'Should reject invalid locationId');
  });

  await runner.test('Wedding: invalid spouse1Id (non-existent)', async () => {
    const { status, body } = await request(base, '/weddings', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        date: new Date().toISOString(),
        spouse1Id: 'non-existent-client-id'
      })
    });
    assertStatus(status, 400, 'Should reject invalid spouse1Id');
  });

  await runner.test('Wedding: invalid spouse2Id (non-existent)', async () => {
    const { status, body } = await request(base, '/weddings', {
      method: 'POST',
      headers: adminHeader,
      body: JSON.stringify({
        date: new Date().toISOString(),
        spouse2Id: 'non-existent-client-id'
      })
    });
    assertStatus(status, 400, 'Should reject invalid spouse2Id');
  });


//Authenticaion validation tests
await runner.test('Auth Login: missing email', async () => {
    const { status, body } = await request(base, '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject missing email');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Login: missing password', async () => {
    const { status, body } = await request(base, '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    assertStatus(status, 400, 'Should reject missing password');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Login: invalid email format', async () => {
    const { status, body } = await request(base, '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'password123'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email format');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Request Reset: missing email', async () => {
    const { status, body } = await request(base, '/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject missing email');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Request Reset: invalid email format', async () => {
    const { status, body } = await request(base, '/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Reset: missing token', async () => {
    const { status, body } = await request(base, '/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPassword: 'newpass123'
      })
    });
    assertStatus(status, 400, 'Should reject missing token');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Reset: missing newPassword', async () => {
    const { status, body } = await request(base, '/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'some-token'
      })
    });
    assertStatus(status, 400, 'Should reject missing newPassword');
    assertHasError(body, 'Should return validation error');
  });

  await runner.test('Auth Reset: password too short', async () => {
    const { status, body } = await request(base, '/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'some-token',
        newPassword: '12345'
      })
    });
    assertStatus(status, 400, 'Should reject short password');
    assertHasError(body, 'Should return validation error');
  });

 

  console.log('\n--- Update Validation Tests ---');

  // Create test address for updates
  const testAddress = await request(base, '/address', {
    method: 'POST',
    headers: adminHeader,
    body: JSON.stringify({
      street: '100 Test St',
      city: 'UpdateCity',
      state: 'CA',
      zip: '99999',
      type: 'Venue'
    })
  });
  const addressId = testAddress.body.id;

  await runner.test('Address Update: partial update with valid field', async () => {
    const { status, body } = await request(base, `/address/${addressId}`, {
      method: 'PUT',
      headers: adminHeader,
      body: JSON.stringify({
        city: 'NewCity'
      })
    });
    assertStatus(status, 200, 'Should accept partial update');
    if (body.city !== 'NewCity') throw new Error('Should update city');
  });

  await runner.test('Address Update: invalid zip in partial update', async () => {
    const { status, body } = await request(base, `/address/${addressId}`, {
      method: 'PUT',
      headers: adminHeader,
      body: JSON.stringify({
        zip: 'invalid'
      })
    });
    assertStatus(status, 400, 'Should reject invalid zip in update');
  });

  await runner.test('Address Update: no valid fields provided', async () => {
    const { status, body } = await request(base, `/address/${addressId}`, {
      method: 'PUT',
      headers: adminHeader,
      body: JSON.stringify({})
    });
    assertStatus(status, 400, 'Should reject empty update');
    assertErrorContains(body, 'no valid fields', 'Should mention no fields');
  });

  // Cleanup
  await request(base, `/address/${addressId}`, {
    method: 'DELETE',
    headers: adminHeader
  });

  // Create test client for updates
  const testClient = await request(base, '/clients', {
    method: 'POST',
    headers: adminHeader,
    body: JSON.stringify({
      name: 'Update Test Client'
    })
  });
  const clientId = testClient.body.id;

  await runner.test('Client Update: partial update with valid email', async () => {
    const { status, body } = await request(base, `/clients/${clientId}`, {
      method: 'PUT',
      headers: adminHeader,
      body: JSON.stringify({
        email: 'newemail@example.com'
      })
    });
    assertStatus(status, 200, 'Should accept partial update');
  });

  await runner.test('Client Update: invalid email in partial update', async () => {
    const { status, body } = await request(base, `/clients/${clientId}`, {
      method: 'PUT',
      headers: adminHeader,
      body: JSON.stringify({
        email: 'not-valid-email'
      })
    });
    assertStatus(status, 400, 'Should reject invalid email in update');
  });

  // Cleanup
  await request(base, `/clients/${clientId}`, {
    method: 'DELETE',
    headers: adminHeader
  });


    //Summary
    server.close();
    runner.summary();

    return runner.failed === 0;
}

if (process.argv[1] && process.argv[1].endsWith('validation_tests.js')) {
    runValidationTests().then(success => {process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Fatal error: ', err);
        process.exit(1);
    });
}

export default runValidationTests