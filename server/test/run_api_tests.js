import http from 'http';
import app from '../server.js';

// Helper to start server on ephemeral port
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = addr.port;
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function run() {
  const { server, port } = await startServer();
  const base = `http://localhost:${port}`;
  console.log('Running API smoke tests against', base);

  const results = [];

  // endpoints to hit: GET collections
  const endpoints = [
    { method: 'GET', path: '/users' },
    { method: 'GET', path: '/clients' },
    { method: 'GET', path: '/vendors' },
    { method: 'GET', path: '/addresses' },
    { method: 'GET', path: '/tasks' },
    { method: 'GET', path: '/weddings' },
  ];

  for (const e of endpoints) {
    try {
      const res = await fetch(base + e.path, { method: e.method });
      results.push({ path: e.path, status: res.status });
    } catch (err) {
      results.push({ path: e.path, error: err.message });
    }
  }

  // Try creating an address (required for vendor/wedding)
  let addressId = null;
  try {
    const res = await fetch(base + '/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ street: '1 Test St', city: 'Testville', state: 'TS', zip: '00000' }) });
    const body = await res.json();
    if (res.ok && body.id) addressId = body.id;
    results.push({ path: '/addresses POST', status: res.status, body });
  } catch (err) { results.push({ path: '/addresses POST', error: err.message }); }

  // Create a client
  let clientId = null;
  try {
    const res = await fetch(base + '/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Client', email: 'tc@example.com' }) });
    const body = await res.json();
    if (res.ok && body.id) clientId = body.id;
    results.push({ path: '/clients POST', status: res.status, body });
  } catch (err) { results.push({ path: '/clients POST', error: err.message }); }

  // Create a vendor (requires address)
  let vendorId = null;
  try {
    const res = await fetch(base + '/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Vendor', addressId }) });
    const body = await res.json();
    if (res.ok && body.id) vendorId = body.id;
    results.push({ path: '/vendors POST', status: res.status, body });
  } catch (err) { results.push({ path: '/vendors POST', error: err.message }); }

  // Create a wedding (requires date; location and spouse ids optional but we'll supply)
  let weddingId = null;
  try {
    const res = await fetch(base + '/weddings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: new Date().toISOString(), locationId: addressId, spouse1Id: clientId }) });
    const body = await res.json();
    if (res.ok && body.id) weddingId = body.id;
    results.push({ path: '/weddings POST', status: res.status, body });
  } catch (err) { results.push({ path: '/weddings POST', error: err.message }); }

  // Create a task (requires weddingId)
  let taskId = null;
  try {
    const res = await fetch(base + '/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Task', priority: 1, dueDate: new Date().toISOString(), weddingId }) });
    const body = await res.json();
    if (res.ok && body.id) taskId = body.id;
    results.push({ path: '/tasks POST', status: res.status, body });
  } catch (err) { results.push({ path: '/tasks POST', error: err.message }); }

  // Now cleanup: delete created records if created
  const cleanup = [
    { path: `/tasks/${taskId}`, method: 'DELETE' },
    { path: `/weddings/${weddingId}`, method: 'DELETE' },
    { path: `/vendors/${vendorId}`, method: 'DELETE' },
    { path: `/clients/${clientId}`, method: 'DELETE' },
    { path: `/addresses/${addressId}`, method: 'DELETE' },
  ];

  for (const c of cleanup) {
    if (!c.path.includes('null')) {
      try {
        const res = await fetch(base + c.path, { method: c.method });
        const body = await res.text();
        results.push({ path: c.path, status: res.status, body: body.slice(0, 100) });
      } catch (err) { results.push({ path: c.path, error: err.message }); }
    }
  }

  console.log('Results:');
  for (const r of results) console.log(r);

  server.close();
}

// If the script is run directly (node test/run_api_tests.js), start the tests
if (process.argv[1] && process.argv[1].endsWith('run_api_tests.js')) {
  run().catch(err => { console.error(err); process.exit(1); });
}
