// Load environment variables before anything else
import "dotenv/config";  

import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';

import usersRouter from "./routes/users.js";
import clientsRouter from "./routes/clients.js";
import vendorsRouter from "./routes/vendors.js";
import addressesRouter from "./routes/addresses.js";
import tasksRouter from "./routes/tasks.js";
import weddingsRouter from "./routes/weddings.js";
import authRouter from "./routes/auth.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Root status endpoint to make visiting the base URL useful
app.get('/', (req, res) => {
  // If the client prefers HTML (a browser), return a simple landing page
  const accept = req.headers.accept || '';
  const info = {
    status: 'ok',
    message: 'Wedding planner API',
    endpoints: {
      users: '/users',
      clients: '/clients',
      vendors: '/vendors',
      addresses: '/addresses',
      tasks: '/tasks',
      weddings: '/weddings',
      auth: '/auth'
    }
  };

  if (accept.includes('text/html')) {
    // Simple styled HTML page with links to endpoints
    res.send(`<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Wedding Planner API</title>
        <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:40px}h1{color:#333}ul{line-height:1.6}</style>
      </head>
      <body>
        <h1>Wedding Planner API</h1>
        <p>Status: <strong>${info.status}</strong> — ${info.message}</p>
        <h2>Endpoints</h2>
        <ul>
          <li><a href="/users">/users</a> — Users collection</li>
          <li><a href="/clients">/clients</a> — Clients collection</li>
          <li><a href="/vendors">/vendors</a> — Vendors collection</li>
          <li><a href="/addresses">/addresses</a> — Addresses collection</li>
          <li><a href="/tasks">/tasks</a> — Tasks collection</li>
          <li><a href="/weddings">/weddings</a> — Weddings collection</li>
          <li><a href="/auth">/auth</a> — Authentication</li>
        </ul>
        <h3>Utilities</h3>
        <ul>
          <li><a href="/healthz">/healthz</a> — Health check (200 OK)</li>
        </ul>
        <p>Use <code>?format=json</code> or set Accept header to <code>application/json</code> to get JSON output.</p>
      </body>
      </html>`);
    return;
  }

  // Default to JSON response
  if (req.query.format === 'json' || accept.includes('application/json') || !accept) {
    res.json(info);
    return;
  }

  // Fallback to JSON
  res.json(info);
});

// Health-check endpoint for monitoring
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount routers
app.use('/users', usersRouter);
app.use('/clients', clientsRouter);
app.use('/vendors', vendorsRouter);
app.use('/addresses', addressesRouter);
app.use('/tasks', tasksRouter);
app.use('/weddings', weddingsRouter);
app.use('/auth', authRouter);

const PORT = process.env.PORT || 5000;

let serverInstance = null;

if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
