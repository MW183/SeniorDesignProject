import http from 'http';
import app from '../server.js';
import { signJwt } from '../utils.js';

// Helper: start server on ephemeral port
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
    server.on('error', reject);
  });
}

async function run() {
  const { server, port } = await startServer();
  const base = `http://localhost:${port}`;
  console.log('Running API smoke tests against', base);

  const results = [];


  // 1. Generate a test JWT (as ADMIN)

  const adminToken = signJwt({ sub: 'test-user-id', role: 'ADMIN' }, '1h');

  // Helper to include Authorization header
  const authHeader = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };


  // 2. Create address (needed for vendors/weddings)

  let addressId = null;
  try {
    const res = await fetch(`${base}/address`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ street: '1 Test St', city: 'Testville', state: 'TS', zip: '00000', type: 'Venue' })
    });
    const body = await res.json();
    if (res.ok && body.id) addressId = body.id;
    results.push({ path: '/address POST', status: res.status, body });
  } catch (err) {
    results.push({ path: '/address POST', error: err.message });
  }


  // 3. Create a client

  let clientId = null;
  try {
    const res = await fetch(`${base}/clients`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: 'Test Client', email: 'tc@example.com' })
    });
    const body = await res.json();
    if (res.ok && body.id) clientId = body.id;
    results.push({ path: '/clients POST', status: res.status, body });
  } catch (err) {
    results.push({ path: '/clients POST', error: err.message });
  }


  // 4. Create a vendor (requires address)

  let vendorId = null;
  try {
    const res = await fetch(`${base}/vendors`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: 'Test Vendor', addressId })
    });
    const body = await res.json();
    if (res.ok && body.id) vendorId = body.id;
    results.push({ path: '/vendors POST', status: res.status, body });
  } catch (err) {
    results.push({ path: '/vendors POST', error: err.message });
  }


  // 5. Create a wedding (requires client & address)

  let weddingId = null;
  try {
    const res = await fetch(`${base}/weddings`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: new Date().toISOString(), locationId: addressId, spouse1Id: clientId })
    });
    const body = await res.json();
    if (res.ok && body.id) weddingId = body.id;
    results.push({ path: '/weddings POST', status: res.status, body });
  } catch (err) {
    results.push({ path: '/weddings POST', error: err.message });
  }


  // 6. Create a task (requires wedding)

  let taskId = null;
  try {
    const res = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: 'Test Task', priority: 1, dueDate: new Date().toISOString(), weddingId })
    });
    const body = await res.json();
    if (res.ok && body.id) taskId = body.id;
    results.push({ path: '/tasks POST', status: res.status, body });
  } catch (err) {
    results.push({ path: '/tasks POST', error: err.message });
  }


  // 7. Test GET collections (auth required)

  const collections = ['/users', '/clients', '/vendors', '/address', '/weddings', '/tasks'];
  for (const path of collections) {
    try {
      const res = await fetch(base + path, { headers: authHeader });
      const body = await res.json();
      results.push({ path, status: res.status, body: Array.isArray(body) ? `Array[${body.length}]` : body });
    } catch (err) {
      results.push({ path, error: err.message });
    }
  }


  // 8. Cleanup — delete created records in reverse order

  const cleanup = [
    { path: `/tasks/${taskId}`, method: 'DELETE' },
    { path: `/weddings/${weddingId}`, method: 'DELETE' },
    { path: `/vendors/${vendorId}`, method: 'DELETE' },
    { path: `/clients/${clientId}`, method: 'DELETE' },
    { path: `/address/${addressId}`, method: 'DELETE' },
  ];

  for (const c of cleanup) {
    if (!c.path.includes('null')) {
      try {
        const res = await fetch(base + c.path, { method: c.method, headers: authHeader });
        const body = await res.text();
        results.push({ path: c.path, status: res.status, body: body.slice(0, 100) });
      } catch (err) {
        results.push({ path: c.path, error: err.message });
      }
    }
  }

  console.log('API Smoke Test Results:');
  results.forEach(r => console.log(r));

  server.close();
}

// Run if script is executed directly
if (process.argv[1] && process.argv[1].endsWith('run_api_tests.js')) {
  run().catch(err => { console.error(err); process.exit(1); });
}